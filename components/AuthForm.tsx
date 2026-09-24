"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabase, safeNextPath } from "@/lib/supabase";
import { useAccount } from "./Account";
import { useSiteState } from "./SiteState";

type Mode = "login" | "signup";

function currentNext(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const supabase = getSupabase();
  const { configured, user } = useAccount();
  const { level } = useSiteState();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isLogin = mode === "login";

  if (!configured || !supabase) {
    return (
      <div className="simple-page">
        <h1>{isLogin ? "Log in" : "Sign up"}</h1>
        <p>Accounts are coming soon. You can already read every story without an account.</p>
        <Link href="/" className="btn-solid">
          Back to stories
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className="simple-page">
        <h1>You’re logged in</h1>
        <p>You are logged in as {user.email}.</p>
        <Link href="/" className="btn-solid">
          Back to stories
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setNotice("");
    const next = currentNext();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        setError(
          error.message === "Email not confirmed"
            ? "Please confirm your email first — check your inbox for our message."
            : "Wrong email or password. Please try again.",
        );
        return;
      }
      router.push(next);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + next, data: { level } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push(next);
    } else {
      setNotice(`Almost done! We sent a confirmation link to ${email}. Open it to finish creating your account.`);
    }
  }

  async function sendMagicLink() {
    if (!supabase) return;
    if (!email) {
      setError("Please type your email first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + currentNext(), data: { level } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(`Check your inbox: we sent a login link to ${email}.`);
  }

  return (
    <div className="simple-page auth-page">
      <h1>{isLogin ? "Log in" : "Create your account"}</h1>
      <p>
        {isLogin
          ? "Welcome back! Log in to see your saved words."
          : "Save new words while you read and get feedback on your retellings. Reading is always free."}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!isLogin && <small>At least 8 characters.</small>}
        </label>
        <button type="submit" className="btn-solid" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
        </button>
      </form>

      <div className="auth-alt">
        <span>or</span>
        <button type="button" className="btn-ghost" onClick={sendMagicLink} disabled={busy}>
          Email me a {isLogin ? "login" : "sign-up"} link instead
        </button>
      </div>

      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-message notice" role="status">
          {notice}
        </p>
      )}

      <p className="auth-switch">
        {isLogin ? (
          <>
            New here? <Link href="/signup">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        )}
      </p>
    </div>
  );
}
