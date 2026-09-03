import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import {
  Timer,
  RotateCcw,
  Code2,
  PlayCircle,
  Send,
} from "lucide-react";
import styles from "./styles/editor.module.css";
import { getBackendUrl } from "../socket";

const API_URL = getBackendUrl();

const STARTER_TEMPLATES = {
  javascript: `/**
 * Problem: Two Sum
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    const map = new Map();

    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];

        if (map.has(diff)) {
            return [map.get(diff), i];
        }

        map.set(nums[i], i);
    }

    return [];
}

// Test
console.log(twoSum([2, 7, 11, 15], 9));
`,

  python: `def twoSum(nums, target):
    lookup = {}

    for i, num in enumerate(nums):
        diff = target - num

        if diff in lookup:
            return [lookup[diff], i]

        lookup[num] = i

    return []


# Test
sol = Solution()
print(sol.twoSum([2, 7, 11, 15], 9))
`,
};

export default function MonacoEditorPage() {
  const params = useParams();
  const roomCode = (params.roomCode || params.gameId || localStorage.getItem("roomCode") || "").toUpperCase();

  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(
    STARTER_TEMPLATES.javascript
  );

  const [connected, setConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] =
    useState(null);

  const [players, setPlayers] = useState([]);
  const [seconds, setSeconds] = useState(15 * 60); // Default countdown: 15 minutes (900s)

  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] =
    useState(true);
  const [challengeError, setChallengeError] =
    useState("");

  /*
   * Current logged-in player.
   */
  const username = localStorage.getItem("username");

  /*
   * Role is received from game:started.
   */
  const [playerRole, setPlayerRole] = useState("DEVELOPER");

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

  // Tactical Sabotage & Powerup states
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

  /*
   * Countdown Timer
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  /*
   * ==========================================
   * SOCKET.IO CONNECTION
   * ==========================================
   */
  useEffect(() => {
    if (!roomCode || !username) {
      console.warn(
        "No roomCode or username found. Running in local mode."
      );
      return;
    }

    console.log(
      "Connecting to Socket.IO:",
      API_URL
    );

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    /*
     * ------------------------------------------
     * CONNECT
     * ------------------------------------------
     */
    socket.on("connect", () => {
      console.log(
        "Connected to backend:",
        socket.id
      );

      setConnected(true);

      /*
       * Rejoin room.
       */
      socket.emit(
        "room:join",
        {
          roomCode,
          username,
        },
        (response) => {
          console.log(
            "Editor Room rejoin:",
            response
          );

          if (!response?.success) {
            console.error(
              "Join error:",
              response?.error
            );
            return;
          }

          setPlayers(
            response.room?.players || []
          );
          if (response.room?.timeLimit) {
            setSeconds(response.room.timeLimit);
          }
        }
      );
    });

    socket.on("code:updated", ({ code: remoteCode, author }) => {
      console.log(`[Collab Sync] Code updated by ${author}`);
      if (typeof remoteCode !== "string") return;

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
            name: `Test Case ${idx + 1}`,
            input: testCases[idx]?.input || { test: idx + 1 },
            expected: r.expected,
            actual: r.actual,
            status: r.passed ? "PASSED" : "FAILED",
            passed: r.passed
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

    /*
     * ------------------------------------------
     * PLAYER JOINED
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * PLAYER LEFT
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * GAME STARTED
     * ------------------------------------------
     */
    socket.on(
      "game:started",
      (data) => {
        console.log(
          "Game started:",
          data
        );

        if (data?.role) {
          setPlayerRole(data.role);
        }

        if (data?.room?.players) {
          setPlayers(
            data.room.players
          );
        }

        if (data?.room?.timeLimit) {
          setSeconds(data.room.timeLimit);
        }

        /*
         * Use the challenge selected by the backend.
         */
        if (data?.challenge) {
          const challengeData =
            data.challenge;

          setChallenge(
            challengeData
          );

          const challengeLanguage =
            challengeData.language?.toLowerCase() ===
            "python"
              ? "python"
              : "javascript";

          const challengeCode =
            challengeData.buggy_code ||
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
        }

        setLoadingChallenge(false);
      }
    );

    /*
     * ------------------------------------------
     * COLLABORATIVE CODE UPDATE
     *
     * Backend sends:
     *
     * {
     *   code,
     *   author,
     *   activeLines
     * }
     *
     * IMPORTANT:
     * socket.to(roomCode) excludes the sender.
     * Therefore we do NOT compare player IDs.
     * ------------------------------------------
     */
    socket.on(
      "code:updated",
      ({
        code: remoteCode,
        author,
        activeLines,
      }) => {
        console.log(
          `Code updated by ${author}`,
          activeLines
        );

        if (
          typeof remoteCode !==
          "string"
        ) {
          return;
        }

        /*
         * Prevent Monaco's onChange from
         * broadcasting this update back.
         */
        isRemoteUpdate.current =
          true;

        setCode(remoteCode);

        if (
          editorRef.current &&
          editorRef.current.getValue() !==
            remoteCode
        ) {
          editorRef.current.setValue(
            remoteCode
          );
        }

        setTimeout(() => {
          isRemoteUpdate.current =
            false;
        }, 0);
      }
    );

    /*
     * ------------------------------------------
     * TEST RESULT
     *
     * Backend:
     *
     * io.to(roomCode).emit("test:result", {
     *   passed,
     *   details,
     *   author
     * });
     * ------------------------------------------
     */
    socket.on(
      "test:result",
      ({
        passed,
        details,
        author,
      }) => {
        console.log(
          `Test result from ${author}:`,
          passed,
          details
        );

        /*
         * Don't overwrite our local execution
         * result unnecessarily if this is a result
         * from another player.
         *
         * You can remove this condition if you want
         * everybody to see every player's result.
         */
        if (author !== username) {
          return;
        }

        setExecutionResult({
          status: passed
            ? "success"
            : "failed",

          passed: Boolean(passed),

          stdout:
            details || "",

          stderr: "",
        });
      }
    );

    /*
     * ------------------------------------------
     * SCORE UPDATE
     * ------------------------------------------
     */
    socket.on(
      "score:updated",
      (data) => {
        console.log(
          "Score updated:",
          data
        );

        /*
         * You can connect this to a leaderboard
         * state later.
         */
      }
    );

    /*
     * ------------------------------------------
     * GAME ERROR
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * CODE ERROR
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * DISCONNECT
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * CONNECTION ERROR
     * ------------------------------------------
     */
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

    /*
     * ------------------------------------------
     * CLEANUP
     * ------------------------------------------
     */
    return () => {
      console.log(
        "Cleaning up Socket.IO connection."
      );

      socket.removeAllListeners();
      socket.disconnect();

      if (
        socketRef.current === socket
      ) {
        socketRef.current = null;
      }

      setConnected(false);
    };
  }, [roomCode, username]);

  /*
   * ==========================================
   * FALLBACK CHALLENGE LOADING
   *
   * This is useful if the editor is opened
   * directly rather than through game:started.
   * ==========================================
   */
  useEffect(() => {
    if (!roomCode) {
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

  /*
   * ==========================================
   * RUN / SUBMIT CODE
   * ==========================================
   */
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
      /*
       * Actual execution happens through
       * your REST API.
       */
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
            name: `Test Case ${idx + 1}`,
            input: testCases[idx]?.input || { test: idx + 1 },
            expected: r.expected,
            actual: r.actual,
            status: r.passed ? "PASSED" : "FAILED",
            passed: r.passed
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

      /*
       * Record failed execution in replay.
       */
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

  /*
   * ==========================================
   * MONACO MOUNT
   * ==========================================
   */
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

  /*
   * ==========================================
   * LOCAL CODE CHANGE
   * ==========================================
   */
  const handleCodeChange = (
    value
  ) => {
    const newCode =
      value || "";

    setCode(newCode);

    /*
     * Don't rebroadcast remote changes.
     */
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

    /*
     * Your backend expects:
     *
     * code:edit
     *
     * {
     *   roomCode,
     *   author,
     *   authorRole,
     *   code,
     *   details,
     *   activeLines
     * }
     */
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

  const handleTriggerPowerup = (ability) => {
    if (cooldowns[ability] > 0) return;

    setCooldowns((prev) => ({ ...prev, [ability]: 15 }));

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

  /*
   * ==========================================
   * LANGUAGE CHANGE
   * ==========================================
   */
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

    /*
     * Update Monaco without causing
     * a second code:edit event.
     */
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

    /*
     * Your backend currently has no
     * language field in code:edit.
     *
     * Therefore we can send the code
     * through the existing event.
     */
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

  /*
   * ==========================================
   * RESET CODE
   * ==========================================
   */
  const handleResetCode = () => {
    const template =
      STARTER_TEMPLATES[
        language
      ] || "";

    setCode(template);

    /*
     * Don't rebroadcast Monaco's internal
     * setValue as a separate event.
     */
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

  const passedCount = testCases.filter((t) => t.status === "PASSED").length;

  return (
    <div className={`${styles.editorWrapper} ${isGlitched ? styles.glitchActive : ""}`}>
      {isGlitched && <div className={styles.glitchOverlay} />}

      {/* ==================== TOP BAR ==================== */}
      <header className={styles.topBar}>
        <div className={styles.leftControls}>
          <div className={styles.brand}>
            <Code2 size={18} />
            <span>CODE MAFIA</span>
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
            <Timer size={16} color="#ffa116" />
            <span className={styles.timerDisplay}>{formatTime(seconds)}</span>
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.runBtn}
            onClick={() => runCode(false)}
            disabled={isRunning || isFunctionLocked}
          >
            <PlayCircle size={15} />
            {isRunning ? "Running..." : "Run"}
          </button>

          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => runCode(true)}
            disabled={isRunning || (!allTestsPassed && !isFalseGreen) || isFunctionLocked}
            title={!allTestsPassed && !isFalseGreen ? "All test cases must pass before submitting" : "Submit Solution"}
          >
            <Send size={14} />
            {isRunning ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {/* ==================== MAIN LAYOUT ==================== */}
      <main className={styles.mainLayout}>
        <div className={styles.editorColumn}>
          {isFunctionLocked && (
            <div className={styles.functionLockBanner}>
              🔒 FUNCTION LOCKED: Lines 4-8 frozen by Mafia Sabotage!
            </div>
          )}

          {challenge && (
            <section className={styles.challengePanel}>
              <h1>{challenge.title || "Shopping Cart Discount Engine"}</h1>
              <p>{challenge.description || "Fix loop boundary bugs to accurately calculate item subtotals."}</p>
              <div className={styles.challengeMeta}>
                <span>Language: {language}</span>
                <span>Role: {playerRole}</span>
                <span>Status: {allTestsPassed || isFalseGreen ? "ALL TESTS PASSED" : "PENDING FIX"}</span>
              </div>
            </section>
          )}

          <div className={styles.monacoContainer}>
            <Editor
              height="100%"
              width="100%"
              language={language}
              value={code}
              theme="vs-dark"
              onMount={(ed) => (editorRef.current = ed)}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                lineNumbers: "on",
                readOnly: isFunctionLocked
              }}
            />
          </div>
        </div>

        {/* ==================== RIGHT SIDE TEST CASES PANEL ==================== */}
        <aside className={styles.testSidePanel}>
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
                </div>
              );
            })}
          </div>

          {/* ==================== DEDICATED MAFIA TACTICAL POWERUPS PANEL ==================== */}
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
                    {cooldowns.SCREEN_GLITCH > 0 ? `${cooldowns.SCREEN_GLITCH}s` : "Glitch Displays (6s)"}
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
                    {cooldowns.FALSE_GREEN > 0 ? `${cooldowns.FALSE_GREEN}s` : "Fake Passed (15s)"}
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
                    {cooldowns.FUNCTION_LOCK > 0 ? `${cooldowns.FUNCTION_LOCK}s` : "Lock Code (10s)"}
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
                    {cooldowns.CODE_RADAR > 0 ? `${cooldowns.CODE_RADAR}s` : "Scan Heatmap (8s)"}
                  </span>
                </button>
              </div>
            </section>
          )}
        </aside>
      </main>

      {/* ==================== VOTING TRIBUNAL MODAL ==================== */}
      {showVotingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Emergency Voting Tribunal</h2>
              <p>Review player audit history, identify the hidden Mafia, and cast your vote.</p>
            </div>

            {/* Audit Log Summary */}
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

            {/* Ejection Result Banner */}
            {ejectionResult && (
              <div
                className={`${styles.ejectionBanner} ${
                  ejectionResult.wasMafia ? styles.ejectionSuccess : styles.ejectionWrong
                }`}
              >
                {ejectionResult.message}
              </div>
            )}

            {/* Suspect Voting Cards */}
            <div>
              <div className={styles.sectionTitle}>Operatives in Room</div>
              <div className={styles.suspectGrid}>
                {players.map((p, idx) => {
                  const voteCnt = votes[p.username] || 0;
                  return (
                    <div key={p.username || idx} className={styles.suspectCard}>
                      <div className={styles.suspectName}>
                        {p.username} {p.isHost && "(Host)"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
                        Votes Received: {voteCnt}
                      </div>
                      <button
                        type="button"
                        className={styles.voteButton}
                        onClick={() => handleCastVote(p.username)}
                        disabled={hasVoted || p.username === username}
                      >
                        {hasVoted ? "VOTE CAST" : "VOTE SUSPECT"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
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
                Return to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VICTORY / GAME OVER MODAL ==================== */}
      {victoryData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ textAlign: "center", maxWidth: "520px" }}>
            <div className={styles.modalHeader}>
              <h2 style={{ color: "#22c55e", fontSize: "1.75rem" }}>
                {victoryData.winnerTeam === "DEVELOPERS" ? "DEVELOPER VICTORY" : "MAFIA VICTORY"}
              </h2>
              <p>{victoryData.message}</p>
            </div>

            <div style={{ padding: "16px", backgroundColor: "hsl(var(--background))", borderRadius: "8px" }}>
              <div className={styles.sectionTitle}>XP & Score Allocations</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                {players.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span>{p.username} ({p.role || "DEVELOPER"})</span>
                    <span style={{ color: "#22c55e", fontWeight: "600" }}>+150 XP</span>
                  </div>
                ))}
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

      {/* ==================== STATUS BAR ==================== */}
      <footer className={styles.statusBar}>
        <div className={styles.statusIndicator}>
          <span className={connected ? styles.dotConnected : styles.dotDisconnected} />
          <span>{connected ? "Collaborative Online" : "Local Mode"}</span>
        </div>

        <div>Room: {roomCode || "default"}</div>
        <div>Players: {players.length}</div>
      </footer>
    </div>
  );
}