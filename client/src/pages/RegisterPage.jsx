import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { ErrorBanner } from '../components/StatusViews';
import { homePathFor, useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // The landing page's "Start teaching" button links to /register?role=instructor.
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'instructor' ? 'instructor' : 'student';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={homePathFor(user)} replace />;

  const handleChange = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const newUser = await register(form);
      navigate(location.state?.from || homePathFor(newUser), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
        <ErrorBanner message={error && !Object.keys(error.fieldErrors || {}).length && error.message} />
        <FormField
          label="Name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={error?.fieldErrors?.name}
        />
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
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={error?.fieldErrors?.password}
          hint="At least 8 characters"
        />
        <FormField
          as="select"
          label="I want to"
          name="role"
          value={form.role}
          onChange={handleChange}
          error={error?.fieldErrors?.role}
        >
          <option value="student">Learn (student)</option>
          <option value="instructor">Teach (instructor)</option>
        </FormField>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-medium text-ink underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
