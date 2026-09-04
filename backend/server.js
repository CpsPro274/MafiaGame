import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { execFile } from "child_process";
import vm from "vm";

import { testDbConnection, query } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  getRoom,
  setRoomDifficulty,
  advanceToDebugPhase,
  advanceToVotingPhase,
  recordVote,
  tallyVotesAndEvaluate,
  advanceToNextRound,
  completeGame
} from "./services/roomManager.js";
import {
  saveRoomToDb,
  savePlayerJoinToDb,
  updateMatchStartInDb,
  removePlayerFromDb
} from "./services/dbRoomService.js";
import {
  initTimeline,
  recordEvent,
  getReplay
} from "./services/replayManager.js";
import { getChallengeByDifficulty, getRandomChallengeByDifficulty, CHALLENGES } from "./services/challengeService.js";
import { initScores, awardPoints, awardRoundXp, finalizeMatchScores, getLeaderboard } from "./services/scoreManager.js";

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api", roomRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/matches/:roomCode/replay", (req, res) => {
  const replay = getReplay(req.params.roomCode);
  res.json(replay);
});

app.get("/api/rooms/:roomCode", (req, res) => {
  const room = getRoom(req.params.roomCode);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  res.json({
    roomCode: room.roomCode,
    status: room.status,
    difficulty: room.difficulty || "MEDIUM",
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    timeLimit: room.timeLimit || 1800
  });
});

const PYTHON_CONTAINER_HARNESS = `
import sys, json
from typing import List, Dict, Tuple, Set, Optional, Any

def deep_equal(a, b, tol=1e-5):
    if a == b: return True
    if isinstance(a, (int, float)) and isinstance(b, (int, float)): return abs(a - b) <= tol
    if isinstance(a, dict) and isinstance(b, dict):
        if len(a) != len(b): return False
        return all(k in b and deep_equal(a[k], b[k], tol) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): return False
        # Order-insensitive check for two-element index lists (e.g., LeetCode Two Sum)
        if len(a) == 2 and all(isinstance(x, int) for x in a) and all(isinstance(y, int) for y in b):
            if sorted(a) == sorted(b):
                return True
        return all(deep_equal(x, y, tol) for x, y in zip(a, b))
    return False

try:
    payload = json.loads(sys.stdin.read())
    user_code = payload.get("code", "")
    tests = payload.get("tests", [])
except Exception as e:
    print(json.dumps({"global_error": "Payload parse error: " + str(e)}))
    sys.exit(0)

scope = {
    "List": List,
    "Dict": Dict,
    "Tuple": Tuple,
    "Set": Set,
    "Optional": Optional,
    "Any": Any
}
results = []

try:
    exec(user_code, scope)
    fn = None
    candidate_names = [
        "twoSum", "two_sum",
        "lengthOfLongestSubstring", "length_of_longest_substring",
        "trap", "trapRainWater", "trap_rain_water",
        "calculate_cart_total", "calculateCartTotal",
        "validate_auth_token", "validateAuthToken",
        "process_ledger_transactions", "processLedgerTransactions"
    ]
    # Check for LeetCode class Solution
    if "Solution" in scope and isinstance(scope["Solution"], type):
        try:
            sol_instance = scope["Solution"]()
            for name in candidate_names:
                if hasattr(sol_instance, name) and callable(getattr(sol_instance, name)):
                    fn = getattr(sol_instance, name)
                    break
            if not fn:
                for attr in dir(sol_instance):
                    if not attr.startswith("__") and callable(getattr(sol_instance, attr)):
                        fn = getattr(sol_instance, attr)
                        break
        except Exception:
            pass

    if not fn:
        for name in candidate_names:
            if name in scope and callable(scope[name]):
                fn = scope[name]
                break
    if not fn:
        for k, v in scope.items():
            if callable(v) and not k.startswith("__") and not isinstance(v, type):
                fn = v
                break
    if not fn:
        raise Exception("No callable target function found in submitted Python code.")

    for idx, tc in enumerate(tests):
        inp = tc.get("input", {})
        expected = tc.get("expected")
        try:
            if isinstance(inp, dict):
                try:
                    act = fn(**inp)
                except TypeError:
                    try:
                        act = fn(*inp.values())
                    except TypeError:
                        act = fn(inp)
            elif isinstance(inp, list):
                act = fn(*inp)
            else:
                act = fn(inp)
            passed = deep_equal(act, expected)
            results.append({
                "testCase": idx + 1,
                "name": tc.get("name", "Test Case " + str(idx + 1)),
                "passed": passed,
                "actual": act,
                "expected": expected,
                "input": inp,
                "error": None
            })
        except Exception as e:
            results.append({
                "testCase": idx + 1,
                "name": tc.get("name", "Test Case " + str(idx + 1)),
                "passed": False,
                "actual": None,
                "expected": expected,
                "input": inp,
                "error": str(e)
            })
except Exception as e:
    print(json.dumps({"global_error": str(e)}))
    sys.exit(0)

print(json.dumps({"results": results}))
`;

