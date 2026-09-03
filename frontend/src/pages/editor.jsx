import{ useEffect, useRef, useState } from "react";
import{ useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import{ Timer, RotateCcw, Code2, PlayCircle, Send } from "lucide-react";
import * as Y from "yjs";
import{ WebsocketProvider } from "y-websocket";
import styles from "./styles/editor.module.css";

const STARTER_TEMPLATES ={
  javascript:`/**
 * Problem:Two Sum
 * @param{number[]} nums
 * @param{number} target
 * @return{number[]}
 */
function twoSum(nums, target){
  const map = new Map();
  for (let i = 0; i < nums.length; i++){
    const complement = target - nums[i];
    if (map.has(complement)){
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,
  python:`class Solution:
    def twoSum(self, nums:list[int], target:int) -> list[int]:
        lookup ={}
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

export default function MonacoEditorPage(){
  const{ gameId } = useParams();

  const editorRef = useRef(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);
  const [connected, setConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [seconds, setSeconds] = useState(0);

  useEffect(() =>{
    const interval = setInterval(() =>{
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
    }, []);

  const formatTime = (totalSecs) =>{
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return [hrs, mins, secs]
    .map((v) => String(v).padStart(2, "0")).join(":");
  };

  const runCode = async (submit=false)=>{
    if(!editorRef.current || isRunning) return;

    const currentCode = editorRef.current.getValue();
    if(!currentCode.trim()){
        setExecutionResult({
            status:"error",
            passed:false,
            stdout:"",
            stderr:"No code to run."
        });
        return;
    }
    setIsRunning(true);
    setExecutionResult(null);
    
    try{
        const response = await fetch("/api/run-code", {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            roomId:gameId,
            code:currentCode,
            language:language,
            submit
          }),
        });
        const data = await response.json();
        if (!response.ok){ 
            throw new Error(data?.message || data?.error || `Server error: ${response.status}`);
        }
        setExecutionResult(data.result);
      }
      catch(error){
        setExecutionResult({
            status:"error",
            passed:false,
            stdout:"",
            stderr:error?.message,
        });
      } finally {
        setIsRunning(false);
      }
  }

  useEffect(() =>{
    let provider = null;
    let doc = null;
    try{
      doc = new Y.Doc();
      const yText = doc.getText("code");

      provider = new WebsocketProvider(
        "ws://localhost:1234",
        `codemafia-${gameId || "default"}`,
        doc
      );
      provider.on("status", ({ status }) =>{
        setConnected(status === "connected");
      });

      const handleYjsChange = () =>{
        const value = yText.toString();
        if (value){
          setCode(value);
          if (editorRef.current && editorRef.current.getValue() !== value){
            editorRef.current.setValue(value);
          }
        }
      };

      yText.observe(handleYjsChange);
      if (yText.length === 0 && STARTER_TEMPLATES[language]){
        yText.insert(0, STARTER_TEMPLATES[language]);
      }
    } catch{
      setConnected(false);
    }
    return () =>{
      if (provider) provider.destroy();
      if (doc) doc.destroy();
    };
  }, [gameId]);

  const handleEditorMount = (editor, monaco) =>{
    editorRef.current = editor;
  };

  const handleLanguageChange = (e) =>{
    const newLang = e.target.value;
    setLanguage(newLang);
    const template = STARTER_TEMPLATES[newLang] || "";
    setCode(template);
    if (editorRef.current){
      editorRef.current.setValue(template);
    }
  };

  const handleResetCode = () =>{
    const template = STARTER_TEMPLATES[language] || "";
    setCode(template);
    if (editorRef.current){
      editorRef.current.setValue(template);
    }
  };

  return(
    <div className={styles.editorWrapper}>
      <header className={styles.topBar}>
        <div className={styles.leftControls}>
          <div className={styles.brand}>
            <Code2 size={20}/>
            <span>CodeMafia</span>
          </div>

          <select
            className={styles.langSelect}
            value={language}
            onChange={handleLanguageChange}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>

          <button
            className={styles.iconBtn}
            title="Reset code template"
            onClick={handleResetCode}>
            <RotateCcw size={15}/>
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.timerBadge}>
            <Timer size={16} color="#ffa116"/>
            <span className={styles.timerDisplay}>{formatTime(seconds)}</span>
          </div>

          <div className={styles.divider}/>
          <button
            className={styles.runBtn}
            onClick={() => runCode(false)}
            disabled={isRunning}>
            <PlayCircle size={15}/>
            {isRunning ? "Running..." : "Run"}
          </button>

          <button
            className={styles.submitBtn}
            onClick={() => runCode(true)}
            disabled={isRunning}>
            <Send size={14}/>
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
          onChange={(val) => setCode(val || "")}
          options={{
            minimap:{ enabled:false },
            fontSize:14,
            automaticLayout:true,
            tabSize:2,
            wordWrap:"on",
            scrollBeyondLastLine:false,
            smoothScrolling:true,
            cursorBlinking:"smooth",
            bracketPairColorization:{ enabled:true },
            padding:{ top:12, bottom:12 },
          }}
       />
      </main>

    {executionResult && (
    <section className={styles.outputPanel}>
        <div className={styles.outputHeader}>
        <strong>
            {executionResult.passed ? "Passed":"✗ Failed"}
        </strong>

        {executionResult.exit_code !== undefined &&(
            <span>Exit code:{executionResult.exit_code}</span>
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
            className={connected ? styles.dotConnected :styles.dotDisconnected}
         />
          <span>{connected ? "Collaborative Online" :"Local Mode"}</span>
        </div>
        <div>Room:{gameId || "default"}</div>
      </footer>
    </div>
  );
}
