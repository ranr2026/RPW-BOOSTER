import { useState } from "react";
import { Zap, ThumbsUp, Share2, MessageSquare, Shield, LogIn, ChevronDown, ChevronUp } from "lucide-react";
import { api, type FbProfile } from "@/lib/api";

interface Props {
  onLogin: (profile: FbProfile, cookie: string) => void;
}

const FIELDS = ["c_user", "xs", "datr", "fr", "sb"];

const FEATURES = [
  { Icon: ThumbsUp,     label: "Auto React",    desc: "6 reaction types", color: "#ef4444" },
  { Icon: Share2,       label: "Spam Share",     desc: "Multi shares",     color: "#3b82f6" },
  { Icon: MessageSquare,label: "Mass Comment",   desc: "Bulk comments",    color: "#22c55e" },
  { Icon: Shield,       label: "Profile Guard",  desc: "Protect account",  color: "#a855f7" },
];

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="slide-up">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #6d28d9 0%, #ec4899 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 40px rgba(109,40,217,0.5)",
          }}>
            <Zap size={38} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "0.04em", marginBottom: 4 }}>
            RPW BOOSTER
          </h1>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, letterSpacing: "0.06em" }}>
            FACEBOOK MULTI-TOOL SUITE v1.5.1
          </p>
        </div>

        {/* Login card */}
        <div className="lara-card" style={{ padding: 22, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
              FACEBOOK COOKIE
            </p>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{ fontSize: 12, color: "#a855f7", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              {showGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showGuide ? "Hide guide" : "How to get?"}
            </button>
          </div>

          {showGuide && (
            <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: "#c084fc", fontWeight: 600, marginBottom: 8 }}>How to get your Facebook cookie:</p>
              <ol style={{ paddingLeft: 16, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 2.1 }}>
                <li>Open <strong style={{ color: "#fff" }}>Facebook.com</strong> on PC browser</li>
                <li>Press <strong style={{ color: "#fff" }}>F12</strong> → Application → Cookies</li>
                <li>Select <strong style={{ color: "#fff" }}>https://www.facebook.com</strong></li>
                <li>Use <strong style={{ color: "#fff" }}>Cookie-Editor</strong> extension → Export → Header String</li>
              </ol>
              <div style={{ marginTop: 10, padding: "7px 11px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                c_user=123456; xs=abc:xyz:2; datr=xxx; fr=yyy; sb=zzz
              </div>
            </div>
          )}

          <textarea
            className="lara-input"
            rows={5}
            value={cookie}
            onChange={e => { setCookie(e.target.value); setError(""); }}
            placeholder={"Paste your Facebook cookie here...\n\nMust include: c_user + xs"}
            style={{ fontFamily: "monospace", fontSize: 11 }}
          />

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
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", alignSelf: "center", marginLeft: 4 }}>
                {fieldsDetected.length}/5 fields
              </span>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button className="lara-btn lara-btn-primary" style={{ marginTop: 16 }} onClick={handleLogin} disabled={loading}>
            {loading ? (
              <><span className="spin" /> Verifying cookie...</>
            ) : (
              <><LogIn size={16} /> Login with Cookie</>
            )}
          </button>

          <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
            Cookie is saved securely for boosting operations
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {FEATURES.map(({ Icon, label, desc, color }) => (
            <div key={label} className="lara-card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: 11 }}>
          RPW BOOSTER · Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
