import React,{ useEffect, useState } from "react";
import{ useNavigate } from "react-router-dom";
import styles from "./styles/Lobby.module.css";
import { socket } from "../socket";
import { FlowButton } from "@/components/ui/flow-button";

export default function Lobby(){
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const savedName = sessionStorage.getItem("username") || localStorage.getItem("username") || "";

  const [createForm, setCreateForm] = useState({
    lobbyName: "",
    playerName: savedName,
    maxPlayers: 6,
    mafiaCount: 1,
    difficulty: "MEDIUM",
    timeLimit: 30,
    privateLobby: true,
  });

  const [joinForm, setJoinForm] = useState({
    lobbyCode: "",
    playerName: savedName,
  });

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      console.log("Connected to backend:", socket.id);
      setConnected(true);
      setError("");
    };

    const handleDisconnect = (reason) => {
      console.log("Disconnected:", reason);
      setConnected(false);
    };

    const handleConnectError = (err) => {
      console.error("Socket connection error:", err.message);
      setConnected(false);
      setError("Unable to connect to the game server.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

    };
  }, []);

  const handleCreateChange =(e) =>{
    const{ name, value, type, checked } = e.target;

    setCreateForm((prev) =>({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleJoinChange =(e) =>{
    const{ name, value } = e.target;

    setJoinForm((prev) =>({
      ...prev,
      [name]:
        name === "lobbyCode"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleCreateLobby =(e) =>{
    e.preventDefault();

    setError("");

    if(!socket || !connected){
      setError("Not connected to the game server.");
      return;
    }

    if(!createForm.playerName.trim()){
      setError("Please enter your codename.");
      return;
    }

    setLoading(true);

    socket.emit(
      "room:create",
      {
        username: createForm.playerName.trim(),
        difficulty: createForm.difficulty.toUpperCase(),
        maxPlayers: Number(createForm.maxPlayers),
        timeLimit: Number(createForm.timeLimit),
        mafiaCount: Number(createForm.mafiaCount),
      },
      (response) => {
        setLoading(false);

        console.log("Create room response:", response);

        if(!response?.success){
          setError(
            response?.error ||
              "Failed to create lobby."
          );
          return;
        }

        console.log(
          "Lobby created:",
          response.roomCode
        );

        console.log(
          "Room:",
          response.room
        );
        sessionStorage.setItem("roomCode", response.roomCode);
        sessionStorage.setItem("username", response.player.username);
        localStorage.setItem("roomCode", response.roomCode);
        localStorage.setItem("username", response.player.username);
        navigate(`/room/${response.roomCode}`);
      }
    );
  };
  const handleJoinLobby =(e) =>{
    e.preventDefault();
    setError("");
    if(!socket || !connected){
      setError("Not connected to the game server.");
      return;
    }

    const roomCode = joinForm.lobbyCode.trim().toUpperCase();

    const username = joinForm.playerName.trim();
    if(!roomCode || roomCode.length !== 6){
      setError(
        "Lobby code must be 6 characters."
      );
      return;
    }

    if(!username){
      setError("Please enter your codename.");
      return;
    }

    setLoading(true);
    socket.emit(
      "room:join",
     {
        roomCode,
        username,
      },
     (response)=>{
        setLoading(false);
        console.log(
          "Join room response:",
          response
        );

        if(!response?.success){
          setError(
            response?.error ||
              "Failed to join lobby."
          );
          return;
        }

        console.log("Joined room:", response.roomCode);
        console.log(
          "Room:",
          response.room
        );
        sessionStorage.setItem("roomCode", response.roomCode);
        sessionStorage.setItem("username", response.player.username);
        localStorage.setItem("roomCode", response.roomCode);
        localStorage.setItem("username", response.player.username);

        navigate(`/room/${response.roomCode}`);
      }
    );
  };

  return(
    <div className={styles.page}>
      <div className={styles.gridBackground} />

      <header className={styles.navbar}>
        <div className={styles.brand}>
          <h1>CODE MAFIA</h1>
        </div>

        <div
          style={{
            color: connected
              ? "#22c55e"
              : "#ef4444",
            fontSize: "13px",
          }}
        >
          ●{" "}
         {connected
            ? "SERVER ONLINE"
            : "SERVER OFFLINE"}
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.hero}>
          <h2>Enter the Debugging Arena</h2>
        </section>

        <section className={styles.lobbyCard}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                activeTab === "create"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                setActiveTab("create")
              }
            >
              Create Lobby
            </button>

            <button
              className={`${styles.tab} ${
                activeTab === "join"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                setActiveTab("join")
              }
            >
              Join Lobby
            </button>
          </div>

          {error && (
            <div
              style={{
                margin: "15px 24px",
                padding: "10px 14px",
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

         {activeTab === "create" &&(
            <form
              className={styles.form}
              onSubmit={handleCreateLobby}
            >
              <div className={styles.formHeader}>
                <h3>Create a Lobby</h3>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="lobbyName">
                    Lobby Name
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <span
                      className={
                        styles.inputIcon
                      }
                    >
                      ⌘
                    </span>

                    <input
                      id="lobbyName"
                      name="lobbyName"
                      type="text"
                      placeholder="e.g. Bug Hunters"
                      value={
                        createForm.lobbyName
                      }
                      onChange={
                        handleCreateChange
                      }
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="playerName">
                    Your Codename
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <span
                      className={
                        styles.inputIcon
                      }
                    >
                      ◉
                    </span>

                    <input
                      id="playerName"
                      name="playerName"
                      type="text"
                      placeholder="Enter your codename"
                      value={
                        createForm.playerName
                      }
                      onChange={
                        handleCreateChange
                      }
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="maxPlayers">
                    Maximum Players
                  </label>

                  <select
                    id="maxPlayers"
                    name="maxPlayers"
                    value={
                      createForm.maxPlayers
                    }
                    onChange={
                      handleCreateChange
                    }
                  >
                    <option value="4">
                      4 Players
                    </option>
                    <option value="5">
                      5 Players
                    </option>
                    <option value="6">
                      6 Players
                    </option>
                    <option value="7">
                      7 Players
                    </option>
                    <option value="8">
                      8 Players
                    </option>
                    <option value="10">
                      10 Players
                    </option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="mafiaCount">
                    Mafia Players
                  </label>

                  <select
                    id="mafiaCount"
                    name="mafiaCount"
                    value={
                      createForm.mafiaCount
                    }
                    onChange={
                      handleCreateChange
                    }
                  >
                    <option value="1">
                      1 Mafia
                    </option>
                    <option value="2">
                      2 Mafia
                    </option>
                    <option value="3">
                      3 Mafia
                    </option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="difficulty">
                    Project Difficulty
                  </label>

                  <select
                    id="difficulty"
                    name="difficulty"
                    value={
                      createForm.difficulty
                    }
                    onChange={
                      handleCreateChange
                    }
                  >
                    <option value="EASY">
                      Easy
                    </option>
                    <option value="MEDIUM">
                      Medium
                    </option>
                    <option value="HARD">
                      Hard
                    </option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="timeLimit">
                    Round Duration
                  </label>

                  <select
                    id="timeLimit"
                    name="timeLimit"
                    value={
                      createForm.timeLimit
                    }
                    onChange={
                      handleCreateChange
                    }>
                    <option value="1">
                      1 Minute (Debugg)
                    </option>
                    <option value="5">
                      5 Minutes (Fast Match)
                    </option>
                    <option value="10">
                      10 Minutes
                    </option>
                    <option value="15">
                      15 Minutes
                    </option>
                    <option value="30">
                      30 Minutes
                    </option>
                    <option value="45">
                      45 Minutes
                    </option>
                    <option value="60">
                      60 Minutes
                    </option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={styles.secondaryButton}
                disabled={loading || !connected}>
                  {loading ? "CREATING..." : "CREATE LOBBY"}
              </button>
            </form>
          )}

         {activeTab === "join" &&(
            <form
              className={styles.form}
              onSubmit={handleJoinLobby}
            >
              <div
                className={
                  styles.joinContent
                }
              >
                <h3>Join a Lobby</h3>

                <div
                  className={
                    styles.joinForm
                  }
                >
                  <div
                    className={
                      styles.inputGroup
                    }
                  >
                    <label htmlFor="joinCode">
                      Lobby Access Code
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${styles.codeInput}`}
                    >
                      <span
                        className={
                          styles.inputIcon
                        }
                      >
                        #
                      </span>

                      <input
                        id="joinCode"
                        name="lobbyCode"
                        type="text"
                        placeholder="XXXXXX"
                        maxLength={6}
                        value={
                          joinForm.lobbyCode
                        }
                        onChange={
                          handleJoinChange
                        }
                        required
                      />
                    </div>

                    <span
                      className={
                        styles.inputHint
                      }
                    >
                      Ask the lobby host for
                      the 6-character code.
                    </span>
                  </div>

                  <div
                    className={
                      styles.inputGroup
                    }
                  >
                    <label htmlFor="joinPlayerName">
                      Your Codename
                    </label>

                    <div
                      className={
                        styles.inputWrapper
                      }
                    >
                      <span
                        className={
                          styles.inputIcon
                        }>
                        ◉
                      </span>

                      <input
                        id="joinPlayerName"
                        name="playerName"
                        type="text"
                        placeholder="Enter your codename"
                        value={
                          joinForm.playerName
                        }
                        onChange={
                          handleJoinChange
                        }
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={styles.secondaryButton}
                    disabled={loading || !connected}>
                      {loading ? "JOINING..." : "Enter Lobby"}
                  </button>
                </div>

                <div
                  className={
                    styles.joinDivider
                  }>
                  <span>OR</span>
                </div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    setActiveTab("create")
                  }>
                    Create a New Lobby
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
