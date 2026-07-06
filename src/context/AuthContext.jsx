import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { setAuthToken } from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// HIPAA automatic-logoff: minutes of inactivity before the session ends.
const IDLE_TIMEOUT_MS = (Number(import.meta.env.VITE_IDLE_TIMEOUT_MIN) || 15) * 60 * 1000;

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse(localStorage.getItem('user')));
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const saveAuth = ({ user: nextUser, token: nextToken }) => {
    if (!nextToken || !nextUser) throw new Error('Invalid login response from server');

    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

const login = async (credentials) => {
  logout();

  const cleanCredentials = {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password.trim(),
    ...(credentials.mfaToken ? { mfaToken: String(credentials.mfaToken).trim() } : {}),
  };

  const res = await authApi.login(cleanCredentials);

  const loginData = res.data?.data;

  // Server asks for a second factor — don't save anything yet.
  if (loginData?.mfaRequired) {
    return { mfaRequired: true };
  }

  const nextToken = loginData?.token;

  const nextUser = loginData
    ? {
        _id: loginData._id,
        name: loginData.name,
        email: loginData.email,
        role: loginData.role,
        mfaEnabled: loginData.mfaEnabled,
      }
    : null;

  saveAuth({ user: nextUser, token: nextToken });

  return { user: nextUser, token: nextToken, raw: res.data };
};

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const refreshMe = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      setAuthToken(currentToken);
      const res = await authApi.me();
      const nextUser = res.data?.user || res.data?.data;
      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser));
        setUser(nextUser);
        setToken(currentToken);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  // Automatic logoff after a period of inactivity (HIPAA technical safeguard).
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    if (!token) return undefined;
    const bump = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        logout();
        toast('You were signed out due to inactivity.', { icon: '🔒' });
      }
    }, 30 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(interval);
    };
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token && user),
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
