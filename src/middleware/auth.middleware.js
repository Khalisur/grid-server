const admin = require('../config/firebase.config');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    try {
      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Get the Firebase UID from the decoded token
      const uid = decodedToken.uid;

      // Find user in our database using the Firebase UID
      const user = await User.findOne({ uid });

      if (!user) {
        return res.status(401).json({ message: 'User not found in database' });
      }

      // Attach user and decoded token to request
      req.user = user;
      req.firebaseUser = decodedToken;
      next();
    } catch (firebaseError) {
      console.error('Firebase token verification error:', firebaseError);
      if (firebaseError.code === 'app/invalid-credential') {
        return res.status(500).json({ 
          message: 'Firebase configuration error', 
          error: 'The server is not properly configured to validate Firebase tokens. Please check server logs.'
        });
      }
      return res.status(401).json({ message: 'Invalid token', error: firebaseError.message });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = auth; 