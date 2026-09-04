import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Timer,
  RotateCcw,
  Code2,
  PlayCircle,
  Send,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import styles from "./styles/editor.module.css";
import { socket as sharedSocket, getBackendUrl } from "../socket";

const API_URL = getBackendUrl();

const STARTER_TEMPLATES = {
  javascript: `function twoSum(nums, target) {
    return [];
}
`,

  python: `def twoSum(nums, target):
    return []
`,
};

export default function MonacoEditorPage() {
  const params = useParams();
  const location = useLocation();
  const initialGameData = location.state;

  const roomCode = (params.roomCode || params.gameId || sessionStorage.getItem("roomCode") || localStorage.getItem("roomCode") || "").toUpperCase();
  const username = sessionStorage.getItem("username") || localStorage.getItem("username");

  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const phaseRef = useRef(initialGameData?.phase || "SABOTAGE");
  const playerRoleRef = useRef(initialGameData?.role || "DEVELOPER");

  const initialChallenge = initialGameData?.challenge || null;
  const initialLang = initialChallenge?.language?.toLowerCase() === "python" ? "python" : "javascript";
  const initialCode = initialChallenge?.buggy_code || STARTER_TEMPLATES[initialLang];

  const [language, setLanguage] = useState(initialLang);
  const [code, setCode] = useState(initialCode);

  const [connected, setConnected] = useState(sharedSocket?.connected || false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [players, setPlayers] = useState(initialGameData?.room?.players || []);
  const [phase, setPhase] = useState(initialGameData?.phase || "SABOTAGE");
  const [phaseSeconds, setPhaseSeconds] = useState(
    initialGameData?.phase === "DEBUG"
      ? (initialGameData?.room?.timeLimit || 600)
      : (initialGameData?.sabotageDuration || 30)
  );

  const [challenge, setChallenge] = useState(initialChallenge);
  const [loadingChallenge, setLoadingChallenge] = useState(!initialChallenge);
  const [challengeError, setChallengeError] = useState("");

  const [playerRole, setPlayerRole] = useState(initialGameData?.role || "DEVELOPER");

  const DEFAULT_TESTS = [
    { id: 1, name: "Test Case 1", input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1], status: "NOT RUN" },
    { id: 2, name: "Test Case 2", input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2], status: "NOT RUN" },
    { id: 3, name: "Test Case 3", input: { nums: [3, 3], target: 6 }, expected: [0, 1], status: "NOT RUN" }
  ];

  const [testCases, setTestCases] = useState(DEFAULT_TESTS);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([
    { author: "System", action: "Match initialized. Testing suite ready.", time: "00:00" }
  ]);
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [ejectionResult, setEjectionResult] = useState(null);
  const [victoryData, setVictoryData] = useState(null);
  const [currentRound, setCurrentRound] = useState(initialGameData?.currentRound || 1);
  const [roundTransition, setRoundTransition] = useState(null);

  const [isGlitched, setIsGlitched] = useState(false);
  const [isFalseGreen, setIsFalseGreen] = useState(false);
  const [isFunctionLocked, setIsFunctionLocked] = useState(false);
  const [sabotageBanner, setSabotageBanner] = useState("");
  const [cooldowns, setCooldowns] = useState({
    SCREEN_GLITCH: 0,
    FALSE_GREEN: 0,
    FUNCTION_LOCK: 0,
    CODE_RADAR: 0
  });

  const [mobileTab, setMobileTab] = useState("code"); // "code" | "tests" | "challenge"
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mobileTab === "code" && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.layout();
      }, 80);
    }
  }, [mobileTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Keep refs in sync so socket handlers always read the latest values
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);

  const formatTime = (totalSecs) => {
    if (!totalSecs || totalSecs <= 0) return "00:00:00";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor(
      (totalSecs % 3600) / 60
    );
    const secs = totalSecs % 60;

    return [hrs, mins, secs]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  };

  const formatCompactTime = (totalSecs) => {
    if (!totalSecs || totalSecs <= 0) return "00:00";
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!roomCode || !username) {
      console.warn(
        "No roomCode or username found. Running in local mode."
      );
      return;
    }

    const socket = sharedSocket;
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const joinEditorRoom = () => {
      socket.emit(
        "room:join",
        {
          roomCode,
          username,
        },
        (response) => {
          console.log("Editor Room rejoin:", response);

          if (!response?.success) {
            console.error("Join error:", response?.error);
            return;
          }

          setConnected(true);
          setPlayers(response.room?.players || []);
          if (response.room?.phase) {
            setPhase(response.room.phase);
            if (response.room.phaseExpiresAt) {
              const rem = Math.max(0, Math.round((response.room.phaseExpiresAt - Date.now()) / 1000));
              setPhaseSeconds(rem);
            }
          }

          const myPlayer = response.room?.players?.find(
            (p) => p.username?.toLowerCase() === username?.toLowerCase()
          );
          if (myPlayer?.role && myPlayer.role !== "???") {
            setPlayerRole(myPlayer.role);
          }
        }
      );
    };

    if (socket.connected) {
      setConnected(true);
      joinEditorRoom();
    }

    const handleConnect = () => {
      console.log("Connected to backend:", socket.id);
      setConnected(true);
      joinEditorRoom();
    };

    socket.on("connect", handleConnect);

    socket.on("code:updated", ({ code: remoteCode, author, activeLines }) => {
      console.log(`[Collab Sync] Code updated by ${author}`, activeLines);
      if (typeof remoteCode !== "string") return;

      // REQUIREMENT 1: When in SABOTAGE phase, developers must NOT see mafia edits!
      // Use refs to avoid stale closure — phase/playerRole change after initial mount
      if (phaseRef.current === "SABOTAGE" && playerRoleRef.current !== "MAFIA") {
        return;
      }

      isRemoteUpdate.current = true;
      setCode(remoteCode);
      if (editorRef.current && editorRef.current.getValue() !== remoteCode) {
        editorRef.current.setValue(remoteCode);
      }
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 50);
    });

    socket.on("test:result", ({ passed, details, author, results }) => {
      console.log(`[Test Sync] Live test result from ${author}:`, passed);
      setAllTestsPassed(passed);

      if (results && Array.isArray(results)) {
        setTestCases(
          results.map((r, idx) => ({
            id: idx + 1,
            name: r.name || `Test Case ${idx + 1}`,
            input: r.input !== undefined ? r.input : testCases[idx]?.input,
            expected: r.expected,
            actual: r.actual,
            status: r.passed ? "PASSED" : "FAILED",
            passed: r.passed,
            error: r.error
          }))
        );
      } else {
        setTestCases((prev) =>
          prev.map((tc) => ({
            ...tc,
            status: passed ? "PASSED" : "FAILED",
            passed
          }))
        );
      }

      if (author === username) {
        setExecutionResult({
          status: passed ? "success" : "failed",
          passed: Boolean(passed),
          stdout: details || "",
          stderr: ""
        });
      }

      setAuditLogs((prev) => [
        ...prev,
        {
          author: author || "Operative",
          action: passed ? "Ran test suite (All Passed)" : "Ran test suite (Failed)",
          time: new Date().toLocaleTimeString()
        }
      ]);
    });

    socket.on("sabotage:effect", ({ type, durationSec = 6, message }) => {
      setSabotageBanner(message || "Tactical Sabotage Triggered!");

      if (type === "SCREEN_GLITCH") {
        setIsGlitched(true);
        setTimeout(() => setIsGlitched(false), (durationSec || 6) * 1000);
      } else if (type === "FALSE_GREEN") {
        setIsFalseGreen(true);
        setTimeout(() => setIsFalseGreen(false), (durationSec || 15) * 1000);
      } else if (type === "FUNCTION_LOCK") {
        setIsFunctionLocked(true);
        setTimeout(() => setIsFunctionLocked(false), (durationSec || 10) * 1000);
      }

      setTimeout(() => setSabotageBanner(""), (durationSec || 6) * 1000);
    });

    socket.on(
      "room:player_joined",
      (data) => {
        console.log(
          "Player joined:",
          data
        );

        if (data?.room?.players) {
          setPlayers(
            data.room.players
          );
        }
      }
    );

    socket.on(
      "room:player_left",
      (data) => {
        console.log(
          "Player left:",
          data
        );

        if (data?.room?.players) {
          setPlayers(
            data.room.players
          );
        }
      }
    );

    const handleGameStartedEvent = (data) => {
      console.log("Game started event:", data);

      if (data?.role) {
        setPlayerRole(data.role);
      }

      if (data?.room?.players) {
        setPlayers(data.room.players);
      }

      if (data?.phase) {
        setPhase(data.phase);
        if (data.phase === "SABOTAGE") {
          setPhaseSeconds(data.sabotageDuration || 30);
        } else if (data.phase === "DEBUG") {
          setPhaseSeconds(data.room?.timeLimit || 600);
        }
      }

      if (data?.challenge) {
        const challengeData = data.challenge;
        setChallenge(challengeData);

        const challengeLanguage =
          challengeData.language?.toLowerCase() === "python"
            ? "python"
            : "javascript";

        const challengeCode =
          challengeData.buggy_code ||
          STARTER_TEMPLATES[challengeLanguage] ||
          "";

        setLanguage(challengeLanguage);
        setCode(challengeCode);

        if (challengeData.test_cases && Array.isArray(challengeData.test_cases)) {
          setTestCases(
            challengeData.test_cases.map((tc, idx) => ({
              id: idx + 1,
              name: tc.name || `Test Case ${idx + 1}`,
              input: tc.input,
              expected: tc.expected,
              actual: undefined,
              status: "NOT RUN",
              passed: false
            }))
          );
        }

        if (editorRef.current) {
          isRemoteUpdate.current = true;
          editorRef.current.setValue(challengeCode);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 0);
        }
      }

      setLoadingChallenge(false);
    };

    const handlePhaseChanged = (data) => {
      console.log("Room phase changed:", data);
      if (data?.phase) {
        setPhase(data.phase);
        if (data.phase === "DEBUG") {
          setPhaseSeconds(data.timeLimit || 600);
          setShowVotingModal(false);

          // Reveal the code that the mafia edited during sabotage
          if (data.code && typeof data.code === "string") {
            isRemoteUpdate.current = true;
            setCode(data.code);
            if (editorRef.current) {
              editorRef.current.setValue(data.code);
            }
            setTimeout(() => {
              isRemoteUpdate.current = false;
            }, 50);
          }
        } else if (data.phase === "VOTING") {
          setPhaseSeconds(data.votingDuration || 45);
          setShowVotingModal(true);
          setVotes({});
          setHasVoted(false);
          setEjectionResult(null);
        } else if (data.phase === "FINISHED") {
          setPhaseSeconds(0);
        }
      }
    };

    const handleMeetingStarted = (data) => {
      console.log("Meeting started:", data);
      setPhase("VOTING");
      setShowVotingModal(true);
      setPhaseSeconds(data.meetingDurationSec || 45);
      setVotes({});
      setHasVoted(false);
      setEjectionResult(null);
    };

    const handleVoteCast = (data) => {
      console.log("Vote cast update:", data);
      if (data?.votes) {
        setVotes(data.votes);
      } else if (data?.voterName && data?.targetUsername) {
        setVotes((prev) => ({ ...prev, [data.voterName]: data.targetUsername }));
      }
    };

    const handleMeetingResult = (data) => {
      console.log("Meeting result:", data);
      setEjectionResult({
        ejectedPlayer: data.ejectedPlayer,
        wasMafia: data.wasMafia,
        message: data.ejectedPlayer
          ? `${data.ejectedPlayer} was ejected! They were ${data.wasMafia ? "the MAFIA! 😈" : "a DEVELOPER. 😇"}`
          : "No consensus reached. Nobody was ejected."
      });

      if (data.continueGame) {
        // Game continues — show transition message, next round is coming
        setTimeout(() => {
          setRoundTransition({
            message: data.ejectedPlayer
              ? `${data.ejectedPlayer} was ejected but the Imposter(s) are still at large! Next round incoming...`
              : "No one was ejected. The Imposter(s) remain hidden! Preparing next round...",
            wasMafia: data.wasMafia
          });
          setShowVotingModal(false);
        }, 2500);
      } else if (data.winnerTeam) {
        setTimeout(() => {
          setVictoryData({
            winnerTeam: data.winnerTeam,
            message: data.endReason || (data.winnerTeam === "DEVELOPERS" ? "Developers Win!" : "Mafia Wins!")
          });
        }, 2200);
      }
    };

    const handleGameFinished = (data) => {
      console.log("Game finished:", data);
      setPhase("FINISHED");
      setRoundTransition(null);
      setVictoryData({
        winnerTeam: data.winnerTeam,
        message: data.endReason || (data.winnerTeam === "DEVELOPERS" ? "Developers Win!" : "Mafia Wins!")
      });
    };

    const handleNextRound = (data) => {
      console.log("Next round:", data);

      // Clear previous round state
      setRoundTransition(null);
      setShowVotingModal(false);
      setVotes({});
      setHasVoted(false);
      setEjectionResult(null);
      setVictoryData(null);
      setExecutionResult(null);
      setAllTestsPassed(false);

      // Update round counter
      setCurrentRound(data.currentRound || 1);

      // Update phase
      setPhase(data.phase || "SABOTAGE");
      setPhaseSeconds(data.sabotageDuration || 30);

      // Load new challenge
      if (data.challenge) {
        const challengeData = data.challenge;
        setChallenge(challengeData);

        const challengeLanguage =
          challengeData.language?.toLowerCase() === "python" ? "python" : "javascript";
        const challengeCode = challengeData.buggy_code || STARTER_TEMPLATES[challengeLanguage] || "";

        setLanguage(challengeLanguage);
        setCode(challengeCode);

        if (challengeData.test_cases && Array.isArray(challengeData.test_cases)) {
          setTestCases(
            challengeData.test_cases.map((tc, idx) => ({
              id: idx + 1,
              name: tc.name || `Test Case ${idx + 1}`,
              input: tc.input,
              expected: tc.expected,
              actual: undefined,
              status: "NOT RUN",
              passed: false
            }))
          );
        }

        if (editorRef.current) {
          isRemoteUpdate.current = true;
          editorRef.current.setValue(challengeCode);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 50);
        }
      }

      // Update audit logs
      setAuditLogs((prev) => [
        ...prev,
        {
          author: "System",
          action: `Round ${data.currentRound} started! New challenge loaded.`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    };

    socket.on("game:started", handleGameStartedEvent);
    socket.on("room:game_started", handleGameStartedEvent);
    socket.on("room:phase_changed", handlePhaseChanged);
    socket.on("meeting:started", handleMeetingStarted);
    socket.on("meeting:vote_cast", handleVoteCast);
    socket.on("meeting:result", handleMeetingResult);
    socket.on("game:finished", handleGameFinished);
    socket.on("game:next_round", handleNextRound);

    socket.on(
      "score:updated",
      (data) => {
        console.log(
          "Score updated:",
          data
        );

      }
    );

    socket.on(
      "game:error",
      ({ message }) => {
        console.error(
          "Game error:",
          message
        );

        setExecutionResult({
          status: "error",
          passed: false,
          stdout: "",
          stderr:
            message ||
            "Game error",
        });
      }
    );

    socket.on(
      "code:error",
      ({ message }) => {
        console.error(
          "Code error:",
          message
        );

        setExecutionResult({
          status: "error",
          passed: false,
          stdout: "",
          stderr:
            message ||
            "Code error",
        });
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Disconnected from backend:",
          reason
        );

        setConnected(false);
      }
    );

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error.message
        );

        setConnected(false);
      }
    );

    return () => {
      console.log("Cleaning up editor socket listeners.");
      socket.off("connect", handleConnect);
      socket.off("code:updated");
      socket.off("test:result");
      socket.off("sabotage:effect");
      socket.off("room:player_joined");
      socket.off("room:player_left");
      socket.off("game:started");
      socket.off("room:game_started");
      socket.off("room:phase_changed");
      socket.off("meeting:started");
      socket.off("meeting:vote_cast");
      socket.off("meeting:result");
      socket.off("game:finished");
      socket.off("game:next_round");
      socket.off("score:updated");
      socket.off("game:error");
      socket.off("code:error");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [roomCode, username]);

  useEffect(() => {
    if (!roomCode || challenge) {
      setLoadingChallenge(false);
      return;
    }

    const loadChallenge = async () => {
      try {
        setLoadingChallenge(true);
        setChallengeError("");

        const response =
          await fetch(
            `${API_URL}/api/challenges/${roomCode}`,
            {
              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load challenge"
          );
        }

        setChallenge(data);

        if (data.test_cases && Array.isArray(data.test_cases)) {
          setTestCases(
            data.test_cases.map((tc, idx) => ({
              id: idx + 1,
              name: tc.name || `Test Case ${idx + 1}`,
              input: tc.input,
              expected: tc.expected,
              actual: undefined,
              status: "NOT RUN",
              passed: false
            }))
          );
        }

        const challengeLanguage =
          data.language?.toLowerCase() ===
          "python"
            ? "python"
            : "javascript";

        const challengeCode =
          data.buggy_code ||
          STARTER_TEMPLATES[
            challengeLanguage
          ] ||
          "";

        setLanguage(
          challengeLanguage
        );

        setCode(
          challengeCode
        );

        if (editorRef.current) {
          isRemoteUpdate.current =
            true;

          editorRef.current.setValue(
            challengeCode
          );

          setTimeout(() => {
            isRemoteUpdate.current =
              false;
          }, 0);
        }
      } catch (error) {
        console.error(
          "Challenge loading error:",
          error
        );

        setChallengeError(
          error?.message ||
            "Unable to load challenge."
        );
      } finally {
        setLoadingChallenge(false);
      }
    };

    loadChallenge();
  }, [roomCode]);

  const runCode = async (
    submit = false
  ) => {
    if (
      !editorRef.current ||
      isRunning
    ) {
      return;
    }

    const currentCode =
      editorRef.current.getValue();

    if (!currentCode.trim()) {
      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr:
          "No code to run.",
      });

      return;
    }

    if (!roomCode) {
      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr:
          "No game ID found.",
      });

      return;
    }

    if (!username) {
      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr:
          "No username found.",
      });

      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/run-code`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              roomId: roomCode,

              userId: username,

              challengeId:
                challenge?.id,

              code: currentCode,

              language,

              submit,
            }),
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          `Backend returned invalid JSON (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Server error: ${response.status}`
        );
      }

      const passed = Boolean(data.allPassed);
      setAllTestsPassed(passed);

      if (data.results && Array.isArray(data.results)) {
        setTestCases(
          data.results.map((r, idx) => ({
            id: idx + 1,
            name: r.name || `Test Case ${idx + 1}`,
            input: r.input !== undefined ? r.input : testCases[idx]?.input,
            expected: r.expected,
            actual: r.actual,
            status: r.passed ? "PASSED" : "FAILED",
            passed: r.passed,
            error: r.error
          }))
        );
      } else {
        setTestCases((prev) =>
          prev.map((tc) => ({
            ...tc,
            status: passed ? "PASSED" : "FAILED",
            passed
          }))
        );
      }

      const output = data.output || data.stdout || "";
      const stderr = data.stderr || "";

      setExecutionResult({
        status: data.status || (passed ? "success" : "failed"),
        passed,
        stdout: output,
        stderr,
        exit_code: data.exitCode,
        executionTimeMs: data.executionTimeMs
      });

      setAuditLogs((prev) => [
        ...prev,
        {
          author: username,
          action: passed ? "Ran test suite (All Passed)" : "Ran test suite (Tests Failed)",
          time: new Date().toLocaleTimeString()
        }
      ]);

      socketRef.current?.emit("test:run", {
        roomCode,
        author: username,
        authorRole: playerRole,
        passed,
        submit,
        details: stderr || output || (passed ? "All tests passed!" : "Tests failed."),
        code: currentCode
      });

      if (submit && passed) {
        setVictoryData({
          winnerTeam: "DEVELOPERS",
          message: "STAGE CLEARED: All Unit Tests Passed! Developer Team Victory!"
        });
        socketRef.current?.emit("game:finish", {
          roomCode,
          winnerTeam: "DEVELOPERS",
          endReason: "All Unit Tests Fixed Successfully!"
        });
      }
    } catch (error) {
      console.error(
        "Run error:",
        error
      );

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr:
          error?.message ||
          "Unable to execute code.",
      });

      socketRef.current?.emit(
        "test:run",
        {
          roomCode,

          author: username,

          authorRole:
            playerRole,

          passed: false,

          details:
            error?.message ||
            "Unable to execute code.",

          code:
            currentCode,
        }
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorMount = (
    editor
  ) => {
    editorRef.current = editor;

    console.log(
      "Monaco Editor mounted."
    );

    setTimeout(() => {
      editor.layout();
    }, 100);
  };

  const handleCodeChange = (
    value
  ) => {
    const newCode =
      value || "";

    setCode(newCode);

    if (
      isRemoteUpdate.current
    ) {
      return;
    }

    if (
      !roomCode ||
      !username
    ) {
      return;
    }

    socketRef.current?.emit(
      "code:edit",
      {
        roomCode,

        author:
          username,

        authorRole:
          playerRole,

        code:
          newCode,

        details:
          "Code edited",

        activeLines: [],
      }
    );
  };

  const totalRoundTime =
    initialGameData?.room?.timeLimit ||
    initialGameData?.timeLimit ||
    600;

  const powerupCooldownSec = Math.max(15, Math.round(totalRoundTime / 5));

  const formatCooldownLabel = (secs) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${secs}s`;
  };

  const handleTriggerPowerup = (ability) => {
    if (cooldowns[ability] > 0) return;

    setCooldowns((prev) => ({ ...prev, [ability]: powerupCooldownSec }));

    const timer = setInterval(() => {
      setCooldowns((prev) => {
        if (prev[ability] <= 1) {
          clearInterval(timer);
          return { ...prev, [ability]: 0 };
        }
        return { ...prev, [ability]: prev[ability] - 1 };
      });
    }, 1000);

    if (socketRef.current) {
      socketRef.current.emit("sabotage:trigger", {
        roomCode,
        ability,
        senderName: username,
        senderRole: playerRole
      });
    }
  };

  const handleLanguageChange = (
    event
  ) => {
    const newLang =
      event.target.value;

    setLanguage(newLang);

    const template =
      STARTER_TEMPLATES[
        newLang
      ] || "";

    isRemoteUpdate.current =
      true;

    setCode(template);

    if (editorRef.current) {
      editorRef.current.setValue(
        template
      );
    }

    setTimeout(() => {
      isRemoteUpdate.current =
        false;
    }, 0);

    if (
      !roomCode ||
      !username
    ) {
      return;
    }

    socketRef.current?.emit(
      "code:edit",
      {
        roomCode,

        author:
          username,

        authorRole:
          playerRole,

        code:
          template,

        details:
          `Language changed to ${newLang}`,

        activeLines: [],
      }
    );
  };

  const handleResetCode = () => {
    const template =
      STARTER_TEMPLATES[
        language
      ] || "";

    setCode(template);

    isRemoteUpdate.current =
      true;

    if (editorRef.current) {
      editorRef.current.setValue(
        template
      );
    }

    setTimeout(() => {
      isRemoteUpdate.current =
        false;
    }, 0);

    if (
      !roomCode ||
      !username
    ) {
      return;
    }

    socketRef.current?.emit("code:edit", {
      roomCode,
      author: username,
      authorRole: playerRole,
      code: template,
      details: "Code reset",
    });
  };

  const handleCastVote = (targetUsername) => {
    if (hasVoted) return;
    setHasVoted(true);
    setVotes((prev) => ({ ...prev, [username]: targetUsername }));
    socketRef.current?.emit("meeting:vote", {
      roomCode,
      voterName: username,
      targetUsername
    });
  };

  const handleFinishVoting = () => {
    socketRef.current?.emit("meeting:finish", { roomCode });
  };

  const handleFinishSabotageEarly = () => {
    socketRef.current?.emit("sabotage:finish_early", { roomCode });
  };

  const passedCount = testCases.filter((t) => t.status === "PASSED").length;

  return (
    <div className={`${styles.editorWrapper} ${isGlitched ? styles.glitchActive : ""}`}>
      {isGlitched && <div className={styles.glitchOverlay} />}

      <header className={styles.topBar}>
        <div className={styles.leftControls}>
          <div className={styles.brand}>
            <Code2 size={18} />
            <span className={styles.brandText}>CODE MAFIA</span>
          </div>

          <div className={styles.divider} />

          <select
            className={styles.langSelect}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.timerBadge}>
            <Timer
              size={15}
              color={
                phase === "SABOTAGE"
                  ? (playerRole === "MAFIA" ? "#ef4444" : "#eab308")
                  : (phase === "VOTING" ? "#ef4444" : "#ffa116")
              }
            />
            <span
              className={styles.timerDisplay}
              style={{
                color:
                  phase === "SABOTAGE"
                    ? (playerRole === "MAFIA" ? "#ef4444" : "#eab308")
                    : (phase === "VOTING" ? "#ef4444" : undefined),
                fontWeight: phase === "SABOTAGE" || phase === "VOTING" ? "bold" : undefined
              }}
            >
              <span className={styles.timerFullText}>
                {phase === "SABOTAGE"
                  ? `R${currentRound} SABOTAGE: ${formatTime(phaseSeconds)}`
                  : (phase === "VOTING"
                      ? `R${currentRound} VOTING: ${formatTime(phaseSeconds)}`
                      : `R${currentRound} ${formatTime(phaseSeconds)}`)}
              </span>
              <span className={styles.timerCompactText}>
                {phase === "SABOTAGE"
                  ? `R${currentRound} SAB: ${formatCompactTime(phaseSeconds)}`
                  : (phase === "VOTING"
                      ? `R${currentRound} VOTE: ${formatCompactTime(phaseSeconds)}`
                      : `R${currentRound} ${formatCompactTime(phaseSeconds)}`)}
              </span>
            </span>
          </div>

          <div className={styles.divider} />

          {phase === "SABOTAGE" && playerRole === "MAFIA" && (
            <button
              type="button"
              className={`${styles.runBtn} ${styles.desktopOnlyEarlyBtn}`}
              onClick={handleFinishSabotageEarly}
              style={{
                backgroundColor: "#dc2626",
                color: "#fff",
                borderColor: "#b91c1c",
                fontWeight: "600"
              }}
            >
              Finish Early
            </button>
          )}

          <button
            type="button"
            className={styles.runBtn}
            onClick={() => runCode(false)}
            disabled={isRunning || isFunctionLocked || phase === "SABOTAGE" || phase === "VOTING"}
          >
            <PlayCircle size={15} />
            <span>{isRunning ? "Running..." : "Run"}</span>
          </button>

          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => runCode(true)}
            disabled={
              isRunning ||
              phase === "SABOTAGE" ||
              phase === "VOTING" ||
              (!allTestsPassed && !isFalseGreen) ||
              isFunctionLocked
            }
            title={
              phase === "SABOTAGE"
                ? "Submissions locked during initial sabotage phase"
                : (!allTestsPassed && !isFalseGreen
                    ? "All test cases must pass before submitting"
                    : "Submit Solution")
            }
          >
            <Send size={14} />
            <span>{isRunning ? "Submitting..." : "Submit"}</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <nav className={styles.mobileTabBar} aria-label="Editor tabs">
        <button
          type="button"
          className={`${styles.mobileTabBtn} ${mobileTab === "code" ? styles.mobileTabActive : ""}`}
          onClick={() => setMobileTab("code")}
        >
          <Code2 size={15} />
          <span>Code</span>
        </button>

        <button
          type="button"
          className={`${styles.mobileTabBtn} ${mobileTab === "tests" ? styles.mobileTabActive : ""}`}
          onClick={() => setMobileTab("tests")}
        >
          <CheckCircle2 size={15} />
          <span>Tests</span>
          <span className={`${styles.mobileTabBadge} ${allTestsPassed || isFalseGreen ? styles.badgeSuccess : ""}`}>
            {isFalseGreen ? testCases.length : passedCount}/{testCases.length}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.mobileTabBtn} ${mobileTab === "challenge" ? styles.mobileTabActive : ""}`}
          onClick={() => setMobileTab("challenge")}
        >
          <BookOpen size={15} />
          <span>Problem</span>
        </button>
      </nav>

      <main className={styles.mainLayout}>
        <div className={`${styles.editorColumn} ${mobileTab === "tests" ? styles.hideOnMobile : ""}`}>
          {phase === "SABOTAGE" && playerRole === "MAFIA" && (
            <div className={styles.sabotageAlertMafia}>
              <span className={styles.sabotageAlertText}>
                😈 <strong>EXCLUSIVE SABOTAGE WINDOW:</strong> You have exclusive write access to tamper with the codebase before developers enter! ({phaseSeconds}s remaining)
              </span>
              <button
                type="button"
                className={styles.sabotageEarlyBtn}
                onClick={handleFinishSabotageEarly}
              >
                Finish Early
              </button>
            </div>
          )}

          {phase === "SABOTAGE" && playerRole !== "MAFIA" && (
            <div className={styles.sabotageAlertDev}>
              <span className={styles.sabotageAlertText}>
                <strong>SYSTEM INFILTRATION IN PROGRESS:</strong> The Imposter is currently tampering with the codebase in secret. Your editor is locked and code changes are hidden. The modified codebase will be revealed when infiltration concludes in <strong>{phaseSeconds}s</strong>.
              </span>
            </div>
          )}

          {phase === "DEBUG" && (
            <div className={styles.debugAlert}>
              <span>
                🛠️ <strong>COLLABORATIVE DEBUG PHASE:</strong> Infiltration complete! The modified codebase is now live. Work together to diagnose bugs and pass all unit tests before time runs out!
              </span>
            </div>
          )}

          {isFunctionLocked && (
            <div className={styles.functionLockBanner}>
              🔒 FUNCTION LOCKED: Lines 4-8 frozen by Mafia Sabotage!
            </div>
          )}

          {challenge && (
            <section
              className={`${styles.challengePanel} ${
                mobileTab === "code" ? styles.hideChallengeOnMobile : ""
              } ${mobileTab === "challenge" ? styles.fullChallengeOnMobile : ""}`}
            >
              <h1>{challenge.title || "Shopping Cart Discount Engine"}</h1>
              <p>{challenge.description || "Fix loop boundary bugs to accurately calculate item subtotals."}</p>
              <div className={styles.challengeMeta}>
                <span>Language: {language}</span>
                <span>Role: {playerRole}</span>
                <span>Status: {allTestsPassed || isFalseGreen ? "ALL TESTS PASSED" : "PENDING FIX"}</span>
              </div>
            </section>
          )}

          <div
            className={`${styles.monacoContainer} ${
              mobileTab === "challenge" ? styles.hideOnMobile : ""
            }`}
          >
            <Editor
              height="100%"
              width="100%"
              language={language}
              value={code}
              theme="vs"
              onMount={handleEditorMount}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: isMobile ? 13 : 14,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: false,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                readOnly:
                  isFunctionLocked ||
                  (phase === "SABOTAGE" && playerRole !== "MAFIA") ||
                  phase === "VOTING" ||
                  phase === "FINISHED"
              }}
            />
          </div>
        </div>

        <aside
          className={`${styles.testSidePanel} ${
            mobileTab !== "tests" ? styles.hideOnMobile : ""
          }`}
        >
          <div className={styles.testSideHeader}>
            <h3 className={styles.testSideTitle}>Test Cases</h3>
            <span className={styles.testSummaryBadge}>
              {isFalseGreen ? testCases.length : passedCount} / {testCases.length} Passed
            </span>
          </div>

          <div className={styles.testList}>
            {testCases.map((test, index) => {
              const displayPassed = isFalseGreen || test.status === "PASSED";
              return (
                <div key={test.id || index} className={styles.testCard}>
                  <div className={styles.testCardHeader}>
                    <span className={styles.testName}>{test.name}</span>
                    <span
                      className={
                        displayPassed
                          ? styles.badgePassed
                          : test.status === "FAILED"
                          ? styles.badgeFailed
                          : styles.badgePending
                      }
                    >
                      {displayPassed ? "PASSED" : test.status || "NOT RUN"}
                    </span>
                  </div>

                  <div className={styles.testDetailRow}>
                    <span className={styles.testLabel}>Input:</span>
                    <pre className={styles.testCode}>{JSON.stringify(test.input, null, 2)}</pre>
                  </div>

                  <div className={styles.testDetailRow}>
                    <span className={styles.testLabel}>Expected:</span>
                    <pre className={styles.testCode}>{JSON.stringify(test.expected, null, 2)}</pre>
                  </div>

                  {(test.actual !== undefined || isFalseGreen) && (
                    <div className={styles.testDetailRow}>
                      <span className={styles.testLabel}>Actual:</span>
                      <pre
                        className={`${styles.testCode} ${
                          displayPassed ? styles.codeSuccess : styles.codeError
                        }`}
                      >
                        {JSON.stringify(isFalseGreen ? test.expected : test.actual, null, 2)}
                      </pre>
                    </div>
                  )}

                  {test.error && (
                    <div className={styles.testDetailRow}>
                      <span className={styles.testLabel}>Exception / Trace:</span>
                      <pre className={`${styles.testCode} ${styles.codeError}`}>
                        {test.error}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {playerRole === "MAFIA" && (
            <section className={styles.mafiaPanel}>
              <div className={styles.mafiaHeader}>
                <h4 className={styles.mafiaTitle}>Mafia Powerups</h4>
                <span className={styles.mafiaBadge}>ROLE: MAFIA</span>
              </div>

              <div className={styles.powerupGrid}>
                <button
                  type="button"
                  className={styles.powerupBtn}
                  onClick={() => handleTriggerPowerup("SCREEN_GLITCH")}
                  disabled={cooldowns.SCREEN_GLITCH > 0}
                >
                  <span>Screen Glitch</span>
                  <span className={styles.powerupDesc}>
                    {cooldowns.SCREEN_GLITCH > 0
                      ? `${cooldowns.SCREEN_GLITCH}s`
                      : `Glitch (CD: ${formatCooldownLabel(powerupCooldownSec)})`}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.powerupBtn}
                  onClick={() => handleTriggerPowerup("FALSE_GREEN")}
                  disabled={cooldowns.FALSE_GREEN > 0}
                >
                  <span>False Green</span>
                  <span className={styles.powerupDesc}>
                    {cooldowns.FALSE_GREEN > 0
                      ? `${cooldowns.FALSE_GREEN}s`
                      : `Fake Pass (CD: ${formatCooldownLabel(powerupCooldownSec)})`}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.powerupBtn}
                  onClick={() => handleTriggerPowerup("FUNCTION_LOCK")}
                  disabled={cooldowns.FUNCTION_LOCK > 0}
                >
                  <span>Freeze Editor</span>
                  <span className={styles.powerupDesc}>
                    {cooldowns.FUNCTION_LOCK > 0
                      ? `${cooldowns.FUNCTION_LOCK}s`
                      : `Lock Code (CD: ${formatCooldownLabel(powerupCooldownSec)})`}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.powerupBtn}
                  onClick={() => handleTriggerPowerup("CODE_RADAR")}
                  disabled={cooldowns.CODE_RADAR > 0}
                >
                  <span>Code Radar</span>
                  <span className={styles.powerupDesc}>
                    {cooldowns.CODE_RADAR > 0
                      ? `${cooldowns.CODE_RADAR}s`
                      : `Heatmap (CD: ${formatCooldownLabel(powerupCooldownSec)})`}
                  </span>
                </button>
              </div>
            </section>
          )}
        </aside>
      </main>

      {showVotingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>🚨 Emergency Voting Tribunal ({formatTime(phaseSeconds)})</h2>
              <p>Deliberate on the audit logs, identify the hidden Imposter, and cast your vote before time expires!</p>
            </div>

            <div>
              <div className={styles.sectionTitle}>User Activity Audit Summary</div>
              <div className={styles.auditContainer}>
                {auditLogs.map((log, idx) => (
                  <div key={idx} className={styles.auditItem}>
                    <span className={styles.auditAuthor}>{log.author}:</span>
                    <span className={styles.auditText}>{log.action}</span>
                    <span className={styles.auditTime}>{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {ejectionResult && (
              <div
                className={`${styles.ejectionBanner} ${
                  ejectionResult.wasMafia ? styles.ejectionSuccess : styles.ejectionWrong
                }`}
              >
                {ejectionResult.message}
              </div>
            )}

            <div>
              <div className={styles.sectionTitle}>Operatives in Room</div>
              <div className={styles.suspectGrid}>
                {players.map((p, idx) => {
                  const voteCnt = Object.values(votes).filter((v) => v === p.username).length;
                  const isUser = p.username === username;
                  const isDead = p.isAlive === false;
                  return (
                    <div
                      key={p.username || idx}
                      className={styles.suspectCard}
                      style={{ opacity: isDead ? 0.45 : 1 }}
                    >
                      <div className={styles.suspectName}>
                        {p.username} {p.isHost && "(Host)"} {isDead && "💀 (Eliminated)"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
                        Votes Received: {voteCnt}
                      </div>
                      <button
                        type="button"
                        className={styles.voteButton}
                        onClick={() => handleCastVote(p.username)}
                        disabled={hasVoted || isUser || isDead}
                      >
                        {votes[username] === p.username
                          ? "YOUR VOTE"
                          : hasVoted
                          ? "VOTE CAST"
                          : "VOTE SUSPECT"}
                      </button>
                    </div>
                  );
                })}

                <div className={styles.suspectCard}>
                  <div className={styles.suspectName}>Skip Vote / Abstain</div>
                  <div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
                    Votes: {Object.values(votes).filter((v) => v === "SKIP").length}
                  </div>
                  <button
                    type="button"
                    className={styles.voteButton}
                    onClick={() => handleCastVote("SKIP")}
                    disabled={hasVoted}
                  >
                    {votes[username] === "SKIP" ? "VOTED SKIP" : "SKIP VOTE"}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.runBtn}
                onClick={handleFinishVoting}
              >
                Tally Votes & Eject
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => setShowVotingModal(false)}
              >
                View Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {roundTransition && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.transitionModalContent}`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.transitionTitle}>
                🔄 ROUND {currentRound} COMPLETE
              </h2>
              <p style={{ marginTop: "8px", color: "hsl(var(--muted-foreground))" }}>
                {roundTransition.message}
              </p>
            </div>

            <div className={styles.transitionBox}>
              <p style={{ fontSize: "0.95rem", fontWeight: "500", color: "#92400e" }}>
                ⏳ A new challenge is being prepared for Round {currentRound + 1}...
              </p>
              <p style={{ fontSize: "0.85rem", color: "#a16207", marginTop: "8px" }}>
                Your XP has been retained. Survive and hunt the Imposter(s)!
              </p>
            </div>
          </div>
        </div>
      )}

      {victoryData && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.victoryModalContent}`}>
            <div className={styles.modalHeader}>
              <h2
                style={{
                  color: victoryData.winnerTeam === "DEVELOPERS" ? "#22c55e" : "#ef4444",
                  fontSize: "1.75rem"
                }}
              >
                {victoryData.winnerTeam === "DEVELOPERS" ? "DEVELOPER VICTORY" : "MAFIA VICTORY"}
              </h2>
              <p>{victoryData.message}</p>
            </div>

            <div className={styles.victoryRosterBox}>
              <div className={styles.sectionTitle}>Operative Roster & Roles (Completed in {currentRound} Round{currentRound !== 1 ? "s" : ""})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                {players.map((p, idx) => {
                  const isWinner =
                    (victoryData.winnerTeam === "DEVELOPERS" && p.role === "DEVELOPER") ||
                    (victoryData.winnerTeam === "MAFIA" && p.role === "MAFIA");
                  const victoryBonus = isWinner ? (p.role === "MAFIA" ? 500 : 300) : 0;
                  const roundXp = p.role === "DEVELOPER" ? currentRound * 50 : currentRound * 75;
                  const totalXp = (p.isAlive !== false ? roundXp : 0) + victoryBonus;
                  return (
                    <div key={idx} className={styles.rosterRow}>
                      <span>
                        {p.username} {p.isAlive === false ? "💀" : ""} - <strong style={{ color: p.role === "MAFIA" ? "#ef4444" : "#22c55e" }}>{p.role || "DEVELOPER"}</strong>
                      </span>
                      {isWinner ? (
                        <span style={{ color: "#22c55e", fontWeight: "600" }}>~{totalXp} XP (Victory + Rounds)</span>
                      ) : (
                        <span style={{ color: "#ef4444", fontWeight: "600" }}>{totalXp > 0 ? `~${totalXp} XP (Rounds)` : "0 XP (Defeat)"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => (window.location.href = "/lobby")}
              style={{ width: "100%", height: "44px" }}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      <footer className={styles.statusBar}>
        <div className={styles.statusIndicator}>
          <span className={connected ? styles.dotConnected : styles.dotDisconnected} />
          <span className={styles.statusOnlineText}>{connected ? "Collaborative Online" : "Local Mode"}</span>
        </div>

        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Room: </span>
          <span>{roomCode || "default"}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Round: </span>
          <span>{currentRound}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Players: </span>
          <span>{players.length}</span>
        </div>
      </footer>
    </div>
  );
}