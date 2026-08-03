import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      login({ id: data.id, email: data.email, role: data.role, full_name: data.full_name }, data.token);
      toast.success(`Welcome back, ${data.full_name?.split(' ')[0]}!`);
      // Route based on role
      if (data.role === 'founder') navigate('/founder/dashboard');
      else if (data.role === 'hr') navigate('/hr/dashboard');
      else if (data.role === 'it') navigate('/it/dashboard');
      else navigate('/employee/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <span className="text-3xl font-black gradient-text">FUTE</span>
          <h1 className="text-xl font-bold text-white mt-2">Welcome back</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to your Fute account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm pr-10"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition btn-glow disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-500 hover:text-brand-400 font-semibold transition">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
