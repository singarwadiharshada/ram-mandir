const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'सेवेचे नाव आवश्यक आहे']
  },
  category: {
    type: String,
    enum: ['महाप्रसाद', 'अभिषेक', 'इतर'],
    required: [true, 'श्रेणी आवश्यक आहे']
  },
  minAmount: {
    type: Number,
    required: [true, 'किमान रक्कम आवश्यक आहे'],
    min: [1, 'किमान रक्कम १ पेक्षा जास्त असावी']
  },
  maxAmount: {
    type: Number,
    min: [1, 'कमाल रक्कम १ पेक्षा जास्त असावी']
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validation to ensure maxAmount > minAmount if both exist
serviceSchema.pre('save', function(next) {
  if (this.maxAmount && this.maxAmount <= this.minAmount) {
    next(new Error('कमाल रक्कम किमान रक्कम पेक्षा मोठी असावी'));
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);