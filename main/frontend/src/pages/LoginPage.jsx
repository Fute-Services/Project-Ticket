import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { loginUser } from '../utils/api';

/**
 * Sign-in. Layout and type follow the "Modernist" design prototype: split
 * screen, form left, accent panel right, square corners throughout.
 *
 * Per PRD §4.1 there is one login UI for every role — the role comes from the
 * account, and routing after sign-in follows from it. The prototype's SSO and
 * MFA steps are not built: neither is in the PRD.
 */
export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await loginUser(form);
      login(
        {
          id: data.id,
          email: data.email,
          role: data.role,
          full_name: data.full_name,
          department: data.department,
        },
        data.token
      );
      navigate(homeFor(data.role));
    } catch (err) {
      // Never surface a raw server message or status code to the user
      setError(
        err.response?.status === 401
          ? 'That email and password do not match. Please try again.'
          : 'We could not sign you in. Please try again in a few moments.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 py-14">
        <div className="w-full max-w-[400px] mx-auto lg:mx-0 lg:ml-auto lg:mr-16">
          <Link to="/" className="flex items-center gap-2.5 mb-10 no-underline text-ink">
            <span className="w-[26px] h-[26px] bg-acc block" />
            <span className="font-heading font-extrabold text-[15px]">Fute Services</span>
          </Link>

          <h1 className="text-[46px] leading-[1.02] tracking-[-0.04em] m-0 mb-2.5">
            Welcome back
          </h1>
          <p className="text-sm text-mut m-0 mb-7">
            Sign in with your work account to raise a ticket or pick up the queue.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            <label className="field">
              <span className="label">Work email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@futeservices.com"
                className="input"
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="••••••••••"
                  className="input pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-mut hover:text-ink"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="text-[13px] m-0 px-3 py-2.5 text-acc"
                style={{ background: 'color-mix(in srgb, var(--acc) 12%, transparent)' }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-block mt-1.5">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-[12.5px] text-mut mt-6 mb-0">
            No account yet?{' '}
            <Link to="/signup" className="font-bold">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Accent panel — hidden on small screens, where it would just push the form down */}
      <aside className="hidden lg:flex flex-col justify-between bg-acc text-[#f3f2f2] px-11 py-14">
        <div className="text-[10.5px] tracking-[0.14em] uppercase opacity-85">
          Fute Services · one platform
        </div>

        <div>
          <div className="font-heading font-extrabold text-[52px] leading-[0.98] tracking-[-0.04em]">
            Every issue gets a ticket.
          </div>
          <div className="text-sm opacity-90 mt-4 max-w-[34ch]">
            Raise it with HR or IT, get a token, and track it to resolution — without
            chasing anyone over email.
          </div>
        </div>

        <div className="flex gap-8 border-t-2 border-[#f3f2f2]/40 pt-[18px]">
          <div>
            <div className="font-heading font-extrabold text-2xl">FT-HR</div>
            <div className="text-[11px] opacity-85">HR complaints</div>
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl">FT-IT</div>
            <div className="text-[11px] opacity-85">IT support</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
