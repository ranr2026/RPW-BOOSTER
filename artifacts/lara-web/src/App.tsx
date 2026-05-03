import { useState, useEffect, useRef } from "react";
import { Menu, Zap, Sun, Moon } from "lucide-react";
import LoginPage from "@/pages/LoginPage";
import PanelPage from "@/pages/PanelPage";
import ReactPage from "@/pages/ReactPage";
import SharePage from "@/pages/SharePage";
import CommentPage from "@/pages/CommentPage";
import TokenPage from "@/pages/TokenPage";
import GuardPage from "@/pages/GuardPage";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

export interface Profile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  token?: string;
  authenticated?: boolean;
  cookie: string;
}

export type Tool = "panel" | "react" | "share" | "comment" | "token" | "guard";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; alpha: number; color: string }[] = [];
    const colors = ["rgba(139,92,246,", "rgba(236,72,153,", "rgba(99,102,241,", "rgba(59,130,246,"];
    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 50; i++) {
      particles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, r: Math.random() * 1.8 + 0.4, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, alpha: Math.random() * 0.35 + 0.05, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const W = canvas!.width, H = canvas!.height;
      const g1 = ctx!.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.55);
      g1.addColorStop(0, "rgba(99,102,241,0.06)"); g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g1; ctx!.fillRect(0, 0, W, H);
      const g2 = ctx!.createRadialGradient(W * 0.85, H * 0.88, 0, W * 0.85, H * 0.88, W * 0.4);
      g2.addColorStop(0, "rgba(236,72,153,0.04)"); g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g2; ctx!.fillRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + p.alpha + ")"; ctx!.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} id="particle-canvas" />;
}

function App() {
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [tool,         setTool]         = useState<Tool>("panel");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [darkMode,     setDarkMode]     = useState(true);

  // Apply dark/light mode to :root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (profile) void fetchAccountCount();
  }, [profile]);

  async function fetchAccountCount() {
    try {
      const accounts = await api.getAccounts();
      setAccountCount(accounts.filter(a => a.active).length);
    } catch { /* silent */ }
  }

  function handleLogin(p: import("@/lib/api").FbProfile, cookie: string) {
    setProfile({ ...p, cookie });
    setTool("panel");
    void fetchAccountCount();
  }

  function handleLogout() {
    setProfile(null);
    setTool("panel");
    setSidebarOpen(false);
  }

  const renderContent = () => {
    if (!profile) return null;
    switch (tool) {
      case "react":   return <ReactPage   profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "share":   return <SharePage   profile={profile} onBack={() => setTool("panel")} />;
      case "comment": return <CommentPage profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "token":   return <TokenPage   profile={profile} onBack={() => setTool("panel")} />;
      case "guard":   return <GuardPage   profile={profile} onBack={() => setTool("panel")} />;
      default:        return <PanelPage   profile={profile} onSelect={setTool} onLogout={handleLogout} accountCount={accountCount} />;
    }
  };

  const displayName = profile
    ? (profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name)
    : "";

  return (
    <>
      <ParticleCanvas />
      <div className="lara-content">
        {!profile ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            {/* ── Monokai Navbar ── */}
            <nav className="rpw-navbar">
              <button className="rpw-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
                <Menu size={17} />
              </button>

              <div className="rpw-navbar-center">
                <div className="rpw-navbar-brand">
                  <div className="rpw-brand-logo">
                    <Zap size={14} color="#fff" strokeWidth={2.5} />
                  </div>
                  RPW BOOSTER
                </div>
                <span className="rpw-version-badge">v1.5.1</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Dark / Light mode toggle */}
                <button
                  className="theme-toggle-btn"
                  onClick={() => setDarkMode(d => !d)}
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                  title={darkMode ? "Light mode" : "Dark mode"}
                >
                  {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <button className="rpw-avatar-btn" onClick={() => setSidebarOpen(true)} aria-label="Profile">
                  <img
                    src={profile.avatar}
                    alt={displayName}
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff&size=64`;
                    }}
                  />
                </button>
              </div>
            </nav>

            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onSelect={(t) => { setTool(t); setSidebarOpen(false); }}
              onLogout={handleLogout}
              profile={profile}
              accountCount={accountCount}
              currentTool={tool}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
            />

            <div className="rpw-main">
              {renderContent()}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
