import { useState } from "react";
import { ThumbsUp, ChevronLeft, AlertTriangle, Users } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; accountCount: number; }

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

type Res = { success: boolean; message: string; count?: number; total?: number; succeeded?: number } | null;

export default function ReactPage({ profile, onBack, accountCount }: Props) {
  const [postUrl,    setPostUrl]    = useState("");
  const [reaction,   setReaction]   = useState("LIKE");
  const [count,      setCount]      = useState(1);
  const [useAll,     setUseAll]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [logs,       setLogs]       = useState<string[]>([]);
  const [result,     setResult]     = useState<Res>(null);
  const [modal,      setModal]      = useState<Res>(null);
  const [progress,   setProgress]   = useState(0);

  async function handleReact() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a Facebook post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null); setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 10, 90));
    }, 700);

    try {
      let res;
      if (useAll && accountCount > 0) {
        res = await api.reactAll(postUrl.trim(), reaction);
      } else {
        res = await api.react(profile.cookie, postUrl.trim(), reaction, count);
      }
      clearInterval(interval);
      setProgress(100);
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message, count: res.count, total: res.total, succeeded: res.succeeded };
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
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              {rxn.emoji}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Boosting Reaction...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              {rxn.emoji} {reaction} {useAll ? `· ${accountCount} accounts` : `· ${count} attempt${count > 1 ? "s" : ""}`}
            </p>
            <p style={{ fontSize: 12, color: "#8b5cf6", marginTop: 4 }}>{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{modal.success ? rxn.emoji : "❌"}</div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? "Reaction Boosted!" : "Boost Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.7 }}>
              {modal.message}
            </p>
            {modal.success && modal.total && (
              <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "left", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 2 }}>
                <div><strong style={{ color: "#fff" }}>Reaction:</strong> {rxn.emoji} {reaction}</div>
                <div><strong style={{ color: "#fff" }}>Accounts:</strong> {modal.succeeded}/{modal.total} succeeded</div>
              </div>
            )}
            {!modal.success && (
              <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, textAlign: "left" }}>
                <strong style={{ color: "#fbbf24" }}>Tip:</strong> Resolve any Facebook security alerts at facebook.com, then re-export a fresh cookie.
              </div>
            )}
            <button className="lara-btn" onClick={() => setModal(null)} style={{
              background: modal.success ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "linear-gradient(135deg,#ef4444,#dc2626)",
              padding: "12px",
            }}>OK</button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <ThumbsUp size={20} color="#ef4444" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Auto React</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Reaction Booster</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Boost All mode */}
        {accountCount > 0 && (
          <div className="boost-banner">
            <Users size={15} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Boost with all {accountCount} saved accounts</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>All active accounts will react to the post</div>
            </div>
            <button
              onClick={() => setUseAll(!useAll)}
              style={{
                width: 46, height: 26, borderRadius: 13, flexShrink: 0,
                background: useAll ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer", position: "relative", transition: "all 0.25s",
              }}
            >
              <div style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", left: useAll ? 23 : 3, transition: "left 0.25s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
            </button>
          </div>
        )}

        {/* Post URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 8 }}>POST / VIDEO URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        {/* Reaction type */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 10 }}>REACTION TYPE</label>
          <div style={{ display: "flex", gap: 5 }}>
            {REACTIONS.map(r => (
              <button
                key={r.id}
                className={`reaction-btn${reaction === r.id ? " active" : ""}`}
                onClick={() => setReaction(r.id)}
                style={{ borderColor: reaction === r.id ? r.color : undefined, background: reaction === r.id ? `${r.color}18` : undefined }}
              >
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: reaction === r.id ? r.color : "rgba(255,255,255,0.28)" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count — only shown if not using all accounts */}
        {!useAll && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 10 }}>
              <span>BOOST COUNT</span>
              <span style={{ color: rxn.color, fontWeight: 800, fontSize: 14 }}>{count}×</span>
            </label>
            <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => setCount(p)} style={{
                  flex: 1, padding: "7px 4px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${count === p ? "#8b5cf6" : "rgba(255,255,255,0.08)"}`,
                  background: count === p ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                  color: count === p ? "#c4b5fd" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.15s",
                }}>{p}×</button>
              ))}
            </div>
            <input type="range" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
              <span>1×</span><span>50×</span>
            </div>
          </div>
        )}

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 16, fontSize: 15, padding: "15px" }} onClick={handleReact} disabled={loading}>
          {loading
            ? <><span className="spin" /> Boosting...</>
            : <><ThumbsUp size={16} /> {useAll ? `Boost with ${accountCount} Accounts` : `Boost ${reaction}${count > 1 ? ` × ${count}` : ""}`}</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            High counts may trigger Facebook's anti-spam system. Use on secondary accounts or with fresh cookies for best results.
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
