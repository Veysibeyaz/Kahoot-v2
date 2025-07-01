// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import audioService from '../services/audioService';
import AudioControls from '../components/AudioControls';
import './DashboardPage.css';
import logo from '../assets/logo.png'; // Logo dosyanızın yolunu doğru şekilde belirtin

const DashboardPage = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [gamePin, setGamePin] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Kullanıcının giriş yapmış olup olmadığını kontrol et
    const token = authService.getCurrentUserToken();
    const currentUser = authService.getCurrentUser();
    
    if (!token || !currentUser) {
      navigate('/login');
      return;
    }

    // Audio service'i başlat (user interaction sonrası)
    const initAudio = () => {
      audioService.initAudioContext();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    // Gerçek kullanıcı adını set et
    if (currentUser.username) {
      setUsername(currentUser.username);
    } else {
      setUsername('User'); // Fallback değer
    }
    
    setLoading(false);

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, [navigate]);

  const handleLogout = () => {
    // Click ses efekti
    audioService.playClickSound();
    
    authService.logout();
    navigate('/login');
  };

  const handleCreateQuiz = () => {
    // Click ses efekti
    audioService.playClickSound();
    
    // Quiz oluşturma sayfasına yönlendir
    navigate('/create-quiz');
  };

  const handleMyQuizzes = () => {
    // Click ses efekti
    audioService.playClickSound();
    
    // Quizlerim sayfasına yönlendir
    navigate('/my-quizzes');
  };

  const handleJoinGame = () => {
    if (gamePin.trim()) {
      // Join ses efekti
      audioService.playJoinSound();
      
      console.log('Joining game with code:', gamePin.trim()); // Debug için
      navigate(`/join-game/${gamePin.trim()}`);
    } else {
      // Error ses efekti
      audioService.playWrongSound();
      alert('Lütfen bir oyun kodu girin!');
    }
  };

  // Hover ses efektleri için handler
  const handleCardHover = () => {
    audioService.playHoverSound();
  };

  const handleButtonHover = () => {
    audioService.playHoverSound();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <img src={logo} alt="QuizMaster Logo" className="header-logo" />
          <h1>QuizMaster</h1>
        </div>
        <div className="dashboard-user">
          {username && (
            <div className="user-info">
              <span className="user-greeting">Welcome,</span>
              <span className="user-name">{username}</span>
            </div>
          )}
          <button 
            onClick={handleLogout} 
            onMouseEnter={handleButtonHover}
            className="logout-button"
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Quick Access Cards */}
        <section className="quick-access-section">
          <div className="quick-access-cards">
            <div 
              className="quick-card create-quiz-card" 
              onClick={handleCreateQuiz}
              onMouseEnter={handleCardHover}
            >
              <div className="card-icon">
                <i className="fas fa-plus-circle"></i>
              </div>
              <h3>Create New Quiz</h3>
              <p>Design your own interactive quiz with multiple choice questions</p>
              <button 
                className="card-button create-button"
                onMouseEnter={handleButtonHover}
              >
                Create Quiz
              </button>
            </div>
            
            <div 
              className="quick-card join-game-card"
              onMouseEnter={handleCardHover}
            >
              <div className="card-icon">
                <i className="fas fa-gamepad"></i>
              </div>
              <h3>Join a Game</h3>
              <p>Enter a game PIN to join as a player</p>
              <div className="join-game-input-group">
                <input 
                  type="text" 
                  placeholder="Enter game PIN" 
                  value={gamePin}
                  onChange={(e) => setGamePin(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinGame();
                    }
                  }}
                  className="game-pin-input"
                />
                <button 
                  onClick={handleJoinGame} 
                  onMouseEnter={handleButtonHover}
                  className="join-game-button"
                >
                  Join
                </button>
              </div>
            </div>
            
            <div 
              className="quick-card my-quizzes-card" 
              onClick={handleMyQuizzes}
              onMouseEnter={handleCardHover}
            >
              <div className="card-icon">
                <i className="fas fa-list-check"></i>
              </div>
              <h3>My Quizzes</h3>
              <p>View, edit and manage all your created quizzes</p>
              <button 
                className="card-button my-quizzes-button"
                onMouseEnter={handleButtonHover}
              >
                View Quizzes
              </button>
            </div>
          </div>
        </section>

        {/* Audio Controls */}
        <AudioControls />

        {/* Features Section */}
        <section className="features-section">
          <h2>Platform Features</h2>
          <div className="features-grid">
            <div className="feature-item" onMouseEnter={handleCardHover}>
              <div className="feature-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <h3>Real-time Gaming</h3>
              <p>Live multiplayer quiz sessions with instant scoring and leaderboards</p>
            </div>
            
            <div className="feature-item" onMouseEnter={handleCardHover}>
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Analytics Dashboard</h3>
              <p>Track performance, view detailed statistics and monitor progress</p>
            </div>
            
            <div className="feature-item" onMouseEnter={handleCardHover}>
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Team Collaboration</h3>
              <p>Create teams, share quizzes and collaborate with colleagues</p>
            </div>
            
            <div className="feature-item" onMouseEnter={handleCardHover}>
              <div className="feature-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <h3>Mobile Friendly</h3>
              <p>Responsive design that works perfectly on all devices</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2023 QuizMaster. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardPage;