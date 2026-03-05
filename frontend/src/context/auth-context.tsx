"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { jmapClient } from "@/lib/jmap/client";

interface User {
  email: string;
  name: string;
  accountId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = "magicqc_mail_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt to restore session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const { email, password } = JSON.parse(stored);
        jmapClient
          .authenticate(email, password)
          .then((session) => {
            const accountId = Object.keys(session.accounts)[0];
            const account = session.accounts[accountId];
            setUser({
              email,
              name: account.name || email.split("@")[0],
              accountId,
            });
          })
          .catch(() => {
            sessionStorage.removeItem(AUTH_KEY);
          })
          .finally(() => setIsLoading(false));
      } catch {
        sessionStorage.removeItem(AUTH_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await jmapClient.authenticate(email, password);
      const accountId = Object.keys(session.accounts)[0];
      const account = session.accounts[accountId];
      setUser({
        email,
        name: account.name || email.split("@")[0],
        accountId,
      });
      sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email, password }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    jmapClient.logout();
    setUser(null);
    sessionStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
