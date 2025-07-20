# Treasure System Guide

This guide explains the treasure feature where admins can create hidden treasures in specific grid cells, and users can discover them when purchasing properties that contain those cells.

## Overview

The treasure system allows administrators to:
1. **Create treasures** with specific grid cells
2. **Manage treasure rewards** and expiration dates
3. **Track treasure redemptions** and user discoveries

When users purchase properties (unallocated or from other users), the system automatically checks if their purchased cells overlap with any active treasure cells. If found, the user receives rewards and notifications.

## How It Works

### Admin Creates Treasure
1. Admin defines specific grid cells for the treasure
2. Admin sets reward type, amount, and message
3. System creates treasure record with those cells

### User Discovers Treasure
1. User purchases a property (unallocated or from another user)
2. System checks if purchased cells overlap with any treasure cells
3. If overlap found and treasure is active/unredeemed:
   - User receives reward (tokens, bonuses, etc.)
   - Treasure is marked as redeemed
   - User gets special notification

## Treasure Model

### Fields
- **name**: Display name for the treasure
- **description**: Description of what was found
- **cells**: Array of grid cell coordinates containing the treasure
- **rewardType**: Type of reward (`tokens`, `bonus_multiplier`, `special_item`, `discount`)
- **rewardAmount**: Amount of the reward
- **rewardMessage**: Custom message shown to user
- **isActive**: Whether treasure is currently active
- **isRedeemed**: Whether treasure has been fully redeemed
- **maxRedemptions**: How many times treasure can be redeemed (default: 1)
- **currentRedemptions**: Current number of redemptions
- **expiresAt**: Optional expiration date
- **createdBy**: Admin who created the treasure

### Reward Types
1. **tokens** - Adds tokens to user's account
2. **bonus_multiplier** - Future feature for purchase bonuses
3. **special_item** - Future feature for special items
4. **discount** - Future feature for purchase discounts

## API Endpoints

### Admin Endpoints (Requires Admin Authentication)

#### Create Treasure
```bash
POST /api/treasures
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json

{
  "name": "Golden Coins",
  "description": "A chest full of golden coins",
  "cells": ["1,1", "1,2", "1,3"],
  "rewardType": "tokens",
  "rewardAmount": 500,
  "rewardMessage": "🎉 You found a treasure chest!",
  "maxRedemptions": 1,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### Get All Treasures
```bash
GET /api/treasures
Authorization: Bearer <admin_firebase_token>

