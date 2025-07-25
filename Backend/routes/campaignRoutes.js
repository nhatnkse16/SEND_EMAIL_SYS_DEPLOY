const express = require('express');
const router = express.Router();
const { sendCampaign, campaignLogStream, pauseCampaign, resumeCampaign } = require('../controllers/campaignController');

// POST /api/campaign/send
// Body: { selectedTemplateIds, brandName, minDelay, maxDelay, concurrencyLimit, jobId, totalLimit, campaignName }
router.post('/send', sendCampaign);
router.get('/log-stream', campaignLogStream);
// Route tạm dừng và tiếp tục
router.post('/pause', pauseCampaign);
router.post('/resume', resumeCampaign);

module.exports = router;
