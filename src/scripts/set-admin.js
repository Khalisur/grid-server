const mongoose = require('mongoose');
const User = require('../models/user.model');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const setUserAsAdmin = async (userUid) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    if (!userUid) {
      console.log('Usage: node src/scripts/set-admin.js <user_uid>');
      console.log('Example: node src/scripts/set-admin.js d7yZVWdS8fd8jnxLYdw6SDEemMo2');
      return;
    }

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { uid: userUid },
      { $set: { isAdmin: true } },
      { new: true }
    );

    if (!user) {
      console.log(`❌ User with UID '${userUid}' not found`);
      return;
    }

    console.log(`✅ User '${user.name}' (${user.email}) is now an admin`);
    console.log('User details:', {
      uid: user.uid,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      tokens: user.tokens
    });

  } catch (error) {
    console.error('Error setting admin status:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Get UID from command line arguments
const userUid = process.argv[2];
setUserAsAdmin(userUid); 