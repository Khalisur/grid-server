# Frontend Integration Guide

This guide explains how to integrate the Grid Map API with your frontend application using Firebase Authentication.

## 1. Firebase Setup

### Install Firebase SDK

```bash
npm install firebase
# or
yarn add firebase
```

### Initialize Firebase

```javascript
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
```

## 2. Authentication Functions

```javascript
// src/auth.js
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';

// Register a new user with Firebase
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // After Firebase authentication, save user to your backend
    await saveUserToDatabase(user);
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Save user to your database after Firebase authentication
export const saveUserToDatabase = async (firebaseUser) => {
  try {
    const response = await fetch('http://localhost:5000/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: firebaseUser.uid.substring(0, 5), // Generate a short ID
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving user to database:', error);
    throw error;
  }
};

// Sign in with email and password
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};
```

## 3. API Service

```javascript
// src/api.js
import { auth } from './firebase';

const API_URL = 'http://localhost:5000/api';

// Helper function to make API requests with Firebase UID in header
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const user = auth.currentUser;
    
    if (!user && options.requireAuth) {
      throw new Error('Authentication required');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (user) {
      headers['Firebase-UID'] = user.uid;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// User API
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('/users/profile', { requireAuth: true });
  },
  
  // Update user
  updateUser: async (userData) => {
    return apiRequest('/users/update', {
      method: 'PUT',
      body: JSON.stringify(userData),
      requireAuth: true
    });
  },
  
  // Delete user
  deleteUser: async () => {
    return apiRequest('/users/delete', {
      method: 'DELETE',
      requireAuth: true
    });
  }
};

// Property API
export const propertyAPI = {
  // Get all properties
  getAllProperties: async () => {
    return apiRequest('/properties');
  },
  
  // Get properties for sale
  getPropertiesForSale: async () => {
    return apiRequest('/properties/for-sale');
  },
  
  // Get property by ID
  getPropertyById: async (id) => {
    return apiRequest(`/properties/${id}`);
  },
  
  // Get user's properties
  getUserProperties: async () => {
    return apiRequest('/properties/user/my-properties', { requireAuth: true });
  },
  
  // Create property
  createProperty: async (propertyData) => {
    return apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
      requireAuth: true
    });
  },
  
  // Update property
  updateProperty: async (id, propertyData) => {
    return apiRequest(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
      requireAuth: true
    });
  },
  
  // Delete property
  deleteProperty: async (id) => {
    return apiRequest(`/properties/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  }
};
```

## 4. Example Usage

### User Registration and Login

```javascript
import { registerUser, loginUser, logoutUser } from './auth';
import { userAPI } from './api';

// Register a new user
const handleRegister = async (email, password, name) => {
  try {
    const user = await registerUser(email, password);
    console.log('User registered:', user);
    
    // Update user profile if needed
    await userAPI.updateUser({ name });
  } catch (error) {
    console.error('Registration error:', error.message);
  }
};

// Login
const handleLogin = async (email, password) => {
  try {
    const user = await loginUser(email, password);
    console.log('User logged in:', user);
    
    // Get user profile with properties
    const userProfile = await userAPI.getProfile();
    console.log('User profile:', userProfile);
  } catch (error) {
    console.error('Login error:', error.message);
  }
};

// Logout
const handleLogout = async () => {
  try {
    await logoutUser();
    console.log('User logged out');
  } catch (error) {
    console.error('Logout error:', error.message);
  }
};
```

### Property Management

```javascript
import { propertyAPI } from './api';
import { v4 as uuidv4 } from 'uuid';

// Create a new property
const createNewProperty = async (propertyData) => {
  try {
    const property = await propertyAPI.createProperty({
      id: uuidv4(),
      ...propertyData
    });
    console.log('Property created:', property);
    return property;
  } catch (error) {
    console.error('Error creating property:', error.message);
    throw error;
  }
};

// Get all properties user owns
const getUserProperties = async () => {
  try {
    const properties = await propertyAPI.getUserProperties();
    console.log('User properties:', properties);
    return properties;
  } catch (error) {
    console.error('Error fetching user properties:', error.message);
    throw error;
  }
};

