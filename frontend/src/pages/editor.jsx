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
  const { roomCode } = useParams();

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
  const [seconds, setSeconds] = useState(0);

  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] =
    useState(true);
  const [challengeError, setChallengeError] =
    useState("");

  /*
   * Current logged-in player.
   *
   * Your backend uses username as the application-level
   * player identity and socket.id as the connection identity.
   */
  const username = localStorage.getItem("username");

  /*
   * Role is received from game:started.
   *
   * Until the game starts, default to DEVELOPER so that
   * normal editor functionality still works.
   */
  const [playerRole, setPlayerRole] =
    useState("DEVELOPER");

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
        }
      );
    });

    /*
     * ------------------------------------------
     * PLAYER JOINED
     *
     * Backend:
     *
     * socket.to(room.roomCode).emit(
     *   "room:player_joined",
     *   { player, room }
     * );
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
     *
     * Backend sends this individually:
     *
     * {
     *   roomCode,
     *   role,
     *   room,
     *   challenge,
     *   leaderboard
     * }
     * ------------------------------------------
     */
    socket.on(
      "game:started",
      (data) => {
        console.log(
          "Game started:",
          data
        );

        /*
         * Store our secret role.
         */
        if (data?.role) {
          setPlayerRole(data.role);
        }

        /*
         * Update room players.
         */
        if (data?.room?.players) {
          setPlayers(
            data.room.players
          );
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

      const passed =
        Boolean(
          data.allPassed
        );

      const output =
        data.output ||
        data.stdout ||
        "";

      const stderr =
        data.stderr || "";

      /*
       * Display our local execution result.
       */
      setExecutionResult({
        status:
          data.status ||
          (passed
            ? "success"
            : "failed"),

        passed,

        stdout: output,

        stderr,

        exit_code:
          data.exitCode,

        executionTimeMs:
          data.executionTimeMs,
      });

      /*
       * --------------------------------------
       * Tell the backend about the test result.
       *
       * This is what your backend uses for:
       *
       * - replay timeline
       * - XP
       * - test:result broadcast
       * --------------------------------------
       */
      socketRef.current?.emit(
        "test:run",
        {
          roomCode,

          author: username,

          authorRole:
            playerRole,

          passed,

          details:
            stderr ||
            output ||
            (passed
              ? "All tests passed!"
              : "Tests failed."),

          code:
            currentCode,
        }
      );
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
          "Code reset",

        activeLines: [],
      }
    );
  };

  return (
    <div
      className={
        styles.editorWrapper
      }
    >
      {/* ==================== TOP BAR ==================== */}

      <header
        className={
          styles.topBar
        }
      >
        <div
          className={
            styles.leftControls
          }
        >
          <div
            className={
              styles.brand
            }
          >
            <Code2 size={20} />
            <span>
              CodeMafia
            </span>
          </div>

          <select
            className={
              styles.langSelect
            }
            value={language}
            onChange={
              handleLanguageChange
            }
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
            className={
              styles.iconBtn
            }
            title="Reset code template"
            onClick={
              handleResetCode
            }
          >
            <RotateCcw
              size={15}
            />
          </button>
        </div>

        <div
          className={
            styles.rightControls
          }
        >
          <div
            className={
              styles.timerBadge
            }
          >
            <Timer
              size={16}
              color="#ffa116"
            />

            <span
              className={
                styles.timerDisplay
              }
            >
              {formatTime(
                seconds
              )}
            </span>
          </div>

          <div
            className={
              styles.divider
            }
          />

          <button
            type="button"
            className={
              styles.runBtn
            }
            onClick={() =>
              runCode(false)
            }
            disabled={
              isRunning
            }
          >
            <PlayCircle
              size={15}
            />

            {isRunning
              ? "Running..."
              : "Run"}
          </button>

          <button
            type="button"
            className={
              styles.submitBtn
            }
            onClick={() =>
              runCode(true)
            }
            disabled={
              isRunning
            }
          >
            <Send size={14} />

            {isRunning
              ? "Submitting..."
              : "Submit"}
          </button>
        </div>
      </header>

      {/* ==================== EDITOR ==================== */}

      <main
        className={
          styles.editorArea
        }
      >
        {loadingChallenge && (
          <div
            className={
              styles.challengeLoading
            }
          >
            Loading challenge...
          </div>
        )}

        {challengeError && (
          <div
            className={
              styles.challengeError
            }
          >
            {challengeError}
          </div>
        )}

        {challenge && (
          <section
            className={
              styles.challengePanel
            }
          >
            <h1>
              {challenge.title}
            </h1>

            <p>
              {
                challenge.description
              }
            </p>

            <div
              className={
                styles.challengeMeta
              }
            >
              <span>
                Language:{" "}
                {
                  challenge.language
                }
              </span>

              <span>
                Tests:{" "}
                {challenge
                  .test_cases
                  ?.length ||
                  0}
              </span>

              <span>
                Role:{" "}
                {playerRole}
              </span>
            </div>
          </section>
        )}

        <div
          className={
            styles.monacoContainer
          }
        >
          <Editor
            height="100%"
            width="100%"
            language={
              language
            }
            value={code}
            theme="vs-dark"
            onMount={
              handleEditorMount
            }
            onChange={
              handleCodeChange
            }
            options={{
              minimap: {
                enabled: false,
              },

              fontSize: 14,

              automaticLayout:
                true,

              tabSize: 2,

              wordWrap: "on",

              scrollBeyondLastLine:
                false,

              smoothScrolling:
                true,

              cursorBlinking:
                "smooth",

              bracketPairColorization:
                {
                  enabled:
                    true,
                },

              padding: {
                top: 12,
                bottom: 12,
              },

              renderWhitespace:
                "selection",

              lineNumbers:
                "on",

              folding: true,

              suggestOnTriggerCharacters:
                true,
            }}
          />
        </div>
      </main>

      {/* ==================== OUTPUT PANEL ==================== */}

      {executionResult && (
        <section
          className={
            styles.outputPanel
          }
        >
          <div
            className={
              styles.outputHeader
            }
          >
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
                {
                  executionResult.exit_code
                }
              </span>
            )}

            {executionResult.executionTimeMs !==
              undefined && (
              <span>
                {
                  executionResult.executionTimeMs
                }{" "}
                ms
              </span>
            )}

            <button
              type="button"
              className={
                styles.closeOutputBtn
              }
              onClick={() =>
                setExecutionResult(
                  null
                )
              }
              title="Close output"
            >
              ×
            </button>
          </div>

          {executionResult.stdout && (
            <pre>
              {
                executionResult.stdout
              }
            </pre>
          )}

          {executionResult.stderr && (
            <pre
              className={
                styles.errorOutput
              }
            >
              {
                executionResult.stderr
              }
            </pre>
          )}

          {!executionResult.stdout &&
            !executionResult.stderr && (
              <pre
                className={
                  styles.emptyOutput
                }
              >
                No output returned.
              </pre>
            )}
        </section>
      )}

      {/* ==================== STATUS BAR ==================== */}

      <footer
        className={
          styles.statusBar
        }
      >
        <div
          className={
            styles.statusIndicator
          }
        >
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
          {roomCode ||
            "default"}
        </div>

        <div>
          Players:{" "}
          {players.length}
        </div>
      </footer>
    </div>
  );
}