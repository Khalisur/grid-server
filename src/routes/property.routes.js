const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', propertyController.getAllProperties);
router.get('/for-sale', propertyController.getPropertiesForSale);
router.get('/:id', propertyController.getPropertyById);

// Protected routes
router.post('/', auth, propertyController.createProperty);
router.get('/user/my-properties', auth, propertyController.getUserProperties);
router.put('/:id', auth, propertyController.updateProperty);
router.delete('/:id', auth, propertyController.deleteProperty);

module.exports = router; 