/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authActions from '@/actions/authActions';
import type { AuthUser } from '@/types';

const TOKEN_KEY = 'shortener.token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    isLoading: !!localStorage.getItem(TOKEN_KEY),
  });

  useEffect(() => {
    if (!state.token) return;
    let cancelled = false;
    authActions
      .getMe(state.token)
      .then((user) => {
        if (!cancelled) setState((s) => ({ ...s, user, isLoading: false }));
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setState({ user: null, token: null, isLoading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.token]);

  const completeAuth = useCallback(async (token: string) => {
    const user = await authActions.getMe(token);
    localStorage.setItem(TOKEN_KEY, token);
    setState({ user, token, isLoading: false });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const token = await authActions.login(username, password);
      await completeAuth(token);
    },
    [completeAuth],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      const token = await authActions.register(username, password);
      await completeAuth(token);
    },
    [completeAuth],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
