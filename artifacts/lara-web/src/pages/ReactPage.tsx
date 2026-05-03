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

const PRESETS = [1, 5, 10, 25, 50];

type Res = { success: boolean; message: string; count?: number } | null;

export default function ReactPage({ profile, onBack }: Props) {
  const [postUrl,  setPostUrl]  = useState("");
  const [reaction, setReaction] = useState("LIKE");
  const [count,    setCount]    = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [logs,     setLogs]     = useState<string[]>([]);
  const [result,   setResult]   = useState<Res>(null);
  const [modal,    setModal]    = useState<Res>(null);
  const [progress, setProgress] = useState(0);

  async function handleReact() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a Facebook post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null); setProgress(0);

    // Fake incremental progress while waiting
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 12, 92));
    }, 600);

    try {
      const res = await api.react(profile.cookie, postUrl.trim(), reaction, count);
      clearInterval(interval);
      setProgress(100);
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message, count: res.count };
      setResult(r);
      setModal(r);
    } catch (err: unknown) {
      clearInterval(interval);
      setProgress(0);
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const rxn = REACTIONS.find(r => r.id === reaction)!;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 80, height: 80, marginBottom: 8 }}>
            <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", width: 80, height: 80 }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke="url(#pg)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              {rxn.emoji}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Boosting Reaction...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
              {rxn.emoji} {reaction} · {count} attempt{count > 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: 12, color: "#8b5cf6", marginTop: 4 }}>{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}

      {/* Result modal */}
      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>{modal.success ? rxn.emoji : "❌"}</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? "Reaction Boosted!" : "Boost Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.7 }}>
              {modal.message}
            </p>
            {modal.success && (
              <div style={{
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "left", fontSize: 12,
                color: "rgba(255,255,255,0.6)", lineHeight: 2,
              }}>
                <div><strong style={{ color: "#fff" }}>Reaction:</strong> {rxn.emoji} {reaction}</div>
                <div><strong style={{ color: "#fff" }}>Attempts:</strong> {modal.count ?? count}</div>
                <div><strong style={{ color: "#fff" }}>Account:</strong> {profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name}</div>
              </div>
            )}
            {!modal.success && (
              <div style={{
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12,
                color: "rgba(255,255,255,0.5)", lineHeight: 1.8, textAlign: "left",
              }}>
                💡 <strong style={{ color: "#fbbf24" }}>Tip:</strong> If you see "checkpoint" errors, log in to facebook.com in your browser, resolve any security alerts, then re-export a fresh cookie.
              </div>
            )}
            <button className="lara-btn" onClick={() => setModal(null)} style={{
              background: modal.success
                ? "linear-gradient(135deg,#8b5cf6,#ec4899)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              padding: "12px",
            }}>OK</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="tool-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span style={{ fontSize: 22 }}>❤️</span>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Auto React</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Reaction Booster</p>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Post URL */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>
            POST / VIDEO URL
          </label>
          <input
            className="lara-input"
            value={postUrl}
            onChange={e => setPostUrl(e.target.value)}
            placeholder="https://www.facebook.com/..."
          />
          {postUrl && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5, fontFamily: "monospace" }}>
              ID: {extractPostId(postUrl) || "—"}
            </p>
          )}
        </div>

        {/* Reaction type */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 10 }}>
            REACTION TYPE
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {REACTIONS.map(r => (
              <button
                key={r.id}
                className={`reaction-btn${reaction === r.id ? " active" : ""}`}
                onClick={() => setReaction(r.id)}
                style={{ borderColor: reaction === r.id ? r.color : undefined, background: reaction === r.id ? `${r.color}18` : undefined }}
              >
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: reaction === r.id ? r.color : "rgba(255,255,255,0.3)" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count — presets + manual slider */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 10 }}>
            <span>BOOST COUNT</span>
            <span style={{ color: rxn.color, fontWeight: 800, fontSize: 14 }}>{count}×</span>
          </label>

          {/* Quick presets */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setCount(p)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${count === p ? "#8b5cf6" : "rgba(255,255,255,0.08)"}`,
                  background: count === p ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                  color: count === p ? "#c4b5fd" : "rgba(255,255,255,0.45)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >{p}×</button>
            ))}
          </div>

          {/* Manual slider */}
          <input type="range" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            <span>1×</span><span>50×</span>
          </div>
        </div>

        {/* Result strip */}
        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>
            {result.message}
          </div>
        )}

        <LogWindow logs={logs} />

        {/* Boost button */}
        <button
          className="lara-btn lara-btn-primary"
          style={{ marginTop: 18, fontSize: 16, padding: "16px" }}
          onClick={handleReact}
          disabled={loading}
        >
          {loading
            ? <><span className="spin" /> Boosting...</>
            : <>{rxn.emoji} Boost {reaction} {count > 1 ? `× ${count}` : ""}</>
          }
        </button>

        {/* Warning */}
        <div className="lara-card" style={{ marginTop: 14, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            High counts may trigger Facebook's anti-spam system. Use on secondary accounts or with fresh cookies for best results.
          </p>
        </div>
      </div>
    </div>
  );
}

function extractPostId(url: string): string {
  const pats = [/\/posts\/(\d+)/, /story_fbid=(\d+)/, /fbid=(\d+)/, /\/(\d{10,})/];
  for (const p of pats) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return "";
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
