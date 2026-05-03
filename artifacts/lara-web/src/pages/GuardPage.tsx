import { useState } from "react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function GuardPage({ profile, onBack }: Props) {
  const [guardOn, setGuardOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ success: boolean; message: string } | null>(null);

  async function handleGuard() {
    setLoading(true); setLogs([]); setModal(null);
    try {
      const res = await api.guard(profile.cookie, guardOn);
      setLogs(res.logs || []);
      setModal({ success: res.success, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setModal({ success: false, message: msg });
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
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
              {guardOn ? "Enabling profile guard..." : "Disabling profile guard..."}
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>🛡️ Connecting to Facebook</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{modal.success ? "🛡️" : "❌"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {modal.success ? (guardOn ? "Guard Enabled!" : "Guard Disabled!") : "Guard Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span style={{ fontSize: 22 }}>🛡️</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Profile Guard</h2>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Guard toggle card */}
        <div className="lara-card" style={{ padding: 28, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16, filter: guardOn ? "drop-shadow(0 0 20px rgba(168,85,247,0.5))" : "none", transition: "filter 0.3s" }}>
            {guardOn ? "🛡️" : "🔓"}
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Profile Guard <span style={{ color: guardOn ? "#a855f7" : "rgba(255,255,255,0.4)" }}>{guardOn ? "ON" : "OFF"}</span>
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24, lineHeight: 1.6 }}>
            {guardOn
              ? "Your profile photo will be protected from downloading and sharing"
              : "Profile photo protection will be disabled"}
          </p>

          {/* Toggle switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: guardOn ? "rgba(255,255,255,0.35)" : "#fff" }}>Off</span>
            <button
              onClick={() => setGuardOn(!guardOn)}
              style={{
                width: 64, height: 34, borderRadius: 17,
                background: guardOn ? "linear-gradient(135deg, #8b5cf6, #ec4899)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "all 0.25s", boxShadow: guardOn ? "0 4px 15px rgba(139,92,246,0.4)" : "none",
              }}
            >
              <div style={{
                position: "absolute", top: 5, width: 24, height: 24, borderRadius: "50%",
                background: "#fff",
                left: guardOn ? 35 : 5,
                transition: "left 0.25s",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: guardOn ? "#c084fc" : "rgba(255,255,255,0.35)" }}>On</span>
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "📸", label: "Blocks photo download" },
            { icon: "🚫", label: "Prevents screenshot sharing" },
            { icon: "👁️", label: "Controls visibility" },
            { icon: "✅", label: "Facebook official feature" },
          ].map((item, i) => (
            <div key={i} className="lara-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 16 }} onClick={handleGuard} disabled={loading}>
          {loading ? <><span className="spin" /> Processing...</> : <>{guardOn ? "🛡️ Enable Guard" : "🔓 Disable Guard"}</>}
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
