import { useState } from "react";
import { KeyRound, ChevronLeft, Copy, Check, Lock } from "lucide-react";
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
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Scanning Facebook session</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)" }}>
              <KeyRound size={28} color={modal.success ? "#fbbf24" : "#f87171"} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? "Token Extracted!" : "Extraction Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#d97706,#b45309)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <KeyRound size={20} color="#f59e0b" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Access Token</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>EAAG Token Extractor</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <ProfileMini profile={profile} />

        <div className="lara-card" style={{ padding: 20, marginBottom: 18, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <KeyRound size={26} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Extract EAAG Access Token</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>
            Extracts your Facebook EAAG access token from the active session. Required for Graph API calls and automation tools.
          </p>
        </div>

        {token && (
          <div className="lara-card" style={{ padding: 16, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em" }}>ACCESS TOKEN</span>
              <button
                onClick={copyToken}
                style={{
                  background: copied ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.15)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.3)"}`,
                  color: copied ? "#4ade80" : "#c084fc",
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 10, color: "#f59e0b", wordBreak: "break-all", lineHeight: 1.8, maxHeight: 100, overflow: "auto" }}>
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

        <button className="lara-btn" style={{ marginTop: 16, background: "linear-gradient(135deg,#d97706,#f59e0b)" }} onClick={handleGetToken} disabled={loading}>
          {loading ? <><span className="spin" /> Extracting...</> : <><KeyRound size={16} /> Get Access Token</>}
        </button>

        <div className="lara-card" style={{ marginTop: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Lock size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            Keep your token secret. It grants full access to your Facebook account — never share it with untrusted sites.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileMini({ profile }: { profile: Profile }) {
  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;
  return (
    <div className="profile-mini">
      <img src={profile.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`; }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{displayName}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>UID: {profile.uid}</div>
      </div>
      <span className="dot dot-green dot-pulse" />
    </div>
  );
}
