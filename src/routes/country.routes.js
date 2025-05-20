const express = require('express');
const router = express.Router();
const countryController = require('../controllers/country.controller');

// Create a new country
router.post('/', countryController.createCountry);

// Get all countries
router.get('/', countryController.getAllCountries);

// Get a single country by ID
router.get('/:id', countryController.getCountryById);

// Update a country
router.put('/:id', countryController.updateCountry);

// Delete a country
router.delete('/:id', countryController.deleteCountry);

module.exports = router; 