const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============ FIXED CORS CONFIGURATION ============
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://ram-mandir-rdgj.vercel.app',
  'https://ram-mandir-frontend.onrender.com',
  'https://rammandir2026.netlify.app',  // Your Netlify frontend
  /\.netlify\.app$/, // Allows all Netlify preview deployments
  /\.onrender\.com$/
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      console.log('🚫 Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());

// Import models
require('./models/Admin');
require('./models/PrasadItem');
require('./models/Donation');
require('./models/Service');

// ============ FIXED PORT HANDLING FOR RENDER ============
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected to Atlas');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.log('❌ MongoDB Error:', err.message);
  });

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'श्री राम मंदिर API',
    status: 'running',
    timestamp: new Date(),
    frontend: 'https://rammandir2026.netlify.app'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CORS is working!',
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

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Allowed origins: ${allowedOrigins.filter(o => typeof o === 'string').join(', ')}`);
});