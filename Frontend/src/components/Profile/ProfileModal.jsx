import React, { useState, useEffect } from "react";
import { User, Trophy, Shield, Eye, Award, Zap, X, LogOut, CheckCircle2, Flame, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function ProfileModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const storedUser = localStorage.getItem("user");
    let initialUser = null;
    try {
      initialUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (_) {}

    if (initialUser) {
      setProfile({
        username: initialUser.username || "CyberAgent",
        games_played: initialUser.games_played || 12,
        dev_wins: initialUser.dev_wins || 7,
        mafia_wins: initialUser.mafia_wins || 3,
        total_xp: 3450,
        rank: "Senior Cyber Operative",
        created_at: initialUser.created_at || new Date().toISOString()
      });

      // Try fetching fresh stats from backend
      api.get(`/auth/profile/${initialUser.username}`)
        .then((res) => {
          if (res.data?.user) {
            setProfile((prev) => ({ ...prev, ...res.data.user }));
          }
        })
        .catch(() => {});
    } else {
      setProfile({
        username: "GuestAgent",
        games_played: 6,
        dev_wins: 4,
        mafia_wins: 1,
        total_xp: 1850,
        rank: "Tactical Specialist",
        created_at: new Date().toISOString()
      });
    }
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const totalWins = (profile.dev_wins || 0) + (profile.mafia_wins || 0);
  const totalGames = Math.max(1, profile.games_played || totalWins || 1);
  const winRate = Math.round((totalWins / totalGames) * 100);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onClose();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-purple-500/30 bg-[#0c0e1a]/95 shadow-[0_0_80px_rgba(139,92,246,0.25)] p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Persona */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-950">
            <div className="w-full h-full bg-[#080a13] rounded-[14px] flex items-center justify-center text-2xl font-black text-white">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {profile.username}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold uppercase">
                ACTIVE
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <Star size={12} className="text-amber-400 fill-current" />
              <span>{profile.rank || "Cyber Detective"}</span>
            </div>
          </div>
        </div>

        {/* Career Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-0.5">
            <div className="text-xl font-black font-mono text-cyan-400">{profile.games_played || 0}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Matches</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-0.5">
            <div className="text-xl font-black font-mono text-emerald-400">{winRate}%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Win Rate</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-0.5">
            <div className="text-xl font-black font-mono text-amber-400">{profile.total_xp || 3450}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total XP</div>
          </div>
        </div>

        {/* Role Breakdown Bars */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Role Performance Breakdown
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield size={16} className="text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">Developer Victories</div>
                <div className="text-[10px] font-mono text-slate-400">Unit Tests Stabilized</div>
              </div>
            </div>
            <div className="text-sm font-mono font-black text-cyan-300">
              {profile.dev_wins || 0} Wins
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye size={16} className="text-rose-400" />
              <div>
                <div className="text-xs font-bold text-white">Mafia Sabotage Victories</div>
                <div className="text-[10px] font-mono text-slate-400">Stealth Regressions Planted</div>
              </div>
            </div>
            <div className="text-sm font-mono font-black text-rose-400">
              {profile.mafia_wins || 0} Wins
            </div>
          </div>
        </div>

        {/* Honors Badges */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Honors & Medals
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300 text-xs font-mono">
              🏅 Fast Patch Expert
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              🕵️ Phantom Saboteur
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono">
              🎯 Sherlock Detective
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors font-bold cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
