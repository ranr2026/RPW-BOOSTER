import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";
import { showToast } from "@/components/Toaster";

interface Props { profile: Profile; onBack: () => void; }

export default function GuardPage({ profile, onBack }: Props) {
  const [guardOn, setGuardOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleGuard() {
    setLoading(true);
    setLogs([]);
    setResult(null);
    try {
      const res = await api.guard(profile.cookie, guardOn);
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
      <Header title="Profile Guard" emoji="🛡️" onBack={onBack} />
      <div style={{ padding: "20px 20px 0" }}>
        <ProfileBadge profile={profile} />

        {/* Guard status card */}
        <div className="lara-card" style={{ padding: 24, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{guardOn ? "🛡️" : "🔓"}</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            Profile Guard {guardOn ? "ON" : "OFF"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--lara-muted)", marginBottom: 20 }}>
            {guardOn
              ? "Your profile photo will be protected from being downloaded or shared"
              : "Your profile photo protection will be disabled"}
          </p>

          {/* Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: guardOn ? "var(--lara-muted)" : "#fff", fontWeight: guardOn ? 400 : 600 }}>Off</span>
            <button
              onClick={() => setGuardOn(!guardOn)}
              style={{
                width: 60, height: 30, borderRadius: 15,
                background: guardOn ? "linear-gradient(135deg, #7c3aed, #db2777)" : "rgba(255,255,255,0.12)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "all 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 3, width: 24, height: 24, borderRadius: "50%",
                background: "#fff",
                left: guardOn ? 33 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </button>
            <span style={{ fontSize: 13, color: guardOn ? "#c084fc" : "var(--lara-muted)", fontWeight: guardOn ? 600 : 400 }}>On</span>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { icon: "📸", text: "Blocks profile photo download" },
            { icon: "🚫", text: "Prevents screenshot sharing" },
            { icon: "👁️", text: "Controls who can see it" },
            { icon: "✅", text: "Facebook official feature" },
          ].map((item, i) => (
            <div key={i} className="lara-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: "var(--lara-muted)", lineHeight: 1.4 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {result && (
          <div className="lara-card" style={{ padding: 14, marginBottom: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: result.success ? "#4ade80" : "#f87171" }}>{result.message}</span>
          </div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 20 }} onClick={handleGuard} disabled={loading}>
          {loading ? <Spinner /> : <>{guardOn ? "🛡️ Enable Guard" : "🔓 Disable Guard"}</>}
        </button>
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

function Spinner() {
  return <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />;
}
