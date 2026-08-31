import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getRenders, addRender as addRenderApi, updateRender as updateRenderApi } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';
import { useCursorPagination } from '../hooks/useCursorPagination';

const RenderContext = createContext(null);

// Own writes already update local state optimistically (addRender/
// updateRender below) - this interval only exists to pick up changes made
// by *other* sessions. Render job status doesn't change minute-to-minute,
// so this can afford to be looser (5min).
const POLL_MS = 300000;

// Shared between the Production dashboard (writes) and IT's read-only
// Rendering Status view (reads) - both now read the same backend collection.
export function RenderProvider({ children }) {
  const { user } = useAuth();
  const [renders, setRenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const canSeeRenders = Boolean(user) && ['it', 'production'].includes(user.role);
  const { hasMore, loadingMore, setCursor, loadMore } = useCursorPagination();

  const refresh = useCallback(async () => {
    if (!user || !['it', 'production'].includes(user.role)) {
      setRenders([]);
      setCursor(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getRenders();
      setRenders(data?.items || []);
      setCursor(data?.nextCursor || null);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load render jobs:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on
    // id/role (stable primitives), not the `user` object itself, which
    // AuthContext replaces with a new reference on every login-state
    // refresh even when the actual user hasn't changed - depending on the
    // object caused this refresh to needlessly refire and duplicate reads.
  }, [user?.id, user?.role, setCursor]);

  // Appends the next 20 - resets back to page 1 on the next poll/refresh.
  function loadMoreRenders() {
    return loadMore(getRenders, (items) => setRenders((prev) => [...prev, ...items]));
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, canSeeRenders);

  async function addRender(job) {
    try {
      const { data } = await addRenderApi(job);
      setRenders((prev) => [data, ...prev]);
    } catch (e) {
      console.error('Failed to add render job:', e.response?.data?.error || e.message);
      throw e;
    }
  }

  async function updateRenderField(id, field, value) {
    setRenders((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    try {
      const { data } = await updateRenderApi(id, { [field]: value });
      setRenders((prev) => prev.map((r) => (r.id === id ? data : r)));
    } catch (e) {
      console.error('Failed to update render job:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  function toggleStatus(id) {
    const job = renders.find((r) => r.id === id);
    if (!job) return;
    updateRenderField(id, 'status', job.status === 'Completed' ? 'Pending' : 'Completed');
  }

  return (
    <RenderContext.Provider
      value={{
        renders,
        loading,
        addRender,
        toggleStatus,
        updateRenderField,
        refresh,
        lastUpdated,
        hasMoreRenders: hasMore,
        loadMoreRenders,
        loadingMore,
      }}
    >
      {children}
    </RenderContext.Provider>
  );
}

export function useRenders() {
  return useContext(RenderContext);
}

// "100-300" -> 201 frames. Falls back to counting the job as a single frame
// if someone types something that isn't a range, rather than throwing. Used
// by both the Production dashboard and IT's read-only Rendering Status view,
// so it lives with the data shape rather than being copied into each.
export function frameCount(frameNo) {
  const m = String(frameNo).match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!m) return 1;
  return Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10) + 1);
}
