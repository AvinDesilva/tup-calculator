import { useState } from "react";
import { C, inputShared } from "../../lib/theme.ts";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string;
}

export function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor="login-email" style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "8px" }}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ ...inputShared, fontSize: "14px" }}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      <div>
        <label htmlFor="login-password" style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "8px" }}>
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...inputShared, fontSize: "14px" }}
        />
      </div>

      {error && (
        <div id="login-error" role="alert" style={{ fontSize: "12px", color: "#e74c3c", fontFamily: C.body }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: C.accent,
          color: "#080808",
          border: "none",
          cursor: submitting ? "wait" : "pointer",
          fontFamily: C.body,
          opacity: submitting ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
