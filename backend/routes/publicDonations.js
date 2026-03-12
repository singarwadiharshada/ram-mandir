const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const PrasadItem = require('../models/PrasadItem');
const Service = require('../models/Service');

// Create public donation (no authentication required)
router.post('/', async (req, res) => {
  try {
    console.log('📝 Public donation request received:', req.body);
    
    // Basic validation
    if (!req.body.donorName || !req.body.mobile) {
      return res.status(400).json({ 
        error: 'सर्व आवश्यक माहिती भरा' 
      });
    }

    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res.status(400).json({ 
        error: 'मोबाईल नंबर १० अंकी असावा' 
      });
    }

    let donationData = {
      donorName: req.body.donorName,
      mobile: req.body.mobile,
      service: req.body.service,
      amount: parseFloat(req.body.amount) || 0,
      address: req.body.address || '',
      date: new Date()
    };

    // Handle different service types
    if (req.body.service === 'महाप्रसाद') {
      // Mahaprasad validation
      if (!req.body.item || !req.body.quantity) {
        return res.status(400).json({ 
          error: 'वस्तू आणि प्रमाण आवश्यक आहे' 
        });
      }

      const item = await PrasadItem.findById(req.body.item);
      if (!item) {
        return res.status(404).json({ error: 'वस्तू सापडली नाही' });
      }

      const requestedQty = parseFloat(req.body.quantity);
      if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({ 
          error: 'प्रमाण योग्य संख्या असावी' 
        });
      }

      const remaining = item.required - item.received;
      if (requestedQty > remaining) {
        return res.status(400).json({ 
          error: `फक्त ${remaining.toFixed(3)} ${item.unit} उपलब्ध आहे` 
        });
      }

      donationData.item = item._id;
      donationData.itemName = item.name;
      donationData.quantity = requestedQty;
      donationData.unit = item.unit;
      
    } else if (req.body.service === 'इतर') {
      // "इतर" category validation
      if (!req.body.sevaId) {
        return res.status(400).json({ 
          error: 'कृपया सेवा निवडा' 
        });
      }

      const service = await Service.findById(req.body.sevaId);
      if (!service) {
        return res.status(404).json({ error: 'सेवा सापडली नाही' });
      }

      if (!req.body.amount || req.body.amount < service.minAmount) {
        return res.status(400).json({ 
          error: `कृपया किमान ₹${service.minAmount} रक्कम भरा` 
        });
      }

      if (service.maxAmount && req.body.amount > service.maxAmount) {
        return res.status(400).json({ 
          error: `कृपया कमाल ₹${service.maxAmount} रक्कम भरा` 
        });
      }

      donationData.sevaId = service._id;
      donationData.serviceName = service.name;
      
    } else if (req.body.service === 'अभिषेक') {
      // Abhishek validation
      if (!req.body.amount || req.body.amount < 100 || req.body.amount > 1000) {
        return res.status(400).json({ 
          error: 'कृपया ₹१०० ते ₹१००० दरम्यान रक्कम भरा' 
        });
      }
    }

    // Create donation
    const donation = await Donation.create(donationData);
    console.log('✅ Donation created successfully:', donation._id);
    
    // Populate references for response
    let populatedDonation;
    if (donation.service === 'महाप्रसाद') {
      populatedDonation = await Donation.findById(donation._id).populate('item').lean();
    } else if (donation.service === 'इतर') {
      populatedDonation = await Donation.findById(donation._id).populate('sevaId').lean();
      if (populatedDonation && populatedDonation.sevaId) {
        populatedDonation.serviceName = populatedDonation.sevaId.name;
      }
    } else {
      populatedDonation = donation.toObject();
    }
    
    res.status(201).json(populatedDonation || donation);
  } catch (error) {
    console.error('❌ Error creating public donation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;