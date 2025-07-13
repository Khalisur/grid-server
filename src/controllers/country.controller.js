const Country = require('../models/country.model');

// Create a new country
exports.createCountry = async (req, res) => {
  try {
    const { name, value } = req.body;
    const country = new Country({ name, value });
    await country.save();
    res.status(201).json(country);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all countries
exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find();
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get only available countries for purchase
exports.getAvailableCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isAvailable: true, isActive: true });
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single country by ID
exports.getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a country
exports.updateCountry = async (req, res) => {
  try {
    const { name, value } = req.body;
    const country = await Country.findByIdAndUpdate(
      req.params.id,
      { name, value },
      { new: true, runValidators: true }
    );
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a country
exports.deleteCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json({ message: 'Country deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Enable country for purchase
exports.enableCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(
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
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json({
      message: 'Country enabled for purchase',
      country
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Disable country for purchase
exports.disableCountry = async (req, res) => {
  try {
    const { reason } = req.body;
    const adminId = req.user?.uid || 'admin'; // Get admin ID from auth middleware
    
    const country = await Country.findByIdAndUpdate(
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
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json({
      message: 'Country disabled for purchase',
      country
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Toggle country availability
exports.toggleCountryAvailability = async (req, res) => {
  try {
    const { reason } = req.body;
    const adminId = req.user?.uid || 'admin';
    
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    const newAvailability = !country.isAvailable;
    const updateData = {
      isAvailable: newAvailability,
      isActive: newAvailability
    };
    
    if (newAvailability) {
      // Enabling the country
      updateData.disabledReason = '';
      updateData.disabledBy = '';
      updateData.disabledAt = null;
    } else {
      // Disabling the country
      updateData.disabledReason = reason || 'Disabled by admin';
      updateData.disabledBy = adminId;
      updateData.disabledAt = new Date();
    }
    
    const updatedCountry = await Country.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: `Country ${newAvailability ? 'enabled' : 'disabled'} for purchase`,
      country: updatedCountry
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Check if a country is available for purchase
exports.checkCountryAvailability = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    const isAvailable = country.isAvailable && country.isActive;
    
    res.status(200).json({
      countryId: country._id,
      name: country.name,
      isAvailable,
      reason: !isAvailable ? country.disabledReason : null,
      disabledBy: !isAvailable ? country.disabledBy : null,
      disabledAt: !isAvailable ? country.disabledAt : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 