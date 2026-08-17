import { useEffect, useRef } from 'react';

// Pauses the interval while the tab is hidden and fires one immediate
// refresh on regaining visibility instead of waiting out the stale interval.
export function useVisibilityAwarePolling(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let id = null;

    function start() {
      if (id) return;
      id = setInterval(() => callbackRef.current(), intervalMs);
    }
    function stop() {
      if (id) clearInterval(id);
      id = null;
    }
    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        callbackRef.current();
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, enabled]);
}
