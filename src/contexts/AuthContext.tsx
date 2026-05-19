import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../lib/api/auth.ts";
import * as authApi from "../lib/api/auth.ts";
import { AuthContext } from "./authContextValue.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  useEffect(() => {
    authApi.getMe()
      .then(({ user }) => setUser(user))
      .catch(async () => {
        // Access token missing/expired — try refresh
        try {
          const { user } = await authApi.refreshToken();
          setUser(user);
        } catch {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login(email, password);
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const { user } = await authApi.register(email, password, displayName);
    setUser(user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const { user } = await authApi.loginWithGoogle(idToken);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  // Auto-refresh on 401 for any fetch (intercept globally)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401 && !refreshingRef.current) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        // Don't retry auth endpoints to avoid loops
        if (!url.includes("/api/auth/")) {
          refreshingRef.current = true;
          try {
            const { user } = await authApi.refreshToken();
            setUser(user);
            // Retry original request
            const retryRes = await originalFetch(...args);
            refreshingRef.current = false;
            return retryRes;
          } catch {
            setUser(null);
            refreshingRef.current = false;
          }
        }
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

