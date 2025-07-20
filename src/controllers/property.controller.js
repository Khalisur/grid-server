const Property = require('../models/property.model');
const User = require('../models/user.model');
const City = require('../models/city.model');
const Country = require('../models/country.model');
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
    
    // Get buyer information to check admin status
    const buyer = await User.findOne({ uid: req.user.uid });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const isBuyerAdmin = buyer.isAdmin;
    console.log(`Buyer ${buyer.uid} admin status: ${isBuyerAdmin}`);
    
    // Check city/country availability if buyer is not admin and property has an address
    if (!isBuyerAdmin && property.address && property.address !== 'Grid Map Location') {
      const addressLower = property.address.toLowerCase();
      console.log('Checking availability for property address:', addressLower);
      
      // First try to find a matching city
      const cities = await City.find();
      const matchingCity = cities.find(city => {
        const cityNameLower = city.name.toLowerCase();
        return addressLower.includes(cityNameLower);
      });
      
      if (matchingCity) {
        const isAvailable = matchingCity.isAvailable && matchingCity.isActive;
        if (!isAvailable) {
          return res.status(403).json({
            message: 'Property purchases are currently disabled for this city',
            location: matchingCity.name,
            reason: matchingCity.disabledReason,
            disabledBy: matchingCity.disabledBy,
            disabledAt: matchingCity.disabledAt,
            propertyId: property.id,
            propertyName: property.name
          });
        }
      } else {
        // If no city match, try to find a matching country
        const countries = await Country.find();
        const matchingCountry = countries.find(country => {
          const countryNameLower = country.name.toLowerCase();
          return addressLower.includes(countryNameLower);
        });
        
        if (matchingCountry) {
          const isAvailable = matchingCountry.isAvailable && matchingCountry.isActive;
          if (!isAvailable) {
            return res.status(403).json({
              message: 'Property purchases are currently disabled for this country',
              location: matchingCountry.name,
              reason: matchingCountry.disabledReason,
              disabledBy: matchingCountry.disabledBy,
              disabledAt: matchingCountry.disabledAt,
              propertyId: property.id,
              propertyName: property.name
            });
          }
        }
      }
    } else if (!isBuyerAdmin && property.address) {
      console.log('Property has generic address, skipping location availability check');
    } else if (isBuyerAdmin) {
      console.log('Admin buyer bypassing location availability checks');
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
      
      const responseMessage = isBuyerAdmin ? 
        'Property purchased successfully (admin)' : 
        'Property purchased successfully';
      
      res.status(200).json({
        message: responseMessage,
        property: {
          id: property.id,
          previousOwner: oldOwnerId,
          newOwner: req.user.uid,
          price: property.salePrice
        },
        adminPurchase: isBuyerAdmin
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
    const { cells, price, address } = req.body;
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

    // Get user information to check admin status
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isAdmin = user.isAdmin;
    console.log(`User ${user.uid} admin status: ${isAdmin}`);
    
    // Check availability if address is provided AND user is not admin
    if (address && !isAdmin) {
      const addressLower = address.toLowerCase();
      console.log('Address:', addressLower);
      
      // First try to find a matching city
      const cities = await City.find();
      const matchingCity = cities.find(city => {
        const cityNameLower = city.name.toLowerCase();
        return addressLower.includes(cityNameLower);
      });
      console.log('Matching city:', matchingCity);
      
      
      if (matchingCity) {
        const isAvailable = matchingCity.isAvailable && matchingCity.isActive;
        if (!isAvailable) {
          return res.status(403).json({
            message: 'Property purchases are currently disabled for this city',
            location: matchingCity.name,
            reason: matchingCity.disabledReason,
            disabledBy: matchingCity.disabledBy,
            disabledAt: matchingCity.disabledAt
          });
        }
      } else {
        // If no city match, try to find a matching country
        const countries = await Country.find();
        const matchingCountry = countries.find(country => {
          const countryNameLower = country.name.toLowerCase();
          return addressLower.includes(countryNameLower);
        });
        console.log('Matching country:', matchingCountry);
        
        if (matchingCountry) {
          const isAvailable = matchingCountry.isAvailable && matchingCountry.isActive;
          if (!isAvailable) {
            return res.status(403).json({
              message: 'Property purchases are currently disabled for this country',
              location: matchingCountry.name,
              reason: matchingCountry.disabledReason,
              disabledBy: matchingCountry.disabledBy,
              disabledAt: matchingCountry.disabledAt
            });
          }
        }
      }
    } else if (address && isAdmin) {
      console.log('Admin user bypassing availability checks for address:', address);
    }
    
    // Check maximum cell size limit
    const maxCellSize = parseInt(process.env.MAX_CELL_SIZE) || 100;
    if (cells.length > maxCellSize) {
      console.log('Maximum cell size exceeded:', cells.length, '>', maxCellSize);
      return res.status(400).json({ 
        message: `Maximum cell size exceeded. You can only buy up to ${maxCellSize} cells at once`,
        requestedCells: cells.length,
        maxAllowed: maxCellSize
      });
    }
    
    // Check maximum price limit
    const maxPrice = parseInt(process.env.MAX_PRICE) || 10000; // Default to 10000 if not set
    if (price > maxPrice) {
      return res.status(400).json({ 
        message: `Maximum price exceeded. You can only spend up to ${maxPrice} tokens`,
        requestedPrice: price,
        maxAllowed: maxPrice
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
      
      const responseMessage = isAdmin ? 
        'Unallocated property purchased successfully (admin bypass)' : 
        'Unallocated property purchased successfully';
      
      res.status(201).json({
        message: responseMessage,
        property: savedProperty,
        adminBypass: isAdmin
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
    
    // Get bidder information
    const bidder = await User.findOne({ uid: req.user.uid });
    if (!bidder) {
      return res.status(404).json({ message: 'Bidder not found' });
    }

    const isBidderAdmin = bidder.isAdmin;
    console.log(`Bidder ${bidder.uid} admin status: ${isBidderAdmin}`);
    
    // Check city/country availability if bidder is not admin and property has an address
    if (!isBidderAdmin && property.address && property.address !== 'Grid Map Location') {
      const addressLower = property.address.toLowerCase();
      console.log('Checking availability for bidding on property address:', addressLower);
      
      // First try to find a matching city
      const cities = await City.find();
      const matchingCity = cities.find(city => {
        const cityNameLower = city.name.toLowerCase();
        return addressLower.includes(cityNameLower);
      });
      
      if (matchingCity) {
        const isAvailable = matchingCity.isAvailable && matchingCity.isActive;
        if (!isAvailable) {
          return res.status(403).json({
            message: 'Cannot place bid: Property purchases are currently disabled for this city',
            location: matchingCity.name,
            reason: matchingCity.disabledReason,
            disabledBy: matchingCity.disabledBy,
            disabledAt: matchingCity.disabledAt,
            propertyId: property.id,
            propertyName: property.name
          });
        }
      } else {
        // If no city match, try to find a matching country
        const countries = await Country.find();
        const matchingCountry = countries.find(country => {
          const countryNameLower = country.name.toLowerCase();
          return addressLower.includes(countryNameLower);
        });
        
        if (matchingCountry) {
          const isAvailable = matchingCountry.isAvailable && matchingCountry.isActive;
          if (!isAvailable) {
            return res.status(403).json({
              message: 'Cannot place bid: Property purchases are currently disabled for this country',
              location: matchingCountry.name,
              reason: matchingCountry.disabledReason,
              disabledBy: matchingCountry.disabledBy,
              disabledAt: matchingCountry.disabledAt,
              propertyId: property.id,
              propertyName: property.name
            });
          }
        }
      }
    } else if (isBidderAdmin) {
      console.log('Admin bidder bypassing location availability checks');
    }
    
    // Check if user already has a bid on this property
    const existingBidIndex = property.bids.findIndex(bid => bid.userId === req.user.uid && bid.status === 'active');
    let previousBidAmount = 0;
    
    if (existingBidIndex !== -1) {
      previousBidAmount = property.bids[existingBidIndex].amount;
    }
    
    // Calculate the additional tokens needed for the new bid
    const additionalTokensNeeded = amount - previousBidAmount;
    
    // Check if user has enough tokens for the bid
    if (bidder.tokens < additionalTokensNeeded) {
      return res.status(400).json({ 
        message: 'Insufficient tokens for this bid', 
        required: additionalTokensNeeded, 
        available: bidder.tokens
      });
    }
    
    // Start transaction to ensure all operations succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update or add the bid
      if (existingBidIndex !== -1) {
        // Update existing bid
        property.bids[existingBidIndex] = {
          userId: req.user.uid,
          amount,
          message: message || '',
          status: 'active',
          createdAt: new Date()
        };
      } else {
        // Add new bid
        property.bids.push({
          userId: req.user.uid,
          amount,
          message: message || '',
          status: 'active',
          createdAt: new Date()
        });
      }
      
      await property.save({ session });
      
      // Deduct tokens and update reserved tokens
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { 
          $inc: { 
            tokens: -additionalTokensNeeded,
            reservedTokens: additionalTokensNeeded 
          } 
        },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      const responseMessage = isBidderAdmin ? 
        'Bid placed successfully (admin)' : 
        'Bid placed successfully';
      
      res.status(200).json({
        message: responseMessage,
        bid: {
          userId: req.user.uid,
          amount,
          message: message || '',
          propertyId: property.id,
          status: 'active'
        },
        adminBid: isBidderAdmin
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
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
    const bidIndex = property.bids.findIndex(bid => bid.userId === bidUserId && bid.status === 'active');
    
    if (bidIndex === -1) {
      return res.status(404).json({ message: 'Active bid not found for this user' });
    }
    
    const bid = property.bids[bidIndex];
    
    // Get the buyer (bidder)
    const buyer = await User.findOne({ uid: bid.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const isBuyerAdmin = buyer.isAdmin;
    console.log(`Bidder ${buyer.uid} admin status: ${isBuyerAdmin}`);
    
    // Check city/country availability if bidder is not admin and property has an address
    if (!isBuyerAdmin && property.address && property.address !== 'Grid Map Location') {
      const addressLower = property.address.toLowerCase();
      console.log('Checking availability for bidder on property address:', addressLower);
      
      // First try to find a matching city
      const cities = await City.find();
      const matchingCity = cities.find(city => {
        const cityNameLower = city.name.toLowerCase();
        return addressLower.includes(cityNameLower);
      });
      
      if (matchingCity) {
        const isAvailable = matchingCity.isAvailable && matchingCity.isActive;
        if (!isAvailable) {
          return res.status(403).json({
            message: 'Cannot accept bid: Property purchases are currently disabled for this city',
            location: matchingCity.name,
            reason: matchingCity.disabledReason,
            disabledBy: matchingCity.disabledBy,
            disabledAt: matchingCity.disabledAt,
            propertyId: property.id,
            propertyName: property.name,
            bidderInfo: `Bidder ${buyer.name} cannot purchase properties in disabled locations`
          });
        }
      } else {
        // If no city match, try to find a matching country
        const countries = await Country.find();
        const matchingCountry = countries.find(country => {
          const countryNameLower = country.name.toLowerCase();
          return addressLower.includes(countryNameLower);
        });
        
        if (matchingCountry) {
          const isAvailable = matchingCountry.isAvailable && matchingCountry.isActive;
          if (!isAvailable) {
            return res.status(403).json({
              message: 'Cannot accept bid: Property purchases are currently disabled for this country',
              location: matchingCountry.name,
              reason: matchingCountry.disabledReason,
              disabledBy: matchingCountry.disabledBy,
              disabledAt: matchingCountry.disabledAt,
              propertyId: property.id,
              propertyName: property.name,
              bidderInfo: `Bidder ${buyer.name} cannot purchase properties in disabled locations`
            });
          }
        }
      }
    } else if (isBuyerAdmin) {
      console.log('Admin bidder bypassing location availability checks');
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
      
      // Update all bids status
      for (let i = 0; i < property.bids.length; i++) {
        if (i === bidIndex) {
          property.bids[i].status = 'accepted';
        } else if (property.bids[i].status === 'active') {
          property.bids[i].status = 'declined';
        }
      }
      
      // Transfer property ownership and update bids
      await Property.findOneAndUpdate(
        { id: req.params.id },
        { 
          $set: { 
            owner: bid.userId,
            forSale: false,
            bids: property.bids
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
      
      // Release reserved tokens for the accepted bid
      await User.findOneAndUpdate(
        { uid: bid.userId },
        { $inc: { reservedTokens: -bid.amount } },
        { session }
      );
      
      // Transfer tokens from buyer to seller (amount is already deducted from buyer when bid was placed)
      await User.findOneAndUpdate(
        { uid: oldOwnerId },
        { $inc: { tokens: bid.amount } },
        { session }
      );
      
      // Return reserved tokens and actual tokens for all declined bids
      const declinedBids = property.bids.filter(b => b.status === 'declined');
      for (const declinedBid of declinedBids) {
        await User.findOneAndUpdate(
          { uid: declinedBid.userId },
          { 
            $inc: { 
              tokens: declinedBid.amount,
              reservedTokens: -declinedBid.amount 
            } 
          },
          { session }
        );
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      const responseMessage = isBuyerAdmin ? 
        'Bid accepted successfully (admin buyer)' : 
        'Bid accepted successfully';
      
      res.status(200).json({
        message: responseMessage,
        transaction: {
          propertyId: property.id,
          previousOwner: oldOwnerId,
          newOwner: bid.userId,
          price: bid.amount
        },
        adminPurchase: isBuyerAdmin
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
    
    // Return all bids for this property to any authenticated user
    res.status(200).json({
      propertyId: property.id,
      owner: property.owner,
      bids: property.bids
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Decline a bid on a property
exports.declineBid = async (req, res) => {
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
      return res.status(403).json({ message: 'Not authorized to decline bids on this property' });
    }
    
    // Find the specified bid
    const bidIndex = property.bids.findIndex(bid => bid.userId === bidUserId && bid.status === 'active');
    
    if (bidIndex === -1) {
      return res.status(404).json({ message: 'Active bid not found for this user' });
    }
    
    const bid = property.bids[bidIndex];
    
    // Get the bidder
    const bidder = await User.findOne({ uid: bid.userId });
    if (!bidder) {
      return res.status(404).json({ message: 'Bidder not found' });
    }
    
    // Start transaction to ensure all operations succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update bid status to declined
      property.bids[bidIndex].status = 'declined';
      await property.save({ session });
      
      // Return reserved tokens to the bidder
      await User.findOneAndUpdate(
        { uid: bid.userId },
        { 
          $inc: { 
            tokens: bid.amount,
            reservedTokens: -bid.amount 
          } 
        },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        message: 'Bid declined successfully',
        bid: {
          userId: bid.userId,
          amount: bid.amount,
          propertyId: property.id
        }
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error declining bid:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Cancel a bid on a property
exports.cancelBid = async (req, res) => {
  try {
    // Find the property by ID
    const property = await Property.findOne({ id: req.params.id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Find the user's bid
    const bidIndex = property.bids.findIndex(bid => bid.userId === req.user.uid && bid.status === 'active');
    
    if (bidIndex === -1) {
      return res.status(404).json({ message: 'Active bid not found for your account' });
    }
    
    const bid = property.bids[bidIndex];
    
    // Start transaction to ensure all operations succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update bid status to cancelled
      property.bids[bidIndex].status = 'cancelled';
      await property.save({ session });
      
      // Return reserved tokens to the bidder
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { 
          $inc: { 
            tokens: bid.amount,
            reservedTokens: -bid.amount 
          } 
        },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        message: 'Bid cancelled successfully',
        bid: {
          amount: bid.amount,
          propertyId: property.id
        }
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling bid:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all bids (offers) made by the current user
exports.getUserBids = async (req, res) => {
  try {
    // Find all properties with bids from this user
    const properties = await Property.find({
      'bids.userId': req.user.uid
    });
    
    if (!properties || properties.length === 0) {
      return res.status(200).json({
        message: 'No bids found',
        bids: []
      });
    }
    
    // Extract relevant bid information
    const userBids = [];
    
    for (const property of properties) {
      const propertyBids = property.bids.filter(bid => bid.userId === req.user.uid);
      
      for (const bid of propertyBids) {
        userBids.push({
          propertyId: property.id,
          propertyName: property.name,
          propertyOwner: property.owner,
          bid: {
            amount: bid.amount,
            message: bid.message,
            status: bid.status,
            createdAt: bid.createdAt
          }
        });
      }
    }
    
    res.status(200).json({
      userId: req.user.uid,
      bidsCount: userBids.length,
      bids: userBids
    });
  } catch (error) {
    console.error('Error getting user bids:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all bids (offers) received on properties owned by the current user
exports.getReceivedBids = async (req, res) => {
  try {
    // Find all properties owned by this user
    const properties = await Property.find({
      owner: req.user.uid
    });
    
    if (!properties || properties.length === 0) {
      return res.status(200).json({
        message: 'No properties or bids found',
        bids: []
      });
    }
    
    // Extract relevant bid information
    const receivedBids = [];
    
    for (const property of properties) {
      // Skip properties with no bids
      if (!property.bids || property.bids.length === 0) continue;
      
      for (const bid of property.bids) {
        receivedBids.push({
          propertyId: property.id,
          propertyName: property.name,
          bid: {
            userId: bid.userId,
            amount: bid.amount,
            message: bid.message,
            status: bid.status,
            createdAt: bid.createdAt
          }
        });
      }
    }
    
    res.status(200).json({
      userId: req.user.uid,
      bidsCount: receivedBids.length,
      bids: receivedBids
    });
  } catch (error) {
    console.error('Error getting received bids:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Calculate base price by property
exports.calculateBasePriceByProperty = async (req, res) => {
  try {
    const { location, cellCount } = req.body;

    // Validate that required data was provided
    if (!location || !location.country) {
      return res.status(400).json({ 
        message: 'Valid location information is required',
        receivedData: req.body 
      });
    }

    if (!cellCount || isNaN(cellCount) || cellCount <= 0) {
      return res.status(400).json({ 
        message: 'Valid cellCount is required',
        receivedData: req.body 
      });
    }

    // Import geo service for calculations
    const geoService = require('../services/geo.service');

    // Calculate price based on location and cell count
    const priceData = geoService.calculateBasePrice(location, parseInt(cellCount));

    // Return calculated price data
    res.status(200).json({
      message: 'Base price calculated successfully',
      ...priceData
    });
  } catch (error) {
    console.error('Error calculating base price:', error);
    res.status(500).json({ 
      message: 'Server error while calculating base price', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 