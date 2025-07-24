const Log = require('../models/logModel');

const getLogs = async (req, res) => {
    try {
        const logs = await Log.find({}).sort({ createdAt: -1 }).limit(100);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu log', error: error.message });
    }
};

module.exports = { getLogs };
