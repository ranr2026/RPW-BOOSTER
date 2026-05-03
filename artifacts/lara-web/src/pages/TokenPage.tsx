import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function TokenPage({ profile, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<{ success: boolean; message: string } | null>(null);

  async function handleGetToken() {
    setLoading(true); setToken(null); setLogs([]); setModal(null);
    try {
      const res = await api.token(profile.cookie);
      setLogs(res.logs || []);
      if (res.token) {
        setToken(res.token);
        setUid(res.uid);
        setModal({ success: true, message: "Access token extracted successfully! Keep it secret — it gives full account access." });
      } else {
        setModal({ success: false, message: "Could not extract token. The account may have a checkpoint or cookie may have expired." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs(prev => [...prev, `[FAIL] ${msg}`]);
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>
      {loading && (
        <div className="loading-overlay">
          <div className="loader" />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Extracting token...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>🔑 Scanning Facebook session</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{modal.success ? "🔑" : "❌"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {modal.success ? "Token Extracted!" : "Extraction Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span style={{ fontSize: 22 }}>🔑</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Access Token</h2>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Info card */}
        <div className="lara-card" style={{ padding: 20, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Extract EAAG Access Token</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
            Extracts your Facebook EAAG access token from the active session.
            Required for Graph API calls and some automation tools.
          </p>
        </div>

        {/* Token display */}
        {token && (
          <div className="lara-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>ACCESS TOKEN</span>
              <button
                onClick={copyToken}
                style={{
                  background: copied ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.15)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.3)"}`,
                  color: copied ? "#4ade80" : "#c084fc",
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
            <div style={{
              background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "10px 12px",
              fontFamily: "monospace", fontSize: 10, color: "#a855f7",
              wordBreak: "break-all", lineHeight: 1.8, maxHeight: 100, overflow: "auto",
            }}>
              {token}
            </div>
            {uid && (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                UID: <span style={{ color: "#fff", fontWeight: 600 }}>{uid}</span>
              </div>
            )}
          </div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 16 }} onClick={handleGetToken} disabled={loading}>
          {loading ? <><span className="spin" /> Extracting...</> : <>🔑 Get Access Token</>}
        </button>

        <div className="lara-card" style={{ marginTop: 14, padding: 14 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            🔒 Keep your token secret. It grants full access to your Facebook account and never share it with untrusted sites.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileMini({ profile }: { profile: Profile }) {
  return (
    <div className="profile-mini">
      <img src={profile.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff`; }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>UID: {profile.uid}</div>
      </div>
      <span className="dot dot-green dot-pulse" />
    </div>
  );
}
