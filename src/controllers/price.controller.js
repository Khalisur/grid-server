const City = require('../models/city.model');
const Country = require('../models/country.model');
const User = require('../models/user.model');

// Get base price from address
exports.getBasePrice = async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    // Check if user is admin (endpoint supports optional authentication)
    let isAdmin = false;
    let userInfo = null;
    
    if (req.user && req.user.uid) {
      const user = await User.findOne({ uid: req.user.uid });
      if (user) {
        isAdmin = user.isAdmin;
        userInfo = { uid: user.uid, name: user.name, isAdmin: user.isAdmin };
        console.log(`User ${req.user.uid} admin status: ${isAdmin}`);
      }
    } else {
      console.log('Price check request without authentication (public access)');
    }

    // Convert address to lowercase for easier matching
    const addressLower = address.toLowerCase();
    console.log('Address:', addressLower);

    // First try to find a matching city
    const cities = await City.find();
    const matchingCity = cities.find(city => {
      const cityNameLower = city.name.toLowerCase();
      return addressLower.includes(cityNameLower);
    });
    const countries = await Country.find();
    const matchingCountry = countries.find(country => {
      const countryNameLower = country.name.toLowerCase();
      return addressLower.includes(countryNameLower);
    });
    console.log('Matching country:', matchingCountry);

    if (matchingCity) {
      // Find the country that contains this city
      const cityCountry = countries.find(country => {
        const countryNameLower = country.name.toLowerCase();
        const cityNameLower = matchingCity.name.toLowerCase();
        // Check if the city's address or location is within this country
        return addressLower.includes(countryNameLower) || 
               (matchingCity.country && matchingCity.country.toLowerCase() === countryNameLower);
      });

      // If country is found and disabled, prevent purchase (unless admin)
      if (cityCountry && (!cityCountry.isAvailable || !cityCountry.isActive) && !isAdmin) {
        return res.status(403).json({
          message: 'Property purchases are currently disabled for this country',
          type: 'country',
          match: cityCountry.name,
          isAvailable: false,
          reason: cityCountry.disabledReason,
          disabledBy: cityCountry.disabledBy,
          disabledAt: cityCountry.disabledAt,
          note: `City ${matchingCity.name} is within disabled country ${cityCountry.name}`
        });
      }

      // Check if city is available for purchase (unless admin)
      const isAvailable = matchingCity.isAvailable && matchingCity.isActive;
      
      if (!isAvailable && !isAdmin) {
        return res.status(403).json({
          message: 'Property purchases are currently disabled for this city',
          type: 'city',
          match: matchingCity.name,
          isAvailable: false,
          reason: matchingCity.disabledReason,
          disabledBy: matchingCity.disabledBy,
          disabledAt: matchingCity.disabledAt
        });
      }
      
      const response = {
        type: 'city',
        match: matchingCity.name,
        basePrice: matchingCity.value,
        isAvailable: isAdmin ? true : isAvailable, // Always available for admins
      };

      // Add admin bypass info if applicable
      if (isAdmin && !isAvailable) {
        response.adminBypass = true;
        response.note = 'Admin user can purchase despite city being disabled';
        console.log(`Admin bypass enabled for disabled city: ${matchingCity.name}`);
      }

      return res.status(200).json(response);
    }

    // If no city match, try to find a matching country
    if (matchingCountry) {
      // Check if country is available for purchase (unless admin)
      const isAvailable = matchingCountry.isAvailable && matchingCountry.isActive;
      console.log('Matching country:', matchingCountry);
      
      if (!isAvailable && !isAdmin) {
        return res.status(403).json({
          message: 'Property purchases are currently disabled for this country',
          type: 'country',
          match: matchingCountry.name,
          isAvailable: false,
          reason: matchingCountry.disabledReason,
          disabledBy: matchingCountry.disabledBy,
          disabledAt: matchingCountry.disabledAt
        });
      }
      
      const response = {
        type: 'country',
        match: matchingCountry.name,
        basePrice: matchingCountry.value,
        isAvailable: isAdmin ? true : isAvailable, // Always available for admins
      };

      // Add admin bypass info if applicable
      if (isAdmin && !isAvailable) {
        response.adminBypass = true;
        response.note = 'Admin user can purchase despite country being disabled';
        console.log(`Admin bypass enabled for disabled country: ${matchingCountry.name}`);
      }

      return res.status(200).json(response);
    }

    // If no matches found, return default base price
    return res.status(200).json({
      type: 'default',
      match: null,
      basePrice: 10,
      isAvailable: true
    });

  } catch (error) {
    console.error('Error in getBasePrice:', error);
    res.status(500).json({ message: error.message });
  }
}; 