function parseAndFormatResults(rawStdout, rawStderr, testCases, stdout, stderr, resolve) {
  try {
    const parsed = JSON.parse(rawStdout.trim());
    if (parsed.global_error) {
      stderr += `Execution Exception: ${parsed.global_error}\n`;
      return resolve({
        allPassed: false,
        stdout: stdout + "Execution halted on syntax/runtime error.\n",
        stderr,
        results: testCases.map((tc, idx) => ({
          testCase: idx + 1,
          name: tc.name || `Test Case ${idx + 1}`,
          passed: false,
          actual: null,
          expected: tc.expected,
          input: tc.input,
          error: parsed.global_error
        }))
      });
    }

    const results = parsed.results || [];
    const allPassed = results.length > 0 && results.every((r) => r.passed);
    results.forEach((r) => {
      stdout += `Test ${r.testCase} [${r.name}]: ${r.passed ? "PASSED" : "FAILED"}\n`;
      if (r.error) stderr += `Test ${r.testCase} Exception: ${r.error}\n`;
    });
    stdout += allPassed ? "\nALL UNIT TESTS PASSED!" : "\nSOME TESTS FAILED.";
    resolve({ allPassed, stdout, stderr, results });
  } catch (parseErr) {
    stderr += `Output Parse Error: ${parseErr.message}\n${rawStdout}`;
    resolve({
      allPassed: false,
      stdout: stdout + "Failed to parse test outputs.\n",
      stderr,
      results: testCases.map((tc, idx) => ({
        testCase: idx + 1,
        name: tc.name || `Test Case ${idx + 1}`,
        passed: false,
        actual: null,
        expected: tc.expected,
        input: tc.input,
        error: parseErr.message
      }))
    });
  }
}

function runCodeInContainer(code, testCases) {
  return new Promise((resolve) => {
    let stdout = "🐳 Executing in isolated container (Dockerfile.runner-python)...\n";
    let stderr = "";

    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--memory",
      "128m",
      "runner-python:latest",
      "python3",
      "-c",
      PYTHON_CONTAINER_HARNESS
    ];

    const proc = execFile("docker", dockerArgs, { timeout: 8000, maxBuffer: 1024 * 1024 }, (dockerErr, dockerStdout, dockerStderr) => {
      if (dockerErr) {
        console.warn("Docker execution failed, falling back to local python3:", dockerStderr || dockerErr.message);
        const localProc = execFile("python3", ["-c", PYTHON_CONTAINER_HARNESS], { timeout: 5000, maxBuffer: 1024 * 1024 }, (localErr, localStdout, localStderr) => {
          if (localErr) {
            stderr += `Execution Error: ${localStderr || localErr.message}\n`;
            return resolve({
              allPassed: false,
              stdout: stdout + "Execution failed.\n",
              stderr,
              results: testCases.map((tc, idx) => ({
                testCase: idx + 1,
                name: tc.name || `Test Case ${idx + 1}`,
                passed: false,
                actual: null,
                expected: tc.expected,
                input: tc.input,
                error: localStderr || localErr.message
              }))
            });
          }
          parseAndFormatResults(localStdout, localStderr, testCases, stdout, stderr, resolve);
        });
        localProc.stdin.write(JSON.stringify({ code, tests: testCases }));
        localProc.stdin.end();
        return;
      }

      parseAndFormatResults(dockerStdout, dockerStderr, testCases, stdout, stderr, resolve);
    });

    proc.stdin.write(JSON.stringify({ code, tests: testCases }));
    proc.stdin.end();
  });
}

