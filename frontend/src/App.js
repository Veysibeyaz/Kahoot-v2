// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MyQuiz from './pages/MyQuiz';
import CreateQuizPage from './pages/CreateQuizPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ana sayfa direkt login'e yönlendir */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-quizzes" element={<MyQuiz />} />
        <Route path="/create-quiz" element={<CreateQuizPage/>} />
        <Route path="/lobby/:gameCode" element={<LobbyPage/>} />
        <Route path="/join-game/:gameCode" element={<LobbyPage/>} />
        <Route path="/game/:gameCode" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;