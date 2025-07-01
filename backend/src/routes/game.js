// src/routes/game.js - Final version with username debug

const express = require('express');
const Game = require('../models/Game');
const Quiz = require('../models/Quiz');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// --- Oyun Bilgilerini Getirme ---
router.get('/:gameCode', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    console.log('GET game request:', { gameCode, userId });

    try {
        const game = await Game.findOne({ gameCode })
            .populate('players.userId', 'username')
            .populate('hostId', 'username')
            .populate('quizId');

        if (!game) {
            console.log('Game not found:', gameCode);
            return res.status(404).json({ message: 'Bu koda sahip bir oyun bulunamadı.' });
        }

        console.log('Game found:', game.gameCode);

        // state değerini düzelt
        let state = game.gameState;
        if (state === 'in-progress') {
            state = 'active';
        }

        res.json({
            _id: game._id,
            gameCode: game.gameCode,
            gameState: game.gameState,
            state: state,
            hostId: game.hostId._id,
            players: game.players,
            quiz: game.quizId,
            currentQuestionIndex: game.currentQuestionIndex,
            questionTimeLimit: game.questionTimeLimit,
            currentQuestionStartTime: game.currentQuestionStartTime,
            createdAt: game.createdAt
        });

    } catch (error) {
        console.error('Oyun bilgilerini getirme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Yeni Oyun Başlatma ---
router.post('/', authMiddleware, async (req, res) => {
    const { quizId } = req.body;
    const hostId = req.user.id;

    if (!quizId) {
        return res.status(400).json({ message: 'Oynanacak quizId gereklidir.' });
    }

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Belirtilen quiz bulunamadı.' });
        }

        let gameCode;
        let isUnique = false;
        while (!isUnique) {
            gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existingGame = await Game.findOne({ gameCode });
            if (!existingGame) {
                isUnique = true;
            }
        }

        const newGame = new Game({
            quizId,
            hostId,
            gameCode,
            players: [{ userId: hostId, score: 0 }]
        });
        const savedGame = await newGame.save();
        
        const io = req.app.get('io');
        if (io) {
            io.emit('gameCreated', {
                gameCode: savedGame.gameCode,
                hostId: savedGame.hostId
            });
        }

        res.status(201).json(savedGame);

    } catch (error) {
        console.error("Oyun başlatma hatası:", error);
        if (error.path === 'quizId' && error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Geçersiz Quiz ID formatı' });
        }
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Oyuna Katılma ---
router.post('/:gameCode/join', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    console.log('Join request received:', {
        gameCode,
        userId,
        username: req.user.username
    });

    try {
        const game = await Game.findOneAndUpdate(
            { 
                gameCode: gameCode,
                gameState: 'waiting',
                'players.userId': { $ne: userId }
            },
            { 
                $push: { 
                    players: { 
                        userId: userId, 
                        score: 0 
                    } 
                } 
            },
            { 
                new: true,
                runValidators: true
            }
        ).populate('players.userId', 'username')
         .populate('hostId', 'username')
         .populate('quizId');

        if (!game) {
            const existingGame = await Game.findOne({ gameCode })
                .populate('players.userId', 'username')
                .populate('hostId', 'username')
                .populate('quizId');

            if (!existingGame) {
                return res.status(404).json({ message: 'Bu koda sahip aktif bir oyun bulunamadı.' });
            }

            if (existingGame.gameState !== 'waiting') {
                return res.status(400).json({ message: 'Oyun zaten başlamış veya bitmiş.' });
            }

            const isAlreadyPlayer = existingGame.players.some(
                player => player.userId._id.toString() === userId || 
                         player.userId.toString() === userId
            );

            if (isAlreadyPlayer) {
                console.log('Player already in game, returning existing game data');
                return res.json({
                    message: 'Zaten oyundasınız',
                    game: existingGame,
                    alreadyJoined: true
                });
            }

            return res.status(400).json({ message: 'Oyuna katılırken bir hata oluştu.' });
        }

        console.log('Player added successfully');

        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('playerJoined', {
                gameCode,
                player: {
                    userId: userId,
                    username: req.user.username
                },
                totalPlayers: game.players.length
            });
        }

        res.json(game);
        
    } catch (error) {
        console.error("Oyuna katılma hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Oyun Başlatma ---
router.post('/:gameCode/start', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        const game = await Game.findOne({ gameCode });

        if (!game) {
            return res.status(404).json({ message: 'Bu koda sahip bir oyun bulunamadı.' });
        }

        if (game.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Yetkiniz yok: Sadece oyunun sunucusu oyunu başlatabilir.' });
        }

        if (game.gameState !== 'waiting') {
            return res.status(400).json({ message: 'Oyun zaten başlamış veya bitmiş.' });
        }

        game.gameState = 'active';
        game.currentQuestionIndex = 0;
        game.currentQuestionStartTime = new Date();

        const updatedGame = await game.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('gameStarted', {
                gameCode,
                currentQuestionIndex: 0,
                gameState: 'active',
                startTime: game.currentQuestionStartTime,
                timeLimit: game.questionTimeLimit
            });
        }

        res.json({
            ...updatedGame.toObject(),
            state: 'active'
        });

    } catch (error) {
        console.error("Oyunu başlatma hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Cevap Gönderme ---
router.post('/:gameCode/answer', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const { questionId, selectedAnswer, timeSpent } = req.body;
    const userId = req.user.id;

    console.log('Gelen cevap isteği:', {
        gameCode,
        questionId,
        selectedAnswer,
        timeSpent,
        userId
    });

    if (selectedAnswer === undefined) {
        return res.status(400).json({ 
            message: 'selectedAnswer gereklidir (null olabilir timeout için).',
            receivedBody: req.body 
        });
    }

    try {
        const game = await Game.findOne({ gameCode })
            .populate('quizId')
            .populate('players.userId', 'username'); // Username populate eklendi
        
        if (!game) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        if (game.gameState !== 'active') {
            return res.status(400).json({ message: 'Oyun aktif değil.' });
        }

        const playerIndex = game.players.findIndex(p => p.userId._id.toString() === userId);
        if (playerIndex === -1) {
            return res.status(403).json({ message: 'Bu oyunun oyuncusu değilsiniz.' });
        }

        const existingAnswer = game.answers?.find(
            a => a.userId.toString() === userId && 
                 a.questionIndex === game.currentQuestionIndex
        );

        if (existingAnswer) {
            return res.status(400).json({ message: 'Bu soruya zaten cevap verdiniz.' });
        }

        const currentQuestion = game.quizId.questions[game.currentQuestionIndex];
        
        const now = new Date();
        const timeElapsed = now - game.currentQuestionStartTime;
        if (timeElapsed > game.questionTimeLimit) {
            return res.status(400).json({ message: 'Süre doldu.' });
        }

        const isCorrect = selectedAnswer !== null && selectedAnswer === currentQuestion.correctAnswerIndex;

        let score = 0;
        if (isCorrect) {
            const maxScore = 1000;
            const timeBonus = Math.max(0, (game.questionTimeLimit - timeElapsed) / game.questionTimeLimit);
            score = Math.round(maxScore * (0.5 + 0.5 * timeBonus));
        }

        const newAnswer = {
            userId: userId,
            questionIndex: game.currentQuestionIndex,
            selectedOption: selectedAnswer,
            isCorrect: isCorrect,
            score: score,
            answeredAt: now
        };

        console.log('Oluşturulan cevap objesi:', newAnswer);

        if (!game.answers) {
            game.answers = [];
        }
        game.answers.push(newAnswer);

        game.players[playerIndex].score += score;

        const savedGame = await game.save();
        console.log('Oyun kaydedildi, yeni answers uzunluğu:', savedGame.answers.length);

        const currentQuestionAnswers = game.answers.filter(
            a => a.questionIndex === game.currentQuestionIndex
        );

        const allAnswered = currentQuestionAnswers.length === game.players.length;

        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('answerSubmitted', {
                userId,
                username: req.user.username,
                isCorrect,
                score,
                totalScore: game.players[playerIndex].score,
                answeredAt: now,
                totalAnswered: currentQuestionAnswers.length,
                totalPlayers: game.players.length
            });
        }

        let scoreboard = null;
        if (allAnswered) {
            scoreboard = generateScoreboard(game, userId);
            
            if (io) {
                setTimeout(() => {
                    io.to(`game:${gameCode}`).emit('showScoreboard', {
                        questionIndex: game.currentQuestionIndex,
                        correctAnswer: currentQuestion.correctAnswerIndex,
                        scoreboard: scoreboard
                    });
                }, 1000);
            }
        }

        res.json({
            isCorrect,
            correctAnswer: currentQuestion.correctAnswerIndex,
            scoreGained: score,
            newScore: game.players[playerIndex].score,
            scoreboard: allAnswered ? scoreboard : null
        });

    } catch (error) {
        console.error('Cevap gönderme hatası:', error);
        res.status(500).json({ 
            message: 'Sunucu hatası',
            error: error.message 
        });
    }
});

// --- Sonraki Soruya Geçme ---
router.post('/:gameCode/nextquestion', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        const game = await Game.findOne({ gameCode }).populate('quizId');
        
        if (!game) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        if (game.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Sadece oyun sunucusu sonraki soruya geçebilir.' });
        }

        if (game.gameState !== 'active') {
            return res.status(400).json({ message: 'Oyun aktif değil.' });
        }

        const nextQuestionIndex = game.currentQuestionIndex + 1;

        if (nextQuestionIndex >= game.quizId.questions.length) {
            game.gameState = 'finished';
            await game.save();
            
            // Final scoreboard için game'i yeniden populate et
            const gameWithUsers = await Game.findOne({ gameCode })
                .populate('players.userId', 'username')
                .populate('quizId');
            
            const finalScoreboard = generateFinalScoreboard(gameWithUsers);

            console.log('Final scoreboard generated:', finalScoreboard); // Debug log eklendi

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

        game.currentQuestionIndex = nextQuestionIndex;
        game.currentQuestionStartTime = new Date();
        await game.save();

        const nextQuestion = game.quizId.questions[nextQuestionIndex];

        const io = req.app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit('nextQuestion', {
                questionIndex: nextQuestionIndex,
                question: {
                    _id: nextQuestion._id,
                    questionText: nextQuestion.questionText,
                    options: nextQuestion.options,
                    timeLimit: nextQuestion.timeLimit
                },
                totalQuestions: game.quizId.questions.length
            });
        }

        res.json({
            questionIndex: nextQuestionIndex,
            question: nextQuestion,
            totalQuestions: game.quizId.questions.length
        });

    } catch (error) {
        console.error('Sonraki soru hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Skor Tablosu ---
router.get('/:gameCode/scoreboard', authMiddleware, async (req, res) => {
    const { gameCode } = req.params;
    const userId = req.user.id;

    try {
        const game = await Game.findOne({ gameCode })
            .populate('players.userId', 'username')
            .populate('hostId', 'username')
            .populate('quizId');

        if (!game) {
            return res.status(404).json({ message: 'Oyun bulunamadı.' });
        }

        const isHost = game.hostId._id.toString() === userId;
        const isPlayer = game.players.some(p => p.userId._id.toString() === userId);

        if (!isHost && !isPlayer) {
            return res.status(403).json({ message: 'Bu oyunun skor tablosuna erişim yetkiniz yok.' });
        }

        // DEBUG: Game players logları buraya eklendi
        console.log('Game players:', game.players);
        console.log('Populated users:', game.players.map(p => ({
            userId: p.userId._id,
            username: p.userId.username,
            score: p.score
        })));

        const scoreboard = game.players
            .map(player => {
                const lastAnswer = (game.answers || []).find(
                    a => a.userId.toString() === player.userId._id.toString() && 
                         a.questionIndex === game.currentQuestionIndex
                );

                return {
                    userId: player.userId,
                    username: player.userId.username, // Doğrudan username al
                    score: player.score || 0,
                    lastAnswerCorrect: lastAnswer ? lastAnswer.isCorrect : false,
                    lastAnswer: lastAnswer,
                    isCurrentUser: player.userId._id.toString() === userId
                };
            })
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));

        console.log('Scoreboard with usernames:', scoreboard); // Debug için

        const totalQuestions = game.quizId?.questions?.length || 0;

        const currentQuestionAnswers = (game.answers || []).filter(
            a => a.questionIndex === game.currentQuestionIndex
        );
        const allAnswered = currentQuestionAnswers.length === game.players.length;

        res.json({
            gameState: game.gameState,
            currentQuestionIndex: game.currentQuestionIndex,
            totalQuestions,
            hostUsername: game.hostId?.username || 'Bilinmiyor',
            scoreboard,
            allAnswered,
            totalAnswered: currentQuestionAnswers.length,
            totalPlayers: game.players.length
        });

    } catch (error) {
        console.error('Skor tablosu getirme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Yardımcı fonksiyonlar
function generateScoreboard(game, currentUserId) {
    return game.players
        .map(player => {
            const lastAnswer = game.answers.find(
                a => a.userId.toString() === player.userId._id.toString() && 
                     a.questionIndex === game.currentQuestionIndex
            );

            return {
                userId: player.userId,
                username: player.userId.username, // Doğrudan username
                score: player.score,
                lastAnswerCorrect: lastAnswer ? lastAnswer.isCorrect : false,
                isCurrentUser: player.userId._id.toString() === currentUserId
            };
        })
        .sort((a, b) => b.score - a.score);
}

function generateFinalScoreboard(game) {
    console.log('generateFinalScoreboard called with players:', game.players); // Debug log
    
    return game.players
        .map(player => {
            const result = {
                userId: player.userId,
                username: player.userId?.username || 'Bilinmiyor', // Fallback eklendi
                score: player.score,
                correctAnswers: game.answers.filter(
                    a => a.userId.toString() === player.userId._id.toString() && a.isCorrect
                ).length,
                totalAnswers: game.answers.filter(
                    a => a.userId.toString() === player.userId._id.toString()
                ).length
            };
            
            console.log('Final scoreboard player:', result); // Her player için debug
            return result;
        })
        .sort((a, b) => b.score - a.score);
}

module.exports = router;