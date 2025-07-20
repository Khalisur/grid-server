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

const testAdminBypass = async (adminToken, testAddress = 'New York') => {
  try {
    console.log('🧪 Testing Admin Bypass Functionality');
    console.log('=====================================');
    
    if (!adminToken) {
      console.log('❌ Usage: node src/scripts/test-admin-bypass.js <firebase_token>');
      console.log('Note: Make sure the user associated with the token is set as admin');
      console.log('Example: node src/scripts/test-admin-bypass.js your_firebase_token');
      return;
    }

    // Test 1: Price check as admin
    console.log('\n1️⃣ Testing price check as admin...');
    
    const priceResponse = await makeRequest(`${API_URL}/api/price/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        address: testAddress
      })
    });

    console.log(`Status: ${priceResponse.status}`);
    console.log('Response:', JSON.stringify(priceResponse.data, null, 2));

    if (priceResponse.data.adminBypass) {
      console.log('✅ Admin bypass working for price check!');
    } else if (priceResponse.data.isAvailable) {
      console.log('ℹ️ Location is available (no bypass needed)');
    } else if (priceResponse.status !== 200) {
      console.log('❌ Admin bypass not working for price check');
    }

    // Test 2: Price check without authentication (public)
    console.log('\n2️⃣ Testing price check as public user...');
    
    const publicPriceResponse = await makeRequest(`${API_URL}/api/price/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: testAddress
      })
    });

    console.log(`Status: ${publicPriceResponse.status}`);
    console.log('Response:', JSON.stringify(publicPriceResponse.data, null, 2));

    if (publicPriceResponse.status === 403) {
      console.log('✅ Public users correctly blocked from disabled locations');
    } else if (publicPriceResponse.data.isAvailable) {
      console.log('ℹ️ Location is available for public users');
    }

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log('- Admin price check:', priceResponse.status === 200 ? '✅ Working' : '❌ Failed');
    console.log('- Admin bypass detection:', priceResponse.data.adminBypass ? '✅ Detected' : 'ℹ️ Not needed');
    console.log('- Public restriction:', publicPriceResponse.status === 403 ? '✅ Working' : 'ℹ️ Location available');
    
    if (priceResponse.data.adminBypass) {
      console.log('\n🎉 Admin bypass is working correctly!');
      console.log('✓ Admins can get pricing for disabled locations');
      console.log('✓ Admins will be able to purchase properties in disabled areas');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. The server is running');
    console.log('2. The Firebase token is valid');
    console.log('3. The user is set as admin using: npm run set-admin <user_uid>');
  }
};

// Test with token from command line
const token = process.argv[2];
const address = process.argv[3] || 'New York';

testAdminBypass(token, address); 