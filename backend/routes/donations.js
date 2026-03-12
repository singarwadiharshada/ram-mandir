const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const PrasadItem = require('../models/PrasadItem');
const Service = require('../models/Service');
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
      .populate({
        path: 'sevaId',
        model: 'Service',
        select: 'name description minAmount maxAmount'
      })
      .sort({ date: -1 })
      .lean();
    
    // Process donations to ensure serviceName and itemName are set
    const processedDonations = donations.map(donation => {
      // For "इतर" category, set serviceName from populated sevaId
      if (donation.service === 'इतर') {
        if (donation.sevaId && typeof donation.sevaId === 'object') {
          donation.serviceName = donation.sevaId.name;
          donation.serviceDisplay = `इतर (${donation.sevaId.name})`;
        } else {
          donation.serviceName = donation.serviceName || 'सेवा';
          donation.serviceDisplay = 'इतर (सेवा)';
        }
      }
      
      // For Mahaprasad, ensure itemName is set
      if (donation.service === 'महाप्रसाद') {
        if (donation.item && typeof donation.item === 'object') {
          donation.itemName = donation.item.name;
          donation.unit = donation.item.unit;
        }
      }
      
      return donation;
    });
    
    // Apply search filter if needed
    let filtered = processedDonations;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = processedDonations.filter(d => 
        d.donorName?.toLowerCase().includes(searchLower) ||
        d.mobile?.includes(search) ||
        (d.itemName && d.itemName.toLowerCase().includes(searchLower)) ||
        (d.serviceName && d.serviceName.toLowerCase().includes(searchLower))
      );
    }
    
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new donation (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
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

    const donation = await Donation.create(donationData);
    
    // Populate references
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
    console.error('Error creating donation:', error);
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