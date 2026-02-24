// models/Donation.js - UPDATED VERSION

const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donorName: { 
    type: String, 
    required: [true, 'देणगीदाराचे नाव आवश्यक आहे'] 
  },
  mobile: { 
    type: String, 
    required: [true, 'मोबाईल नंबर आवश्यक आहे'],
    match: [/^\d{10}$/, 'मोबाईल नंबर १० अंकी असावा']
  },
  service: { 
    type: String, 
    enum: ['महाप्रसाद', 'अभिषेक', 'इतर'], 
    required: true 
  },
  // For Mahaprasad - item is required
  item: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PrasadItem', 
    required: function() {
      return this.service === 'महाप्रसाद';
    }
  },
  itemName: String,
  // For Mahaprasad - quantity is required
  quantity: { 
    type: Number, 
    required: function() {
      return this.service === 'महाप्रसाद';
    },
    min: [0.001, 'प्रमाण ० पेक्षा जास्त असावे']
  },
  unit: { 
    type: String,
    enum: ['kg', 'piece', 'liter'],
    required: function() {
      return this.service === 'महाप्रसाद';
    }
  },
  // For Abhishek/Other - amount is required
  amount: { 
    type: Number, 
    required: function() {
      return this.service !== 'महाप्रसाद';
    },
    min: [1, 'रक्कम १ पेक्षा जास्त असावी']
  },
  address: String,
  date: { 
    type: Date, 
    default: Date.now 
  }
});

// Update item received quantity after save
donationSchema.post('save', async function() {
  // Only update if this is a Mahaprasad donation with an item
  if (this.service === 'महाप्रसाद' && this.item) {
    const PrasadItem = mongoose.model('PrasadItem');
    const Donation = mongoose.model('Donation');
    
    const total = await Donation.aggregate([
      { $match: { item: this.item } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    await PrasadItem.findByIdAndUpdate(this.item, {
      received: total[0]?.total || 0
    });
  }
});

// Update item received quantity after delete
donationSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.service === 'महाप्रसाद' && doc.item) {
    const PrasadItem = mongoose.model('PrasadItem');
    const Donation = mongoose.model('Donation');
    
    const total = await Donation.aggregate([
      { $match: { item: doc.item } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    await PrasadItem.findByIdAndUpdate(doc.item, {
      received: total[0]?.total || 0
    });
  }
});

module.exports = mongoose.model('Donation', donationSchema);