app.post("/api/run-code", async (req, res) => {
  try {
    const { roomId, userId, code, challengeId, difficulty, submit } = req.body;

    const normCode = roomId ? roomId.toString().trim().toUpperCase() : null;
    const room = normCode ? getRoom(normCode) : null;
    let challenge = room?.challenge;
    if (!challenge && challengeId) {
      challenge = Object.values(CHALLENGES).find((c) => c.id === Number(challengeId));
    }
    if (!challenge) {
      challenge = getChallengeByDifficulty(difficulty || room?.difficulty || "MEDIUM");
    }
    const testCases = challenge?.test_cases || [];

    const { allPassed, stdout, stderr, results } = await runCodeInContainer(code, testCases);

    if (normCode) {
      recordEvent(normCode, {
        author: userId || "Developer",
        action: allPassed ? "TESTS_PASSED" : "TESTS_FAILED",
        details: `${userId || "Developer"} ran test suite (${allPassed ? "PASSED ALL" : "FAILED"})`,
        code
      });

      io.to(normCode).emit("test:run", {
        roomCode: normCode,
        author: userId,
        passed: allPassed,
        code,
        results
      });
    }

    return res.json({
      success: true,
      allPassed,
      stdout,
      stderr,
      results,
      status: allPassed ? "success" : "failed"
    });
  } catch (err) {
    console.error("Run code exception:", err);
    return res.status(500).json({
      success: false,
      allPassed: false,
      stdout: "",
      stderr: err.message || "Failed to execute code in container.",
      results: [],
      status: "error"
    });
  }
});

const roomTimers = new Map();

function clearRoomTimer(roomCode) {
  const norm = roomCode?.trim().toUpperCase();
  if (roomTimers.has(norm)) {
    clearTimeout(roomTimers.get(norm).timer);
    roomTimers.delete(norm);
  }
}

function startDebugPhase(io, roomCode) {
  const norm = roomCode?.trim().toUpperCase();
  clearRoomTimer(norm);

  const room = advanceToDebugPhase(norm);
  if (!room) return;

  console.log(`⏱️ [Phase Changed: DEBUG] Room: ${norm} (${room.timeLimit}s)`);

  const codeToReveal = room.currentCode || room.initialCode || "";

  recordEvent(norm, {
    author: "System",
    authorRole: "SYSTEM",
    action: "PHASE_CHANGE",
    details: "Sabotage phase completed! Infiltrated codebase revealed to all developers.",
    code: codeToReveal
  });

  io.to(norm).emit("room:phase_changed", {
    phase: "DEBUG",
    timeLimit: room.timeLimit,
    phaseExpiresAt: room.phaseExpiresAt,
    code: codeToReveal,
    message: "Sabotage phase completed! Infiltrated codebase has been revealed. All operatives are now authorized to debug."
  });

  // Broadcast the revealed code to the entire room so developers see the mafia's edits now
  io.to(norm).emit("code:updated", {
    code: codeToReveal,
    author: "System",
    activeLines: []
  });

  const timer = setTimeout(() => {
    startVotingPhase(io, norm);
  }, (room.timeLimit || 600) * 1000);

  roomTimers.set(norm, { timer, phase: "DEBUG" });
}

function startVotingPhase(io, roomCode) {
  const norm = roomCode?.trim().toUpperCase();
  clearRoomTimer(norm);

  const room = advanceToVotingPhase(norm);
  if (!room) return;

  console.log(`🚨 [Phase Changed: VOTING] Room: ${norm} (${room.votingDuration}s)`);

  io.to(norm).emit("room:phase_changed", {
    phase: "VOTING",
    votingDuration: room.votingDuration,
    phaseExpiresAt: room.phaseExpiresAt,
    message: "Round time expired! Emergency voting tribunal initiated."
  });

  io.to(norm).emit("meeting:started", {
    callerName: "ROUND_TIMER_EXPIRED",
    meetingDurationSec: room.votingDuration
  });

  const timer = setTimeout(() => {
    finalizeVoting(io, norm);
  }, room.votingDuration * 1000);

  roomTimers.set(norm, { timer, phase: "VOTING" });
}

