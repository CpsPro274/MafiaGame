import React from "react";
import { useGame } from "../context/GameContext";
import CreateOrJoinCard from "../components/Lobby/CreateOrJoinCard";
import WaitingRoom from "../components/Lobby/WaitingRoom";
import { Code2, Terminal, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Spotlight from "../components/ui/Spotlight";

export default function Lobby() {
  const { currentRoom, secretRole } = useGame();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (secretRole || currentRoom?.status === "IN_PROGRESS") {
      navigate("/arena");
    }
  }, [secretRole, currentRoom, navigate]);

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Spotlight & Gradients */}
      <Spotlight fill="rgba(147, 51, 234, 0.15)" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Code2 size={20} className="text-cyan-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              CODE MAFIA
            </span>
            <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-500">
              Multiplayer Arena
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-colors"
          >
            Home
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        {!currentRoom ? <CreateOrJoinCard /> : <WaitingRoom />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-600">
        CODE MAFIA • Real-time Multiplayer Collaborative Debugging Challenge
      </footer>
    </div>
  );
}
