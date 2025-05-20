const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
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

const Country = mongoose.model('Country', countrySchema);

module.exports = Country; 