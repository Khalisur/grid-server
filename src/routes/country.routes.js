const express = require('express');
const router = express.Router();
const countryController = require('../controllers/country.controller');
const auth = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Public routes
// Get all countries
router.get('/', countryController.getAllCountries);

// Get only available countries for purchase
router.get('/available', countryController.getAvailableCountries);

// Get a single country by ID
router.get('/:id', countryController.getCountryById);

// Check if a country is available for purchase
router.get('/:id/availability', countryController.checkCountryAvailability);

// Admin routes (require authentication and admin privileges)
// Create a new country
router.post('/', auth, adminMiddleware, countryController.createCountry);

// Update a country
router.put('/:id', auth, adminMiddleware, countryController.updateCountry);

// Delete a country
router.delete('/:id', auth, adminMiddleware, countryController.deleteCountry);

// Admin: Enable country for purchase
router.put('/:id/enable', auth, adminMiddleware, countryController.enableCountry);

// Admin: Disable country for purchase
router.put('/:id/disable', auth, adminMiddleware, countryController.disableCountry);

// Admin: Toggle country availability
router.put('/:id/toggle', auth, adminMiddleware, countryController.toggleCountryAvailability);

module.exports = router; 