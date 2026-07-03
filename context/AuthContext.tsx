import { createContext, useContext, useEffect, useState } from 'react';
import {
  AuthUser,
  loadStoredToken,
  saveToken,
  clearToken,
  userFromToken,
} from '../lib/auth';
import { setAuthToken } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredToken().then(token => {
      if (token) {
        setAuthToken(token);
        setUser(userFromToken(token));
      }
      setIsLoading(false);
    });
  }, []);

  async function login(token: string) {
    await saveToken(token);
    setAuthToken(token);
    setUser(userFromToken(token));
  }

  async function logout() {
    await clearToken();
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
