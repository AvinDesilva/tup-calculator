import { useEffect, useRef } from "react";
import { C } from "../../lib/theme.ts";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleButtonProps {
  onToken: (idToken: string) => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleButton({ onToken }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || initialized.current) return;
    const clientId = GOOGLE_CLIENT_ID;

    function init() {
      if (!window.google || !containerRef.current || initialized.current) return;
      initialized.current = true;
      const width = Math.min(400, Math.max(200, containerRef.current.offsetWidth));
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onToken(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        shape: "rectangular",
        theme: "filled_black",
        text: "continue_with",
        size: "large",
        width,
      });
    }

    if (window.google) {
      init();
    } else {
      // Wait for script to load
      const check = setInterval(() => {
        if (window.google) { clearInterval(check); init(); }
      }, 200);
      return () => clearInterval(check);
    }
  }, [onToken]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0 16px" }}>
        <div style={{ flex: 1, height: "1px", background: C.borderWeak }} />
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3 }}>or</span>
        <div style={{ flex: 1, height: "1px", background: C.borderWeak }} />
      </div>
      <div ref={containerRef} style={{ display: "flex", justifyContent: "center", borderRadius: "4px", overflow: "hidden", colorScheme: "dark" }} />
    </div>
  );
}
