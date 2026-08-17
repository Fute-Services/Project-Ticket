import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getRenders, addRender as addRenderApi, updateRender as updateRenderApi } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const RenderContext = createContext(null);

const POLL_MS = 20000;

// Shared between the Production dashboard (writes) and IT's read-only
// Rendering Status view (reads) — both now read the same backend collection.
export function RenderProvider({ children }) {
  const { user } = useAuth();
  const [renders, setRenders] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !['it', 'production'].includes(user.role)) {
      setRenders([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getRenders();
      setRenders(data);
    } catch (e) {
      console.error('Failed to load render jobs:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, Boolean(user));

  async function addRender(job) {
    try {
      const { data } = await addRenderApi(job);
      setRenders((prev) => [data, ...prev]);
    } catch (e) {
      console.error('Failed to add render job:', e.response?.data?.error || e.message);
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
    <RenderContext.Provider value={{ renders, loading, addRender, toggleStatus, updateRenderField, refresh }}>
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
