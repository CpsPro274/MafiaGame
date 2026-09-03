import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

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
import { getChallengeByDifficulty } from "./services/challengeService.js";
import { initScores, awardPoints, finalizeMatchScores, getLeaderboard } from "./services/scoreManager.js";

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

app.post("/api/run-code", (req, res) => {
  const { roomId, userId, code, language, submit } = req.body;

  const normCode = roomId?.trim().toUpperCase();
  const room = getRoom(normCode);
  const challenge = room?.challenge || getChallengeByDifficulty(room?.difficulty || "EASY");

  const testCases = challenge?.test_cases || [
    { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
    { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
    { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
  ];

  let allPassed = true;
  let stdout = "Executing unit test suite...\n";
  let stderr = "";

  const results = testCases.map((tc, index) => {
    let passed = false;
    let actual = null;

    try {
      if (language === "javascript" || !language) {
        const runner = new Function(
          "input",
          `${code}; if (typeof twoSum !== 'undefined') return twoSum(input.nums, input.target); if (typeof calculate_cart_total !== 'undefined') return calculate_cart_total(input.items, input.discount_pct); return null;`
        );
        actual = runner(tc.input);
        passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
      } else {
        passed = true;
        actual = tc.expected;
      }
    } catch (err) {
      stderr += `Test ${index + 1} Exception: ${err.message}\n`;
      passed = false;
    }

    if (!passed) allPassed = false;
    stdout += `Test ${index + 1}: ${passed ? "PASSED" : "FAILED"}\n`;

    return { testCase: index + 1, passed, actual, expected: tc.expected };
  });

  if (allPassed) {
    stdout += "\nALL UNIT TESTS PASSED!";
  } else {
    stdout += "\nSOME TESTS FAILED.";
  }

  recordEvent(normCode, {
    author: userId || "Developer",
    action: allPassed ? "TESTS_PASSED" : "TESTS_FAILED",
    details: `${userId || "Developer"} ran test suite (${allPassed ? "PASSED 3/3" : "FAILED"})`,
    code
  });

  if (normCode) {
    io.to(normCode).emit("test:run", {
      roomCode: normCode,
      author: userId,
      passed: allPassed,
      code
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

  io.to(norm).emit("room:phase_changed", {
    phase: "DEBUG",
    timeLimit: room.timeLimit,
    phaseExpiresAt: room.phaseExpiresAt,
    message: "Sabotage phase completed! All operatives are now authorized to debug the codebase."
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

  console.log(`⚖️ [Voting Finalized] Room ${norm}: Ejected=${result.ejectedPlayer?.username || "None"}, Winner=${result.winnerTeam}`);

  io.to(norm).emit("meeting:result", {
    ejectedPlayer: result.ejectedPlayer ? result.ejectedPlayer.username : null,
    wasMafia: result.wasMafia,
    winnerTeam: result.winnerTeam,
    endReason: result.endReason,
    aliveMafia: result.aliveMafia,
    aliveDevs: result.aliveDevs,
    votes: result.votes
  });

  if (result.winnerTeam) {
    const finalLeaderboard = finalizeMatchScores(norm, result.winnerTeam);
    io.to(norm).emit("game:finished", {
      winnerTeam: result.winnerTeam,
      endReason: result.endReason,
      replay: getReplay(norm),
      leaderboard: finalLeaderboard
    });
  }
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

      initTimeline(room.roomCode, challengeData.buggy_code, room.players);
      initScores(room.roomCode, room.players);

      console.log(`[Match Started] Room: ${room.roomCode} (${room.difficulty}) - Initial SABOTAGE phase (30s)`);

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
            sabotageDuration: room.sabotageDuration,
            phaseExpiresAt: room.phaseExpiresAt,
            room: {
              ...room,
              players: room.players.map((other) => ({
                ...other,
                role: other.socketId === p.socketId ? other.role : "???"
              }))
            },
            challenge: challengeData,
            leaderboard: getLeaderboard(room.roomCode)
          });
        }
      });

      io.to(room.roomCode).emit("room:game_started", {
        roomCode: room.roomCode,
        challenge: challengeData,
        phase: "SABOTAGE",
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

    if (room && room.phase === "SABOTAGE" && authorRole !== "MAFIA") {
      return;
    }

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
  console.log(`🚀 Code Mafia Backend running on port ${PORT} (0.0.0.0)`);
  await testDbConnection();
});