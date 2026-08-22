import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  api,
  clearSession,
  getStoredToken,
  getStoredUser,
  type AuthUser,
  type Session,
} from "@/integrations/api/client";
import { logger } from "@/utils/logger";

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateFromStorage = () => {
    const token = getStoredToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      setSession({ user: stored, access_token: token });
      return true;
    }
    setUser(null);
    setSession(null);
    return false;
  };

  const refresh = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setSession(null);
      return;
    }
    try {
      const { user: me } = await api.me();
      const next = { ...getStoredUser(), ...me } as AuthUser;
      localStorage.setItem("ncs_user", JSON.stringify(next));
      setUser(next);
      setSession({ user: next, access_token: token });
    } catch (error) {
      logger.warn("Session invalide, déconnexion locale", error);
      clearSession();
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    const has = hydrateFromStorage();
    if (has) {
      refresh().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signOut = async () => {
    try {
      api.logout();
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
