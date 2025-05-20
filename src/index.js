const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const userRoutes = require('./routes/user.routes');
const propertyRoutes = require('./routes/property.routes');
const countryRoutes = require('./routes/country.routes');
const cityRoutes = require('./routes/city.routes');
const priceRoutes = require('./routes/price.routes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/price', priceRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Grid Map API' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server with error handling
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try a different port or stop the running process.`);
        
        // Try alternate port if main port is in use
        const altPort = parseInt(PORT) + 1;
        console.log(`Attempting to use alternate port ${altPort}...`);
        
        app.listen(altPort, () => {
          console.log(`Server running on alternate port ${altPort}`);
          console.log(`Update your API_URL in frontend to: http://localhost:${altPort}/api`);
        }).on('error', (altErr) => {
          console.error(`Could not start server on alternate port: ${altErr.message}`);
          process.exit(1);
        });
      } else {
        console.error(`Server error: ${err.message}`);
        process.exit(1);
      }
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
}); 