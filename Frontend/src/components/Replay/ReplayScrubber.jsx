import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Bug,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Terminal,
  Clock,
  Sparkles,
  GitCommit,
  User,
  Cpu
} from "lucide-react";

export default function ReplayScrubber({ replayData }) {
  const events = replayData?.events || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const currentEvent = events[currentIndex] || events[0] || {};
  const totalEvents = events.length;

  // Auto-playback loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalEvents - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2200 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalEvents, playbackSpeed]);

  // Handle Monaco Editor mount and apply custom line decorations on time scrubber change
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    updateDecorations(editor, monaco, currentEvent);
  };

  const updateDecorations = (editor, monaco, evt) => {
    if (!editor || !monaco) return;

    const activeLines = evt.activeLines || [];
    const isSabotage = evt.action === "SABOTAGE";

    const newDecorations = activeLines.map((lineNum) => ({
      range: new monaco.Range(lineNum, 1, lineNum, 1),
      options: {
        isWholeLine: true,
        className: isSabotage ? "monaco-sabotage-line-highlight" : "monaco-fix-line-highlight",
        glyphMarginClassName: isSabotage ? "monaco-sabotage-glyph" : "monaco-fix-glyph",
        linesDecorationsClassName: isSabotage ? "monaco-sabotage-gutter" : "monaco-fix-gutter"
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    if (editorRef.current && window.monaco) {
      updateDecorations(editorRef.current, window.monaco, currentEvent);
    }
  }, [currentIndex, currentEvent]);

  const handleSliderChange = (e) => {
    setCurrentIndex(parseInt(e.target.value, 10));
    setIsPlaying(false);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(totalEvents - 1, prev + 1));
  };

  const handleJumpToEvent = (index) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-slate-800 bg-[#08090d] shadow-2xl overflow-hidden font-sans">
      {/* 1. TOP FORENSIC HEADER */}
      <div className="px-6 py-4 bg-[#0c0e17] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
            <Flame size={20} className="text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Monaco VS Code Forensic Replay Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Room #{replayData?.roomCode || "DEMO"} Git-Blame Timeline
            </h2>
          </div>
        </div>

        {/* Timestamp Pill */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
          <Clock size={16} className="text-cyan-400" />
          <span className="font-mono text-base font-bold text-cyan-300">
            {currentEvent.timeLabel || "00:00"}
          </span>
          <span className="text-slate-600 text-xs">/</span>
          <span className="font-mono text-xs text-slate-500">
            {events[events.length - 1]?.timeLabel || "05:00"}
          </span>
        </div>
      </div>

      {/* 2. MAIN SPLIT VIEW (Monaco Editor + Event Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        {/* Left Monaco Code Area (8 Cols) */}
        <div className="lg:col-span-8 bg-[#050608] border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Author Attribution Card */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                currentEvent.authorRole === "MAFIA"
                  ? "bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-lg shadow-rose-950/50"
                  : currentEvent.authorRole === "DEVELOPER"
                  ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    currentEvent.authorRole === "MAFIA"
                      ? "bg-rose-500 text-slate-950 shadow-md"
                      : "bg-cyan-500 text-slate-950"
                  }`}
                >
                  {currentEvent.authorRole === "MAFIA" ? "🕵️" : "👨‍💻"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{currentEvent.author}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-extrabold ${
                        currentEvent.authorRole === "MAFIA"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      }`}
                    >
                      {currentEvent.authorRole === "MAFIA" ? "Secret Mafia Traitor" : "Developer"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    {currentEvent.details}
                  </div>
                </div>
              </div>

              {currentEvent.action === "SABOTAGE" && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-bold font-mono animate-bounce">
                  🚨 SMOKING GUN DETECTED
                </div>
              )}
            </div>

            {/* Live Monaco Editor (Embedded) */}
            <div className="rounded-xl border border-slate-800 bg-[#1e1e1e] overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-[#181818] border-b border-slate-800 text-slate-400 text-xs font-mono">
                <span className="flex items-center gap-2 text-purple-400">
                  <Terminal size={13} />
                  solution_code.py (Read-Only Forensic View)
                </span>
                <span className="text-[11px] text-slate-500">Monaco Engine • Python</span>
              </div>

              <Editor
                height="340px"
                language="python"
                theme="vs-dark"
                value={currentEvent.code || "# No code recorded at this frame"}
                onMount={handleEditorDidMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                  renderLineHighlight: "all",
                  glyphMargin: true
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Event Scrubber Log (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0a0c13] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <GitCommit size={14} className="text-purple-400" />
                Audit Trail ({events.length} Events)
              </span>
              <span className="text-[10px] text-slate-500">1-Click Jump</span>
            </div>

            {/* Scrollable Event List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {events.map((evt, idx) => {
                const isSelected = idx === currentIndex;
                const isSabotage = evt.action === "SABOTAGE";
                const isPass = evt.action === "TEST_PASS";
                const isFail = evt.action === "TEST_FAIL";
                const isMeeting = evt.action === "MEETING";

                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToEvent(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isSabotage
                          ? "bg-rose-950/70 border-rose-500 text-white shadow-lg shadow-rose-950"
                          : "bg-purple-950/70 border-purple-500 text-white shadow-lg shadow-purple-950"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {evt.timeLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {evt.author}
                        </span>
                      </div>

                      {isSabotage && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          SABOTAGE
                        </span>
                      )}
                      {isPass && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          PASSED
                        </span>
                      )}
                      {isFail && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          FAILED
                        </span>
                      )}
                      {isMeeting && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          MEETING
                        </span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-2 leading-relaxed">{evt.details}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. VIDEO PLAYER SCRUBBER CONTROLS FOOTER */}
      <div className="p-5 sm:p-6 bg-slate-950 border-t border-slate-800 space-y-4">
        {/* Timeline Slider with Event Markers */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalEvents - 1)}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
            <span>00:00 (Match Start)</span>
            <span>
              {currentEvent.timeLabel} (Frame {currentIndex + 1}/{totalEvents})
            </span>
            <span>{events[events.length - 1]?.timeLabel || "05:00"} (Match End)</span>
          </div>
        </div>

        {/* Video Player Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Play/Pause/Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStepPrev}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous Frame"
            >
              <Rewind size={16} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-900/50 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
              <span>{isPlaying ? "Pause Replay" : "Play Timeline"}</span>
            </button>

            <button
              onClick={handleStepNext}
              disabled={currentIndex >= totalEvents - 1}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next Frame"
            >
              <FastForward size={16} />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Reset Timeline to 00:00"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Speed Selector (1x, 2x, 4x) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Speed:</span>
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
