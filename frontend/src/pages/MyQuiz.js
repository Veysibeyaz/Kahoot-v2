// frontend/src/pages/MyQuiz.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../config/api';
import "./MyQuiz.css";

function MyQuiz() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      setError(null);
      
      const storedToken = localStorage.getItem("userToken");
      console.log("MyQuiz.js - useEffect - localStorage'dan okunan token:", storedToken);

      if (!storedToken) {
        setError("Bu sayfayı görüntülemek için giriş yapmalısınız. Yönlendiriliyorsunuz...");
        localStorage.removeItem("userToken");
        setLoading(false);
        setTimeout(() => navigate("/login"), 2500);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/quizzes`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        
        console.log("MyQuiz.js - API Yanıt Verisi:", response.data);
        if (Array.isArray(response.data)) {
          setQuizzes(response.data);
        } else {
          console.error("MyQuiz.js - API'den gelen veri bir dizi değil:", response.data);
          setError("Quiz verileri alınamadı veya format yanlış.");
          setQuizzes([]);
        }
      } catch (err) {
        console.error("MyQuiz.js - Quizleri çekerken hata oluştu:", err);
        if (err.response) {
          console.error("MyQuiz.js - Hata Yanıt Verisi:", err.response.data);
          console.error("MyQuiz.js - Hata Yanıt Statüsü:", err.response.status);
          if (err.response.status === 401 || err.response.status === 403) {
            setError("Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın. Yönlendiriliyorsunuz...");
            localStorage.removeItem("userToken");
            setTimeout(() => navigate("/login"), 2500);
          } else {
            setError(`Quizler alınırken bir hata oluştu: ${err.response.data.message || err.message}`);
          }
        } else if (err.request) {
          setError("Sunucudan yanıt alınamadı. Lütfen internet bağlantınızı kontrol edin veya sunucunun çalıştığından emin olun.");
        } else {
          setError(`Bir hata oluştu: ${err.message}`);
        }
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [navigate]);

  const handleStartGame = async () => {
    if (!selectedQuizId) {
      alert("Lütfen bir quiz seçin!");
      return;
    }

    const storedToken = localStorage.getItem("userToken");
    if (!storedToken) {
      alert("Oyun başlatmak için giriş yapmalısınız. Lütfen tekrar giriş yapın.");
      navigate("/login");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/games`,
        { quizId: selectedQuizId },
        { headers: { Authorization: `Bearer ${storedToken}` } }
      );
      
      alert(`Oyun başarıyla başlatıldı! Oyun Kodu: ${response.data.gameCode}`);
      // Otomatik olarak lobby'ye yönlendir
      navigate(`/lobby/${response.data.gameCode}`);
    } catch (err) {
      console.error("MyQuiz.js - Oyun başlatılırken hata:", err);
      let errorMessage = "Oyun başlatılamadı!";
      if (err.response) {
        errorMessage += ` Hata: ${err.response.data.message || err.response.statusText || 'Sunucu hatası'}`;
        if (err.response.status === 401 || err.response.status === 403) {
          alert("Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.");
          localStorage.removeItem("userToken");
          navigate("/login");
          return;
        }
      } else if (err.request) {
        errorMessage += " Sunucuya ulaşılamadı.";
      } else {
        errorMessage += ` ${err.message}`;
      }
      alert(errorMessage);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="myquiz-container">
        <div className="loading-spinner-myquiz"></div>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>Quizleriniz yükleniyor...</p>
      </div>
    );
  }

  if (error && error.includes("Yönlendiriliyorsunuz...")) {
    return (
      <div className="myquiz-container error-message-container">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="myquiz-container">
      <header className="myquiz-header">
        <h2>Quiz Listem</h2>
        <button onClick={handleGoToDashboard} className="mq-button mq-button-outline">
          <i className="fas fa-arrow-left"></i> Dashboard'a Dön
        </button>
      </header>

      {error && !error.includes("Yönlendiriliyorsunuz...") && (
          <p className="error-message">{error}</p>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <div className="no-quizzes-message">
            <i className="fas fa-folder-open empty-icon"></i>
            <p>Henüz oluşturulmuş bir quiziniz bulunmuyor.</p>
            <button onClick={() => navigate('/create-quiz')} className="mq-button mq-button-primary">
                <i className="fas fa-plus-circle"></i> Hemen Yeni Bir Quiz Oluşturun
            </button>
        </div>
      )}

      {quizzes.length > 0 && (
        <>
          <ul className="quiz-list">
            {quizzes.map((quiz) => (
              <li
                key={quiz._id}
                className={`quiz-item ${selectedQuizId === quiz._id ? "selected" : ""}`}
                onClick={() => setSelectedQuizId(quiz._id)}
              >
                <div className="quiz-item-info">
                    <span className="quiz-title">{quiz.title}</span>
                    <span className="quiz-details">
                        {quiz.questions ? `${quiz.questions.length} Soru` : 'Detay yok'}
                    </span>
                </div>
                <div className="quiz-actions">
                  {/* Gelecekte eklenecek butonlar için yer tutucu */}
                </div>
              </li>
            ))}
          </ul>
          <button
            className="start-game-button mq-button mq-button-primary"
            onClick={handleStartGame}
            disabled={!selectedQuizId || loading}
          >
            <i className="fas fa-play-circle"></i> Seçili Quiz İle Oyun Başlat
          </button>
        </>
      )}
      {quizzes.length > 0 && (
           <button onClick={() => navigate('/create-quiz')} className="mq-button mq-button-secondary create-new-quiz-button-alt">
                <i className="fas fa-plus-circle"></i> Başka Bir Quiz Oluştur
            </button>
      )}
    </div>
  );
}

export default MyQuiz;