const User = require('../models/user.model');
const Property = require('../models/property.model');

// Create a user (after Firebase authentication)
exports.createUser = async (req, res) => {
  try {
    console.log('Creating user with data:', req.body);
    const { id, uid, email, name } = req.body;

    // Validate required fields
    if (!uid || !email) {
      console.log('Missing required fields:', { uid, email });
      return res.status(400).json({ 
        message: 'Missing required fields: uid and email are required' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { uid }] 
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return res.status(200).json({ 
        message: 'User already exists', 
        user: existingUser 
      });
    }

    const user = new User({
      id: id || uid.substring(0, 5),
      uid,
      email,
      name: name || 'User',
      tokens: 480
    });

    await user.save();
    console.log('User created successfully:', user);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        tokens: user.tokens
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid })
      .populate('properties');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get properties using the uid instead of ObjectId references
    const properties = await Property.find({ owner: user.uid });

    res.status(200).json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      tokens: user.tokens,
      properties
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'tokens'];
    const updateFields = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        tokens: user.tokens
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete all properties owned by this user
    await Property.deleteMany({ owner: user.uid });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 