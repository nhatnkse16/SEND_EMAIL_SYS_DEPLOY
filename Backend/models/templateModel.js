const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    name: { // Tên gợi nhớ cho template, ví dụ: "Mẫu chào mừng tháng 8"
        type: String,
        required: true,
        unique: true,
    },
    subject: {
        type: String,
        required: true,
    },
    htmlBody: {
        type: String,
        required: true,
    },
    sentCount: {
        type: Number,
        required: true,
        default: 0,
    }
}, { timestamps: true });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;