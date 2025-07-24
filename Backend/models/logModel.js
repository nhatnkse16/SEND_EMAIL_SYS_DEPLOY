const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    senderEmail: {
        type: String,
    },
    recipientEmail: {
        type: String,
    },
    errorMessage: {
        type: String,
    },
    level: {
        type: String,
        enum: ['info', 'error', 'warning'],
        default: 'info',
    },
}, { timestamps: true });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;