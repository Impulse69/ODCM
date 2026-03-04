"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  name: string;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "odcms_auth_user";

// Demo credentials — replace with real API calls when backend is ready
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@odg.com.gh": {
    password: "admin123",
    user: {
      email: "admin@odg.com.gh",
      name: "System Administrator",
      role: "ODG Master",
      initials: "AD",
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 800));

      const entry = DEMO_USERS[email.toLowerCase()];
      if (!entry || entry.password !== password) {
        return { success: false, error: "Invalid email or password" };
      }

      setUser(entry.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
