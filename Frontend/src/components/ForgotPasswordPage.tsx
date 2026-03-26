"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function api<T>(path: string, body: object): Promise<{ success: boolean; data?: T; message?: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, message: json.message ?? "Something went wrong" };
  return { success: true, data: json as T };
}

type Step = "email" | "otp" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleRequestOtp = useCallback(async () => {
    setError("");
    if (!email) { setError("Please enter your email address"); return; }
    setIsSubmitting(true);
    const res = await api<{ method: string; contact: string; message: string }>(
      "/api/auth/forgot-password",
      { email }
    );
    setIsSubmitting(false);
    if (!res.success) { setError(res.message ?? "Failed to send OTP"); return; }
    const d = res.data as any;
    setDeliveryMethod(d.method ?? "");
    setMaskedContact(d.contact ?? "");
    setStep("otp");
    setCountdown(60);
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    setError("");
    if (!otp || otp.length !== 6) { setError("Please enter the 6-digit code"); return; }
    setIsSubmitting(true);
    const res = await api<{ resetToken: string }>("/api/auth/verify-otp", { email, otp });
    setIsSubmitting(false);
    if (!res.success) { setError(res.message ?? "Invalid OTP"); return; }
    setResetToken((res.data as any).resetToken);
    setStep("reset");
  }, [email, otp]);

  const handleResetPassword = useCallback(async () => {
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setIsSubmitting(true);
    const res = await api("/api/auth/reset-password", { resetToken, newPassword });
    setIsSubmitting(false);
    if (!res.success) { setError(res.message ?? "Failed to reset password"); return; }
    router.push("/login");
  }, [resetToken, newPassword, confirmPassword, router]);

  return (
    <div className="min-h-screen flex">
      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-odg-navy">
        <div className="absolute inset-0 bg-linear-to-br from-odg-navy via-odg-navy-mid to-[#0a1520]" />
        <div className="absolute top-[-8%] right-[-12%] w-125 h-125 rounded-full bg-odg-orange/6 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-8%] w-100 h-100 rounded-full bg-odg-orange/4 blur-3xl" />
        <div className="absolute top-[30%] left-[20%] w-64 h-64 border border-white/4 rounded-2xl rotate-12" />
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 border border-odg-orange/8 rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden p-1">
              <img src="/favicon.png" alt="ODCMS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-white leading-tight tracking-tight">ODCMS</div>
              <div className="text-[0.65rem] text-white/40 font-medium tracking-widest uppercase">ODG Master Authority</div>
            </div>
          </div>
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
              Reset Your
              <br />
              <span className="text-odg-orange">Password</span>
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Enter your email to receive a one-time password via SMS or email. Use the code to set a new password and regain access to your account.
            </p>
          </div>
          <div className="text-white/25 text-xs">
            &copy; {new Date().getFullYear()} Office Data Group &mdash; All rights reserved
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-100 space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden p-1">
              <img src="/favicon.png" alt="ODCMS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-foreground leading-tight">ODCMS</div>
              <div className="text-[0.55rem] text-muted-foreground font-medium tracking-widest uppercase">ODG Master Authority</div>
            </div>
          </div>

          {/* Back to login */}
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to login
          </button>

          {/* ── Step 1: Enter Email ── */}
          {step === "email" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Forgot password?</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send a verification code to your phone or email.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="fp-email" className="text-sm font-semibold text-foreground">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="fp-email"
                    type="email"
                    placeholder="admin@odg.com.gh"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleRequestOtp}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-linear-to-r from-odg-orange to-odg-orange-dark text-white font-semibold text-sm shadow-lg shadow-orange-900/25 hover:shadow-orange-900/40 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Verification Code"}
              </button>
            </div>
          )}

          {/* ── Step 2: Enter OTP ── */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Enter verification code</h2>
                <p className="text-sm text-muted-foreground">
                  A 6-digit code was sent {deliveryMethod === "sms" ? "via SMS to" : "to your email"}{" "}
                  <span className="font-semibold text-foreground">{maskedContact}</span>
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="fp-otp" className="text-sm font-semibold text-foreground">Verification code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="fp-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all tracking-[0.3em] font-mono text-center"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-linear-to-r from-odg-orange to-odg-orange-dark text-white font-semibold text-sm shadow-lg shadow-orange-900/25 hover:shadow-orange-900/40 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : "Verify Code"}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend code in {countdown}s</p>
                ) : (
                  <button
                    onClick={() => { setError(""); handleRequestOtp(); }}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: New Password ── */}
          {step === "reset" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Set new password</h2>
                <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="fp-new-pw" className="text-sm font-semibold text-foreground">New password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="fp-new-pw"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                      className="w-full pl-10 pr-11 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="fp-confirm-pw" className="text-sm font-semibold text-foreground">Confirm password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="fp-confirm-pw"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-linear-to-r from-odg-orange to-odg-orange-dark text-white font-semibold text-sm shadow-lg shadow-orange-900/25 hover:shadow-orange-900/40 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : "Reset Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
