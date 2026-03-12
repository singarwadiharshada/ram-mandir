// backend/routes/publicServices.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service'); // Adjust path as needed

// Get available services for public
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;
    let query = { isActive: true }; // Only show active services
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Get services
    const services = await Service.find(query)
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get total count for pagination
    const total = await Service.countDocuments(query);
    
    res.json({
      items: services,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching public services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
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

module.exports = router;