import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { loginUser } from '../utils/api';
import { dummyLogin, DEMO_ACCOUNTS } from '../utils/dummyAuth';
import AuthLayout from '../components/AuthLayout';
import IconField from '../components/IconField';

/**
 * Sign-in. Per PRD §4.1 there is one login UI for every role — the role comes
 * from the account, and routing after sign-in follows from it.
 *
 * Forgot-password is shown disabled rather than left out: there's no
 * password-reset endpoint on the backend, so a click would 404. A visible,
 * honestly disabled control beats one that looks live and silently fails.
 * Google/Apple sign-in isn't shown at all — no OAuth is wired up, and unlike
 * a disabled state, an entire missing feature has no honest way to display.
 */
export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    if (error) setError('');
  }

  function signInWithSession(data) {
    login(
      {
        id: data.id,
        email: data.email,
        role: data.role,
        full_name: data.full_name,
        department: data.department,
      },
      data.token,
      remember
    );
    navigate(homeFor(data.role));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let data;
      try {
        ({ data } = await loginUser(form));
      } catch (err) {
        // No backend reachable (Firebase isn't configured here) — fall back
        // to the local demo accounts instead of dead-ending the user.
        if (err.response) throw err;
        ({ data } = dummyLogin(form));
      }
      signInWithSession(data);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'That email and password do not match. Please try again.'
          : 'We could not sign you in. Please try again in a few moments.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(account) {
    setError('');
    const { data } = dummyLogin(account);
    signInWithSession(data);
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-white mb-1.5 leading-none">
        Welcome back
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 mb-6">
        Sign in to raise a ticket or pick up your queue.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
        <IconField
          icon={Mail}
          label="EMAIL ADDRESS"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="you@futeservices.com"
        />

        <IconField
          icon={Lock}
          label="PASSWORD"
          type={showPass ? 'text' : 'password'}
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          placeholder="Enter your password"
          right={
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-xs py-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-[#e86024] focus:ring-0 accent-[#e86024] cursor-pointer"
            />
            <span>Remember me</span>
          </label>
          <span
            title="Password reset isn't available yet"
            className="text-gray-500 hover:text-gray-400 cursor-not-allowed select-none transition-colors"
          >
            Forgot password?
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs px-4 py-2.5 text-orange-300 bg-orange-950/40 border border-orange-800/60 rounded-xl"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold py-2.5 pl-5 pr-1.5 rounded-full flex items-center justify-between shadow-md shadow-orange-950/40 transition-all transform active:scale-[0.99] cursor-pointer mt-1 disabled:opacity-50"
        >
          <span className="text-sm font-bold">
            {loading ? 'Signing in…' : 'Sign in'}
          </span>
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-full bg-white text-[#e86024] flex items-center justify-center shrink-0 shadow-sm"
          >
            <ArrowRight size={15} />
          </span>
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-5 text-left">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-[#e86024] hover:underline">
          Sign up
        </Link>
      </p>

      <div className="mt-5 pt-4 border-t border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Demo mode — no backend needed
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDemoLogin(account)}
              className="text-[11px] font-medium capitalize px-3 py-1.5 rounded-full border border-white/15 text-gray-300 hover:border-[#e86024] hover:text-[#e86024] transition-colors cursor-pointer"
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
