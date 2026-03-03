const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const PrasadItem = require('../models/PrasadItem');
const { protect, adminOnly } = require('../middleware/auth');

// ===== CONFIGURE MULTER FOR FILE UPLOAD =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('फक्त Excel आणि CSV फाइल्स स्वीकार्य आहेत'));
    }
  }
});

// ===== HELPER FUNCTION TO MAP CATEGORY =====
const mapCategory = (category) => {
  if (!category) return null;
  
  const categoryStr = category.toString().toLowerCase().trim();
  const categoryMap = {
    'महाप्रसाद': 'महाप्रसाद',
    'mahaprasad': 'महाप्रसाद',
    'अभिषेक': 'अभिषेक',
    'abhishek': 'अभिषेक',
    'इतर': 'इतर',
    'other': 'इतर'
  };
  
  return categoryMap[categoryStr] || null;
};

// ===== YOUR EXISTING ROUTES =====

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

// ===== NEW IMPORT ROUTES =====

/**
 * @route   POST /api/items/import
 * @desc    Import items from Excel/CSV file
 * @access  Admin only
 */
router.post('/import', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'कृपया फाइल निवडा' });
    }

    console.log('Processing file:', req.file.originalname);

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row (first row)
    const items = [];
    const errors = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row || row.length < 4 || !row[0]) continue;

      // Map columns based on Excel structure
      const itemName = row[0]?.toString().trim();
      const categoryInput = row[1]?.toString().trim();
      const unit = row[2]?.toString().trim() || 'kg';
      const required = parseFloat(row[3]?.toString().trim());

      // Validate
      if (!itemName) {
        errors.push(`पंक्ती ${i + 1}: वस्तूचे नाव आवश्यक आहे`);
        continue;
      }

      const category = mapCategory(categoryInput);
      if (!category) {
        errors.push(`पंक्ती ${i + 1}: अवैध श्रेणी - ${categoryInput}. स्वीकार्य श्रेणी: महाप्रसाद, अभिषेक, इतर`);
        continue;
      }

      if (isNaN(required) || required <= 0) {
        errors.push(`पंक्ती ${i + 1}: अवैध प्रमाण - ${row[3]}`);
        continue;
      }

      // Check if item already exists (optional - you can skip this if you want to allow duplicates)
      const existingItem = await PrasadItem.findOne({ 
        name: { $regex: new RegExp(`^${itemName}$`, 'i') },
        category: category,
        unit: unit
      });

      if (existingItem) {
        errors.push(`पंक्ती ${i + 1}: '${itemName}' ही वस्तू आधीपासून अस्तित्वात आहे`);
        continue;
      }

      items.push({
        name: itemName,
        category: category,
        unit: unit,
        required: required,
        received: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Bulk insert
    if (items.length > 0) {
      const result = await PrasadItem.insertMany(items);
      
      res.json({
        success: true,
        message: `${result.length} वस्तू यशस्वीरित्या अपलोड झाल्या`,
        imported: result.length,
        failed: errors.length,
        errors: errors
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'फाइलमध्ये कोणतीही वैध वस्तू आढळली नाही',
        errors: errors
      });
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'फाइल अपलोड करताना त्रुटी आली',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/items/template
 * @desc    Download import template
 * @access  Admin only
 */
router.get('/template', protect, adminOnly, async (req, res) => {
  try {
    const { format = 'xlsx' } = req.query;
    
    const templateData = [
      ['वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक प्रमाण'],
      ['तांदूळ', 'महाप्रसाद', 'kg', '100'],
      ['साखर', 'महाप्रसाद', 'kg', '50'],
      ['दूध', 'अभिषेक', 'liter', '20'],
      ['फळे', 'इतर', 'kg', '30']
    ];

    if (format === 'csv') {
      // Create CSV
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=prasad_items_template.csv');
      res.send('\uFEFF' + csvContent); // Add BOM for UTF-8
    } else {
      // Create Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // वस्तूचे नाव
        { wch: 15 }, // श्रेणी
        { wch: 10 }, // एकक
        { wch: 15 }  // आवश्यक प्रमाण
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=prasad_items_template.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ message: 'टेम्पलेट तयार करताना त्रुटी आली' });
  }
});

/**
 * @route   POST /api/items/bulk
 * @desc    Bulk create items (for backward compatibility)
 * @access  Admin only
 */
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    const items = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'वस्तूंची यादी आवश्यक आहे' });
    }

    // Validate each item
    const validItems = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.name || !item.category || !item.unit || !item.required) {
        errors.push(`Item ${i + 1}: Missing required fields`);
        continue;
      }

      const required = parseFloat(item.required);
      if (isNaN(required) || required <= 0) {
        errors.push(`Item ${i + 1}: Invalid required quantity`);
        continue;
      }

      validItems.push({
        name: item.name,
        category: item.category,
        unit: item.unit,
        required: required,
        received: item.received || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (validItems.length > 0) {
      const result = await PrasadItem.insertMany(validItems);
      res.json({
        success: true,
        count: result.length,
        items: result,
        errors: errors
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No valid items to create',
        errors: errors
      });
    }
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;