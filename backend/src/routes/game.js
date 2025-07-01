// backend/src/routes/game.js
const express = require('express');
const Game = require('../models/Game');
const Quiz = require('../models/Quiz');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Route parameter validation middleware
const validateGameCode = (req, res, next) => {
    const { gameCode } = req.params;
    if (!gameCode || gameCode.length < 4 || gameCode.length > 10) {
        return res.status(400).json({ 
            message: 'Geçersiz oyun kodu formatı.',
            receivedCode: gameCode 
        });
    }
    next();
};

// --- POST Routes (before GET with params) ---

// Create new game
router.post('/', authMiddleware, async (req, res) => {
    const { quizId } = req.body;
    const hostId = req.user.id;

    if (!quizId) {
        return res.status(400).json({ message: 'Quiz ID gereklidir.' });
    }

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz bulunamadı.' });
        }

        // Generate unique game code
        let gameCode;
        let attempts = 0;
        do {
            gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existing = await Game.findOne({ gameCode });
            if (!existing) break;
            attempts++;
        } while (attempts < 10);

        if (attempts >= 10) {
            return res.status(500).json({ message: 'Oyun kodu oluşturulamadı.' });
        }

        const newGame = new Game({
            quizId,
            hostId,
            gameCode,
            players: [{ userId: hostId, score: 0 }]
        });

        const savedGame = await newGame.save();
        
        // Socket notification
        const io = req.app.get('io');
        if (io) {
            io.emit('gameCreated', {
                gameCode: savedGame.gameCode,
                hostId: savedGame.hostId
            });
        }

        res.status(201).json(savedGame);

    } catch (error) {
        console.error("Game creation error:", error);
        res.status(500).json({ message: 'Oyun oluşturma hatası' });
    }
});

// Join game
router.post('/:gameCode/join', validateGameCode, authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        // Check if game exists first
        const existingGame = await Game.findOne({ gameCode })
            .populate('players.userId', 'username')
            .populate('hostId', 'username')
            .populate('quizId');

        if (!existingGame) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        if (existingGame.gameState !== 'waiting') {
            return res.status(400).json({ message: 'Oyun zaten başlamış.' });
        }

        // Check if already joined
        const isAlreadyPlayer = existingGame.players.some(
            player => player.userId._id.toString() === userId
        );

        if (isAlreadyPlayer) {
            return res.json({
                message: 'Zaten katıldınız',
                game: existingGame,
                alreadyJoined: true
            });
        }

        // Add player atomically
        const updatedGame = await Game.findOneAndUpdate(
            { 
                gameCode,
                gameState: 'waiting',
                'players.userId': { $ne: userId }
            },
            { 
                $push: { 
                    players: { userId, score: 0 } 
                } 
            },
            { new: true }
        ).populate('players.userId', 'username')
         .populate('hostId', 'username')
         .populate('quizId');

        if (!updatedGame) {
            return res.status(400).json({ message: 'Oyuna katılamadı.' });
        }

        // Socket notification
        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('playerJoined', {
                gameCode,
                player: {
                    userId,
                    username: req.user.username
                },
                totalPlayers: updatedGame.players.length
            });
        }

        res.json(updatedGame);

    } catch (error) {
        console.error("Join game error:", error);
        res.status(500).json({ message: 'Katılma hatası' });
    }
});

// Start game
router.post('/:gameCode/start', validateGameCode, authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        const game = await Game.findOne({ gameCode });

        if (!game) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        if (game.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Sadece host başlatabilir.' });
        }

        if (game.gameState !== 'waiting') {
            return res.status(400).json({ message: 'Oyun zaten başlamış.' });
        }

        if (game.players.length < 1) {
            return res.status(400).json({ message: 'En az 1 oyuncu gerekli.' });
        }

        // Start game
        game.gameState = 'active';
        game.currentQuestionIndex = 0;
        game.currentQuestionStartTime = new Date();

        const updatedGame = await game.save();

        // Socket notification
        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('gameStarted', {
                gameCode,
                currentQuestionIndex: 0,
                gameState: 'active'
            });
        }

        res.json({
            ...updatedGame.toObject(),
            state: 'active'
        });

    } catch (error) {
        console.error("Start game error:", error);
        res.status(500).json({ message: 'Başlatma hatası' });
    }
});

