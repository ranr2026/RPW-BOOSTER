import { useState, useEffect, useRef } from "react";
import LoginPage from "@/pages/LoginPage";
import PanelPage from "@/pages/PanelPage";
import ReactPage from "@/pages/ReactPage";
import SharePage from "@/pages/SharePage";
import CommentPage from "@/pages/CommentPage";
import TokenPage from "@/pages/TokenPage";
import GuardPage from "@/pages/GuardPage";

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
    const colors = ["rgba(139,92,246,", "rgba(236,72,153,", "rgba(124,58,237,"];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const W = canvas!.width, H = canvas!.height;
      
      // gradient background
      const grad = ctx!.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.6);
      grad.addColorStop(0, "rgba(139,92,246,0.08)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      const grad2 = ctx!.createRadialGradient(W * 0.8, H * 0.8, 0, W * 0.8, H * 0.8, W * 0.5);
      grad2.addColorStop(0, "rgba(236,72,153,0.06)");
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

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 120)})`;
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

  const renderTool = () => {
    if (!profile) return null;
    switch (tool) {
      case "react":    return <ReactPage profile={profile} onBack={() => setTool("panel")} />;
      case "share":    return <SharePage profile={profile} onBack={() => setTool("panel")} />;
      case "comment":  return <CommentPage profile={profile} onBack={() => setTool("panel")} />;
      case "token":    return <TokenPage profile={profile} onBack={() => setTool("panel")} />;
      case "guard":    return <GuardPage profile={profile} onBack={() => setTool("panel")} />;
      default:         return <PanelPage profile={profile} onSelect={setTool} onLogout={() => { setProfile(null); setTool("panel"); }} />;
    }
  };

  return (
    <>
      <ParticleCanvas />
      <div className="lara-content">
        {!profile
          ? <LoginPage onLogin={(p, cookie) => setProfile({ ...p, cookie })} />
          : renderTool()
        }
      </div>
    </>
  );
}

export default App;
