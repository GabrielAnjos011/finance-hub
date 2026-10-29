import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase/client';
import { authorized } from '../../services/repositories/financeRepository';
import { useFinance } from '../../store/useFinance';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(Boolean(auth)),
    [error, setError] = useState(null);
  useEffect(() => {
    if (!auth) return;
    let active = true,
      generation = 0;
    const unsub = onAuthStateChanged(auth, async (next) => {
      const token = ++generation;
      useFinance.getState().clear();
      setUser(null);
      setChecking(true);
      try {
        if (next) {
          if (!(await authorized(next.uid))) {
            await signOut(auth);
            throw new Error('Sua conta precisa ser autorizada pelo administrador no Firestore.');
          }
          if (active && token === generation) {
            setUser(next);
            await useFinance.getState().load(next.uid);
          }
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active && token === generation) setChecking(false);
      }
    });
    const verify = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        try {
          if (!(await authorized(auth.currentUser.uid))) {
            useFinance.getState().clear();
            await signOut(auth);
          }
        } catch {
          useFinance.getState().clear();
          setUser(null);
          setError('Não foi possível validar a sessão. Entre novamente.');
        }
      }
    };
    document.addEventListener('visibilitychange', verify);
    return () => {
      active = false;
      generation++;
      unsub();
      document.removeEventListener('visibilitychange', verify);
    };
  }, []);
  const logout = async () => {
    useFinance.getState().clear();
    setUser(null);
    if (auth) await signOut(auth);
  };
  return (
    <AuthContext.Provider value={{ user, checking, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
