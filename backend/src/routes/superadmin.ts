import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GymOwner, PlatformLead, AuditLog, Member, PlatformPlan, Coupon } from '../models';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import {
  validateBody,
  createLeadSchema,
  createGymOwnerSchema,
  updateLeadSchema,
  updateGymOwnerSchema,
  updateGymOwnerStatusSchema,
  renewGymOwnerSubscriptionSchema,
  createGymOwnerByAdminSchema,
  createPlatformPlanSchema,
  updatePlatformPlanSchema,
  createCouponSchema,
  updateCouponSchema
} from '../middleware/validation';

const router = Router();

// Apply Super Admin restriction to all routes here
router.use(authenticateToken);
router.use(authorizeRoles(['super_admin']));

// ----------------------------------------------------
// 1. DASHBOARD ANALYTICS & STATS
// ----------------------------------------------------
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const owners = await GymOwner.find({ isDeleted: false });
    const membersCount = await Member.countDocuments({ isDeleted: false });
    const coupons = await Coupon.find({ isDeleted: false });

    let activeCount = 0;
    let expiredCount = 0;
    let suspendedCount = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let expectedRenewalRevenue = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let expiringThisMonthCount = 0;
    let renewalsDueCount = 0;
    let trialCount = 0;
    let activeSubscribersCount = 0;
    let suspendedAccountsCount = 0;

    // Plan distribution counters
    const planDistribution: { [key: string]: number } = {
      'Monthly': 0,
      'Quarterly': 0,
      'Half-Yearly': 0,
      'Yearly': 0,
      'Trial/Free': 0,
      'Other': 0
    };

    // Calculate trial conversions
    let convertedOwnersCount = 0;

    owners.forEach(owner => {
      const expDate = new Date(owner.subscription.expiryDate);
      const isExpiringThisMonth = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;

      if (owner.isTrial) {
        trialCount++;
        planDistribution['Trial/Free']++;
      } else {
        const pType = owner.subscription.planType;
        if (pType === 'Monthly' || pType === 'Quarterly' || pType === 'Half-Yearly' || pType === 'Yearly') {
          planDistribution[pType]++;
        } else {
          planDistribution['Other']++;
        }
      }

      // Check if this owner has any paid subscription history entries
      const hasPaid = owner.subscriptionHistory && owner.subscriptionHistory.some((h: any) => h.amountPaid > 0);
      if (hasPaid && !owner.isTrial) {
        convertedOwnersCount++;
      }

      if (owner.status === 'suspended' || owner.subscription.status === 'suspended') {
        suspendedAccountsCount++;
        suspendedCount++;
      } else if (owner.status === 'active' && owner.subscription.status === 'active') {
        activeCount++;
        if (!owner.isTrial) {
          activeSubscribersCount++;
        }
        // Calculate monthly/yearly platform revenue from gym owners subscription dues
        if (owner.subscription.startDate) {
          const startDate = new Date(owner.subscription.startDate);
          if (startDate.getFullYear() === currentYear) {
            yearlyRevenue += owner.subscription.amountPaid;
            if (startDate.getMonth() === currentMonth) {
              monthlyRevenue += owner.subscription.amountPaid;
            }
          }
        }
      } else if (owner.subscription.status === 'expired') {
        expiredCount++;
      }

      if (isExpiringThisMonth) {
        expiringThisMonthCount++;
        renewalsDueCount++;
        expectedRenewalRevenue += owner.subscription.amountPaid;
      }
    });

    // Coupon stats
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const totalCouponUses = coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);

    // Trial conversion rate
    const totalTrialsAndConversions = convertedOwnersCount + trialCount;
    const trialConversionRate = totalTrialsAndConversions > 0
      ? Math.round((convertedOwnersCount / totalTrialsAndConversions) * 100)
      : 0;

    return res.json({
      metrics: {
        totalGymOwners: owners.length,
        activeGymOwners: activeCount,
        expiredGymOwners: expiredCount,
        suspendedGymOwners: suspendedCount,
        totalMembers: membersCount,
        monthlyRevenue,
        yearlyRevenue,
        expectedRenewalRevenue,
        expiringThisMonth: expiringThisMonthCount,
        renewalsDue: renewalsDueCount,
        trialUsers: trialCount,
        activeSubscribers: activeSubscribersCount,
        suspendedAccounts: suspendedAccountsCount,
        
        // Coupon Analytics
        totalCoupons,
        activeCoupons,
        totalCouponUses,

        // Trial conversion
        trialConversionRate,
        convertedOwners: convertedOwnersCount,

        // Plan distribution
        planDistribution
      },
      recentActivities: await AuditLog.find({}).sort({ timestamp: -1 }).limit(10)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving platform statistics.' });
  }
});

