# Grid Map API

Express.js REST API for Grid Map application with MongoDB integration and Firebase authentication.

## Features

- User management with Firebase Authentication
- Property management (create, read, update, delete)
- MongoDB database integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- Firebase project setup for authentication

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/gird-server.git
cd gird-server
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following content:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/grid-map
PORT=5000
```

4. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### User Routes

| Method | Endpoint             | Description                 | Auth Required |
|--------|----------------------|-----------------------------|--------------|
| POST   | /api/users/create    | Create user after Firebase auth | No       |
| GET    | /api/users/profile   | Get user profile            | Yes          |
| PUT    | /api/users/update    | Update user profile         | Yes          |
| DELETE | /api/users/delete    | Delete user account         | Yes          |

### Property Routes

| Method | Endpoint                        | Description                | Auth Required |
|--------|--------------------------------|----------------------------|--------------|
| GET    | /api/properties                | Get all properties         | No           |
| GET    | /api/properties/for-sale       | Get properties for sale    | No           |
| GET    | /api/properties/:id            | Get property by ID         | No           |
| POST   | /api/properties                | Create a new property      | Yes          |
| GET    | /api/properties/user/my-properties | Get user's properties  | Yes          |
| PUT    | /api/properties/:id            | Update a property          | Yes          |
| DELETE | /api/properties/:id            | Delete a property          | Yes          |

## Authentication

Authentication is handled by Firebase on the frontend. For protected routes, include the Firebase UID in request headers:

```
Firebase-UID: YOUR_FIREBASE_UID
```

## License

MIT 