# City and Country Availability Control System

## Overview

This system allows administrators to control which cities and countries are available for property purchases. When a city or country is disabled, users cannot purchase properties from that location.

## Features

### 1. **Availability Fields**
Each city and country now has the following availability control fields:
- `isAvailable`: Boolean indicating if location is available for purchase
- `isActive`: Boolean indicating if location is active
- `disabledReason`: String explaining why location was disabled
- `disabledBy`: ID of admin who disabled the location
- `disabledAt`: Timestamp of when location was disabled

### 2. **Admin Controls**
- Enable/disable cities and countries
- Toggle availability status
- Add reasons for disabling locations
- Track who disabled locations and when

### 3. **Purchase Protection**
- Price API checks availability before returning pricing
- Property purchase endpoints validate availability
- Clear error messages for disabled locations

## API Endpoints

### City Management

#### Public Endpoints
```
GET /api/cities/                    # Get all cities
GET /api/cities/available           # Get only available cities
GET /api/cities/:id                 # Get specific city
GET /api/cities/:id/availability    # Check city availability
```

#### Admin Endpoints (Requires Authentication + Admin Role)
```
POST /api/cities/                   # Create new city
PUT /api/cities/:id                 # Update city
DELETE /api/cities/:id              # Delete city
PUT /api/cities/:id/enable          # Enable city for purchase
PUT /api/cities/:id/disable         # Disable city for purchase
PUT /api/cities/:id/toggle          # Toggle city availability
```

### Country Management

#### Public Endpoints
```
GET /api/countries/                 # Get all countries
GET /api/countries/available        # Get only available countries
GET /api/countries/:id              # Get specific country
GET /api/countries/:id/availability # Check country availability
```

#### Admin Endpoints (Requires Authentication + Admin Role)
```
POST /api/countries/                # Create new country
PUT /api/countries/:id              # Update country
DELETE /api/countries/:id           # Delete country
PUT /api/countries/:id/enable       # Enable country for purchase
PUT /api/countries/:id/disable      # Disable country for purchase
PUT /api/countries/:id/toggle       # Toggle country availability
```

## Usage Examples

### 1. Disable a City

```bash
curl -X PUT "http://localhost:3000/api/cities/CITY_ID/disable" \
  -H "Firebase-UID: YOUR_ADMIN_UID" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Maintenance in progress"}'
```

**Response:**
```json
{
  "message": "City disabled for purchase",
  "city": {
    "_id": "CITY_ID",
    "name": "New York",
    "value": 100,
    "isAvailable": false,
    "isActive": false,
    "disabledReason": "Maintenance in progress",
    "disabledBy": "admin_uid_123",
    "disabledAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Enable a City

```bash
curl -X PUT "http://localhost:3000/api/cities/CITY_ID/enable" \
  -H "Firebase-UID: YOUR_ADMIN_UID"
```

**Response:**
```json
{
  "message": "City enabled for purchase",
  "city": {
    "_id": "CITY_ID",
    "name": "New York",
    "value": 100,
    "isAvailable": true,
    "isActive": true,
    "disabledReason": "",
    "disabledBy": "",
    "disabledAt": null
  }
}
```

### 3. Check Availability

```bash
curl -X GET "http://localhost:3000/api/cities/CITY_ID/availability"
```

**Response (Available):**
```json
{
  "cityId": "CITY_ID",
  "name": "New York",
  "isAvailable": true,
  "reason": null,
  "disabledBy": null,
  "disabledAt": null
}
```

**Response (Disabled):**
```json
{
  "cityId": "CITY_ID",
  "name": "New York",
  "isAvailable": false,
  "reason": "Maintenance in progress",
  "disabledBy": "admin_uid_123",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

### 4. Get Available Cities Only

```bash
curl -X GET "http://localhost:3000/api/cities/available"
```

**Response:**
```json
[
  {
    "_id": "CITY_ID_1",
    "name": "Los Angeles",
    "value": 80,
    "isAvailable": true,
    "isActive": true
  },
  {
    "_id": "CITY_ID_2",
    "name": "Chicago",
    "value": 60,
    "isAvailable": true,
    "isActive": true
  }
]
```

## Purchase Flow Integration

### 1. Price Check
When users check property prices, the system automatically validates location availability:

```bash
curl -X POST "http://localhost:3000/api/prices/calculate" \
  -H "Content-Type: application/json" \
  -d '{"address": "New York, NY, USA"}'
```

**Response (Available):**
```json
{
  "type": "city",
  "match": "New York",
  "basePrice": 100,
  "isAvailable": true
}
```

**Response (Disabled):**
```json
{
  "message": "Property purchases are currently disabled for this city",
  "type": "city",
  "match": "New York",
  "isAvailable": false,
  "reason": "Maintenance in progress",
  "disabledBy": "admin_uid_123",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Property Purchase
When users attempt to purchase properties, the system validates availability:

```bash
curl -X POST "http://localhost:3000/api/properties/unallocated/buy" \
  -H "Firebase-UID: USER_UID" \
  -H "Content-Type: application/json" \
  -d '{
    "cells": ["1,1", "1,2"],
    "price": 200,
    "address": "New York, NY, USA"
  }'
