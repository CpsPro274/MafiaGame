
const rooms = new Map();

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId, username, difficulty = "MEDIUM", maxPlayers = 8, extraOptions = {}) {
  const roomCode = extraOptions.roomCode || generateRoomCode();

  const hostPlayer = {
    socketId: socketId || null,
    username: username.trim(),
    isHost: true,
    role: null,
    isAlive: true,
    joinedAt: Date.now()
  };

  const parsedMaxPlayers = parseInt(maxPlayers, 10);
  const validMaxPlayers =
    !isNaN(parsedMaxPlayers) && parsedMaxPlayers >= 2 && parsedMaxPlayers <= 20
      ? parsedMaxPlayers
      : 8;

  let roundTimeLimit = 600;
  if (extraOptions.timeLimit) {
    const parsed = Number(extraOptions.timeLimit);
    if (!isNaN(parsed) && parsed > 0) {
      roundTimeLimit = parsed < 60 ? parsed * 60 : parsed;
    }
  }

  const room = {
    roomCode,
    name: extraOptions.name || extraOptions.roomName || extraOptions.lobbyName || `${username.trim()}'s Room`,
    hostSocketId: socketId || null,
    maxPlayers: validMaxPlayers,
    difficulty: (difficulty || "MEDIUM").toUpperCase(),
    status: "LOBBY",
    phase: "LOBBY",
    players: [hostPlayer],
    challengeId: extraOptions.challengeId || 1,
    timeLimit: roundTimeLimit,
    sabotageDuration: 30,
    votingDuration: 45,
    phaseExpiresAt: null,
    votes: {},
    winnerTeam: null,
    endReason: null,
    createdAt: Date.now()
  };

  rooms.set(roomCode, room);
  console.log(`📋 [Active Rooms]: ${Array.from(rooms.keys()).join(", ")} (Diff: ${room.difficulty})`);
  return { room, player: hostPlayer };
}

export function setRoomDifficulty(roomCode, difficulty) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (room) {
    room.difficulty = (difficulty || "MEDIUM").toUpperCase();
    return room;
  }
  return null;
}