# Query parameters:
# ?status=active      - Only active treasures
# ?status=redeemed    - Only redeemed treasures
# ?status=inactive    - Only inactive treasures
# ?includeRedeemed=false - Exclude redeemed treasures
```

#### Get Treasure by ID
```bash
GET /api/treasures/:treasureId
Authorization: Bearer <admin_firebase_token>
```

#### Update Treasure
```bash
PUT /api/treasures/:treasureId
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "cells": ["1,1", "1,2", "1,3", "1,4"],
  "rewardAmount": 750,
  "isActive": true
}
```

#### Delete Treasure
```bash
DELETE /api/treasures/:treasureId
Authorization: Bearer <admin_firebase_token>
```

#### Toggle Treasure Status
```bash
PUT /api/treasures/:treasureId/toggle
Authorization: Bearer <admin_firebase_token>
```

## User Discovery Flow

### When User Purchases Property

The system automatically checks for treasures in these scenarios:

1. **Unallocated Property Purchase**
   ```bash
   POST /api/properties/unallocated/buy
   ```

2. **Property Purchase from Another User**
   ```bash
   POST /api/properties/:propertyId/buy
   ```

3. **Bid Acceptance** (when user wins property through bidding)
   ```bash
   POST /api/properties/:propertyId/accept-bid
   ```

### Response with Treasure Discovery

If a treasure is found, the purchase response includes:

```json
{
  "message": "Property purchased successfully - Treasure discovered!",
  "property": { ... },
  "isTreasure": true,
  "treasure": {
    "id": "treasure_id",
    "name": "Golden Coins",
    "description": "A chest full of golden coins",
    "rewardType": "tokens",
    "rewardAmount": 500,
    "rewardMessage": "🎉 You found a treasure chest with 500 golden coins!",
    "treasureCells": ["1,1", "1,2", "1,3"],
    "overlappingCells": ["1,2"]
  }
}
```

## Testing the System

### Prerequisites
1. Server running
2. Admin user configured
3. Firebase authentication working

### Test Commands

#### 1. Test Treasure Management
```bash
# Test treasure creation and management
npm run test-treasure <admin_firebase_token>
```

#### 2. Manual Testing Steps

1. **Create Admin User**
   ```bash
   npm run set-admin <user_uid>
   ```

2. **Create Treasure** (as admin)
   ```bash
   curl -X POST "http://localhost:5000/api/treasures" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Pirate Gold",
       "description": "A chest of pirate gold",
       "cells": ["treasure-1", "treasure-2", "treasure-3"],
       "rewardType": "tokens",
       "rewardAmount": 1000,
       "rewardMessage": "Ahoy! You found pirate gold!"
     }'
   ```

3. **Test Treasure Discovery** (as regular user)
   ```bash
   curl -X POST "http://localhost:5000/api/properties/unallocated/buy" \
     -H "Authorization: Bearer USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "cells": ["treasure-1"],
       "price": 50,
       "name": "My Property"
     }'
   ```

## Cell Overlap Logic

The system detects treasures using direct cell overlap:

1. **User purchases property** with cells: `["cell-a", "cell-b", "cell-c"]`
2. **Treasure exists** with cells: `["cell-b", "cell-d", "cell-e"]`
3. **Overlap detected**: `cell-b` exists in both
4. **Result**: Treasure discovered and redeemed

### Example Scenarios

#### Scenario 1: Direct Overlap
- **Treasure Cells**: `["1,1", "1,2", "1,3"]`
- **User Purchase**: `["1,2", "2,1"]`
- **Result**: ✅ Treasure found (cell "1,2" overlaps)

#### Scenario 2: No Overlap
- **Treasure Cells**: `["1,1", "1,2", "1,3"]`
- **User Purchase**: `["2,1", "2,2"]`
- **Result**: ❌ No treasure found

#### Scenario 3: Already Redeemed
- **Treasure Cells**: `["1,1", "1,2", "1,3"]`
- **User Purchase**: `["1,1"]`
- **Treasure Status**: `isRedeemed: true`
- **Result**: ❌ No treasure found (already redeemed)

#### Scenario 4: Multi-Use Treasure
- **Treasure Cells**: `["5,5", "5,6"]` with `maxRedemptions: 3`
- **First User**: Buys `["5,5"]` → ✅ Gets reward (currentRedemptions: 1)
- **Second User**: Buys `["5,6"]` → ✅ Gets reward (currentRedemptions: 2)
- **Third User**: Buys `["5,5", "5,6"]` → ✅ Gets reward (currentRedemptions: 3, isRedeemed: true)
- **Fourth User**: Buys `["5,5"]` → ❌ No reward (fully redeemed)

## Key Features

### Independent Grid Placement
- Treasures exist independently in the grid
- No need to create properties first
- Admins can place treasures anywhere on the grid

### Flexible Cell Coverage
- Single cell treasures: `["1,1"]`
- Multi-cell treasures: `["1,1", "1,2", "1,3", "2,1"]`
- Any cell configuration supported

### Cell Conflict Prevention
- Each cell can only contain one active treasure
- System prevents overlapping active treasures
- Inactive/redeemed treasures don't block new ones

### Multiple Discovery Methods
- Unallocated property purchase
- Property purchase from other users
- Winning properties through bidding

## Frontend Integration

### Checking for Treasures in Purchase Response

```javascript
const buyProperty = async (propertyData, userToken) => {
  try {
    const response = await fetch('/api/properties/unallocated/buy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(propertyData)
    });

    const data = await response.json();
    
    if (data.isTreasure) {
      // Show treasure discovery notification
      showTreasureNotification(data.treasure);
      
      // Update user's token balance
      updateUserTokens(data.treasure.rewardAmount);
      
      // Log treasure discovery details
      console.log('🎉 Treasure discovered!', data.treasure);
      console.log('Found in cells:', data.treasure.overlappingCells);
      console.log('Treasure spans cells:', data.treasure.treasureCells);
    }
    
    return data;
  } catch (error) {
    console.error('Purchase error:', error);
  }
};

