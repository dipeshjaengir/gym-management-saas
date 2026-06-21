import { Router, Response } from 'express';
import { Member, MembershipPlan, ProgressMetric, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createMemberSchema, updateMemberSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. GET Members list with search & filter
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { search, status } = req.query;
  const gymOwnerId = req.user!.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const query: any = { gymOwnerId, isDeleted: false };

  if (search) {
    query.$or = [
      { name: { $regex: String(search), $options: 'i' } },
      { phone: { $regex: String(search), $options: 'i' } }
    ];
  }

  try {
    let members = await Member.find(query).populate('planId').sort({ createdAt: -1 });

    // Client-side filter emulation based on status
    if (status) {
      members = members.filter(m => {
        const expiry = new Date(m.membershipEnd);
        const isExpired = expiry < todayStart;

        if (status === 'active') {
          return !isExpired;
        } else if (status === 'expired') {
          return isExpired;
        } else if (status === 'expiring_soon') {
          const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          return !isExpired && expiry <= sevenDaysFromNow;
        } else if (status === 'new') {
          const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          return new Date(m.joiningDate) >= oneWeekAgo;
        }
        return true;
      });
    }

    return res.json(members);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching members.' });
  }
});

// 2. GET Specific Member Profile Detail
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false }).populate('planId');
    if (!member) return res.status(404).json({ message: 'Member not found.' });
    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving member profile.' });
  }
});

// 3. POST Create Member
router.post('/', validateBody(createMemberSchema), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name, phone, email, gender, dob, height, weight, address,
    joiningDate, planId, membershipStart, amountPaid, emergencyContact, notes
  } = req.body;

  if (!name || !phone || !gender || !dob || !height || !weight || !planId || !membershipStart || amountPaid === undefined) {
    return res.status(400).json({ message: 'Missing mandatory registration fields.' });
  }

  try {
    const plan = await MembershipPlan.findOne({ _id: planId, gymOwnerId: req.user!.id, isDeleted: false });
    if (!plan) return res.status(400).json({ message: 'Selected membership package is invalid.' });

    // Calculate Expiry Date
    const start = new Date(membershipStart);
    const end = new Date(start.getTime());
    end.setMonth(end.getMonth() + plan.durationMonths);

    // Calculate outstanding dues
    const price = plan.price;
    const remainingAmount = price - amountPaid;
    const paymentStatus = remainingAmount <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

    // Generate Unique QR Entry Key
    const gymOwnerId = req.user!.id;
    const qrCode = `GYM-${gymOwnerId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const member = await Member.create({
      gymOwnerId,
      name,
      phone,
      email,
      gender,
      dob,
      height,
      weight,
      address,
      joiningDate,
      planId,
      membershipStart: start,
      membershipEnd: end,
      amountPaid,
      remainingAmount,
      paymentStatus,
      qrCode,
      emergencyContact,
      notes
    });

    // Create Initial Progress Metric Log
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    await ProgressMetric.create({
      memberId: member._id,
      date: new Date(),
      weight,
      bmi: parseFloat(bmi.toFixed(2))
    });

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Registered Member: ${name} (Plan: ${plan.name})`, owner!.email, req);

    return res.status(201).json(member);
  } catch (err) {
    console.error('Error creating member:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. PUT Edit Member Details
router.put('/:id', validateBody(updateMemberSchema), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name, phone, email, gender, dob, height, weight, address,
    planId, membershipStart, amountPaid, emergencyContact, notes
  } = req.body;

  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    // Handle plan update recalculation if plan changes
    if (planId && planId !== String(member.planId)) {
      const plan = await MembershipPlan.findOne({ _id: planId, gymOwnerId: req.user!.id, isDeleted: false });
      if (plan) {
        member.planId = planId;
        const start = membershipStart ? new Date(membershipStart) : new Date(member.membershipStart);
        const end = new Date(start.getTime());
        end.setMonth(end.getMonth() + plan.durationMonths);
        member.membershipStart = start;
        member.membershipEnd = end;
        
        member.amountPaid = amountPaid !== undefined ? amountPaid : member.amountPaid;
        member.remainingAmount = plan.price - member.amountPaid;
        member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : (member.amountPaid > 0 ? 'partial' : 'unpaid');
      }
    } else {
      // Direct parameters override
      member.name = name || member.name;
      member.phone = phone || member.phone;
      member.email = email || member.email;
      member.gender = gender || member.gender;
      member.dob = dob || member.dob;
      member.height = height || member.height;
      member.weight = weight || member.weight;
      member.address = address || member.address;
      member.emergencyContact = emergencyContact || member.emergencyContact;
      member.notes = notes || member.notes;
    }

    await member.save();
    
    // Log Progress Metric update if weight changes
    if (weight && weight !== member.weight) {
      const heightInMeters = member.height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      await ProgressMetric.create({
        memberId: member._id,
        date: new Date(),
        weight,
        bmi: parseFloat(bmi.toFixed(2))
      });
    }

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Updated Member Profile: ${member.name}`, owner!.email, req);

    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating member.' });
  }
});

// 5. DELETE Soft Delete Member
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    member.isDeleted = true;
    await member.save();

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Deleted Member Profile: ${member.name}`, owner!.email, req);

    return res.json({ message: 'Member profile deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting member.' });
  }
});

// 6. POST Progress parameter metric (weight log)
router.post('/:id/progress', async (req: AuthenticatedRequest, res: Response) => {
  const { weight, chest, waist, biceps } = req.body;
  if (!weight) return res.status(400).json({ message: 'Weight parameter is required.' });

  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    const heightInMeters = member.height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    const metric = await ProgressMetric.create({
      memberId: member._id,
      weight,
      bmi: parseFloat(bmi.toFixed(2)),
      chest: chest || 0,
      waist: waist || 0,
      biceps: biceps || 0
    });

    // Update weight on member schema too
    member.weight = weight;
    await member.save();

    return res.status(201).json(metric);
  } catch (err) {
    return res.status(500).json({ message: 'Error logging progress parameter.' });
  }
});

// 7. GET Progress metrics history log
router.get('/:id/progress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    const logs = await ProgressMetric.find({ memberId: member._id }).sort({ date: 1 });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving progress logs.' });
  }
});

export default router;