// Submit answer
router.post('/:gameCode/answer', validateGameCode, authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const { selectedAnswer, timeSpent } = req.body;
    const userId = req.user.id;

    if (selectedAnswer === undefined) {
        return res.status(400).json({ message: 'Cevap gerekli.' });
    }

    try {
        const game = await Game.findOne({ gameCode })
            .populate('quizId')
            .populate('players.userId', 'username');

        if (!game || game.gameState !== 'active') {
            return res.status(400).json({ message: 'Aktif oyun bulunamadı.' });
        }

        const playerIndex = game.players.findIndex(
            p => p.userId._id.toString() === userId
        );

        if (playerIndex === -1) {
            return res.status(403).json({ message: 'Oyuncu değilsiniz.' });
        }

        // Check if already answered
        const existingAnswer = game.answers?.find(
            a => a.userId.toString() === userId && 
                 a.questionIndex === game.currentQuestionIndex
        );

        if (existingAnswer) {
            return res.status(400).json({ message: 'Zaten cevapladınız.' });
        }

        // Check time limit
        const now = new Date();
        const timeElapsed = now - game.currentQuestionStartTime;
        if (timeElapsed > game.questionTimeLimit) {
            return res.status(400).json({ message: 'Süre doldu.' });
        }

        // Calculate score
        const currentQuestion = game.quizId.questions[game.currentQuestionIndex];
        const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;
        
        let score = 0;
        if (isCorrect) {
            const maxScore = 1000;
            const timeRatio = Math.max(0, 1 - (timeElapsed / game.questionTimeLimit));
            score = Math.round(maxScore * (0.5 + 0.5 * timeRatio));
        }

        // Save answer
        const newAnswer = {
            userId,
            questionIndex: game.currentQuestionIndex,
            selectedOption: selectedAnswer,
            isCorrect,
            score,
            answeredAt: now
        };

        if (!game.answers) game.answers = [];
        game.answers.push(newAnswer);
        game.players[playerIndex].score += score;

        await game.save();

        // Create scoreboard
        const scoreboard = game.players
            .map(player => ({
                userId: player.userId,
                username: player.userId.username || 'Unknown',
                score: player.score,
                lastAnswerCorrect: player.userId._id.toString() === userId ? isCorrect : false
            }))
            .sort((a, b) => b.score - a.score);

        // Socket notification
        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('answerSubmitted', {
                userId,
                username: req.user.username,
                isCorrect,
                score,
                totalScore: game.players[playerIndex].score
            });
        }

        res.json({
            isCorrect,
            correctAnswer: currentQuestion.correctAnswerIndex,
            scoreGained: score,
            newScore: game.players[playerIndex].score,
            scoreboard
        });

    } catch (error) {
        console.error("Answer submission error:", error);
        res.status(500).json({ message: 'Cevap gönderme hatası' });
    }
});

// Next question - TİRE KALDIRILDI!
router.post('/:gameCode/nextquestion', validateGameCode, authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        const game = await Game.findOne({ gameCode }).populate('quizId');

        if (!game || game.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Sadece host geçebilir.' });
        }

        const nextIndex = game.currentQuestionIndex + 1;

        if (nextIndex >= game.quizId.questions.length) {
            // Game finished
            game.gameState = 'finished';
            await game.save();

            // Get final scoreboard
            const gameWithUsers = await Game.findById(game._id)
                .populate('players.userId', 'username');

            const finalScoreboard = gameWithUsers.players
                .map(player => ({
                    userId: player.userId,
                    username: player.userId.username || 'Unknown',
                    score: player.score
                }))
                .sort((a, b) => b.score - a.score);

            const io = req.app.get('io');
            if (io) {
                io.to(`game:${gameCode}`).emit('gameFinished', {
                    finalScoreboard
                });
            }

            return res.json({
                finished: true,
                finalScoreboard
            });
        }

        // Move to next question
        game.currentQuestionIndex = nextIndex;
        game.currentQuestionStartTime = new Date();
        await game.save();

        const nextQuestion = game.quizId.questions[nextIndex];

        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('nextQuestion', {
                questionIndex: nextIndex,
                question: {
                    _id: nextQuestion._id,
                    questionText: nextQuestion.questionText,
                    options: nextQuestion.options
                }
            });
        }

        res.json({
            questionIndex: nextIndex,
            question: {
                _id: nextQuestion._id,
                questionText: nextQuestion.questionText,
                options: nextQuestion.options
            },
            finished: false
        });

    } catch (error) {
        console.error("Next question error:", error);
        res.status(500).json({ message: 'Sonraki soru hatası' });
    }
});

// --- GET Routes (after POST routes) ---

// Get game details
router.get('/:gameCode', validateGameCode, authMiddleware, async (req, res) => {
    const { gameCode } = req.params;

    try {
        const game = await Game.findOne({ gameCode })
            .populate('players.userId', 'username')
            .populate('hostId', 'username')
            .populate('quizId');

        if (!game) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        const response = {
            _id: game._id,
            gameCode: game.gameCode,
            gameState: game.gameState,
            state: game.gameState === 'in-progress' ? 'active' : game.gameState,
            hostId: game.hostId._id,
            players: game.players,
            quiz: game.quizId,
            currentQuestionIndex: game.currentQuestionIndex,
            questionTimeLimit: game.questionTimeLimit,
            currentQuestionStartTime: game.currentQuestionStartTime,
            createdAt: game.createdAt
        };

        res.json(response);

    } catch (error) {
        console.error("Get game error:", error);
        res.status(500).json({ message: 'Oyun bilgisi alınamadı' });
    }
});

// Error handler for this router
router.use((error, req, res, next) => {
    console.error('Game router error:', error);
    res.status(500).json({ 
        message: 'Game route error',
        path: req.path
    });
});

module.exports = router;