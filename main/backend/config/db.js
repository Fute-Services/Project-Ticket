// Firestore-shaped shim over the native MongoDB driver. The app was written
// against the Firestore Admin SDK's call shape (collection().doc().get/set,
// where/orderBy/limit chains, batch(), runTransaction()); this module
// reproduces just enough of that surface that controllers keep working
// after swapping the import from './config/firebase' to './config/db',
// instead of rewriting ~170 call sites across the app.
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB_NAME || 'fute_portal';

const client = new MongoClient(uri);
const ready = client.connect();

function col(name) {
  return ready.then(() => client.db(dbName).collection(name));
}

// Firestore auto-IDs are 20-char random alphanumeric strings — mirrored here
// so collection.add()/doc() without an id produce ids that look and sort
// the same way the rest of the app (and any existing Firestore-era data
// export) already expects.
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateId() {
  const bytes = crypto.randomBytes(20);
  let out = '';
  for (let i = 0; i < 20; i++) out += ID_CHARS[bytes[i] % ID_CHARS.length];
  return out;
}

// FieldValue.arrayUnion(value) — the one Firestore write-transform this app
// uses (salesDeskController.logCall). Returns a marker object that set()/
// update() below detect and translate into Mongo's $addToSet, instead of
// building out Firestore's whole FieldValue system for a single call site.
const ARRAY_UNION = Symbol('arrayUnion');
const FieldValue = {
  arrayUnion: (...values) => ({ [ARRAY_UNION]: values }),
};

// FieldPath.documentId() — used once, in utils/pagination.js, as the
// tiebreaker field in its orderBy/startAfter cursor. Mapped to Mongo's
// real primary key (_id) wherever it appears in where()/orderBy().
const DOCUMENT_ID = Symbol('documentId');
const FieldPath = {
  documentId: () => DOCUMENT_ID,
};
function fieldName(f) {
  return f === DOCUMENT_ID ? '_id' : f;
}

// Splits a set()/update() payload into plain fields (→ $set) and any
// FieldValue.arrayUnion markers (→ $addToSet), since a single Mongo update
// document can carry both operators at once.
function splitFieldValues(data) {
  const setFields = {};
  const addToSet = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && ARRAY_UNION in value) {
      addToSet[key] = { $each: value[ARRAY_UNION] };
    } else {
      setFields[key] = value;
    }
  }
  return { setFields, addToSet };
}

function stripId(doc) {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  return rest;
}

function makeDocRef(collectionName, id) {
  return {
    id,
    collectionName,
    async get(opts = {}) {
      const c = await col(collectionName);
      const doc = await c.findOne({ _id: id }, { session: opts.session });
      return {
        exists: !!doc,
        id,
        ref: makeDocRef(collectionName, id),
        data: () => stripId(doc),
      };
    },
    async set(data, opts = {}) {
      const c = await col(collectionName);
      const { setFields, addToSet } = splitFieldValues(data);
      const update = { $set: setFields };
      if (Object.keys(addToSet).length) update.$addToSet = addToSet;
      if (opts.merge) {
        await c.updateOne({ _id: id }, update, { upsert: true, session: opts.session });
      } else {
        // Firestore's set() without merge replaces the whole document.
        await c.replaceOne({ _id: id }, { _id: id, ...setFields }, { upsert: true, session: opts.session });
        if (Object.keys(addToSet).length) {
          await c.updateOne({ _id: id }, { $addToSet: addToSet }, { session: opts.session });
        }
      }
    },
    async update(data, opts = {}) {
      const c = await col(collectionName);
      const { setFields, addToSet } = splitFieldValues(data);
      const update = { $set: setFields };
      if (Object.keys(addToSet).length) update.$addToSet = addToSet;
      const result = await c.updateOne({ _id: id }, update, { session: opts.session });
      if (result.matchedCount === 0) {
        throw Object.assign(new Error(`No document to update: ${collectionName}/${id}`), { code: 'NOT_FOUND' });
      }
    },
    async delete(opts = {}) {
      const c = await col(collectionName);
      await c.deleteOne({ _id: id }, { session: opts.session });
    },
  };
}

