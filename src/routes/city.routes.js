const express = require('express');
const router = express.Router();
const cityController = require('../controllers/city.controller');
const auth = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Public routes
// Get all cities
router.get('/', cityController.getAllCities);

// Get only available cities for purchase
router.get('/available', cityController.getAvailableCities);

// Get a single city by ID
router.get('/:id', cityController.getCityById);

// Check if a city is available for purchase
router.get('/:id/availability', cityController.checkCityAvailability);

// Admin routes (require authentication and admin privileges)
// Create a new city
router.post('/', auth, adminMiddleware, cityController.createCity);

// Update a city
router.put('/:id', auth, adminMiddleware, cityController.updateCity);

// Delete a city
router.delete('/:id', auth, adminMiddleware, cityController.deleteCity);

// Admin: Enable city for purchase
router.put('/:id/enable', auth, adminMiddleware, cityController.enableCity);

// Admin: Disable city for purchase
router.put('/:id/disable', auth, adminMiddleware, cityController.disableCity);

// Admin: Toggle city availability
router.put('/:id/toggle', auth, adminMiddleware, cityController.toggleCityAvailability);

module.exports = router; 