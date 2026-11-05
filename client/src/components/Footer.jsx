// The site footer. It only links to pages that exist, so add legal links such as
// Privacy and Terms here once you have written those pages.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
        <p>
          <span className="font-display font-semibold text-ink">Lantern</span> · © {new Date().getFullYear()}
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-5">
          <Link to="/courses" className="hover:text-ink hover:underline">
            Courses
          </Link>
          {!user && (
            <>
              <Link to="/login" className="hover:text-ink hover:underline">
                Log in
              </Link>
              <Link to="/register" className="hover:text-ink hover:underline">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
