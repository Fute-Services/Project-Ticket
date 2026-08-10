import { useEffect } from 'react';

/**
 * Dismissal behaviour for the hand-rolled overlays.
 *
 * Most overlays in this app were migrated to the Radix primitives in
 * `components/ui`, which handle this for free. A few were not, and they were
 * missing the two things users expect from any modal: Escape closes it, and a
 * click on the backdrop closes it. Once open they could only be dismissed by
 * finding the X, and Escape did nothing at all.
 *
 * This adds only behaviour — no markup and no styling — so the overlays look
 * exactly as they did.
 */
export function useEscapeToClose(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

/**
 * Spread onto the full-screen backdrop element. The target check is what keeps
 * a click *inside* the panel — or a drag that happens to end on the backdrop —
 * from closing the overlay.
 */
export function backdropProps(onClose) {
  return {
    onMouseDown: (e) => {
      if (e.target === e.currentTarget) onClose?.();
    },
  };
}
