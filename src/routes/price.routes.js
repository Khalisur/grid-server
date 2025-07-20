const express = require('express');
const router = express.Router();
const priceController = require('../controllers/price.controller');
const auth = require('../middleware/auth.middleware');

// Optional authentication middleware - doesn't fail if no auth provided
const optionalAuth = (req, res, next) => {
  // Check if authorization header exists
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No auth provided, continue without user info
    return next();
  }

  // If auth is provided, use the regular auth middleware
  auth(req, res, next);
};

// Get base price from address (with optional authentication for admin bypass)
router.post('/calculate', optionalAuth, priceController.getBasePrice);

module.exports = router; 