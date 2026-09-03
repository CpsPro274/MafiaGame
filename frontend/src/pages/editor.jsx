import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import styles from "./styles/editor.module.css";

export default function editor() {
  const { gameId } = useParams();

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    const doc = new Y.Doc();
    const yText = doc.getText("code");
    
    const provider = new WebsocketProvider(
      "ws://localhost:1234",
      `codemafia-${gameId || "default"}`,
      doc
    );

    provider.on("status", ({ status }) => {
      setConnected(status === "connected");
      console.log("Yjs WebSocket:", status);
    });

    const handleYjsChange = () => {
      const value = yText.toString();

      setCode(value);

      if (editorRef.current) {
        const currentValue = editorRef.current.getValue();

        if (currentValue !== value) {
          editorRef.current.setValue(value);
        }
      }
    };

    yText.observe(handleYjsChange);

    if (yText.length === 0) {
      yText.insert(0, "// Code Mafia\n\nconsole.log('hello');\n");
    }

    setCode(yText.toString());

    return () => {
      yText.unobserve(handleYjsChange);
      provider.destroy();
      doc.destroy();
    };
  }, [gameId]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeModelContent((event) => {
      const value = editor.getValue();

      setCode(value);

      console.log("Local change:", event);
    });
  };

  return (
    <div className={styles.editorPage}>
      <header className={styles.header}>
        <div>
          <h1>Code Mafia</h1>
          <span>Game: {gameId || "DEMO"}</span>
        </div>

        <div className={styles.connection}>
          <span
            className={
              connected
                ? styles.connected
                : styles.disconnected
            }
          >
            ●
          </span>

          {connected ? "Connected" : "Connecting..."}
        </div>
      </header>

      <main className={styles.editorContainer}>
        <Editor
          height="calc(100vh - 70px)"
          defaultLanguage="javascript"
          value={code}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            minimap: {
              enabled: false,
            },
            fontSize: 15,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </main>
    </div>
  );
}
