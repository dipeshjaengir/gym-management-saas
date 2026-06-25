import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SuperAdmin, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, loginSchema } from '../middleware/validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-india-gym-saas-2026';

// Temporary Endpoint to Seed Production Database
router.get('/temp-seed', async (req, res) => {
  if (req.query.secret !== 'qa-seeder-bypass-secret-2026') {
    return res.status(404).send('Cannot GET /api/auth/temp-seed');
  }
  try {
    const existing = await SuperAdmin.findOne({ email: 'dipeshjangir12@gmail.com' });
    
    const hashedAdminPassword = await bcrypt.hash('As12qw34.@', 10);
    if (!existing) {
      await SuperAdmin.create({
        name: 'Dipesh Jangir (SaaS Admin)',
        email: 'dipeshjangir12@gmail.com',
        passwordHash: hashedAdminPassword,
        role: 'super_admin'
      });
    }

    const hashedOwnerPassword = await bcrypt.hash('owner123', 10);
    
    // 1. Active Gym Owner
    await GymOwner.deleteMany({ email: 'owner@gymledger.com' });
    const owner1 = await GymOwner.create({
      gymName: 'Alpha Fitness Studio',
      ownerName: 'Marcus Vance',
      email: 'owner@gymledger.com',
      passwordHash: hashedOwnerPassword,
      phone: '9876543210',
      role: 'gym_owner',
      status: 'active',
      isTrial: false,
      subscription: {
        planType: '12_months',
        amountPaid: 15000,
        status: 'active',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
      },
      subscriptionHistory: []
    });

    // 2. Suspended Gym Owner
    await GymOwner.deleteMany({ email: 'owner@titan.com' });
    const owner2 = await GymOwner.create({
      gymName: 'Titan Gyms Ltd',
      ownerName: 'Diana Prince',
      email: 'owner@titan.com',
      passwordHash: hashedOwnerPassword,
      phone: '9876543211',
      role: 'gym_owner',
      status: 'suspended',
      isTrial: false,
      subscription: {
        planType: '3_months',
        amountPaid: 5000,
        status: 'expired',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      subscriptionHistory: []
    });

    return res.json({ 
      message: 'Super admin and Gym Owners seeded successfully', 
      admin: 'dipeshjangir12@gmail.com',
      owner1: owner1.email,
      owner2: owner2.email
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// 1. Unified Login Endpoint
router.post('/login', validateBody(loginSchema), async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // A. Check if user is Super Admin
    const superAdmin = await SuperAdmin.findOne({ email });
    if (superAdmin) {
      const match = await bcrypt.compare(password, superAdmin.passwordHash);
      if (!match) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { id: superAdmin._id, email: superAdmin.email, role: 'super_admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await logAudit('Super Admin Logged In', superAdmin.email, req);

      return res.json({
        token,
        user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email, role: 'super_admin' }
      });
    }

    // B. Check if user is Gym Owner
    const gymOwner = await GymOwner.findOne({ email, isDeleted: false });
    if (gymOwner) {
      const match = await bcrypt.compare(password, gymOwner.passwordHash);
      if (!match) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      // Check status & subscription blockers
      if (gymOwner.status === 'pending_activation') {
        return res.status(403).json({
          message: 'Your account is pending activation. Please use the activation link to set a password and activate your account.',
          status: 'pending_activation'
        });
      }

      const now = new Date();
      if (new Date(gymOwner.subscription.expiryDate) < now && gymOwner.subscription.status === 'active') {
        gymOwner.subscription.status = 'expired';
        await gymOwner.save();
      }

      // Suspended status check is now handled at route middleware level to allow read-only dashboard access.
      // So we allow login here.

      const token = jwt.sign(
        { id: gymOwner._id, email: gymOwner.email, role: 'gym_owner', gymName: gymOwner.gymName },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await logAudit('Gym Owner Logged In', gymOwner.email, req);

      return res.json({
        token,
        user: {
          id: gymOwner._id,
          ownerName: gymOwner.ownerName,
          gymName: gymOwner.gymName,
          email: gymOwner.email,
          role: 'gym_owner',
          subscription: gymOwner.subscription,
          branding: gymOwner.branding,
          subscriptionHistory: gymOwner.subscriptionHistory,
          isTrial: gymOwner.isTrial,
          status: gymOwner.status
        }
      });
    }

    return res.status(400).json({ message: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Fetch Active Session User Details
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });

  try {
    if (req.user.role === 'super_admin') {
      const admin = await SuperAdmin.findById(req.user.id).select('-passwordHash');
      return res.json({ user: admin });
    } else {
      const owner = await GymOwner.findById(req.user.id).select('-passwordHash');
      return res.json({ user: owner });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving profile.' });
  }
});

export default router;
