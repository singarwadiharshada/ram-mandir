const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { protect, superAdminOnly, canModifyAdmin } = require('../middleware/auth');

// Get all admins (super_admin only)
router.get('/', protect, superAdminOnly, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current admin profile
router.get('/profile', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new admin (super_admin only)
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'सर्व फील्ड भरा: वापरकर्ता नाव, ईमेल, पासवर्ड' 
      });
    }

    const existingAdmin = await Admin.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        error: 'वापरकर्ता नाव किंवा ईमेल आधीपासून अस्तित्वात आहे' 
      });
    }

    if (role === 'super_admin') {
      const superAdminExists = await Admin.superAdminExists();
      if (superAdminExists) {
        return res.status(400).json({ 
          error: 'फक्त एकच मुख्य प्रशासक असू शकतो' 
        });
      }
    }

    const admin = await Admin.create({
      username,
      email,
      password,
      role: role || 'admin',
      createdBy: req.user.id
    });

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json(adminResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update admin (super_admin or self)
router.put('/:id', protect, canModifyAdmin, async (req, res) => {
  try {
    const { username, email, password, isActive } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (isActive !== undefined && req.user.role === 'super_admin') {
      updateData.isActive = isActive;
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'पासवर्ड किमान ६ अक्षरांचा असावा' 
        });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (req.body.role && req.user.role === 'super_admin') {
      if (req.body.role === 'super_admin') {
        const targetAdmin = await Admin.findById(req.params.id);
        if (targetAdmin && targetAdmin.role !== 'super_admin') {
          const superAdminExists = await Admin.superAdminExists();
          if (superAdminExists) {
            return res.status(400).json({ 
              error: 'फक्त एकच मुख्य प्रशासक असू शकतो' 
            });
          }
        }
      }
      updateData.role = req.body.role;
    }

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ error: 'प्रशासक सापडला नाही' });
    }

    res.json(admin);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete admin (super_admin only)
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'प्रशासक सापडला नाही' });
    }

    if (admin.role === 'super_admin') {
      return res.status(403).json({ 
        error: 'मुख्य प्रशासक हटवू शकत नाही' 
      });
    }

    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'प्रशासक यशस्वीरित्या हटवला' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle admin status (super_admin only)
router.patch('/:id/toggle-status', protect, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'प्रशासक सापडला नाही' });
    }

    if (admin.role === 'super_admin') {
      return res.status(403).json({ 
        error: 'मुख्य प्रशासक निष्क्रिय करू शकत नाही' 
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.json(adminResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;