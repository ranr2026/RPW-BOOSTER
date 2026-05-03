import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";
import { showToast } from "@/components/Toaster";

interface Props { profile: Profile; onBack: () => void; }

const REACTIONS = [
  { id: "LIKE", emoji: "👍", label: "Like", color: "#3b82f6" },
  { id: "LOVE", emoji: "❤️", label: "Love", color: "#ef4444" },
  { id: "HAHA", emoji: "😂", label: "Haha", color: "#f59e0b" },
  { id: "WOW", emoji: "😮", label: "Wow", color: "#f59e0b" },
  { id: "SAD", emoji: "😢", label: "Sad", color: "#f59e0b" },
  { id: "ANGRY", emoji: "😡", label: "Angry", color: "#ef4444" },
  { id: "CARE", emoji: "🤗", label: "Care", color: "#ec4899" },
];

export default function ReactPage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [reaction, setReaction] = useState("LIKE");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  async function handleReact() {
    if (!postUrl.trim()) { showToast("Enter a post URL", "error"); return; }
    setLoading(true);
    setLogs([]);
    setResult(null);
    try {
      const res = await api.react(profile.cookie, postUrl.trim(), reaction);
      setLogs(res.logs || []);
      setResult(res.message);
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
      <Header title="Auto React" emoji="❤️" onBack={onBack} />

      <div style={{ padding: "20px 20px 0" }}>
        {/* Profile badge */}
        <ProfileBadge profile={profile} />

        {/* Post URL */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--lara-muted)", marginBottom: 8, fontWeight: 600 }}>POST URL</label>
          <input
            className="lara-input"
            value={postUrl}
            onChange={e => setPostUrl(e.target.value)}
            placeholder="https://www.facebook.com/post/..."
          />
        </div>

        {/* Reaction selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--lara-muted)", marginBottom: 10, fontWeight: 600 }}>REACTION TYPE</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {REACTIONS.map(r => (
              <button
                key={r.id}
                onClick={() => setReaction(r.id)}
                style={{
                  padding: "10px 4px",
                  borderRadius: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: reaction === r.id ? `${r.color}25` : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${reaction === r.id ? r.color : "rgba(255,255,255,0.08)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  transform: reaction === r.id ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: reaction === r.id ? r.color : "var(--lara-muted)" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="lara-card" style={{ padding: 14, marginBottom: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: result.toLowerCase().includes("fail") ? "#f87171" : "#4ade80" }}>{result}</span>
          </div>
        )}

        <LogWindow logs={logs} />

        <button
          className="lara-btn lara-btn-primary"
          style={{ marginTop: 20 }}
          onClick={handleReact}
          disabled={loading}
        >
          {loading ? <Spinner /> : <>{REACTIONS.find(r => r.id === reaction)?.emoji} React Now</>}
        </button>
      </div>
    </div>
  );
}

function Header({ title, emoji, onBack }: { title: string; emoji: string; onBack: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "48px 20px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
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
  return (
    <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
  );
}
