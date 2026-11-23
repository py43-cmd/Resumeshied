import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setSessionToken } from '../lib/api.js';

const STORAGE_KEY = 'resumeshield.session';
const SessionContext = createContext(null);

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // sessionStorage dies when the tab closes - by design.
  useEffect(() => {
    try {
      if (session?.token) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be blocked in private mode; the in-memory session still works.
    }
    setSessionToken(session?.token ?? null);
  }, [session]);

  const updateSession = useCallback((patch) => {
    setSession((previous) => {
      const next =
        typeof patch === 'function' ? patch(previous) : { ...(previous ?? {}), ...patch };
      return next?.token ? next : null;
    });
  }, []);

  const clearSession = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      session,
      token: session?.token ?? null,
      documentId: session?.documentId ?? null,
      redactionId: session?.redactionId ?? null,
      expiresAt: session?.expiresAt ?? null,
      isActive: Boolean(session?.token),
      updateSession,
      clearSession,
    }),
    [session, updateSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}
