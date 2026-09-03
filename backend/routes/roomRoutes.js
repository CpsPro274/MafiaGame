import express from "express";
import jwt from "jsonwebtoken";
import {
  createRoom,
  joinRoom,
  getRoom,
  getAllRooms,
  setRoomDifficulty
} from "../services/roomManager.js";
import {
  saveRoomToDb,
  savePlayerJoinToDb,
  getRoomFromDb
} from "../services/dbRoomService.js";

const router = express.Router();

/**
 * Helper to extract user identity from JWT Authorization header if present
 */
function extractUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_jwt_secret"
    );
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Create a new game room
 * POST /api/create-room (or /api/rooms/create)
 *
 * Body parameters:
 *   - username / playerName (string, required or extracted from Bearer token)
 *   - difficulty (string: EASY, MEDIUM, HARD, optional, default "MEDIUM")
 *   - maxPlayers (number: 2-20, optional, default 8)
 *   - lobbyName / roomName (string, optional)
 *   - mafiaCount (number: optional, default 1)
 *   - timeLimit (number in minutes or seconds: optional, default 600s)
 *   - socketId (string: optional active Socket.IO connection ID)
 */
export async function handleCreateRoom(req, res) {
  try {
    const tokenUser = extractUserFromToken(req);
    const bodyUsername =
      req.body.username ||
      req.body.playerName ||
      req.body.hostName ||
      req.body.user;
    const username = (bodyUsername || tokenUser?.username || "").toString().trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Username or playerName is required to create a room."
      });
    }

    let difficulty = (req.body.difficulty || "MEDIUM").toString().trim().toUpperCase();
    if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
      difficulty = "MEDIUM";
    }

    let maxPlayers = parseInt(req.body.maxPlayers, 10);
    if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 20) {
      maxPlayers = 8;
    }

    let timeLimit = parseInt(req.body.timeLimit, 10);
    if (!isNaN(timeLimit)) {
      if (timeLimit <= 60) {
        timeLimit = timeLimit * 60; // convert minutes to seconds
      }
    } else {
      timeLimit = 600; // 10 minutes default
    }

    const mafiaCount = parseInt(req.body.mafiaCount, 10) || 1;
    const roomName = (
      req.body.lobbyName ||
      req.body.roomName ||
      `${username}'s Room`
    ).toString().trim();
    const socketId = req.body.socketId || null;

    const { room, player } = createRoom(socketId, username, difficulty, maxPlayers, {
      name: roomName,
      mafiaCount,
      timeLimit
    });

    // If client supplied an active socketId, join that socket to the room
    const io = req.app.get("io");
    if (io && socketId) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) {
        sock.join(room.roomCode);
      }
    }

    // Persist room to PostgreSQL in background (with silent fallback)
    saveRoomToDb(room.roomCode, username).catch((err) => {
      console.warn("DB save room fallback:", err.message);
    });

    console.log(`[REST API] Room Created: ${room.roomCode} by ${username}`);

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      roomCode: room.roomCode,
      room: {
        roomCode: room.roomCode,
        name: room.name,
        difficulty: room.difficulty,
        maxPlayers: room.maxPlayers,
        mafiaCount: room.mafiaCount,
        timeLimit: room.timeLimit,
        status: room.status,
        playerCount: room.players.length,
        players: room.players,
        createdAt: room.createdAt
      },
      player
    });
  } catch (err) {
    console.error("Create Room API Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while creating room."
    });
  }
}

/**
 * Join an existing game room
 * POST /api/join-room (or /api/rooms/join)
 *
 * Body parameters:
 *   - roomCode / lobbyCode / code (string, required)
 *   - username / playerName (string, required or extracted from Bearer token)
 *   - socketId (string: optional active Socket.IO connection ID)
 */
