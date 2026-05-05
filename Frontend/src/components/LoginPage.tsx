"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/lib/toast";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const router = useRouter();

  // Redirect to dashboard if already authenticated.
  // Add a small debounce and don't redirect while the user is interacting with inputs
  const isInteracting = useRef(false);
  const redirectTimeoutRef = useRef<number | null>(null);

  type ReloadTraceEntry = {
    event: string;
    ts: string;
    url?: string;
    state?: string;
  };

  useEffect(() => {
    console.log("[LoginPage] render", { isLoading, isAuthenticated });
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current as unknown as number);
    }
    redirectTimeoutRef.current = window.setTimeout(() => {
      if (!isLoading && isAuthenticated && !isInteracting.current) {
        console.log("[LoginPage] redirecting to /dashboard");
        router.replace("/dashboard");
      }
    }, 350);

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current as unknown as number);
      }
      console.log("[LoginPage] cleanup");
    };
  }, [isAuthenticated, isLoading, router]);

  // Lightweight reload / navigation tracer (records into sessionStorage)
  useEffect(() => {
    const key = 'odcms_reload_trace';
    function pushTrace(entry: ReloadTraceEntry) {
      try {
        const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
        existing.push(entry);
        sessionStorage.setItem(key, JSON.stringify(existing.slice(-50)));
        console.log('[LoginPage] trace:', entry);
      } catch {
        // ignore
      }
    }

    const onBeforeUnload = () => {
      pushTrace({ event: 'beforeunload', ts: new Date().toISOString(), url: window.location.href });
    };

    const onVisibility = () => {
      pushTrace({ event: 'visibilitychange', state: document.visibilityState, ts: new Date().toISOString() });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);

    // Print recent trace on mount for quick inspection
    try {
      const recent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (recent && recent.length) console.log('[LoginPage] recent reload trace', recent.slice(-10));
    } catch {}

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      toastSuccess("Login Successful", "Welcome to the ODCMS dashboard.");
      router.push("/dashboard");
    } else {
      const msg = result.error || "Login failed";
      setError(msg);
      toastError("Login Failed", msg);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-odg-navy">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-odg-navy via-odg-navy-mid to-[#0a1520]" />

        {/* Decorative geometric shapes */}
        <div className="absolute top-[-8%] right-[-12%] w-125 h-125 rounded-full bg-odg-orange/6 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-8%] w-100 h-100 rounded-full bg-odg-orange/4 blur-3xl" />
        <div className="absolute top-[30%] left-[20%] w-64 h-64 border border-white/4 rounded-2xl rotate-12" />
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 border border-odg-orange/8 rounded-full" />

        {/* Pattern dots grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden p-1">
              <Image src="/favicon.png" alt="ODCMS Logo" width={48} height={48} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-white leading-tight tracking-tight">ODCMS</div>
              <div className="text-[0.65rem] text-white/40 font-medium tracking-widest uppercase">
                ODG Master Authority
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
              Office Data Client
              <br />
              <span className="text-odg-orange">Management System</span>
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Centralized billing management and vehicle tracking compliance.
              Manage subscriptions, monitor fleet activity, and prevent revenue
              leakage — all from one dashboard.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["Subscription Tracking", "Vehicle Compliance", "Bulk Import", "Revenue Analytics"].map((feat) => (
                <span
                  key={feat}
                  className="text-[0.65rem] font-medium text-white/60 bg-white/6 border border-white/8 px-3 py-1.5 rounded-full"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom footer */}
          <div className="text-white/25 text-xs">
            © {new Date().getFullYear()} Office Data Group — All rights reserved
          </div>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-100 space-y-8">
          {/* Mobile logo (shown below lg) */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden p-1">
              <Image src="/favicon.png" alt="ODCMS Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-foreground leading-tight">ODCMS</div>
              <div className="text-[0.55rem] text-muted-foreground font-medium tracking-widest uppercase">
                ODG Master Authority
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center lg:text-left space-y-1.5">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access the ODCMS dashboard
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm animate-fade-in-up">
              <AlertCircle size={16} className="shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-semibold text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  placeholder="admin@odg.com.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => (isInteracting.current = true)}
                  onBlur={() => (isInteracting.current = false)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => (isInteracting.current = true)}
                  onBlur={() => (isInteracting.current = false)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-linear-to-r from-odg-orange to-odg-orange-dark text-white font-semibold text-sm shadow-lg shadow-orange-900/25 hover:shadow-orange-900/40 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
