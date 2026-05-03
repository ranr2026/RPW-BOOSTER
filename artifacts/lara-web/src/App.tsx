import { useState, useEffect, useRef } from "react";
import { Menu, Zap } from "lucide-react";
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
    const colors = ["rgba(139,92,246,", "rgba(236,72,153,", "rgba(99,102,241,"];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.45 + 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const W = canvas!.width, H = canvas!.height;

      const grad = ctx!.createRadialGradient(W * 0.25, H * 0.15, 0, W * 0.25, H * 0.15, W * 0.6);
      grad.addColorStop(0, "rgba(99,102,241,0.07)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      const grad2 = ctx!.createRadialGradient(W * 0.8, H * 0.85, 0, W * 0.8, H * 0.85, W * 0.45);
      grad2.addColorStop(0, "rgba(236,72,153,0.05)");
      grad2.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = grad2;
      ctx!.fillRect(0, 0, W, H);

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + p.alpha + ")";
        ctx!.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(139,92,246,${0.07 * (1 - dist / 110)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="particle-canvas" />;
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tool, setTool] = useState<Tool>("panel");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountCount, setAccountCount] = useState(0);

  useEffect(() => {
    if (profile) void fetchAccountCount();
  }, [profile]);

  async function fetchAccountCount() {
    try {
      const accounts = await api.getAccounts();
      setAccountCount(accounts.filter(a => a.active).length);
    } catch {
      // silent
    }
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
      case "react":    return <ReactPage    profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "share":    return <SharePage    profile={profile} onBack={() => setTool("panel")} />;
      case "comment":  return <CommentPage  profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "token":    return <TokenPage    profile={profile} onBack={() => setTool("panel")} />;
      case "guard":    return <GuardPage    profile={profile} onBack={() => setTool("panel")} />;
      default:         return <PanelPage    profile={profile} onSelect={setTool} onLogout={handleLogout} accountCount={accountCount} />;
    }
  };

  return (
    <>
      <ParticleCanvas />
      <div className="lara-content">
        {!profile ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            <nav className="rpw-navbar">
              <button className="rpw-menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={19} />
              </button>
              <div className="rpw-navbar-brand">
                <Zap size={15} style={{ color: "#8b5cf6" }} />
                RPW BOOSTER
              </div>
              <button className="rpw-avatar-btn" onClick={() => setSidebarOpen(true)}>
                <img
                  src={profile.avatar}
                  alt=""
                  onError={e => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff`;
                  }}
                />
              </button>
            </nav>

            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onSelect={(t) => { setTool(t); setSidebarOpen(false); }}
              onLogout={handleLogout}
              profile={profile}
              accountCount={accountCount}
              currentTool={tool}
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
