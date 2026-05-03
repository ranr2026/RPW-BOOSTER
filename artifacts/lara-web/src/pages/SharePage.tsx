import { useState } from "react";
import { Share2, ChevronLeft, AlertTriangle } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function SharePage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [modal, setModal] = useState<{ success: boolean; message: string; shared?: number } | null>(null);

  async function handleShare() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null);
    try {
      const res = await api.share(profile.cookie, postUrl.trim(), count);
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message, shared: res.count };
      setResult(r); setModal(r);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>
      {loading && (
        <div className="loading-overlay">
          <div className="loader" />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Sharing post...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{count}× shares in progress</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)" }}>
              <Share2 size={28} color={modal.success ? "#60a5fa" : "#f87171"} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? "Share Complete!" : "Share Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Share2 size={20} color="#3b82f6" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Spam Share</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Multi-Share Tool</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <ProfileMini profile={profile} />

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 8 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 10 }}>
            <span>SHARE COUNT</span>
            <span style={{ color: "#60a5fa", fontWeight: 800 }}>{count}×</span>
          </label>
          <input type="range" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            <span>1×</span><span>20×</span>
          </div>
        </div>

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{ marginTop: 16, background: "linear-gradient(135deg,#2563eb,#6366f1)" }} onClick={handleShare} disabled={loading}>
          {loading ? <><span className="spin" /> Sharing...</> : <><Share2 size={16} /> Share {count} Times</>}
        </button>

        <div className="lara-card" style={{ marginTop: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            Spam sharing may trigger Facebook's anti-spam system. Use with care on secondary accounts only.
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
