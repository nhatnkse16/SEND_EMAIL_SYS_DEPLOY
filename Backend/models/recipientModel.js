const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'sent', 'failed'], // Trạng thái chỉ có thể là 1 trong 3 giá trị này
        default: 'pending',
    },
    // Có thể thêm các trường khác như group, campaignId...
}, { timestamps: true });

const Recipient = mongoose.model('Recipient', recipientSchema);

module.exports = Recipient;