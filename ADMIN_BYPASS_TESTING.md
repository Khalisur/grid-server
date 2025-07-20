# Admin Bypass Testing Guide

This guide explains how to test the admin bypass functionality for property purchases and trading.

## Overview

Admins can purchase unallocated properties even when cities or countries are disabled for regular users. However, when those properties are later traded, location restrictions still apply to regular users. The system includes:

1. **Price API bypass** - Admins get pricing for disabled locations
2. **Unallocated property purchase bypass** - Admins can buy unallocated properties in disabled locations
3. **Property trading restrictions** - Regular users cannot buy/bid on properties in disabled locations
4. **Bid acceptance restrictions** - Property owners cannot accept bids from regular users for properties in disabled locations

## Property Trading Rules

### Admin Purchases Unallocated Property
✅ **Admin**: Can purchase unallocated properties anywhere (bypasses restrictions)
❌ **Regular User**: Blocked from purchasing in disabled locations

### Admin Lists Property for Sale
✅ **Admin Buyer**: Can purchase from admin (bypasses restrictions)
❌ **Regular User**: Blocked from purchasing properties in disabled locations

### Bidding System
✅ **Admin**: Can bid on any property (bypasses restrictions)
❌ **Regular User**: Cannot bid on properties in disabled locations
❌ **Property Owner**: Cannot accept bids from regular users for properties in disabled locations

## Prerequisites

1. Server running on localhost
2. At least one user in the database
3. Firebase authentication token for testing

## Setup Steps

### 1. Set a User as Admin

```bash
# First, get a user UID from your database or frontend
npm run set-admin <user_uid>

# Example:
npm run set-admin d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

### 2. Disable a City or Country (Optional)

To test the bypass functionality, you can disable a location using admin endpoints:

```bash
# Disable a city (requires admin authentication)
curl -X PUT "http://localhost:5000/api/cities/:cityId/disable" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"reason": "Testing admin bypass"}'
```

### 3. Test Admin Bypass

```bash
# Test with a Firebase token from an admin user
npm run test-admin YOUR_FIREBASE_TOKEN

# Test with specific address
npm run test-admin YOUR_FIREBASE_TOKEN "New York"
```

## Testing Scenarios

### Scenario 1: Available Location
- **Admin user**: Gets normal pricing, no bypass needed
- **Public user**: Gets normal pricing
- **Result**: Both work normally

### Scenario 2: Disabled Location
- **Admin user**: Gets pricing with `adminBypass: true` flag
- **Public user**: Gets 403 error with details about why it's disabled
- **Result**: Admin can proceed, public user is blocked

### Scenario 3: Admin Property Listed for Sale in Disabled Location
- **Admin buyer**: Can purchase (bypasses restrictions)
- **Regular user**: Cannot purchase (blocked by location restrictions)
- **Result**: Only admin users can buy properties in disabled locations

### Scenario 4: Bidding on Properties in Disabled Locations
- **Admin bidder**: Can place bids (bypasses restrictions)
- **Regular bidder**: Cannot place bids (blocked by location restrictions)
- **Property owner**: Cannot accept bids from regular users (location restrictions apply)

## API Endpoints for Testing

### Price Check (Public + Optional Auth)
```bash
# Public request
curl -X POST "http://localhost:5000/api/price/calculate" \
  -H "Content-Type: application/json" \
  -d '{"address": "New York"}'

# Admin request
curl -X POST "http://localhost:5000/api/price/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"address": "New York"}'
```

### Unallocated Property Purchase (Requires Auth)
```bash
curl -X POST "http://localhost:5000/api/properties/unallocated/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "cells": ["test-cell-1", "test-cell-2"],
    "price": 100,
    "address": "New York, NY, USA",
    "name": "Test Property"
  }'
```

### Buy Property from Another User (Requires Auth)
```bash
curl -X POST "http://localhost:5000/api/properties/:propertyId/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Place Bid on Property (Requires Auth)
```bash
curl -X POST "http://localhost:5000/api/properties/:propertyId/bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "amount": 150,
    "message": "Interested in this property"
  }'
```

### Accept Bid (Requires Auth - Property Owner)
```bash
curl -X POST "http://localhost:5000/api/properties/:propertyId/accept-bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "bidUserId": "bidder_uid"
  }'
```

## Expected Responses

### Admin Price Response (Disabled Location)
```json
{
  "type": "city",
  "match": "New York",
  "basePrice": 100,
  "isAvailable": true,
  "adminBypass": true,
  "note": "Admin user can purchase despite city being disabled"
}
```

### Public Price Response (Disabled Location)
```json
{
  "message": "Property purchases are currently disabled for this city",
  "type": "city",
  "match": "New York",
  "isAvailable": false,
  "reason": "Testing admin bypass",
  "disabledBy": "admin_uid",
  "disabledAt": "2024-01-01T00:00:00.000Z"
}
```

