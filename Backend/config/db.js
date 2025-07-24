const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('colors'); // Đảm bảo đã cài đặt 'npm install colors'

dotenv.config(); // Tải các biến môi trường từ .env

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://nguyenkimnhat0110:OM3NdAFK5Lgwp6XX@sendemailmarketingsys.9m3qi5c.mongodb.net/?retryWrites=true&w=majority&appName=SendEmailMarketingSys');
        console.log('MongoDB Connected...'.blue.bold);
    } catch (err) {
        console.error(`Error: ${err.message}`.red.bold);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được
    }
};

module.exports = connectDB;