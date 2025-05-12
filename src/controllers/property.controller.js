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
    
    // Comprehensive check to ensure NO cell in the requested array exists in ANY property
    const existingCells = [];
    
    // Create a query to find any properties that contain any of the requested cells
    const cellQuery = cells.map(cell => ({ cells: cell }));
    const existingProperties = await Property.find({ $or: cellQuery });
    
    // If we found any properties with matching cells, build a list of which cells are taken
    if (existingProperties.length > 0) {
      for (const property of existingProperties) {
        for (const cell of property.cells) {
          if (cells.includes(cell) && !existingCells.includes(cell)) {
            existingCells.push(cell);
          }
        }
      }
      
      return res.status(400).json({ 
        message: 'Some cells are already owned by other users',
        ownedCells: existingCells
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

// Place a bid on a property
exports.placeBid = async (req, res) => {
  try {
    const { amount, message } = req.body;
    
    // Validate the bid amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        message: 'Invalid bid amount. Please provide a positive number',
        receivedData: req.body 
      });
    }
    
    // Find the property by ID
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user is trying to bid on their own property
    if (property.owner === req.user.uid) {
      return res.status(400).json({ message: 'You cannot bid on your own property' });
    }
    
    // Check if user has enough tokens for the bid
    const bidder = await User.findOne({ uid: req.user.uid });
    if (!bidder) {
      return res.status(404).json({ message: 'Bidder not found' });
    }
    
    if (bidder.tokens < amount) {
      return res.status(400).json({ 
        message: 'Insufficient tokens for this bid', 
        required: amount, 
        available: bidder.tokens 
      });
    }
    
    // Check if user already has a bid on this property
    const existingBidIndex = property.bids.findIndex(bid => bid.userId === req.user.uid);
    
    if (existingBidIndex !== -1) {
      // Update existing bid
      property.bids[existingBidIndex] = {
        userId: req.user.uid,
        amount,
        message: message || '',
        createdAt: new Date()
      };
    } else {
      // Add new bid
      property.bids.push({
        userId: req.user.uid,
        amount,
        message: message || '',
        createdAt: new Date()
      });
    }
    
    await property.save();
    
    res.status(200).json({
      message: 'Bid placed successfully',
      bid: {
        userId: req.user.uid,
        amount,
        message: message || '',
        propertyId: property.id
      }
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Accept a bid on a property
exports.acceptBid = async (req, res) => {
  try {
    const { bidUserId } = req.body;
    
    if (!bidUserId) {
      return res.status(400).json({ 
        message: 'Missing bidUserId parameter',
        receivedData: req.body 
      });
    }
    
    // Find the property by ID
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if the user is the owner of the property
    if (property.owner !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to accept bids on this property' });
    }
    
    // Find the specified bid
    const bidIndex = property.bids.findIndex(bid => bid.userId === bidUserId);
    
    if (bidIndex === -1) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    const bid = property.bids[bidIndex];
    
    // Get the buyer
    const buyer = await User.findOne({ uid: bid.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }
    
    // Check if buyer still has enough tokens
    if (buyer.tokens < bid.amount) {
      return res.status(400).json({ 
        message: 'Buyer has insufficient tokens', 
        required: bid.amount, 
        available: buyer.tokens 
      });
    }
    
    // Get the seller (current owner)
    const seller = await User.findOne({ uid: property.owner });
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    // Start transaction to ensure all operations succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const oldOwnerId = property.owner;
      const propertyId = property._id;
      
      // Transfer property ownership
      await Property.findOneAndUpdate(
        { id: req.params.id },
        { 
          $set: { 
            owner: bid.userId,
            forSale: false,
            bids: [] // Clear all bids after accepting one
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
        { uid: bid.userId },
        { $push: { properties: propertyId } },
        { session }
      );
      
      // Transfer tokens from buyer to seller
      await User.findOneAndUpdate(
        { uid: bid.userId },
        { $inc: { tokens: -bid.amount } },
        { session }
      );
      
      await User.findOneAndUpdate(
        { uid: oldOwnerId },
        { $inc: { tokens: bid.amount } },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        message: 'Bid accepted successfully',
        transaction: {
          propertyId: property.id,
          previousOwner: oldOwnerId,
          newOwner: bid.userId,
          price: bid.amount
        }
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all bids for a property
exports.getPropertyBids = async (req, res) => {
  try {
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Only the owner can see all bids
    if (property.owner !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to view all bids on this property' });
    }
    
    res.status(200).json({
      propertyId: property.id,
      bids: property.bids
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 