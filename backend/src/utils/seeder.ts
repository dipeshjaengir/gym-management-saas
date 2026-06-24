import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { SuperAdmin, GymOwner, PlatformLead, MembershipPlan, Member, Payment, Attendance, Trainer, AuditLog } from '../models';

async function seed() {
  console.log('[SEEDER] Starting database seeding process...');

  try {
    // 1. Connect to Database
    await connectDatabase();

    // Check if Super Admin already exists
    const existingAdmin = await SuperAdmin.findOne({ email: 'dipeshjangir12@gmail.com' });
    let admin;
    if (existingAdmin) {
      console.log(`[SEEDER] Super Admin already exists: ${existingAdmin.email}. Retaining existing credentials.`);
      admin = existingAdmin;
    } else {
      // Clear existing Super Admin collections only if none exists
      await SuperAdmin.deleteMany({});
      const hashedAdminPassword = await bcrypt.hash('As12qw34.@', 10);
      admin = await SuperAdmin.create({
        name: 'Dipesh Jangir (SaaS Admin)',
        email: 'dipeshjangir12@gmail.com',
        passwordHash: hashedAdminPassword,
        role: 'super_admin'
      });
      console.log(`[SEEDER] Created Super Admin: ${admin.email}`);
    }

    // Clear and seed other collections to ensure clean tenant slate
    await GymOwner.deleteMany({});
    await PlatformLead.deleteMany({});
    await MembershipPlan.deleteMany({});
    await Member.deleteMany({});
    await Payment.deleteMany({});
    await Attendance.deleteMany({});
    await Trainer.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[SEEDER] Cleared existing tenant database records.');

    // 2. Hash Default Passwords
    const hashedOwnerPassword = await bcrypt.hash('owner123', 10);

    // 4. Seed Platform Leads (CRM Board)
    const lead1 = await PlatformLead.create({
      name: 'Rajesh Kumar',
      phone: '9876543210',
      city: 'Delhi',
      interestedPlan: '6_month',
      source: 'whatsapp',
      status: 'negotiation'
    });

    const lead2 = await PlatformLead.create({
      name: 'Priya Sharma',
      phone: '8765432109',
      city: 'Mumbai',
      interestedPlan: '12_month',
      source: 'website',
      status: 'new'
    });

    const lead3 = await PlatformLead.create({
      name: 'Vikram Singh',
      phone: '7654321098',
      city: 'Bangalore',
      interestedPlan: '3_month',
      source: 'instagram',
      status: 'converted'
    });

    const lead4 = await PlatformLead.create({
      name: 'Amit Patel',
      phone: '6543210987',
      city: 'Ahmedabad',
      interestedPlan: '1_month',
      source: 'facebook',
      status: 'lost'
    });
    console.log('[SEEDER] Created 4 CRM platform leads.');

    // 5. Seed Gym Owners (Tenants)
    const owner1 = await GymOwner.create({
      gymName: 'Iron Forge Fitness',
      ownerName: 'Marcus Vance',
      email: 'owner@ironforge.com',
      passwordHash: hashedOwnerPassword,
      phone: '9999888877',
      address: 'Indiranagar, Bangalore, Karnataka',
      role: 'gym_owner',
      branding: {
        gymName: 'Iron Forge Fitness',
        address: '100 Feet Road, Indiranagar, Bangalore',
        contactNumber: '9999888877',
        whatsAppNumber: '9999888877',
        logo: ''
      },
      subscription: {
        planType: '6_month',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Started 30 days ago
        expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // Expiers in 150 days
        status: 'active',
        amountPaid: 4499
      }
    });

    const owner2 = await GymOwner.create({
      gymName: 'Titan Gyms',
      ownerName: 'Diana Prince',
      email: 'owner@titan.com',
      passwordHash: hashedOwnerPassword,
      phone: '8888777766',
      address: 'Connaught Place, New Delhi',
      role: 'gym_owner',
      branding: {
        gymName: 'Titan Gyms CP',
        address: 'Radisson Block, CP, New Delhi',
        contactNumber: '8888777766',
        whatsAppNumber: '8888777766',
        logo: ''
      },
      subscription: {
        planType: '1_month',
        startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // Started 31 days ago
        expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
        status: 'expired',
        amountPaid: 999
      }
    });
    console.log(`[SEEDER] Created 2 Gym Owners. Active: ${owner1.email}, Expired: ${owner2.email}`);

    // 6. Seed Gym Membership Plans for Owner 1 (Iron Forge)
    const planMonthly = await MembershipPlan.create({
      gymOwnerId: owner1._id,
      name: 'Gold Monthly Cardio',
      durationMonths: 1,
      price: 1500,
      status: 'active'
    });

    const planQuarterly = await MembershipPlan.create({
      gymOwnerId: owner1._id,
      name: 'Gold Quarterly Strength',
      durationMonths: 3,
      price: 4000,
      status: 'active'
    });

    const planHalfYearly = await MembershipPlan.create({
      gymOwnerId: owner1._id,
      name: 'VIP Half-Yearly Elite',
      durationMonths: 6,
      price: 7500,
      status: 'active'
    });

    const planYearly = await MembershipPlan.create({
      gymOwnerId: owner1._id,
      name: 'Super VIP Annual Legend',
      durationMonths: 12,
      price: 13500,
      status: 'active'
    });
    console.log('[SEEDER] Created 4 membership packages for Iron Forge Fitness.');

    // 7. Seed Gym Members for Owner 1
    // Member 1: Active and Fully Paid
    const member1 = await Member.create({
      gymOwnerId: owner1._id,
      name: 'Rohan Sharma',
      phone: '9888888881',
      email: 'rohan@gmail.com',
      gender: 'male',
      dob: new Date('1995-05-15'),
      height: 178,
      weight: 75,
      address: 'Hal 2nd Stage, Bangalore',
      joiningDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      planId: planQuarterly._id,
      membershipStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      membershipEnd: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      amountPaid: 4000,
      remainingAmount: 0,
      paymentStatus: 'paid',
      qrCode: `GYM-${owner1._id.toString().slice(-4).toUpperCase()}-ROHANS1`,
      emergencyContact: '9888888801',
      notes: 'Prefers early morning workout sessions.'
    });

    // Member 2: Active with Outstanding Dues (Partial Payment)
    const member2 = await Member.create({
      gymOwnerId: owner1._id,
      name: 'Anjali Desai',
      phone: '9888888882',
      email: 'anjali@gmail.com',
      gender: 'female',
      dob: new Date('1998-09-20'),
      height: 162,
      weight: 54,
      address: 'Domlur, Bangalore',
      joiningDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      planId: planHalfYearly._id,
      membershipStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      membershipEnd: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000),
      amountPaid: 5000,
      remainingAmount: 2500, // Due ₹2,500
      paymentStatus: 'partial',
      qrCode: `GYM-${owner1._id.toString().slice(-4).toUpperCase()}-ANJALID2`,
      emergencyContact: '9888888802',
      notes: 'Goal is cardio and core strength.'
    });

    // Member 3: Expiring in 3 Days with Outstanding Dues (Unpaid)
    const member3 = await Member.create({
      gymOwnerId: owner1._id,
      name: 'Karan Malhotra',
      phone: '9888888883',
      email: 'karan@gmail.com',
      gender: 'male',
      dob: new Date('1992-02-10'),
      height: 182,
      weight: 88,
      address: 'Koramangala, Bangalore',
      joiningDate: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
      planId: planMonthly._id,
      membershipStart: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
      membershipEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Expiring in 3 Days
      amountPaid: 0,
      remainingAmount: 1500, // Due ₹1,500
      paymentStatus: 'unpaid',
      qrCode: `GYM-${owner1._id.toString().slice(-4).toUpperCase()}-KARANM3`,
      emergencyContact: '9888888803',
      notes: 'Wants weight training routines.'
    });

    // Member 4: Already Expired
    const member4 = await Member.create({
      gymOwnerId: owner1._id,
      name: 'Siddharth Nair',
      phone: '9888888884',
      email: 'sid@gmail.com',
      gender: 'male',
      dob: new Date('1990-12-05'),
      height: 175,
      weight: 80,
      address: 'Jayanagar, Bangalore',
      joiningDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      planId: planMonthly._id,
      membershipStart: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      membershipEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
      amountPaid: 1500,
      remainingAmount: 0,
      paymentStatus: 'paid',
      qrCode: `GYM-${owner1._id.toString().slice(-4).toUpperCase()}-SIDN44`,
      emergencyContact: '9888888804',
      notes: 'Locker #15 assigned.'
    });

    console.log('[SEEDER] Created 4 gym members (with active, partial-dues, soon-expiring, and expired states).');

    // 8. Seed Payments for Owner 1
    await Payment.create({
      gymOwnerId: owner1._id,
      memberId: member1._id,
      amount: 4000,
      pendingAmount: 0,
      paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      paymentMethod: 'upi',
      receiptNumber: 'REC-20260606-1122',
      notes: 'Quarterly full payment'
    });

    await Payment.create({
      gymOwnerId: owner1._id,
      memberId: member2._id,
      amount: 5000,
      pendingAmount: 2500,
      paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paymentMethod: 'bank_transfer',
      receiptNumber: 'REC-20260611-3344',
      notes: 'Initial partial payment'
    });

    await Payment.create({
      gymOwnerId: owner1._id,
      memberId: member4._id,
      amount: 1500,
      pendingAmount: 0,
      paymentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      paymentMethod: 'cash',
      receiptNumber: 'REC-20260512-5566',
      notes: 'Paid cash at counter'
    });
    console.log('[SEEDER] Created 3 payments receipt logs.');

    // 9. Seed Daily Check-In Attendance for Owner 1
    const todayStr = new Date().toISOString().split('T')[0];
    await Attendance.create({
      gymOwnerId: owner1._id,
      memberId: member1._id,
      date: todayStr,
      checkInTime: '07:30:15',
      status: 'present'
    });

    await Attendance.create({
      gymOwnerId: owner1._id,
      memberId: member2._id,
      date: todayStr,
      checkInTime: '08:45:22',
      status: 'present'
    });
    console.log('[SEEDER] Created 2 check-in logs for today.');

    // 10. Seed Trainer for Owner 1
    const trainer = await Trainer.create({
      gymOwnerId: owner1._id,
      name: 'Ramesh Powar',
      phone: '9111122222',
      specialization: 'Bodybuilding & CrossFit',
      status: 'active'
    });
    console.log(`[SEEDER] Created Trainer: ${trainer.name}`);

    // 11. Log Seed Audit
    await AuditLog.create({
      action: 'Initial Platform Seed Completed',
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
