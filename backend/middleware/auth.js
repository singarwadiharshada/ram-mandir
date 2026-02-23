const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Verify token and attach user to request
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'कृपया लॉगिन करा' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        error: 'प्रशासक सापडला नाही' 
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({ 
        error: 'खाते निष्क्रिय केले गेले आहे' 
      });
    }

    req.user = admin;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'अवैध किंवा कालबाह्य टोकन' 
    });
  }
};

// Restrict to super_admin only
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'ही क्रिया फक्त मुख्य प्रशासक करू शकतो' 
    });
  }
  next();
};

// Restrict to admin or super_admin
const adminOnly = (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'ही क्रिया फक्त प्रशासक करू शकतात' 
    });
  }
  next();
};

// Check if user can modify this admin
const canModifyAdmin = async (req, res, next) => {
  try {
    // Super admin can modify anyone
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Admin can only modify themselves
    if (req.user.role === 'admin' && req.user.id === req.params.id) {
      return next();
    }

    return res.status(403).json({ 
      error: 'आपण फक्त स्वतःचे खाते संपादित करू शकता' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { protect, superAdminOnly, adminOnly, canModifyAdmin };