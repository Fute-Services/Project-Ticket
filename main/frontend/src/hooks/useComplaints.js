import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Fetches complaints one page at a time.
 *
 * `fetchFn` receives `{ cursor }` and resolves to an axios-style response whose
 * data is `{ items, nextCursor, hasMore }`. Nothing here ever asks the API for
 * a whole collection, so the screen stays fast no matter how many tickets exist.
 */
export function useComplaints(fetchFn, deps = []) {
  const [complaints, setComplaints] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Keep the latest fetcher without making it a dependency of the effect
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchRef.current({});
      setComplaints(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error('We could not load your tickets. Please try again in a few moments.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await fetchRef.current({ cursor: nextCursor });
      setComplaints(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error('Could not load more tickets. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => { refetch(); }, [refetch]);

  return { complaints, setComplaints, loading, loadingMore, hasMore, loadMore, refetch };
}
