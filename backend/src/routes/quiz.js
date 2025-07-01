
// src/routes/quiz.js

const express = require('express');
const Quiz = require('../models/Quiz');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// --- Yeni Quiz Oluşturma ---
// POST /api/quizzes
router.post('/', authMiddleware, async (req, res) => {
    const { title, description, questions } = req.body;
    const userId = req.user.id; // Artık token'dan geliyor

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Quiz başlığı ve en az bir soru gereklidir.' });
    }

    for (const q of questions) {
        if (!q.questionText || !q.options || !Array.isArray(q.options) || q.options.length < 2 || q.correctAnswerIndex === undefined) {
            return res.status(400).json({ message: 'Her soru metin, en az 2 seçenek ve doğru cevap index\'i içermelidir.' });
        }
        if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
            return res.status(400).json({ message: `Geçersiz correctAnswerIndex: ${q.correctAnswerIndex}. Index, seçenek sayısı dahilinde olmalı.` });
        }
    }

    try {
        const newQuiz = new Quiz({
            title,
            description,
            questions,
            createdBy: userId // Token'dan alınan kullanıcı ID'si
        });

        const savedQuiz = await newQuiz.save();
        res.status(201).json(savedQuiz);

    } catch (error) {
        console.error("Quiz oluşturma hatası:", error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Doğrulama hatası', errors });
        }
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Tüm Quizleri Getirme ---
// GET /api/quizzes
router.get('/', authMiddleware, async (req, res) => {
    try {
        const quizzes = await Quiz.find().select('-questions').populate('createdBy', 'username email');
        res.json(quizzes);
    } catch (error) {
        console.error("Quiz listeleme hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Belirli Bir Quiz'i Getirme ---
// GET /api/quizzes/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username email');

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz bulunamadı' });
        }
        res.json(quiz);
    } catch (error) {
        console.error("Quiz getirme hatası:", error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Geçersiz Quiz ID formatı' });
        }
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Update ve Delete rotaları daha sonra eklenecek...

module.exports = router;