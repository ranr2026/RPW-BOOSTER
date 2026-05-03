import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toaster";

interface Props { profile: Profile; onBack: () => void; }

export default function TokenPage({ profile, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGetToken() {
    setLoading(true);
    setToken(null);
    try {
      const res = await api.token(profile.cookie);
      setToken(res.token);
      setUid(res.uid);
      showToast("Access token extracted!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    showToast("Token copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 32px" }}>
      <Header title="Access Token" emoji="🔑" onBack={onBack} />
      <div style={{ padding: "20px 20px 0" }}>
        <ProfileBadge profile={profile} />

        <div className="lara-card" style={{ padding: 20, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Extract Access Token</h3>
          <p style={{ fontSize: 13, color: "var(--lara-muted)", lineHeight: 1.6 }}>
            Get your Facebook access token from your active session. This can be used with the Graph API.
          </p>
        </div>

        {token && (
          <div className="lara-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--lara-muted)" }}>ACCESS TOKEN</span>
              <button onClick={copyToken} style={{
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.15)",
                border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.3)"}`,
                color: copied ? "#4ade80" : "#c084fc",
                padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div style={{
              background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px",
              fontFamily: "monospace", fontSize: 11, color: "#a855f7",
              wordBreak: "break-all", lineHeight: 1.6, maxHeight: 120, overflow: "auto",
            }}>
              {token}
            </div>
            {uid && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--lara-muted)" }}>
                UID: <span style={{ color: "#fff" }}>{uid}</span>
              </div>
            )}
          </div>
        )}

        <button className="lara-btn lara-btn-primary" onClick={handleGetToken} disabled={loading}>
          {loading ? <Spinner /> : <>🔑 Get Access Token</>}
        </button>

        <div className="lara-card" style={{ marginTop: 16, padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--lara-muted)", lineHeight: 1.6 }}>
            ℹ️ The access token is extracted from your active Facebook session. Keep it secret — anyone with your token can access your account.
          </p>
        </div>
      </div>
    </div>
  );
}

function Header({ title, emoji, onBack }: { title: string; emoji: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "48px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 10, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>‹</button>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{title}</h2>
    </div>
  );
}

function ProfileBadge({ profile }: { profile: Profile }) {
  return (
    <div className="lara-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 20 }}>
      <img src={profile.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff`; }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{profile.name}</div>
        <div style={{ fontSize: 11, color: "var(--lara-muted)" }}>UID: {profile.uid}</div>
      </div>
      <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
    </div>
  );
}

function Spinner() {
  return <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />;
}
