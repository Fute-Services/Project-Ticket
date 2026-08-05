import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Intro, { INTRO_TOTAL_MS } from '../components/Intro';

const EASE = [0.22, 1, 0.36, 1];

// The page is always mounted and simply waits for the intro to clear. Gating it
// on an "intro finished" callback made a single broken animation blank the
// whole screen; a delay can't fail that way.
const REVEAL = INTRO_TOTAL_MS / 1000;

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      <Intro />

      <main className="min-h-screen flex flex-col items-center justify-center gap-12 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: REVEAL }}
          className="font-heading font-extrabold text-5xl sm:text-7xl tracking-[-0.04em] text-ink text-center"
        >
          Fute Services
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: REVEAL + 0.15 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary w-56 sm:w-40 justify-center py-3"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="btn btn-secondary w-56 sm:w-40 justify-center py-3"
          >
            Sign Up
          </button>
        </motion.div>
      </main>
    </div>
  );
}
