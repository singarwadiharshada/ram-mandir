const express = require('express');
const router = express.Router();
const PrasadItem = require('../models/PrasadItem');
const Donation = require('../models/Donation');

// Get available items for public
router.get('/items', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Only show items that still have remaining quantity
    const items = await PrasadItem.find({
      ...query,
      $expr: { $lt: ['$received', '$required'] }
    }).sort({ name: 1 });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching public items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public donation endpoint (no auth)
router.post('/donations', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.donorName || !req.body.mobile || !req.body.item || !req.body.amount) {
      return res.status(400).json({ 
        error: 'सर्व आवश्यक माहिती भरा' 
      });
    }

    // Validate mobile
    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res.status(400).json({ 
        error: 'मोबाईल नंबर १० अंकी असावा' 
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

    const donationData = {
      donorName: req.body.donorName,
      mobile: req.body.mobile,
      service: req.body.service || item.category,
      item: item._id,
      itemName: item.name,
      quantity: requestedQty,
      unit: item.unit,
      amount: parseFloat(req.body.amount) || 0,
      address: req.body.address || '',
      date: new Date()
    };

    const donation = await Donation.create(donationData);
    
    res.status(201).json({ 
      message: 'देणगी यशस्वी',
      donationId: donation._id 
    });
  } catch (error) {
    console.error('Public donation error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;