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
    },
    port: {
        type: Number,
        required: true,
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
    },
    
    // Thêm cấu hình IMAP cho nhận email
    imapHost: {
        type: String,
        default: null, // Ví dụ: imap.gmail.com, imap.zoho.com
    },
    imapPort: {
        type: Number,
        default: 993, // Port IMAP mặc định
    },
    imapSecure: {
        type: Boolean,
        default: true, // IMAP thường dùng SSL
    },
    
    // Cấu hình POP3 (tùy chọn)
    pop3Host: {
        type: String,
        default: null,
    },
    pop3Port: {
        type: Number,
        default: 995,
    },
    pop3Secure: {
        type: Boolean,
        default: true,
    },
    
    // Trạng thái đồng bộ email
    lastSyncAt: {
        type: Date,
        default: null,
    },
    isEmailSyncEnabled: {
        type: Boolean,
        default: false, // Mặc định không bật đồng bộ email
    },
    
    // Thêm metadata cho quản lý
    displayName: {
        type: String,
        default: '', // Tên hiển thị cho sender
    },
    category: {
        type: String,
        enum: ['marketing', 'support', 'sales', 'info', 'other'],
        default: 'other'
    },
    priority: {
        type: Number,
        default: 1, // Độ ưu tiên khi gửi email
    },
    autoReplyEnabled: {
        type: Boolean,
        default: false,
    },
    autoReplyTemplate: {
        type: String,
        default: '',
    }
}, { timestamps: true }); // Tự động thêm dấu thời gian created_at và updated_at

const Sender = mongoose.model('Sender', senderSchema);

module.exports = Sender;