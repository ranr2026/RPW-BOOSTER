import { useState } from "react";
import { api, type FbProfile } from "@/lib/api";
import { showToast } from "@/components/Toaster";

interface Props {
  onLogin: (profile: FbProfile, cookie: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const c = cookie.trim();
    if (!c) { showToast("Paste your Facebook cookie first", "error"); return; }
    setLoading(true);
    try {
      const profile = await api.login(c);
      showToast(`Welcome, ${profile.name}!`, "success");
      onLogin(profile, c);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="slide-up">
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 90, height: 90, borderRadius: 22, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          }}>🌸</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Lara</h1>
          <p style={{ color: "var(--lara-muted)", fontSize: 13 }}>Facebook Multi-Tool Suite</p>
        </div>

        {/* Cookie input */}
        <div className="lara-card" style={{ padding: 24 }}>
          <p style={{ color: "var(--lara-muted)", fontSize: 12, marginBottom: 8 }}>FACEBOOK COOKIE</p>
          <textarea
            className="lara-input"
            rows={6}
            value={cookie}
            onChange={e => setCookie(e.target.value)}
            placeholder="Paste your Facebook cookie here...&#10;&#10;Supports Netscape format or raw key=value format"
            style={{ resize: "none", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}
          />
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 8 }}>
            Your cookie is sent only to this server and never stored permanently.
          </p>

          <button
            className="lara-btn lara-btn-primary"
            style={{ marginTop: 20 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                Verifying...
              </>
            ) : (
              <>🔑 Login with Cookie</>
            )}
          </button>
        </div>

        {/* Info cards */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { icon: "⚡", label: "Auto React", desc: "Like/React posts" },
            { icon: "📤", label: "Spam Share", desc: "Share posts fast" },
            { icon: "💬", label: "Mass Comment", desc: "Bulk comments" },
            { icon: "🔐", label: "Profile Guard", desc: "Protect account" },
          ].map(f => (
            <div key={f.label} className="lara-card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--lara-muted)", marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 24 }}>
          Lara v1.5.1 • Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
