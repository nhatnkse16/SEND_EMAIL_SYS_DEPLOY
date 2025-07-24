const mongoose = require('mongoose');

const senderSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // Mỗi email gửi là duy nhất
        trim: true,
    },
    appPassword: {
        type: String,
        required: true,
    },
    host: {
        type: String,
        required: true,
        default: 'smtp.yandex.com',
    },
    port: {
        type: Number,
        required: true,
        default: 465,
    },
    secure: {
        type: Boolean,
        required: true,
        default: true,
    },
    sentCount: {
        type: Number,
        required: true,
        default: 0, // Mặc định là 0 khi mới tạo
    },
    dailyLimit: {
        type: Number,
        required: true,
        default: 100, // Giới hạn gửi mặc định
    },
    batchSize: {
        type: Number,
        required: true,
        default: 10, // Số lượng gửi mỗi lượt mặc định
    },
    isActive: {
        type: Boolean,
        default: true, // Dùng để bật/tắt một email mà không cần xóa
    }
}, { timestamps: true }); // Tự động thêm dấu thời gian created_at và updated_at

const Sender = mongoose.model('Sender', senderSchema);

module.exports = Sender;