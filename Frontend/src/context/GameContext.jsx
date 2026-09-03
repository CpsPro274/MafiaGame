import React, { createContext, useContext, useEffect, useState } from "react";
import socket from "../services/socket";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [secretRole, setSecretRole] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [scoreToast, setScoreToast] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
    }

    function onConnect() {
      setIsConnected(true);
      setError(null);
      console.log("Connected to Code Mafia server, ID:", socket.id);
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log("Disconnected from Code Mafia server");
    }

    function onConnectError(err) {
      console.warn("Socket connection error:", err.message);
      setIsConnected(false);
      setError("Cannot reach backend server on http://localhost:5000. Is it running?");
    }

    function onPlayerJoined({ room }) {
      setCurrentRoom(room);
    }

    function onPlayerLeft({ room }) {
      setCurrentRoom(room);
    }

    function onDifficultyUpdated({ difficulty, room }) {
      setCurrentRoom(room);
    }

    function onGameStarted({ role, room, challenge, leaderboard: initialScores }) {
      setSecretRole(role);
      setCurrentRoom(room);
      setActiveChallenge(challenge);
      setLeaderboard(initialScores || []);
      console.log("Game started! Role:", role, "Diff:", room.difficulty);
    }

    function onScoreUpdated({ awardedTo, points, reason, leaderboard: updatedScores }) {
      setLeaderboard(updatedScores || []);
      setScoreToast(`⭐ ${awardedTo} +${points} XP (${reason})`);
      setTimeout(() => setScoreToast(null), 4000);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:player_joined", onPlayerJoined);
    socket.on("room:player_left", onPlayerLeft);
    socket.on("room:difficulty_updated", onDifficultyUpdated);
    socket.on("game:started", onGameStarted);
    socket.on("score:updated", onScoreUpdated);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:player_joined", onPlayerJoined);
      socket.off("room:player_left", onPlayerLeft);
      socket.off("room:difficulty_updated", onDifficultyUpdated);
      socket.off("game:started", onGameStarted);
      socket.off("score:updated", onScoreUpdated);
    };
  }, []);

  // 1. Create Room (with Difficulty Support)
  const createRoom = (username, difficulty = "MEDIUM") => {
    return new Promise((resolve) => {
      setError(null);

      if (!socket.connected) {
        socket.connect();
      }

      let timeoutHandle = setTimeout(() => {
        setError("Server response timed out. Please check backend port 5000.");
        resolve({ success: false });
      }, 5000);

      socket.emit("room:create", { username, difficulty }, (res) => {
        clearTimeout(timeoutHandle);
        if (res?.success) {
          setCurrentRoom(res.room);
          setCurrentPlayer(res.player);
          resolve({ success: true, roomCode: res.roomCode });
        } else {
          setError(res?.error || "Failed to create room.");
          resolve({ success: false, error: res?.error });
        }
      });
    });
  };

  // 2. Set Difficulty (Host only)
  const setDifficulty = (difficulty) => {
    if (!currentRoom) return;
    socket.emit("room:set_difficulty", {
      roomCode: currentRoom.roomCode,
      difficulty
    });
  };

  // 3. Join Room
  const joinRoom = (roomCode, username) => {
    return new Promise((resolve) => {
      setError(null);

      if (!socket.connected) {
        socket.connect();
      }

      let timeoutHandle = setTimeout(() => {
        setError("Server response timed out.");
        resolve({ success: false });
      }, 5000);

      socket.emit("room:join", { roomCode, username }, (res) => {
        clearTimeout(timeoutHandle);
        if (res?.success) {
          setCurrentRoom(res.room);
          setCurrentPlayer(res.player);
          resolve({ success: true, roomCode: res.roomCode });
        } else {
          setError(res?.error || "Failed to join room.");
          resolve({ success: false, error: res?.error });
        }
      });
    });
  };

  // 4. Start Game
  const startGame = () => {
    return new Promise((resolve) => {
      if (!currentRoom) return resolve({ success: false });
      socket.emit("game:start", { roomCode: currentRoom.roomCode }, (res) => {
        if (!res?.success) {
          setError(res?.error || "Failed to start match");
          resolve({ success: false, error: res?.error });
        } else {
          resolve({ success: true });
        }
      });
    });
  };

  // 5. Leave Room
  const leaveRoom = () => {
    socket.emit("room:leave", () => {
      setCurrentRoom(null);
      setCurrentPlayer(null);
      setSecretRole(null);
      setActiveChallenge(null);
      setLeaderboard([]);
    });
  };

  const isHost = currentRoom?.hostSocketId === socket.id;

  return (
    <GameContext.Provider
      value={{
        socket,
        isConnected,
        currentRoom,
        currentPlayer,
        isHost,
        secretRole,
        activeChallenge,
        leaderboard,
        scoreToast,
        error,
        setError,
        createRoom,
        setDifficulty,
        joinRoom,
        startGame,
        leaveRoom
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
