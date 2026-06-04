import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, setStoredToken, toFrontendUser } from '../services/api.js';
import { useLocalStorage } from './useLocalStorage.js';

const AuthContext = createContext(null);
const USER_KEY = 'simulamanejo:user';

export function AuthProvider({ children }) {
  const [user, setUser, removeUser] = useLocalStorage(USER_KEY, null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', redirectTo: '/dashboard' });

  const hydrateUser = useCallback(async (baseUser = user) => {
    const token = getStoredToken();
    if (!token) return null;

    const [profile, stats, settings] = await Promise.all([
      api.getProfile(),
      api.getStats().catch(() => null),
      api.getSettings().catch(() => null),
    ]);

    const hydrated = toFrontendUser(profile, {
      category: settings?.categoriaPreferidaId ?? baseUser?.category ?? 25,
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
    const nextUser = toFrontendUser(response, extra);
    setUser(nextUser);
    await hydrateUser(nextUser).catch(() => null);
    return nextUser;
  }, [hydrateUser, setUser]);

  const openAuthModal = useCallback((mode = 'login', options = {}) => {
    setAuthModal({
      open: true,
      mode,
      redirectTo: options.redirectTo ?? '/dashboard',
      email: options.email ?? '',
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((currentModal) => ({ ...currentModal, open: false }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!getStoredToken()) {
      setLoading(false);
      return undefined;
    }

    hydrateUser().catch(() => {
      if (!cancelled) {
        setStoredToken(null);
        removeUser();
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
            return { ok: true, requiresEmailVerification: true, email: response.email ?? email, message: response.message };
          }
          await storeAuthenticatedUser(response, { category });
          await api.updateSettings({ categoriaPreferidaId: category, notificacionesHabilitadas: true, tema: 'light' }).catch(() => null);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error.message, ...(error.data ?? {}) };
        }
      },
      verifyEmail: async ({ email, code, category }) => {
        try {
          const response = await api.verifyEmail({ email, code });
          await storeAuthenticatedUser(response, { category });
          if (category) {
            await api.updateSettings({ categoriaPreferidaId: category, notificacionesHabilitadas: true, tema: 'light' }).catch(() => null);
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
      loginWithToken: async (token) => {
        try {
          setStoredToken(token);
          await hydrateUser(null);
          return { ok: true };
        } catch (error) {
          setStoredToken(null);
          removeUser();
          return { ok: false, message: error.message };
        }
      },
      updateUser: (updates) => setUser((currentUser) => ({ ...currentUser, ...updates })),
      refreshUser: hydrateUser,
      logout: () => {
        setStoredToken(null);
        removeUser();
      },
    }),
    [authModal, closeAuthModal, hydrateUser, loading, openAuthModal, removeUser, setUser, storeAuthenticatedUser, user],
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