// Builds a Mongo filter from accumulated where()/startAfter() state.
// startAfter is Firestore's keyset-pagination cursor: given the same
// orderBy chain used to fetch the page, "after (v1, v2, ...)" means
// (f1 cmp v1) OR (f1 == v1 AND f2 cmp v2) OR ... — see utils/pagination.js,
// the only caller, which always orders by one field + documentId() as a
// tiebreaker.
function buildQuery(state) {
  const filter = {};
  const clauses = [];
  for (const { field, op, value } of state.filters) {
    const key = fieldName(field);
    switch (op) {
      case '==':
      case 'array-contains':
        clauses.push({ [key]: { $eq: value } });
        break;
      case '!=':
        clauses.push({ [key]: { $ne: value } });
        break;
      case '<':
        clauses.push({ [key]: { $lt: value } });
        break;
      case '<=':
        clauses.push({ [key]: { $lte: value } });
        break;
      case '>':
        clauses.push({ [key]: { $gt: value } });
        break;
      case '>=':
        clauses.push({ [key]: { $gte: value } });
        break;
      case 'in':
        clauses.push({ [key]: { $in: value } });
        break;
      default:
        throw new Error(`Unsupported where() operator: ${op}`);
    }
  }

  if (state.startAfterValues) {
    const orClauses = [];
    for (let i = 0; i < state.orders.length; i++) {
      const and = [];
      for (let j = 0; j < i; j++) {
        and.push({ [fieldName(state.orders[j].field)]: { $eq: state.startAfterValues[j] } });
      }
      const op = state.orders[i].dir === 'desc' ? '$lt' : '$gt';
      and.push({ [fieldName(state.orders[i].field)]: { [op]: state.startAfterValues[i] } });
      orClauses.push(and.length === 1 ? and[0] : { $and: and });
    }
    clauses.push(orClauses.length === 1 ? orClauses[0] : { $or: orClauses });
  }

  if (clauses.length === 1) Object.assign(filter, clauses[0]);
  else if (clauses.length > 1) filter.$and = clauses;

  const sort = {};
  for (const { field, dir } of state.orders) sort[fieldName(field)] = dir === 'desc' ? -1 : 1;

  return { filter, sort };
}

function makeQuery(collectionName, state) {
  const self = {
    where(field, op, value) {
      return makeQuery(collectionName, { ...state, filters: [...state.filters, { field, op, value }] });
    },
    orderBy(field, dir = 'asc') {
      return makeQuery(collectionName, { ...state, orders: [...state.orders, { field, dir }] });
    },
    limit(n) {
      return makeQuery(collectionName, { ...state, limitN: n });
    },
    startAfter(...values) {
      return makeQuery(collectionName, { ...state, startAfterValues: values });
    },
    async get(opts = {}) {
      const c = await col(collectionName);
      const { filter, sort } = buildQuery(state);
      let cursor = c.find(filter, { session: opts.session });
      if (Object.keys(sort).length) cursor = cursor.sort(sort);
      if (state.limitN) cursor = cursor.limit(state.limitN);
      const docs = await cursor.toArray();
      const snapDocs = docs.map((d) => ({
        id: d._id,
        ref: makeDocRef(collectionName, d._id),
        data: () => stripId(d),
      }));
      return {
        empty: snapDocs.length === 0,
        size: snapDocs.length,
        docs: snapDocs,
        forEach: (cb) => snapDocs.forEach(cb),
      };
    },
    count() {
      return {
        async get(opts = {}) {
          const c = await col(collectionName);
          const { filter } = buildQuery(state);
          const count = await c.countDocuments(filter, { session: opts.session });
          return { data: () => ({ count }) };
        },
      };
    },
  };
  return self;
}

function collection(name) {
  const query = makeQuery(name, { filters: [], orders: [], limitN: null, startAfterValues: null });
  return {
    ...query,
    doc(id) {
      return makeDocRef(name, id || generateId());
    },
    async add(data) {
      const c = await col(name);
      const id = generateId();
      const { setFields, addToSet } = splitFieldValues(data);
      await c.insertOne({ _id: id, ...setFields });
      if (Object.keys(addToSet).length) await c.updateOne({ _id: id }, { $addToSet: addToSet });
      return makeDocRef(name, id);
    },
  };
}

