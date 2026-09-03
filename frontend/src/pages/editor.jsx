import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Timer,
  RotateCcw,
  Code2,
  PlayCircle,
  Send,
} from "lucide-react";
import { io } from "socket.io-client";
import styles from "./styles/editor.module.css";

const API_URL = "http://localhost:5000";

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
    const complement = target - nums[i];

    if (map.has(complement)) {
      return [map.get(complement), i];
    }

    map.set(nums[i], i);
  }

  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,

  python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
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
  const { gameId } = useParams();

  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);

  const [connected, setConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [players, setPlayers] = useState([]);
  const [seconds, setSeconds] = useState(0);

  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [challengeError, setChallengeError] = useState("");

  /*
   * Get user ID safely.
   */
  const storedUserId =
    typeof window !== "undefined"
      ? localStorage.getItem("userId")
      : null;

  const playerId = storedUserId ? Number(storedUserId) : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return [hrs, mins, secs]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  /*
   * Socket.IO connection.
   */
  useEffect(() => {
    if (!gameId) {
      console.warn(
        "No gameId found in URL. Running in local mode."
      );
      return;
    }

    if (!playerId) {
      console.warn(
        "No userId found in localStorage. Running in local mode."
      );
      return;
    }

    console.log("Connecting to Socket.IO:", API_URL);

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to backend:", socket.id);

      setConnected(true);

      socket.emit("game:join", {
        gameId,
        playerId,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from backend:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setConnected(false);
    });

    /*
     * Backend sends this after joining.
     */
    socket.on("player:joined", (data) => {
      console.log("Player joined:", data);

      if (data?.players) {
        setPlayers(data.players);
      }
    });

    /*
     * Receive code from another player.
     */
    socket.on(
      "code:updated",
      ({ playerId: updatedBy, code: remoteCode }) => {
        if (updatedBy === playerId) {
          return;
        }

        if (typeof remoteCode !== "string") {
          return;
        }

        isRemoteUpdate.current = true;

        setCode(remoteCode);

        if (
          editorRef.current &&
          editorRef.current.getValue() !== remoteCode
        ) {
          editorRef.current.setValue(remoteCode);
        }

        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 0);
      }
    );

    /*
     * Game error.
     */
    socket.on("game:error", ({ message }) => {
      console.error("Game error:", message);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: message || "Game error",
      });
    });

    /*
     * Code error.
     */
    socket.on("code:error", ({ message }) => {
      console.error("Code error:", message);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: message || "Code error",
      });
    });

    /*
     * Cleanup.
     */
    return () => {
      console.log("Cleaning up Socket.IO connection.");

      socket.removeAllListeners();
      socket.disconnect();

      socketRef.current = null;
      setConnected(false);
    };
  }, [gameId, playerId]);

  useEffect(() => {
    if (!gameId) {
      setLoadingChallenge(false);
      return;
    }

    const loadChallenge = async () => {
      try {
        setLoadingChallenge(true);
        setChallengeError("");

        const response = await fetch(
          `${API_URL}/api/challenges/${gameId}`,
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to load challenge"
          );
        }

        setChallenge(data);

        const challengeLanguage =
          data.language?.toLowerCase() === "python"
            ? "python"
            : "javascript";

        const challengeCode =
          data.buggy_code ||
          STARTER_TEMPLATES[challengeLanguage] ||
          "";

        setLanguage(challengeLanguage);
        setCode(challengeCode);

        if (editorRef.current) {
          editorRef.current.setValue(challengeCode);
        }
      } catch (error) {
        console.error("Challenge loading error:", error);

        setChallengeError(
          error?.message || "Unable to load challenge."
        );
      } finally {
        setLoadingChallenge(false);
      }
    };

    loadChallenge();
  }, [gameId]);

  /*
   * Run / Submit code.
   */
  const runCode = async (submit = false) => {
    if (!editorRef.current || isRunning) {
      return;
    }

    const currentCode = editorRef.current.getValue();

    if (!currentCode.trim()) {
      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: "No code to run.",
      });

      return;
    }

    if (!gameId) {
      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: "No game ID found.",
      });

      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

    /*
     * Notify other players.
     */
    socketRef.current?.emit("code:run", {
      gameId,
      playerId,
      code: currentCode,
      submit,
    });

    try {
      const response = await fetch(`${API_URL}/api/run-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          roomId: gameId,
          userId: playerId,
          challengeId: challenge?.id,
          code: currentCode,
          language,
          submit,
        }),
      });

      let data;

      try {
        data = await response.json();
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

      setExecutionResult({
        status: data.status || "success",
        passed: Boolean(data.allPassed),
        stdout: data.output || data.stdout || "",
        stderr: data.stderr || "",
        exit_code: data.exitCode,
        executionTimeMs: data.executionTimeMs,
      });
    } catch (error) {
      console.error("Run error:", error);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr:
          error?.message || "Unable to execute code.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  /*
   * Monaco mounted.
   */
  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    console.log("Monaco Editor mounted.");

    /*
     * Force Monaco to calculate its dimensions.
     */
    setTimeout(() => {
      editor.layout();
    }, 100);
  };

  /*
   * Local code change.
   */
  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    /*
     * Don't rebroadcast remote changes.
     */
    if (isRemoteUpdate.current) {
      return;
    }

    if (!gameId || !playerId) {
      return;
    }

    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: newCode,
    });
  };

  /*
   * Language change.
   */
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;

    setLanguage(newLang);

    const template =
      STARTER_TEMPLATES[newLang] || "";

    setCode(template);

    if (editorRef.current) {
      editorRef.current.setValue(template);
    }

    if (!gameId || !playerId) {
      return;
    }

    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: template,
    });
  };

  /*
   * Reset code.
   */
  const handleResetCode = () => {
    const template =
      STARTER_TEMPLATES[language] || "";

    setCode(template);

    if (editorRef.current) {
      editorRef.current.setValue(template);
    }

    if (!gameId || !playerId) {
      return;
    }

    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: template,
    });
  };

  return (
    <div className={styles.editorWrapper}>
      {/* ==================== TOP BAR ==================== */}

      <header className={styles.topBar}>
        <div className={styles.leftControls}>
          <div className={styles.brand}>
            <Code2 size={20} />
            <span>CodeMafia</span>
          </div>

          <select
            className={styles.langSelect}
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">
              JavaScript
            </option>

            <option value="python">
              Python
            </option>
          </select>

          <button
            type="button"
            className={styles.iconBtn}
            title="Reset code template"
            onClick={handleResetCode}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.timerBadge}>
            <Timer
              size={16}
              color="#ffa116"
            />

            <span className={styles.timerDisplay}>
              {formatTime(seconds)}
            </span>
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.runBtn}
            onClick={() => runCode(false)}
            disabled={isRunning}
          >
            <PlayCircle size={15} />

            {isRunning
              ? "Running..."
              : "Run"}
          </button>

          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => runCode(true)}
            disabled={isRunning}
          >
            <Send size={14} />

            {isRunning
              ? "Submitting..."
              : "Submit"}
          </button>
        </div>
      </header>

      {/* ==================== EDITOR ==================== */}

      <main className={styles.editorArea}>
        {/* Challenge information */}
        {loadingChallenge && (
          <div className={styles.challengeLoading}>
            Loading challenge...
          </div>
        )}

        {challengeError && (
          <div className={styles.challengeError}>
            {challengeError}
          </div>
        )}

        {challenge && (
          <section className={styles.challengePanel}>
            <h1>{challenge.title}</h1>

            <p>{challenge.description}</p>

            <div className={styles.challengeMeta}>
              <span>
                Language: {challenge.language}
              </span>

              <span>
                Tests: {challenge.test_cases?.length || 0}
              </span>
            </div>
          </section>
        )}

        {/* Monaco Editor */}
        <div className={styles.monacoContainer}>
          <Editor
            height="100%"
            width="100%"
            language={language}
            value={code}
            theme="vs-dark"
            onMount={handleEditorMount}
            onChange={handleCodeChange}
            options={{
              minimap: {
                enabled: false,
              },

              fontSize: 14,

              automaticLayout: true,

              tabSize: 2,

              wordWrap: "on",

              scrollBeyondLastLine: false,

              smoothScrolling: true,

              cursorBlinking: "smooth",

              bracketPairColorization: {
                enabled: true,
              },

              padding: {
                top: 12,
                bottom: 12,
              },

              renderWhitespace: "selection",

              lineNumbers: "on",

              folding: true,

              suggestOnTriggerCharacters: true,
            }}
          />
        </div>
      </main>

      {/* ==================== OUTPUT PANEL ==================== */}

      {executionResult && (
        <section className={styles.outputPanel}>
          <div className={styles.outputHeader}>
            <div
              className={
                executionResult.passed
                  ? styles.resultPassed
                  : styles.resultFailed
              }
            >
              {executionResult.passed
                ? "✓ Passed"
                : "✗ Failed"}
            </div>

            {executionResult.exit_code !==
              undefined && (
              <span>
                Exit code:{" "}
                {executionResult.exit_code}
              </span>
            )}

            {executionResult.executionTimeMs !==
              undefined && (
              <span>
                {executionResult.executionTimeMs} ms
              </span>
            )}

            <button
              type="button"
              className={styles.closeOutputBtn}
              onClick={() =>
                setExecutionResult(null)
              }
              title="Close output"
            >
              ×
            </button>
          </div>

          {executionResult.stdout && (
            <pre>{executionResult.stdout}</pre>
          )}

          {executionResult.stderr && (
            <pre className={styles.errorOutput}>
              {executionResult.stderr}
            </pre>
          )}

          {!executionResult.stdout &&
            !executionResult.stderr && (
              <pre className={styles.emptyOutput}>
                No output returned.
              </pre>
            )}
        </section>
      )}

      {/* ==================== STATUS BAR ==================== */}

      <footer className={styles.statusBar}>
        <div className={styles.statusIndicator}>
          <span
            className={
              connected
                ? styles.dotConnected
                : styles.dotDisconnected
            }
          />

          <span>
            {connected
              ? "Collaborative Online"
              : "Local Mode"}
          </span>
        </div>

        <div>
          Room:{" "}
          {gameId || "default"}
        </div>

        <div>
          Players: {players.length}
        </div>
      </footer>
    </div>
  );
}