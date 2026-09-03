import React from "react";
import { Users, Radio, ArrowRight, Shield, Zap, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LiveMatchTicker({ onSelectRoom }) {
  const navigate = useNavigate();

  const activeRooms = [
    {
      code: "7XGRJT",
      name: "Cart Discount Engine",
      language: "Python",
      players: 3,
      maxPlayers: 6,
      status: "WAITING IN LOBBY",
      statusColor: "emerald",
      host: "AliceDev"
    },
    {
      code: "K9M2P4",
      name: "Auth Token Verifier",
      language: "JavaScript",
      players: 4,
      maxPlayers: 4,
      status: "MATCH IN PROGRESS",
      statusColor: "rose",
      host: "Ghost"
    },
    {
      code: "B4T8N2",
      name: "Binary Tree Inversion",
      language: "Python",
      players: 2,
      maxPlayers: 8,
      status: "WAITING IN LOBBY",
      statusColor: "emerald",
      host: "Cipher"
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          <Radio size={14} className="text-emerald-400 animate-pulse" />
          <span>Active Multiplayer Lobbies ({activeRooms.length})</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">Live WebSocket Feed</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {activeRooms.map((room) => {
          const isLobby = room.statusColor === "emerald";

          return (
            <div
              key={room.code}
              onClick={() => {
                if (isLobby) {
                  onSelectRoom?.(room.code);
                }
              }}
              className={`p-4 rounded-2xl border transition-all duration-200 group ${
                isLobby
                  ? "bg-[#0c0f1a] border-slate-800 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] cursor-pointer"
                  : "bg-[#090b12] border-slate-900 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-black text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  #{room.code}
                </span>

                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLobby ? "bg-emerald-400 animate-ping" : "bg-rose-500"
                    }`}
                  />
                  <span className={isLobby ? "text-emerald-400" : "text-rose-400"}>
                    {room.status}
                  </span>
                </div>
              </div>

              <div className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                {room.name}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-purple-400" />
                  {room.players}/{room.maxPlayers} Agents
                </span>

                {isLobby ? (
                  <span className="text-purple-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Quick Join <ArrowRight size={12} />
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center gap-1">
                    <Lock size={12} /> Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
