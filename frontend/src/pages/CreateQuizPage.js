// frontend/src/pages/CreateQuizPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { API_BASE_URL } from '../config/api';
import './CreateQuizPage.css';

const CreateQuizPage = () => {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswerIndex: null, timeLimit: 20 }
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = authService.getCurrentUserToken();
    if (!token) {
      // alert('Quiz oluşturmak için giriş yapmalısınız.');
      // navigate('/login');
    }
  }, [navigate]);

  const handleQuizTitleChange = (e) => {
    setQuizTitle(e.target.value);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', options: ['', '', '', ''], correctAnswerIndex: null, timeLimit: 20 }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      alert("Bir quizde en az bir soru olmalıdır!");
      return;
    }
    const newQuestions = questions.filter((_, qIndex) => qIndex !== index);
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correctAnswerIndex = oIndex;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      alert("Quiz başlığı boş olamaz!");
      return;
    }
    if (questions.some(q => !q.questionText.trim())) {
      alert("Tüm soruların metni dolu olmalıdır!");
      return;
    }
    if (questions.some(q => q.options.some(opt => !opt.trim()))) {
      alert("Tüm soruların seçenekleri dolu olmalıdır!");
      return;
    }
    if (questions.some(q => q.correctAnswerIndex === null)) {
      alert("Her soru için doğru bir cevap seçilmelidir!");
      return;
    }
    if (questions.some(q => q.timeLimit <= 0 || isNaN(parseInt(q.timeLimit, 10)))) {
      alert("Her soru için geçerli bir zaman limiti (pozitif sayı) girilmelidir!");
      return;
    }

    const quizData = {
      title: quizTitle,
      questions: questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        timeLimit: parseInt(q.timeLimit, 10)
      }))
    };

    console.log("Gönderilecek Quiz Verisi:", quizData);
    
    try {
      const token = authService.getCurrentUserToken();
      const response = await fetch(`${API_BASE_URL}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Quiz başarıyla oluşturuldu:', result);
        alert('Quiz başarıyla oluşturuldu!');
        navigate('/my-quizzes');
      } else {
        const errorData = await response.json();
        console.error('Quiz oluşturma hatası:', errorData);
        alert(`Quiz oluşturulamadı: ${errorData.message || 'Sunucu hatası'}`);
      }
    } catch (error) {
      console.error('API isteği sırasında hata:', error);
      alert('Quiz oluşturulurken bir ağ hatası oluştu.');
    }
  };
  
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="create-quiz-page-container">
      <header className="create-quiz-header">
        <h1>Yeni Quiz Oluştur</h1>
        <button onClick={handleGoBack} className="cq-button cq-button-outline-secondary">
          <i className="fas fa-arrow-left"></i> Geri Dön
        </button>
      </header>

      <form onSubmit={handleSubmit} className="create-quiz-form">
        <div className="cq-form-group">
          <label htmlFor="quizTitle" className="cq-label">Quiz Başlığı</label>
          <input
            type="text"
            id="quizTitle"
            value={quizTitle}
            onChange={handleQuizTitleChange}
            placeholder="Quiziniz için dikkat çekici bir başlık girin"
            className="cq-input"
            required
          />
        </div>

        <h2 className="cq-section-title">Sorular</h2>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="cq-question-card">
            <div className="cq-question-card-header">
              <h3 className="cq-question-title">Soru {qIndex + 1}</h3>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIndex)}
                  className="cq-button cq-button-danger cq-button-small"
                >
                  <i className="fas fa-trash-alt"></i> Soruyu Sil
                </button>
              )}
            </div>

            <div className="cq-form-group">
              <label htmlFor={`questionText-${qIndex}`} className="cq-label">Soru Metni</label>
              <input
                type="text"
                id={`questionText-${qIndex}`}
                value={q.questionText}
                onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                placeholder="Sorunuzu buraya yazın"
                className="cq-input"
                required
              />
            </div>

            <div className="cq-options-container">
              <label className="cq-label">Seçenekler (Doğru cevabı işaretleyin)</label>
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="cq-option-input-group">
                  <input
                    type="radio"
                    id={`q${qIndex}-option${oIndex}`}
                    name={`q${qIndex}-correctAnswer`}
                    checked={q.correctAnswerIndex === oIndex}
                    onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                    className="cq-radio-input"
                    required
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                    placeholder={`Seçenek ${String.fromCharCode(65 + oIndex)}`}
                    className="cq-input cq-option-input"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="cq-form-group">
              <label htmlFor={`timeLimit-${qIndex}`} className="cq-label">Süre (saniye)</label>
              <input
                type="number"
                id={`timeLimit-${qIndex}`}
                value={q.timeLimit}
                onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', e.target.value)}
                className="cq-input cq-time-limit-input"
                min="5"
                placeholder="Örn: 30"
                required
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddQuestion}
          className="cq-button cq-button-secondary cq-add-question-button"
        >
          <i className="fas fa-plus-circle"></i> Yeni Soru Ekle
        </button>

        <button
          type="submit"
          className="cq-button cq-button-primary cq-submit-quiz-button"
        >
          <i className="fas fa-save"></i> Quiz Oluştur
        </button>
      </form>
    </div>
  );
};

export default CreateQuizPage;