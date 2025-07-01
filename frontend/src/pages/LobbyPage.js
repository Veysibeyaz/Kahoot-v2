// src/pages/LobbyPage.js - Updated with Audio Support
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import audioService from '../services/audioService';
import AudioControls from '../components/AudioControls';
import './LobbyPage.css';

const LobbyPage = () => {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [gameDetails, setGameDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [showHostWarning, setShowHostWarning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previousPlayerCount, setPreviousPlayerCount] = useState(0);

  // Current user bilgilerini al
  const currentUser = authService.getCurrentUser();
  const token = authService.getCurrentUserToken();
  
  // Audio initialization
  useEffect(() => {
    const initAudio = () => {
      audioService.initAudioContext();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Kullanıcı giriş yapmamışsa login'e yönlendir
  useEffect(() => {
    if (!token || !currentUser) {
      navigate('/login');
      return;
    }
  }, [token, currentUser, navigate]);

  const isHost = gameDetails && gameDetails.hostId === currentUser?._id;

  // Oyuncu sayısı değişikliklerini izle (ses efekti için)
  useEffect(() => {
    if (players.length > previousPlayerCount && previousPlayerCount > 0) {
      // Yeni oyuncu katıldı
      audioService.playJoinSound();
    } else if (players.length < previousPlayerCount && previousPlayerCount > 0) {
      // Oyuncu ayrıldı
      audioService.playLeaveSound();
    }
    setPreviousPlayerCount(players.length);
  }, [players.length, previousPlayerCount]);

  // Oyun verilerini çek
  const fetchGameData = useCallback(async () => {
    if (!gameCode || gameCode === 'undefined') {
      setError("Geçersiz oyun kodu!");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError("Giriş yapmanız gerekiyor!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/games/${gameCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Oyun bulunamadı!');
        }
        throw new Error(`HTTP ${response.status}: Oyun verilerini çekerken hata oluştu`);
      }

      const data = await response.json();
      console.log('Game data received:', data);
      
      // OYUN BAŞLAMIŞ MI KONTROL ET
      if (data.state === 'active' || data.gameState === 'in-progress') {
        console.log('Game is active, redirecting to game page...');
        // Oyun başlama ses efekti
        audioService.playGameStartSound();
        navigate(`/game/${gameCode}`);
        return;
      }
      
      setGameDetails(data);
      setPlayers(data.players || []);
      
      // Kullanıcının oyuna katılıp katılmadığını kontrol et
      const userInGame = data.players?.some(player => 
        player.userId?._id === currentUser._id || 
        player.userId === currentUser._id
      );
      setHasJoined(userInGame);
      
      setError(null);
    } catch (err) {
      console.error('Oyun verilerini çekerken hata:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gameCode, token, currentUser, navigate]);

  // Oyuna katıl
  const joinGame = useCallback(async () => {
    if (isJoining || hasJoined) {
      console.log('Already joining or joined, skipping...');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`http://localhost:5000/api/games/${gameCode}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Successfully joined game:', data);
        setHasJoined(true);
        
        // Oyuna katılma ses efekti
        audioService.playJoinSound();
        
        // Eğer zaten oyundaysak (alreadyJoined flag'i varsa)
        if (data.alreadyJoined) {
          console.log('Already in game');
        }
        
        // Oyun verilerini güncelle
        await fetchGameData();
      } else {
        console.error('Failed to join game:', data.message);
        if (data.message !== 'Bu oyuna zaten katıldınız.' && 
            data.message !== 'Zaten oyundasınız') {
          audioService.playWrongSound();
          alert(data.message || 'Oyuna katılırken bir hata oluştu');
        }
      }
    } catch (error) {
      console.error('Error joining game:', error);
      audioService.playWrongSound();
      alert('Oyuna katılırken bir hata oluştu');
    } finally {
      setIsJoining(false);
    }
  }, [gameCode, token, hasJoined, isJoining, fetchGameData]);

  // İlk yükleme - oyun verilerini çek
  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  // Otomatik oyuna katılma - sadece bir kez
  useEffect(() => {
    if (gameDetails && !hasJoined && !isHost && currentUser && !isJoining) {
      joinGame();
    }
  }, [gameDetails, hasJoined, isHost, currentUser, isJoining, joinGame]);

  // Periyodik güncelleme - oyun durumunu kontrol et
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!error) {
        fetchGameData();
      }
    }, 2000); // 2 saniyede bir kontrol et
    
    return () => clearInterval(intervalId);
  }, [fetchGameData, error]);

  const handleStartGame = async () => {
    if (!token) return;
    
    // Click ses efekti
    audioService.playClickSound();
    
    // Host değilse uyarı göster
    if (!isHost) {
      setShowHostWarning(true);
      audioService.playWarningSound();
      setTimeout(() => setShowHostWarning(false), 3000);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/games/${gameCode}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Oyunu başlatırken hata oluştu');
      }

      const gameData = await response.json();
      console.log('Game started successfully:', gameData);
      
      // Oyun başlama ses efekti
      audioService.playGameStartSound();
      
      // Oyun başarıyla başladıysa direkt yönlendir
      navigate(`/game/${gameCode}`);
    } catch (err) {
      console.error('Oyunu başlatma hatası:', err);
      audioService.playWrongSound();
      alert('Oyunu başlatırken hata oluştu: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGame = () => {
    // Leave ses efekti
    audioService.playLeaveSound();
    navigate('/dashboard');
  };

  const handleButtonHover = () => {
    audioService.playHoverSound();
  };

  if (isLoading && !gameDetails) {
    return (
      <div className="player-waiting-room">
        <div className="waiting-card">
          <div className="waiting-header">
            <div className="waiting-icon">⏳</div>
            <h1 className="waiting-title">Yükleniyor...</h1>
            <div className="waiting-status">
              <div className="bounce-dots">
                <div className="bounce-dot"></div>
                <div className="bounce-dot"></div>
                <div className="bounce-dot"></div>
              </div>
              <span>Lobi yükleniyor...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-waiting-room">
        <div className="waiting-card">
          <div className="waiting-header">
            <div className="waiting-icon">❌</div>
            <h1 className="waiting-title">Oyun Bulunamadı</h1>
            <div className="game-code-card">
              <p className="game-code-label">Oyun Kodu</p>
              <div className="game-code-value">{gameCode}</div>
            </div>
            <p style={{color: '#666', marginBottom: '20px'}}>{error}</p>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={() => {
                audioService.playClickSound();
                navigate('/dashboard');
              }}
              onMouseEnter={handleButtonHover}
              className="action-button leave-button"
            >
              <span className="button-icon">🏠</span>
              Dashboard'a Dön
            </button>
            <button 
              onClick={() => {
                audioService.playClickSound();
                setError(null);
                fetchGameData();
              }}
              onMouseEnter={handleButtonHover}
              className="action-button start-button"
            >
              <span className="button-icon">🔄</span>
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TEK TASARIM - HOST VE OYUNCU İÇİN
  return (
    <div className="player-waiting-room">
      {/* Audio Controls */}
      <AudioControls showInGame={true} />
      
      {/* Host Uyarı Mesajı */}
      {showHostWarning && (
        <div className="host-warning-popup">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <p>Sadece host oyunu başlatabilir!</p>
          </div>
        </div>
      )}

      <div className="waiting-card">
        {/* Header */}
        <div className="waiting-header">
          <div className="waiting-icon">
            {isHost ? '👑' : '⏰'}
          </div>
          <h1 className="waiting-title">
            {isHost ? 'Bekleme Odası - Host' : 'Bekleme Odası'}
          </h1>
          
          <div className="game-code-card">
            <p className="game-code-label">Oyun Kodu</p>
            <div className="game-code-value">{gameCode}</div>
          </div>
          
          <div className="waiting-status">
            <div className="bounce-dots">
              <div className="bounce-dot"></div>
              <div className="bounce-dot"></div>
              <div className="bounce-dot"></div>
            </div>
            <span>
              {isHost 
                ? `${players.length} oyuncu katıldı. ${players.length >= 1 ? 'Oyunu başlatabilirsiniz!' : 'Oyuncu bekleniyor...'}` 
                : 'Host oyunu başlatması bekleniyor...'
              }
            </span>
          </div>
        </div>

        {/* Players Section */}
        <div className="players-section">
          <h2 className="players-title">
            Katılan Oyuncular ({players.length})
          </h2>
          
          <div className="players-grid">
            {players.map((player, index) => {
              const playerId = player.userId?._id || player.userId;
              const playerUsername = player.userId?.username || player.username || `Oyuncu ${index + 1}`;
              
              return (
                <div 
                  key={playerId || index}
                  className={`player-card ${
                    playerId === currentUser?._id ? 'current-user' : ''
                  } ${playerId === gameDetails?.hostId ? 'host' : ''}`}
                >
                  <div className="player-avatar">
                    {playerId === gameDetails?.hostId && (
                      <div className="host-crown">👑</div>
                    )}
                    <span className="avatar-letter">
                      {playerUsername.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">
                      {playerUsername}
                    </div>
                    <div className="player-status">
                      {playerId === currentUser?._id && (
                        <span className="you-badge">Sen</span>
                      )}
                      {playerId === gameDetails?.hostId && (
                        <span className="host-badge">Host</span>
                      )}
                      <span className="ready-status">Hazır</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip Section */}
        <div className="tip-section">
          <div className="tip-header">
            <span className="tip-icon">💡</span>
            <h3 className="tip-title">
              {isHost ? 'Host İpucu' : 'Oyun İpucu'}
            </h3>
          </div>
          <p className="tip-text">
            {isHost 
              ? 'En az 1 oyuncu olduğunda oyunu başlatabilirsiniz. Oyuncular hazır olduğunda "Oyunu Başlat" butonuna tıklayın! 🚀'
              : 'Hızlı cevap veren oyuncular daha yüksek puan alır! Doğru cevabı biliyorsan hemen işaretle! ⚡'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            onClick={handleLeaveGame}
            onMouseEnter={handleButtonHover}
            className="action-button leave-button"
          >
            <span className="button-icon">🚪</span>
            Oyundan Ayrıl
          </button>
          
          <button
            onClick={handleStartGame}
            onMouseEnter={handleButtonHover}
            disabled={isHost && (isLoading || players.length < 1)}
            className={`action-button ${
              isHost 
                ? (isLoading || players.length < 1 ? 'waiting-button' : 'start-button')
                : 'non-host-button'
            }`}
          >
            <span className="button-icon">
              {isHost 
                ? (isLoading ? '⏳' : players.length < 1 ? '👥' : '🚀')
                : '🚀'
              }
            </span>
            {isHost 
              ? (isLoading ? 'Başlatılıyor...' : players.length < 1 ? 'Oyuncu Bekleniyor...' : 'Oyunu Başlat')
              : 'Oyunu Başlat'
            }
          </button>
        </div>

        {/* Footer */}
        <div className="footer-text">
          <p>
            {isHost 
              ? 'Oyunu başlattığınızda tüm oyuncular otomatik olarak yönlendirilecek'
              : 'Oyun başladığında otomatik olarak yönlendirileceksiniz'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;