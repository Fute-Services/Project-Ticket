// Escapes a value for safe interpolation into a hand-built HTML string —
// used wherever a page constructs raw HTML itself (window.open().document.write,
// an .xls-via-HTML export) instead of letting React escape it automatically.
// Mirrors the backend's own utils/mailer.js escapeHtml, used the same way
// before user text goes into an HTML email.
export function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
