import { useState } from "react";
import { Zap, ThumbsUp, Share2, MessageSquare, Shield, LogIn, ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { api, type FbProfile } from "@/lib/api";

interface Props { onLogin: (profile: FbProfile, cookie: string) => void; }

const FIELDS = ["c_user", "xs", "datr", "fr", "sb"];

const FEATURES = [
  { Icon: ThumbsUp,      label: "Auto React",    desc: "7 reaction types · 20 accounts",  color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { Icon: Share2,        label: "Spam Share",     desc: "Multi shares · Up to 20×",        color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { Icon: MessageSquare, label: "Mass Comment",   desc: "Bulk comments · Max 10 each",     color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  { Icon: Shield,        label: "Profile Guard",  desc: "Photo protection · Auto-enable",  color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  { Icon: KeyRound,      label: "Access Token",   desc: "EAAG extractor · All sessions",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
];

export default function LoginPage({ onLogin }: Props) {
  const [cookie,     setCookie]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [showGuide,  setShowGuide]  = useState(false);

  async function handleLogin() {
    const c = cookie.trim();
    if (!c) { setError("Paste your Facebook cookie first"); return; }
    if (!c.includes("c_user") || !c.includes("xs")) {
      setError("Cookie must include c_user and xs fields"); return;
    }
    setError(""); setLoading(true);
    try {
      const profile = await api.login(c);
      if (!profile.uid) { setError("Could not extract UID — paste the full cookie from facebook.com"); return; }
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
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24, margin: "0 auto",
              background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #ec4899 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 48px rgba(109,40,217,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
            }}>
              <Zap size={42} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{
              position: "absolute", inset: -12, borderRadius: 36,
              background: "radial-gradient(ellipse at center, rgba(109,40,217,0.25) 0%, transparent 70%)",
              zIndex: -1,
            }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "0.06em", marginBottom: 4 }}>
            RPW BOOSTER
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 20, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <span style={{ fontSize: 10, color: "#c084fc", fontWeight: 700, letterSpacing: "0.1em" }}>FACEBOOK MULTI-TOOL SUITE v1.5.1</span>
          </div>
        </div>

        {/* Login card */}
        <div className="lara-card" style={{ padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
              FACEBOOK COOKIE
            </p>
            <button onClick={() => setShowGuide(g => !g)} style={{ fontSize: 11, color: "#a855f7", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
              {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showGuide ? "Hide guide" : "How to get?"}
            </button>
          </div>

          {showGuide && (
            <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: "#c084fc", fontWeight: 700, marginBottom: 8 }}>Get your Facebook cookie:</p>
              <ol style={{ paddingLeft: 16, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 2.2 }}>
                <li>Open <strong style={{ color: "#fff" }}>Facebook.com</strong> on PC browser (Chrome)</li>
                <li>Press <strong style={{ color: "#fff" }}>F12</strong> → Application → Cookies</li>
                <li>Select <strong style={{ color: "#fff" }}>https://www.facebook.com</strong></li>
                <li>Install <strong style={{ color: "#fff" }}>Cookie-Editor</strong> extension → Export → Header String</li>
              </ol>
              <div style={{ marginTop: 10, padding: "7px 11px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
                c_user=123456; xs=abc:xyz:2; datr=xxx; fr=yyy; sb=zzz
              </div>
            </div>
          )}

          <textarea className="lara-input" rows={5} value={cookie}
            onChange={e => { setCookie(e.target.value); setError(""); }}
            placeholder={"Paste your Facebook cookie here...\n\nRequired: c_user + xs"}
            style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.7 }} />

          {/* Field badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {FIELDS.map(f => {
              const found = cookie.includes(f);
              return (
                <span key={f} className={`field-badge ${found ? "found" : "miss"}`}>
                  {found ? "✓" : "·"} {f}
                </span>
              );
            })}
            {fieldsDetected.length > 0 && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", alignSelf: "center", marginLeft: 3 }}>
                {fieldsDetected.length}/{FIELDS.length} fields
              </span>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontSize: 12, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button className="lara-btn lara-btn-primary" style={{ marginTop: 14, boxShadow: loading ? "none" : "0 8px 30px rgba(124,58,237,0.35)" }} onClick={handleLogin} disabled={loading}>
            {loading
              ? <><span className="spin" /> Verifying cookie...</>
              : <><LogIn size={16} /> Login with Cookie</>
            }
          </button>

          <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
            Cookie is used locally for boosting operations · No data shared externally
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {FEATURES.map(({ Icon, label, desc, color, bg }) => (
            <div key={label} className="lara-card" style={{ padding: 13, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={17} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1, lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div className="lara-card" style={{ padding: 13, display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={17} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a855f7" }}>Bulk Boost</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1, lineHeight: 1.4 }}>20 accounts · 10-min cooldown</div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.08)", fontSize: 10, letterSpacing: "0.06em" }}>
          RPW BOOSTER · Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
