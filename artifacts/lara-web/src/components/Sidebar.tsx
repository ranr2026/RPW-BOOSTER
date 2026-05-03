import { X, ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, LogOut, Zap } from "lucide-react";
import type { Profile, Tool } from "@/App";

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string }[] = [
  { id: "react",   Icon: ThumbsUp,     label: "Auto React",    desc: "Boost post reactions",    color: "#ef4444" },
  { id: "share",   Icon: Share2,       label: "Spam Share",    desc: "Multiple shares",         color: "#3b82f6" },
  { id: "comment", Icon: MessageSquare,label: "Mass Comment",  desc: "Bulk comments",           color: "#22c55e" },
  { id: "token",   Icon: KeyRound,     label: "Access Token",  desc: "Extract EAAG token",      color: "#f59e0b" },
  { id: "guard",   Icon: Shield,       label: "Profile Guard", desc: "Protect profile photo",   color: "#a855f7" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  profile: Profile;
  accountCount: number;
  currentTool: Tool;
}

export default function Sidebar({ open, onClose, onSelect, onLogout, profile, accountCount, currentTool }: Props) {
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <div className={`sidebar-drawer${open ? " open" : ""}`}>
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={18} color="#8b5cf6" />
            <span style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "0.02em" }}>RPW BOOSTER</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-profile">
          <img
            src={profile.avatar}
            alt={displayName}
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(139,92,246,0.5)", flexShrink: 0 }}
            onError={e => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>UID: {profile.uid}</div>
          </div>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)", flexShrink: 0 }} />
        </div>

        {accountCount > 0 && (
          <div style={{ margin: "0 14px 10px", padding: "8px 12px", background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={13} color="#a78bfa" />
            <span style={{ fontSize: 11, color: "#a78bfa", lineHeight: 1.4 }}>
              {accountCount} saved account{accountCount !== 1 ? "s" : ""} · Boost mode active
            </span>
          </div>
        )}

        <div style={{ padding: "4px 10px 4px", flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", paddingLeft: 4, marginBottom: 6 }}>TOOLS</p>
          {TOOLS.map(({ id, Icon, label, color }) => (
            <button
              key={id}
              className={`sidebar-tool-btn${currentTool === id ? " active" : ""}`}
              onClick={() => onSelect(id)}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: currentTool === id ? `${color}22` : "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={15} color={currentTool === id ? color : "rgba(255,255,255,0.45)"} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: currentTool === id ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button className="lara-btn lara-btn-danger" style={{ fontSize: 13, gap: 8 }} onClick={onLogout}>
            <LogOut size={14} />
            Switch Account
          </button>
          <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.1)", marginTop: 10 }}>
            RPW BOOSTER v1.5.1 · Use at own risk
          </p>
        </div>
      </div>
    </>
  );
}