function batch() {
  const ops = []; // { type: 'set'|'update'|'delete', ref, data, opts }
  return {
    set(ref, data, opts = {}) {
      ops.push({ type: 'set', ref, data, opts });
    },
    update(ref, data) {
      ops.push({ type: 'update', ref, data });
    },
    delete(ref) {
      ops.push({ type: 'delete', ref });
    },
    async commit() {
      // Firestore batches are atomic; grouping the queued writes in a
      // session transaction preserves that guarantee (requires the
      // replica-set config — see the deploy plan).
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          for (const op of ops) {
            if (op.type === 'set') await op.ref.set(op.data, { ...op.opts, session });
            else if (op.type === 'update') await op.ref.update(op.data, { session });
            else await op.ref.delete({ session });
          }
        });
      } finally {
        await session.endSession();
      }
    },
  };
}

async function runTransaction(fn) {
  await ready;
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const tx = {
        get: (refOrQuery, opts = {}) => refOrQuery.get({ ...opts, session }),
        set: (ref, data, opts = {}) => ref.set(data, { ...opts, session }),
        update: (ref, data) => ref.update(data, { session }),
        delete: (ref) => ref.delete({ session }),
      };
      result = await fn(tx);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function ping() {
  await ready;
  return client.db(dbName).command({ ping: 1 });
}

// --- Auth (replaces Firebase Auth's admin.createUser/getUserByEmail/
// updateUser/deleteUser). Firebase Auth and the Firestore `users` profile
// doc were always two separate systems sharing only a uid (register()/
// deleteUser() write/delete each independently — see authController.js and
// superAdminUserController.js) — kept that way here in a dedicated
// credentials collection, rather than merging into `users`, since several
// callers do a full (non-merge) `.set()` on the profile doc that would
// otherwise silently wipe the password hash.
const bcrypt = require('bcryptjs');
const AUTH_COLLECTION = '_auth_credentials';

const auth = {
  async createUser({ email, password, displayName }) {
    const c = await col(AUTH_COLLECTION);
    const existing = await c.findOne({ email });
    if (existing) {
      throw Object.assign(new Error('The email address is already in use by another account.'), { code: 'auth/email-already-exists' });
    }
    const uid = generateId();
    const passwordHash = await bcrypt.hash(password, 10);
    await c.insertOne({ _id: uid, email, passwordHash, displayName, disabled: false });
    return { uid };
  },
  async getUserByEmail(email) {
    const c = await col(AUTH_COLLECTION);
    const doc = await c.findOne({ email });
    if (!doc) {
      throw Object.assign(new Error('There is no user record corresponding to the provided identifier.'), { code: 'auth/user-not-found' });
    }
    return { uid: doc._id, email: doc.email, disabled: !!doc.disabled };
  },
  async updateUser(uid, updates) {
    const c = await col(AUTH_COLLECTION);
    const set = {};
    if ('disabled' in updates) set.disabled = updates.disabled;
    if ('password' in updates) set.passwordHash = await bcrypt.hash(updates.password, 10);
    const result = await c.updateOne({ _id: uid }, { $set: set });
    if (result.matchedCount === 0) {
      throw Object.assign(new Error('There is no user record corresponding to the provided identifier.'), { code: 'auth/user-not-found' });
    }
  },
  async deleteUser(uid) {
    const c = await col(AUTH_COLLECTION);
    await c.deleteOne({ _id: uid });
  },
  // Verifies a login password directly against the stored hash — replaces
  // the Identity Toolkit REST call (signInWithPassword) authController.js
  // used to make against Firebase Auth.
  async verifyPassword(email, password) {
    const c = await col(AUTH_COLLECTION);
    const doc = await c.findOne({ email });
    if (!doc) return false;
    return bcrypt.compare(password, doc.passwordHash);
  },
};

module.exports = { db: { collection, batch, runTransaction, ping }, auth, FieldValue, FieldPath, ObjectId };
