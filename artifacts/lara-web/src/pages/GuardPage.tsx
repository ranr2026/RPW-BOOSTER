import { useState } from "react";
import { Shield, ShieldOff, ChevronLeft, Camera, Eye, CheckCircle, XCircle } from "lucide-react";
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
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Connecting to Facebook</p>
          </div>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(168,85,247,0.15)" : "rgba(239,68,68,0.15)" }}>
              {modal.success
                ? <Shield size={28} color="#a855f7" />
                : <XCircle size={28} color="#f87171" />
              }
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? (guardOn ? "Guard Enabled!" : "Guard Disabled!") : "Guard Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Shield size={20} color="#a855f7" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Profile Guard</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Photo Protection</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <ProfileMini profile={profile} />

        {/* Guard toggle card */}
        <div className="lara-card" style={{ padding: 28, marginBottom: 18, textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
            background: guardOn ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.06)",
            border: `2px solid ${guardOn ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.1)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: guardOn ? "0 0 30px rgba(168,85,247,0.25)" : "none",
            transition: "all 0.3s",
          }}>
            {guardOn
              ? <Shield size={34} color="#a855f7" />
              : <ShieldOff size={34} color="rgba(255,255,255,0.3)" />
            }
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Profile Guard <span style={{ color: guardOn ? "#a855f7" : "rgba(255,255,255,0.3)" }}>{guardOn ? "ON" : "OFF"}</span>
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", marginBottom: 24, lineHeight: 1.6 }}>
            {guardOn
              ? "Your profile photo will be protected from downloading and sharing"
              : "Profile photo protection will be disabled"}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: guardOn ? "rgba(255,255,255,0.3)" : "#fff" }}>Off</span>
            <button
              onClick={() => setGuardOn(!guardOn)}
              style={{
                width: 62, height: 32, borderRadius: 16, flexShrink: 0,
                background: guardOn ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "all 0.25s", boxShadow: guardOn ? "0 4px 15px rgba(124,58,237,0.4)" : "none",
              }}
            >
              <div style={{
                position: "absolute", top: 4, width: 24, height: 24, borderRadius: "50%",
                background: "#fff", left: guardOn ? 34 : 4,
                transition: "left 0.25s", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: guardOn ? "#c084fc" : "rgba(255,255,255,0.3)" }}>On</span>
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[
            { Icon: Camera,      label: "Blocks photo download", color: "#a855f7" },
            { Icon: Shield,      label: "Prevents screenshot sharing", color: "#6366f1" },
            { Icon: Eye,         label: "Controls visibility", color: "#3b82f6" },
            { Icon: CheckCircle, label: "Facebook official feature", color: "#22c55e" },
          ].map(({ Icon, label, color }) => (
            <div key={label} className="lara-card" style={{ padding: 13, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={18} color={color} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{label}</span>
            </div>
          ))}
        </div>

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{ marginTop: 16, background: guardOn ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#374151,#4b5563)" }} onClick={handleGuard} disabled={loading}>
          {loading
            ? <><span className="spin" /> Processing...</>
            : guardOn
              ? <><Shield size={16} /> Enable Guard</>
              : <><ShieldOff size={16} /> Disable Guard</>
          }
        </button>
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
