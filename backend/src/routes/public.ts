import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PlatformLead, GymOwner, AuditLog, Coupon, PlatformPlan } from '../models';
import { validateBody, freeTrialSchema } from '../middleware/validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-india-gym-saas-2026';

// 1. GET Subscription Plans Pricing (INR ₹)
router.get('/plans', async (req, res) => {
  try {
    const plans = await PlatformPlan.find({ isDeleted: false, status: 'active' }).sort({ price: 1 });
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching platform plans.' });
  }
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
  const { gymName, ownerName, email, phone, password } = req.body;

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

    // D. Create Gym Owner (Active status immediately for trial signup)
    const owner = await GymOwner.create({
      gymName,
      ownerName,
      email,
      passwordHash,
      phone,
      address: '',
      role: 'gym_owner',
      status: 'active',
      isTrial: true,
      branding: {
        gymName,
        address: '',
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
      { id: owner._id, email: owner.email, role: 'gym_owner', gymName: owner.gymName },
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

// 4. GET Retrieve Gym Owner for Activation Check
router.get('/activate-account/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const owner = await GymOwner.findOne({
      activationToken: token,
      activationTokenExpiry: { $gt: new Date() },
      isDeleted: false
    });

    if (!owner) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired activation link.' });
    }

    return res.json({
      valid: true,
      owner: {
        id: owner._id,
        gymName: owner.gymName,
        ownerName: owner.ownerName,
        email: owner.email
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error validating activation token.' });
  }
});

// 5. POST Activate Gym Owner (sets password and changes status to active)
router.post('/activate-account/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return res.status(400).json({ message: 'Password and password confirmation are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const owner = await GymOwner.findOne({
      activationToken: token,
      activationTokenExpiry: { $gt: new Date() },
      isDeleted: false
    });

    if (!owner) {
      return res.status(400).json({ message: 'Invalid or expired activation link.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    owner.passwordHash = passwordHash;
    owner.status = 'active';
    owner.activationToken = null;
    owner.activationTokenExpiry = null;
    await owner.save();

    await AuditLog.create({
      action: `Account Activated: ${owner.gymName} (${owner.email})`,
      user: `${owner.email} (Self Activation)`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date()
    });

    // Generate JWT Token for Auto-Login
    const loginToken = jwt.sign(
      { id: owner._id, email: owner.email, role: 'gym_owner', gymName: owner.gymName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Account activated successfully!',
      token: loginToken,
      email: owner.email,
      user: {
        id: owner._id,
        name: owner.ownerName,
        ownerName: owner.ownerName,
        gymName: owner.gymName,
        email: owner.email,
        role: owner.role,
        subscription: owner.subscription,
        branding: owner.branding
      }
    });
  } catch (err) {
    console.error('Account activation error:', err);
    return res.status(500).json({ message: 'Error during account activation.' });
  }
});

// 6. POST Validate Discount Coupon
router.post('/validate-coupon', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ valid: false, message: 'Coupon code is required.' });
  }

  try {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isDeleted: false,
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code.' });
    }

    const now = new Date();
    if (new Date(coupon.expiryDate) < now) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired.' });
    }

    if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit reached.' });
    }

    return res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error validating coupon.' });
  }
});

// 7. GET active, unexpired coupons
router.get('/active-coupons', async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isDeleted: false,
      isActive: true,
      expiryDate: { $gt: now }
    }).sort({ createdAt: -1 });
    return res.json(coupons);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving active coupons.' });
  }
});

export default router;
