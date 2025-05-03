const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    const uid = req.header('Firebase-UID');
    
    if (!uid) {
      return res.status(401).json({ message: 'Firebase UID is required' });
    }

    // Find user in our database using the Firebase UID
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(401).json({ message: 'User not found in database' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = auth; 