import { useState } from "react";
import { api, type FbProfile } from "@/lib/api";

interface Props {
  onLogin: (profile: FbProfile, cookie: string) => void;
}

const FIELDS = ["c_user", "xs", "datr", "fr", "sb"];

export default function LoginPage({ onLogin }: Props) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  async function handleLogin() {
    const c = cookie.trim();
    if (!c) { setError("Paste your Facebook cookie first"); return; }
    if (!c.includes("c_user") || !c.includes("xs")) {
      setError("Cookie must include c_user and xs fields"); return;
    }
    setError("");
    setLoading(true);
    try {
      const profile = await api.login(c);
      if (!profile.uid) {
        setError("Could not extract UID — paste the full cookie from facebook.com");
        return;
      }
      onLogin(profile, c);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Login failed — check your cookie");
    } finally {
      setLoading(false);
    }
  }

  const fieldsDetected = FIELDS.filter(f => cookie.includes(f));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="slide-up">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 90, height: 90, borderRadius: 24, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, boxShadow: "0 12px 40px rgba(124,58,237,0.45)",
          }}>🌸</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4 }}>Lara</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Facebook Multi-Tool Suite v1.5.1</p>
        </div>

        {/* Card */}
        <div className="lara-card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>FACEBOOK COOKIE</p>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{ fontSize: 12, color: "#a855f7", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
            >
              {showGuide ? "▲ Hide" : "▼ How to get?"}
            </button>
          </div>

          {showGuide && (
            <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "#c084fc", fontWeight: 600, marginBottom: 10 }}>📋 How to get your Facebook cookie:</p>
              <ol style={{ paddingLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 2 }}>
                <li>Open <strong style={{ color: "#fff" }}>Facebook.com</strong> on PC browser</li>
                <li>Press <strong style={{ color: "#fff" }}>F12</strong> → Application → Cookies</li>
                <li>Select <strong style={{ color: "#fff" }}>https://www.facebook.com</strong></li>
                <li>Copy all entries as text, or use <strong style={{ color: "#fff" }}>Cookie-Editor</strong> extension → Export → Header String</li>
              </ol>
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                c_user=123456; xs=abc:xyz:2; datr=xxx; fr=yyy; sb=zzz
              </div>
            </div>
          )}

          <textarea
            className="lara-input"
            rows={6}
            value={cookie}
            onChange={e => { setCookie(e.target.value); setError(""); }}
            placeholder={"Paste your Facebook cookie here...\n\nExample format:\nc_user=61585...; xs=44%3A...; datr=j0GZ...\n\nMust include: c_user + xs"}
            style={{ fontFamily: "monospace", fontSize: 11 }}
          />

          {/* Field detector */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {FIELDS.map(f => {
              const found = cookie.includes(f);
              return (
                <span key={f} className={`field-badge ${found ? "found" : "miss"}`}>
                  {found ? "✓" : "·"} {f}
                </span>
              );
            })}
            {fieldsDetected.length > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", alignSelf: "center", marginLeft: 4 }}>
                {fieldsDetected.length}/5 fields
              </span>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            className="lara-btn lara-btn-primary"
            style={{ marginTop: 18 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <><span className="spin" /> Verifying cookie...</>
            ) : (
              <>🔑 Login with Cookie</>
            )}
          </button>

          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>
            Cookie is only used for Facebook API calls. Never stored permanently.
          </p>
        </div>

        {/* Feature preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "❤️", label: "Auto React", desc: "6 reaction types" },
            { icon: "📤", label: "Spam Share", desc: "Up to 20× shares" },
            { icon: "💬", label: "Mass Comment", desc: "Bulk comments" },
            { icon: "🛡️", label: "Profile Guard", desc: "Protect account" },
          ].map(f => (
            <div key={f.label} className="lara-card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{f.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.12)", fontSize: 11 }}>
          Lara v1.5.1 • Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
