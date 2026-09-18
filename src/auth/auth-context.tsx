import React, { createContext, useContext, useEffect, useState } from "react";

import { authApi, User } from "@/src/api/crm";
import { loadCookie, setSessionCookie } from "@/src/api/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await loadCookie();
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const u = await authApi.login(email.trim(), password);
    // Some backends return the user directly, others nest it.
    setUser((u as any)?.user ?? u);
    // Ensure /auth/me reflects the session (also refreshes any missing fields).
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      /* keep login payload */
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    await setSessionCookie(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
