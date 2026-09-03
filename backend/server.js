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
  setRoomDifficulty
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
import { initScores, awardPoints, getLeaderboard } from "./services/scoreManager.js";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

// Provide io instance to Express routes
app.set("io", io);

// ==========================================
// REST API ROUTES
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api", roomRoutes); // Mounts /api/create-room, /api/join-room, /api/rooms

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fetch Replay Timeline for a match
app.get("/api/matches/:roomCode/replay", (req, res) => {
  const replay = getReplay(req.params.roomCode);
  res.json(replay);
});

// Check if a room exists before joining
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
    maxPlayers: room.maxPlayers
  });
});

// ==========================================
// REAL-TIME SOCKET.IO ROOM & GAMEPLAY EVENTS
// ==========================================
io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);
  socket.on("room:create", async ({ username, difficulty = "MEDIUM", maxPlayers=8 }, callback) => {
    try {
      if (!username || !username.trim()) {
        return callback?.({ success: false, error: "Username is required." });
      }

      const { room, player } = createRoom(socket.id, username, difficulty, Number(maxPlayers));
      socket.join(room.roomCode);
      console.log(`[Room Created] Code: ${room.roomCode} (${room.difficulty}) by ${username}`);

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

  // 2. SET DIFFICULTY IN LOBBY
  socket.on("room:set_difficulty", ({ roomCode, difficulty }) => {
    const updatedRoom = setRoomDifficulty(roomCode, difficulty);
    if (updatedRoom) {
      io.to(roomCode).emit("room:difficulty_updated", { difficulty: updatedRoom.difficulty, room: updatedRoom });
    }
  });

  // 3. JOIN ROOM
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

  // 4. START MATCH & LOAD CHALLENGE BY DIFFICULTY
  socket.on("game:start", async ({ roomCode }, callback) => {
    try {
      const result = startGame(roomCode, socket.id);
      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      const { room } = result;

      // Load curated challenge based on selected difficulty (EASY, MEDIUM, HARD)
      const challengeData = getChallengeByDifficulty(room.difficulty || "MEDIUM");

      // Initialize Replay Timeline & Points Manager
      initTimeline(room.roomCode, challengeData.buggy_code, room.players);
      initScores(room.roomCode, room.players);

      console.log(`[Match Started] Room: ${room.roomCode} (${room.difficulty}) with ${room.players.length} players`);

      // Emit secret role individually
      room.players.forEach((p) => {
        io.to(p.socketId).emit("game:started", {
          roomCode: room.roomCode,
          role: p.role,
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
      });

      callback?.({ success: true });
      updateMatchStartInDb(room.roomCode, room.players).catch(() => {});
    } catch (err) {
      console.error("Start Game Error:", err);
      callback?.({ success: false, error: err.message });
    }
  });

  // 5. CODE EDIT IN COLLABORATIVE BUFFER
  socket.on("code:edit", ({ roomCode, author, authorRole, code, details, activeLines }) => {
    recordEvent(roomCode, {
      author,
      authorRole,
      action: authorRole === "MAFIA" ? "SABOTAGE" : "CODE_EDIT",
      details,
      code,
      activeLines
    });
    socket.to(roomCode).emit("code:updated", { code, author, activeLines });
  });

  // 6. TEST RUN EXECUTION & XP AWARDING
  socket.on("test:run", ({ roomCode, author, authorRole, passed, details, code }) => {
    recordEvent(roomCode, {
      author,
      authorRole,
      action: passed ? "TEST_PASS" : "TEST_FAIL",
      details: details || (passed ? "All tests passed!" : "Tests failed."),
      code
    });

    // Award +150 XP if developer passes tests
    if (passed && authorRole === "DEVELOPER") {
      const scoreRes = awardPoints(roomCode, author, 150, "TEST_PASS");
      if (scoreRes) {
        io.to(roomCode).emit("score:updated", {
          awardedTo: author,
          points: 150,
          reason: "Fixed unit test suite! (+150 XP)",
          leaderboard: scoreRes.allScores
        });
      }
    }

    io.to(roomCode).emit("test:result", { passed, details, author });
  });

  // 7. TACTICAL SABOTAGE ABILITIES & XP
  socket.on("sabotage:trigger", ({ roomCode, ability, senderName, senderRole, targetLines }) => {
    console.log(`💣 [Sabotage Triggered] Ability: ${ability} by ${senderName} (${senderRole}) in Room: ${roomCode}`);

    recordEvent(roomCode, {
      author: senderName,
      authorRole: senderRole,
      action: "SABOTAGE",
      details: `⚡ Tactical Ability Activated: ${ability}`,
      activeLines: targetLines || []
    });

    // Award Mafia +200 XP for executing a tactical sabotage
    if (senderRole === "MAFIA") {
      const scoreRes = awardPoints(roomCode, senderName, 200, "SABOTAGE");
      if (scoreRes) {
        io.to(roomCode).emit("score:updated", {
          awardedTo: senderName,
          points: 200,
          reason: `Executed ${ability} Sabotage! (+200 XP)`,
          leaderboard: scoreRes.allScores
        });
      }
    }

    // Broadcast effect
    if (ability === "SCREEN_GLITCH") {
      socket.to(roomCode).emit("sabotage:effect", {
        type: "SCREEN_GLITCH",
        durationSec: 6,
        message: "⚠️ CRITICAL SYSTEM GLITCH: Matrix interference detected!"
      });
    } else if (ability === "FALSE_GREEN") {
      socket.to(roomCode).emit("sabotage:effect", {
        type: "FALSE_GREEN",
        durationSec: 15,
        message: "🟢 ALL 3 UNIT TESTS PASSED (Simulated Verification)"
      });
    } else if (ability === "FUNCTION_LOCK") {
      io.to(roomCode).emit("sabotage:effect", {
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

  // Map to track emergency meetings used per room (Key: roomCode, Value: Set of usernames)
  const roomMeetings = new Map();

  // 8. EMERGENCY MEETING & ELIMINATION VOTING
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
    io.to(norm).emit("meeting:vote_cast", {
      voterName,
      targetUsername
    });
  });

  socket.on("meeting:finish", ({ roomCode, ejectedPlayer, wasMafia, votersWhoVotedCorrectly = [] }) => {
    const norm = roomCode?.trim().toUpperCase();

    // Award +300 XP to detectives who voted correctly
    if (wasMafia && votersWhoVotedCorrectly.length > 0) {
      votersWhoVotedCorrectly.forEach((voter) => {
        awardPoints(norm, voter, 300, "VOTE_CORRECT");
      });
    }

    io.to(norm).emit("meeting:ejected", {
      ejectedPlayer,
      wasMafia,
      leaderboard: getLeaderboard(norm)
    });
  });

  // 9. FINISH MATCH
  socket.on("game:finish", ({ roomCode, winnerTeam, endReason }) => {
    const replay = getReplay(roomCode);
    const leaderboard = getLeaderboard(roomCode);

    io.to(roomCode).emit("game:finished", {
      winnerTeam, // 'DEVELOPERS' | 'MAFIA'
      endReason,
      replay,
      leaderboard
    });
  });

  // 10. LEAVE ROOM
  socket.on("room:leave", async (callback) => {
    await handlePlayerLeave(socket);
    callback?.({ success: true });
  });

  // 11. DISCONNECT
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

httpServer.listen(PORT, "localhost", async () => {
  console.log(`🚀 Code Mafia Backend running on http://localhost:${PORT}`);
  await testDbConnection();
});