export async function handleJoinRoom(req, res) {
  try {
    const tokenUser = extractUserFromToken(req);
    const bodyRoomCode = req.body.roomCode || req.body.lobbyCode || req.body.code;
    const bodyUsername = req.body.username || req.body.playerName || req.body.user;

    const roomCode = (bodyRoomCode || "").toString().trim().toUpperCase();
    const username = (bodyUsername || tokenUser?.username || "").toString().trim();

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        error: "Room code (roomCode or lobbyCode) is required."
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Username or playerName is required to join a room."
      });
    }

    const socketId = req.body.socketId || null;

    let result = joinRoom(roomCode, socketId, username);

    // If not found in memory, try looking up in PostgreSQL DB
    if (result.error && result.error.includes("not found")) {
      const dbRoom = await getRoomFromDb(roomCode);
      if (dbRoom && (dbRoom.status === "LOBBY" || !dbRoom.status)) {
        createRoom(null, dbRoom.host_username || "Host", "MEDIUM", 8, {
          roomCode: dbRoom.room_code,
          name: `${dbRoom.host_username || "Host"}'s Room`
        });
        result = joinRoom(roomCode, socketId, username);
      }
    }

    if (result.error) {
      const statusCode = result.status || (result.error.includes("not found") ? 404 : 409);
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    const { room, player, reconnected } = result;

    // Real-time synchronization
    const io = req.app.get("io");
    if (io) {
      if (socketId) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock) {
          sock.join(room.roomCode);
        }
      }

      // Broadcast join event to connected room members
      io.to(room.roomCode).emit("room:player_joined", {
        player,
        room,
        reconnected: !!reconnected
      });
    }

    // Persist join to DB in background
    savePlayerJoinToDb(room.roomCode, player.username).catch((err) => {
      console.warn("DB save join fallback:", err.message);
    });

    console.log(`[REST API] Player ${player.username} joined Room: ${room.roomCode} (Reconnected: ${!!reconnected})`);

    return res.status(200).json({
      success: true,
      message: reconnected ? "Reconnected to room successfully" : "Joined room successfully",
      roomCode: room.roomCode,
      room: {
        roomCode: room.roomCode,
        name: room.name,
        difficulty: room.difficulty,
        status: room.status,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        players: room.players
      },
      player,
      reconnected: !!reconnected
    });
  } catch (err) {
    console.error("Join Room API Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while joining room."
    });
  }
}

/**
 * List all active rooms
 * GET /api/rooms
 */
export function handleListRooms(req, res) {
  const allRooms = getAllRooms().map((r) => ({
    roomCode: r.roomCode,
    name: r.name,
    difficulty: r.difficulty || "MEDIUM",
    status: r.status,
    playerCount: r.players.length,
    maxPlayers: r.maxPlayers,
    createdAt: r.createdAt
  }));

  return res.json({
    success: true,
    count: allRooms.length,
    rooms: allRooms
  });
}

/**
 * Get details for a specific room
 * GET /api/rooms/:roomCode
 */
export function handleGetRoom(req, res) {
  const roomCode = req.params.roomCode;
  const room = getRoom(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  return res.json({
    success: true,
    roomCode: room.roomCode,
    name: room.name,
    status: room.status,
    difficulty: room.difficulty || "MEDIUM",
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    players: room.players
  });
}

// --------------------------------------------------------------------------
// Route Definitions
// --------------------------------------------------------------------------

// Primary requested endpoints
router.post("/create-room", handleCreateRoom);
router.post("/join-room", handleJoinRoom);

// Method guidance for GET on action endpoints
router.get("/create-room", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Method Not Allowed. Send a POST request to /api/create-room with body: { username, difficulty?, maxPlayers?, lobbyName? }."
  });
});

router.get("/join-room", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Method Not Allowed. Send a POST request to /api/join-room with body: { roomCode, username }."
  });
});

// RESTful aliases & queries
router.post("/rooms/create", handleCreateRoom);
router.post("/rooms/join", handleJoinRoom);
router.get("/rooms", handleListRooms);
router.get("/rooms/:roomCode", handleGetRoom);

export default router;
