import type { Profile, Tool } from "@/App";

interface Props {
  profile: Profile;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
}

const TOOLS: { id: Tool; icon: string; label: string; desc: string; color: string }[] = [
  { id: "react",   icon: "❤️", label: "Auto React",    desc: "React to posts automatically",  color: "#ef4444" },
  { id: "share",   icon: "📤", label: "Spam Share",    desc: "Share posts multiple times",    color: "#3b82f6" },
  { id: "comment", icon: "💬", label: "Mass Comment",  desc: "Post bulk comments",            color: "#22c55e" },
  { id: "token",   icon: "🔑", label: "Access Token",  desc: "Extract your access token",    color: "#f59e0b" },
  { id: "guard",   icon: "🛡️", label: "Profile Guard", desc: "Enable/disable profile guard", color: "#a855f7" },
];

export default function PanelPage({ profile, onSelect, onLogout }: Props) {
  const isAuth = profile.authenticated;
  const isGenericName = profile.name.startsWith("User ");

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 32px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(124,58,237,0.2) 0%, transparent 100%)",
        padding: "48px 24px 24px",
        textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <img
            src={profile.avatar}
            alt={profile.name}
            style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid rgba(124,58,237,0.6)", objectFit: "cover", display: "block" }}
            onError={e => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff&size=80`;
            }}
          />
          <div style={{
            position: "absolute", bottom: 2, right: 2,
            width: 18, height: 18, borderRadius: "50%",
            background: isAuth ? "#22c55e" : "#f59e0b",
            border: "2px solid var(--lara-bg2)",
          }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          {isGenericName ? `UID ${profile.uid}` : profile.name}
        </h2>
        <p style={{ fontSize: 12, color: "var(--lara-muted)" }}>UID: {profile.uid}</p>

        {/* Auth status */}
        {isAuth ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 20, padding: "4px 14px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 500 }}>Fully Authenticated</span>
          </div>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 20, padding: "4px 14px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 500 }}>Cookie Active — Limited Auth</span>
          </div>
        )}

        {!isAuth && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8, lineHeight: 1.5, padding: "0 20px" }}>
            Server couldn't verify session with Facebook (IP restriction or invalid cookie). Tools will attempt actions — results depend on cookie validity.
          </p>
        )}
      </div>

      {/* Tools */}
      <div style={{ padding: "24px 20px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--lara-muted)", marginBottom: 16, letterSpacing: "0.08em" }}>TOOLS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="lara-card active-press"
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 18px", textAlign: "left",
                width: "100%", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: `${t.color}20`, border: `1px solid ${t.color}35`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                {t.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                <div style={{ fontSize: 12, color: "var(--lara-muted)", marginTop: 2 }}>{t.desc}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="lara-btn lara-btn-danger" style={{ width: "100%", marginTop: 24 }}>
          🚪 Switch Account
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11, marginTop: 20 }}>
          Lara v1.5.1 • Use at your own risk
        </p>
      </div>
    </div>
  );
}
