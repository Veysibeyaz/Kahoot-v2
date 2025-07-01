// backend/src/index.js - Improved with better MongoDB error handling
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

console.log('🚀 Starting Kahoot Clone API...');
console.log('Environment:', isProduction ? 'production' : 'development');

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://kahoot-v2.vercel.app',
    'https://kahoot-v2-veysibeyazs-projects.vercel.app',
    /https:\/\/.*\.vercel\.app$/
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow Vercel domains
        if (origin && origin.includes('vercel.app')) {
            return callback(null, true);
        }
        
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') return allowed === origin;
            if (allowed instanceof RegExp) return allowed.test(origin);
            return false;
        });
        
        callback(null, isAllowed || !isProduction);
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
app.set('trust proxy', 1);
app.set('io', io);

// Socket.IO setup
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

// Health check endpoint (MongoDB bağımsız)
app.get('/api/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    
    console.log('Health check:', health);
    res.json(health);
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

// Test route - MongoDB bağımsız
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend çalışıyor!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

app.get('/api', (req, res) => {
    res.json({ 
        message: 'Kahoot Clone API',
        status: 'online',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        version: '1.0.0'
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
    
    console.log('✅ Routes loaded successfully');
} catch (error) {
    console.error('❌ Route loading error:', error);
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
    console.error('Global error:', error.message);
    
    res.status(500).json({ 
        message: 'Internal server error',
        error: isProduction ? 'Internal server error' : error.message
    });
});

// MongoDB connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔌 MongoDB URI configured:', MONGODB_URI ? 'Yes' : 'No');

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    })
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        console.log('Database name:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        
        // MongoDB hata türlerine göre detaylı log
        if (err.message.includes('authentication failed')) {
            console.error('🔑 Authentication failed - Check username/password');
        }
        if (err.message.includes('not allowed to connect')) {
            console.error('🌐 IP not whitelisted - Check Network Access in MongoDB Atlas');
        }
        if (err.message.includes('ENOTFOUND')) {
            console.error('🔗 Cluster not found - Check cluster URL');
        }
    });

    // MongoDB connection events
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
    });
} else {
    console.warn('⚠️  MongoDB URI not provided - database features will not work');
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
    if (isProduction) {
        process.exit(1);
    }
});

// Export for Vercel
module.exports = app;

// Start server only in development
if (require.main === module && !isProduction) {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}