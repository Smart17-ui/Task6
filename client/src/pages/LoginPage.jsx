import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { ErrorBanner } from '../components/StatusViews';
import { homePathFor, useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in: nothing to do here.
  if (user && !submitting) return <Navigate to={homePathFor(user)} replace />;

  const handleChange = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      // Return to the page that sent them here, otherwise go to their dashboard.
      navigate(location.state?.from || homePathFor(loggedInUser), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Log in</h1>
      <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
        <ErrorBanner message={error && !Object.keys(error.fieldErrors || {}).length && error.message} />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={error?.fieldErrors?.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={error?.fieldErrors?.password}
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" state={location.state} className="font-medium text-ink underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
