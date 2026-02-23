const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../models/Admin');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 MongoDB Connected');

    const superAdminExists = await Admin.superAdminExists();
    
    if (superAdminExists) {
      console.log('❌ मुख्य प्रशासक आधीपासून अस्तित्वात आहे');
      console.log('📝 तुम्ही फक्त सामान्य प्रशासक तयार करू शकता');
      
      rl.question('वापरकर्ता नाव: ', async (username) => {
        rl.question('ईमेल: ', async (email) => {
          rl.question('पासवर्ड (किमान ६ अक्षरे): ', async (password) => {
            try {
              const admin = await Admin.create({
                username,
                email,
                password,
                role: 'admin'
              });
              console.log('✅ प्रशासक यशस्वीरित्या तयार झाला!');
              console.log(`📝 वापरकर्ता नाव: ${username}`);
              rl.close();
              process.exit(0);
            } catch (error) {
              console.error('❌ Error:', error.message);
              rl.close();
              process.exit(1);
            }
          });
        });
      });
    } else {
      const admin = await Admin.create({
        username: 'superadmin',
        email: 'admin@shrirammandir.com',
        password: 'Admin@123',
        role: 'super_admin'
      });

      console.log('✅ मुख्य प्रशासक यशस्वीरित्या तयार झाला!');
      console.log('📝 लॉगिन माहिती:');
      console.log('   वापरकर्ता नाव: superadmin');
      console.log('   पासवर्ड: Admin@123');
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();