// src/middleware/auth.js  <-- BU DOSYANIN YOLU VE ADI BU OLMALI
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Yetkilendirme başarısız: Token bulunamadı veya format yanlış.' });
    }

    const token = authHeader.substring(7); // 'Bearer ' kısmını at

    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error("JWT_SECRET .env dosyasında tanımlı değil! Middleware çalışmayacak.");
            return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
        }
        const decoded = jwt.verify(token, JWT_SECRET);

        // Token geçerliyse, payload'daki kullanıcı ID'sini request nesnesine ekleyelim.
        // src/routes/auth.js'deki payload yapınız: { user: { id: '...' } }
        // Bu yüzden decoded.user.id şeklinde erişiyoruz.
        if (decoded && decoded.user && decoded.user.id) {
            req.user = { id: decoded.user.id };
        } else {
            console.error('JWT Payload Hatası: Beklenen user.id bulunamadı.', decoded);
            return res.status(401).json({ message: 'Yetkilendirme başarısız: Geçersiz token payload.' });
        }

        next(); // Her şey yolundaysa, sonraki middleware'e veya route handler'a geç
    } catch (error) {
        console.error('JWT Doğrulama Hatası:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Yetkilendirme başarısız: Geçersiz token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Yetkilendirme başarısız: Token süresi dolmuş.' });
        }
        res.status(401).json({ message: 'Yetkilendirme başarısız.' });
    }
};

module.exports = authMiddleware; // Middleware fonksiyonunu export et