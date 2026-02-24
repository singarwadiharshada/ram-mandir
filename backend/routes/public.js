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
    // Basic required fields for ALL donations
    if (!req.body.donorName || !req.body.mobile || !req.body.service) {
      return res.status(400).json({ 
        error: 'देणगीदाराचे नाव, मोबाईल नंबर आणि सेवा आवश्यक आहे' 
      });
    }

    // Validate mobile
    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res.status(400).json({ 
        error: 'मोबाईल नंबर १० अंकी असावा' 
      });
    }

    // Service-specific validation
    if (req.body.service === 'महाप्रसाद') {
      // Mahaprasad requires item but NOT amount
      if (!req.body.item) {
        return res.status(400).json({ 
          error: 'कृपया वस्तू निवडा' 
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

      // IMPORTANT FIX: Don't include amount field at all for Mahaprasad
      const donationData = {
        donorName: req.body.donorName,
        mobile: req.body.mobile,
        service: req.body.service,
        item: item._id,
        itemName: item.name,
        quantity: requestedQty,
        unit: item.unit,
        address: req.body.address || '',
        date: new Date()
        // amount field is completely omitted
      };

      const donation = await Donation.create(donationData);
      
      res.status(201).json({ 
        message: 'देणगी यशस्वी',
        donationId: donation._id 
      });

    } else {
      // Abhishek/Other - requires amount but NOT item
      if (!req.body.amount) {
        return res.status(400).json({ 
          error: 'कृपया देणगी रक्कम भरा' 
        });
      }

      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount < 100 || amount > 1000) {
        return res.status(400).json({ 
          error: 'कृपया रु.१०० ते रु.१००० दरम्यान रक्कम भरा' 
        });
      }

      // For Abhishek/Other, create donation with amount
      const donationData = {
        donorName: req.body.donorName,
        mobile: req.body.mobile,
        service: req.body.service,
        amount: amount,
        address: req.body.address || '',
        date: new Date()
        // item-related fields are omitted
      };

      const donation = await Donation.create(donationData);
      
      res.status(201).json({ 
        message: 'देणगी यशस्वी',
        donationId: donation._id 
      });
    }
  } catch (error) {
    console.error('Public donation error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;