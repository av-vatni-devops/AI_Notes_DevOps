const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');
const { mongoConnectionStatus } = require('./metrics');

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    retryWrites: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    mongoConnectionStatus.set(1);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    mongoConnectionStatus.set(0);
    process.exit(1);
  });

// Track MongoDB connection status
mongoose.connection.on('connected', () => {
  mongoConnectionStatus.set(1);
});

mongoose.connection.on('disconnected', () => {
  mongoConnectionStatus.set(0);
});

mongoose.connection.on('error', () => {
  mongoConnectionStatus.set(0);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  mongoConnectionStatus.set(0);
  await mongoose.connection.close();
  process.exit(0);
});
