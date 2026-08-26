import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  AUTH_SESSION_EXPIRED_EVENT,
  getStoredToken,
  getSupabaseAuth,
  isSupabaseAccessToken,
  setStoredToken,
  toFrontendUser,
} from '../services/api.js';
import { safeInternalPath } from '../utils/navigation.js';
import {
  AUTH_ACTIVITY_KEY,
  AUTH_INACTIVITY_BROADCAST_KEY,
  AUTH_INACTIVITY_NOTICE,
  AUTH_INACTIVITY_NOTICE_KEY,
  AUTH_INACTIVITY_TIMEOUT_MS,
  isAuthSessionInactive,
} from '../utils/sessionInactivity.js';
import { useLocalStorage } from './useLocalStorage.js';

const AuthContext = createContext(null);
const USER_KEY = 'simulamanejo:user';

export function AuthProvider({ children }) {
  const [user, setUser, removeUser] = useLocalStorage(USER_KEY, null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', redirectTo: '/dashboard', category: null });

  const clearAuthentication = useCallback(() => {
    setStoredToken(null);
    window.localStorage.removeItem(AUTH_ACTIVITY_KEY);
    removeUser();
    setLoading(false);
  }, [removeUser]);

  const hydrateUser = useCallback(async (baseUser = user) => {
    const token = getStoredToken();
    if (!token) return null;

    const [profile, stats, settings] = await Promise.all([
      api.getProfile(),
      api.getStats().catch(() => null),
      api.getSettings().catch(() => null),
    ]);

    const hydrated = toFrontendUser(profile, {
      category: settings?.categoriaPreferidaId ?? baseUser?.category ?? null,
      categoryConfirmed: settings?.categoriaConfirmada ?? baseUser?.categoryConfirmed ?? false,
      stats: {
        attempts: stats?.totalIntentos ?? 0,
        average: stats?.promedioGeneral ?? 0,
        questions: (stats?.totalIntentos ?? 0) * 40,
        studyTime: baseUser?.stats?.studyTime ?? '0h 00m',
      },
    });

    setUser(hydrated);
    return hydrated;
  }, [setUser, user]);

  const storeAuthenticatedUser = useCallback(async (response, extra = {}) => {
    setStoredToken(response.token);
    window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(Date.now()));
    const nextUser = toFrontendUser(response, extra);
    setUser(nextUser);
    await hydrateUser(nextUser).catch(() => null);
    return nextUser;
  }, [hydrateUser, setUser]);

  const openAuthModal = useCallback((mode = 'login', options = {}) => {
    setAuthModal({
      open: true,
      mode,
      redirectTo: safeInternalPath(options.redirectTo),
      email: options.email ?? '',
      category: options.category ?? null,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((currentModal) => ({ ...currentModal, open: false }));
  }, []);

  const expireInactiveSession = useCallback(({ broadcast = true } = {}) => {
    const token = getStoredToken();
    const redirectTo = safeInternalPath(`${window.location.pathname}${window.location.search}`);
    window.sessionStorage.setItem(AUTH_INACTIVITY_NOTICE_KEY, AUTH_INACTIVITY_NOTICE);
    if (broadcast) {
      window.localStorage.setItem(AUTH_INACTIVITY_BROADCAST_KEY, String(Date.now()));
    }
    if (isSupabaseAccessToken(token)) {
      getSupabaseAuth().then((supabaseAuth) => supabaseAuth.auth.signOut({ scope: 'local' })).catch(() => null);
    }
    clearAuthentication();
    openAuthModal('login', { redirectTo });
  }, [clearAuthentication, openAuthModal]);

  useEffect(() => {
    let cancelled = false;
    let subscription;
    const handleExpiredSession = () => clearAuthentication();

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    getSupabaseAuth().then((supabaseAuth) => {
      if (cancelled) return;
      const { data } = supabaseAuth.auth.onAuthStateChange((event, session) => {
        const currentToken = getStoredToken();
        if (session?.access_token && isSupabaseAccessToken(currentToken)) {
          setStoredToken(session.access_token);
        }
        if (event === 'SIGNED_OUT' && isSupabaseAccessToken(currentToken)) {
          clearAuthentication();
        }
      });
      subscription = data.subscription;
    }).catch(() => null);

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    };
  }, [clearAuthentication]);

  useEffect(() => {
    let cancelled = false;
    if (!getStoredToken()) {
      setLoading(false);
      return undefined;
    }

    const storedActivity = window.localStorage.getItem(AUTH_ACTIVITY_KEY);
    if (isAuthSessionInactive(storedActivity)) {
      expireInactiveSession();
      return undefined;
    }
    if (!storedActivity) {
      window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(Date.now()));
    }

    hydrateUser().catch((error) => {
      if (!cancelled && error.status === 401) clearAuthentication();
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [expireInactiveSession]);

  useEffect(() => {
    if (loading || !user || !getStoredToken()) return undefined;

    let expired = false;
    let timeoutId;
    let lastHandledAt = 0;
    let lastActivityAt = Number(window.localStorage.getItem(AUTH_ACTIVITY_KEY)) || Date.now();

    const scheduleExpiration = () => {
      window.clearTimeout(timeoutId);
      const remaining = Math.max(AUTH_INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt), 0);
      timeoutId = window.setTimeout(() => {
        if (expired) return;
        if (!isAuthSessionInactive(lastActivityAt)) {
          scheduleExpiration();
          return;
        }
        expired = true;
        expireInactiveSession();
      }, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (expired) return;
      if (isAuthSessionInactive(lastActivityAt, now)) {
        expired = true;
        expireInactiveSession();
        return;
      }
      if (now - lastHandledAt < 1000) return;
      lastHandledAt = now;
      lastActivityAt = now;
      window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(now));
      scheduleExpiration();
    };

    const handleStorage = (event) => {
      if (event.key === AUTH_INACTIVITY_BROADCAST_KEY && event.newValue) {
        if (!expired) {
          expired = true;
          expireInactiveSession({ broadcast: false });
        }
        return;
      }
      if (event.key !== AUTH_ACTIVITY_KEY) return;
      if (!event.newValue) {
        clearAuthentication();
        return;
      }
      const nextActivityAt = Number(event.newValue);
      if (Number.isFinite(nextActivityAt) && nextActivityAt > lastActivityAt) {
        lastActivityAt = nextActivityAt;
        scheduleExpiration();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };
    const activityEvents = ['pointerdown', 'keydown', 'scroll'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    scheduleExpiration();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clearAuthentication, expireInactiveSession, loading, user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      authModal,
      openAuthModal,
      closeAuthModal,
      login: async ({ email, password }) => {
        try {
          const response = await api.login({ email, password });
          await storeAuthenticatedUser(response);
          return { ok: true };
        } catch (error) {
          if (error.status === 401) {
            return { ok: false, message: 'Correo o contraseña incorrectos.' };
          }
          return { ok: false, message: error.message, ...(error.data ?? {}) };
        }
      },
      register: async ({ name, email, password, category }) => {
        try {
          const response = await api.register({ name, email, password, category });
          if (response.requiresEmailVerification) {
            return {
              ok: true,
              requiresEmailVerification: true,
              email: response.email ?? email,
              emailSent: response.emailSent === true,
              message: response.message,
            };
          }
          await storeAuthenticatedUser(response, { category, categoryConfirmed: true });
          await api.updateSettings({ categoriaPreferidaId: category, categoriaConfirmada: true, notificacionesHabilitadas: true, tema: 'light' }).catch(() => null);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error.message, ...(error.data ?? {}) };
        }
      },
      verifyEmail: async ({ email, code, category }) => {
        try {
          const response = await api.verifyEmail({ email, code });
          await storeAuthenticatedUser(response, { category, categoryConfirmed: Boolean(category) });
          if (category) {
            await api.updateSettings({ categoriaPreferidaId: category, categoriaConfirmada: true, notificacionesHabilitadas: true, tema: 'light' }).catch(() => null);
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error.message, ...(error.data ?? {}) };
        }
      },
      resendVerification: async ({ email }) => {
        try {
          const response = await api.resendVerification({ email });
          return { ok: true, message: response.message };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
      requestPasswordReset: async ({ email }) => {
        try {
          const response = await api.requestPasswordReset({ email });
          return { ok: true, message: response.message };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
      confirmPasswordReset: async ({ email, code, password }) => {
        try {
          const response = await api.confirmPasswordReset({ email, code, password });
          return { ok: true, message: response.message };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
      loginWithToken: async (token, { category = null } = {}) => {
        try {
          setStoredToken(token);
          window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(Date.now()));
          const authenticatedUser = await hydrateUser(null);
          if (category) {
            await api.updateSettings({ categoriaPreferidaId: category, categoriaConfirmada: true, notificacionesHabilitadas: true, tema: 'light' });
            setUser((currentUser) => ({ ...currentUser, category, categoryConfirmed: true }));
          } else if (!authenticatedUser?.categoryConfirmed) {
            setUser((currentUser) => ({ ...currentUser, categoryConfirmed: false }));
          }
          return { ok: true };
        } catch (error) {
          clearAuthentication();
          return { ok: false, message: error.message };
        }
      },
      updateUser: (updates) => setUser((currentUser) => ({ ...currentUser, ...updates })),
      refreshUser: hydrateUser,
      logout: () => {
        const token = getStoredToken();
        if (isSupabaseAccessToken(token)) {
          getSupabaseAuth().then((supabaseAuth) => supabaseAuth.auth.signOut({ scope: 'local' })).catch(() => null);
        }
        clearAuthentication();
      },
    }),
    [authModal, clearAuthentication, closeAuthModal, hydrateUser, loading, openAuthModal, setUser, storeAuthenticatedUser, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
