// src/models/Game.js - Düzeltilmiş Answer Schema

const mongoose = require('mongoose');

// Cevap şeması - FIELD İSİMLERİ DÜZELTİLDİ
const AnswerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questionIndex: {
        type: Number,
        required: true
    },
    selectedOption: {
        type: Number,
        required: false, // Timeout durumunda null olabilir
        default: null
    },
    isCorrect: {
        type: Boolean,
        required: true,
        default: false
    },
    score: {
        type: Number,
        default: 0
    },
    answeredAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// Oyuncu bilgilerini tutacak alt şema
const PlayerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    score: {
        type: Number,
        default: 0
    },
}, { _id: false });

const GameSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    players: [PlayerSchema],
    answers: [AnswerSchema], // Düzeltilmiş AnswerSchema kullanılıyor
    gameState: {
        type: String,
        enum: ['waiting', 'active', 'finished'],
        default: 'waiting'
    },
    currentQuestionIndex: {
        type: Number,
        default: -1
    },
    currentQuestionStartTime: {
        type: Date
    },
    questionTimeLimit: {
        type: Number,
        default: 20000 // 20 saniye (milisaniye cinsinden)
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;