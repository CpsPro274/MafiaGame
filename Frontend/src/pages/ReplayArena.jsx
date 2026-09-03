import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Spotlight from "../components/ui/Spotlight";
import ShimmerButton from "../components/ui/ShimmerButton";
import ReplayScrubber from "../components/Replay/ReplayScrubber";
import api from "../api/api";
import {
  Trophy,
  ShieldAlert,
  Flame,
  ArrowRight,
  RotateCcw,
  Users,
  Code2,
  Lock,
  Sparkles
} from "lucide-react";

export default function ReplayArena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room") || "7XGRJT";

  const [replayData, setReplayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReplay() {
      try {
        const resp = await api.get(`/matches/${roomCode}/replay`);
        setReplayData(resp.data);
      } catch (err) {
        console.warn("Could not fetch remote replay, using demo timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReplay();
  }, [roomCode]);

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white pb-20">
      <Spotlight fill="rgba(244, 63, 94, 0.15)" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#07080c]/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-rose-900/30">
            <div className="w-full h-full bg-[#07080c] rounded-[10px] flex items-center justify-center">
              <Flame size={20} className="text-rose-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-rose-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              FORENSIC DEBRIEF
            </span>
            <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
              Match #{roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Play Again</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        {/* Match Outcome Hero Banner */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold tracking-widest uppercase shadow-lg shadow-rose-950/40 animate-in fade-in">
            <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
            <span>MATCH CONCLUDED • SMOKING GUN REVEALED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            The Traitor Was:{" "}
            <span className="bg-gradient-to-r from-rose-400 via-red-500 to-amber-400 bg-clip-text text-transparent">
              Agent Ghost 🕵️‍♂️
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Ghost secretly injected an arbitrary tax calculation bug on Line 8 at timestamp 03:15, causing the final automated test suite to fail.
          </p>
        </section>

        {/* The Replay Scrubber Player */}
        <section className="space-y-4">
          <ReplayScrubber replayData={replayData} />
        </section>

        {/* Action Call to Action */}
        <section className="text-center pt-6 pb-10">
          <ShimmerButton
            onClick={() => navigate("/lobby")}
            variant="purple"
            size="lg"
            className="shadow-2xl"
          >
            <Users size={18} />
            <span>Return to Lobby for Next Match</span>
            <ArrowRight size={18} />
          </ShimmerButton>
        </section>
      </main>
    </div>
  );
}