// ----------------------------------------------------
// 2. LEAD CRM MANAGEMENT
// ----------------------------------------------------
// GET Leads
router.get('/leads', async (req, res) => {
  try {
    const leads = await PlatformLead.find({ isDeleted: false }).sort({ createdAt: -1 });
    return res.json(leads);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching platform leads.' });
  }
});

// POST Create Lead
router.post('/leads', validateBody(createLeadSchema), async (req: AuthenticatedRequest, res) => {
  const { name, phone, city, interestedPlan, source, status } = req.body;
  if (!name || !phone || !city || !interestedPlan) {
    return res.status(400).json({ message: 'Missing required lead fields.' });
  }

  try {
    const lead = await PlatformLead.create({
      name,
      phone,
      city,
      interestedPlan,
      source,
      status
    });
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating lead.' });
  }
});

// PUT Update Lead
router.put('/leads/:id', validateBody(updateLeadSchema), async (req, res) => {
  try {
    const lead = await PlatformLead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating lead.' });
  }
});

// DELETE Soft Delete Lead
router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await PlatformLead.findByIdAndUpdate(req.params.id, { isDeleted: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    return res.json({ message: 'Lead soft-deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting lead.' });
  }
});

// ----------------------------------------------------
// 3. GYM OWNER OPERATIONS (CRUD & Plan Controls)
// ----------------------------------------------------
// GET Gym Owners
router.get('/owners', async (req, res) => {
  try {
    const owners = await GymOwner.find({ isDeleted: false }).select('-passwordHash').sort({ createdAt: -1 });
    return res.json(owners);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching gym owners directory.' });
  }
});

// POST Create Gym Owner (Activation Token Flow)
router.post('/owners', validateBody(createGymOwnerByAdminSchema), async (req: AuthenticatedRequest, res) => {
  const { gymName, ownerName, email, phone } = req.body;

  try {
    const existing = await GymOwner.findOne({ email, isDeleted: false });
    if (existing) {
      return res.status(400).json({ message: 'A gym owner with this email is already registered.' });
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const owner = await GymOwner.create({
      gymName,
      ownerName,
      email,
      phone,
      passwordHash: '', // pending activation
      status: 'pending_activation',
      activationToken,
      activationTokenExpiry,
      address: '',
      branding: {
        gymName,
        address: '',
        contactNumber: phone,
        whatsAppNumber: phone
      },
      subscription: {
        planType: 'Monthly',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        amountPaid: 0
      },
      subscriptionHistory: [{
        planType: 'Monthly',
        amountPaid: 0,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        renewedBy: req.user!.email,
        transactionDate: new Date()
      }]
    });

    await logAudit(`Gym Owner Pending Activation Created: ${gymName} (${email})`, req.user!.email, req);

    return res.status(201).json({
      message: 'Gym Owner account created in Pending Activation state.',
      owner: {
        id: owner._id,
        gymName: owner.gymName,
        email: owner.email,
        status: owner.status,
        activationToken
      }
    });
  } catch (err) {
    console.error('Error creating owner:', err);
    return res.status(500).json({ message: 'Internal server error during owner creation.' });
  }
});

// PUT Update Gym Owner
router.put('/owners/:id', validateBody(updateGymOwnerSchema), async (req: AuthenticatedRequest, res) => {
  const { gymName, ownerName, email, phone, address } = req.body;

  try {
    const owner = await GymOwner.findOne({ _id: req.params.id, isDeleted: false });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    owner.gymName = gymName || owner.gymName;
    owner.ownerName = ownerName || owner.ownerName;
    owner.email = email || owner.email;
    owner.phone = phone || owner.phone;
    owner.address = address || owner.address;

    await owner.save();
    await logAudit(`Gym Owner Updated: ${owner.gymName}`, req.user!.email, req);

    return res.json(owner);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating owner details.' });
  }
});

// PUT Suspend / Activate Gym Owner
router.put('/owners/:id/status', validateBody(updateGymOwnerStatusSchema), async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  if (!['active', 'suspended', 'pending_activation'].includes(status)) {
    return res.status(400).json({ message: 'Invalid target status.' });
  }

  try {
    const owner = await GymOwner.findOne({ _id: req.params.id, isDeleted: false });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    owner.status = status as any;
    if (status === 'suspended') {
      owner.subscription.status = 'suspended';
    } else if (status === 'active') {
      owner.subscription.status = 'active';
    }
    await owner.save();

    await logAudit(`Account status of ${owner.gymName} updated to: ${status.toUpperCase()}`, req.user!.email, req);

    return res.json({ message: `Gym Owner status successfully updated to ${status}.`, owner });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating owner status.' });
  }
});

