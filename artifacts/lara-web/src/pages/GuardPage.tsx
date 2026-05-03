import { useState } from "react";
import { Shield, ShieldOff, ChevronLeft, Lock, Eye, AlertCircle, CheckCircle2, XCircle, Camera, Info } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function GuardPage({ profile, onBack }: Props) {
  const [guardOn, setGuardOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "fail">("idle");

  async function handleGuard() {
    setLoading(true); setLogs([]); setModal(null); setStatus("idle");
    try {
      const res = await api.guard(profile.cookie, guardOn);
      setLogs(res.logs || []);
      setStatus(res.success ? "success" : "fail");
      setModal({ success: res.success, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setStatus("fail");
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 12 }}>
            <svg viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)", width: 88, height: 88 }}>
              <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="5" />
              <circle cx="44" cy="44" r="38" fill="none" stroke="url(#gpg)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * 0.25}`}
                style={{ animation: "spin 1.2s linear infinite" }}
              />
              <defs>
                <linearGradient id="gpg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={30} color="#a855f7" />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            {guardOn ? "Enabling Guard..." : "Disabling Guard..."}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Connecting to Facebook Privacy API</p>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(168,85,247,0.15)" : "rgba(239,68,68,0.15)" }}>
              {modal.success ? <CheckCircle2 size={30} color="#a855f7" /> : <XCircle size={30} color="#f87171" />}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              {modal.success ? (guardOn ? "Guard Enabled!" : "Guard Disabled!") : "Guard Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>{modal.message}</p>
            {!modal.success && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, textAlign: "left" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Info size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                    Facebook regularly updates their API. To enable manually: go to <strong style={{ color: "#fff" }}>facebook.com → Profile → ⋯ → Turn on Profile Guard</strong>
                  </p>
                </div>
              </div>
            )}
            <button className="lara-btn" onClick={() => setModal(null)} style={{
              background: modal.success ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px"
            }}>OK</button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Shield size={20} color="#a855f7" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Profile Guard</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Photo Protection System</p>
        </div>
        <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: status === "success" ? "rgba(34,197,94,0.15)" : status === "fail" ? "rgba(239,68,68,0.1)" : "rgba(168,85,247,0.1)",
          color: status === "success" ? "#4ade80" : status === "fail" ? "#f87171" : "#c084fc",
          border: `1px solid ${status === "success" ? "rgba(34,197,94,0.3)" : status === "fail" ? "rgba(239,68,68,0.2)" : "rgba(168,85,247,0.2)"}`,
        }}>
          {status === "success" ? "Active" : status === "fail" ? "Failed" : "Ready"}
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div className="profile-mini" style={{ marginBottom: 16 }}>
          <img src={profile.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`; }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{displayName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>UID: {profile.uid}</div>
          </div>
          <span className="dot dot-green dot-pulse" />
        </div>

        {/* Guard toggle */}
        <div className="lara-card" style={{ padding: "24px 20px", marginBottom: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0, opacity: guardOn ? 0.06 : 0,
            background: "radial-gradient(ellipse at center, #a855f7 0%, transparent 70%)",
            transition: "opacity 0.5s",
          }} />
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
            background: guardOn ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.05)",
            border: `2px solid ${guardOn ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: guardOn ? "0 0 40px rgba(168,85,247,0.2)" : "none",
            transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {guardOn
              ? <Shield size={38} color="#a855f7" />
              : <ShieldOff size={38} color="rgba(255,255,255,0.25)" />
            }
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            Profile Guard <span style={{ color: guardOn ? "#a855f7" : "rgba(255,255,255,0.25)", transition: "color 0.3s" }}>{guardOn ? "ON" : "OFF"}</span>
          </h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 22, lineHeight: 1.6 }}>
            {guardOn ? "Your profile photo will be protected from unauthorized access" : "Profile photo protection will be removed"}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: !guardOn ? "#fff" : "rgba(255,255,255,0.25)", transition: "color 0.3s" }}>OFF</span>
            <button onClick={() => setGuardOn(g => !g)} style={{
              width: 64, height: 34, borderRadius: 17, flexShrink: 0,
              background: guardOn ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
              border: `1.5px solid ${guardOn ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.12)"}`,
              cursor: "pointer", position: "relative", transition: "all 0.3s",
              boxShadow: guardOn ? "0 4px 20px rgba(168,85,247,0.4)" : "none",
            }}>
              <div style={{
                position: "absolute", top: 4, width: 24, height: 24, borderRadius: "50%",
                background: "#fff", left: guardOn ? 35 : 4, transition: "left 0.3s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: guardOn ? "#c084fc" : "rgba(255,255,255,0.25)", transition: "color 0.3s" }}>ON</span>
          </div>
        </div>

        {/* Features grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { Icon: Camera,       label: "Blocks downloads",        color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
            { Icon: Shield,       label: "Screenshot protection",   color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
            { Icon: Eye,          label: "Controls visibility",     color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            { Icon: Lock,         label: "FB official feature",     color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
          ].map(({ Icon, label, color, bg }) => (
            <div key={label} className="lara-card" style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={color} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{label}</span>
            </div>
          ))}
        </div>

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{
          marginTop: 16,
          background: guardOn ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#374151,#6b7280)",
          boxShadow: guardOn ? "0 8px 30px rgba(168,85,247,0.3)" : "none",
        }} onClick={handleGuard} disabled={loading}>
          {loading
            ? <><span className="spin" /> Processing...</>
            : guardOn
              ? <><Shield size={16} /> Enable Profile Guard</>
              : <><ShieldOff size={16} /> Disable Profile Guard</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 12, padding: "11px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            Profile Guard adds a frame to your profile photo and restricts others from downloading or sharing it. Requires a fresh, valid cookie.
          </p>
        </div>
      </div>
    </div>
  );
}
