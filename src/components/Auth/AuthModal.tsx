import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { C, toggleBtn } from "../../lib/theme.ts";
import { useAuth } from "../../contexts/useAuth.ts";
import { LoginForm } from "./LoginForm.tsx";
import { RegisterForm } from "./RegisterForm.tsx";
import { GoogleButton } from "./GoogleButton.tsx";

type AuthTab = "login" | "register";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthTab;
}

export function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
  if (!isOpen) return null;
  return <AuthModalContent initialTab={initialTab} onClose={onClose} />;
}

function AuthModalContent({ initialTab, onClose }: { initialTab: AuthTab; onClose: () => void }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [error, setError] = useState("");
  const { login, register, loginWithGoogle } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElRef = useRef<Element | null>(document.activeElement);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const savedTrigger = triggerElRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (savedTrigger instanceof HTMLElement) savedTrigger.focus();
    };
  }, [onClose, tab]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setError("");
    try {
      await login(email, password);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }, [login, onClose]);

  const handleRegister = useCallback(async (email: string, password: string, displayName: string) => {
    setError("");
    try {
      await register(email, password, displayName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  }, [register, onClose]);

  const handleGoogle = useCallback(async (idToken: string) => {
    setError("");
    try {
      await loginWithGoogle(idToken);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }, [loginWithGoogle, onClose]);

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{
          background: "#111",
          border: `1px solid ${C.border}`,
          maxWidth: "420px",
          width: "calc(100% - 32px)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "12px", right: "12px",
            background: "none", border: "none", color: C.text3,
            fontSize: "18px", cursor: "pointer", padding: "4px 8px",
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        <h2 id="auth-modal-title" style={{
          fontFamily: C.serif, fontSize: "24px", fontWeight: 400,
          color: C.text1, margin: "0 0 24px",
        }}>
          {tab === "login" ? "Welcome Back" : "Create Account"}
        </h2>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button onClick={() => { setTab("login"); setError(""); }} style={toggleBtn(tab === "login")}>
            Sign In
          </button>
          <button onClick={() => { setTab("register"); setError(""); }} style={toggleBtn(tab === "register")}>
            Create Account
          </button>
        </div>

        {tab === "login" ? (
          <LoginForm onSubmit={handleLogin} error={error} />
        ) : (
          <RegisterForm onSubmit={handleRegister} error={error} />
        )}

        <GoogleButton onToken={handleGoogle} />
      </div>
    </div>,
    document.body,
  );
}
