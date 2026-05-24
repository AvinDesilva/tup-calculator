import { useState, useCallback } from "react";
import { C } from "../../lib/theme.ts";
import type { IntegrationGuideProps } from "./IntegrationGuide.types.ts";

type Platform = "claude" | "chatgpt" | "gemini";

const PLATFORMS: { key: Platform; label: string; icon: string }[] = [
  { key: "claude", label: "Claude", icon: "C" },
  { key: "chatgpt", label: "ChatGPT", icon: "G" },
  { key: "gemini", label: "Gemini", icon: "✦" },
];

const MCP_CONFIG_CLAUDE = `{
  "mcpServers": {
    "tup-calculator": {
      "command": "npx",
      "args": ["-y", "tup-calculator-mcp@latest"],
      "env": {
        "FMP_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}`;

const MCP_CONFIG_CLAUDE_CODE = `claude mcp add tup-calculator \\
  -e FMP_API_KEY=YOUR_API_KEY_HERE \\
  -- npx -y tup-calculator-mcp@latest`;

const MCP_CONFIG_CLAUDE_PAIRED = `{
  "mcpServers": {
    "tup-calculator": {
      "command": "npx",
      "args": ["-y", "tup-calculator-mcp@latest"]
    },
    "fmp": {
      "command": "npx",
      "args": ["-y", "financial-modeling-prep-mcp-server",
               "--fmp-token=YOUR_API_KEY_HERE"]
    }
  }
}`;

const MCP_CONFIG_CLAUDE_CODE_PAIRED = `# Add both servers:
claude mcp add tup-calculator -- npx -y tup-calculator-mcp@latest

claude mcp add fmp \\
  -- npx -y financial-modeling-prep-mcp-server \\
  --fmp-token=YOUR_API_KEY_HERE`;

const MCP_CONFIG_CHATGPT = `# ChatGPT MCP support is rolling out gradually.
# When available, add via Settings → Tools → MCP Servers:

Server Name: tup-calculator
Command: npx -y tup-calculator-mcp@latest
Environment: FMP_API_KEY=YOUR_API_KEY_HERE`;

