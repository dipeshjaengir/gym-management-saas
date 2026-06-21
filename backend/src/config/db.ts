import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-saas';

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DATABASE CONNECTED] Successfully connected to MongoDB');
  } catch (err) {
    console.error('[DATABASE CONNECTION ERROR] Failed to connect to MongoDB:', err);
    console.warn('[DATABASE WARNING] Verify that your MongoDB service is running or check your connection string.');
    process.exit(1);
  }
}
