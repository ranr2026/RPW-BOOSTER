import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";
import { showToast } from "@/components/Toaster";

interface Props { profile: Profile; onBack: () => void; }

export default function SharePage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleShare() {
    if (!postUrl.trim()) { showToast("Enter a post URL", "error"); return; }
    setLoading(true);
    setLogs([]);
    setResult(null);
    try {
      const res = await api.share(profile.cookie, postUrl.trim(), count);
      setLogs(res.logs || []);
      setResult({ success: res.success, message: res.message });
      showToast(res.message, res.success ? "success" : "error");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, "error");
      setLogs([`[FAIL] ${msg}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 32px" }}>
      <Header title="Spam Share" emoji="📤" onBack={onBack} />
      <div style={{ padding: "20px 20px 0" }}>
        <ProfileBadge profile={profile} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--lara-muted)", marginBottom: 8, fontWeight: 600 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/post/..." />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--lara-muted)", marginBottom: 8, fontWeight: 600 }}>
            <span>SHARE COUNT</span>
            <span style={{ color: "#a855f7", fontWeight: 700 }}>{count}x</span>
          </label>
          <input type="range" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7c3aed" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            <span>1</span><span>20</span>
          </div>
        </div>

        {result && (
          <div className="lara-card" style={{ padding: 14, marginBottom: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: result.success ? "#4ade80" : "#f87171" }}>{result.message}</span>
          </div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 20 }} onClick={handleShare} disabled={loading}>
          {loading ? <Spinner text={`Sharing... (${count}x)`} /> : <>📤 Share {count} Times</>}
        </button>

        <div className="lara-card" style={{ marginTop: 16, padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--lara-muted)", lineHeight: 1.6 }}>
            ⚠️ Spam sharing may trigger Facebook's anti-spam system. Use with care on secondary accounts.
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

function Spinner({ text }: { text?: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
      {text || "Processing..."}
    </span>
  );
}
