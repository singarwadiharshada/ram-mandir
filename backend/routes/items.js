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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv',
      'text/plain' // Sometimes CSV files come as text/plain
    ];
    
    // Also check by file extension
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExt = ['xlsx', 'xls', 'csv'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExt.includes(fileExt || '')) {
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
  
  if (categoryStr.includes('महाप्रसाद') || categoryStr.includes('mahaprasad')) {
    return 'महाप्रसाद';
  } else if (categoryStr.includes('अभिषेक') || categoryStr.includes('abhishek')) {
    return 'अभिषेक';
  } else if (categoryStr.includes('इतर') || categoryStr.includes('other')) {
    return 'इतर';
  }
  
  return null;
};

// ===== UPDATED HELPER FUNCTION TO MAP UNIT =====
const mapUnit = (unit) => {
  if (!unit) return 'kg'; // Default
  
  const unitStr = unit.toString().toLowerCase().trim();
  
  // Handle kg
  if (unitStr.includes('kg') || unitStr.includes('किलो') || unitStr === 'kilogram') {
    return 'kg';
  }
  
  // Handle gram/gm
  if (unitStr.includes('gram') || unitStr === 'g' || unitStr === 'gm' || unitStr.includes('ग्रॅम')) {
    return 'gram';
  }
  
  // Handle liter
  if (unitStr.includes('liter') || unitStr.includes('l') || unitStr.includes('लीटर')) {
    return 'liter';
  }
  
  // Handle piece
  if (unitStr.includes('piece') || unitStr.includes('pcs') || unitStr.includes('पीस')) {
    return 'piece';
  }
  
  return 'kg'; // Default
};

// ===== GET ALL ITEMS =====
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
    console.error('Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== CREATE NEW ITEM =====
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
    console.error('Error creating item:', error);
    res.status(400).json({ error: error.message });
  }
});

// ===== UPDATE ITEM =====
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updateData = {};
    
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.unit) updateData.unit = req.body.unit;
    
    if (req.body.required !== undefined) {
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
    console.error('Error updating item:', error);
    res.status(400).json({ error: error.message });
  }
});

// ===== DELETE ITEM =====
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
    console.error('Error deleting item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET ITEM STATISTICS =====
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
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FIXED IMPORT ROUTE =====
router.post('/import', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    console.log('========== IMPORT STARTED ==========');
    console.log('Time:', new Date().toISOString());
    console.log('User:', req.user?._id);
    
    if (!req.file) {
      return res.status(400).json({ message: 'कृपया फाइल निवडा' });
    }

    console.log('✅ File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size + ' bytes'
    });

    // Parse Excel/CSV file
    let workbook;
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'csv' || req.file.mimetype.includes('csv')) {
      const csvString = req.file.buffer.toString('utf-8');
      workbook = XLSX.read(csvString, { type: 'string' });
    } else {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length < 2) {
      return res.status(400).json({ 
        message: 'फाइलमध्ये पुरेसा डेटा नाही. किमान header आणि एक पंक्ती आवश्यक आहे.' 
      });
    }

    // Get headers from first row
    const headers = jsonData[0] || [];

    // Process data rows
    const items = [];
    const errors = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 1;
      
      // Skip empty rows
      if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
        continue;
      }

      // Ensure row has at least 4 columns
      const paddedRow = [...row];
      while (paddedRow.length < 4) {
        paddedRow.push('');
      }

      // Extract values
      const itemName = paddedRow[0]?.toString().trim();
      const categoryInput = paddedRow[1]?.toString().trim();
      const unitInput = paddedRow[2]?.toString().trim();
      const requiredInput = paddedRow[3]?.toString().trim();

      // Validate name
      if (!itemName) {
        errors.push(`पंक्ती ${rowNumber}: वस्तूचे नाव आवश्यक आहे`);
        continue;
      }

      // Map category
      const category = mapCategory(categoryInput);
      if (!category) {
        errors.push(`पंक्ती ${rowNumber}: अवैध श्रेणी - ${categoryInput}. स्वीकार्य श्रेणी: महाप्रसाद, अभिषेक, इतर`);
        continue;
      }

      // Parse required quantity
      let required = parseFloat(requiredInput);
      if (isNaN(required) || required <= 0) {
        errors.push(`पंक्ती ${rowNumber}: अवैध प्रमाण - ${requiredInput}`);
        continue;
      }

      // Map unit (now returns 'gram' for gm/g values)
      let unit = mapUnit(unitInput);

      // Check if item already exists
      const existingItem = await PrasadItem.findOne({ 
        name: { $regex: new RegExp(`^${itemName}$`, 'i') },
        category: category
      });

      if (existingItem) {
        errors.push(`पंक्ती ${rowNumber}: '${itemName}' ही वस्तू आधीपासून अस्तित्वात आहे`);
        continue;
      }

      items.push({
        name: itemName,
        category: category,
        unit: unit,  // Will be 'gram' for gm/g values
        required: required,
        received: 0
      });
    }

    console.log(`📦 Valid items to insert: ${items.length}`);
    console.log(`❌ Errors found: ${errors.length}`);

    // Bulk insert
    if (items.length > 0) {
      const result = await PrasadItem.insertMany(items);
      console.log(`✅ Successfully inserted ${result.length} items`);
      
      return res.status(200).json({
        success: true,
        message: `${result.length} वस्तू यशस्वीरित्या अपलोड झाल्या`,
        imported: result.length,
        failed: errors.length,
        errors: errors
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'फाइलमध्ये कोणतीही वैध वस्तू आढळली नाही',
        imported: 0,
        failed: errors.length,
        errors: errors
      });
    }
  } catch (error) {
    console.error('❌ Import error:', error);
    return res.status(500).json({ 
      message: 'फाइल अपलोड करताना त्रुटी आली',
      error: error.message
    });
  } finally {
    console.log('========== IMPORT ENDED ==========');
  }
});

// ===== DOWNLOAD IMPORT TEMPLATE =====
router.get('/template', protect, adminOnly, async (req, res) => {
  try {
    const { format = 'excel' } = req.query;
    
    const templateData = [
      ['वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक प्रमाण'],
      ['तांदूळ', 'महाप्रसाद', 'kg', '100'],
      ['साखर', 'महाप्रसाद', 'kg', '50'],
      ['केळी', 'इतर', 'gram', '500'],  // Updated to 'gram' instead of 'gm'
      ['दूध', 'अभिषेक', 'liter', '20'],
      ['तूप', 'महाप्रसाद', 'gram', '1000'],  // Updated to 'gram'
      ['नारळ', 'इतर', 'piece', '10']
    ];

    if (format === 'csv') {
      // Create CSV
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=prasad_items_template.csv');
      res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent));
      res.send('\uFEFF' + csvContent);
    } else {
      // Create Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=prasad_items_template.xlsx');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ message: 'टेम्पलेट तयार करताना त्रुटी आली' });
  }
});

module.exports = router;