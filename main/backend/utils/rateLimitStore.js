const { rawCollection } = require('../config/db');

// express-rate-limit's default store keeps counts in the process's own
// memory. That's fine for one process, but the moment this backend ever runs
// as more than one instance (a second PM2/NSSM worker, a future load
// balancer), each instance counts independently — an attacker spreading
// requests across instances sees a limit N times higher than configured.
// This Store implementation (the interface express-rate-limit v8 expects:
// init/increment/decrement/resetKey) keeps the count in Mongo instead, so
// every instance shares one counter. Safe to use even with a single
// instance today — it's just a rate limiter backed by a DB instead of a Map.
//
// One collection doc per (prefix:key), holding the current window's count
// and its resetTime. A TTL index on resetTime (see config/db.js) still
// cleans up old window docs so the collection doesn't grow forever, but
// increment() below doesn't rely on that cleanup having happened yet — the
// TTL monitor only sweeps roughly once a minute, and matching a doc by _id
// alone (ignoring whether its resetTime had already passed) would keep
// incrementing a logically-expired window for however long it took TTL to
// actually delete it, extending the real block past the configured windowMs.
// The pipeline update below checks staleness itself, atomically, as part of
// the same single-document write MongoDB already guarantees is race-free —
// no separate read-then-decide step for two concurrent requests to race on.
class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.windowMs = 60_000; // overwritten by init() below before first use
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const col = await rawCollection('rate_limits');
    const now = new Date();
    const freshResetTime = new Date(now.getTime() + this.windowMs);
    // A missing resetTime (brand new key) is $eq null in aggregation, so the
    // same "$expired" test covers both "never seen before" and "seen, but
    // that window is over" — either way this write starts a fresh window.
    const doc = await col.findOneAndUpdate(
      { _id: this.key(key) },
      [
        {
          $set: {
            _expired: { $or: [{ $eq: ['$resetTime', null] }, { $lte: ['$resetTime', now] }] },
          },
        },
        {
          $set: {
            count: { $cond: ['$_expired', 1, { $add: ['$count', 1] }] },
            resetTime: { $cond: ['$_expired', freshResetTime, '$resetTime'] },
          },
        },
        { $unset: '_expired' },
      ],
      { upsert: true, returnDocument: 'after' }
    );
    const value = doc?.value ?? doc; // driver version differences in findOneAndUpdate's return shape
    return { totalHits: value.count, resetTime: value.resetTime };
  }

  async decrement(key) {
    const col = await rawCollection('rate_limits');
    await col.updateOne({ _id: this.key(key) }, { $inc: { count: -1 } });
  }

  async resetKey(key) {
    const col = await rawCollection('rate_limits');
    await col.deleteOne({ _id: this.key(key) });
  }
}

module.exports = MongoRateLimitStore;
