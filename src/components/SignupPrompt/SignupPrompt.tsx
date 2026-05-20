import { createPortal } from "react-dom";
import { C } from "../../lib/theme.ts";

interface SignupPromptProps {
  onCreateAccount: () => void;
  onDismiss: () => void;
}

export function SignupPrompt({ onCreateAccount, onDismiss }: SignupPromptProps) {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.45)",
        animation: "fadeInUp 0.3s ease both",
      }}
    >
      {/* Full-screen button behind the card — click-to-dismiss */}
      <button
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          border: "none",
          cursor: "default",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create a free account"
        style={{
          position: "relative",
          zIndex: 1,
          background: "#1a1a1a",
          border: `1px solid ${C.accent}`,
          padding: "32px 28px",
          maxWidth: "360px",
          width: "calc(100% - 48px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <p style={{ fontSize: "14px", color: C.text1, margin: "0 0 20px", lineHeight: 1.65, fontFamily: C.body }}>
          You've searched 5 stocks &mdash; create a free account to save them to your watchlist.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { onDismiss(); onCreateAccount(); }}
            style={{
              padding: "9px 18px",
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
              padding: "9px 18px",
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
      </div>
    </div>,
    document.body,
  );
}
