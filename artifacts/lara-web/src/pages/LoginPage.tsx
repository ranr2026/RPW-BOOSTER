import { useState } from "react";
import { api, type FbProfile } from "@/lib/api";
import { showToast } from "@/components/Toaster";

interface Props {
  onLogin: (profile: FbProfile, cookie: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function handleLogin() {
    const c = cookie.trim();
    if (!c) { showToast("Paste your Facebook cookie first", "error"); return; }
    setLoading(true);
    try {
      const profile = await api.login(c);
      if (!profile.uid) {
        showToast("Could not extract UID — paste a complete cookie with c_user and xs fields", "error");
        return;
      }
      const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;
      showToast(`Logged in as ${displayName} ✓`, "success");
      onLogin(profile, c);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Login failed — check your cookie", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="slide-up">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 90, height: 90, borderRadius: 22, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          }}>🌸</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Lara</h1>
          <p style={{ color: "var(--lara-muted)", fontSize: 13 }}>Facebook Multi-Tool Suite v1.5.1</p>
        </div>

        {/* Cookie input */}
        <div className="lara-card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ color: "var(--lara-muted)", fontSize: 12, fontWeight: 600 }}>FACEBOOK COOKIE</p>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{ fontSize: 11, color: "#a855f7", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {showGuide ? "▲ Hide" : "▼ How to get?"}
            </button>
          </div>

          {showGuide && (
            <div style={{
              background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 10, padding: 14, marginBottom: 14,
            }}>
              <p style={{ fontSize: 12, color: "#c084fc", fontWeight: 600, marginBottom: 8 }}>📋 How to get your cookie:</p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--lara-muted)", lineHeight: 1.8 }}>
                <li>Open Facebook in your browser (PC)</li>
                <li>Press <strong style={{ color: "#fff" }}>F12</strong> → Application → Storage → Cookies</li>
                <li>Select <strong style={{ color: "#fff" }}>facebook.com</strong></li>
                <li>Copy all cookie rows (must include <code style={{ color: "#a855f7" }}>c_user</code> and <code style={{ color: "#a855f7" }}>xs</code>)</li>
                <li>Or use browser extension: <strong style={{ color: "#fff" }}>Cookie-Editor</strong></li>
              </ol>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
                Tip: Export as "Netscape" format or copy raw <code style={{ color: "#888" }}>key=value; key=value</code> string
              </p>
            </div>
          )}

          <textarea
            className="lara-input"
            rows={6}
            value={cookie}
            onChange={e => setCookie(e.target.value)}
            placeholder={"Paste your Facebook cookie here...\n\nAccepts:\n• Netscape format (tab-separated)\n• Raw: c_user=123; xs=abc; datr=xyz"}
            style={{ resize: "none", fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }}
          />

          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["c_user", "xs", "datr", "fr", "sb"].map(field => {
              const found = cookie.includes(field);
              return (
                <span key={field} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: found ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${found ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: found ? "#4ade80" : "rgba(255,255,255,0.3)",
                  fontFamily: "monospace",
                }}>
                  {found ? "✓" : "·"} {field}
                </span>
              );
            })}
          </div>

          <button
            className="lara-btn lara-btn-primary"
            style={{ marginTop: 18 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                Verifying cookie...
              </span>
            ) : (
              <>🔑 Login with Cookie</>
            )}
          </button>

          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
            Your cookie is used only for Facebook API calls and is never stored.
          </p>
        </div>

        {/* Tools preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "❤️", label: "Auto React", desc: "Like/React posts" },
            { icon: "📤", label: "Spam Share", desc: "Share posts fast" },
            { icon: "💬", label: "Mass Comment", desc: "Bulk comments" },
            { icon: "🛡️", label: "Profile Guard", desc: "Protect account" },
          ].map(f => (
            <div key={f.label} className="lara-card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--lara-muted)", marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11, marginTop: 20 }}>
          Lara v1.5.1 • Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
