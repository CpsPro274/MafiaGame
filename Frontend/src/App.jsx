import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Login from "./pages/Login";
import ReplayArena from "./pages/ReplayArena";
import GameArena from "./pages/GameArena";

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/login" element={<Login />} />
          <Route path="/replay" element={<ReplayArena />} />
          <Route path="/arena" element={<GameArena />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;