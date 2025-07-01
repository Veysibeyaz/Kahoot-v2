// backend/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Environment check
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

// CORS configuration for production
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://quizmaster-chi.vercel.app',
    // Vercel otomatik URL'leri için wildcard pattern
    /https:\/\/.*\.vercel\.app$/
];

app.use(cors({
    origin: function (origin, callback) {
        // Development'ta origin olmayabilir (Postman vs.)
        if (!origin && !isProduction) return callback(null, true);
        
        // Production'da Vercel domain'lerini otomatik kabul et
        if (origin && origin.includes('vercel.app')) {
            return callback(null, true);
        }
        
        // Allowed origins listesini kontrol et
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') return allowed === origin;
            if (allowed instanceof RegExp) return allowed.test(origin);
            return false;
        });
        
        if (isAllowed || !isProduction) {
            callback(null, true);
        } else {
            console.log('CORS blocked:', origin);
            callback(new Error('CORS policy violation'), false);
        }
    },
    credentials: true
}));

// Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Socket.IO setup
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinGameRoom', (gameCode) => {
        if (gameCode && typeof gameCode === 'string' && gameCode.length >= 4) {
            socket.join(`game:${gameCode}`);
            console.log(`Socket ${socket.id} joined room: game:${gameCode}`);
        }
    });

    socket.on('leaveGameRoom', (gameCode) => {
        if (gameCode && typeof gameCode === 'string') {
            socket.leave(`game:${gameCode}`);
            console.log(`Socket ${socket.id} left room: game:${gameCode}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Kahoot Clone API',
        status: 'online',
        version: '1.0.0',
        endpoints: [
            '/api/health',
            '/api/auth/login',
            '/api/auth/register',
            '/api/quizzes',
            '/api/games'
        ]
    });
});

// Import routes with error handling
try {
    const authRoutes = require('./routes/auth');
    const quizRoutes = require('./routes/quiz');
    const userRoutes = require('./routes/users');
    const gameRoutes = require('./routes/game');

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/quizzes', quizRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/games', gameRoutes);
} catch (error) {
    console.error('Route loading error:', error);
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', {
        message: error.message,
        stack: isProduction ? undefined : error.stack,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({ 
        message: 'Internal server error',
        ...(isProduction ? {} : { error: error.message })
    });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('MongoDB connected successfully');
        if (!isProduction) {
            console.log('Database:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
    });
} else {
    console.warn('Warning: MONGODB_URI not configured');
}

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Export for Vercel
module.exports = app;

// Start server only in development
if (require.main === module && !isProduction) {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}