import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

const DEFAULT_COMMENTS = [
  "🔥🔥🔥", "❤️❤️❤️", "Wow amazing!", "So cute! 😍",
  "Love this! 💯", "Grabe! 😍", "Sana all 😂", "Ikaw na! 💯",
  "Nice one! 👌", "Lodi! 🙌",
].join("\n");

export default function CommentPage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [commentText, setCommentText] = useState(DEFAULT_COMMENTS);
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [modal, setModal] = useState<{ success: boolean; message: string } | null>(null);

  const commentList = commentText.split("\n").map(s => s.trim()).filter(Boolean);

  async function handleComment() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a post URL" }); return; }
    if (!commentList.length) { setResult({ success: false, message: "Add at least one comment" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null);
    try {
      const res = await api.comment(profile.cookie, postUrl.trim(), commentList, count);
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
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>💬 {count} comments × {commentList.length} template(s)</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{modal.success ? "✅" : "❌"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
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
        <button className="back-btn" onClick={onBack}>‹</button>
        <span style={{ fontSize: 22 }}>💬</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Mass Comment</h2>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <ProfileMini profile={profile} />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>
            <span>COMMENTS (one per line)</span>
            <span style={{ color: "#a855f7" }}>{commentList.length} comment{commentList.length !== 1 ? "s" : ""}</span>
          </label>
          <textarea
            className="lara-input"
            rows={6}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Enter comments, one per line..."
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>
            <span>REPEAT COUNT</span>
            <span style={{ color: "#a855f7", fontWeight: 700 }}>{count}×</span>
          </label>
          <input type="range" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
            <span>1×</span><span>20×</span>
          </div>
        </div>

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 18 }} onClick={handleComment} disabled={loading}>
          {loading ? <><span className="spin" /> Commenting...</> : <>💬 Comment {count} Times</>}
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
