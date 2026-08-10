import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Building2, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { registerUser } from '../utils/api';
import { dummyRegister } from '../utils/dummyAuth';
import AuthLayout from '../components/AuthLayout';
import IconField from '../components/IconField';

const DEPARTMENTS = ['Sales', 'Marketing', 'Human Resources', 'IT', 'Engineering', 'Finance'];

/**
 * Create an account. Mirrors LoginPage — the accent panel sits on the left
 * here, so moving between the two reads as the layout flipping rather than
 * reloading.
 *
 * Role isn't asked for: authController.detectRole derives it from the email,
 * and founder is set by hand in the database. Nothing asks the user for what
 * the account already knows — department is asked because nothing else can
 * infer it.
 */
export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    department: '',
    password: '',
    confirm_password: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
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
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError('');
    const payload = {
      full_name: form.full_name,
      email: form.email,
      department: form.department,
      password: form.password,
    };
    try {
      let data;
      try {
        ({ data } = await registerUser(payload));
      } catch (err) {
        // No backend reachable (Firebase isn't configured here) — fall back
        // to a local demo account instead of dead-ending the user.
        if (err.response) throw err;
        ({ data } = dummyRegister(payload));
      }
      login(
        {
          id: data.id,
          email: data.email,
          role: data.role,
          full_name: data.full_name,
          department: form.department || null,
        },
        data.token
      );
      navigate(homeFor(data.role));
    } catch (err) {
      const raw = err.response?.data?.error || '';
      if (/exists/i.test(raw)) {
        setError('That email already has an account. Try signing in instead.');
      } else if (err.response?.status === 400) {
        setError(
          'We could not create that account. Check the email address and use a password of at least six characters.'
        );
      } else {
        setError('We could not create your account. Please try again in a few moments.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl sm:text-[36px] font-semibold tracking-tight text-foreground mb-1 leading-tight text-center">
        Create Your Account
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 text-center">
        Join us and start your journey with the team.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" noValidate>
        <IconField
          icon={User}
          label="Full Name"
          required
          autoComplete="name"
          value={form.full_name}
          onChange={(e) => update('full_name', e.target.value)}
          placeholder="Enter your full name"
        />

        <IconField
          icon={Mail}
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="Enter your email address"
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label
            htmlFor="signup-department"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none"
          >
            Department
          </label>
          <div className="relative flex items-center">
            <Building2
              aria-hidden="true"
              size={18}
              className="absolute left-3.5 text-muted-foreground pointer-events-none shrink-0"
            />
            <select
              id="signup-department"
              required
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              className="w-full bg-muted border border-border rounded-xl pl-11 pr-3.5 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
            >
              <option value="" disabled>
                Select your department
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <IconField
          icon={Lock}
          label="Password"
          type={showPass ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          placeholder="Create a password"
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

        <IconField
          icon={Lock}
          label="Confirm Password"
          type={showConfirmPass ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={(e) => update('confirm_password', e.target.value)}
          placeholder="Confirm your password"
          right={
            <button
              type="button"
              onClick={() => setShowConfirmPass((p) => !p)}
              aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />

        <div className="flex items-center gap-2 text-xs py-0.5">
          <input
            type="checkbox"
            id="terms"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (error) setError('');
            }}
            className="w-4 h-4 rounded border-muted bg-muted text-primary focus:ring-0 accent-primary cursor-pointer shrink-0"
          />
          <label htmlFor="terms" className="text-muted-foreground cursor-pointer select-none text-xs">
            I agree to the{' '}
            <span className="text-primary font-medium hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-primary font-medium hover:underline">Privacy Policy</span>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs px-4 py-2 text-primary bg-primary/10 border border-primary/60 rounded-xl text-center"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary text-primary-foreground font-bold py-3 px-5 rounded-full flex items-center justify-between shadow-[0_0_25px_rgba(232,96,36,0.45)] hover:shadow-[0_0_35px_rgba(255,110,46,0.75)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer group mt-1 disabled:opacity-50"
        >
          <span className="text-sm font-bold pl-2">
            {loading ? 'Creating account…' : 'Sign Up'}
          </span>
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center shrink-0 shadow-md group-hover:translate-x-1 transition-transform duration-300"
          >
            <ArrowRight size={16} />
          </span>
        </button>
      </form>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Already have an account?{' '}
        <Link to="/" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
