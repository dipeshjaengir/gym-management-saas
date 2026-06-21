import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { GymOwner, PlatformLead, AuditLog, Member } from '../models';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createLeadSchema, createGymOwnerSchema } from '../middleware/validation';

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

    owners.forEach(owner => {
      const expDate = new Date(owner.subscription.expiryDate);
      const isExpiringThisMonth = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;

      if (owner.subscription.status === 'active') {
        activeCount++;
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
      } else if (owner.subscription.status === 'suspended') {
        suspendedCount++;
      }

      if (isExpiringThisMonth) {
        expiringThisMonthCount++;
        renewalsDueCount++;
        expectedRenewalRevenue += owner.subscription.amountPaid;
      }
    });

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
        renewalsDue: renewalsDueCount
      }
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
router.put('/leads/:id', async (req, res) => {
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

// POST Create Gym Owner
router.post('/owners', validateBody(createGymOwnerSchema), async (req: AuthenticatedRequest, res) => {
  const { gymName, ownerName, email, password, phone, address, planType, amountPaid } = req.body;

  if (!gymName || !ownerName || !email || !password || !phone || !address || !planType || amountPaid === undefined) {
    return res.status(400).json({ message: 'All registration parameters are required.' });
  }

  try {
    const existing = await GymOwner.findOne({ email, isDeleted: false });
    if (existing) {
      return res.status(400).json({ message: 'A gym owner with this email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Calculate Expiry Date
    const startDate = new Date();
    const expiryDate = new Date();
    let months = 1;
    if (planType === '3_month') months = 3;
    if (planType === '6_month') months = 6;
    if (planType === '12_month') months = 12;
    expiryDate.setMonth(expiryDate.getMonth() + months);

    const owner = await GymOwner.create({
      gymName,
      ownerName,
      email,
      passwordHash,
      phone,
      address,
      branding: {
        gymName,
        address,
        contactNumber: phone,
        whatsAppNumber: phone
      },
      subscription: {
        planType,
        startDate,
        expiryDate,
        status: 'active',
        amountPaid
      }
    });

    await logAudit(`Gym Owner Created: ${gymName} (${email})`, req.user!.email, req);

    return res.status(201).json({
      message: 'Gym Owner account manually registered successfully.',
      owner: { id: owner._id, gymName: owner.gymName, email: owner.email }
    });
  } catch (err) {
    console.error('Error creating owner:', err);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// PUT Update Gym Owner
router.put('/owners/:id', async (req: AuthenticatedRequest, res) => {
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
router.put('/owners/:id/status', async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid target status.' });
  }

  try {
    const owner = await GymOwner.findOne({ _id: req.params.id, isDeleted: false });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    owner.subscription.status = status;
    await owner.save();

    await logAudit(`Subscription status of ${owner.gymName} updated to: ${status.toUpperCase()}`, req.user!.email, req);

    return res.json({ message: `Gym Owner status successfully updated to ${status}.`, owner });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating owner subscription status.' });
  }
});

// PUT Renew / Extend Subscription
router.put('/owners/:id/renew', async (req: AuthenticatedRequest, res) => {
  const { planType, amountPaid } = req.body;
  if (!planType || amountPaid === undefined) {
    return res.status(400).json({ message: 'Missing plan selection parameters.' });
  }

  try {
    const owner = await GymOwner.findOne({ _id: req.params.id, isDeleted: false });
    if (!owner) return res.status(404).json({ message: 'Gym Owner not found.' });

    const now = new Date();
    // If subscription is still active, extend from current expiry date; otherwise extend from today
    const currentExpiry = new Date(owner.subscription.expiryDate);
    const startDate = currentExpiry > now ? currentExpiry : now;
    const expiryDate = new Date(startDate.getTime());

    let months = 1;
    if (planType === '3_month') months = 3;
    if (planType === '6_month') months = 6;
    if (planType === '12_month') months = 12;
    expiryDate.setMonth(expiryDate.getMonth() + months);

    owner.subscription.planType = planType;
    owner.subscription.startDate = startDate;
    owner.subscription.expiryDate = expiryDate;
    owner.subscription.status = 'active';
    owner.subscription.amountPaid = amountPaid;

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

export default router;
