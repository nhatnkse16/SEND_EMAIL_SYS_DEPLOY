const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { getRecipients, addRecipient, addRecipientsFromJson, updateRecipient,
    deleteRecipient, clearRecipients, resetRecipientsStatus, addRecipientsFromCsv } = require('../controllers/recipientController');

// Thay đổi '/recipients' thành '/' để đường dẫn trở nên nhất quán
router.post('/upload', upload.single('recipientsFile'), addRecipientsFromJson); // Thay đổi '/recipients/upload' thành '/upload'
router.post('/upload-csv', upload.single('recipientsFile'), addRecipientsFromCsv); // THÊM ROUTE MỚI CHO CSV HOẶC THAY THẾ ROUTE CŨ
router.get('/', getRecipients); // Thay đổi '/recipients' thành '/'
router.delete('/clear', clearRecipients); // Thay đổi '/recipients/clear' thành '/clear'
router.post('/', addRecipient); // Thay đổi '/recipients' thành '/'
router.put('/:id', updateRecipient); // Thay đổi '/recipients/:id' thành '/:id'
router.delete('/:id', deleteRecipient); // Thay đổi '/recipients/:id' thành '/:id'
router.post('/reset-status', resetRecipientsStatus); // Thay đổi '/recipients/reset-status' thành '/reset-status'

module.exports = router;