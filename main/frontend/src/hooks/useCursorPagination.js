import { useCallback, useState } from 'react';

// The nextCursor/loadingMore state + guard/try/catch/finally boilerplate was
// duplicated near-identically across TicketContext, ApprovalContext, and
// TaskProjectContext, each with its own state pair. This is the shared
// mechanics only — each context still owns its own `refresh()` (role gating,
// polling, per-item shape) and just calls `setCursor`/`loadMore` from here.
export function useCursorPagination() {
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // `fetchPage(cursor)` resolves to { data: { items, nextCursor } } (the
  // shared shape every cursor-paginated endpoint in this app returns).
  // `onAppend(items)` merges the new page into the caller's own list state.
  const loadMore = useCallback(
    async (fetchPage, onAppend) => {
      if (!cursor || loadingMore) return;
      setLoadingMore(true);
      try {
        const { data } = await fetchPage(cursor);
        onAppend(data?.items || []);
        setCursor(data?.nextCursor || null);
      } catch (e) {
        console.error('Failed to load more:', e.response?.data?.error || e.message);
      } finally {
        setLoadingMore(false);
      }
    },
    [cursor, loadingMore]
  );

  return { cursor, hasMore: Boolean(cursor), loadingMore, setCursor, loadMore };
}