// Update a property
const updateProperty = async (id, updates) => {
  try {
    const updatedProperty = await propertyAPI.updateProperty(id, updates);
    console.log('Property updated:', updatedProperty);
    return updatedProperty;
  } catch (error) {
    console.error('Error updating property:', error.message);
    throw error;
  }
};

// Buy a property
const buyProperty = async (propertyId) => {
  try {
    // First get property details
    const property = await propertyAPI.getPropertyById(propertyId);
    
    if (!property.forSale) {
      throw new Error('This property is not for sale');
    }
    
    // Here you would implement your purchase logic
    // This could involve a transaction, updating user tokens, etc.
    
    // After purchase completes, update property ownership
    // This is a simplified example
    const updatedProperty = await propertyAPI.updateProperty(propertyId, {
      forSale: false
    });
    
    return updatedProperty;
  } catch (error) {
    console.error('Error buying property:', error.message);
    throw error;
  }
};
```

## 5. Using React Hooks for Firebase Authentication

```javascript
// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { userAPI } from '../api';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          const userProfile = await userAPI.getProfile();
          setProfile(userProfile);
        } catch (err) {
          setError(err.message);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { currentUser, profile, loading, error };
};
```

This hook can be used in your React components:

```javascript
// src/components/Dashboard.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { currentUser, profile, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!currentUser) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {profile?.name || currentUser.email}</h1>
      <p>You have {profile?.tokens || 0} tokens</p>
      
      <h2>Your Properties</h2>
      {profile?.properties?.length > 0 ? (
        <ul>
          {profile.properties.map(property => (
            <li key={property.id}>
              {property.name} - {property.forSale ? 'For Sale' : 'Not For Sale'}
            </li>
          ))}
        </ul>
      ) : (
        <p>You don't have any properties yet.</p>
      )}
    </div>
  );
};

export default Dashboard;
```

## 6. Error Handling

Always implement proper error handling in your frontend code:

```javascript
try {
  // API call
} catch (error) {
  // Check for specific error types
  if (error.message.includes('Firebase')) {
    // Handle Firebase authentication errors
  } else if (error.message.includes('Authentication required')) {
    // Handle auth errors
  } else {
    // Handle other errors
  }
}
```

## 7. Security Best Practices

1. Never store Firebase API keys or secrets in client-side code for production
2. Use Firebase Security Rules to restrict access to Firebase resources
3. Implement proper validation on both client and server
4. Use HTTPS for all API requests
5. Consider adding rate limiting for API endpoints
6. Monitor authentication activity for suspicious behavior

## 8. Troubleshooting Common Issues

### API Connection Errors

If you see errors like:
```
POST http://localhost:5001/api/users/create 500 (Internal Server Error)
```

Try these solutions:

1. **Check API URL**: Make sure you're using the correct API URL in your code
   ```javascript
   // Use either port 5000 or 5001 but be consistent
   const API_URL = 'http://localhost:5000/api';
   ```

2. **Server Running**: Ensure your Express server is running
   ```bash
   npm run dev
   ```

3. **MongoDB Connection**: Verify MongoDB connection in server logs
   - If you see errors, check your MONGODB_URI in the .env file

4. **Request Payload**: Ensure you're sending all required fields:
   ```javascript
   {
     uid: "firebase-user-id", // REQUIRED
     email: "user@example.com", // REQUIRED
     name: "User Name", // Optional
     id: "custom-id" // Optional
   }
   ```

5. **CORS Issues**: If you see CORS errors, make sure the server's CORS settings allow requests from your frontend origin

6. **Network Issues**: Try accessing the API directly in a tool like Postman to isolate if it's a frontend or backend issue

### Common Error Codes

- **400 Bad Request**: Missing required fields in request
- **401 Unauthorized**: Authentication required (missing Firebase-UID header)
- **404 Not Found**: Resource not found (user, property, etc.)
- **500 Internal Server Error**: Server-side error (check server logs)

For 500 errors, check the server console logs for detailed error messages. 