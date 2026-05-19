import { useState } from "react";
import { C, inputShared } from "../../lib/theme.ts";

interface RegisterFormProps {
  onSubmit: (email: string, password: string, displayName: string) => Promise<void>;
  error: string;
}

export function RegisterForm({ onSubmit, error }: RegisterFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password, displayName);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor="reg-name" style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "8px" }}>
          Display Name
        </label>
        <input
          id="reg-name"
          type="text"
          required
          autoComplete="name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          style={{ ...inputShared, fontSize: "14px" }}
          aria-describedby={error ? "reg-error" : undefined}
        />
      </div>

      <div>
        <label htmlFor="reg-email" style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "8px" }}>
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ ...inputShared, fontSize: "14px" }}
        />
      </div>

      <div>
        <label htmlFor="reg-password" style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "8px" }}>
          Password
          <span style={{ fontWeight: 400, letterSpacing: "normal", textTransform: "none", color: C.text3, marginLeft: "6px", fontSize: "9px" }}>
            (min. 8 characters)
          </span>
        </label>
        <input
          id="reg-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...inputShared, fontSize: "14px" }}
        />
      </div>

      {error && (
        <div id="reg-error" role="alert" style={{ fontSize: "12px", color: "#e74c3c", fontFamily: C.body }}>
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
        {submitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
