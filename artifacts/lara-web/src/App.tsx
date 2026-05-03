import { useState } from "react";
import LoginPage from "@/pages/LoginPage";
import PanelPage from "@/pages/PanelPage";
import ReactPage from "@/pages/ReactPage";
import SharePage from "@/pages/SharePage";
import CommentPage from "@/pages/CommentPage";
import TokenPage from "@/pages/TokenPage";
import GuardPage from "@/pages/GuardPage";
import { Toaster } from "@/components/Toaster";

export interface Profile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  cookie: string;
}

export type Tool = "panel" | "react" | "share" | "comment" | "token" | "guard";

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tool, setTool] = useState<Tool>("panel");

  if (!profile) {
    return (
      <>
        <LoginPage onLogin={(p, cookie) => setProfile({ ...p, cookie })} />
        <Toaster />
      </>
    );
  }

  const renderTool = () => {
    switch (tool) {
      case "react":    return <ReactPage profile={profile} onBack={() => setTool("panel")} />;
      case "share":    return <SharePage profile={profile} onBack={() => setTool("panel")} />;
      case "comment":  return <CommentPage profile={profile} onBack={() => setTool("panel")} />;
      case "token":    return <TokenPage profile={profile} onBack={() => setTool("panel")} />;
      case "guard":    return <GuardPage profile={profile} onBack={() => setTool("panel")} />;
      default:         return <PanelPage profile={profile} onSelect={setTool} onLogout={() => setProfile(null)} />;
    }
  };

  return (
    <>
      {renderTool()}
      <Toaster />
    </>
  );
}

export default App;
