//import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Preview from "./pages/Preview"
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
        <Route path="/dashboard" element={<Dashboard />}/>
        <Route path="/onboarding" element={<Onboarding />}/>
        <Route path="/editor" element={<Editor />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;