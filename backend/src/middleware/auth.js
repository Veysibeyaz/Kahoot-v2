// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Yetkilendirme başarısız: Token bulunamadı veya format yanlış.',
                path: req.path 
            });
        }

        const token = authHeader.substring(7);

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error("JWT_SECRET tanımlı değil!");
            return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded || !decoded.user || !decoded.user.id) {
            console.error('JWT Payload Hatası:', decoded);
            return res.status(401).json({ message: 'Geçersiz token payload.' });
        }

        // Kullanıcı bilgilerini veritabanından al
        const user = await User.findById(decoded.user.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
        }

        req.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Geçersiz token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token süresi dolmuş.' });
        }
        if (error.name === 'CastError') {
            return res.status(401).json({ message: 'Geçersiz kullanıcı ID.' });
        }
        
        res.status(401).json({ message: 'Yetkilendirme başarısız.' });
    }
};

module.exports = authMiddleware;