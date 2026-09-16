const express = require('express');
const { scanNetwork } = require('../services/networkScanner');
const { answerNetworkQuestion } = require('../services/openaiService');

const router = express.Router();

router.post('/ask', async (req, res, next) => {
  try {
    const { message, devices } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        error: 'message is required'
      });
      return;
    }

    const currentDevices = Array.isArray(devices) ? devices : await scanNetwork();
    const answer = await answerNetworkQuestion(message.trim(), currentDevices);

    res.json({
      success: true,
      answer
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;