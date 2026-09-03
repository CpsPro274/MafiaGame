import React, { useState } from "react";
import styles from "./styles/Lobby.module.css";

export default function Lobby() {
  const [activeTab, setActiveTab] = useState("create");

  const [createForm, setCreateForm] = useState({
    lobbyName: "",
    playerName: "",
    maxPlayers: 6,
    mafiaCount: 1,
    difficulty: "Medium",
    timeLimit: 30,
    privateLobby: true,
  });

  const [joinForm, setJoinForm] = useState({
    lobbyCode: "",
    playerName: "",
  });

  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;

    setCreateForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleJoinChange = (e) => {
    const { name, value } = e.target;

    setJoinForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateLobby = (e) => {
    e.preventDefault();
    console.log("Create lobby:", createForm);
  };

  const handleJoinLobby = (e) => {
    e.preventDefault();
    console.log("Join lobby:", joinForm);
  };

  return (
    <div className={styles.page}>
      <div className={styles.gridBackground} />

      <header className={styles.navbar}>
        <div className={styles.brand}>
          <h1>CODE MAFIA</h1>
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
                activeTab === "create" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("create")}
            >
              Create Lobby
            </button>

            <button
              className={`${styles.tab} ${
                activeTab === "join" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("join")}
            >
              Join Lobby
            </button>
          </div>

          {activeTab === "create" && (
            <form
              className={styles.form}
              onSubmit={handleCreateLobby}
            >
              <div className={styles.formHeader}>
                <h3>Create a Lobby</h3>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="lobbyName">Lobby Name</label>

                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>⌘</span>

                    <input
                      id="lobbyName"
                      name="lobbyName"
                      type="text"
                      placeholder="e.g. Bug Hunters"
                      value={createForm.lobbyName}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="playerName">
                    Your Codename
                  </label>

                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>◉</span>

                    <input
                      id="playerName"
                      name="playerName"
                      type="text"
                      placeholder="Enter your codename"
                      value={createForm.playerName}
                      onChange={handleCreateChange}
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
                    value={createForm.maxPlayers}
                    onChange={handleCreateChange}
                  >
                    <option value="4">4 Players</option>
                    <option value="5">5 Players</option>
                    <option value="6">6 Players</option>
                    <option value="7">7 Players</option>
                    <option value="8">8 Players</option>
                    <option value="10">10 Players</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="mafiaCount">
                    Mafia Players
                  </label>

                  <select
                    id="mafiaCount"
                    name="mafiaCount"
                    value={createForm.mafiaCount}
                    onChange={handleCreateChange}
                  >
                    <option value="1">1 Mafia</option>
                    <option value="2">2 Mafia</option>
                    <option value="3">3 Mafia</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="difficulty">
                    Project Difficulty
                  </label>

                  <select
                    id="difficulty"
                    name="difficulty"
                    value={createForm.difficulty}
                    onChange={handleCreateChange}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="timeLimit">
                    Round Duration
                  </label>

                  <select
                    id="timeLimit"
                    name="timeLimit"
                    value={createForm.timeLimit}
                    onChange={handleCreateChange}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={styles.primaryButton}
              >
                <span>CREATE LOBBY</span>
                <span className={styles.buttonArrow}>→</span>
              </button>
            </form>
          )}

          {activeTab === "join" && (
            <form
              className={styles.form}
              onSubmit={handleJoinLobby}
            >
              <div className={styles.joinContent}>
                <h3>Join a Lobby</h3>

                <div className={styles.joinForm}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="joinCode">
                      Lobby Access Code
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${styles.codeInput}`}
                    >
                      <span className={styles.inputIcon}>#</span>

                      <input
                        id="joinCode"
                        name="lobbyCode"
                        type="text"
                        placeholder="XXXXXX"
                        maxLength={6}
                        value={joinForm.lobbyCode}
                        onChange={handleJoinChange}
                        required
                      />
                    </div>

                    <span className={styles.inputHint}>
                      Ask the lobby host for the 6-character code.
                    </span>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="joinPlayerName">
                      Your Codename
                    </label>

                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>◉</span>

                      <input
                        id="joinPlayerName"
                        name="playerName"
                        type="text"
                        placeholder="Enter your codename"
                        value={joinForm.playerName}
                        onChange={handleJoinChange}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                  >
                    <span>ENTER LOBBY</span>
                    <span className={styles.buttonArrow}>→</span>
                  </button>
                </div>

                <div className={styles.joinDivider}>
                  <span>OR</span>
                </div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setActiveTab("create")}
                >
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
