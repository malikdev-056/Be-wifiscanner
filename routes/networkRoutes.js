const express = require('express');
const { scanNetwork } = require('../services/networkScanner');

const router = express.Router();

router.get('/scan', async (req, res, next) => {
  try {
    const devices = await scanNetwork();
    res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