const showTreasureNotification = (treasure) => {
  // Show exciting notification to user
  alert(`🎉 ${treasure.rewardMessage}\n\nYou received ${treasure.rewardAmount} ${treasure.rewardType}!`);
  
  // Could also show which cells contained the treasure
  console.log(`Treasure found in: ${treasure.overlappingCells.join(', ')}`);
  
  // Could also trigger:
  // - Confetti animation
  // - Sound effects
  // - Treasure chest opening animation
  // - Grid highlighting of treasure cells
};
```

### Admin Treasure Management

```javascript
const createTreasure = async (treasureData, adminToken) => {
  const response = await fetch('/api/treasures', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(treasureData)
  });
  
  return response.json();
};

const getTreasures = async (adminToken, filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/treasures?${params}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  return response.json();
};

// Example: Create treasure in specific grid area
const createGridTreasure = async (adminToken) => {
  const treasureData = {
    name: 'Diamond Cache',
    description: 'A hidden cache of diamonds',
    cells: ['100,100', '100,101', '101,100', '101,101'], // 2x2 area
    rewardType: 'tokens',
    rewardAmount: 2000,
    rewardMessage: '💎 You found a diamond cache!',
    maxRedemptions: 1
  };
  
  return createTreasure(treasureData, adminToken);
};
```

## Security Considerations

1. **Admin Only Creation**: Only authenticated admin users can create/manage treasures
2. **Cell Conflict Prevention**: System prevents overlapping active treasures
3. **Single Redemption Control**: Treasures track redemptions to prevent duplicates
4. **Transaction Safety**: Treasure rewards are applied within database transactions
5. **Audit Trail**: All treasure creation/redemption is logged with user IDs and timestamps

## Database Indexes

The treasure system includes optimized database indexes:

```javascript
// Treasure collection indexes
treasureSchema.index({ cells: 1 });                   // Fast cell lookup
treasureSchema.index({ isActive: 1, isRedeemed: 1 }); // Fast active treasure queries
treasureSchema.index({ expiresAt: 1 });               // Fast expiration cleanup
```

## Best Practices

### For Admins
1. **Strategic Placement**: Place treasures in areas likely to be purchased
2. **Balanced Rewards**: Set appropriate reward amounts for game economy
3. **Clear Cells**: Use clear, consistent cell naming conventions
4. **Avoid Overlaps**: Don't create conflicting active treasures
5. **Monitor Grid**: Track which areas have treasures vs. regular activity

### For Frontend Developers
1. **Handle Gracefully**: Always check for `isTreasure` flag in purchase responses
2. **Show Details**: Display both overlapping cells and full treasure area
3. **Grid Visualization**: Consider showing treasure areas on grid maps
4. **Multiple Treasures**: Handle cases where multiple treasures might be in one purchase
5. **Performance**: Cache treasure locations for faster UI updates

## Troubleshooting

### "Cells must be a non-empty array" Error
- Ensure cells array is provided and contains at least one cell
- Validate cell format matches your grid coordinate system

### "Some cells already have active treasures" Error
- Check if any cells overlap with existing active treasures
- Deactivate or delete conflicting treasures first

### "Treasure not detected" Issues
- Verify exact cell overlap between purchased and treasure cells
- Check treasure is active and not expired
- Ensure treasure hasn't reached max redemptions

### Performance Issues
- Database indexes should handle cell queries efficiently
- Consider limiting treasure cell array sizes for very large treasures
- Monitor treasure check performance on high-traffic purchases

## Future Enhancements

Potential future features:
1. **Treasure Shapes**: Predefined shapes (squares, circles, lines) for easier placement
2. **Treasure Density Maps**: Visual admin tools showing treasure distribution
3. **Dynamic Treasures**: Treasures that move or change over time
4. **Treasure Chains**: Sequential treasures that unlock others
5. **User Treasure History**: Track all treasures found by each user
6. **Treasure Categories**: Different rarities (common, rare, legendary)
7. **Proximity Hints**: Clues when users are near undiscovered treasures
8. **Treasure Insurance**: Option to "guarantee" treasure discovery in certain areas 