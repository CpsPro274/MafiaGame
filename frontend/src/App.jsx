//import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Onboarding from "./pages/Onboarding";
import Editor from "./pages/editor"

import ProtectedRoute from "./components/ProtectedRoute";

// protect dashboard, application, chat, studentProfile, counselorProfile
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />}/>
        <Route path="/lobby" element={<Lobby />}/>
        <Route path="/onboarding" element={<Onboarding />}/>
        <Route path="/editor/:gameId" element={<Editor />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;