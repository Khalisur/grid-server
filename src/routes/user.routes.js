const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

// Public routes - for Firebase-authenticated users
router.post('/create', userController.createUser);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/update', auth, userController.updateUser);
router.delete('/delete', auth, userController.deleteUser);

module.exports = router; 