const { DateTime } = require('luxon');

/**
 * Convert cell string format to longitude/latitude coordinates
 * @param {string} cell - Cell in format "-740111,577507"
 * @returns {Object} - { longitude, latitude }
 */
const cellToCoordinates = (cell) => {
  const [x, y] = cell.split(',').map(Number);
  // Convert from grid coordinates to actual longitude/latitude
  // This is a simplified example - adjust calculation based on your actual grid system
  const longitude = x / 10000;
  const latitude = y / 10000;
  
  return { longitude, latitude };
};

/**
 * Determine location information from cell coordinates
 * @param {Array<string>} cells - Array of cell coordinates strings
 * @returns {Object} - Location information including city, country, and timezone
 */
const determineLocationFromCells = (cells) => {
  if (!cells || cells.length === 0) {
    throw new Error('No cells provided');
  }
  
  // Calculate the center point of all cells
  const coordinates = cells.map(cellToCoordinates);
  const totalCoords = coordinates.reduce(
    (acc, coord) => ({
      longitude: acc.longitude + coord.longitude,
      latitude: acc.latitude + coord.latitude
    }),
    { longitude: 0, latitude: 0 }
  );
  
  const centerPoint = {
    longitude: totalCoords.longitude / coordinates.length,
    latitude: totalCoords.latitude / coordinates.length
  };
  
  // Mock implementation - in a real application, you would use a geocoding service
  // to determine city, country, and timezone based on the coordinates
  
  // Example implementation - replace with actual geocoding logic
  let city, country, timezone;
  
  // Simple longitude-based mock determination (replace with actual geocoding)
  if (centerPoint.longitude < -70) {
    city = 'New York City';
    country = 'USA';
    timezone = 'America/New_York';
  } else if (centerPoint.longitude < -5) {
    city = 'London';
    country = 'UK';
    timezone = 'Europe/London';
  } else if (centerPoint.longitude < 15) {
    city = 'Paris';
    country = 'France';
    timezone = 'Europe/Paris';
  } else if (centerPoint.longitude < 40) {
    city = 'Moscow';
    country = 'Russia';
    timezone = 'Europe/Moscow';
  } else if (centerPoint.longitude < 100) {
    city = 'Dubai';
    country = 'UAE';
    timezone = 'Asia/Dubai';
  } else if (centerPoint.longitude < 140) {
    city = 'Tokyo';
    country = 'Japan';
    timezone = 'Asia/Tokyo';
  } else {
    city = 'Sydney';
    country = 'Australia';
    timezone = 'Australia/Sydney';
  }
  
  // Get current time in the determined timezone
  const currentTime = DateTime.now().setZone(timezone).toISO();
  
  return {
    city,
    country,
    timezone,
    coordinates: centerPoint,
    currentTime
  };
};

/**
 * Calculate base price for a property based on its location
 * @param {Object} locationInfo - Location information
 * @param {number} cellCount - Number of cells in the property
 * @returns {Object} - Price calculation result
 */
const calculateBasePrice = (locationInfo, cellCount) => {
  if (!locationInfo || !locationInfo.country) {
    throw new Error('Valid location information required');
  }
  
  if (!cellCount || cellCount <= 0) {
    throw new Error('Valid cell count required');
  }
  
  // Basic calculation - price based on number of cells
  let basePrice = cellCount * 10; // 10 tokens per cell as base price
  
  // Apply location-based multipliers
  let locationMultiplier = 1.0;
  
  switch (locationInfo.country) {
    case 'USA':
      locationMultiplier = 1.5;
      break;
    case 'UK':
      locationMultiplier = 1.3;
      break;
    case 'France':
      locationMultiplier = 1.2;
      break;
    case 'Japan':
      locationMultiplier = 1.4;
      break;
    case 'Australia':
      locationMultiplier = 1.25;
      break;
    default:
      locationMultiplier = 1.0;
  }
  
  // Calculate final price
  const finalPrice = Math.round(basePrice * locationMultiplier);
  
  return {
    basePrice,
    locationMultiplier,
    finalPrice
  };
};

module.exports = {
  cellToCoordinates,
  determineLocationFromCells,
  calculateBasePrice
}; 