// Pagination footer for complaint lists — we never load a whole collection at once.
export default function LoadMore({ hasMore, loading, onClick, shown, unit = 'tickets' }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-8">
      <p className="text-xs text-white/25">
        Showing {shown} {unit}
        {hasMore ? '' : shown > 0 ? ' — that’s everything' : ''}
      </p>
      {hasMore && (
        <button
          onClick={onClick}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
