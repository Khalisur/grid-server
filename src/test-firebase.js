/**
 * Firebase Admin SDK Test Script
 * 
 * Run this script with: node src/test-firebase.js
 * This will test if your Firebase Admin SDK is properly configured
 */

require('dotenv').config();
const admin = require('./config/firebase.config');

async function testFirebaseAdminSDK() {
  console.log('Testing Firebase Admin SDK configuration...');
  console.log('----------------------------------------');
  
  try {
    // Check if Firebase Admin SDK is initialized
    if (!admin.apps.length) {
      console.error('Firebase Admin SDK is not initialized!');
      return;
    }
    
    console.log('Firebase Admin SDK is initialized.');
    
    // Try to access Firebase Auth
    const auth = admin.auth();
    console.log('Successfully accessed Firebase Auth API.');
    
    // Print configured project details
    const app = admin.app();
    console.log('Firebase App Name:', app.name);
    console.log('Firebase Options:', JSON.stringify({
      projectId: app.options.projectId,
      // Don't log sensitive info like the credential
    }, null, 2));
    
    console.log('----------------------------------------');
    console.log('Firebase Admin SDK is properly configured!');
    console.log('You can now use bearer token authentication in your app.');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Firebase Admin SDK Test Error:', error);
    
    // Provide helpful advice based on the error
    if (error.code === 'app/invalid-credential') {
      console.error('\nSuggestion: The private key format may be incorrect.');
      console.error('1. Check that your FIREBASE_PRIVATE_KEY in .env is properly formatted');
      console.error('2. Ensure it has all newlines represented as \\n');
      console.error('3. Make sure it\'s enclosed in double quotes');
      console.error('\nAlternatively, use the service account JSON file directly:');
      console.error('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-file.json"');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirebaseAdminSDK(); 