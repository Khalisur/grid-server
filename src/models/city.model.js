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
  }
}, {
  timestamps: true
});

const City = mongoose.model('City', citySchema);

module.exports = City; 