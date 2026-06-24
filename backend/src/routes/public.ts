import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PlatformLead, GymOwner, AuditLog } from '../models';
import { validateBody, freeTrialSchema } from '../middleware/validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-india-gym-saas-2026';

// 1. GET Subscription Plans Pricing (INR ₹)
router.get('/plans', (req, res) => {
  return res.json([
    { id: '1_month', name: '1 Month Kickstart', durationMonths: 1, price: 999, description: 'Best for trying out the platform and onboarding.' },
    { id: '3_month', name: '3 Month Growth', durationMonths: 3, price: 2499, description: 'Optimal for growing gyms to stabilize collections.' },
    { id: '6_month', name: '6 Month Premium', durationMonths: 6, price: 4499, description: 'Popular plan with QR scanners and expiry warn tools.' },
    { id: '12_month', name: '12 Month Scale', durationMonths: 12, price: 7999, description: 'Best value for established gym networks.' }
  ]);
});

// 2. POST Demo request inquiry (logs to CRM Leads Board)
router.post('/leads', async (req, res) => {
  const { name, phone, city, interestedPlan, source } = req.body;

  if (!name || !phone || !city) {
    return res.status(400).json({ message: 'Name, Phone, and City are required to log an inquiry.' });
  }

  try {
    const lead = await PlatformLead.create({
      name,
      phone,
      city,
      interestedPlan: interestedPlan || '1_month',
      source: source || 'website',
      status: 'new'
    });

    console.log(`[INCOMING CRM INQUIRY] Registered lead for ${name} (${phone}) from ${city}`);

    return res.status(201).json({
      message: 'Your inquiry has been logged. Our platform advisor will contact you on WhatsApp shortly!',
      lead
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error submitting demo request.' });
  }
});

// 3. POST Free Trial Onboarding (generates trial account)
router.post('/free-trial', validateBody(freeTrialSchema), async (req, res) => {
  const { gymName, ownerName, email, phone, city, password } = req.body;

  try {
    // A. Check for existing owner
    const existing = await GymOwner.findOne({ email, isDeleted: false });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email is already registered.' });
    }

    // B. Hash user's password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // C. Calculate Expiry Date (7 days from now)
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // D. Create Gym Owner
    const owner = await GymOwner.create({
      gymName,
      ownerName,
      email,
      passwordHash,
      phone,
      address: city,
      role: 'gym_owner',
      isTrial: true,
      branding: {
        gymName,
        address: city,
        contactNumber: phone,
        whatsAppNumber: phone,
        logo: ''
      },
      subscription: {
        planType: '1_month',
        startDate,
        expiryDate,
        status: 'active',
        amountPaid: 0
      }
    });

    // E. Log trial creation in database AuditLogs without password for security
    await AuditLog.create({
      action: `Trial Registered: ${gymName} (${email})`,
      user: `SYSTEM (Free Trial Sign Up)`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date()
    });

    // F. Generate JWT Token for Auto-Login
    const token = jwt.sign(
      { id: owner._id, email: owner.email, role: 'gym_owner' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: '7-Day Free Trial portal created successfully!',
      token,
      email: owner.email,
      user: {
        id: owner._id,
        name: owner.ownerName,
        ownerName: owner.ownerName,
        gymName: owner.gymName,
        email: owner.email,
        role: owner.role,
        subscription: owner.subscription,
        branding: owner.branding,
        isTrial: true
      }
    });
  } catch (err) {
    console.error('Free trial setup error:', err);
    return res.status(500).json({ message: 'Error setting up free trial account.' });
  }
});

export default router;
