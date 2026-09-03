// In-Memory Room Manager for Real-Time Rooms

const rooms = new Map(); // Key: roomCode, Value: Room Object

/**
 * Generate a random 6-character uppercase alphanumeric room code
 */
export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars (0, O, 1, I)
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

/**
 * Create a new room with the creator as Host
 */
export function createRoom(socketId, username, difficulty = "MEDIUM", maxPlayers = 8) {
  const roomCode = generateRoomCode();

  const hostPlayer = {
    socketId,
    username: username.trim(),
    isHost: true,
    role: null, // Assigned on game start ('DEVELOPER' | 'MAFIA')
    isAlive: true,
    joinedAt: Date.now()
  };

  const room = {
    roomCode,
    hostSocketId: socketId,
    maxPlayers,
    difficulty: (difficulty || "MEDIUM").toUpperCase(), // 'EASY' | 'MEDIUM' | 'HARD'
    status: "LOBBY", // 'LOBBY' | 'IN_PROGRESS' | 'FINISHED'
    players: [hostPlayer],
    challengeId: 1,
    timeLimit: 600, // 10 minutes default
    createdAt: Date.now()
  };

  rooms.set(roomCode, room);
  console.log(`📋 [Active Rooms]: ${Array.from(rooms.keys()).join(", ")} (Diff: ${room.difficulty})`);
  return { room, player: hostPlayer };
}

/**
 * Set Room Difficulty
 */
export function setRoomDifficulty(roomCode, difficulty) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (room) {
    room.difficulty = (difficulty || "MEDIUM").toUpperCase();
    return room;
  }
  return null;
}

/**
 * Join an existing room by code
 * Gracefully handles reconnects and auto-suffixes duplicate usernames
 */
export function joinRoom(roomCode, socketId, username) {
  const normalizedCode = roomCode.trim().toUpperCase();
  console.log(`🔍 [Join Attempt] Code: "${normalizedCode}", Available Rooms: [${Array.from(rooms.keys()).join(", ")}]`);

  const room = rooms.get(normalizedCode);

  if (!room) {
    return {
      error: `Room "${normalizedCode}" not found. Available active rooms: ${
        rooms.size > 0 ? Array.from(rooms.keys()).join(", ") : "None (Create a room first)"
      }`
    };
  }

  if (room.status !== "LOBBY") {
    return { error: "Game is already in progress in this room." };
  }

  if (room.players.length >= room.maxPlayers) {
    return { error: "Room is already full." };
  }

  let finalUsername = username.trim();

  // 1. If player with same socket is already in room, update & return
  const existingPlayerBySocket = room.players.find((p) => p.socketId === socketId);
  if (existingPlayerBySocket) {
    existingPlayerBySocket.username = finalUsername;
    return { room, player: existingPlayerBySocket };
  }

  // 2. If username is already taken by another player, auto-assign a friendly suffix (e.g. Alex (2))
  let counter = 2;
  const originalName = finalUsername;
  while (room.players.some((p) => p.username.toLowerCase() === finalUsername.toLowerCase())) {
    finalUsername = `${originalName} (${counter})`;
    counter++;
  }

  const newPlayer = {
    socketId,
    username: finalUsername,
    isHost: room.players.length === 0, // If room was empty, make first joiner host
    role: null,
    isAlive: true,
    joinedAt: Date.now()
  };

  room.players.push(newPlayer);
  if (!room.hostSocketId) {
    room.hostSocketId = socketId;
  }

  return { room, player: newPlayer };
}

/**
 * Leave current room (called explicitly or on socket disconnect)
 * Keeps rooms alive for 10 minutes so page refreshes don't wipe active lobbies
 */
export function leaveRoom(socketId) {
  let targetRoomCode = null;

  for (const [code, room] of rooms.entries()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      targetRoomCode = code;
      break;
    }
  }

  if (!targetRoomCode) return null;

  const room = rooms.get(targetRoomCode);
  const leftPlayer = room.players.find((p) => p.socketId === socketId);
  room.players = room.players.filter((p) => p.socketId !== socketId);

  // If room becomes empty, keep it alive for 10 minutes (prevents accidental delete on page reload)
  if (room.players.length === 0) {
    setTimeout(() => {
      const r = rooms.get(targetRoomCode);
      if (r && r.players.length === 0) {
        rooms.delete(targetRoomCode);
        console.log(`🗑️ [Room Expired] Room ${targetRoomCode} closed after 10m inactivity.`);
      }
    }, 10 * 60 * 1000);

    return { roomCode: targetRoomCode, roomDeleted: false, leftPlayer };
  }

  // If host left, pass host to next player
  if (room.hostSocketId === socketId && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostSocketId = room.players[0].socketId;
  }

  return { roomCode: targetRoomCode, room, leftPlayer, roomDeleted: false };
}

/**
 * Start Match & Secretly Assign Roles
 */
export function startGame(roomCode, hostSocketId) {
  const room = rooms.get(roomCode.trim().toUpperCase());

  if (!room) {
    return { error: "Room not found." };
  }

  if (room.hostSocketId !== hostSocketId) {
    return { error: "Only the room host can start the game." };
  }

  // Assign Mafia (at least 1 Mafia)
  const mafiaCount = Math.max(1, Math.floor(room.players.length / 3));
  const shuffled = [...room.players].sort(() => 0.5 - Math.random());

  const mafiaIds = new Set(shuffled.slice(0, mafiaCount).map((p) => p.socketId));

  room.players.forEach((player) => {
    player.role = mafiaIds.has(player.socketId) ? "MAFIA" : "DEVELOPER";
    player.isAlive = true;
  });

  room.status = "IN_PROGRESS";
  room.startedAt = Date.now();

  return { room };
}

/**
 * Get room state by code
 */
export function getRoom(roomCode) {
  return rooms.get(roomCode.trim().toUpperCase());
}

/**
 * Get room by socket ID
 */
export function getRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return null;
}
