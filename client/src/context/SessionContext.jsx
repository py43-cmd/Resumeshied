import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

// Set before first paint so child effects in protected routes already have the token.
const initialSession = readStoredSession();
setSessionToken(initialSession?.token ?? null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(initialSession);
  const sessionRef = useRef(initialSession);

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
    const previous = sessionRef.current;
    const next =
      typeof patch === 'function' ? patch(previous) : { ...(previous ?? {}), ...patch };
    const safeNext = next?.token ? next : null;

    sessionRef.current = safeNext;
    setSessionToken(safeNext?.token ?? null);
    setSession(safeNext);
  }, []);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setSessionToken(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      sessionId: session?.sessionId ?? null,
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
