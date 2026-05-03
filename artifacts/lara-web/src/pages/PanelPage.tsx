import { useState, useEffect } from "react";
import { ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, ChevronRight, LogOut, Zap, Activity, Clock, TrendingUp } from "lucide-react";
import type { Profile, Tool } from "@/App";
import { api } from "@/lib/api";

interface Props {
  profile: Profile;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  accountCount: number;
}

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string; bg: string; glow: string }[] = [
  { id: "react",   Icon: ThumbsUp,       label: "Auto React",    desc: "Boost reactions on any post",         color: "#ef4444", bg: "rgba(239,68,68,0.1)",   glow: "rgba(239,68,68,0.15)" },
  { id: "share",   Icon: Share2,         label: "Spam Share",    desc: "Multiply shares in seconds",          color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  glow: "rgba(59,130,246,0.15)" },
  { id: "comment", Icon: MessageSquare,  label: "Mass Comment",  desc: "Post bulk comments from all accounts",color: "#22c55e", bg: "rgba(34,197,94,0.1)",   glow: "rgba(34,197,94,0.15)" },
  { id: "token",   Icon: KeyRound,       label: "Access Token",  desc: "Extract EAAG token from session",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  glow: "rgba(245,158,11,0.15)" },
  { id: "guard",   Icon: Shield,         label: "Profile Guard", desc: "Enable Facebook photo protection",    color: "#a855f7", bg: "rgba(168,85,247,0.1)",  glow: "rgba(168,85,247,0.15)" },
];

function StatCard({ label, value, Icon, color }: { label: string; value: string | number; Icon: typeof Zap; color: string }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export default function PanelPage({ profile, onSelect, onLogout, accountCount }: Props) {
  const isAuth = profile.authenticated;
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;
  const [accounts, setAccounts] = useState<{ uid: string; name: string; avatar: string; active: boolean }[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  const activeCount = accounts.filter(a => a.active).length;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 48 }}>
      {/* Profile hero */}
      <div style={{
        background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)",
        padding: "28px 20px 20px", textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
            border: "2.5px solid rgba(139,92,246,0.5)",
            boxShadow: "0 0 0 6px rgba(139,92,246,0.08), 0 12px 30px rgba(0,0,0,0.4)",
            background: "rgba(139,92,246,0.15)",
          }}>
            <img src={profile.avatar} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff&size=88`; }} />
          </div>
          <div style={{
            position: "absolute", bottom: 2, right: 2, width: 20, height: 20, borderRadius: "50%",
            background: isAuth ? "#22c55e" : "#f59e0b",
            border: "2.5px solid #070b14",
            boxShadow: isAuth ? "0 0 10px rgba(34,197,94,0.6)" : "none",
          }} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{displayName}</h2>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12, fontFamily: "monospace" }}>UID: {profile.uid}</p>

        {isAuth ? (
          <span className="badge badge-success">
            <span className="dot dot-green dot-pulse" />
            Authenticated
          </span>
        ) : (
          <span className="badge badge-warning">
            <span className="dot dot-yellow" />
            Cookie Active
          </span>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ padding: "14px 16px 0", display: "flex", gap: 8 }}>
        <StatCard label="Saved Accounts" value={accounts.length} Icon={Users} color="#8b5cf6" />
        <StatCard label="Active" value={activeCount} Icon={Activity} color="#22c55e" />
        <StatCard label="Max Boost" value={`${Math.min(activeCount, 20)}×`} Icon={TrendingUp} color="#f59e0b" />
        <StatCard label="Cooldown" value="10m" Icon={Clock} color="#3b82f6" />
      </div>

      {/* Active accounts preview */}
      {accounts.length > 0 && (
        <div style={{ margin: "14px 16px 0", padding: "12px 14px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Users size={14} color="#818cf8" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{activeCount} Active Account{activeCount !== 1 ? "s" : ""} for Boost</span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Max 20 per batch</span>
          </div>
          <div style={{ display: "flex", gap: -4 }}>
            {accounts.filter(a => a.active).slice(0, 8).map((acc, i) => (
              <div key={acc.uid} style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: "2px solid #070b14", marginLeft: i === 0 ? 0 : -6, zIndex: 8 - i, background: "rgba(139,92,246,0.2)" }}>
                <img src={acc.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${acc.name[0]}&background=7c3aed&color=fff&size=26`; }} />
              </div>
            ))}
            {accounts.filter(a => a.active).length > 8 && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(139,92,246,0.3)", border: "2px solid #070b14", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#c4b5fd", fontWeight: 700 }}>
                +{accounts.filter(a => a.active).length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tools */}
      <div style={{ padding: "16px 16px 0" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", marginBottom: 10, letterSpacing: "0.12em" }}>TOOLS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {TOOLS.map(({ id, Icon, label, desc, color, bg, glow }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="lara-card tool-card active-press"
              style={{ borderRadius: 14, position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color, opacity: 0.7, borderRadius: "4px 0 0 4px" }} />
              <div style={{ width: 46, height: 46, borderRadius: 13, background: bg, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 15px ${glow}`, flexShrink: 0 }}>
                <Icon size={22} color={color} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.18)" />
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="lara-btn lara-btn-danger" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <LogOut size={14} />
          Switch Account
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.08)", fontSize: 10, marginTop: 18, letterSpacing: "0.05em" }}>
          RPW BOOSTER v1.5.1 · Use responsibly
        </p>
      </div>
    </div>
  );
}
