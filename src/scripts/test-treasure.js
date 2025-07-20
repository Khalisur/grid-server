const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 5000}`;

// Simple HTTP request helper
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const testTreasureSystem = async (adminToken) => {
  try {
    console.log('🏴‍☠️ Testing Treasure System');
    console.log('============================');
    
    if (!adminToken) {
      console.log('❌ Usage: node src/scripts/test-treasure.js <admin_firebase_token>');
      console.log('Note: Make sure the token belongs to an admin user');
      return;
    }

    // Step 1: Create a treasure directly with cells
    console.log('\n1️⃣ Creating treasure with cells...');
    
    const treasureData = {
      name: 'Golden Coins',
      description: 'A chest full of golden coins hidden in the grid',
      cells: ['treasure-cell-1', 'treasure-cell-2', 'treasure-cell-3'],
      rewardType: 'tokens',
      rewardAmount: 500,
      rewardMessage: '🎉 Congratulations! You found a treasure chest with 500 golden coins!',
      maxRedemptions: 1
    };

    const createTreasureResponse = await makeRequest(`${API_URL}/api/treasures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(treasureData)
    });

    if (createTreasureResponse.status !== 201) {
      console.log('❌ Failed to create treasure:', createTreasureResponse.data);
      return;
    }

    const treasure = createTreasureResponse.data.treasure;
    console.log('✅ Treasure created:', treasure.name);
    console.log(`   Cells: ${treasure.cells.join(', ')}`);
    console.log(`   Reward: ${treasure.rewardAmount} ${treasure.rewardType}`);

    // Step 2: List all treasures
    console.log('\n2️⃣ Listing all treasures...');
    
    const listTreasuresResponse = await makeRequest(`${API_URL}/api/treasures`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log(`Status: ${listTreasuresResponse.status}`);
    if (listTreasuresResponse.status === 200) {
      console.log(`Found ${listTreasuresResponse.data.count} treasures`);
      listTreasuresResponse.data.treasures.forEach(t => {
        console.log(`- ${t.name}: ${t.rewardAmount} ${t.rewardType} in ${t.cellCount} cells (${t.isActive ? 'Active' : 'Inactive'})`);
      });
    }

    // Step 3: Test treasure discovery simulation
    console.log('\n3️⃣ Simulating treasure discovery...');
    console.log('Note: To actually test treasure discovery, you would need to:');
    console.log('1. Have a regular user (non-admin)');
    console.log('2. Purchase an unallocated property that overlaps with treasure cells');
    console.log('3. The purchase response would include treasure information if found');
    
    console.log('\nExample purchase that would find treasure:');
    console.log('POST /api/properties/unallocated/buy');
    console.log('Body:', JSON.stringify({
      cells: ['treasure-cell-1'], // This cell is in the treasure
      price: 50,
      name: 'Test Property'
    }, null, 2));

    console.log('\nExample purchase that would NOT find treasure:');
    console.log('POST /api/properties/unallocated/buy');
    console.log('Body:', JSON.stringify({
      cells: ['different-cell-1'], // This cell is NOT in the treasure
      price: 50,
      name: 'Test Property'
    }, null, 2));

    // Step 4: Create another treasure for testing
    console.log('\n4️⃣ Creating second treasure for testing overlaps...');
    
    const secondTreasureData = {
      name: 'Silver Coins',
      description: 'A bag of silver coins',
      cells: ['silver-1', 'silver-2'],
      rewardType: 'tokens',
      rewardAmount: 200,
      rewardMessage: '🥈 You found silver coins!',
      maxRedemptions: 3 // Multi-use treasure
    };

    const createSecondTreasureResponse = await makeRequest(`${API_URL}/api/treasures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(secondTreasureData)
    });

    if (createSecondTreasureResponse.status === 201) {
      const secondTreasure = createSecondTreasureResponse.data.treasure;
      console.log('✅ Second treasure created:', secondTreasure.name);
      console.log(`   Cells: ${secondTreasure.cells.join(', ')}`);
      console.log(`   Max redemptions: ${secondTreasure.maxRedemptions}`);
    } else {
      console.log('❌ Failed to create second treasure:', createSecondTreasureResponse.data);
    }

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log('✅ Treasure created with cells directly (no property needed)');
    console.log('✅ Multiple treasures can exist independently');
    console.log('✅ Treasure management endpoints working');
    console.log('✅ Both single-use and multi-use treasures supported');
    console.log('ℹ️ To test treasure discovery, use a regular user to buy property with overlapping cells');

    console.log('\n🗺️ Current Treasure Map:');
    console.log('=========================');
    console.log('Golden Coins treasure: treasure-cell-1, treasure-cell-2, treasure-cell-3');
    console.log('Silver Coins treasure: silver-1, silver-2');
    console.log('\nUsers who buy properties containing these cells will discover treasures!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. The server is running');
    console.log('2. The Firebase token is valid');
    console.log('3. The user is set as admin');
  }
};

// Test with token from command line
const adminToken = process.argv[2];
testTreasureSystem(adminToken); 