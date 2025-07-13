const City = require('../models/city.model');

// Create a new city
exports.createCity = async (req, res) => {
  try {
    const { name, value } = req.body;
    const city = new City({ name, value });
    await city.save();
    res.status(201).json(city);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all cities
exports.getAllCities = async (req, res) => {
  try {
    const cities = await City.find();
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get only available cities for purchase
exports.getAvailableCities = async (req, res) => {
  try {
    const cities = await City.find({ isAvailable: true, isActive: true });
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single city by ID
exports.getCityById = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json(city);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a city
exports.updateCity = async (req, res) => {
  try {
    const { name, value } = req.body;
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { name, value },
      { new: true, runValidators: true }
    );
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json(city);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a city
exports.deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json({ message: 'City deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Enable city for purchase
exports.enableCity = async (req, res) => {
  try {
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { 
        isAvailable: true,
        isActive: true,
        disabledReason: '',
        disabledBy: '',
        disabledAt: null
      },
      { new: true, runValidators: true }
    );
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json({
      message: 'City enabled for purchase',
      city
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Disable city for purchase
exports.disableCity = async (req, res) => {
  try {
    const { reason } = req.body;
    const adminId = req.user?.uid || 'admin'; // Get admin ID from auth middleware
    
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { 
        isAvailable: false,
        isActive: false,
        disabledReason: reason || 'Disabled by admin',
        disabledBy: adminId,
        disabledAt: new Date()
      },
      { new: true, runValidators: true }
    );
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json({
      message: 'City disabled for purchase',
      city
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Toggle city availability
exports.toggleCityAvailability = async (req, res) => {
  try {
    const { reason } = req.body;
    const adminId = req.user?.uid || 'admin';
    
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    const newAvailability = !city.isAvailable;
    const updateData = {
      isAvailable: newAvailability,
      isActive: newAvailability
    };
    
    if (newAvailability) {
      // Enabling the city
      updateData.disabledReason = '';
      updateData.disabledBy = '';
      updateData.disabledAt = null;
    } else {
      // Disabling the city
      updateData.disabledReason = reason || 'Disabled by admin';
      updateData.disabledBy = adminId;
      updateData.disabledAt = new Date();
    }
    
    const updatedCity = await City.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: `City ${newAvailability ? 'enabled' : 'disabled'} for purchase`,
      city: updatedCity
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Check if a city is available for purchase
exports.checkCityAvailability = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    const isAvailable = city.isAvailable && city.isActive;
    
    res.status(200).json({
      cityId: city._id,
      name: city.name,
      isAvailable,
      reason: !isAvailable ? city.disabledReason : null,
      disabledBy: !isAvailable ? city.disabledBy : null,
      disabledAt: !isAvailable ? city.disabledAt : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 