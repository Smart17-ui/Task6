// The loading, empty, and error views used throughout the app, so that every page
// handles those states the same way.
import { Link } from 'react-router-dom';

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-track border-t-progress" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, message, actionLabel, actionTo }) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {actionLabel && (
        <Link to={actionTo} className="btn-primary mt-3">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// A full-section error, with an optional "Try again" button.
export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold">We hit a problem</h3>
      <p className="max-w-md text-sm text-muted">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          Try again
        </button>
      )}
    </div>
  );
}

// A small inline message for failed actions and form errors.
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
