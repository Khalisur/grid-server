# Firebase Authentication Setup

This project now uses Firebase Authentication with JWT tokens for user verification.

## Setting Up Firebase Service Account

To use Firebase Admin SDK for token verification, you'll need to set up a service account:

1. Go to your Firebase project console at https://console.firebase.google.com/
2. Navigate to Project Settings > Service Accounts
3. Click "Generate new private key" button
4. Save the downloaded JSON file securely (do not commit it to version control)

## Environment Variables

Update your `.env` file with the following Firebase credentials from the downloaded service account JSON:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key\n-----END PRIVATE KEY-----\n"
```

### Important Notes on Private Key Formatting:

1. The private key should include the entire key including the BEGIN and END statements
2. All newlines in the key must be represented as `\n` in the .env file
3. The key must be enclosed in double quotes in the .env file

### Example of Proper Private Key Formatting:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKC....\n-----END PRIVATE KEY-----\n"
```

You can use this command to convert your key to the proper format (on Linux/Mac):
```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-firebase-key.txt
```

## Alternative Setup Method

If you're having trouble with the private key, you can:

1. Save the service account JSON file somewhere secure on your server
2. Use the GOOGLE_APPLICATION_CREDENTIALS environment variable:

```
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-file.json"
```

## Frontend Implementation

On the frontend, implement authentication using:

```javascript
// Get the user's ID token
const idToken = await firebase.auth().currentUser.getIdToken(true);

// Send the token in requests
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

The backend will verify this token using the Firebase Admin SDK. 