// Holds the logged-in user and shares it with every component through useAuth().
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If there is a saved token, we're "loading" until the server confirms it.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // For the Log out button. Reloading the home page clears everything the previous user
  // had loaded, which matters on a shared computer. It also avoids a race: clearing the
  // user first would make a protected page redirect to /login before we could go home.
  const signOut = useCallback(() => {
    setToken(null);
    window.location.assign('/');
  }, []);

  useEffect(() => {
    // Log out automatically if any API call reports that our token is no longer valid.
    setUnauthorizedHandler(logout);

    // Restore the session after a page reload.
    if (!getToken()) return;
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      // A rejected token is handled above. For a network failure we keep the token,
      // so the user is still logged in next time the server can be reached.
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await api.post('/auth/register', details);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, signOut }),
    [user, loading, login, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Where each role lands after logging in.
export function homePathFor(user) {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'instructor') return '/instructor';
  return '/dashboard';
}
