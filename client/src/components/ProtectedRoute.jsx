// Guards a group of routes. Not logged in: go to the login page, and come back after.
// Logged in with the wrong role: show a clear message.
//
// This is only for a friendly experience. The real security is on the server, which
// checks the token and role on every request.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from './StatusViews';

export default function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState
        title="You don't have access to this page"
        message={`This page isn't available to your ${user.role} account.`}
        actionLabel="Back to courses"
        actionTo="/courses"
      />
    );
  }

  return <Outlet />;
}
