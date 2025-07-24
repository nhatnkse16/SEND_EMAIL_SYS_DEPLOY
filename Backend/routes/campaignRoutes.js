const express = require('express');
const router = express.Router();
const { sendCampaign, campaignLogStream } = require('../controllers/campaignController');

router.post('/send', sendCampaign);
router.get('/log-stream', campaignLogStream);

module.exports = router;
