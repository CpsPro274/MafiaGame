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
        timeLimit = timeLimit * 60;
      }
    } else {
      timeLimit = 600;
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

    const io = req.app.get("io");
    if (io && socketId) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) {
        sock.join(room.roomCode);
      }
    }

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

    const io = req.app.get("io");
    if (io) {
      if (socketId) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock) {
          sock.join(room.roomCode);
        }
      }

      io.to(room.roomCode).emit("room:player_joined", {
        player,
        room,
        reconnected: !!reconnected
      });
    }

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


router.post("/create-room", handleCreateRoom);
router.post("/join-room", handleJoinRoom);

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

router.post("/rooms/create", handleCreateRoom);
router.post("/rooms/join", handleJoinRoom);
router.get("/rooms", handleListRooms);
router.get("/rooms/:roomCode", handleGetRoom);

export default router;
