import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGoogleUserInfo } from '../services/googleDrive';
import { api } from '../services/api';

const GoogleAuthContext = createContext();

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export function GoogleAuthProvider({ children }) {
  const [googleAccessToken, setGoogleAccessToken] = useState(() => {
    return sessionStorage.getItem('baul_google_access_token') || null;
  });
  const [googleUser, setGoogleUser] = useState(() => {
    const cached = sessionStorage.getItem('baul_google_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [backendUser, setBackendUser] = useState(() => {
    const cached = sessionStorage.getItem('baul_backend_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isGisReady, setIsGisReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Esperar a que el script de Google Identity Services se cargue
  useEffect(() => {
    let interval = null;
    if (window.google?.accounts?.oauth2) {
      setIsGisReady(true);
    } else {
      interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          setIsGisReady(true);
          clearInterval(interval);
        }
      }, 300);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Si ya tenemos token guardado en sessionStorage, verificarlo o recargar perfil y sincronizar backend
  useEffect(() => {
    if (googleAccessToken && !googleUser) {
      fetchGoogleUserInfo(googleAccessToken)
        .then(async (user) => {
          setGoogleUser(user);
          sessionStorage.setItem('baul_google_user', JSON.stringify(user));
          if (user?.email) {
            try {
              const res = await api.loginGoogle({
                email: user.email,
                google_id: user.sub || user.id || `google_${user.email}`,
                code: googleAccessToken,
              });
              if (res?.usuario) {
                setBackendUser(res.usuario);
                sessionStorage.setItem('baul_backend_user', JSON.stringify(res.usuario));
              }
            } catch (e) {
              console.warn('Error al sincronizar sesión backend:', e);
            }
          }
        })
        .catch(() => {
          disconnectGoogleDrive();
        });
    } else if (googleAccessToken && googleUser && !api.getToken()) {
      api.loginGoogle({
        email: googleUser.email,
        google_id: googleUser.sub || googleUser.id || `google_${googleUser.email}`,
        code: googleAccessToken,
      })
        .then((res) => {
          if (res?.usuario) {
            setBackendUser(res.usuario);
            sessionStorage.setItem('baul_backend_user', JSON.stringify(res.usuario));
          }
        })
        .catch((e) => console.warn('Error al sincronizar sesión backend:', e));
    }
  }, [googleAccessToken]);

  const updateBackendUser = (updatedUser) => {
    setBackendUser(updatedUser);
    if (updatedUser) {
      sessionStorage.setItem('baul_backend_user', JSON.stringify(updatedUser));
    } else {
      sessionStorage.removeItem('baul_backend_user');
    }
  };

  const connectGoogleDrive = () => {
    setAuthError(null);
    if (!window.google?.accounts?.oauth2) {
      setAuthError('La librería de Google aún se está cargando. Intenta de nuevo en unos segundos.');
      return;
    }

    if (!CLIENT_ID) {
      setAuthError('No se encontró VITE_GOOGLE_CLIENT_ID en las variables de entorno.');
      return;
    }

    setIsLoadingAuth(true);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          setIsLoadingAuth(false);
          if (response.error) {
            console.error('Error de OAuth Google:', response);
            setAuthError(`Error de Google: ${response.error_description || response.error}`);
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            sessionStorage.setItem('baul_google_access_token', token);

            try {
              const userInfo = await fetchGoogleUserInfo(token);
              sessionStorage.setItem('baul_google_user', JSON.stringify(userInfo));

              // Sincronizar sesión activa en el backend FastAPI ANTES de activar el estado
              if (userInfo?.email) {
                const res = await api.loginGoogle({
                  email: userInfo.email,
                  google_id: userInfo.sub || userInfo.id || `google_${userInfo.email}`,
                  code: token,
                });
                if (res?.usuario) {
                  setBackendUser(res.usuario);
                  sessionStorage.setItem('baul_backend_user', JSON.stringify(res.usuario));
                }
              }

              // Una vez asegurado el token del backend, activar estados en React
              setGoogleUser(userInfo);
              setGoogleAccessToken(token);
            } catch (err) {
              console.warn('No se pudo obtener datos del perfil o sincronizar backend:', err);
              setGoogleAccessToken(token);
            }
          }
        },
        error_callback: (nonOAuthError) => {
          setIsLoadingAuth(false);
          console.error('Error en popup de Google:', nonOAuthError);
          setAuthError('Se canceló la ventana de inicio de sesión de Google.');
        },
      });

      // Abre el popup de inicio de sesión de Google
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setIsLoadingAuth(false);
      setAuthError(err.message || 'Error al iniciar cliente de Google.');
    }
  };

  const disconnectGoogleDrive = () => {
    if (googleAccessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(googleAccessToken, () => {
          console.log('Token de Google revocado.');
        });
      } catch (e) {
        console.warn('Error al revocar token:', e);
      }
    }
    api.logout().catch(() => {});
    setGoogleAccessToken(null);
    setGoogleUser(null);
    setBackendUser(null);
    sessionStorage.removeItem('baul_google_access_token');
    sessionStorage.removeItem('baul_google_user');
    sessionStorage.removeItem('baul_backend_user');
  };

  const value = {
    isGoogleConnected: Boolean(googleAccessToken),
    googleAccessToken,
    googleUser,
    backendUser,
    updateBackendUser,
    isGisReady,
    isLoadingAuth,
    authError,
    connectGoogleDrive,
    disconnectGoogleDrive,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth debe usarse dentro de un GoogleAuthProvider');
  }
  return context;
}
