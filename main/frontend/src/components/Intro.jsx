import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TITLE = 'Fute Services';

/* Sequence timings in ms — tweak these to retime the whole intro.
 *   curtain rises → title letters rise in → hold → everything fades → onDone
 */
const CURTAIN_START = 350;
const CURTAIN_DURATION = 2600;
const TITLE_HOLD = 1300;
const FADE_DURATION = 800;

// Fraction of the rise after which the wordmark starts appearing
const TITLE_CUE = 0.55;

const EASE = [0.22, 1, 0.36, 1];
// Weighted lift: slow to start, then away. One curve for the whole keyframe
// run — framer-motion wants a single ease or one per segment, and mixing a
// named ease with a bezier array in the same list throws at runtime.
const CURTAIN_EASE = [0.5, 0, 0.2, 1];

const TITLE_DONE_AT =
  CURTAIN_START + CURTAIN_DURATION * TITLE_CUE + TITLE.length * 50 + 600;

// Total runtime of the intro, so the page underneath can time its own entrance
export const INTRO_TOTAL_MS = TITLE_DONE_AT + TITLE_HOLD + FADE_DURATION;

const titleGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const letter = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
};

/**
 * Opening sequence for the site. A curtain lifts, the wordmark rises in behind
 * it, then the whole thing fades away and hands over to the page underneath.
 *
 * @param {() => void} onDone  called once the intro has finished fading out
 */
export default function Intro({ onDone }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 'playing' → 'leaving' → unmounted
  const [phase, setPhase] = useState(reduced ? 'leaving' : 'playing');

  const titleDelay = (CURTAIN_START + CURTAIN_DURATION * TITLE_CUE) / 1000;

  // Held in a ref so callers can pass an inline arrow. If `onDone` were an
  // effect dependency, the re-render from setPhase would tear down the pending
  // timers and restart the sequence, and the intro would never finish.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reduced) {
      onDoneRef.current?.();
      return;
    }

    const leave = setTimeout(() => setPhase('leaving'), TITLE_DONE_AT + TITLE_HOLD);
    const finish = setTimeout(() => onDoneRef.current?.(), INTRO_TOTAL_MS);

    return () => {
      clearTimeout(leave);
      clearTimeout(finish);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {phase === 'playing' && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden bg-[#0f0f13]"
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_DURATION / 1000, ease: 'easeInOut' }}
        >
          {/* Wordmark — revealed as the curtain clears it */}
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <motion.h1
              variants={titleGroup}
              initial="hidden"
              animate="show"
              transition={{ delayChildren: titleDelay }}
              aria-label={TITLE}
              className="font-display text-5xl sm:text-7xl font-medium tracking-tight text-white text-center whitespace-pre"
            >
              {TITLE.split('').map((char, i) => (
                <motion.span key={i} variants={letter} aria-hidden className="inline-block">
                  {char}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Curtain.
              Weight: it dips a little first, as if taking up slack in the rope,
              then lifts and eases out at the top — a linear slide reads as a
              sliding panel, not fabric.
              Fabric: vertical fold gradients catch light down the drop, and the
              hem sags in the middle the way a hanging cloth does.
              Legibility: dark-on-dark motion is invisible, so the hem carries a
              lit edge and casts a soft shadow onto the stage below. */}
          <motion.div
            className="absolute bg-[#17171d]"
            style={{
              left: '-2%',
              right: '-2%',
              top: '-6%',
              height: '112%',
              borderBottomLeftRadius: '50% 3rem',
              borderBottomRightRadius: '50% 3rem',
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  rgba(255,255,255,0.035) 0px,
                  rgba(255,255,255,0.012) 18px,
                  rgba(0,0,0,0.20) 46px,
                  rgba(255,255,255,0.012) 74px,
                  rgba(255,255,255,0.035) 92px
                )
              `,
            }}
            initial={{ y: 0 }}
            animate={{ y: ['0%', '1.6%', '-112%'] }}
            transition={{
              duration: CURTAIN_DURATION / 1000,
              delay: CURTAIN_START / 1000,
              times: [0, 0.14, 1],
              ease: CURTAIN_EASE,
            }}
          >
            {/* Lit hem */}
            <div
              className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30 blur-[0.5px]"
              style={{ borderBottomLeftRadius: '50% 3rem', borderBottomRightRadius: '50% 3rem' }}
            />
            {/* Light gathering in the folds just above the hem */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/[0.07] to-transparent" />
            {/* Shadow the curtain throws onto the stage as it clears */}
            <div className="absolute inset-x-0 top-full h-40 bg-gradient-to-b from-black/55 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