const MCP_CONFIG_GEMINI = `# Gemini MCP support is rolling out gradually.
# When available, add via Settings → Extensions → MCP:

Server Name: tup-calculator
Command: npx -y tup-calculator-mcp@latest
Environment: FMP_API_KEY=YOUR_API_KEY_HERE`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        padding: "4px 10px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: copied ? "rgba(16,217,126,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(16,217,126,0.3)" : C.borderWeak}`,
        color: copied ? "#10d97e" : C.text2,
        cursor: "pointer",
        fontFamily: C.body,
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ position: "relative", marginBottom: "20px" }}>
      <CopyButton text={code} />
      <pre
        style={{
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${C.borderWeak}`,
          padding: "16px",
          paddingRight: "80px",
          overflowX: "auto",
          fontSize: "12px",
          lineHeight: 1.6,
          fontFamily: C.mono,
          color: C.text1,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: C.accent,
        color: "#080808",
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: C.body,
        marginRight: "10px",
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

function ClaudeInstructions() {
  const [setupMode, setSetupMode] = useState<"standalone" | "paired">("standalone");

  return (
    <div>
      <h3 style={{ fontFamily: C.display, fontSize: "18px", color: C.text1, margin: "0 0 20px 0", fontWeight: 600 }}>
        Claude Desktop & Claude Code
      </h3>

      {/* Setup mode toggle */}
      <div style={{ display: "flex", gap: "0", marginBottom: "24px" }}>
        <button
          onClick={() => setSetupMode("standalone")}
          style={{
            padding: "8px 16px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            border: `1px solid ${setupMode === "standalone" ? C.accent : C.borderWeak}`,
            borderRight: setupMode === "standalone" ? `1px solid ${C.accent}` : "none",
            background: setupMode === "standalone" ? C.accent : "transparent",
            color: setupMode === "standalone" ? "#080808" : C.text2,
            cursor: "pointer",
            fontFamily: C.body,
            transition: "all 0.15s",
          }}
        >
          Standalone
        </button>
        <button
          onClick={() => setSetupMode("paired")}
          style={{
            padding: "8px 16px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            border: `1px solid ${setupMode === "paired" ? C.accentAlt : C.borderWeak}`,
            background: setupMode === "paired" ? C.accentAlt : "transparent",
            color: setupMode === "paired" ? "#080808" : C.text2,
            cursor: "pointer",
            fontFamily: C.body,
            transition: "all 0.15s",
          }}
        >
          Paired with FMP MCP
        </button>
      </div>

      {setupMode === "paired" && (
        <div style={{
          background: "rgba(0,191,165,0.06)",
          border: `1px solid rgba(0,191,165,0.2)`,
          padding: "14px 16px",
          marginBottom: "20px",
          fontSize: "12px",
          fontFamily: C.body,
          color: C.text2,
          lineHeight: 1.6,
        }}>
          <strong style={{ color: C.text1 }}>Power User Setup:</strong> Pair TUP Calculator with the{" "}
          <a href="https://github.com/imbenrabi/Financial-Modeling-Prep-MCP-Server" target="_blank" rel="noopener noreferrer" style={{ color: C.accentAlt, textDecoration: "none" }}>
            FMP MCP Server
          </a>{" "}
          to get 250+ financial data tools alongside TUP analysis. Your AI fetches data via FMP MCP and runs it through the TUP engine — no duplicate API calls, richer data access.
        </div>
      )}

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={1} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Get a free API key from{" "}
            <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>
              Financial Modeling Prep
            </a>
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={2} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            For <strong>Claude Desktop</strong>, add this to your MCP config file
          </span>
        </div>
        <p style={{ fontSize: "11px", color: C.text2, margin: "0 0 8px 34px", fontFamily: C.body }}>
          macOS: <code style={{ fontFamily: C.mono, color: C.text1, fontSize: "11px" }}>~/Library/Application Support/Claude/claude_desktop_config.json</code>
          <br />
          Windows: <code style={{ fontFamily: C.mono, color: C.text1, fontSize: "11px" }}>%APPDATA%\Claude\claude_desktop_config.json</code>
        </p>
        <div style={{ marginLeft: "34px" }}>
          <CodeBlock code={setupMode === "standalone" ? MCP_CONFIG_CLAUDE : MCP_CONFIG_CLAUDE_PAIRED} />
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={3} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            For <strong>Claude Code</strong> (terminal), run {setupMode === "paired" ? "these commands" : "this command"}
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <CodeBlock code={setupMode === "standalone" ? MCP_CONFIG_CLAUDE_CODE : MCP_CONFIG_CLAUDE_CODE_PAIRED} />
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={4} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Restart Claude, then try asking:
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <div style={{
            background: "rgba(196,160,110,0.08)",
            border: `1px solid rgba(196,160,110,0.2)`,
            padding: "14px 16px",
            fontSize: "13px",
            fontFamily: C.body,
            color: C.text1,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}>
            {setupMode === "standalone"
              ? "\"Can you analyze whether AAPL is a good investment using the TUP calculator?\""
              : "\"Fetch AAPL's financials and run a TUP analysis — is it a good time to buy?\""
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatGPTInstructions() {
  return (
    <div>
      <h3 style={{ fontFamily: C.display, fontSize: "18px", color: C.text1, margin: "0 0 20px 0", fontWeight: 600 }}>
        ChatGPT
      </h3>

      <div style={{
        background: "rgba(196,160,110,0.08)",
        border: `1px solid rgba(196,160,110,0.2)`,
        padding: "14px 16px",
        marginBottom: "20px",
        fontSize: "12px",
        fontFamily: C.body,
        color: C.text2,
        lineHeight: 1.5,
      }}>
        ChatGPT is gradually rolling out MCP support. The configuration below will work once MCP is available in your ChatGPT plan.
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={1} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Get a free API key from{" "}
            <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>
              Financial Modeling Prep
            </a>
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={2} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Add the MCP server via ChatGPT settings
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <CodeBlock code={MCP_CONFIG_CHATGPT} />
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={3} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Then ask ChatGPT to analyze a stock:
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <div style={{
            background: "rgba(196,160,110,0.08)",
            border: `1px solid rgba(196,160,110,0.2)`,
            padding: "14px 16px",
            fontSize: "13px",
            fontFamily: C.body,
            color: C.text1,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}>
            "Use the TUP calculator to evaluate whether MSFT is overvalued right now."
          </div>
        </div>
      </div>
    </div>
  );
}

function GeminiInstructions() {
  return (
    <div>
      <h3 style={{ fontFamily: C.display, fontSize: "18px", color: C.text1, margin: "0 0 20px 0", fontWeight: 600 }}>
        Gemini
      </h3>

      <div style={{
        background: "rgba(196,160,110,0.08)",
        border: `1px solid rgba(196,160,110,0.2)`,
        padding: "14px 16px",
        marginBottom: "20px",
        fontSize: "12px",
        fontFamily: C.body,
        color: C.text2,
        lineHeight: 1.5,
      }}>
        Gemini is gradually rolling out MCP support. The configuration below will work once MCP is available in your Gemini plan.
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={1} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Get a free API key from{" "}
            <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>
              Financial Modeling Prep
            </a>
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={2} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Add the MCP server via Gemini settings
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <CodeBlock code={MCP_CONFIG_GEMINI} />
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <StepNumber n={3} />
          <span style={{ fontSize: "13px", color: C.text1, fontFamily: C.body }}>
            Then ask Gemini to analyze a stock:
          </span>
        </div>
        <div style={{ marginLeft: "34px" }}>
          <div style={{
            background: "rgba(196,160,110,0.08)",
            border: `1px solid rgba(196,160,110,0.2)`,
            padding: "14px 16px",
            fontSize: "13px",
            fontFamily: C.body,
            color: C.text1,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}>
            "Analyze GOOGL stock using the TUP calculator — is it a good time to buy?"
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntegrationGuide({ onBack }: IntegrationGuideProps) {
  const [platform, setPlatform] = useState<Platform>("claude");

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text1,
      padding: "0 24px 60px",
      maxWidth: "720px",
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        paddingTop: "28px",
        paddingBottom: "20px",
        borderBottom: `2px solid ${C.accent}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "36px",
        animation: "fadeInUp 0.4s ease both",
      }}>
        <button
          onClick={onBack}
          aria-label="Back to calculator"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: C.text2,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: C.body,
            fontSize: "12px",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text1)}
          onMouseLeave={e => (e.currentTarget.style.color = C.text2)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3 }}>
          AI Integration
        </span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: "32px", animation: "fadeInUp 0.5s ease 0.1s both" }}>
        <h1 style={{
          fontFamily: C.display,
          fontSize: "32px",
          fontWeight: 600,
          color: C.text1,
          margin: "0 0 12px 0",
          letterSpacing: "-0.01em",
        }}>
          Use TUP with Your AI Assistant
        </h1>
        <p style={{
          fontFamily: C.body,
          fontSize: "14px",
          color: C.text2,
          margin: 0,
          lineHeight: 1.6,
        }}>
          Connect the TUP Calculator to Claude, ChatGPT, or Gemini via MCP (Model Context Protocol).
          Once connected, your AI can fetch live financial data and run TUP analysis on any stock — just ask it.
        </p>
      </div>

      {/* What you get */}
      <div style={{
        marginBottom: "36px",
        padding: "20px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${C.borderWeak}`,
        animation: "fadeInUp 0.5s ease 0.15s both",
      }}>
        <h2 style={{ fontFamily: C.display, fontSize: "15px", fontWeight: 600, color: C.accent, margin: "0 0 14px 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Tools
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: C.accent, fontFamily: C.mono, fontSize: "14px", lineHeight: "20px" }}>1.</span>
            <span style={{ fontFamily: C.body, fontSize: "13px", color: C.text1, lineHeight: "20px" }}>
              <strong>analyze_stock</strong> — Full TUP analysis: fetches data and calculates verdict, payback period, and year-by-year breakdown
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: C.accent, fontFamily: C.mono, fontSize: "14px", lineHeight: "20px" }}>2.</span>
            <span style={{ fontFamily: C.body, fontSize: "13px", color: C.text1, lineHeight: "20px" }}>
              <strong>calculate_tup</strong> — Pure TUP calculation from data you provide (no API key needed — pair with the FMP MCP Server)
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: C.accent, fontFamily: C.mono, fontSize: "14px", lineHeight: "20px" }}>3.</span>
            <span style={{ fontFamily: C.body, fontSize: "13px", color: C.text1, lineHeight: "20px" }}>
              <strong>search_tickers</strong> — Find ticker symbols by company name or partial match
            </span>
          </div>
        </div>
      </div>

      {/* Platform tabs */}
      <div style={{
        display: "flex",
        gap: "0",
        marginBottom: "28px",
        borderBottom: `1px solid ${C.borderWeak}`,
        animation: "fadeInUp 0.5s ease 0.2s both",
      }}>
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            style={{
              padding: "10px 20px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              borderBottom: platform === p.key ? `2px solid ${C.accent}` : "2px solid transparent",
              color: platform === p.key ? C.text1 : C.text2,
              cursor: "pointer",
              fontFamily: C.body,
              transition: "all 0.15s",
              marginBottom: "-1px",
            }}
            onMouseEnter={e => { if (platform !== p.key) e.currentTarget.style.color = C.text1; }}
            onMouseLeave={e => { if (platform !== p.key) e.currentTarget.style.color = C.text2; }}
          >
            <span style={{ marginRight: "6px" }}>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Platform-specific instructions */}
      <div style={{ animation: "fadeInUp 0.3s ease both" }}>
        {platform === "claude" && <ClaudeInstructions />}
        {platform === "chatgpt" && <ChatGPTInstructions />}
        {platform === "gemini" && <GeminiInstructions />}
      </div>

      {/* Requirements footer */}
      <div style={{
        marginTop: "40px",
        padding: "16px 20px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${C.borderWeak}`,
        animation: "fadeInUp 0.5s ease 0.25s both",
      }}>
        <h2 style={{ fontFamily: C.display, fontSize: "13px", fontWeight: 600, color: C.text2, margin: "0 0 10px 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Requirements
        </h2>
        <ul style={{ margin: 0, padding: "0 0 0 16px", fontFamily: C.body, fontSize: "12px", color: C.text2, lineHeight: 1.8 }}>
          <li>Node.js 18+ installed on your machine</li>
          <li>
            A free API key from{" "}
            <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>
              financialmodelingprep.com
            </a>
            {" "}(not needed if pairing with the FMP MCP Server)
          </li>
          <li>An AI client that supports MCP (Claude Desktop, Claude Code, or similar)</li>
        </ul>
      </div>
    </div>
  );
}
