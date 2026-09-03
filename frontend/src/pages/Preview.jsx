import { useLocation, useNavigate } from "react-router-dom";
import style from "./styles/Preview.module.css";

export default function OnboardingPreview() {
  const navigate=useNavigate();
  const { state }=useLocation();

  const displayText=Object.entries(state?.preview)
  .map(([key, value])=> `${key}: ${value}`)
  .join("\n");

  return(
    <main className={style["preview-wrapper"]}>
      <div className={style["preview-container"]}>
        <h1 className={style["headerlbl"]}>Your Answers</h1>

        <textarea
          className={style["previewText"]}
          value={displayText}
          readOnly
          rows={7}
          placeholder="Your preview will appear here..."
        />

        <button
          className={style["btn"]}
          onClick={() => navigate("/chatbot")}>
          Navigate to ChatBot
        </button>
      </div>
    </main>
  );
}