export function joinRoom(roomCode, socketId, username) {
  if (!roomCode || typeof roomCode !== "string") {
    return { error: "Room code is required.", status: 400 };
  }
  const normalizedCode = roomCode.trim().toUpperCase();
  console.log(`🔍 [Join Attempt] Code: "${normalizedCode}", Available Rooms: [${Array.from(rooms.keys()).join(", ")}]`);

  const room = rooms.get(normalizedCode);

  if (!room) {
    return {
      error: `Room "${normalizedCode}" not found. Available active rooms: ${
        rooms.size > 0 ? Array.from(rooms.keys()).join(", ") : "None (Create a room first)"
      }`,
      status: 404
    };
  }

  let finalUsername = (username || "").trim();
  if (!finalUsername) {
    return { error: "Username is required.", status: 400 };
  }

  if (room.status !== "LOBBY") {
    const existingPlayerByName = room.players.find(
      (p) => p.username.toLowerCase() === finalUsername.toLowerCase()
    );

    if (existingPlayerByName) {
      if (socketId) {
        existingPlayerByName.socketId = socketId;
      }
      if (!room.hostSocketId && existingPlayerByName.isHost) {
        room.hostSocketId = socketId || null;
      }
      console.log(`🔄 [Player Reconnected In-Match] ${finalUsername} rejoined Room: ${normalizedCode} (Role: ${existingPlayerByName.role})`);
      return { room, player: existingPlayerByName, reconnected: true };
    }

    return { error: "Match is already in progress in this room.", status: 409 };
  }

  const existingPlayerBySocket = socketId ? room.players.find((p) => p.socketId === socketId) : null;
  if (existingPlayerBySocket) {
    if (finalUsername.toLowerCase() !== existingPlayerBySocket.username.toLowerCase()) {
      let counter = 2;
      const originalName = finalUsername;
      while (room.players.some((p) => p.socketId !== socketId && p.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${originalName} (${counter})`;
        counter++;
      }
      existingPlayerBySocket.username = finalUsername;
    }
    return { room, player: existingPlayerBySocket, reconnected: true };
  }

  if (room.players.length >= room.maxPlayers) {
    return { error: "Room is already full.", status: 409 };
  }

  let counter = 2;
  const originalName = finalUsername;
  while (room.players.some((p) => p.username.toLowerCase() === finalUsername.toLowerCase())) {
    finalUsername = `${originalName} (${counter})`;
    counter++;
  }

  const newPlayer = {
    socketId: socketId || null,
    username: finalUsername,
    isHost: room.players.length === 0,
    role: null,
    isAlive: true,
    joinedAt: Date.now()
  };

  room.players.push(newPlayer);
  if (!room.hostSocketId && socketId) {
    room.hostSocketId = socketId;
  }

  return { room, player: newPlayer };
}

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

  if (room.status !== "LOBBY") {
    if (leftPlayer) {
      leftPlayer.socketId = null;
      console.log(`🔌 [Player Disconnected In-Match] ${leftPlayer.username} left active room: ${targetRoomCode} (Can reconnect)`);
    }
    return { roomCode: targetRoomCode, room, leftPlayer, roomDeleted: false };
  }

  room.players = room.players.filter((p) => p.socketId !== socketId);

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

  if (room.hostSocketId === socketId && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostSocketId = room.players[0].socketId;
  }

  return { roomCode: targetRoomCode, room, leftPlayer, roomDeleted: false };
}

export function startGame(roomCode, hostSocketId) {
  const room = rooms.get(roomCode.trim().toUpperCase());

  if (!room) {
    return { error: "Room not found." };
  }

  if (room.hostSocketId !== hostSocketId) {
    return { error: "Only the room host can start the game." };
  }

  const mafiaCount = Math.max(1, Math.floor(room.players.length / 3));
  const shuffled = [...room.players].sort(() => 0.5 - Math.random());

  const mafiaIds = new Set(shuffled.slice(0, mafiaCount).map((p) => p.socketId));

  room.players.forEach((player) => {
    player.role = mafiaIds.has(player.socketId) ? "MAFIA" : "DEVELOPER";
    player.isAlive = true;
  });

  room.status = "IN_PROGRESS";
  room.phase = "SABOTAGE";
  room.sabotageDuration = 30;
  room.votingDuration = 45;
  room.startedAt = Date.now();
  room.phaseExpiresAt = Date.now() + room.sabotageDuration * 1000;
  room.votes = {};
  room.winnerTeam = null;
  room.endReason = null;

  return { room };
}

export function advanceToDebugPhase(roomCode) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room || room.status === "FINISHED") return null;

  room.phase = "DEBUG";
  room.phaseExpiresAt = Date.now() + (room.timeLimit || 600) * 1000;
  return room;
}

export function advanceToVotingPhase(roomCode) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room || room.status === "FINISHED") return null;

  room.phase = "VOTING";
  room.votingDuration = 45;
  room.phaseExpiresAt = Date.now() + room.votingDuration * 1000;
  room.votes = {};
  return room;
}

export function recordVote(roomCode, voterName, targetUsername) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room || room.phase !== "VOTING") return null;

  const voter = room.players.find((p) => p.username.toLowerCase() === voterName.toLowerCase());
  if (!voter || !voter.isAlive) return null;

  room.votes = room.votes || {};
  room.votes[voter.username] = targetUsername;

  const alivePlayers = room.players.filter((p) => p.isAlive);
  const allVoted = alivePlayers.length > 0 && alivePlayers.every((p) => room.votes[p.username] !== undefined);

  return { room, votes: room.votes, allVoted };
}

export function tallyVotesAndEvaluate(roomCode) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room) return null;

  const voteCounts = {};
  const voters = Object.keys(room.votes || {});

  voters.forEach((voter) => {
    const target = room.votes[voter];
    if (target && target !== "SKIP") {
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let candidatesWithMax = [];
  for (const [target, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidatesWithMax = [target];
    } else if (count === maxVotes) {
      candidatesWithMax.push(target);
    }
  }

  let ejectedPlayer = null;
  let wasMafia = false;

  if (candidatesWithMax.length === 1 && maxVotes > 0) {
    const targetName = candidatesWithMax[0];
    ejectedPlayer = room.players.find((p) => p.username.toLowerCase() === targetName.toLowerCase());
    if (ejectedPlayer && ejectedPlayer.isAlive) {
      ejectedPlayer.isAlive = false;
      wasMafia = ejectedPlayer.role === "MAFIA";
    } else {
      ejectedPlayer = null;
    }
  }

  const aliveMafia = room.players.filter((p) => p.isAlive && p.role === "MAFIA").length;
  const aliveDevs = room.players.filter((p) => p.isAlive && p.role === "DEVELOPER").length;

  let winnerTeam = null;
  let endReason = null;

  if (aliveMafia === 0) {
    winnerTeam = "DEVELOPERS";
    endReason = "All Imposters have been voted out! Developers win!";
  } else if (aliveMafia >= aliveDevs) {
    winnerTeam = "MAFIA";
    endReason = `The Imposters have equaled or outnumbered the Developers (${aliveMafia} vs ${aliveDevs})! Mafia wins!`;
  } else {
    winnerTeam = "MAFIA";
    endReason = "Debugging round expired and the Imposter survived the voting tribunal! Mafia wins!";
  }

  if (winnerTeam) {
    room.status = "FINISHED";
    room.phase = "FINISHED";
    room.winnerTeam = winnerTeam;
    room.endReason = endReason;
  }

  return {
    room,
    ejectedPlayer,
    wasMafia,
    winnerTeam,
    endReason,
    aliveMafia,
    aliveDevs,
    votes: room.votes
  };
}

export function completeGame(roomCode, winnerTeam, endReason) {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room) return null;

  room.status = "FINISHED";
  room.phase = "FINISHED";
  room.winnerTeam = winnerTeam;
  room.endReason = endReason;
  return room;
}

export function getRoom(roomCode) {
  if (!roomCode || typeof roomCode !== "string") return null;
  return rooms.get(roomCode.trim().toUpperCase()) || null;
}

export function getRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return null;
}

export function getAllRooms() {
  return Array.from(rooms.values());
}