```

**Response (Disabled Location):**
```json
{
  "message": "Property purchases are currently disabled for this city",
  "location": "New York",
  "reason": "Maintenance in progress",
  "disabledBy": "admin_uid_123",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

## Admin Setup

### 1. Environment Configuration
Add admin UIDs to your `.env` file:
```
ADMIN_UIDS=admin_uid_1,admin_uid_2,admin_uid_3
```

### 2. Development Mode
If no admin UIDs are configured and `NODE_ENV` is not 'production', all authenticated users have admin access (with a warning).

### 3. Production Mode
In production, you must configure `ADMIN_UIDS` or admin routes will be blocked.

## Error Handling

### Authentication Errors
```json
{
  "message": "Authentication required"
}
```

### Authorization Errors
```json
{
  "message": "Access denied. Admin privileges required.",
  "userUid": "user_uid_123"
}
```

### Availability Errors
```json
{
  "message": "Property purchases are currently disabled for this city",
  "location": "New York",
  "reason": "Maintenance in progress",
  "disabledBy": "admin_uid_123",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

## Frontend Integration

### 1. Check Availability Before Purchase
```javascript
// Check if location is available before showing purchase options
const checkAvailability = async (cityId) => {
  try {
    const response = await fetch(`/api/cities/${cityId}/availability`);
    const data = await response.json();
    
    if (!data.isAvailable) {
      alert(`Purchases disabled: ${data.reason}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
};
```

### 2. Handle Purchase Errors
```javascript
// Handle availability errors during purchase
const handlePurchase = async (purchaseData) => {
  try {
    const response = await fetch('/api/properties/unallocated/buy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Firebase-UID': userUid
      },
      body: JSON.stringify(purchaseData)
    });
    
    const data = await response.json();
    
    if (response.status === 403) {
      // Location is disabled
      alert(`Purchase blocked: ${data.message}`);
      return;
    }
    
    // Handle successful purchase
    console.log('Purchase successful:', data);
  } catch (error) {
    console.error('Purchase error:', error);
  }
};
```

### 3. Admin Panel Integration
```javascript
// Admin function to toggle city availability
const toggleCityAvailability = async (cityId, reason = '') => {
  try {
    const response = await fetch(`/api/cities/${cityId}/toggle`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Firebase-UID': adminUid
      },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    console.log('City availability toggled:', data);
    
    // Refresh city list
    await fetchCities();
  } catch (error) {
    console.error('Error toggling availability:', error);
  }
};
```

## Database Schema

### City Model
```javascript
{
  name: String,           // City name
  value: Number,          // Base price
  isAvailable: Boolean,   // Available for purchase
  isActive: Boolean,      // Active status
  disabledReason: String, // Reason for disabling
  disabledBy: String,     // Admin who disabled
  disabledAt: Date,       // When disabled
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

### Country Model
```javascript
{
  name: String,           // Country name
  value: Number,          // Base price
  isAvailable: Boolean,   // Available for purchase
  isActive: Boolean,      // Active status
  disabledReason: String, // Reason for disabling
  disabledBy: String,     // Admin who disabled
  disabledAt: Date,       // When disabled
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

## Security Considerations

1. **Admin Authentication**: All admin routes require Firebase authentication
2. **Role-based Access**: Admin middleware checks for admin privileges
3. **Environment Variables**: Admin UIDs stored securely in environment variables
4. **Audit Trail**: All disable/enable actions are logged with admin ID and timestamp
5. **Input Validation**: All inputs are validated before processing

## Testing

### Test Admin Functions
```javascript
// Test suite for availability controls
describe('City Availability Control', () => {
  test('should disable city for purchase', async () => {
    const response = await request(app)
      .put(`/api/cities/${cityId}/disable`)
      .set('Firebase-UID', adminUid)
      .send({ reason: 'Testing' });
    
    expect(response.status).toBe(200);
    expect(response.body.city.isAvailable).toBe(false);
  });
  
  test('should block purchase from disabled city', async () => {
    const response = await request(app)
      .post('/api/properties/unallocated/buy')
      .set('Firebase-UID', userUid)
      .send({
        cells: ['1,1'],
        price: 100,
        address: 'DisabledCity'
      });
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('disabled');
  });
});
```

This system provides comprehensive control over property purchases while maintaining security and audit capabilities. 