// src/models/Quiz.js

const mongoose = require('mongoose');

// Tek bir sorunun şemasını tanımlayalım
const QuestionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Soru metni zorunludur'],
        trim: true
    },
    options: [{ // Seçenekler bir dizi string olacak
        type: String,
        required: true,
        trim: true
    }],
    correctAnswerIndex: { // Doğru cevabın index'i (options dizisindeki sıra numarası, 0'dan başlar)
        type: Number,
        required: [true, 'Doğru cevap index\'i zorunludur'],
        min: [0, 'Index en az 0 olmalıdır']
    },
    timeLimit: { // Soru başına süre sınırı (saniye cinsinden, isteğe bağlı)
        type: Number,
        default: 30 // Varsayılan 30 saniye
    }
}, { _id: true }); // Her soru için ayrı bir ID oluşturulsun

// Ana Quiz şemasını tanımlayalım
const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Quiz başlığı zorunludur'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    questions: [QuestionSchema], // Sorular dizisi, yukarıda tanımlanan şemayı kullanacak
    createdBy: { // Quiz'i oluşturan kullanıcının ID'si
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // User modeline referans veriyoruz
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Quiz kaydedilmeden/güncellenmeden önce updatedAt alanını güncelle
QuizSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Quiz = mongoose.model('Quiz', QuizSchema);

module.exports = Quiz;