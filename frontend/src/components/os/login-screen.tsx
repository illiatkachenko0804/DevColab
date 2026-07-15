"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Mail, User } from "lucide-react";
import { useState, useEffect } from "react";
import { PasswordStrength } from "@/components/auth/password-strength";
import { TrafficLights } from "@/components/os/traffic-lights";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  authErrorMessage,
  githubAuthUrl,
  login as apiLogin,
  register as apiRegister,
  resendCode,
  verifyEmail,
  fetchTwoFactorStatus,
  loginVerifyTwoFactor,
} from "@/lib/auth";
import { evaluatePassword } from "@/lib/password";
import { useOS } from "@/stores/os";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}

const fieldClass =
  "flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 focus-within:border-accent";
const inputClass =
  "h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-faint";

type Mode = "signin" | "create";
type Step = "credentials" | "verify" | "2fa";

export function LoginScreen() {
  const setSession = useOS((s) => s.setSession);

  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("credentials");

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [tfaCode, setTfaCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const pw = evaluatePassword(password);
  const matches = password.length > 0 && password === confirm;
  const canRegister = email.trim() && displayName.trim() && pw.valid && matches;

  const fail = (e: unknown) => {
    const { message, details } = authErrorMessage(e);
    setError(message);
    setDetails(details);
  };
  const reset = () => {
    setError(null);
    setDetails([]);
  };

  // Check if we arrived from GitHub OAuth but need 2FA
  useEffect(() => {
    fetchTwoFactorStatus().then((res) => {
      if (res.requiresTwoFactor) {
        setStep("2fa");
        setInfo("Please verify your identity with your authenticator app.");
      }
    }).catch(() => {});
  }, []);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      if ("requiresTwoFactor" in res && res.requiresTwoFactor) {
        setStep("2fa");
        setInfo("Please verify your identity with your authenticator app.");
      } else {
        setSession(res as any);
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      setSession(await loginVerifyTwoFactor(tfaCode.trim()));
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!canRegister) return;
    setLoading(true);
    try {
      const res = await apiRegister({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
        confirmPassword: confirm,
      });
      setDevCode(res.devCode ?? null);
      setInfo(
        res.emailDelivered
          ? `We sent a 6-digit code to ${email.trim()}.`
          : `Dev mode: no SMTP configured — use the code below.`,
      );
      setStep("verify");
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      setSession(await verifyEmail(email.trim(), code.trim()));
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    reset();
    try {
      const res = await resendCode(email.trim());
      setDevCode(res.devCode ?? null);
      setInfo(res.emailDelivered ? "A new code is on its way." : "New dev code generated.");
    } catch (err) {
      fail(err);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep("credentials");
    reset();
    setInfo(null);
  };

  const title = step === "verify" ? "Verify email" : step === "2fa" ? "Two-Factor Auth" : mode === "signin" ? "Sign in" : "Create account";

  return (
    <div
      className="relative flex h-dvh w-full items-center justify-center overflow-auto p-4"
      style={{ background: "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #0b1020 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(50% 45% at 80% 15%, rgba(191,90,242,0.4), transparent 60%), radial-gradient(45% 40% at 12% 88%, rgba(10,132,255,0.4), transparent 60%)" }}
      />
      <div className="absolute right-3 top-3 z-10">
        <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="glass-strong relative z-10 my-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-window)]"
      >
        <div className="flex h-11 items-center border-b border-separator px-4">
          <TrafficLights />
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-foreground/80">
            {title}
          </span>
        </div>

        <div className="p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-lg">
              D
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Welcome to DevCollab</h1>
            <p className="mt-1 text-sm text-muted">
              {step === "verify"
                ? "Enter the code we sent you"
                : step === "2fa"
                  ? "Enter your authenticator code"
                  : mode === "signin"
                    ? "Sign in to your workspace"
                    : "Create your account"}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
              {details.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === "verify" ? (
            <form onSubmit={onVerify} className="space-y-4">
              {info && <p className="text-sm text-muted">{info}</p>}
              {devCode && (
                <div className="rounded-lg border border-separator bg-hover px-3 py-2 text-center text-sm">
                  Dev code: <span className="font-mono font-bold tracking-widest">{devCode}</span>
                </div>
              )}
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                aria-label="Verification code"
                className="w-full rounded-lg border border-separator bg-surface py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify & continue"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={onResend} className="cursor-pointer text-accent hover:underline">
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); reset(); }}
                  className="flex cursor-pointer items-center gap-1 text-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Use a different email
                </button>
              </div>
            </form>
          ) : step === "2fa" ? (
            <form onSubmit={onVerify2FA} className="space-y-4">
              {info && <p className="text-sm text-muted">{info}</p>}
              <input
                inputMode="numeric"
                maxLength={6}
                value={tfaCode}
                onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                aria-label="Authenticator code"
                className="w-full rounded-lg border border-separator bg-surface py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading || tfaCode.length !== 6}
                className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify & continue"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); reset(); setTfaCode(""); }}
                  className="flex cursor-pointer items-center gap-1 text-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-5 flex rounded-lg bg-hover p-0.5 text-sm">
                {(["signin", "create"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 cursor-pointer rounded-md py-1.5 font-medium transition-colors ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              {mode === "signin" ? (
                <form onSubmit={onSignIn} className="space-y-3">
                  <label className={fieldClass}>
                    <Mail className="h-4 w-4 text-faint" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={inputClass} />
                  </label>
                  <label className={fieldClass}>
                    <Lock className="h-4 w-4 text-faint" />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className={inputClass} />
                  </label>
                  <button type="submit" disabled={loading} className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              ) : (
                <form onSubmit={onRegister} className="space-y-3">
                  <label className={fieldClass}>
                    <User className="h-4 w-4 text-faint" />
                    <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" aria-label="Display name" className={inputClass} />
                  </label>
                  <label className={fieldClass}>
                    <Mail className="h-4 w-4 text-faint" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={inputClass} />
                  </label>
                  <div>
                    <label className={fieldClass}>
                      <Lock className="h-4 w-4 text-faint" />
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className={inputClass} />
                    </label>
                    <PasswordStrength password={password} />
                  </div>
                  <label className={`${fieldClass} ${confirm && !matches ? "border-danger" : ""}`}>
                    <Lock className="h-4 w-4 text-faint" />
                    <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" aria-label="Confirm password" className={inputClass} />
                    {matches && <Check className="h-4 w-4 text-success" />}
                  </label>
                  {confirm && !matches && <p className="text-xs text-danger">Passwords do not match</p>}
                  <button type="submit" disabled={loading || !canRegister} className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
                    {loading ? "Creating…" : "Create account"}
                  </button>
                </form>
              )}

              <div className="my-4 flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-separator" />
                or
                <span className="h-px flex-1 bg-separator" />
              </div>

              <a
                href={githubAuthUrl}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-separator bg-surface text-sm font-medium transition hover:bg-hover"
              >
                <GithubMark className="h-4 w-4" />
                Continue with GitHub
              </a>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
