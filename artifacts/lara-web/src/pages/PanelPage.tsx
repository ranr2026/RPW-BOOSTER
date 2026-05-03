import type { Profile, Tool } from "@/App";

interface Props {
  profile: Profile;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
}

const TOOLS: { id: Tool; icon: string; label: string; desc: string; color: string; bg: string }[] = [
  { id: "react",   icon: "❤️", label: "Auto React",    desc: "React to any post with 6 reaction types",  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { id: "share",   icon: "📤", label: "Spam Share",    desc: "Share a post multiple times quickly",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { id: "comment", icon: "💬", label: "Mass Comment",  desc: "Post bulk comments from a list",            color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  { id: "token",   icon: "🔑", label: "Access Token",  desc: "Extract EAAG access token from cookie",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { id: "guard",   icon: "🛡️", label: "Profile Guard", desc: "Enable or disable Facebook profile guard", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
];

export default function PanelPage({ profile, onSelect, onLogout }: Props) {
  const isAuth = profile.authenticated;
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {/* Header hero */}
      <div style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.15) 0%, transparent 100%)",
        padding: "52px 24px 28px",
        textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
            border: "3px solid rgba(139,92,246,0.7)",
            boxShadow: "0 0 30px rgba(139,92,246,0.3)",
            background: "rgba(139,92,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src={profile.avatar}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.querySelector(".avatar-initial")?.removeAttribute("hidden");
              }}
            />
            <span className="avatar-initial" hidden style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{
            position: "absolute", bottom: 3, right: 3,
            width: 20, height: 20, borderRadius: "50%",
            background: isAuth ? "#22c55e" : "#f59e0b",
            border: "2.5px solid #0f0c1e",
            boxShadow: isAuth ? "0 0 8px rgba(34,197,94,0.6)" : "none",
          }} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{displayName}</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>UID: {profile.uid}</p>

        {/* Auth badge */}
        {isAuth ? (
          <span className="badge badge-success">
            <span className="dot dot-green dot-pulse" />
            Authenticated
          </span>
        ) : (
          <span className="badge badge-warning">
            <span className="dot dot-yellow" />
            Cookie Active · Limited Auth
          </span>
        )}

        {!isAuth && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 10, lineHeight: 1.6, padding: "0 16px" }}>
            Server couldn't verify fb_dtsg — your account may have a checkpoint. Resolve it at facebook.com then re-login.
          </p>
        )}
      </div>

      {/* Tools */}
      <div style={{ padding: "20px 16px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 12, letterSpacing: "0.1em", paddingLeft: 4 }}>TOOLS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="lara-card tool-card active-press"
              style={{ borderRadius: 14 }}
            >
              <div className="tool-icon" style={{ background: t.bg, border: `1px solid ${t.color}30` }}>
                {t.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.desc}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 20, fontWeight: 300 }}>›</div>
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="lara-btn lara-btn-danger" style={{ marginTop: 24 }}>
          🚪 Switch Account
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: 11, marginTop: 20 }}>
          Lara v1.5.1 • Use at your own risk
        </p>
      </div>
    </div>
  );
}
