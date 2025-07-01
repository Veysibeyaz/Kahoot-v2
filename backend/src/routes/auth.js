// src/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// --- Kullanıcı Kayıt Rotası ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Basit doğrulama
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Lütfen tüm alanları doldurun' });
    }

    try {
        // Kullanıcı veya e-posta zaten var mı kontrol et
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor' });
        }

        // Yeni kullanıcı oluştur
        user = new User({
            username,
            email,
            password
        });

        // Kullanıcıyı veritabanına kaydet
        await user.save();

        // Başarılı kayıt yanıtı - user bilgisi de döndür
        const userObj = user.toObject();
        delete userObj.password; // Şifreyi response'dan çıkar

        res.status(201).json({ 
            message: 'Kullanıcı başarıyla kaydedildi',
            user: userObj
        });

    } catch (error) {
        console.error('Kayıt hatası:', error.message);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Doğrulama hatası', errors });
        }
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// --- Kullanıcı Giriş Rotası ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basit doğrulama
    if (!email || !password) {
        return res.status(400).json({ message: 'Lütfen e-posta ve şifrenizi girin' });
    }

    try {
        // Kullanıcıyı e-posta ile bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Geçersiz kimlik bilgileri' });
        }

        // Şifreleri karşılaştır
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Geçersiz kimlik bilgileri' });
        }

        // Şifre doğruysa JWT oluştur
        const payload = {
            user: {
                id: user.id
            }
        };

        // Token imzala
        const JWT_SECRET = process.env.JWT_SECRET;
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

        if (!JWT_SECRET) {
            console.error("JWT_SECRET .env dosyasında tanımlı değil!");
            return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
        }

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN || '1h' },
            (err, token) => {
                if (err) {
                    console.error('JWT imzalama hatası:', err);
                    return res.status(500).json({ message: 'Token oluşturulamadı' });
                }

                // *** ÖNEMLİ: User bilgisini de döndür ***
                const userObj = user.toObject();
                delete userObj.password; // Şifreyi response'dan çıkar

                res.json({ 
                    token,
                    user: userObj  // <-- Bu satır eksikti!
                });
            }
        );

    } catch (error) {
        console.error('Giriş hatası:', error.message);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;