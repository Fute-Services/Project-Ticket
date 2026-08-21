import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Apple's iPhone/Mac setup "hello" screen, adapted: shown once right after
// signing in — RequireAuth renders this on top of the already-mounted
// dashboard (see its showIntro flag). The app's normal font, revealed
// left-to-right via clip-path. "Welcome" writes first, a short pause/fade
// beat, then the name writes on the same line. Two phases: "hello" (the
// write-on, holds), then the panels split and slide apart, revealing the
// real dashboard underneath. A tap/click at any point skips straight to
// onDone() — this is a welcome, not a gate.
const WELCOME_TEXT = 'Welcome, ';
const WELCOME_DRAW_S = 2;
const PAUSE_S = 0.25;
const OPEN_DURATION_S = 1;
const READ_PAUSE_MS = 1000;

// A short name draws fast; a long one gets more time so it doesn't look
// rushed — clamped so neither extreme feels off.
function nameDrawDurationFor(nameText) {
  return Math.min(3.5, Math.max(1, nameText.length * 0.1));
}

export default function WelcomeIntro({ name, onDone }) {
  const [phase, setPhase] = useState('hello');
  // null until the rendered width is measured — kept invisible until then
  // so nobody sees an unscaled flash before the fit-to-one-line scale is
  // known (matters most for a long full name).
  const [layout, setLayout] = useState(null);
  const welcomeRef = useRef(null);
  const nameRef = useRef(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const nameText = name || 'there';
  const nameDrawS = nameDrawDurationFor(nameText);
  const totalDrawS = WELCOME_DRAW_S + PAUSE_S + nameDrawS;
  const holdMs = totalDrawS * 1000 + READ_PAUSE_MS;

  // Scales the whole line down to fit within one row instead of wrapping or
  // overflowing — matters for a long full name. Runs after layout so the
  // refs' real rendered widths (the app's normal font, already loaded by
  // the time anyone reaches this screen) are available to measure.
  useLayoutEffect(() => {
    if (!welcomeRef.current || !nameRef.current) return;
    const welcomeWidth = welcomeRef.current.scrollWidth;
    const nameWidth = nameRef.current.scrollWidth;
    const totalWidth = welcomeWidth + nameWidth;
    const available = window.innerWidth * 0.88;
    const scale = totalWidth > available ? available / totalWidth : 1;
    setLayout({ welcomeWidth, totalWidth, scale });
  }, [nameText]);

  useEffect(() => {
    if (reduceMotion) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setPhase('open'), holdMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drives onDone off a plain timer matched to OPEN_DURATION_S rather than
  // Framer's onAnimationComplete — that fired inconsistently (sometimes
  // right as the 'open' phase started rather than once the slide actually
  // finished), which looked like an instant jump straight to the dashboard
  // with no visible curtain-up animation at all.
  useEffect(() => {
    if (phase !== 'open') return;
    const t = setTimeout(() => onDone?.(), OPEN_DURATION_S * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (reduceMotion) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Skip welcome animation"
      onClick={onDone}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDone?.()}
      className="fixed inset-0 z-[100] cursor-pointer select-none overflow-hidden"
    >
      <motion.div
        initial={{ y: 0 }}
        animate={phase === 'open' ? { y: '-100%' } : { y: 0 }}
        transition={{ type: 'tween', duration: OPEN_DURATION_S, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-0 bg-black"
      />

      <AnimatePresence>
        {phase === 'hello' && (
          <motion.div
            key="hello-text"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="relative flex whitespace-nowrap"
              style={{
                transform: layout ? `scale(${layout.scale})` : undefined,
                opacity: layout ? 1 : 0,
                lineHeight: 1.35,
              }}
            >
              <motion.span
                ref={welcomeRef}
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={layout ? { clipPath: 'inset(0 0% 0 0)' } : {}}
                transition={{ duration: WELCOME_DRAW_S, ease: [0.45, 0.05, 0.55, 0.95] }}
                className="block text-2xl sm:text-4xl font-light text-white"
              >
                {WELCOME_TEXT}
              </motion.span>
              <motion.span
                ref={nameRef}
                initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                animate={layout ? { clipPath: 'inset(0 0% 0 0)', opacity: 1 } : {}}
                transition={{ duration: nameDrawS, ease: [0.45, 0.05, 0.55, 0.95], delay: WELCOME_DRAW_S + PAUSE_S }}
                className="block text-2xl sm:text-4xl font-medium text-white"
              >
                {nameText}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
