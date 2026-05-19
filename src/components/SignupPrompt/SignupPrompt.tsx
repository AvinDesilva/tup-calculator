import { createPortal } from "react-dom";
import { C } from "../../lib/theme.ts";

interface SignupPromptProps {
  onCreateAccount: () => void;
  onDismiss: () => void;
}

export function SignupPrompt({ onCreateAccount, onDismiss }: SignupPromptProps) {
  return createPortal(
    <div
      aria-live="polite"
      role="status"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        background: "#1a1a1a",
        border: `1px solid ${C.accent}`,
        padding: "20px 24px",
        maxWidth: "340px",
        animation: "fadeInUp 0.4s ease both",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ fontSize: "13px", color: C.text1, margin: "0 0 16px", lineHeight: 1.6, fontFamily: C.body }}>
        You've searched 5 stocks &mdash; create a free account to save them to your watchlist.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => { onDismiss(); onCreateAccount(); }}
          style={{
            padding: "8px 16px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background: C.accent,
            color: "#080808",
            border: "none",
            cursor: "pointer",
            fontFamily: C.body,
          }}
        >
          Create Account
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: "8px 16px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background: "transparent",
            color: C.text3,
            border: `1px solid ${C.borderWeak}`,
            cursor: "pointer",
            fontFamily: C.body,
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>,
    document.body,
  );
}
