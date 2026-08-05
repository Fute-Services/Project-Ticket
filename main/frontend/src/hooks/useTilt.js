import { useRef, useCallback } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Pointer-tracked tilt for a surface. The element leans away from the cursor
 * like a physical panel — the CSS-cost version of the depth the WebGL scenes
 * show on the public pages.
 *
 * Writes CSS variables rather than React state so a hovered card never triggers
 * a re-render; twenty cards on a dashboard stay free.
 *
 * Usage:  const tilt = useTilt();  <div className="surface tilt" {...tilt} />
 */
export function useTilt({ max = 6, lift = 4 } = {}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const onPointerMove = useCallback(e => {
    const el = ref.current;
    if (!el || reduced) return;
    // Coarse pointers (touch) have no hover state to lean into
    if (e.pointerType === 'touch') return;

    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;

    el.style.setProperty('--tilt-y', `${px * max * 2}deg`);
    el.style.setProperty('--tilt-x', `${-py * max * 2}deg`);
    el.style.setProperty('--tilt-lift', `${-lift}px`);
  }, [max, lift, reduced]);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-lift', '0px');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
