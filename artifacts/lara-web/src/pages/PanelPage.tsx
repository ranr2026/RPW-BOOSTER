import { ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, ChevronRight, LogOut } from "lucide-react";
import type { Profile, Tool } from "@/App";

interface Props {
  profile: Profile;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  accountCount: number;
}

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string; bg: string }[] = [
  { id: "react",   Icon: ThumbsUp,      label: "Auto React",    desc: "Boost any post with 7 reaction types",  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { id: "share",   Icon: Share2,        label: "Spam Share",    desc: "Share a post multiple times quickly",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { id: "comment", Icon: MessageSquare, label: "Mass Comment",  desc: "Post bulk comments from a custom list", color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  { id: "token",   Icon: KeyRound,      label: "Access Token",  desc: "Extract EAAG access token from cookie", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { id: "guard",   Icon: Shield,        label: "Profile Guard", desc: "Enable Facebook profile photo guard",   color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
];

export default function PanelPage({ profile, onSelect, onLogout, accountCount }: Props) {
  const isAuth = profile.authenticated;
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {/* Profile hero */}
      <div style={{
        background: "linear-gradient(180deg, rgba(99,102,241,0.1) 0%, transparent 100%)",
        padding: "28px 24px 24px",
        textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
      }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
          <div style={{
            width: 84, height: 84, borderRadius: "50%", overflow: "hidden",
            border: "2.5px solid rgba(139,92,246,0.65)",
            boxShadow: "0 0 28px rgba(139,92,246,0.25)",
            background: "rgba(139,92,246,0.15)",
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
            <span className="avatar-initial" hidden style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{
            position: "absolute", bottom: 3, right: 2,
            width: 18, height: 18, borderRadius: "50%",
            background: isAuth ? "#22c55e" : "#f59e0b",
            border: "2.5px solid #070b14",
            boxShadow: isAuth ? "0 0 8px rgba(34,197,94,0.6)" : "none",
          }} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{displayName}</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>UID: {profile.uid}</p>

        {isAuth ? (
          <span className="badge badge-success">
            <span className="dot dot-green dot-pulse" />
            Authenticated
          </span>
        ) : (
          <span className="badge badge-warning">
            <span className="dot dot-yellow" />
            Cookie Active · Limited
          </span>
        )}
      </div>

      {/* Stats bar */}
      {accountCount > 0 && (
        <div style={{ margin: "16px 16px 0", padding: "12px 16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={16} color="#818cf8" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{accountCount} Saved Account{accountCount !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Boost mode active — all accounts will react &amp; comment</div>
          </div>
        </div>
      )}

      {/* Tools */}
      <div style={{ padding: "16px 16px 0" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", marginBottom: 10, letterSpacing: "0.1em", paddingLeft: 2 }}>TOOLS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TOOLS.map(({ id, Icon, label, desc, color, bg }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="lara-card tool-card active-press"
              style={{ borderRadius: 14 }}
            >
              <div className="tool-icon" style={{ background: bg, border: `1px solid ${color}28` }}>
                <Icon size={21} color={color} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="lara-btn lara-btn-danger" style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 8 }}>
          <LogOut size={15} />
          Switch Account
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: 11, marginTop: 18 }}>
          RPW BOOSTER v1.5.1 · Use at your own risk
        </p>
      </div>
    </div>
  );
}
