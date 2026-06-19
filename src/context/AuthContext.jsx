import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { setAuthToken } from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

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
  };

  const res = await authApi.login(cleanCredentials);

  const loginData = res.data?.data;

  const nextToken = loginData?.token;

  const nextUser = loginData
    ? {
        _id: loginData._id,
        name: loginData.name,
        email: loginData.email,
        role: loginData.role,
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
