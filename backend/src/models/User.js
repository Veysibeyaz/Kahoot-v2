// src/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Kullanıcı adı zorunludur'],
        unique: true, // Kullanıcı adları benzersiz olmalı
        trim: true // Başındaki/sonundaki boşlukları temizle
    },
    email: {
        type: String,
        required: [true, 'E-posta zorunludur'],
        unique: true, // E-postalar benzersiz olmalı
        match: [/.+\@.+\..+/, 'Lütfen geçerli bir e-posta adresi girin'], // Temel e-posta formatı kontrolü
        trim: true,
        lowercase: true // E-postayı küçük harfe çevir
    },
    password: {
        type: String,
        required: [true, 'Şifre zorunludur'],
        minlength: [6, 'Şifre en az 6 karakter olmalıdır'] // Minimum şifre uzunluğu
    },
    createdAt: {
        type: Date,
        default: Date.now // Kayıt oluşturulma tarihi
    }
});

// Şifreyi kaydetmeden önce hash'leme (şifreleme)
// 'save' işlemi öncesinde çalışacak bir middleware
UserSchema.pre('save', async function(next) {
    // Eğer şifre alanı değiştirilmediyse (örneğin profil güncelleme) tekrar hash'leme
    if (!this.isModified('password')) {
        return next();
    }
    try {
        // Şifreyi hash'lemek için "salt" oluştur (karmaşıklık faktörü: 10)
        const salt = await bcrypt.genSalt(10);
        // Şifreyi hash'le ve mevcut şifrenin üzerine yaz
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Sonraki adıma geç
    } catch (error) {
        next(error); // Hata olursa hatayı ilet
    }
});

// Girilen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştırmak için bir metot
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};


const User = mongoose.model('User', UserSchema);

module.exports = User;