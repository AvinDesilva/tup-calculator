import { useState, useRef, useEffect } from "react";
import { C, toggleBtn } from "../../lib/theme.ts";
import { useAuth } from "../../contexts/useAuth.ts";
import type { MastheadProps } from "./Masthead.types.ts";

export function Masthead({ onShowMethodology, onReset, onSignIn, onWatchlist }: MastheadProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const avatarLetter = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  return (
    <header className="rsp-header" style={{
      paddingTop: "28px",
      paddingBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      borderBottom: `2px solid ${C.accent}`,
      animation: "fadeInUp 0.4s ease both",
    }}>
      <div className="rsp-header-content">
        <div className="rsp-header-logo">
          {onReset ? (
            <button
              onClick={onReset}
              aria-label="Reset calculator and return to search"
              style={{ display: "flex", alignItems: "baseline", gap: "10px", cursor: "pointer", background: "none", border: "none", padding: 0 }}
            >
              <h1 style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text1,
                margin: 0,
              }}>TUP</h1>
              <span style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text2,
              }}>Calculator</span>
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <h1 style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text1,
                margin: 0,
              }}>TUP</h1>
              <span style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text2,
              }}>Calculator</span>
            </div>
          )}
        </div>
        <div className="rsp-header-subtitle" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3 }}>
            Time Until Payback
          </span>
          <button onClick={onShowMethodology} style={toggleBtn(false)}>
            Read Methodology →
          </button>
        </div>
      </div>

      {/* Auth section */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "8px" }}>
        {!isAuthenticated ? (
          <button onClick={onSignIn} style={toggleBtn(false)}>
            Sign In
          </button>
        ) : (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: C.accent,
                color: "#080808",
                border: "none",
                cursor: "pointer",
                fontFamily: C.body,
                fontSize: "14px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                avatarLetter
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#1a1a1a",
                  border: `1px solid ${C.border}`,
                  minWidth: "160px",
                  zIndex: 1000,
                  padding: "4px 0",
                }}
              >
                <div style={{
                  padding: "8px 16px",
                  fontSize: "11px",
                  color: C.text2,
                  borderBottom: `1px solid ${C.borderWeak}`,
                  fontFamily: C.body,
                }}>
                  {user?.displayName || user?.email}
                </div>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onWatchlist?.(); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", background: "none", border: "none",
                    color: C.text1, fontSize: "12px", cursor: "pointer",
                    fontFamily: C.body,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  Watchlist
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); logout(); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", background: "none", border: "none",
                    color: C.text2, fontSize: "12px", cursor: "pointer",
                    fontFamily: C.body,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
