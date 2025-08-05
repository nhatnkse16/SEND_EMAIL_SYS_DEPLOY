const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors'); // Giả sử bạn đã cài đặt thư viện 'colors' để có màu sắc

// Nạp biến môi trường từ file .env
dotenv.config();

/**
 * @description Hàm bất đồng bộ để kết nối đến cơ sở dữ liệu MongoDB.
 * Nó sử dụng chuỗi kết nối từ biến môi trường MONGO_URI,
 * hoặc fallback về chuỗi kết nối cục bộ nếu MONGO_URI không tồn tại.
 */
const connectDB = async () => {
    try {
        // Lấy chuỗi kết nối từ biến môi trường
        const mongoUri = process.env.MONGO_URI || 'mongodb+srv://ericalpanda:09909009Aa!@marketing-email.tjwaq0c.mongodb.net/EMAIL_MARKETING_SYS_DB?retryWrites=true&w=majority&appName=Marketing-email';

        if (!mongoUri) {
            // Trường hợp không tìm thấy MONGO_URI, in ra cảnh báo và sử dụng kết nối cục bộ
            console.warn('⚠️ Biến môi trường MONGO_URI không được tìm thấy. Đang sử dụng kết nối MongoDB cục bộ.'.yellow);
        }

        // Kết nối đến MongoDB với các tùy chọn tốt nhất
        // useNewUrlParser và useUnifiedTopology giúp tránh các lỗi cũ của driver
        await mongoose.connect(mongoUri || 'mongodb+srv://ericalpanda:09909009Aa!@marketing-email.tjwaq0c.mongodb.net/EMAIL_MARKETING_SYS_DB?retryWrites=true&w=majority&appName=Marketing-email', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Bạn có thể thêm các tùy chọn khác tại đây nếu cần
        });

        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`.cyan.bold);
    } catch (err) {
        // Xử lý lỗi nếu kết nối thất bại
        console.error(`❌ Lỗi kết nối MongoDB: ${err.message}`.red.bold);
        // Thoát tiến trình với mã lỗi 1 để báo hiệu lỗi
        process.exit(1);
    }
};

// Xuất hàm connectDB để có thể sử dụng ở các file khác
module.exports = connectDB;

