const Property = require('../models/property.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Create a new property
exports.createProperty = async (req, res) => {
  try {
    console.log('Creating property with data:', req.body);
    
    // Extract required fields
    const { id, cells, price } = req.body;
    
    // Validate required fields
    if (!id || !cells || !price) {
      console.log('Missing required fields:', { id, cells, price });
      return res.status(400).json({ 
        message: 'Missing required fields: id, cells, and price are required',
        receivedData: req.body 
      });
    }
    
    const existingProperty = await Property.findOne({ id });
    if (existingProperty) {
      return res.status(400).json({ message: 'Property with this ID already exists' });
    }

    // Create property with all fields from request body plus defaults
    const newProperty = new Property({
      ...req.body,
      owner: req.user.uid
    });

    try {
      const savedProperty = await newProperty.save();
      console.log('Property created successfully:', savedProperty);

      // Add property to user's properties array
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { $push: { properties: savedProperty._id } }
      );

      res.status(201).json({
        message: 'Property created successfully',
        property: savedProperty
      });
    } catch (validationError) {
      console.error('Property validation error:', validationError);
      return res.status(400).json({ 
        message: 'Property validation failed', 
        error: validationError.message,
        details: validationError.errors 
      });
    }
  } catch (error) {
    console.error('Server error creating property:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get properties for sale
exports.getPropertiesForSale = async (req, res) => {
  try {
    const properties = await Property.find({ forSale: true });
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's properties
exports.getUserProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.uid });
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'description', 'address', 'forSale', 'salePrice'];
    
    const updateFields = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if the user is the owner of the property
    if (property.owner !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }
    
    const updatedProperty = await Property.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateFields },
      { new: true }
    );
    
    res.status(200).json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if the user is the owner of the property
    if (property.owner !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }
    
    await Property.findOneAndDelete({ id: req.params.id });
    
    // Remove property from user's properties array
    await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $pull: { properties: property._id } }
    );
    
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Buy property from another user
exports.buyProperty = async (req, res) => {
  try {
    // Find the property by ID
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if property is for sale
    if (!property.forSale) {
      return res.status(400).json({ message: 'This property is not for sale' });
    }
    
    // Check if user is trying to buy their own property
    if (property.owner === req.user.uid) {
      return res.status(400).json({ message: 'You already own this property' });
    }
    
    // Get buyer information
    const buyer = await User.findOne({ uid: req.user.uid });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }
    
    // Check if buyer has enough tokens
    if (buyer.tokens < property.salePrice) {
      return res.status(400).json({ 
        message: 'Insufficient tokens', 
        required: property.salePrice, 
        available: buyer.tokens 
      });
    }
    
    // Get seller information
    const seller = await User.findOne({ uid: property.owner });
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    // Start transaction to ensure all operations succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update property owner
      const oldOwnerId = property.owner;
      const propertyId = property._id;
      
      // Transfer property ownership
      await Property.findOneAndUpdate(
        { id: req.params.id },
        { 
          $set: { 
            owner: req.user.uid,
            forSale: false 
          } 
        },
        { session }
      );
      
      // Remove property from seller's properties array
      await User.findOneAndUpdate(
        { uid: oldOwnerId },
        { $pull: { properties: propertyId } },
        { session }
      );
      
      // Add property to buyer's properties array
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { $push: { properties: propertyId } },
        { session }
      );
      
      // Transfer tokens from buyer to seller
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { $inc: { tokens: -property.salePrice } },
        { session }
      );
      
      await User.findOneAndUpdate(
        { uid: oldOwnerId },
        { $inc: { tokens: property.salePrice } },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        message: 'Property purchased successfully',
        property: {
          id: property.id,
          previousOwner: oldOwnerId,
          newOwner: req.user.uid,
          price: property.salePrice
        }
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error buying property:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Buy unallocated property (not owned by any user yet)
exports.buyUnallocatedProperty = async (req, res) => {
  try {
    // Extract and validate the required data
    const { cells, price } = req.body;
    console.log('Buying unallocated property with data:', req.body);
    
    if (!cells || !Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid cells data. Please provide an array of cell coordinates',
        receivedData: req.body 
      });
    }
    
    if (!price || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ 
        message: 'Invalid price. Price must be a positive number',
        receivedData: req.body 
      });
    }
    
    // Check if any of the cells are already owned
    const existingProperties = await Property.find({ 
      cells: { $in: cells } 
    });
    
    if (existingProperties.length > 0) {
      // Find which cells are already owned
      const ownedCells = new Set();
      existingProperties.forEach(property => {
        property.cells.forEach(cell => {
          if (cells.includes(cell)) {
            ownedCells.add(cell);
          }
        });
      });
      
      return res.status(400).json({ 
        message: 'Some cells are already owned by other users',
        ownedCells: Array.from(ownedCells)
      });
    }
    
    // Get user information
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has enough tokens
    if (user.tokens < price) {
      return res.status(400).json({ 
        message: 'Insufficient tokens', 
        required: price, 
        available: user.tokens 
      });
    }
    
    // Generate a unique ID for the new property
    const propertyId = req.body.id || mongoose.Types.ObjectId().toString();
    
    // Create a new property
    const newProperty = new Property({
      id: propertyId,
      owner: req.user.uid,
      cells: cells,
      price: price,
      name: req.body.name || `Property #${Date.now().toString().slice(-4)}`,
      description: req.body.description || `Property with ${cells.length} cells`,
      address: req.body.address || 'Grid Map Location',
      forSale: false,
      salePrice: req.body.salePrice || price * 1.5  // Default sale price if user wants to sell later
    });
    
    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Save the new property
      const savedProperty = await newProperty.save({ session });
      
      // Deduct tokens from user
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { 
          $inc: { tokens: -price },
          $push: { properties: savedProperty._id }
        },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(201).json({
        message: 'Unallocated property purchased successfully',
        property: savedProperty
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error buying unallocated property:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 