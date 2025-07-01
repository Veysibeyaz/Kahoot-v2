// src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// --- Rotaları import et ---
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/game');

const app = express();
const server = http.createServer(app);

// Production'da Vercel URL'ini otomatik al
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    'https://quizmaster-chi.vercel.app' // Manuel olarak ekledim
].filter(Boolean);

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow Vercel domains
        if (origin && origin.includes('vercel.app')) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Production'da esnek ol
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Socket.IO'yu app'e ekle
app.set('io', io);

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı:', socket.id);

    socket.on('joinGameRoom', (gameCode) => {
        socket.join(`game:${gameCode}`);
        console.log(`Socket ${socket.id} ${gameCode} kodlu oyun odasına katıldı`);
    });

    socket.on('leaveGameRoom', (gameCode) => {
        socket.leave(`game:${gameCode}`);
        console.log(`Socket ${socket.id} ${gameCode} kodlu oyun odasından ayrıldı`);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        mongodb: MONGODB_URI ? 'configured' : 'not configured'
    });
});

// --- Rotaları kullan ---
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

// Ana sayfa için basit bir rota
app.get('/api', (req, res) => {
    res.json({ 
        message: 'KAHOOT Clone API Çalışıyor!',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Ana sayfa 
app.get('/', (req, res) => {
    res.json({ 
        message: 'KAHOOT Clone API',
        endpoints: ['/api/health', '/api/auth', '/api/quizzes', '/api/games']
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

// MongoDB bağlantısı
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('MongoDB bağlantısı başarılı');
        console.log('Database URL:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
    })
    .catch(err => {
        console.error('MongoDB bağlantı hatası:', err);
    });
} else {
    console.warn('MONGODB_URI environment variable is not set');
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        mongoose.connection.close();
        process.exit(0);
    });
});

// Vercel için export (EN ÖNEMLİ!)
module.exports = app;

// Sadece local development için server başlat
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server ${PORT} portunda çalışıyor`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}