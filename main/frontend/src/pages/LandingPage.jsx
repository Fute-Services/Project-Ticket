import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleGetStarted() {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'founder') navigate('/founder/dashboard');
    else if (user.role === 'hr') navigate('/hr/dashboard');
    else if (user.role === 'it') navigate('/it/dashboard');
    else navigate('/employee/dashboard');
  }

  return (
    <div className="min-h-screen hero-bg flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between">
        <span className="text-2xl font-black gradient-text tracking-tight">FUTE</span>
        <div className="flex items-center gap-3">
          {!user && (
            <>
              <button onClick={() => navigate('/login')} className="text-sm text-white/60 hover:text-white transition px-4 py-2">
                Login
              </button>
              <button onClick={() => navigate('/register')} className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold transition btn-glow">
                Register
              </button>
            </>
          )}
          {user && (
            <button onClick={handleGetStarted} className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold transition btn-glow">
              Dashboard
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Badge */}
          <span className="text-xs font-semibold px-4 py-1.5 rounded-full border border-brand-500/30 text-brand-500 bg-brand-500/10 tracking-widest uppercase">
            Internal Portal
          </span>

          {/* Heading */}
          <h1 className="text-5xl sm:text-7xl font-black leading-none tracking-tight">
            <span className="gradient-text">Fute</span>
            <br />
            <span className="text-white/90">Complaint Portal</span>
          </h1>

          <p className="text-lg text-white/40 max-w-md leading-relaxed">
            Raise, track, and resolve complaints with HR & IT — all in one place. Every issue gets a unique token.
          </p>

          <button
            onClick={handleGetStarted}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition btn-glow"
          >
            Get Started <ArrowRight size={20} />
          </button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mt-4"
        >
          {[
            { icon: <Zap size={14} />, text: 'Instant Token Generation' },
            { icon: <Shield size={14} />, text: 'Role-Based Access' },
            { icon: <Users size={14} />, text: 'HR & IT Departments' },
          ].map((f) => (
            <div key={f.text} className="glass flex items-center gap-2 px-4 py-2 rounded-full text-sm text-white/60">
              <span className="text-brand-500">{f.icon}</span>
              {f.text}
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="text-center py-6 text-xs text-white/20">
        © {new Date().getFullYear()} Fute — Internal Use Only
      </footer>
    </div>
  );
}
