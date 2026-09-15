import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  api,
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
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

  const refresh = async () => {
    try {
      const { user: me } = await api.me();
      const stored = getStoredUser();
      const next = { ...stored, ...me } as AuthUser;
      persistSession({
        token: getStoredToken() ?? "",
        user: next,
        organizationId: next.organizationId,
      });
      setUser(next);
      setSession({ user: next, access_token: getStoredToken() ?? "cookie" });
    } catch (error) {
      if (getStoredUser()) {
        logger.warn("Session invalide, déconnexion locale", error);
      }
      clearSession();
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    try {
      await api.logout();
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
