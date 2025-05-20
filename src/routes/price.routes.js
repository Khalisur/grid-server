const express = require('express');
const router = express.Router();
const priceController = require('../controllers/price.controller');

// Get base price from address
router.post('/calculate', priceController.getBasePrice);

module.exports = router; 