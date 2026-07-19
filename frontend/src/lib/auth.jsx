import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  getAuthConfig,
  getProfile,
  getStoredSession,
  joinTeam as apiJoinTeam,
  login as apiLogin,
  registerOrganization as apiRegister,
  storeSession
} from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [authRequired, setAuthRequired] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const config = await getAuthConfig();
        if (!cancelled) setAuthRequired(Boolean(config.auth_required));
      } catch {
        // Backend unreachable — leave auth optional so the UI still renders.
      }
      // Validate a stored session; drop it if the token expired.
      if (getStoredSession()) {
        try {
          const user = await getProfile();
          if (!cancelled) {
            setSession((current) => (current ? { ...current, user } : current));
          }
        } catch {
          clearSession();
          if (!cancelled) setSession(null);
        }
      }
      if (!cancelled) setReady(true);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((next) => {
    storeSession(next);
    setSession(next);
  }, []);

  const login = useCallback(
    async (payload) => applySession(await apiLogin(payload)),
    [applySession]
  );
  const register = useCallback(
    async (payload) => applySession(await apiRegister(payload)),
    [applySession]
  );
  const join = useCallback(
    async (payload) => applySession(await apiJoinTeam(payload)),
    [applySession]
  );
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      authRequired,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.token),
      login,
      register,
      join,
      logout
    }),
    [ready, authRequired, session, login, register, join, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