function finalizeVoting(io, roomCode) {
  const norm = roomCode?.trim().toUpperCase();
  clearRoomTimer(norm);

  const result = tallyVotesAndEvaluate(norm);
  if (!result) return;

  console.log(`⚖️ [Voting Finalized] Room ${norm}: Ejected=${result.ejectedPlayer?.username || "None"}, Winner=${result.winnerTeam || "NONE (continuing)"}`);

  io.to(norm).emit("meeting:result", {
    ejectedPlayer: result.ejectedPlayer ? result.ejectedPlayer.username : null,
    wasMafia: result.wasMafia,
    winnerTeam: result.winnerTeam,
    endReason: result.endReason,
    aliveMafia: result.aliveMafia,
    aliveDevs: result.aliveDevs,
    votes: result.votes,
    continueGame: result.continueGame
  });

  if (result.winnerTeam) {
    // Game over — finalize scores and broadcast
    const finalLeaderboard = finalizeMatchScores(norm, result.winnerTeam);
    io.to(norm).emit("game:finished", {
      winnerTeam: result.winnerTeam,
      endReason: result.endReason,
      replay: getReplay(norm),
      leaderboard: finalLeaderboard
    });
  } else {
    // Game continues! Mafia survived but developers still outnumber them.
    // Award round XP to all alive players (scores are retained across rounds).
    const roundLeaderboard = awardRoundXp(norm, result.ejectedPlayer, result.wasMafia);

    io.to(norm).emit("score:updated", {
      leaderboard: roundLeaderboard,
      reason: "ROUND_END"
    });

    // Short delay to let players see the ejection result, then start next round
    setTimeout(() => {
      startNextRound(io, norm);
    }, 4000);
  }
}

function startNextRound(io, roomCode) {
  const norm = roomCode?.trim().toUpperCase();
  const room = advanceToNextRound(norm);
  if (!room) return;

  // Pick a new challenge that hasn't been used yet this match
  const newChallenge = getRandomChallengeByDifficulty(
    room.difficulty || "MEDIUM",
    room.usedChallengeIds || []
  );

  room.usedChallengeIds = room.usedChallengeIds || [];
  room.usedChallengeIds.push(newChallenge.id);
  room.challenge = newChallenge;
  room.initialCode = newChallenge.buggy_code;
  room.currentCode = newChallenge.buggy_code;

  console.log(`🆕 [New Round] Room: ${norm} → Round ${room.currentRound}, Challenge: "${newChallenge.title}"`);

  recordEvent(norm, {
    author: "System",
    authorRole: "SYSTEM",
    action: "NEXT_ROUND",
    details: `Round ${room.currentRound} started! New challenge: ${newChallenge.title}`,
    code: newChallenge.buggy_code
  });

  // Notify all players about the new round
  room.players.forEach((p) => {
    if (p.socketId) {
      io.to(p.socketId).emit("game:next_round", {
        roomCode: norm,
        currentRound: room.currentRound,
        phase: "SABOTAGE",
        sabotageDuration: room.sabotageDuration,
        phaseExpiresAt: room.phaseExpiresAt,
        challenge: {
          ...newChallenge,
          buggy_code: p.role === "MAFIA" ? room.currentCode : room.initialCode
        },
        leaderboard: getLeaderboard(norm),
        alivePlayers: room.players.filter((pl) => pl.isAlive).map((pl) => ({
          username: pl.username,
          isAlive: pl.isAlive,
          role: pl.socketId === p.socketId ? pl.role : "???"
        }))
      });
    }
  });

  // Start the sabotage timer for this new round
  clearRoomTimer(norm);
  const timer = setTimeout(() => {
    startDebugPhase(io, norm);
  }, room.sabotageDuration * 1000);
  roomTimers.set(norm, { timer, phase: "SABOTAGE" });
}