### Admin Purchase Response (Disabled Location)
```json
{
  "message": "Unallocated property purchased successfully (admin bypass)",
  "property": { ... },
  "adminBypass": true
}
```

### Regular User Blocked from Property Purchase (Disabled Location)
```json
{
  "message": "Property purchases are currently disabled for this city",
  "location": "New York",
  "reason": "Testing admin bypass",
  "disabledBy": "admin_uid",
  "disabledAt": "2024-01-01T00:00:00.000Z",
  "propertyId": "property123",
  "propertyName": "Admin's Property"
}
```

### Regular User Blocked from Bidding (Disabled Location)
```json
{
  "message": "Cannot place bid: Property purchases are currently disabled for this city",
  "location": "New York",
  "reason": "Testing admin bypass",
  "disabledBy": "admin_uid",
  "disabledAt": "2024-01-01T00:00:00.000Z",
  "propertyId": "property123",
  "propertyName": "Admin's Property"
}
```

### Bid Acceptance Blocked (Regular User Bidder, Disabled Location)
```json
{
  "message": "Cannot accept bid: Property purchases are currently disabled for this city",
  "location": "New York",
  "reason": "Testing admin bypass",
  "disabledBy": "admin_uid",
  "disabledAt": "2024-01-01T00:00:00.000Z",
  "propertyId": "property123",
  "propertyName": "Admin's Property",
  "bidderInfo": "Bidder John Doe cannot purchase properties in disabled locations"
}
```

## Troubleshooting

### "User not found" Error
- Make sure the user exists in your database
- Check the Firebase UID is correct

### "Admin bypass not working"
- Verify user is set as admin: check `isAdmin: true` in database
- Ensure Firebase token is valid and belongs to the admin user
- Check server logs for authentication errors

### "Authentication failed"
- Firebase token might be expired
- Check Firebase configuration in your backend
- Verify the token format: `Bearer <token>`

### "Cannot place bid" or "Cannot buy property"
- Check if the property is in a disabled location
- Verify the user's admin status
- Check if the city/country is marked as `isAvailable: false`

## Complete Testing Workflow

### 1. Setup Test Environment
```bash
# Set user as admin
npm run set-admin <admin_user_uid>

# Disable a test city (optional)
curl -X PUT "http://localhost:5000/api/cities/:cityId/disable" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"reason": "Testing"}'
```

### 2. Test Admin Unallocated Purchase
```bash
# Admin can buy in disabled location
curl -X POST "http://localhost:5000/api/properties/unallocated/buy" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"cells":["test"],"price":100,"address":"Disabled City"}'
```

### 3. Test Regular User Restrictions
```bash
# Regular user blocked from disabled location
curl -X POST "http://localhost:5000/api/properties/unallocated/buy" \
  -H "Authorization: Bearer REGULAR_TOKEN" \
  -d '{"cells":["test2"],"price":100,"address":"Disabled City"}'

# Should return 403 error
```

### 4. Test Property Trading Restrictions
```bash
# Admin lists property for sale
curl -X PUT "http://localhost:5000/api/properties/:propertyId" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"forSale":true,"salePrice":150}'

# Regular user tries to buy - should be blocked
curl -X POST "http://localhost:5000/api/properties/:propertyId/buy" \
  -H "Authorization: Bearer REGULAR_TOKEN"

# Should return 403 error with location restriction details
```

## Frontend Integration

When implementing in your frontend, check for location restrictions in all property interactions:

```javascript
const handlePropertyPurchase = async (propertyId, userToken) => {
  try {
    const response = await fetch(`/api/properties/${propertyId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const data = await response.json();
    
    if (response.status === 403) {
      // Handle location restriction
      alert(`Purchase blocked: ${data.message}`);
      console.log('Restricted location:', data.location);
      console.log('Reason:', data.reason);
      return;
    }
    
    // Handle successful purchase
    console.log('Purchase successful:', data);
  } catch (error) {
    console.error('Purchase error:', error);
  }
};

const handleBidPlacement = async (propertyId, amount, userToken) => {
  try {
    const response = await fetch(`/api/properties/${propertyId}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();
    
    if (response.status === 403) {
      // Handle location restriction for bidding
      alert(`Bidding blocked: ${data.message}`);
      return;
    }
    
    // Handle successful bid
    console.log('Bid placed:', data);
  } catch (error) {
    console.error('Bidding error:', error);
  }
};
```

## Security Notes

- Admin bypass only works for authenticated admin users
- Regular users are blocked from all property transactions in disabled locations
- Property owners cannot accept bids from regular users for properties in disabled locations
- All admin actions are logged with user ID and timestamp
- The `isAdmin` field in the user model controls access
- Location restrictions apply to: unallocated purchases, property sales, bidding, and bid acceptance 