const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin'], 
    default: 'admin' 
  },
  lastLogin: { 
    type: Date 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { 
  timestamps: true 
});

// Hash password before save
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Static method to check if superadmin exists
adminSchema.statics.superAdminExists = async function() {
  const count = await this.countDocuments({ role: 'super_admin' });
  return count > 0;
};

// Ensure only one superadmin
adminSchema.pre('save', async function(next) {
  if (this.role === 'super_admin') {
    const existingSuperAdmin = await this.constructor.findOne({ 
      role: 'super_admin',
      _id: { $ne: this._id }
    });
    if (existingSuperAdmin) {
      next(new Error('फक्त एकच मुख्य प्रशासक असू शकतो'));
    }
  }
  next();
});

module.exports = mongoose.model('Admin', adminSchema);