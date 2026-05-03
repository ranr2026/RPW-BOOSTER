import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

const REACTIONS = [
  { id: "LIKE",  emoji: "👍", label: "Like",  color: "#3b82f6" },
  { id: "LOVE",  emoji: "❤️", label: "Love",  color: "#ef4444" },
  { id: "HAHA",  emoji: "😂", label: "Haha",  color: "#f59e0b" },
  { id: "WOW",   emoji: "😮", label: "Wow",   color: "#f59e0b" },
  { id: "SAD",   emoji: "😢", label: "Sad",   color: "#60a5fa" },
  { id: "ANGRY", emoji: "😡", label: "Angry", color: "#ef4444" },
  { id: "CARE",  emoji: "🤗", label: "Care",  color: "#ec4899" },
];

type ResultState = { success: boolean; message: string } | null;

export default function ReactPage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [reaction, setReaction] = useState("LIKE");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState>(null);
  const [modal, setModal] = useState<ResultState>(null);

  async function handleReact() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a Facebook post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null);
    try {
      const res = await api.react(profile.cookie, postUrl.trim(), reaction, count);
      setLogs(res.logs || []);
      setResult({ success: res.success, message: res.message });
      setModal({ success: res.success, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setResult({ success: false, message: msg });
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const selectedReaction = REACTIONS.find(r => r.id === reaction)!;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>
      {loading && (
        <div className="loading-overlay">
          <div className="loader" />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Submitting reaction...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{selectedReaction.emoji} {reaction} on post</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{modal.success ? "✅" : "❌"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {modal.success ? "Success!" : "Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            {modal.success && (
              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "left", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 2 }}>
                <div><strong style={{ color: "#fff" }}>Account:</strong> {profile.name}</div>
                <div><strong style={{ color: "#fff" }}>Reaction:</strong> {selectedReaction.emoji} {reaction}</div>
                <div><strong style={{ color: "#fff" }}>Post:</strong> {postUrl.slice(0, 40)}...</div>
              </div>
            )}
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)", width: "100%", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span style={{ fontSize: 22 }}>❤️</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Auto React</h2>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <ProfileMini profile={profile} />

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>POST URL</label>
          <input
            className="lara-input"
            value={postUrl}
            onChange={e => setPostUrl(e.target.value)}
            placeholder="https://www.facebook.com/..."
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 10 }}>REACTION TYPE</label>
          <div style={{ display: "flex", gap: 6 }}>
            {REACTIONS.map(r => (
              <button
                key={r.id}
                className={`reaction-btn${reaction === r.id ? " active" : ""}`}
                onClick={() => setReaction(r.id)}
              >
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: reaction === r.id ? "#c4b5fd" : "rgba(255,255,255,0.3)" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>
            <span>REPEAT COUNT</span>
            <span style={{ color: "#a855f7", fontWeight: 700 }}>{count}×</span>
          </label>
          <input type="range" min={1} max={10} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
            <span>1×</span><span>10×</span>
          </div>
        </div>

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>
            {result.message}
          </div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 18 }} onClick={handleReact} disabled={loading}>
          {loading ? <><span className="spin" /> Reacting...</> : <>{selectedReaction.emoji} React {count > 1 ? `${count}× ` : ""}Now</>}
        </button>
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
