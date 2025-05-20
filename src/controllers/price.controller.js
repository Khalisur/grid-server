const City = require('../models/city.model');
const Country = require('../models/country.model');

// Get base price from address
exports.getBasePrice = async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    // Convert address to lowercase for easier matching
    const addressLower = address.toLowerCase();

    // First try to find a matching city
    const cities = await City.find();
    const matchingCity = cities.find(city => {
      const cityNameLower = city.name.toLowerCase();
      return addressLower.includes(cityNameLower);
    });

    if (matchingCity) {
      return res.status(200).json({
        type: 'city',
        match: matchingCity.name,
        basePrice: matchingCity.value
      });
    }

    // If no city match, try to find a matching country
    const countries = await Country.find();
    const matchingCountry = countries.find(country => {
      const countryNameLower = country.name.toLowerCase();
      return addressLower.includes(countryNameLower);
    });

    if (matchingCountry) {
      return res.status(200).json({
        type: 'country',
        match: matchingCountry.name,
        basePrice: matchingCountry.value
      });
    }

    // If no matches found, return default base price
    return res.status(200).json({
      type: 'default',
      match: null,
      basePrice: 10
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 