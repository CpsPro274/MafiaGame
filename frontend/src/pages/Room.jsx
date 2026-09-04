import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket, getBackendUrl } from "../socket";
import styles from "./styles/Room.module.css";
import { Play, Copy, Check, LogOut, Users } from "lucide-react";

export default function Room() {
  const { roomCode: paramRoomCode } = useParams();
  const navigate = useNavigate();

  const roomCode = (paramRoomCode || sessionStorage.getItem("roomCode") || localStorage.getItem("roomCode") || "").toUpperCase();
  const currentUsername = sessionStorage.getItem("username") || localStorage.getItem("username") || "Developer";

  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    if (!roomCode) {
      navigate("/lobby");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    fetch(`${getBackendUrl()}/api/rooms/${roomCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          if (data.maxPlayers) setMaxPlayers(data.maxPlayers);
        }
      })
      .catch(() => {});

    socket.emit("room:join", { roomCode, username: currentUsername }, (res) => {
      if (res?.success && res.room) {
        setPlayers(res.room.players || []);
        if (res.room.maxPlayers) setMaxPlayers(res.room.maxPlayers);
        if (res.player?.username) {
          sessionStorage.setItem("username", res.player.username);
        }
        const myName = res.player?.username || currentUsername;
        const me = res.room.players.find((p) => p.username.toLowerCase() === myName.toLowerCase());
        if (me?.isHost) setIsHost(true);
      }
    });

    const handlePlayerJoined = ({ player, room }) => {
      if (room?.players) {
        setPlayers(room.players);
      } else if (player) {
        setPlayers((prev) => {
          if (prev.some((p) => p.username === player.username)) return prev;
          return [...prev, player];
        });
      }
    };

    const handlePlayerLeft = ({ leftPlayer, room }) => {
      if (room?.players) {
        setPlayers(room.players);
      } else if (leftPlayer) {
        setPlayers((prev) => prev.filter((p) => p.username !== leftPlayer.username));
      }
    };

    const handleGameStarted = (data) => {
      navigate(`/editor/${roomCode}`, { state: data });
    };

    socket.on("room:player_joined", handlePlayerJoined);
    socket.on("room:player_left", handlePlayerLeft);
    socket.on("game:started", handleGameStarted);
    socket.on("room:game_started", handleGameStarted);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:player_joined", handlePlayerJoined);
      socket.off("room:player_left", handlePlayerLeft);
      socket.off("game:started", handleGameStarted);
      socket.off("room:game_started", handleGameStarted);
    };
  }, [roomCode, currentUsername, navigate]);

  const handleStartGame = () => {
    if (!socket || !connected) {
      setError("Not connected to game server.");
      return;
    }
    setStarting(true);
    setError("");

    socket.emit("game:start", { roomCode }, (response) => {
      setStarting(false);
      if (!response?.success) {
        setError(response?.error || "Failed to start game.");
      } else {
        navigate(`/editor/${roomCode}`);
      }
    });
  };

  const handleCopyCode = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(roomCode).catch(() => {});
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = roomCode;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Copy fallback error:", err);
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    socket.emit("room:leave", () => {
      sessionStorage.removeItem("roomCode");
      localStorage.removeItem("roomCode");
      navigate("/lobby");
    });
    sessionStorage.removeItem("roomCode");
    localStorage.removeItem("roomCode");
    navigate("/lobby");
  };

  const emptySlotsCount = Math.max(0, maxPlayers - players.length);

  return (
    <div className={styles.page}>
      <div className={styles.gridBackground} />

      <header className={styles.navbar}>
        <div className={styles.brand}>
          <h1>CODE MAFIA</h1>
        </div>

        <div style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: "13px" }}>
          ● {connected ? "SERVER ONLINE" : "SERVER OFFLINE"}
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.hero}>
          <h2>Lobby Waiting Area</h2>
          <p className={styles.heroSubtitle}>
            Gather your team of developers before initializing the debugging session.
          </p>
        </section>

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "10px 16px",
              color: "#dc2626",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "500"
            }}
          >
            {error}
          </div>
        )}

        <section className={styles.roomCard}>
          <div className={styles.headerRow}>
            <div className={styles.developerCount}>
              <Users size={20} />
              <h3>Developers Present</h3>
              <span className={styles.countBadge}>
                {players.length} / {maxPlayers}
              </span>
            </div>

            <div className={styles.codeBox}>
              <span className={styles.codeLabel}>Room Code:</span>
              <span className={styles.codeValue}>{roomCode}</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
                onClick={handleCopyCode}
                text="Copy Room Code"
              >
                {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className={styles.playersSection}>
            <div className={styles.playersSectionTitle}>Joined Operatives</div>

            <div className={styles.playerGrid}>
              {players.map((p, idx) => (
                <div className={styles.playerCard} key={p.socketId || p.username || idx}>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerDot} />
                    <span className={styles.playerName}>{p.username}</span>
                  </div>
                  {p.isHost && <span className={styles.hostTag}>HOST</span>}
                </div>
              ))}

              {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                <div className={styles.emptySlot} key={`empty-${idx}`}>
                  Waiting for player...
                </div>
              ))}
            </div>
          </div>

          <div className={styles.actionsRow}>
            {isHost ? (
              <button
                type="button"
                className={styles.startButton}
                onClick={handleStartGame}
                disabled={starting || !connected}
              >
                <Play size={18} />
                <span>{starting ? "INITIALIZING..." : "START MATCH"}</span>
              </button>
            ) : (
              <button type="button" className={styles.startButton} disabled>
                <span>WAITING FOR HOST TO START...</span>
              </button>
            )}

            <div className={styles.secondaryActions}>
              <button type="button" className={styles.leaveButton} onClick={handleLeaveRoom}>
                <LogOut size={16} style={{ marginRight: "6px" }} />
                Leave Room
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
