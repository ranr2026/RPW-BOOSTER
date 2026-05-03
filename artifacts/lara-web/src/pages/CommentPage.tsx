import { useState } from "react";
import { MessageSquare, ChevronLeft, AlertTriangle, Users } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; accountCount: number; }

const DEFAULT_COMMENTS = [
  "Grabe! 😍", "So cute! 💯", "Love this! ❤️", "Sana all 😂",
  "Ikaw na! 🔥", "Nice one! 👌", "Lodi! 🙌", "Wow amazing!",
].join("\n");

export default function CommentPage({ profile, onBack, accountCount }: Props) {
  const [postUrl,      setPostUrl]      = useState("");
  const [commentText,  setCommentText]  = useState(DEFAULT_COMMENTS);
  const [repeatEach,   setRepeatEach]   = useState(2);
  const [useAll,       setUseAll]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [logs,         setLogs]         = useState<string[]>([]);
  const [result,       setResult]       = useState<{ success: boolean; message: string } | null>(null);
  const [modal,        setModal]        = useState<{ success: boolean; message: string } | null>(null);

  const commentList = commentText.split("\n").map(s => s.trim()).filter(Boolean);
  const totalComments = commentList.length * repeatEach;

  async function handleComment() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a post URL" }); return; }
    if (!commentList.length) { setResult({ success: false, message: "Add at least one comment" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null);
    try {
      let res;
      if (useAll && accountCount > 0) {
        res = await api.commentAll(postUrl.trim(), commentList, totalComments);
      } else {
        res = await api.comment(profile.cookie, postUrl.trim(), commentList, totalComments);
      }
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message };
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
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Posting comments...</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              {commentList.length} texts × {repeatEach} repeats = {totalComments} total
            </p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}>
              <MessageSquare size={28} color={modal.success ? "#4ade80" : "#f87171"} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? "Comments Posted!" : "Comment Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <MessageSquare size={20} color="#22c55e" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Mass Comment</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Bulk Comment Booster</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Boost All mode */}
        {accountCount > 0 && (
          <div className="boost-banner">
            <Users size={15} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Comment with all {accountCount} accounts</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>All saved accounts will comment on the post</div>
            </div>
            <button
              onClick={() => setUseAll(!useAll)}
              style={{ width: 46, height: 26, borderRadius: 13, flexShrink: 0, background: useAll ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "all 0.25s" }}
            >
              <div style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", left: useAll ? 23 : 3, transition: "left 0.25s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
            </button>
          </div>
        )}

        {/* Post URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 8 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        {/* Comments textarea */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 8 }}>
            <span>COMMENT TEXTS (one per line)</span>
            <span style={{ color: "#a855f7" }}>{commentList.length} text{commentList.length !== 1 ? "s" : ""}</span>
          </label>
          <textarea
            className="lara-input"
            rows={6}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Enter comments, one per line..."
          />
        </div>

        {/* Repeat each count */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em", marginBottom: 10 }}>
            <span>REPEAT EACH TEXT</span>
            <span style={{ color: "#a855f7", fontWeight: 800 }}>{repeatEach}×</span>
          </label>
          <input type="range" min={1} max={10} value={repeatEach} onChange={e => setRepeatEach(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            <span>1×</span><span>10×</span>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { label: "Texts", value: commentList.length },
            { label: "Repeats", value: `${repeatEach}×` },
            { label: "Total", value: totalComments },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#c4b5fd" }}>{value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 16 }} onClick={handleComment} disabled={loading}>
          {loading
            ? <><span className="spin" /> Commenting...</>
            : <><MessageSquare size={16} /> {useAll ? `Comment with ${accountCount} Accounts` : `Post ${totalComments} Comment${totalComments !== 1 ? "s" : ""}`}</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            Mass commenting may trigger spam detection. Use with fresh cookies for best results.
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
