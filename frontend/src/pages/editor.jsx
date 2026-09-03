import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Timer, RotateCcw, Code2, PlayCircle, Send } from "lucide-react";
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

  // Prevent remote code updates from being broadcast back.
  const isRemoteUpdate = useRef(false);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);

  const [connected, setConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [players, setPlayers] = useState([]);
  const [seconds, setSeconds] = useState(0);

  /*
   * IMPORTANT:
   * Replace this with your actual authentication/user context
   * if you already have one.
   */
  const playerId = Number(localStorage.getItem("userId"));

  /*
   * Timer
   */
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
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };

  /*
   * Socket.IO connection
   */
  useEffect(() => {
    if (!gameId) {
      console.error("No gameId found in URL");
      return;
    }

    if (!playerId) {
      console.error(
        "No userId found in localStorage. User must be logged in."
      );
      return;
    }

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

    socket.on("disconnect", () => {
      console.log("Disconnected from backend");
      setConnected(false);
    });

    /*
     * Backend sends this after joining.
     */
    socket.on("player:joined", ({ players }) => {
      setPlayers(players || []);
    });

    /*
     * Receive code from another player.
     */
    socket.on("code:updated", ({ playerId: updatedBy, code: remoteCode }) => {
      if (updatedBy === playerId) {
        return;
      }

      if (!remoteCode) {
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

      // Let Monaco onChange finish before allowing local updates again.
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 0);
    });

    socket.on("game:error", ({ message }) => {
      console.error("Game error:", message);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: message || "Game error",
      });
    });

    socket.on("code:error", ({ message }) => {
      console.error("Code error:", message);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: message || "Code error",
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, playerId]);

  /*
   * Run / Submit
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
     * Tell other players that this player is running code.
     */
    socketRef.current?.emit("code:run", {
      gameId,
      playerId,
      code: currentCode,
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
          code: currentCode,
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
        status: data.status,
        passed: data.allPassed,
        stdout: data.output || "",
        stderr: "",
        exit_code: data.exitCode,
        executionTimeMs: data.executionTimeMs,
      });
    } catch (error) {
      console.error("Run error:", error);

      setExecutionResult({
        status: "error",
        passed: false,
        stdout: "",
        stderr: error?.message || "Unable to execute code.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  /*
   * Monaco mounted
   */
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  /*
   * Local code change
   */
  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    /*
     * Don't rebroadcast a remote change.
     */
    if (isRemoteUpdate.current) {
      return;
    }

    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: newCode,
    });
  };

  /*
   * Language change
   */
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;

    setLanguage(newLang);

    const template = STARTER_TEMPLATES[newLang] || "";

    setCode(template);

    if (editorRef.current) {
      editorRef.current.setValue(template);
    }

    /*
     * Synchronize new template with other players.
     */
    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: template,
    });
  };

  /*
   * Reset
   */
  const handleResetCode = () => {
    const template = STARTER_TEMPLATES[language] || "";

    setCode(template);

    if (editorRef.current) {
      editorRef.current.setValue(template);
    }

    socketRef.current?.emit("code:update", {
      gameId,
      playerId,
      code: template,
    });
  };

  return (
    <div className={styles.editorWrapper}>
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
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>

          <button
            className={styles.iconBtn}
            title="Reset code template"
            onClick={handleResetCode}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.timerBadge}>
            <Timer size={16} color="#ffa116" />

            <span className={styles.timerDisplay}>
              {formatTime(seconds)}
            </span>
          </div>

          <div className={styles.divider} />

          <button
            className={styles.runBtn}
            onClick={() => runCode(false)}
            disabled={isRunning}
          >
            <PlayCircle size={15} />

            {isRunning ? "Running..." : "Run"}
          </button>

          <button
            className={styles.submitBtn}
            onClick={() => runCode(true)}
            disabled={isRunning}
          >
            <Send size={14} />

            {isRunning ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      <main className={styles.editorArea}>
        <Editor
          height="100%"
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
          }}
        />
      </main>

      {executionResult && (
        <section className={styles.outputPanel}>
          <div className={styles.outputHeader}>
            <strong>
              {executionResult.passed ? "✓ Passed" : "✗ Failed"}
            </strong>

            {executionResult.exit_code !== undefined && (
              <span>
                Exit code: {executionResult.exit_code}
              </span>
            )}
          </div>

          {executionResult.stdout && (
            <pre>{executionResult.stdout}</pre>
          )}

          {executionResult.stderr && (
            <pre className={styles.errorOutput}>
              {executionResult.stderr}
            </pre>
          )}
        </section>
      )}

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
          Room: {gameId || "default"}
        </div>

        <div>
          Players: {players.length}
        </div>
      </footer>
    </div>
  );
}