// src/routes/users.js

const express = require('express');
const User = require('../models/User'); // User modelini import et
// const authMiddleware = require('../middleware/auth'); // Gerekirse eklenecek
// const adminMiddleware = require('../middleware/admin'); // Yönetici kontrolü için (ileride)

const router = express.Router();

// --- Tüm Kullanıcıları Listeleme ---
// GET /api/users
// !! DİKKAT: Bu endpoint şu an herkese açıktır. Gerçek uygulamada
// !! sadece yöneticilerin erişebilmesi için middleware eklenmelidir.
router.get('/', /* authMiddleware, adminMiddleware, */ async (req, res) => {
    try {
        // Tüm kullanıcıları bul, ancak şifre alanını DAHİL ETME!
        const users = await User.find().select('-password'); // '-password' şifre alanını hariç tutar
        res.json(users);
    } catch (error) {
        console.error("Kullanıcı listeleme hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Buraya ileride başka kullanıcı yönetimi rotaları eklenebilir
// (örn: GET /api/users/:id, PUT /api/users/:id, DELETE /api/users/:id)

module.exports = router;