const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'वापरकर्ता नाव आणि पासवर्ड आवश्यक आहे' 
      });
    }

    // Find admin by username or email
    const admin = await Admin.findOne({ 
      $or: [{ username }, { email: username }],
      isActive: true 
    });

    if (!admin) {
      return res.status(401).json({ 
        error: 'वापरकर्ता नाव किंवा पासवर्ड चुकीचा आहे' 
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'वापरकर्ता नाव किंवा पासवर्ड चुकीचा आहे' 
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isSuperAdmin: admin.role === 'super_admin'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    res.json({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isSuperAdmin: admin.role === 'super_admin'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'सध्याचा आणि नवीन पासवर्ड आवश्यक आहे' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'नवीन पासवर्ड किमान ६ अक्षरांचा असावा' 
      });
    }

    const admin = await Admin.findById(req.user.id);
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'सध्याचा पासवर्ड चुकीचा आहे' 
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'पासवर्ड यशस्वीरित्या बदलला' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create initial super admin (run once)
router.post('/setup', async (req, res) => {
  try {
    const superAdminExists = await Admin.superAdminExists();
    
    if (superAdminExists) {
      return res.status(400).json({ 
        error: 'मुख्य प्रशासक आधीपासून अस्तित्वात आहे' 
      });
    }

    const admin = await Admin.create({
      username: 'superadmin',
      email: 'admin@shrirammandir.com',
      password: 'Admin@123',
      role: 'super_admin'
    });

    res.json({ 
      message: 'मुख्य प्रशासक यशस्वीरित्या तयार झाला',
      credentials: {
        username: 'superadmin',
        password: 'Admin@123'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;