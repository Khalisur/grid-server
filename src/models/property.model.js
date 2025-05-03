const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  owner: {
    type: String,
    required: true
  },
  cells: {
    type: [String],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    default: 'Untitled Property'
  },
  description: {
    type: String,
    default: 'No description provided'
  },
  address: {
    type: String,
    default: 'No address provided'
  },
  forSale: {
    type: Boolean,
    default: false
  },
  salePrice: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property; 