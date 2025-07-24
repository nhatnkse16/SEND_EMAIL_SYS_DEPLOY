// routes/senderRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // Import multer
const { getSenders, addSenders, updateSender, deleteSender, resetSentCounts, addSendersFromExcel } = require('../controllers/senderController');

// Cấu hình Multer để lưu file vào bộ nhớ (không lưu vào đĩa)
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getSenders);
router.post('/add', addSenders);
router.put('/:id', updateSender);
router.delete('/:id', deleteSender);
router.post('/reset-sent-counts', resetSentCounts);
router.post('/upload-excel', upload.single('sendersFile'), addSendersFromExcel); // <-- Thêm route này

module.exports = router;