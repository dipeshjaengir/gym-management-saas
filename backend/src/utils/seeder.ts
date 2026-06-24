import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { SuperAdmin, GymOwner, PlatformLead, MembershipPlan, Member, Payment, Attendance, Trainer, AuditLog } from '../models';

async function seed() {
  console.log('[SEEDER] Starting database seeding process...');

  try {
    // 1. Connect to Database
    await connectDatabase();

    // Clear all collections to ensure a clean slate
    await SuperAdmin.deleteMany({});
    await GymOwner.deleteMany({});
    await PlatformLead.deleteMany({});
    await MembershipPlan.deleteMany({});
    await Member.deleteMany({});
    await Payment.deleteMany({});
    await Attendance.deleteMany({});
    await Trainer.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[SEEDER] Cleared all database collections.');

    // Seed default Super Admin
    const hashedAdminPassword = await bcrypt.hash('As12qw34.@', 10);
    const admin = await SuperAdmin.create({
      name: 'Dipesh Jangir (SaaS Admin)',
      email: 'dipeshjangir12@gmail.com',
      passwordHash: hashedAdminPassword,
      role: 'super_admin'
    });
    console.log(`[SEEDER] Seeded default Super Admin: ${admin.email}`);

    // Log seed audit
    await AuditLog.create({
      action: 'Production DB Clean Seed Completed',
      user: 'SYSTEM',
      ipAddress: '127.0.0.1',
      timestamp: new Date()
    });

    console.log('[SEEDER] Seeding complete! Closing DB connection.');
    mongoose.connection.close();
  } catch (err) {
    console.error('[SEEDER ERROR] Seeding aborted:', err);
    process.exit(1);
  }
}

seed();
