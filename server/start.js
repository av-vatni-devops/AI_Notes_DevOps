const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseConnection() {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Checking MongoDB connection... (Attempt ${attempt}/${maxRetries})`);
      console.log(`📡 Connection string: ${process.env.MONGO_URI ? process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'not set'}`);
      
      // Try to connect with longer timeout for K8s environments
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
        socketTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
      });
      
      console.log('✅ MongoDB connection successful!');
      await mongoose.connection.close();
      
      // Start the server
      console.log('🚀 Starting NeuraNotes server...');
      require('./index.js');
      return; // Success, exit function
      
    } catch (error) {
      lastError = error;
      console.error(`❌ MongoDB connection failed (Attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // All retries failed
  console.error('\n❌ MongoDB connection failed after all retries');
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Make sure MongoDB is running:');
  console.log('   - Windows: Start MongoDB service or run mongod');
  console.log('   - macOS: brew services start mongodb-community');
  console.log('   - Linux: sudo systemctl start mongod');
  console.log('   - Kubernetes: Check if MongoDB pod is running');
  console.log('2. Check your .env file has correct MONGO_URI');
  console.log('3. For local: mongodb://127.0.0.1:27017/neura_notes');
  console.log('4. For K8s: mongodb://mongo:27017/neura_notes');
  console.log('5. Or use MongoDB Atlas (cloud) for easier setup');
  console.log('\n💡 For MongoDB Atlas:');
  console.log('   - Visit: https://cloud.mongodb.com');
  console.log('   - Create free cluster');
  console.log('   - Get connection string');
  console.log('   - Whitelist your IP address');
  console.log('   - Update .env file');
  
  process.exit(1);
}

// Run the check
checkDatabaseConnection();

