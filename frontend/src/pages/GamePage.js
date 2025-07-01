// frontend/src/pages/GamePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { API_BASE_URL, SOCKET_BASE_URL } from '../config/api';
import io from 'socket.io-client';
import './GamePage.css';

const GamePage = () => {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  
  // Auth states
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Game states
  const [gameData, setGameData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Game flow states
  const [gameState, setGameState] = useState('question');
  const [scoreboard, setScoreboard] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [scoreGained, setScoreGained] = useState(0);
  const [nextQuestionTimer, setNextQuestionTimer] = useState(0);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  
  // Socket.IO state
  const [socket, setSocket] = useState(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      const userToken = authService.getCurrentUserToken();
      const userData = authService.getCurrentUser();
      
      if (!userToken || !userData) {
        navigate('/login');
        return;
      }
      
      setToken(userToken);
      setAuthChecked(true);
    };

    checkAuth();
  }, [navigate]);

  // Socket.IO connection
  useEffect(() => {
    if (!token || !gameCode) return;

    console.log('Connecting to Socket.IO...');
    const newSocket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('joinGameRoom', gameCode);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('answerSubmitted', (data) => {
      console.log('Someone answered:', data);
    });

    newSocket.on('showScoreboard', (data) => {
      console.log('Showing scoreboard:', data);
      setCorrectAnswer(data.correctAnswer);
      setScoreboard(data.scoreboard);
      setGameState('scoreboard');
      setNextQuestionTimer(4);
    });

    newSocket.on('nextQuestion', (data) => {
      console.log('Next question:', data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTimeLeft(data.question.timeLimit || 15);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      setAnswerResult(null);
      setScoreGained(0);
      setShowAnswerFeedback(false);
      setGameState('question');
    });

    newSocket.on('gameFinished', (data) => {
      console.log('Game finished:', data);
      setScoreboard(data.finalScoreboard);
      setGameState('finished');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, gameCode]);

  // Fallback polling
  useEffect(() => {
    if (!token || !gameCode || gameState === 'finished' || socket?.connected) return;

    const pollGameState = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/games/${gameCode}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.gameState === 'finished' && gameState !== 'finished') {
            setGameState('finished');
            fetchFinalScoreboard();
            return;
          }

          if (data.currentQuestionIndex > questionIndex) {
            const newQuestion = data.quiz.questions[data.currentQuestionIndex];
            setCurrentQuestion(newQuestion);
            setQuestionIndex(data.currentQuestionIndex);
            setTimeLeft(newQuestion?.timeLimit || 15);
            setSelectedAnswer(null);
            setCorrectAnswer(null);
            setAnswerResult(null);
            setScoreGained(0);
            setShowAnswerFeedback(false);
            setGameState('question');
            console.log('New question received via polling:', newQuestion.questionText);
          }

          if (gameState === 'waiting') {
            checkScoreboard();
          }
        }
      } catch (error) {
        console.error('Game state polling error:', error);
      }
    };

    const intervalId = setInterval(pollGameState, 2000);
    return () => clearInterval(intervalId);
  }, [token, gameCode, gameState, questionIndex, socket?.connected]);

  // Initial data fetch
  useEffect(() => {
    if (authChecked && token) {
      fetchGameData();
    }
  }, [authChecked, token]);

  // Fetch game data
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
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          navigate('/login');
          return;
        }
        throw new Error('Oyun verilerini çekerken hata oluştu');
      }

      const data = await response.json();
      setGameData(data);
      
      if (data.gameState === 'finished') {
        setGameState('finished');
        setScoreboard(data.scoreboard || []);
      } else if (data.quiz && data.quiz.questions && data.quiz.questions.length > 0) {
        const currentQ = data.quiz.questions[data.currentQuestionIndex || 0];
        setCurrentQuestion(currentQ);
        setQuestionIndex(data.currentQuestionIndex || 0);
        setTimeLeft(currentQ?.timeLimit || 15);
      }
      
      setError(null);
    } catch (err) {
      console.error('Game data fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gameCode, token, navigate]);

  // Scoreboard kontrolü
  const checkScoreboard = useCallback(async () => {
    if (!token || gameState !== 'waiting') return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}/scoreboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.allAnswered && data.scoreboard && data.scoreboard.length > 0) {
          setScoreboard(data.scoreboard);
          setGameState('scoreboard');
          setNextQuestionTimer(4);
          console.log('Scoreboard received via polling');
        }
      }
    } catch (error) {
      console.error('Scoreboard check error:', error);
    }
  }, [token, gameCode, gameState]);

  // Final scoreboard fetch
  const fetchFinalScoreboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}/scoreboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScoreboard(data.scoreboard || []);
      }
    } catch (error) {
      console.error('Final scoreboard fetch error:', error);
    }
  }, [token, gameCode]);

  // Submit answer function
  const submitAnswer = useCallback(async (answerIndex, timeSpent) => {
    if (!token || !currentQuestion) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          selectedAnswer: answerIndex,
          timeSpent: timeSpent || (15 - timeLeft)
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        setCorrectAnswer(result.correctAnswer);
        setAnswerResult(result.isCorrect ? 'correct' : 'incorrect');
        setScoreGained(result.scoreGained || 0);
        setScore(result.newScore || score);
        setShowAnswerFeedback(true);
        
        setTimeout(() => {
          if (result.scoreboard) {
            setScoreboard(result.scoreboard);
            setGameState('scoreboard');
            setNextQuestionTimer(4);
          } else {
            setGameState('waiting');
          }
        }, 2000);
        
      } else {
        const errorData = await response.json();
        console.error('Answer submit error:', errorData);
      }
    } catch (err) {
      console.error('Answer submit error:', err);
    }
  }, [token, currentQuestion, gameCode, timeLeft, score]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((optionIndex) => {
    if (timeLeft > 0 && gameState === 'question' && selectedAnswer === null) {
      setSelectedAnswer(optionIndex);
      submitAnswer(optionIndex);
    }
  }, [timeLeft, gameState, selectedAnswer, submitAnswer]);

  // Handle timeout
  const handleTimeout = useCallback(async () => {
    if (!token || !currentQuestion || selectedAnswer !== null) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          selectedAnswer: null,
          timeSpent: 15
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        setCorrectAnswer(result.correctAnswer);
        setAnswerResult('timeout');
        setScoreGained(0);
        setScore(result.newScore || score);
        setShowAnswerFeedback(true);
        
        setTimeout(() => {
          if (result.scoreboard) {
            setScoreboard(result.scoreboard);
            setGameState('scoreboard');
            setNextQuestionTimer(4);
          } else {
            setGameState('waiting');
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Timeout error:', err);
    }
  }, [token, currentQuestion, gameCode, score, selectedAnswer]);

  // Move to next question
  const moveToNextQuestion = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameCode}/nextquestion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.finished) {
          setGameState('finished');
          setScoreboard(result.finalScoreboard || scoreboard);
        } else {
          setCurrentQuestion(result.question);
          setQuestionIndex(result.questionIndex);
          setTimeLeft(result.question?.timeLimit || 15);
          setSelectedAnswer(null);
          setCorrectAnswer(null);
          setAnswerResult(null);
          setScoreGained(0);
          setShowAnswerFeedback(false);
          setGameState('question');
        }
      }
    } catch (err) {
      console.error('Next question error:', err);
    }
  }, [token, gameCode, scoreboard]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && gameState === 'question' && selectedAnswer === null) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'question' && selectedAnswer === null) {
      handleTimeout();
    }
  }, [timeLeft, gameState, selectedAnswer, handleTimeout]);

  // Next question timer effect
  useEffect(() => {
    if (nextQuestionTimer > 0 && gameState === 'scoreboard') {
      const timer = setTimeout(() => {
        setNextQuestionTimer(nextQuestionTimer - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (nextQuestionTimer === 0 && gameState === 'scoreboard') {
      moveToNextQuestion();
    }
  }, [nextQuestionTimer, gameState, moveToNextQuestion]);

  // Utility functions
  const getTimerColor = () => {
    if (timeLeft > 10) return 'timer-green';
    if (timeLeft > 5) return 'timer-yellow';
    return 'timer-red';
  };

  const getOptionColor = (index) => {
    const colors = ['option-red', 'option-blue', 'option-yellow', 'option-green'];
    return colors[index] || 'option-gray';
  };

  const getOptionLetter = (index) => {
    return String.fromCharCode(65 + index);
  };

  const getOptionClass = (index) => {
    let baseClass = `option-button ${getOptionColor(index)}`;
    
    if (showAnswerFeedback && correctAnswer !== null) {
      if (index === correctAnswer) {
        baseClass += ' correct-answer';
      } else if (index === selectedAnswer && selectedAnswer !== correctAnswer) {
        baseClass += ' wrong-answer';
      }
    }
    
    if (selectedAnswer === index) {
      baseClass += ' selected';
    }
    
    if (gameState !== 'question' || timeLeft === 0 || selectedAnswer !== null) {
      baseClass += ' disabled';
    }
    
    return baseClass;
  };

  // Loading state
  if (!authChecked) {
    return (
      <div className="game-container loading-screen">
        <div className="loading-text">Kimlik doğrulanıyor...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="game-container loading-screen">
        <div className="loading-text">Oyun yükleniyor...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="game-container error-screen">
        <div className="error-content">
          <h2>Hata</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const currentUser = authService.getCurrentUser();
    const sortedPlayers = [...scoreboard].sort((a, b) => b.score - a.score);
    
    return (
      <div className="game-container">
        <div className="game-content">
          <div className="finished-container">
            <h1 className="finished-title">🎉 Oyun Bitti! 🎉</h1>
            
            <div className="final-scoreboard">
              <h2>Final Skor Tablosu</h2>
              <div className="scoreboard-list">
                {sortedPlayers.map((player, index) => {
                  const playerId = player.userId._id || player.userId;
                  const playerUsername = player.username || 
                                       player.userId?.username || 
                                       `Oyuncu ${index + 1}`;
                  
                  return (
                    <div 
                      key={playerId || index}
                      className={`winner-item rank-${index + 1} ${
                        playerId === currentUser._id ? 'current-user' : ''
                      }`}
                    >
                      <div className="trophy">
                        {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                      </div>
                      <div className="winner-info">
                        <div className="winner-name">
                          {index + 1}. {playerUsername}
                          {playerId === currentUser._id && ' (Sen)'}
                        </div>
                        <div className="winner-score">{player.score.toLocaleString()} puan</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="back-to-dashboard"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scoreboard state
  if (gameState === 'scoreboard') {
    const currentUser = authService.getCurrentUser();
    const sortedPlayers = [...scoreboard].sort((a, b) => b.score - a.score);
    
    return (
      <div className="game-container">
        <header className="game-header">
          <div className="header-left">
            <div className="game-title">QuizMaster</div>
            <div className="question-counter">
              Soru {questionIndex + 1}/{gameData?.quiz?.questions?.length || 1}
            </div>
          </div>
          
          <div className="header-right">
            <div className="score-display">
              <div className="score-label">Skorun</div>
              <div className="score-value">{score.toLocaleString()}</div>
            </div>
          </div>
        </header>

        <div className="game-content">
          <div className="answer-feedback">
            <p className={`feedback-text ${answerResult}`}>
              {answerResult === 'correct' && '✅ Doğru Cevap!'}
              {answerResult === 'incorrect' && '❌ Yanlış Cevap!'}
              {answerResult === 'timeout' && '⏰ Süre Doldu!'}
            </p>
            {scoreGained > 0 && (
              <p className="score-gained">+{scoreGained.toLocaleString()} puan!</p>
            )}
          </div>

          <div className="scoreboard-container">
            <h2 className="scoreboard-title">Anlık Skor Tablosu</h2>
            <div className="scoreboard-list">
              {sortedPlayers.map((player, index) => {
                const playerId = player.userId._id || player.userId;
                const playerUsername = player.username || 
                                     player.userId?.username || 
                                     `Oyuncu ${index + 1}`;
                
                return (
                  <div 
                    key={playerId || index}
                    className={`scoreboard-item ${
                      playerId === currentUser._id ? 'current-user' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="rank">#{index + 1}</div>
                    <div className="player-info">
                      <div className="player-name">
                        {playerUsername}
                        {playerId === currentUser._id && ' (Sen)'}
                      </div>
                      <div className={`answer-indicator ${player.lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
                        {player.lastAnswerCorrect ? 'Doğru' : 'Yanlış'}
                      </div>
                    </div>
                    <div className="player-score">{player.score.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="next-question-timer">
              <p>Sonraki soru</p>
              <div className="timer-bar"></div>
              <p>{nextQuestionTimer} saniye</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting state
  if (gameState === 'waiting') {
    return (
      <div className="game-container">
        <header className="game-header">
          <div className="header-left">
            <div className="game-title">QuizMaster</div>
            <div className="question-counter">
              Soru {questionIndex + 1}/{gameData?.quiz?.questions?.length || 1}
            </div>
          </div>
          
          <div className="header-right">
            <div className="score-display">
              <div className="score-label">Skorun</div>
              <div className="score-value">{score.toLocaleString()}</div>
            </div>
          </div>
        </header>

        <div className="game-content">
          {showAnswerFeedback && (
            <div className="answer-feedback">
              <p className={`feedback-text ${answerResult}`}>
                {answerResult === 'correct' && '✅ Doğru Cevap!'}
                {answerResult === 'incorrect' && '❌ Yanlış Cevap!'}
                {answerResult === 'timeout' && '⏰ Süre Doldu!'}
              </p>
              {scoreGained > 0 && (
                <p className="score-gained">+{scoreGained.toLocaleString()} puan!</p>
              )}
            </div>
          )}

          <div className="waiting-state">
            <h2>Diğer oyuncular bekleniyor...</h2>
            <div className="waiting-dots">
              <div className="waiting-dot"></div>
              <div className="waiting-dot"></div>
              <div className="waiting-dot"></div>
            </div>
            <p>Tüm oyuncular cevapladığında sonuçlar gösterilecek</p>
          </div>
        </div>
      </div>
    );
  }

  // Question state (default)
  if (!currentQuestion) {
    return (
      <div className="game-container loading-screen">
        <div className="loading-text">Sorular yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="header-left">
          <div className="game-title">QuizMaster</div>
          <div className="question-counter">
            Soru {questionIndex + 1}/{gameData?.quiz?.questions?.length || 1}
          </div>
        </div>
        
        <div className="header-right">
          <div className="score-display">
            <div className="score-label">Skorun</div>
            <div className="score-value">{score.toLocaleString()}</div>
          </div>
          
          <div className="timer-container">
            <div className={`timer-circle ${getTimerColor()}`}>
              {timeLeft}
            </div>
          </div>
        </div>
      </header>

      <div className="game-content">
        <div className="question-container">
          <div className="question-box">
            <h1 className="question-text">
              {currentQuestion.questionText}
            </h1>
          </div>
        </div>

        <div className="options-grid">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={gameState !== 'question' || timeLeft === 0 || selectedAnswer !== null}
              className={getOptionClass(index)}
            >
              <div className="option-content">
                <div className="option-letter">
                  {getOptionLetter(index)}
                </div>
                <span className="option-text">{option}</span>
              </div>
              
              {selectedAnswer === index && (
                <div className="check-mark">✓</div>
              )}
            </button>
          ))}
        </div>

        {showAnswerFeedback && (
          <div className="answer-feedback show">
            <p className={`feedback-text ${answerResult}`}>
              {answerResult === 'correct' && '✅ Doğru Cevap!'}
              {answerResult === 'incorrect' && '❌ Yanlış Cevap!'}
              {answerResult === 'timeout' && '⏰ Süre Doldu!'}
            </p>
            {scoreGained > 0 && (
              <p className="score-gained">+{scoreGained.toLocaleString()} puan!</p>
            )}
          </div>
        )}

        <div className="bottom-info">
          {gameState === 'question' && timeLeft > 0 && selectedAnswer === null ? (
            <p className="info-text">Bir seçenek seç!</p>
          ) : gameState === 'question' && selectedAnswer !== null ? (
            <p className="info-text">Cevabın kaydedildi! Sonuçlar gösteriliyor...</p>
          ) : (
            <p className="info-text bold">Sonuçlar gösteriliyor...</p>
          )}
        </div>
      </div>

      <div className="progress-container">
        <div 
          className="progress-bar"
          style={{ width: `${((questionIndex + 1) / (gameData?.quiz?.questions?.length || 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default GamePage;