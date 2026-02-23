const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const PrasadItem = require('../models/PrasadItem');
const { protect, adminOnly } = require('../middleware/auth');

// Get all donations (protected)
router.get('/', protect, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.service = category;
    }
    
    const donations = await Donation.find(query)
      .populate('item')
      .sort({ date: -1 });
    
    let filtered = donations;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = donations.filter(d => 
        d.donorName.toLowerCase().includes(searchLower) ||
        d.mobile.includes(search) ||
        (d.itemName && d.itemName.toLowerCase().includes(searchLower))
      );
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new donation (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    if (!req.body.donorName || !req.body.mobile || !req.body.item || !req.body.amount) {
      return res.status(400).json({ 
        error: 'सर्व आवश्यक माहिती भरा' 
      });
    }

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
    await donation.populate('item');
    
    res.status(201).json(donation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete donation (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    await Donation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get donation statistics
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const total = await Donation.countDocuments();
    const totalAmount = await Donation.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Donation.countDocuments({
      date: { $gte: today }
    });

    const categoryStats = await Donation.aggregate([
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      totalDonations: total,
      totalAmount: totalAmount[0]?.total || 0,
      todayDonations: todayCount,
      avgAmount: total ? (totalAmount[0]?.total || 0) / total : 0,
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;