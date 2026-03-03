const mongoose = require('mongoose');

const prasadItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'वस्तूचे नाव आवश्यक आहे']
  },
  category: {
    type: String,
    enum: ['महाप्रसाद', 'अभिषेक', 'इतर'],
    required: [true, 'श्रेणी आवश्यक आहे']
  },
  unit: {
    type: String,
    enum: ['kg', 'piece', 'liter', 'gram'],  // Added 'gram' to enum
    required: [true, 'एकक आवश्यक आहे']
  },
  required: {
    type: Number,
    required: [true, 'आवश्यक प्रमाण आवश्यक आहे'],
    min: [0.001, 'आवश्यक प्रमाण ० पेक्षा जास्त असावे']
  },
  received: {
    type: Number,
    default: 0,
    min: [0, 'मिळालेले प्रमाण ० पेक्षा कमी असू शकत नाही']
  }
}, {
  timestamps: true
});

// Virtual for remaining quantity
prasadItemSchema.virtual('remaining').get(function() {
  return (this.required - this.received).toFixed(3);
});

// Virtual for isFulfilled
prasadItemSchema.virtual('isFulfilled').get(function() {
  return this.received >= this.required;
});

// Ensure received never exceeds required
prasadItemSchema.pre('save', function(next) {
  if (this.received > this.required) {
    this.received = this.required;
  }
  next();
});

module.exports = mongoose.model('PrasadItem', prasadItemSchema);