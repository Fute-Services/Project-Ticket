import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Crown, Shield, Users, Cpu, FolderKanban, User, TrendingUp, Code2, Megaphone, Palette, Factory } from 'lucide-react';
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

      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center mb-4">
          Quick Demo Access
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((account) => {
            const roleMeta = {
              founder: {
                label: 'Founder Portal',
                sub: 'Business Leadership',
                icon: Crown,
                color: 'hover:border-warning/50 hover:bg-warning/[0.04] hover:text-warning',
                badgeBg: 'bg-warning/10 text-warning',
              },
              superadmin: {
                label: 'Super Admin',
                sub: 'Full Platform Access',
                icon: Shield,
                color: 'hover:border-destructive/50 hover:bg-destructive/[0.04] hover:text-destructive',
                badgeBg: 'bg-destructive/10 text-destructive',
              },
              hr: {
                label: 'HR Department',
                sub: 'HR & Candidates',
                icon: Users,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              it: {
                label: 'IT Service Desk',
                sub: 'IT Support & Tickets',
                icon: Cpu,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              coordinator: {
                label: 'Coordinator',
                sub: 'Task & Project Mgmt',
                icon: FolderKanban,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              employee: {
                label: 'Employee Portal',
                sub: 'Personal Employee Space',
                icon: User,
                color: 'hover:border-primary/50 hover:bg-primary/[0.04] hover:text-primary',
                badgeBg: 'bg-primary/10 text-primary',
              },
              // These five have no backend behind them yet — same
              // illustrative data as the Founder's department views
              // (data/deptDemoData.js). "Demo data" is called out here too,
              // same as it is on the dashboard itself.
              sales: {
                label: 'Sales Operations',
                sub: 'Demo data only',
                icon: TrendingUp,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              developers: {
                label: 'Developer Portal',
                sub: 'Demo data only',
                icon: Code2,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              marketing: {
                label: 'Marketing Suite',
                sub: 'Demo data only',
                icon: Megaphone,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              branding: {
                label: 'Branding Hub',
                sub: 'Demo data only',
                icon: Palette,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
              production: {
                label: 'Production Floor',
                sub: 'Demo data only',
                icon: Factory,
                color: 'hover:border-muted/50 hover:bg-muted/[0.04] hover:text-muted-foreground',
                badgeBg: 'bg-muted/10 text-muted-foreground',
              },
            };

            const meta = roleMeta[account.role.toLowerCase()] || {
              label: account.role,
              sub: 'Demo Access',
              icon: User,
              color: 'hover:border-muted hover:text-muted-foreground',
              badgeBg: 'bg-muted/10 text-muted-foreground',
            };

            const Icon = meta.icon;

            return (
              <button
                key={account.role}
                type="button"
                onClick={() => handleDemoLogin(account)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg bg-muted border border-border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ${meta.color} ${account.role === 'employee' ? 'col-span-2' : ''}`}
              >
                <div className={`w-5 h-5 rounded-md ${meta.badgeBg} flex items-center justify-center shrink-0 border border-border transition-colors`}>
                  <Icon size={11} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-foreground group-hover:text-inherit transition-colors leading-none mb-0.5 capitalize truncate">
                    {meta.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-none truncate group-hover:text-muted-foreground transition-colors">
                    {meta.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AuthLayout>
  );
}
