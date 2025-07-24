const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');

router.get('/', getLogs);

module.exports = router;