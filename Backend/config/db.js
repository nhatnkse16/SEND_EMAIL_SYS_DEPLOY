const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/EMAIL_MARKETING_SYS_DB');
        console.log('MongoDB Connected...'.blue.bold);
    } catch (err) {
        console.error(err.message);
        process.exit(1); // Thoát tiến trình nếu không kết nối được
    }
};

module.exports = connectDB;