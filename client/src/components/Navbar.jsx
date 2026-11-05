// The top navigation bar. Its links depend on the user's role.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS_BY_ROLE = {
  student: [{ to: '/dashboard', label: 'My learning' }],
  instructor: [{ to: '/instructor', label: 'Instructor dashboard' }],
  admin: [
    { to: '/instructor', label: 'My courses' },
    { to: '/admin', label: 'Admin' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [{ to: '/courses', label: 'Courses' }, ...(user ? LINKS_BY_ROLE[user.role] : [])];
  const closeMenu = () => setMenuOpen(false);

  function handleLogout() {
    logout();
    closeMenu();
    navigate('/');
  }

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white'
    }`;

  return (
    <header className="bg-brand">
      <nav aria-label="Main" className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" onClick={closeMenu} className="font-display text-xl font-semibold text-white">
            <span className="text-accent">Lantern</span>
          </Link>

          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-medium text-white sm:hidden"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>

          {/* On phones this list is hidden until "Menu" is pressed. */}
          <div
            className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-16 z-10 flex-col gap-1 bg-brand px-4 pb-4 sm:static sm:flex sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:p-0`}
          >
            <div className="flex flex-col gap-1 sm:flex-row">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu} className={linkClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              {user ? (
                <>
                  <span className="px-3 py-2 text-sm text-white/80 sm:px-0">{user.name}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium text-white/80 hover:text-white"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" onClick={closeMenu} className={linkClass}>
                    Log in
                  </NavLink>
                  <Link to="/register" onClick={closeMenu} className="btn bg-accent text-ink hover:bg-accent/90">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
