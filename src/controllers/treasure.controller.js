const Treasure = require('../models/treasure.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Create a new treasure (Admin only)
exports.createTreasure = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      cells,
      rewardType, 
      rewardAmount, 
      rewardMessage, 
      maxRedemptions,
      expiresAt 
    } = req.body;

    // Validate required fields
    if (!name || !cells || !rewardAmount) {
      return res.status(400).json({
        message: 'Missing required fields: name, cells, and rewardAmount are required'
      });
    }

    // Validate cells array
    if (!Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({
        message: 'Cells must be a non-empty array'
      });
    }

    // Check if any cells already exist in other treasures
    const existingTreasure = await Treasure.findOne({
      cells: { $in: cells },
      isActive: true
    });

    if (existingTreasure) {
      return res.status(400).json({ 
        message: 'Some cells already have active treasures. Each cell can only contain one active treasure.'
      });
    }

    // Create treasure
    const treasureData = {
      name,
      description: description || 'Hidden treasure waiting to be discovered!',
      cells: cells,
      rewardType: rewardType || 'tokens',
      rewardAmount,
      rewardMessage: rewardMessage || '🎉 Congratulations! You found a hidden treasure!',
      maxRedemptions: maxRedemptions || 1,
      createdBy: req.user.uid,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    const treasure = new Treasure(treasureData);
    await treasure.save();

    console.log(`Admin ${req.user.uid} created treasure "${treasure.name}" with ${treasure.cells.length} cells`);

    res.status(201).json({
      message: 'Treasure created successfully',
      treasure: {
        id: treasure._id,
        name: treasure.name,
        description: treasure.description,
        cells: treasure.cells,
        rewardType: treasure.rewardType,
        rewardAmount: treasure.rewardAmount,
        rewardMessage: treasure.rewardMessage,
        maxRedemptions: treasure.maxRedemptions,
        isActive: treasure.isActive,
        expiresAt: treasure.expiresAt,
        createdBy: treasure.createdBy
      }
    });
  } catch (error) {
    console.error('Error creating treasure:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get all treasures (Admin only)
exports.getAllTreasures = async (req, res) => {
  try {
    const { status, includeRedeemed = 'true' } = req.query;
    
    let filter = {};
    
    // Filter by status
    if (status === 'active') {
      filter.isActive = true;
      filter.isRedeemed = false;
    } else if (status === 'redeemed') {
      filter.isRedeemed = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    // Exclude redeemed if requested
    if (includeRedeemed === 'false') {
      filter.isRedeemed = false;
    }

    const treasures = await Treasure.find(filter).sort({ createdAt: -1 });
    
    // Format treasures for response
    const formattedTreasures = treasures.map((treasure) => ({
      id: treasure._id,
      name: treasure.name,
      description: treasure.description,
      cells: treasure.cells,
      cellCount: treasure.cells.length,
      rewardType: treasure.rewardType,
      rewardAmount: treasure.rewardAmount,
      rewardMessage: treasure.rewardMessage,
      isActive: treasure.isActive,
      isRedeemed: treasure.isRedeemed,
      redeemedBy: treasure.redeemedBy,
      redeemedAt: treasure.redeemedAt,
      maxRedemptions: treasure.maxRedemptions,
      currentRedemptions: treasure.currentRedemptions,
      expiresAt: treasure.expiresAt,
      createdBy: treasure.createdBy,
      createdAt: treasure.createdAt,
      isExpired: treasure.isExpired,
      isAvailable: treasure.isAvailable
    }));

    res.status(200).json({
      count: formattedTreasures.length,
      treasures: formattedTreasures
    });
  } catch (error) {
    console.error('Error fetching treasures:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get treasure by ID (Admin only)
exports.getTreasureById = async (req, res) => {
  try {
    const treasure = await Treasure.findById(req.params.id);
    
    if (!treasure) {
      return res.status(404).json({ message: 'Treasure not found' });
    }

    res.status(200).json({
      treasure: {
        id: treasure._id,
        name: treasure.name,
        description: treasure.description,
        cells: treasure.cells,
        cellCount: treasure.cells.length,
        rewardType: treasure.rewardType,
        rewardAmount: treasure.rewardAmount,
        rewardMessage: treasure.rewardMessage,
        isActive: treasure.isActive,
        isRedeemed: treasure.isRedeemed,
        redeemedBy: treasure.redeemedBy,
        redeemedAt: treasure.redeemedAt,
        maxRedemptions: treasure.maxRedemptions,
        currentRedemptions: treasure.currentRedemptions,
        expiresAt: treasure.expiresAt,
        createdBy: treasure.createdBy,
        createdAt: treasure.createdAt,
        isExpired: treasure.isExpired,
        isAvailable: treasure.isAvailable
      }
    });
  } catch (error) {
    console.error('Error fetching treasure:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Update treasure (Admin only)
exports.updateTreasure = async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'description', 'cells', 'rewardType', 'rewardAmount', 
      'rewardMessage', 'isActive', 'maxRedemptions', 'expiresAt'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (updates.expiresAt) {
      updates.expiresAt = new Date(updates.expiresAt);
    }

    // If updating cells, validate they don't conflict with other treasures
    if (updates.cells) {
      if (!Array.isArray(updates.cells) || updates.cells.length === 0) {
        return res.status(400).json({
          message: 'Cells must be a non-empty array'
        });
      }

      const existingTreasure = await Treasure.findOne({
        _id: { $ne: req.params.id },
        cells: { $in: updates.cells },
        isActive: true
      });

      if (existingTreasure) {
        return res.status(400).json({ 
          message: 'Some cells already have active treasures'
        });
      }
    }

    const treasure = await Treasure.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!treasure) {
      return res.status(404).json({ message: 'Treasure not found' });
    }

    console.log(`Admin ${req.user.uid} updated treasure ${req.params.id}`);

    res.status(200).json({
      message: 'Treasure updated successfully',
      treasure: {
        id: treasure._id,
        name: treasure.name,
        description: treasure.description,
        cells: treasure.cells,
        cellCount: treasure.cells.length,
        rewardType: treasure.rewardType,
        rewardAmount: treasure.rewardAmount,
        rewardMessage: treasure.rewardMessage,
        isActive: treasure.isActive,
        isRedeemed: treasure.isRedeemed,
        maxRedemptions: treasure.maxRedemptions,
        currentRedemptions: treasure.currentRedemptions,
        expiresAt: treasure.expiresAt,
        isExpired: treasure.isExpired,
        isAvailable: treasure.isAvailable
      }
    });
  } catch (error) {
    console.error('Error updating treasure:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Delete treasure (Admin only)
exports.deleteTreasure = async (req, res) => {
  try {
    const treasure = await Treasure.findByIdAndDelete(req.params.id);
    
    if (!treasure) {
      return res.status(404).json({ message: 'Treasure not found' });
    }

    console.log(`Admin ${req.user.uid} deleted treasure ${req.params.id} "${treasure.name}"`);

    res.status(200).json({ 
      message: 'Treasure deleted successfully',
      deletedTreasure: {
        id: treasure._id,
        name: treasure.name,
        cellCount: treasure.cells.length
      }
    });
  } catch (error) {
    console.error('Error deleting treasure:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Toggle treasure active status (Admin only)
exports.toggleTreasureStatus = async (req, res) => {
  try {
    const treasure = await Treasure.findById(req.params.id);
    
    if (!treasure) {
      return res.status(404).json({ message: 'Treasure not found' });
    }

    treasure.isActive = !treasure.isActive;
    await treasure.save();

    const status = treasure.isActive ? 'activated' : 'deactivated';
    console.log(`Admin ${req.user.uid} ${status} treasure ${req.params.id}`);

    res.status(200).json({
      message: `Treasure ${status} successfully`,
      treasure: {
        id: treasure._id,
        name: treasure.name,
        isActive: treasure.isActive,
        isAvailable: treasure.isAvailable
      }
    });
  } catch (error) {
    console.error('Error toggling treasure status:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}; 