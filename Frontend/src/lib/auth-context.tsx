"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "odcms_auth_user";
const TOKEN_KEY   = "odcms_auth_token";
const API_BASE    = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  // Clear cookie — set past expiry
  document.cookie = "odcms_auth_token=; path=/; max-age=0; SameSite=Lax";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verify token against backend on every mount/page load
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    const verify = async () => {
      if (!token) {
        clearAuth();
        setIsLoading(false);
        return;
      }
      // Validate token with backend — if expired or invalid, force logout
      try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          clearAuth();
          setUser(null);
        } else {
          const data = await res.json();
          const u = data.data as User;
          setUser(u);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        }
      } catch {
        // Network down — trust cached user so app stays usable offline
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setUser(JSON.parse(stored));
          else clearAuth();
        } catch {
          clearAuth();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.message || "Invalid email or password" };
        }
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        localStorage.setItem(TOKEN_KEY, data.token);
        // Cookie for middleware (not HttpOnly since Next.js middleware reads it client-side)
        document.cookie = `odcms_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
        return { success: true };
      } catch {
        return { success: false, error: "Network error — is the server running?" };
      }
    },
    []
  );

  const refreshUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearAuth();
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
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
