const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============ UPDATED CORS CONFIGURATION ============
// Allow multiple origins including your Netlify frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://rammandir2026.netlify.app', // Your Netlify frontend
  'https://ram-mandir-back.onrender.com', // Your Render backend (if needed)
  /\.netlify\.app$/ // This regex allows ALL Netlify apps (useful for preview deployments)
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      console.log('🚫 Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  optionsSuccessStatus: 200
}));

// ============ ADDITIONAL SECURITY HEADERS ============
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
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
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    frontend: 'https://rammandir2026.netlify.app/',
    backend: 'https://ram-mandir-back.onrender.com/'
  });
});

// Test route to verify CORS is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CORS is working correctly!',
    origin: req.headers.origin || 'No origin'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/items', require('./routes/items'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/services', require('./routes/services'));
app.use('/api/public', require('./routes/public'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS Error', 
      message: 'Origin not allowed',
      origin: req.headers.origin 
    });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 CORS enabled for: ${allowedOrigins.filter(o => typeof o === 'string').join(', ')}`);
  console.log(`🌐 Netlify frontend: https://rammandir2026.netlify.app/`);
});