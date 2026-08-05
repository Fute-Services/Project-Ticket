import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../utils/api';
import { DEPARTMENTS } from '../utils/constants';
import { Eye, EyeOff } from 'lucide-react';
import Stage3D from '../components/three/Stage3D';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      login({
        id: data.id,
        email: data.email,
        role: data.role,
        full_name: data.full_name,
        department: data.department,
      }, data.token);
      toast.success(`Welcome, ${data.full_name?.split(' ')[0]}!`);
      if (data.role === 'founder') navigate('/founder/dashboard');
      else if (data.role === 'hr') navigate('/hr/dashboard');
      else if (data.role === 'it') navigate('/it/dashboard');
      else navigate('/employee/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stage3D
      variant="ambient"
      className="min-h-screen hero-bg flex"
      contentClassName="flex-1 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface elev-3 rounded-3xl p-8 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <span className="text-3xl font-black gradient-text">FUTE</span>
          <h1 className="text-xl font-bold text-white mt-2">Create your account</h1>
          <p className="text-sm text-white/40 mt-1">Join the Fute complaint portal</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Jane Doe"
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm"
            />
          </div>

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
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Department</label>
            <select
              required
              value={form.department}
              onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
            >
              <option value="" disabled className="bg-[#1e1e2e]">Select department</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d} className="bg-[#1e1e2e]">{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-500 hover:text-brand-400 font-semibold transition">
            Sign In
          </Link>
        </p>
      </motion.div>
    </Stage3D>
  );
}
