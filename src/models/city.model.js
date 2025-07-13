const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  disabledReason: {
    type: String,
    default: ''
  },
  disabledBy: {
    type: String,
    default: ''
  },
  disabledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const City = mongoose.model('City', citySchema);

module.exports = City; 