io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);
  socket.on("room:create", async ({ username, difficulty = "MEDIUM", maxPlayers = 8, timeLimit = 30, mafiaCount = 1 }, callback) => {
    try {
      if (!username || !username.trim()) {
        return callback?.({ success: false, error: "Username is required." });
      }

      const timeLimitSeconds = Number(timeLimit) > 0 ? Number(timeLimit) * 60 : 1800;

      const { room, player } = createRoom(socket.id, username, difficulty, Number(maxPlayers), {
        timeLimit: timeLimitSeconds,
        mafiaCount: Number(mafiaCount)
      });
      socket.join(room.roomCode);
      console.log(`[Room Created] Code: ${room.roomCode} (${room.difficulty}, ${timeLimitSeconds}s duration) by ${username}`);

      callback?.({
        success: true,
        roomCode: room.roomCode,
        room,
        player
      });

      saveRoomToDb(room.roomCode, username).catch(() => {});
    } catch (err) {
      console.error("Create Room Error:", err);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on("room:set_difficulty", ({ roomCode, difficulty }) => {
    const updatedRoom = setRoomDifficulty(roomCode, difficulty);
    if (updatedRoom) {
      io.to(roomCode).emit("room:difficulty_updated", { difficulty: updatedRoom.difficulty, room: updatedRoom });
    }
  });

  socket.on("room:join", async ({ roomCode, username }, callback) => {
    try {
      if (!roomCode || !username) {
        return callback?.({ success: false, error: "Room code and username are required." });
      }

      const result = joinRoom(roomCode, socket.id, username);

      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      const { room, player } = result;
      socket.join(room.roomCode);

      console.log(`[Player Joined] ${username} joined Room: ${room.roomCode}`);

      callback?.({
        success: true,
        roomCode: room.roomCode,
        room,
        player
      });

      socket.to(room.roomCode).emit("room:player_joined", {
        player,
        room
      });

      savePlayerJoinToDb(room.roomCode, username).catch(() => {});
    } catch (err) {
      console.error("Join Room Error:", err);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on("game:start", async ({ roomCode }, callback) => {
    try {
      const result = startGame(roomCode, socket.id);
      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      const { room } = result;

      const challengeData = getChallengeByDifficulty(room.difficulty || "MEDIUM");
      room.challenge = challengeData;
      room.initialCode = challengeData.buggy_code;
      room.currentCode = challengeData.buggy_code;
      room.usedChallengeIds = [challengeData.id];

      initTimeline(room.roomCode, room.initialCode, room.players);
      initScores(room.roomCode, room.players);

      console.log(`[Match Started] Room: ${room.roomCode} (${room.difficulty}) Round ${room.currentRound} - Initial SABOTAGE phase (30s)`);

      clearRoomTimer(room.roomCode);
      const timer = setTimeout(() => {
        startDebugPhase(io, room.roomCode);
      }, room.sabotageDuration * 1000);
      roomTimers.set(room.roomCode, { timer, phase: "SABOTAGE" });

      room.players.forEach((p) => {
        if (p.socketId) {
          io.to(p.socketId).emit("game:started", {
            roomCode: room.roomCode,
            role: p.role,
            phase: "SABOTAGE",
            currentRound: room.currentRound,
            sabotageDuration: room.sabotageDuration,
            phaseExpiresAt: room.phaseExpiresAt,
            room: {
              ...room,
              players: room.players.map((other) => ({
                ...other,
                role: other.socketId === p.socketId ? other.role : "???"
              }))
            },
            challenge: {
              ...challengeData,
              buggy_code: p.role === "MAFIA" ? room.currentCode : room.initialCode
            },
            leaderboard: getLeaderboard(room.roomCode)
          });
        }
      });

      io.to(room.roomCode).emit("room:game_started", {
        roomCode: room.roomCode,
        challenge: {
          ...challengeData,
          buggy_code: room.initialCode
        },
        phase: "SABOTAGE",
        currentRound: room.currentRound,
        sabotageDuration: room.sabotageDuration,
        phaseExpiresAt: room.phaseExpiresAt,
        room
      });

      callback?.({ success: true });
      updateMatchStartInDb(room.roomCode, room.players).catch(() => {});
    } catch (err) {
      console.error("Start Game Error:", err);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on("sabotage:finish_early", ({ roomCode }) => {
    const norm = roomCode?.trim().toUpperCase();
    const room = getRoom(norm);
    if (room && room.phase === "SABOTAGE") {
      console.log(`⏩ [Sabotage Finished Early] Room: ${norm} by Mafia operative`);
      startDebugPhase(io, norm);
    }
  });

  socket.on("code:edit", ({ roomCode, author, authorRole, code, details, activeLines }) => {
    const norm = roomCode?.trim().toUpperCase();
    const room = getRoom(norm);
    if (!room) return;

    if (room.phase === "SABOTAGE") {
      const player = room.players.find(
        (p) => p.socketId === socket.id || p.username?.toLowerCase() === author?.toLowerCase()
      );
      const isMafia = player ? player.role === "MAFIA" : authorRole === "MAFIA";

      // Drop non-mafia edits during sabotage
      if (!isMafia) {
        return;
      }

      // Store secret sabotage code in room
      room.currentCode = code;

      recordEvent(norm, {
        author: "System (Sabotage)",
        authorRole: "MAFIA",
        action: "SABOTAGE_DRAFT",
        details: "Code altered during infiltration window",
        code,
        activeLines
      });

      // DO NOT broadcast to developers!
      // Only broadcast to other mafia members if any
      room.players.forEach((p) => {
        if (p.role === "MAFIA" && p.socketId && p.socketId !== socket.id) {
          io.to(p.socketId).emit("code:updated", { code, author, activeLines });
        }
      });
      return;
    }

    // Normal DEBUG phase
    room.currentCode = code;
    recordEvent(norm, {
      author,
      authorRole,
      action: authorRole === "MAFIA" ? "SABOTAGE" : "CODE_EDIT",
      details,
      code,
      activeLines
    });
    socket.to(norm).emit("code:updated", { code, author, activeLines });
  });

  socket.on("test:run", ({ roomCode, author, authorRole, passed, submit, details, code }) => {
    const norm = roomCode?.trim().toUpperCase();
    const room = getRoom(norm);

    recordEvent(norm, {
      author,
      authorRole,
      action: passed ? "TEST_PASS" : "TEST_FAIL",
      details: details || (passed ? "All tests passed!" : "Tests failed."),
      code
    });

    io.to(norm).emit("test:result", { passed, submit, details, author });

    if (submit && passed && room && room.status === "IN_PROGRESS") {
      clearRoomTimer(norm);
      completeGame(norm, "DEVELOPERS", "All Unit Tests Passed! Developers repaired the codebase before time ran out.");
      const finalLeaderboard = finalizeMatchScores(norm, "DEVELOPERS");
      console.log(`🏆 [Game Concluded: DEVELOPERS WIN] All tests passed in Room: ${norm}`);

      io.to(norm).emit("game:finished", {
        winnerTeam: "DEVELOPERS",
        endReason: "All Unit Tests Passed! Developers successfully repaired the codebase.",
        replay: getReplay(norm),
        leaderboard: finalLeaderboard
      });
    }
  });

  const powerupCooldowns = new Map();

  socket.on("sabotage:trigger", ({ roomCode, ability, senderName, senderRole, targetLines }) => {
    const norm = roomCode?.trim().toUpperCase();
    const room = getRoom(norm);
    const totalTime = room?.timeLimit || 600;
    const cooldownSec = Math.max(15, Math.round(totalTime / 5));
    const cdKey = `${norm}:${senderName}:${ability}`;
    const now = Date.now();

    if (powerupCooldowns.has(cdKey) && powerupCooldowns.get(cdKey) > now) {
      const remainingSec = Math.ceil((powerupCooldowns.get(cdKey) - now) / 1000);
      socket.emit("sabotage:effect", {
        type: "COOLDOWN_ACTIVE",
        durationSec: 3,
        message: `⏳ ${ability} is on cooldown! (${remainingSec}s remaining)`
      });
      return;
    }

    powerupCooldowns.set(cdKey, now + cooldownSec * 1000);
    console.log(`💣 [Sabotage Triggered] Ability: ${ability} by ${senderName} (${senderRole}) in Room: ${norm} (Cooldown: ${cooldownSec}s)`);

    recordEvent(norm, {
      author: senderName,
      authorRole: senderRole,
      action: "SABOTAGE",
      details: `⚡ Tactical Ability Activated: ${ability}`,
      activeLines: targetLines || []
    });

    if (ability === "SCREEN_GLITCH") {
      socket.to(norm).emit("sabotage:effect", {
        type: "SCREEN_GLITCH",
        durationSec: 6,
        message: "⚠️ CRITICAL SYSTEM GLITCH: Matrix interference detected!"
      });
    } else if (ability === "FALSE_GREEN") {
      socket.to(norm).emit("sabotage:effect", {
        type: "FALSE_GREEN",
        durationSec: 15,
        message: "🟢 ALL 3 UNIT TESTS PASSED (Simulated Verification)"
      });
    } else if (ability === "FUNCTION_LOCK") {
      io.to(norm).emit("sabotage:effect", {
        type: "FUNCTION_LOCK",
        durationSec: 10,
        lockedLines: targetLines || [4, 5, 6, 7, 8],
        message: "🔒 FUNCTION LOCKED: Lines 4-8 temporarily frozen for 10 seconds!"
      });
    } else if (ability === "CODE_RADAR") {
      socket.emit("sabotage:effect", {
        type: "CODE_RADAR",
        durationSec: 8,
        message: "🔍 CODE RADAR SCAN: Thermal heat trail revealed recent edits!"
      });
    }
  });

  const roomMeetings = new Map();

  socket.on("meeting:call", ({ roomCode, callerName }) => {
    const norm = roomCode?.trim().toUpperCase();
    if (!roomMeetings.has(norm)) {
      roomMeetings.set(norm, new Set());
    }

    const usedSet = roomMeetings.get(norm);
    if (usedSet.has(callerName)) {
      socket.emit("sabotage:effect", {
        type: "MEETING_BLOCKED",
        durationSec: 3,
        message: "⚠️ Emergency meeting quota spent! (Max 1 per operative per match)"
      });
      return;
    }

    usedSet.add(callerName);
    console.log(`🚨 [Emergency Meeting] Called by ${callerName} in Room ${norm}`);

    recordEvent(norm, {
      author: callerName,
      authorRole: "DEVELOPER",
      action: "MEETING",
      details: `🚨 ${callerName} sounded the Emergency Alarm! Voting tribunal opened.`
    });

    io.to(norm).emit("meeting:started", {
      callerName,
      meetingDurationSec: 45
    });
  });

  socket.on("meeting:vote", ({ roomCode, voterName, targetUsername }) => {
    const norm = roomCode?.trim().toUpperCase();
    const voteRes = recordVote(norm, voterName, targetUsername);
    if (!voteRes) return;

    io.to(norm).emit("meeting:vote_cast", {
      voterName,
      targetUsername,
      votes: voteRes.votes
    });

    if (voteRes.allVoted) {
      console.log(`🗳️ [All Votes Cast] Finalizing voting tribunal for Room: ${norm}`);
      clearRoomTimer(norm);
      setTimeout(() => {
        finalizeVoting(io, norm);
      }, 1200);
    }
  });

  socket.on("meeting:finish", ({ roomCode }) => {
    const norm = roomCode?.trim().toUpperCase();
    finalizeVoting(io, norm);
  });

  socket.on("game:finish", ({ roomCode, winnerTeam, endReason }) => {
    const norm = roomCode?.trim().toUpperCase();
    clearRoomTimer(norm);
    completeGame(norm, winnerTeam, endReason);
    const replay = getReplay(norm);
    const finalLeaderboard = finalizeMatchScores(norm, winnerTeam);

    io.to(norm).emit("game:finished", {
      winnerTeam,
      endReason,
      replay,
      leaderboard: finalLeaderboard
    });
  });

  socket.on("room:leave", async (callback) => {
    await handlePlayerLeave(socket);
    callback?.({ success: true });
  });

  socket.on("disconnect", async () => {
    await handlePlayerLeave(socket);
  });

  async function handlePlayerLeave(socketInstance) {
    const result = leaveRoom(socketInstance.id);
    if (!result) return;

    const { roomCode, room, leftPlayer, roomDeleted } = result;
    socketInstance.leave(roomCode);

    if (leftPlayer?.username) {
      removePlayerFromDb(roomCode, leftPlayer.username).catch(() => {});
    }

    if (roomDeleted) {
      console.log(`[Room Closed] Room ${roomCode} was deleted.`);
    } else {
      console.log(`[Player Left] ${leftPlayer?.username} left Room: ${roomCode}`);
      io.to(roomCode).emit("room:player_left", {
        leftPlayer,
        room
      });
    }
  }
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`Code Mafia Backend running on port ${PORT}`);
  await testDbConnection();
});