const express = require('express');
const router = express.Router();
const treasureController = require('../controllers/treasure.controller');
const auth = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// All treasure routes require admin authentication
router.use(auth);
router.use(adminMiddleware);

// Create a new treasure
router.post('/', treasureController.createTreasure);

// Get all treasures
router.get('/', treasureController.getAllTreasures);

// Get treasure by ID
router.get('/:id', treasureController.getTreasureById);

// Update treasure
router.put('/:id', treasureController.updateTreasure);

// Delete treasure
router.delete('/:id', treasureController.deleteTreasure);

// Toggle treasure active status
router.put('/:id/toggle', treasureController.toggleTreasureStatus);

module.exports = router; 