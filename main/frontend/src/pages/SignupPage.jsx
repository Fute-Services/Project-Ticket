import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Building2, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { registerUser } from '../utils/api';
import AuthLayout from '../components/AuthLayout';
import IconField from '../components/IconField';

/**
 * Create an account. Mirrors LoginPage — the accent panel sits on the left
 * here, so moving between the two reads as the layout flipping rather than
 * reloading.
 *
 * Role isn't asked for: authController.detectRole derives it from the email,
 * and founder is set by hand in the database. Nothing asks the user for what
 * the account already knows.
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
    try {
      const { data } = await registerUser({
        full_name: form.full_name,
        email: form.email,
        department: form.department,
        password: form.password,
      });
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
      <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-white mb-1 leading-tight">
        Create Your Account
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 mb-4">
        Join us and start your journey to find the perfect living space.
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-[#e86024] focus:ring-0 accent-[#e86024] cursor-pointer shrink-0"
          />
          <label htmlFor="terms" className="text-gray-400 cursor-pointer select-none text-[11px]">
            I agree to the{' '}
            <span className="text-[#e86024] font-medium hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#e86024] font-medium hover:underline">Privacy Policy</span>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs px-4 py-2 text-orange-300 bg-orange-950/40 border border-orange-800/60 rounded-xl"
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
            {loading ? 'Creating account…' : 'Sign Up'}
          </span>
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-full bg-white text-[#e86024] flex items-center justify-center shrink-0 shadow-sm"
          >
            <ArrowRight size={15} />
          </span>
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Already have an account?{' '}
        <Link to="/" className="font-semibold text-[#e86024] hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
