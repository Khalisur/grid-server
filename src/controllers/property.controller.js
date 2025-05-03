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