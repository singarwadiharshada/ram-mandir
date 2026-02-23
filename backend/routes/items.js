const express = require('express');
const router = express.Router();
const PrasadItem = require('../models/PrasadItem');
const { protect, adminOnly } = require('../middleware/auth');

// Get all items (protected)
router.get('/', protect, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const items = await PrasadItem.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new item (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    if (!req.body.name || !req.body.category || !req.body.unit || !req.body.required) {
      return res.status(400).json({ 
        error: 'सर्व आवश्यक फील्ड भरा: नाव, श्रेणी, एकक, आवश्यक प्रमाण' 
      });
    }

    const required = parseFloat(req.body.required);
    if (isNaN(required) || required <= 0) {
      return res.status(400).json({ 
        error: 'आवश्यक प्रमाण योग्य संख्या असावी' 
      });
    }

    const itemData = {
      name: req.body.name,
      category: req.body.category,
      unit: req.body.unit,
      required: required,
      received: 0
    };

    const item = await PrasadItem.create(itemData);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update item (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updateData = {};
    
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.unit) updateData.unit = req.body.unit;
    
    if (req.body.required) {
      const required = parseFloat(req.body.required);
      if (isNaN(required) || required <= 0) {
        return res.status(400).json({ 
          error: 'आवश्यक प्रमाण योग्य संख्या असावी' 
        });
      }
      updateData.required = required;
    }

    const item = await PrasadItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete item (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await PrasadItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const Donation = require('../models/Donation');
    const hasDonations = await Donation.findOne({ item: req.params.id });
    
    if (hasDonations) {
      return res.status(400).json({ 
        error: 'ही वस्तू हटवू शकत नाही कारण त्यासाठी देणग्या नोंदवल्या गेल्या आहेत' 
      });
    }

    await PrasadItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get item statistics
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const items = await PrasadItem.find();
    
    const stats = {
      total: items.length,
      fulfilled: items.filter(i => i.received >= i.required).length,
      pending: items.filter(i => i.received < i.required).length,
      totalRequired: items.reduce((sum, i) => sum + i.required, 0),
      totalReceived: items.reduce((sum, i) => sum + i.received, 0)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;