// PUT Renew / Extend Subscription
router.put('/owners/:id/renew', validateBody(renewGymOwnerSubscriptionSchema), async (req: AuthenticatedRequest, res) => {
  const { planType, amountPaid } = req.body;
  if (!planType || amountPaid === undefined) {
    return res.status(400).json({ message: 'Missing plan selection parameters.' });
  }

  try {
    const owner = await GymOwner.findOne({ _id: req.params.id, isDeleted: false });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    const now = new Date();
    const currentExpiry = new Date(owner.subscription.expiryDate);
    const startDate = currentExpiry > now ? currentExpiry : now;

    let days = 30;
    // Map custom plan duration if possible, otherwise default monthly/quarterly/half-yearly/yearly mapping
    const plan = await PlatformPlan.findOne({ name: planType, isDeleted: false });
    if (plan) {
      const duration = plan.durationMonths;
      if (duration === 1) days = 30;
      else if (duration === 3) days = 90;
      else if (duration === 6) days = 180;
      else if (duration === 12) days = 365;
      else days = duration * 30;
    } else {
      if (planType.toLowerCase().includes('quarter') || planType === '3_month' || planType === '3 Months') days = 90;
      else if (planType.toLowerCase().includes('half') || planType === '6_month' || planType === '6 Months') days = 180;
      else if (planType.toLowerCase().includes('year') || planType === '12_month' || planType === '12 Months') days = 365;
      else days = 30;
    }
    
    const expiryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    const { transactionId, paymentMethod } = req.body;

    owner.subscription.planType = planType;
    owner.subscription.startDate = startDate;
    owner.subscription.expiryDate = expiryDate;
    owner.subscription.status = 'active';
    owner.subscription.amountPaid = amountPaid;

    // Track Subscription History
    owner.subscriptionHistory = owner.subscriptionHistory || [];
    owner.subscriptionHistory.push({
      planType,
      amountPaid,
      startDate,
      expiryDate,
      renewedBy: req.user!.email,
      transactionDate: new Date(),
      transactionId: transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentMethod: paymentMethod || 'cash',
      status: 'Completed'
    });

    await owner.save();
    await logAudit(`Subscription Renewed for ${owner.gymName} (Plan: ${planType})`, req.user!.email, req);

    return res.json({ message: 'Subscription successfully extended/renewed.', owner });
  } catch (err) {
    return res.status(500).json({ message: 'Error renewing owner plan.' });
  }
});

// DELETE Soft Delete Gym Owner
router.delete('/owners/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const owner = await GymOwner.findByIdAndUpdate(req.params.id, { isDeleted: true });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    await logAudit(`Gym Owner Account Deleted: ${owner.gymName}`, req.user!.email, req);

    return res.json({ message: 'Gym Owner account soft-deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting gym owner.' });
  }
});

// ----------------------------------------------------
// 4. AUDIT TRAILS
// ----------------------------------------------------
router.get('/audits', async (req, res) => {
  try {
    const audits = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    return res.json(audits);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching global audit logs.' });
  }
});

// ----------------------------------------------------
// 5. PLATFORM PLANS CRUD
// ----------------------------------------------------
router.get('/plans', async (req, res) => {
  try {
    const plans = await PlatformPlan.find({ isDeleted: false }).sort({ price: 1 });
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching platform plans.' });
  }
});

router.post('/plans', validateBody(createPlatformPlanSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const plan = await PlatformPlan.create(req.body);
    await logAudit(`Platform Plan Created: ${plan.name}`, req.user!.email, req);
    return res.status(201).json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating platform plan.' });
  }
});

router.put('/plans/:id', validateBody(updatePlatformPlanSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const plan = await PlatformPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plan not found.' });
    await logAudit(`Platform Plan Updated: ${plan.name}`, req.user!.email, req);
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating platform plan.' });
  }
});

router.delete('/plans/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const plan = await PlatformPlan.findByIdAndUpdate(req.params.id, { isDeleted: true });
    if (!plan) return res.status(404).json({ message: 'Plan not found.' });
    await logAudit(`Platform Plan Deleted: ${plan.name}`, req.user!.email, req);
    return res.json({ message: 'Platform plan deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting platform plan.' });
  }
});

// ----------------------------------------------------
// 6. COUPON CRUD
// ----------------------------------------------------
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 });
    return res.json(coupons);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching coupons.' });
  }
});

