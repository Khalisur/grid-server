const mongoose = require('mongoose');

const treasureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: 'Hidden treasure waiting to be discovered!'
  },
  cells: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Treasure must have at least one cell'
    }
  },
  rewardType: {
    type: String,
    enum: ['tokens', 'bonus_multiplier', 'special_item', 'discount'],
    default: 'tokens'
  },
  rewardAmount: {
    type: Number,
    required: true,
    min: 1
  },
  rewardMessage: {
    type: String,
    default: '🎉 Congratulations! You found a hidden treasure!'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRedeemed: {
    type: Boolean,
    default: false
  },
  redeemedBy: {
    type: String,
    default: null
  },
  redeemedAt: {
    type: Date,
    default: null
  },
  maxRedemptions: {
    type: Number,
    default: 1 // How many times this treasure can be redeemed
  },
  currentRedemptions: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    default: null // Optional expiration date
  }
}, {
  timestamps: true
});

// Index for faster queries
treasureSchema.index({ cells: 1 });
treasureSchema.index({ isActive: 1, isRedeemed: 1 });
treasureSchema.index({ expiresAt: 1 });

// Virtual to check if treasure is expired
treasureSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual to check if treasure is available for redemption
treasureSchema.virtual('isAvailable').get(function() {
  return this.isActive && 
         !this.isExpired && 
         this.currentRedemptions < this.maxRedemptions;
});

const Treasure = mongoose.model('Treasure', treasureSchema);

module.exports = Treasure; 