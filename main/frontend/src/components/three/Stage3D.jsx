import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Own chunk — three.js never lands in the main bundle
const TokenScene = lazy(() => import('./TokenScene'));

// One probe per page load; creating throwaway contexts is not free
let webglSupport = null;
function supportsWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

// Phones and low-core machines get the static image rather than a stuttering scene
function isLowPower() {
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
  return window.matchMedia('(pointer: coarse) and (max-width: 640px)').matches;
}

/**
 * Hosts a WebGL scene behind page content.
 *
 * Guarantees, per the 3D rules in docs/brand-guidelines.md:
 *  - lazy-loaded, never blocking first paint
 *  - static fallback with no WebGL, on reduced motion, or on low-power devices
 *  - render loop pauses off-screen and when the tab is hidden
 *  - decorative only — it never receives pointer events
 */
export default function Stage3D({ variant = 'hero', className = '', contentClassName = '', children }) {
  const holder = useRef(null);
  const reduced = useReducedMotion();
  const [capable, setCapable] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabActive, setTabActive] = useState(() => !document.hidden);

  // Decide on the client only — nothing here should run during module import
  useEffect(() => {
    setCapable(supportsWebGL() && !isLowPower());
  }, []);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const showScene = capable && visible;

  return (
    <div className={`relative ${className}`}>
      <div ref={holder} aria-hidden className="absolute inset-0 overflow-hidden">
        {showScene ? (
          <Suspense fallback={<div className="w-full h-full scene-fallback" />}>
            <TokenScene
              variant={variant}
              still={reduced}
              paused={!tabActive}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full scene-fallback" />
        )}
      </div>

      {/* Page content sits above the scene */}
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
}
