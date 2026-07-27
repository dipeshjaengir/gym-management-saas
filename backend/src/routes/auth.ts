import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { SuperAdmin, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, loginSchema } from '../middleware/validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-india-gym-saas-2026';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


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
      const providers = superAdmin.authProviders || ['password'];
      if (!providers.includes('password')) {
        return res.status(400).json({ message: 'This account uses Google Sign-In.' });
      }

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
      const providers = gymOwner.authProviders || ['password'];
      if (!providers.includes('password')) {
        return res.status(400).json({ message: 'This account uses Google Sign-In.' });
      }

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

// 3. Google OAuth Sign-In
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential token is required.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token payload.' });
    }

    const email = payload.email;

    // A. Check if user is Super Admin
    const superAdmin = await SuperAdmin.findOne({ email });
    if (superAdmin) {
      const providers = superAdmin.authProviders || ['password'];
      if (!providers.includes('google')) {
        return res.status(400).json({ 
          message: 'This email is already registered using email/password. Please log in with your password first and link your Google account from Account Settings.' 
        });
      }

      const token = jwt.sign(
        { id: superAdmin._id, email: superAdmin.email, role: 'super_admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await logAudit('Super Admin Logged In via Google', superAdmin.email, req);

      return res.json({
        token,
        user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email, role: 'super_admin' }
      });
    }

    // B. Check if user is Gym Owner
    const gymOwner = await GymOwner.findOne({ email, isDeleted: false });
    if (gymOwner) {
      const providers = gymOwner.authProviders || ['password'];
      if (!providers.includes('google')) {
        return res.status(400).json({ 
          message: 'This email is already registered using email/password. Please log in with your password first and link your Google account from Account Settings.' 
        });
      }

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

      const token = jwt.sign(
        { id: gymOwner._id, email: gymOwner.email, role: 'gym_owner', gymName: gymOwner.gymName },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await logAudit('Gym Owner Logged In via Google', gymOwner.email, req);

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

    // C. Create new Google account
    const newOwner = await GymOwner.create({
      ownerName: payload.name || 'Gym Owner',
      gymName: `${payload.name || 'My'}'s Gym`,
      email: email,
      phone: '0000000000',
      status: 'active',
      isTrial: true,
      subscription: {
        planType: '1_month',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
        status: 'active',
        amountPaid: 0
      },
      authProviders: ['google'],
      googleId: payload.sub
    });

    const token = jwt.sign(
      { id: newOwner._id, email: newOwner.email, role: 'gym_owner', gymName: newOwner.gymName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit('Gym Owner Registered via Google', newOwner.email, req);

    return res.status(201).json({
      token,
      user: {
        id: newOwner._id,
        ownerName: newOwner.ownerName,
        gymName: newOwner.gymName,
        email: newOwner.email,
        role: 'gym_owner',
        subscription: newOwner.subscription,
        branding: newOwner.branding,
        subscriptionHistory: newOwner.subscriptionHistory,
        isTrial: newOwner.isTrial,
        status: newOwner.status
      }
    });
  } catch (err: any) {
    console.error('Google login error:', err);
    return res.status(500).json({ message: err.message || 'Failed to authenticate with Google.' });
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

// 4. Link Google Account
router.post('/link-google', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });

  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'Google credential token is required.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token payload.' });
    }

    const googleEmail = payload.email;

    // Verify Google email matches account email
    if (googleEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({ 
        message: `Google account email (${googleEmail}) does not match your registered account email (${req.user.email}).` 
      });
    }

    // Check if another account is already linked to this googleId or google email
    const duplicateOwner = await GymOwner.findOne({ 
      $or: [{ googleId: payload.sub }, { email: googleEmail, authProviders: 'google' }], 
      _id: { $ne: req.user.id } 
    });
    if (duplicateOwner) {
      return res.status(400).json({ message: 'This Google account is already linked to another user.' });
    }

    // Link the provider
    if (req.user.role === 'super_admin') {
      const admin = await SuperAdmin.findById(req.user.id);
      if (!admin) return res.status(404).json({ message: 'User not found.' });

      admin.googleId = payload.sub;
      const providers = admin.authProviders || ['password'];
      if (!providers.includes('google')) {
        providers.push('google');
      }
      admin.authProviders = providers;
      await admin.save();

      await logAudit('Super Admin Linked Google Account', admin.email, req);

      return res.json({ 
        message: 'Google account linked successfully.', 
        authProviders: admin.authProviders 
      });
    } else {
      const owner = await GymOwner.findById(req.user.id);
      if (!owner) return res.status(404).json({ message: 'User not found.' });

      owner.googleId = payload.sub;
      const providers = owner.authProviders || ['password'];
      if (!providers.includes('google')) {
        providers.push('google');
      }
      owner.authProviders = providers;
      await owner.save();

      await logAudit('Gym Owner Linked Google Account', owner.email, req);

      return res.json({ 
        message: 'Google account linked successfully.', 
        authProviders: owner.authProviders 
      });
    }

  } catch (err: any) {
    console.error('Google linking error:', err);
    return res.status(500).json({ message: err.message || 'Failed to link Google account.' });
  }
});

export default router;
