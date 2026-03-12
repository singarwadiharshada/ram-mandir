const express = require('express');
const router = express.Router();
const PrasadItem = require('../models/PrasadItem');
const Donation = require('../models/Donation');
const Service = require('../models/Service'); // Add this import


// Get available items for public with pagination
router.get('/items', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
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
    
    // Manual pagination since we need to filter by remaining quantity
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    
    // Get paginated items
    const paginatedItems = items.slice(startIndex, endIndex);
    
    // Return paginated response
    res.json({
      items: paginatedItems,
      total: items.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(items.length / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching public items:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ADD THIS NEW ENDPOINT FOR PUBLIC SERVICES ============
// Get available services for public
router.get('/services', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;
    let query = { isActive: true }; // Only show active services
    
    // Filter by category if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search in name or description if search term provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('📞 Fetching public services with query:', JSON.stringify(query));
    
    // Get services with pagination
    const services = await Service.find(query)
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get total count for pagination
    const total = await Service.countDocuments(query);
    
    console.log(`✅ Found ${services.length} active services (total: ${total})`);
    
    // Return paginated response (matching the format of your items endpoint)
    res.json({
      items: services,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Error fetching public services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optional: Get single service by ID (if needed)
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });
    
    if (!service) {
      return res.status(404).json({ error: 'सेवा सापडली नाही' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Error fetching public service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public donation endpoint (no auth) - UPDATED to return full donation object
router.post('/donations', async (req, res) => {
  try {
    console.log('=== PUBLIC DONATION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
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

    let donationData = {
      donorName: req.body.donorName,
      mobile: req.body.mobile,
      service: req.body.service,
      address: req.body.address || '',
      date: new Date()
    };

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

      // Validate based on unit
      if (item.unit === 'gram' && requestedQty < 50) {
        return res.status(400).json({ 
          error: 'ग्रॅमसाठी किमान प्रमाण ५० ग्रॅम आहे' 
        });
      }
      
      if (item.unit === 'kg' && requestedQty < 0.5) {
        return res.status(400).json({ 
          error: 'किलोसाठी किमान प्रमाण ०.५ किलो आहे' 
        });
      }

      // Validate step values based on unit
      if (item.unit === 'gram' && requestedQty % 50 !== 0) {
        return res.status(400).json({ 
          error: 'ग्रॅमसाठी प्रमाण ५० च्या पटीत असावे (उदा. ५०, १००, १५०)' 
        });
      }
      
      if (item.unit === 'kg' && (requestedQty * 2) % 1 !== 0) {
        return res.status(400).json({ 
          error: 'किलोसाठी प्रमाण ०.५ च्या पटीत असावे (उदा. ०.५, १.०, १.५)' 
        });
      }

      if (item.unit === 'piece' && !Number.isInteger(requestedQty)) {
        return res.status(400).json({ 
          error: 'नगसाठी प्रमाण पूर्ण संख्या असावी (उदा. १, २, ३)' 
        });
      }

      const remaining = item.required - item.received;
      if (requestedQty > remaining) {
        return res.status(400).json({ 
          error: `फक्त ${remaining.toFixed(3)} ${item.unit} उपलब्ध आहे` 
        });
      }

      // Update the PrasadItem's received quantity first
      item.received = Number((item.received + requestedQty).toFixed(3));
      await item.save();
      console.log(`Updated ${item.name} received quantity to ${item.received}`);

      donationData.item = item._id;
      donationData.itemName = item.name;
      donationData.quantity = requestedQty;
      donationData.unit = item.unit;
      donationData.amount = 0; // Mahaprasad has amount 0

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

      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount < service.minAmount) {
        return res.status(400).json({ 
          error: `कृपया किमान ₹${service.minAmount} रक्कम भरा` 
        });
      }

      if (service.maxAmount && amount > service.maxAmount) {
        return res.status(400).json({ 
          error: `कृपया कमाल ₹${service.maxAmount} रक्कम भरा` 
        });
      }

      donationData.sevaId = service._id;
      donationData.serviceName = service.name;
      donationData.amount = amount;

    } else if (req.body.service === 'अभिषेक') {
      // Abhishek validation
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount < 100 || amount > 1000) {
        return res.status(400).json({ 
          error: 'कृपया ₹१०० ते ₹१००० दरम्यान रक्कम भरा' 
        });
      }
      donationData.amount = amount;
    }

    console.log('Creating donation with data:', donationData);
    const donation = await Donation.create(donationData);
    
    // Populate references for response
    let populatedDonation;
    if (donation.service === 'महाप्रसाद') {
      populatedDonation = await Donation.findById(donation._id)
        .populate('item')
        .lean();
    } else if (donation.service === 'इतर') {
      populatedDonation = await Donation.findById(donation._id)
        .populate('sevaId')
        .lean();
      if (populatedDonation && populatedDonation.sevaId) {
        populatedDonation.serviceName = populatedDonation.sevaId.name;
      }
    } else {
      populatedDonation = donation.toObject();
    }
    
    console.log('Donation created successfully:', donation._id);
    
    // Return the full donation object (not just message and ID)
    res.status(201).json(populatedDonation || donation);

  } catch (error) {
    console.error('Public donation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'ही देणगी आधीच नोंदवली गेली आहे' });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;