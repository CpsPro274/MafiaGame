import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Timer, Play, Pause, RotateCcw, Code2, PlayCircle, Send } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import styles from "./styles/editor.module.css";

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
  cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> lookup;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (lookup.find(complement) != lookup.end()) {
                return {lookup[complement], i};
            }
            lookup[nums[i]] = i;
        }
        return {};
    }
};

int main() {
    Solution s;
    vector<int> nums = {2, 7, 11, 15};
    vector<int> res = s.twoSum(nums, 9);
    cout << "[" << res[0] << ", " << res[1] << "]" << endl;
    return 0;
}
`,
  java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
`,
  typescript: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`
};

export default function MonacoEditorPage() {
  const { gameId } = useParams();

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);
  const [connected, setConnected] = useState(false);

  // LeetCode-style Timer State
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Format seconds to HH:MM:SS
  const formatTime = useCallback((totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  }, []);

  const resetTimer = () => {
    setSeconds(0);
    setIsTimerRunning(false);
  };

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  // Optional Collaborative Yjs Integration
  useEffect(() => {
    let provider = null;
    let doc = null;

    try {
      doc = new Y.Doc();
      const yText = doc.getText("code");

      provider = new WebsocketProvider(
        "ws://localhost:1234",
        `codemafia-${gameId || "default"}`,
        doc
      );

      provider.on("status", ({ status }) => {
        setConnected(status === "connected");
      });

      const handleYjsChange = () => {
        const value = yText.toString();
        if (value) {
          setCode(value);
          if (editorRef.current && editorRef.current.getValue() !== value) {
            editorRef.current.setValue(value);
          }
        }
      };

      yText.observe(handleYjsChange);

      if (yText.length === 0 && STARTER_TEMPLATES[language]) {
        yText.insert(0, STARTER_TEMPLATES[language]);
      }
    } catch {
      setConnected(false);
    }

    return () => {
      if (provider) provider.destroy();
      if (doc) doc.destroy();
    };
  }, [gameId, language]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const template = STARTER_TEMPLATES[newLang] || "";
    setCode(template);
    if (editorRef.current) {
      editorRef.current.setValue(template);
    }
  };

  const handleResetCode = () => {
    const template = STARTER_TEMPLATES[language] || "";
    setCode(template);
    if (editorRef.current) {
      editorRef.current.setValue(template);
    }
  };

  return (
    <div className={styles.editorWrapper}>
      {/* LeetCode Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.leftControls}>
          <div className={styles.brand}>
            <Code2 size={20} />
            <span>CodeStudio</span>
          </div>

          <select
            className={styles.langSelect}
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="typescript">TypeScript</option>
          </select>

          <button
            className={styles.iconBtn}
            title="Reset code template"
            onClick={handleResetCode}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Right Controls: LeetCode Timer & Actions */}
        <div className={styles.rightControls}>
          {/* LeetCode Timer Badge */}
          <div className={styles.timerBadge}>
            <Timer size={16} color="#ffa116" />
            <span className={styles.timerDisplay}>{formatTime(seconds)}</span>
            <button
              className={styles.iconBtn}
              onClick={toggleTimer}
              title={isTimerRunning ? "Pause Timer" : "Start Timer"}
            >
              {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              className={styles.iconBtn}
              onClick={resetTimer}
              title="Reset Timer"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Run & Submit */}
          <button
            className={styles.runBtn}
            onClick={() => console.log("Run code:\n", editorRef.current?.getValue())}
          >
            <PlayCircle size={15} />
            Run
          </button>

          <button
            className={styles.submitBtn}
            onClick={() => console.log("Submit code:\n", editorRef.current?.getValue())}
          >
            <Send size={14} />
            Submit
          </button>
        </div>
      </header>

      {/* Monaco Editor */}
      <main className={styles.editorArea}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </main>

      {/* Bottom Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusIndicator}>
          <span
            className={connected ? styles.dotConnected : styles.dotDisconnected}
          />
          <span>{connected ? "Collaborative Online" : "Local Mode"}</span>
        </div>
        <div>Room: {gameId || "default"}</div>
      </footer>
    </div>
  );
}
