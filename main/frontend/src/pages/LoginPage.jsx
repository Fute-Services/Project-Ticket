import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { loginUser } from '../utils/api';
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
// Toggle: flip to `true` to bring the password field back — mirrors
// authController's PASSWORD_LOGIN_ENABLED on the backend. Both must agree,
// since the backend already ignores/doesn't require password when its own
// flag is off.
const PASSWORD_LOGIN_ENABLED = true;

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
      const { data } = await loginUser(form);
      signInWithSession(data);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? PASSWORD_LOGIN_ENABLED
            ? 'That email and password do not match. Please try again.'
            : 'No account found for that email. Please try again.'
          : 'We could not sign you in. Please try again in a few moments.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl sm:text-[38px] font-semibold tracking-tight text-foreground mb-1.5 leading-none text-center">
        Welcome back
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-6 text-center">
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

        {PASSWORD_LOGIN_ENABLED && (
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
        )}

        <div className="flex items-center justify-between text-xs py-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-muted bg-muted text-primary focus:ring-0 accent-primary cursor-pointer"
            />
            <span>Remember me</span>
          </label>
          <span
            title="Password reset isn't available yet"
            className="text-muted-foreground hover:text-muted-foreground cursor-not-allowed select-none transition-colors"
          >
            Forgot password?
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs px-4 py-2.5 text-primary bg-primary/10 border border-primary/60 rounded-xl text-center"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary text-foreground font-bold py-3 px-5 rounded-full flex items-center justify-between shadow-[0_0_25px_rgba(232,96,36,0.45)] hover:shadow-[0_0_35px_rgba(255,110,46,0.75)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer group mt-2 disabled:opacity-50"
        >
          <span className="text-sm font-bold pl-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </span>
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center shrink-0 shadow-md group-hover:translate-x-1 transition-transform duration-300"
          >
            <ArrowRight size={16} />
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
