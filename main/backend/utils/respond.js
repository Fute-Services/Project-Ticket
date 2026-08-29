// Single place every controller sends a response through, so the wire
// format is actually one format instead of ~15 controllers each having
// picked their own shape (bare arrays, {id, deleted:true}, {error: '...'},
// null vs [] for "nothing here") over the life of the project.
//
// Frontend note: main/frontend/src/utils/api.js has a response interceptor
// that unwraps `{success:true, data}` back down to just `data` (and folds
// `{success:false, message}` back into the `.error` string shape existing
// catch blocks already read) — so this changed the actual HTTP contract
// without requiring every context/component that reads `response.data` to
// be rewritten.

function ok(res, data = null, { message = 'Request successful', meta, status = 200 } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data, message = 'Resource created') {
  return ok(res, data, { message, status: 201 });
}

function noContent(res) {
  return res.status(204).end();
}

function fail(res, { status = 500, message = 'Something went wrong', code = 'INTERNAL_ERROR', details = null } = {}) {
  return res.status(status).json({ success: false, message, error: { code, details } });
}

module.exports = { ok, created, noContent, fail };
