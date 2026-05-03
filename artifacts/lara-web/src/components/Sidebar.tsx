import { X, ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, LogOut, Zap, Sun, Moon } from "lucide-react";
import type { Profile, Tool } from "@/App";

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string; bg: string }[] = [
  { id: "react",   Icon: ThumbsUp,      label: "Auto React",    desc: "Boost post reactions",     color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  { id: "share",   Icon: Share2,        label: "Spam Share",    desc: "Multiple shares fast",     color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  { id: "comment", Icon: MessageSquare, label: "Mass Comment",  desc: "Bulk comments",            color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  { id: "token",   Icon: KeyRound,      label: "Access Token",  desc: "Extract EAAG token",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  { id: "guard",   Icon: Shield,        label: "Profile Guard", desc: "Protect profile photo",    color: "#a855f7", bg: "rgba(168,85,247,0.12)"  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  profile: Profile;
  accountCount: number;
  currentTool: Tool;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Sidebar({ open, onClose, onSelect, onLogout, profile, accountCount, currentTool, darkMode, onToggleDark }: Props) {
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <div className={`sidebar-drawer${open ? " open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Zap size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "0.04em" }}>RPW BOOSTER</div>
              <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "0.06em" }}>FACEBOOK MULTI-TOOL v1.5.1</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}><X size={14} /></button>
        </div>

        {/* Profile */}
        <div style={{ padding: "8px 10px 0" }}>
          <div className="sidebar-profile">
            <img src={profile.avatar} alt={displayName}
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(139,92,246,0.5)", flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`; }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "monospace" }}>UID: {profile.uid}</div>
            </div>
            <span className="dot dot-green dot-pulse" />
          </div>
        </div>

        {/* Account count */}
        {accountCount > 0 && (
          <div style={{ margin: "6px 10px", padding: "7px 12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 10, display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={12} color="#a78bfa" />
            <span style={{ fontSize: 11, color: "#a78bfa" }}>{accountCount} account{accountCount !== 1 ? "s" : ""} ready</span>
          </div>
        )}

        {/* Tools */}
        <div style={{ padding: "6px 8px", flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.14em", paddingLeft: 4, marginBottom: 6 }}>TOOLS</p>
          {TOOLS.map(({ id, Icon, label, desc, color, bg }) => (
            <button key={id} className={`sidebar-tool-btn${currentTool === id ? " active" : ""}`} onClick={() => onSelect(id)}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: currentTool === id ? bg : "var(--card)", border: `1px solid ${currentTool === id ? color + "30" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color={currentTool === id ? color : "var(--text3)"} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: currentTool === id ? "var(--text)" : "var(--text2)" }}>{label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ padding: "10px 10px 12px", borderTop: "1px solid var(--border)" }}>
          {/* Theme toggle in sidebar too */}
          <button onClick={onToggleDark} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text2)", cursor: "pointer", marginBottom: 8, fontFamily: "inherit", fontSize: 12, transition: "all 0.15s" }}>
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="lara-btn lara-btn-danger" style={{ fontSize: 12, gap: 7 }} onClick={onLogout}>
            <LogOut size={13} />
            Switch Account
          </button>
          <p style={{ textAlign: "center", fontSize: 9, color: "var(--text3)", marginTop: 10, letterSpacing: "0.06em" }}>
            Use at own risk · RPW PH
          </p>
        </div>
      </div>
    </>
  );
}
