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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const testTreasurePurchase = async (adminToken, userToken) => {
  try {
    console.log('🧪 Testing Treasure Purchase Functionality');
    console.log('==========================================');
    
    if (!adminToken || !userToken) {
      console.log('❌ Usage: node src/scripts/test-treasure-purchase.js <admin_token> <user_token>');
      return;
    }

    // Step 1: Create a treasure (admin)
    console.log('\n1️⃣ Creating treasure...');
    const treasureData = {
      name: 'Test Gold',
      description: 'Test treasure for purchase testing',
      cells: ['test-treasure-1', 'test-treasure-2'],
      rewardType: 'tokens',
      rewardAmount: 100,
      rewardMessage: '🎉 Test treasure found!',
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
      console.log('❌ Failed to create treasure:', createTreasureResponse);
      return;
    }

    console.log('✅ Treasure created successfully');

    // Step 2: Test purchasing property WITHOUT treasure (regular purchase)
    console.log('\n2️⃣ Testing regular property purchase (no treasure)...');
    const regularPurchaseData = {
      cells: ['regular-cell-1', 'regular-cell-2'],
      price: 50,
      name: 'Regular Property'
    };

    const regularPurchaseResponse = await makeRequest(`${API_URL}/api/properties/unallocated/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(regularPurchaseData)
    });

    console.log('Regular purchase status:', regularPurchaseResponse.status);
    if (regularPurchaseResponse.status === 201) {
      console.log('✅ Regular purchase successful');
      console.log('Is treasure?', regularPurchaseResponse.data.isTreasure || false);
    } else {
      console.log('❌ Regular purchase failed:', regularPurchaseResponse.data);
    }

    // Step 3: Test purchasing property WITH treasure
    console.log('\n3️⃣ Testing treasure property purchase...');
    const treasurePurchaseData = {
      cells: ['test-treasure-1', 'other-cell-1'], // Contains treasure cell
      price: 75,
      name: 'Treasure Property'
    };

    const treasurePurchaseResponse = await makeRequest(`${API_URL}/api/properties/unallocated/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(treasurePurchaseData)
    });

    console.log('Treasure purchase status:', treasurePurchaseResponse.status);
    if (treasurePurchaseResponse.status === 201) {
      console.log('✅ Treasure purchase successful');
      console.log('Is treasure?', treasurePurchaseResponse.data.isTreasure || false);
      if (treasurePurchaseResponse.data.isTreasure) {
        console.log('🎉 Treasure found!');
        console.log('Treasure name:', treasurePurchaseResponse.data.treasure.name);
        console.log('Reward:', treasurePurchaseResponse.data.treasure.rewardAmount, treasurePurchaseResponse.data.treasure.rewardType);
        console.log('Overlapping cells:', treasurePurchaseResponse.data.treasure.overlappingCells);
      }
    } else {
      console.log('❌ Treasure purchase failed:', treasurePurchaseResponse.data);
    }

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log('✅ Treasure creation: Working');
    console.log('✅ Regular purchase: ' + (regularPurchaseResponse.status === 201 ? 'Working' : 'Failed'));
    console.log('✅ Treasure purchase: ' + (treasurePurchaseResponse.status === 201 ? 'Working' : 'Failed'));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Get tokens from command line
const adminToken = process.argv[2];
const userToken = process.argv[3];
testTreasurePurchase(adminToken, userToken); 