router.post('/coupons', validateBody(createCouponSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body;
    const existing = await Coupon.findOne({ code: code.toUpperCase(), isDeleted: false });
    if (existing) {
      return res.status(400).json({ message: 'Coupon code already exists.' });
    }
    const coupon = await Coupon.create({
      ...req.body,
      code: code.toUpperCase()
    });
    await logAudit(`Coupon Created: ${coupon.code}`, req.user!.email, req);
    return res.status(201).json(coupon);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating coupon.' });
  }
});

router.put('/coupons/:id', validateBody(updateCouponSchema), async (req: AuthenticatedRequest, res) => {
  try {
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await logAudit(`Coupon Updated: ${coupon.code}`, req.user!.email, req);
    return res.json(coupon);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating coupon.' });
  }
});

router.delete('/coupons/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isDeleted: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await logAudit(`Coupon Deleted: ${coupon.code}`, req.user!.email, req);
    return res.json({ message: 'Coupon deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting coupon.' });
  }
});

// Seed default platform plans if none exist
async function seedDefaultPlans() {
  try {
    const count = await PlatformPlan.countDocuments({ isDeleted: false });
    if (count === 0) {
      const defaults = [
        { name: 'Monthly', price: 179, durationMonths: 1, description: 'Monthly GymLedger Plan', features: ['Member Management', 'QR Check-ins', 'WhatsApp Reminders'], status: 'active' },
        { name: 'Quarterly', price: 449, durationMonths: 3, description: 'Quarterly GymLedger Plan', features: ['Member Management', 'QR Check-ins', 'WhatsApp Reminders', 'Revenue Analytics'], status: 'active' },
        { name: 'Half-Yearly', price: 699, durationMonths: 6, description: 'Half-Yearly GymLedger Plan', features: ['All Quarterly features', 'Multi-Gym Management', 'Premium Support'], status: 'active' },
        { name: 'Yearly', price: 1299, durationMonths: 12, description: 'Yearly GymLedger Plan', features: ['All features included', 'Priority WhatsApp Support', 'Custom Branding'], status: 'active' }
      ];
      await PlatformPlan.insertMany(defaults);
      console.log('[SEED] Default Platform Plans seeded successfully.');
    }
  } catch (err) {
    console.error('[SEED] Error seeding default plans:', err);
  }
}

// Seed default coupons if none exist
async function seedDefaultCoupons() {
  try {
    const count = await Coupon.countDocuments({ isDeleted: false });
    if (count === 0) {
      const tomorrow = new Date();
      tomorrow.setFullYear(tomorrow.getFullYear() + 1); // 1 year expiry
      const defaults = [
        { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, expiryDate: tomorrow, usageLimit: 100, isActive: true },
        { code: 'NEWGYM20', discountType: 'percentage', discountValue: 20, expiryDate: tomorrow, usageLimit: 100, isActive: true },
        { code: 'SUMMER25', discountType: 'percentage', discountValue: 25, expiryDate: tomorrow, usageLimit: 100, isActive: true },
        { code: 'FLAT100', discountType: 'flat', discountValue: 100, expiryDate: tomorrow, usageLimit: 100, isActive: true }
      ];
      await Coupon.insertMany(defaults);
      console.log('[SEED] Default Coupons seeded successfully.');
    }
  } catch (err) {
    console.error('[SEED] Error seeding default coupons:', err);
  }
}

// 7. Unified Global Search for Super Admin
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.json({ owners: [], plans: [], leads: [], coupons: [] });
  }

  try {
    const regex = { $regex: q, $options: 'i' };

    // Search Gym Owners
    const owners = await GymOwner.find({
      isDeleted: false,
      $or: [{ gymName: regex }, { ownerName: regex }, { email: regex }, { phone: regex }]
    }).select('-passwordHash').limit(10);

    // Search Platform Plans
    const plans = await PlatformPlan.find({
      isDeleted: false,
      $or: [{ name: regex }, { description: regex }]
    }).limit(10);

    // Search Platform Leads
    const leads = await PlatformLead.find({
      isDeleted: false,
      $or: [{ name: regex }, { phone: regex }, { city: regex }, { interestedPlan: regex }]
    }).limit(10);

    // Search Coupons
    const coupons = await Coupon.find({
      isDeleted: false,
      $or: [{ code: regex }, { discountType: regex }]
    }).limit(10);

    return res.json({ owners, plans, leads, coupons });
  } catch (err) {
    console.error('Superadmin global search error:', err);
    return res.status(500).json({ message: 'Error performing global search.' });
  }
});

// Execute seeders on startup
seedDefaultPlans();
seedDefaultCoupons();

export default router;
