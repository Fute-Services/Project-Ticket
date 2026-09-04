const { FieldPath } = require('../config/db');

const PAGE_SIZE = 20;

// Cursor is "<orderBy field value>|<doc id>" — the doc id tiebreaks so two
// docs with the same field value (e.g. same submitted_at millisecond) still
// paginate deterministically instead of skipping/repeating a row.
function decodeCursor(raw) {
  if (!raw) return null;
  const idx = raw.lastIndexOf('|');
  if (idx === -1) return null;
  return { value: raw.slice(0, idx), id: raw.slice(idx + 1) };
}

// Returns null (not a cursor) when the ordering field is missing on this
// doc. Firestore's own orderBy() used to drop such legacy docs from ordered
// results entirely; Mongo's sort doesn't, so they can land on a page
// boundary here — encoding "undefined" into the cursor would compare a real
// field value against the literal string "undefined" on the next page and
// silently truncate pagination. Stopping here instead is the safe
// equivalent of the old drop-from-ordered-results behavior.
function encodeCursor(lastDoc, field) {
  const value = lastDoc.data()[field];
  if (value === undefined || value === null) return null;
  return `${value}|${lastDoc.id}`;
}

// Runs `query` ordered by `field` desc (doc id as tiebreaker), starting
// after the given opaque `after` cursor, one page (PAGE_SIZE) at a time.
async function paginatedQuery(query, field, after) {
  let q = query.orderBy(field, 'desc').orderBy(FieldPath.documentId(), 'desc');
  const cursor = decodeCursor(after);
  if (cursor) q = q.startAfter(cursor.value, cursor.id);

  const snap = await q.limit(PAGE_SIZE).get();
  const nextCursor = snap.docs.length === PAGE_SIZE ? encodeCursor(snap.docs[snap.docs.length - 1], field) : null;
  return { docs: snap.docs, nextCursor };
}

module.exports = { PAGE_SIZE, paginatedQuery };
