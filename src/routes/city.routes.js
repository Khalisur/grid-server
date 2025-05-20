const express = require('express');
const router = express.Router();
const cityController = require('../controllers/city.controller');

// Create a new city
router.post('/', cityController.createCity);

// Get all cities
router.get('/', cityController.getAllCities);

// Get a single city by ID
router.get('/:id', cityController.getCityById);

// Update a city
router.put('/:id', cityController.updateCity);

// Delete a city
router.delete('/:id', cityController.deleteCity);

module.exports = router; 