// mongodb-test.js - Updated without deprecated options
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://quizmaster-user:83.omar.1715@quizmaster-cluster.cpl3bzz.mongodb.net/quizmaster?retryWrites=true&w=majority&appName=quizmaster-cluster";

async function testConnection() {
    try {
        console.log('MongoDB bağlantısı test ediliyor...');
        
        // Deprecated options kaldırıldı
        await mongoose.connect(MONGODB_URI);
        
        console.log('✅ MongoDB bağlantısı BAŞARILI!');
        
        // Test operations...
        const testSchema = new mongoose.Schema({ test: String });
        const TestModel = mongoose.model('Test', testSchema);
        
        const testDoc = new TestModel({ test: 'Vercel Test' });
        await testDoc.save();
        console.log('✅ Test doküman kaydetme BAŞARILI!');
        
        await TestModel.deleteOne({ test: 'Vercel Test' });
        console.log('✅ Test doküman silme BAŞARILI!');
        
        await mongoose.disconnect();
        console.log('✅ MongoDB bağlantısı kapatıldı!');
        
    } catch (error) {
        console.error('❌ MongoDB bağlantı hatası:', error.message);
    }
}

testConnection();