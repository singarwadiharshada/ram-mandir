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

// ===== HELPER FUNCTION TO MAP UNIT =====
const mapUnit = (unit) => {
  if (!unit) return 'kg'; // Default
  
  const unitStr = unit.toString().toLowerCase().trim();
  
  if (unitStr.includes('kg') || unitStr.includes('किलो') || unitStr === 'kilogram') {
    return 'kg';
  } else if (unitStr.includes('gram') || unitStr.includes('g') || unitStr.includes('ग्रॅम')) {
    return 'gram';
  } else if (unitStr.includes('liter') || unitStr.includes('l') || unitStr.includes('लीटर')) {
    return 'liter';
  } else if (unitStr.includes('piece') || unitStr.includes('pcs') || unitStr.includes('पीस')) {
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

// ===== TEST IMPORT ROUTE =====
router.get('/test-import', (req, res) => {
  res.json({ 
    message: 'Import route is accessible',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// ===== IMPORT ITEMS FROM FILE =====
router.post('/import', protect, adminOnly, (req, res, next) => {
  console.log('📥 Import route hit');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  next();
}, upload.single('file'), async (req, res) => {
  try {
    console.log('========== IMPORT STARTED ==========');
    console.log('Time:', new Date().toISOString());
    console.log('User:', req.user?._id);
    
    if (!req.file) {
      console.log('❌ No file in request');
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      return res.status(400).json({ message: 'कृपया फाइल निवडा' });
    }

    console.log('✅ File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size + ' bytes',
      encoding: req.file.encoding,
      fieldname: req.file.fieldname
    });

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('❌ File buffer is empty');
      return res.status(400).json({ message: 'फाइल रिकामी आहे' });
    }

    console.log('📖 Reading file buffer, size:', req.file.buffer.length);

    // Parse Excel/CSV file
    let workbook;
    try {
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'csv' || req.file.mimetype.includes('csv') || req.file.mimetype === 'text/plain') {
        // For CSV files, convert buffer to string first
        const csvString = req.file.buffer.toString('utf-8');
        console.log('📄 CSV content preview:', csvString.substring(0, 200));
        workbook = XLSX.read(csvString, { type: 'string' });
      } else {
        // For Excel files
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      }
      console.log('✅ Workbook parsed successfully');
    } catch (parseError) {
      console.error('❌ XLSX.parse error:', parseError);
      return res.status(400).json({ 
        message: 'फाइल पार्स करताना त्रुटी. कृपया योग्य Excel/CSV फाइल निवडा.',
        error: parseError.message 
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ message: 'फाइलमध्ये कोणतेही sheet नाही' });
    }

    const sheetName = workbook.SheetNames[0];
    console.log('📄 Using sheet:', sheetName);

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      console.log('📊 Raw data rows:', jsonData.length);
      
      // Log first few rows for debugging
      console.log('📋 First 3 rows:', jsonData.slice(0, 3));
    } catch (sheetError) {
      console.error('❌ Sheet to JSON error:', sheetError);
      return res.status(400).json({ 
        message: 'शीट डेटा कन्व्हर्ट करताना त्रुटी',
        error: sheetError.message 
      });
    }

    if (jsonData.length < 2) {
      return res.status(400).json({ 
        message: 'फाइलमध्ये पुरेसा डेटा नाही. किमान header आणि एक पंक्ती आवश्यक आहे.' 
      });
    }

    // Get headers from first row
    const headers = jsonData[0] || [];
    console.log('📋 Headers found:', headers);

    // Check if headers are present
    if (headers.length < 4) {
      return res.status(400).json({ 
        message: 'अवैध फाइल फॉरमॅट. किमान 4 स्तंभ आवश्यक आहेत.',
        headers: headers 
      });
    }

    // Process data rows
    const items = [];
    const errors = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 1;
      
      // Skip empty rows
      if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
        console.log(`Row ${rowNumber} is empty, skipping`);
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

      console.log(`Row ${rowNumber} values:`, {
        name: itemName,
        category: categoryInput,
        unit: unitInput,
        required: requiredInput
      });

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

      // Map unit
      const unit = mapUnit(unitInput);

      // Parse required quantity
      const required = parseFloat(requiredInput);
      if (isNaN(required) || required <= 0) {
        errors.push(`पंक्ती ${rowNumber}: अवैध प्रमाण - ${requiredInput}`);
        continue;
      }

      // Check if item already exists
      try {
        const existingItem = await PrasadItem.findOne({ 
          name: { $regex: new RegExp(`^${itemName}$`, 'i') },
          category: category
        });

        if (existingItem) {
          errors.push(`पंक्ती ${rowNumber}: '${itemName}' ही वस्तू आधीपासून अस्तित्वात आहे`);
          continue;
        }
      } catch (dbError) {
        console.error(`❌ Database check error for row ${rowNumber}:`, dbError);
        errors.push(`पंक्ती ${rowNumber}: डेटाबेस तपासणीत त्रुटी`);
        continue;
      }

      items.push({
        name: itemName,
        category: category,
        unit: unit,
        required: required,
        received: 0
      });
    }

    console.log(`📦 Valid items to insert: ${items.length}`);
    console.log(`❌ Errors found: ${errors.length}`);

    // Bulk insert
    if (items.length > 0) {
      try {
        const result = await PrasadItem.insertMany(items);
        console.log(`✅ Successfully inserted ${result.length} items`);
        
        return res.status(200).json({
          success: true,
          message: `${result.length} वस्तू यशस्वीरित्या अपलोड झाल्या`,
          imported: result.length,
          failed: errors.length,
          errors: errors
        });
      } catch (dbError) {
        console.error('❌ Database insert error:', dbError);
        return res.status(500).json({ 
          message: 'डेटाबेसमध्ये वस्तू जोडताना त्रुटी',
          error: dbError.message 
        });
      }
    } else {
      console.log('❌ No valid items to insert');
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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    console.log('========== IMPORT ENDED ==========');
  }
});

// ===== DOWNLOAD IMPORT TEMPLATE =====
router.get('/template', protect, adminOnly, async (req, res) => {
  try {
    const { format = 'excel' } = req.query;
    console.log(`📥 Generating template in format: ${format}`);
    
    const templateData = [
      ['वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक प्रमाण'],
      ['तांदूळ', 'महाप्रसाद', 'kg', '100'],
      ['साखर', 'महाप्रसाद', 'kg', '50'],
      ['केळी', 'इतर', 'gram', '500'],
      ['दूध', 'अभिषेक', 'liter', '20'],
      ['तूप', 'महाप्रसाद', 'gram', '1000'],
      ['नारळ', 'इतर', 'piece', '10']
    ];

    if (format === 'csv') {
      // Create CSV
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=prasad_items_template.csv');
      res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent));
      res.send('\uFEFF' + csvContent); // Add BOM for UTF-8
    } else {
      // Create Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // वस्तूचे नाव
        { wch: 15 }, // श्रेणी
        { wch: 10 }, // एकक
        { wch: 15 }  // आवश्यक प्रमाण
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
/**
 * @route   POST /api/items/import
 * @desc    Import items from Excel/CSV file (SIMPLIFIED DEBUG VERSION)
 * @access  Admin only
 */
router.post('/import', protect, adminOnly, upload.single('file'), async (req, res) => {
  console.log('='.repeat(50));
  console.log('📥 IMPORT ROUTE HIT - DEBUG VERSION');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Step 1: Check if file exists
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ 
        success: false,
        message: 'कृपया फाइल निवडा' 
      });
    }

    console.log('✅ File received:');
    console.log('  - Name:', req.file.originalname);
    console.log('  - Type:', req.file.mimetype);
    console.log('  - Size:', req.file.size);
    console.log('  - Buffer exists:', !!req.file.buffer);
    console.log('  - Buffer length:', req.file.buffer?.length);

    // Step 2: Try to parse the file
    let workbook;
    try {
      console.log('📖 Attempting to parse file...');
      
      // Check if xlsx is available
      if (!XLSX) {
        console.log('❌ XLSX library not found');
        return res.status(500).json({
          success: false,
          message: 'XLSX library not installed. Please run: npm install xlsx'
        });
      }

      // Try different parsing methods
      if (req.file.originalname.endsWith('.csv')) {
        const csvString = req.file.buffer.toString('utf-8');
        console.log('📄 CSV content preview:', csvString.substring(0, 200));
        workbook = XLSX.read(csvString, { type: 'string' });
      } else {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      }
      
      console.log('✅ File parsed successfully');
      console.log('📑 Sheets found:', workbook.SheetNames);
    } catch (parseError) {
      console.error('❌ Parse error:', parseError);
      console.error('Error stack:', parseError.stack);
      return res.status(400).json({
        success: false,
        message: 'फाइल पार्स करताना त्रुटी',
        error: parseError.message
      });
    }

    // Step 3: Get first sheet
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'फाइलमध्ये कोणतेही sheet नाही'
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Step 4: Convert to JSON
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('📊 Data rows:', jsonData.length);
      console.log('📋 First row (headers):', jsonData[0]);
      console.log('📋 Second row (first data):', jsonData[1]);
    } catch (sheetError) {
      console.error('❌ Sheet to JSON error:', sheetError);
      return res.status(400).json({
        success: false,
        message: 'शीट डेटा कन्व्हर्ट करताना त्रुटी'
      });
    }

    // Step 5: Return success with data preview
    return res.status(200).json({
      success: true,
      message: 'फाइल यशस्वीरित्या पार्स झाली',
      debug: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheetName: sheetName,
        totalRows: jsonData.length,
        headers: jsonData[0] || [],
        firstDataRow: jsonData[1] || [],
        sampleData: jsonData.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'सर्व्हर त्रुटी',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;