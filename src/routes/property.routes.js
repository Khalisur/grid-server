const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', propertyController.getAllProperties);
router.get('/for-sale', propertyController.getPropertiesForSale);

// Protected routes
router.post('/unallocated/buy', auth, propertyController.buyUnallocatedProperty);
router.get('/user/my-properties', auth, propertyController.getUserProperties);
router.post('/', auth, propertyController.createProperty);

// Bidding routes
router.post('/:id/bid', auth, propertyController.placeBid);
router.post('/:id/bid/accept', auth, propertyController.acceptBid);
router.post('/:id/bid/decline', auth, propertyController.declineBid);
router.post('/:id/bid/cancel', auth, propertyController.cancelBid);
router.get('/:id/bids', auth, propertyController.getPropertyBids);

// Routes with path parameters (these should come after more specific routes)
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', auth, propertyController.updateProperty);
router.delete('/:id', auth, propertyController.deleteProperty);
router.post('/:id/buy', auth, propertyController.buyProperty);

module.exports = router; 