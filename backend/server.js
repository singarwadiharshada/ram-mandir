const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import models (to register them with mongoose)
require('./models/Admin');
require('./models/PrasadItem');
require('./models/Donation');
require('./models/Service');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected to Atlas');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.log('❌ MongoDB Error:', err);
    console.log('💡 Make sure:');
    console.log('   1. Your IP is whitelisted in MongoDB Atlas');
    console.log('   2. Username and password are correct');
    console.log('   3. Connection string is correct');
  });

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'श्री राम मंदिर API',
    status: 'running',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/items', require('./routes/items'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/services', require('./routes/services'));
app.use('/api/public', require('./routes/public'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});