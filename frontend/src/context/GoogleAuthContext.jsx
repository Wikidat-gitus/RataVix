import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGoogleUserInfo } from '../services/googleDrive';

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

  // Si ya tenemos token guardado en sessionStorage, verificarlo o recargar perfil
  useEffect(() => {
    if (googleAccessToken && !googleUser) {
      fetchGoogleUserInfo(googleAccessToken)
        .then((user) => {
          setGoogleUser(user);
          sessionStorage.setItem('baul_google_user', JSON.stringify(user));
        })
        .catch(() => {
          // Token expirado o inválido
          disconnectGoogleDrive();
        });
    }
  }, [googleAccessToken]);

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
            setGoogleAccessToken(token);
            sessionStorage.setItem('baul_google_access_token', token);

            try {
              const userInfo = await fetchGoogleUserInfo(token);
              setGoogleUser(userInfo);
              sessionStorage.setItem('baul_google_user', JSON.stringify(userInfo));
            } catch (err) {
              console.warn('No se pudo obtener datos del perfil:', err);
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
    setGoogleAccessToken(null);
    setGoogleUser(null);
    sessionStorage.removeItem('baul_google_access_token');
    sessionStorage.removeItem('baul_google_user');
  };

  const value = {
    isGoogleConnected: Boolean(googleAccessToken),
    googleAccessToken,
    googleUser,
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

