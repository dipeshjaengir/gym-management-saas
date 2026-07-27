import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { SuperAdmin } from '../models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-saas';

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'YOUR_SUPERADMIN_EMAIL';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'YOUR_STRONG_SUPERADMIN_PASSWORD';

export async function ensureDefaultSuperAdmin() {
  try {
    const existingAdmin = await SuperAdmin.findOne({ email: SUPERADMIN_EMAIL });
    if (!existingAdmin) {
      const hashedAdminPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
      await SuperAdmin.create({
        name: 'Super Admin',
        email: SUPERADMIN_EMAIL,
        passwordHash: hashedAdminPassword,
        role: 'super_admin'
      });
      console.log(`[AUTO-SEED] Created default Super Admin: ${SUPERADMIN_EMAIL}`);
    } else {
      console.log(`[AUTO-SEED] Default Super Admin already exists: ${existingAdmin.email}.`);
    }
  } catch (err) {
    console.error('[AUTO-SEED ERROR] Failed to seed default Super Admin:', err);
  }
}

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DATABASE CONNECTED] Successfully connected to MongoDB');
    await ensureDefaultSuperAdmin();
  } catch (err) {
    console.error('[DATABASE CONNECTION ERROR] Failed to connect to MongoDB:', err);
    console.warn('[DATABASE WARNING] Verify that your MongoDB service is running or check your connection string.');
    process.exit(1);
  }
}
