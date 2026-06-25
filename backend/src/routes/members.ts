import { Router, Response } from 'express';
import { Member, MembershipPlan, ProgressMetric, GymOwner, Payment, MemberActivity } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createMemberSchema, updateMemberSchema } from '../middleware/validation';
import { notificationProvider } from '../config/notifications';
import { logMemberActivity, createNotification } from '../utils/activityLogger';

const router = Router();

router.use(authenticateToken);

// 1. GET Members list with search & filter
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { search, status, includeArchived } = req.query;
  const gymOwnerId = req.user!.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const query: any = { gymOwnerId, isDeleted: false };
  if (includeArchived !== 'true') {
    query.isArchived = { $ne: true };
  }

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
          return !isExpired && !m.isArchived;
        } else if (status === 'expired') {
          return isExpired && !m.isArchived;
        } else if (status === 'expiring_soon') {
          const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          return !isExpired && expiry <= sevenDaysFromNow && !m.isArchived;
        } else if (status === 'new') {
          const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          return new Date(m.joiningDate) >= oneWeekAgo && !m.isArchived;
        } else if (status === 'archived') {
          return m.isArchived;
        }
        return true;
      });
    }

    // Attach lastPaymentDate dynamically
    const membersWithPaymentDate = await Promise.all(members.map(async (m) => {
      const latestPayment = await Payment.findOne({ memberId: m._id, isDeleted: false, isVoided: false }).sort({ paymentDate: -1 });
      return {
        ...m.toObject(),
        lastPaymentDate: latestPayment ? latestPayment.paymentDate : null
      };
    }));

    return res.json(membersWithPaymentDate);
  } catch (err) {
    console.error('Error fetching members:', err);
    return res.status(500).json({ message: 'Error fetching members.' });
  }
});

// 2. GET Specific Member Profile Detail
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false }).populate('planId');
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    const latestPayment = await Payment.findOne({ memberId: member._id, isDeleted: false, isVoided: false }).sort({ paymentDate: -1 });
    const memberObj = {
      ...member.toObject(),
      lastPaymentDate: latestPayment ? latestPayment.paymentDate : null
    };

    return res.json(memberObj);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving member profile.' });
  }
});

// 2.5 GET Member timeline history
router.get('/:id/timeline', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  const memberId = req.params.id;
  try {
    const list = await MemberActivity.find({ gymOwnerId, memberId })
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving member timeline.' });
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

    // Calculate Expiry Date automatically in days:
    // 1 Month = +30 days, 3 Months = +90 days, 6 Months = +180 days, 12 Months = +365 days
    const start = new Date(membershipStart);
    let days = 30;
    if (plan.durationMonths === 1) days = 30;
    else if (plan.durationMonths === 3) days = 90;
    else if (plan.durationMonths === 6) days = 180;
    else if (plan.durationMonths === 12) days = 365;
    else days = plan.durationMonths * 30;

    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

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
      notes,
      isArchived: false
    });

    const ownerObj = await GymOwner.findById(gymOwnerId);
    const opName = ownerObj ? ownerObj.ownerName : 'Admin';

    // Log Registration Activity
    await logMemberActivity(
      gymOwnerId,
      member._id,
      'registration',
      'Member Registered',
      opName,
      `Registered package: ${plan.name}. Height: ${height}cm, Weight: ${weight}kg.`
    );

    // Create Registration Notification
    await createNotification(
      gymOwnerId,
      'New Member Registered',
      `${name} has been registered under plan "${plan.name}".`,
      'registration'
    );

    // Log initial payment receipt if amountPaid > 0
    if (amountPaid > 0) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = `REC-${dateStr}-${rand}`;

      const payment = await Payment.create({
        gymOwnerId,
        memberId: member._id,
        amount: amountPaid,
        pendingAmount: remainingAmount,
        paymentMethod: req.body.paymentMethod || 'cash',
        receiptNumber,
        notes: 'Initial Plan Registration Payment',
        operatorName: opName,
        isVoided: false
      });

      // Log Initial Payment Activity
      await logMemberActivity(
        gymOwnerId,
        member._id,
        'payment_initial',
        'Initial Plan Payment',
        opName,
        `Collected ₹${amountPaid} via ${(req.body.paymentMethod || 'cash').toUpperCase()}. Receipt: ${receiptNumber}`,
        {
          receiptNumber,
          transactionId: payment._id,
          oldAmount: 0,
          newAmount: amountPaid,
          remainingDue: remainingAmount,
          paymentMethod: req.body.paymentMethod || 'cash'
        }
      );

      // Create Payment Notification
      await createNotification(
        gymOwnerId,
        'Initial Payment Received',
        `Collected ₹${amountPaid} initial payment from ${name}.`,
        'payment'
      );
    }

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

    // WhatsApp Welcome notification url
    const welcomeResult = await notificationProvider.sendWelcomeMessage(member.phone, {
      gymName: owner!.branding?.gymName || owner!.gymName,
      memberName: member.name,
      planName: plan.name,
      totalAmount: plan.price,
      amountPaid,
      remainingDue: remainingAmount,
      startDate: member.membershipStart.toISOString().split('T')[0],
      expiryDate: member.membershipEnd.toISOString().split('T')[0]
    });

    return res.status(201).json({
      member,
      whatsappUrl: welcomeResult.url
    });
  } catch (err) {
    console.error('Error creating member:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. PUT Edit Member Details (with renewal triggers)
router.put('/:id', validateBody(updateMemberSchema), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name, phone, email, gender, dob, height, weight, address,
    planId, membershipStart, amountPaid, emergencyContact, notes
  } = req.body;

  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    let isRenewal = false;
    const oldPlanId = String(member.planId);
    const oldStart = member.membershipStart.toISOString().split('T')[0];

    if (planId && planId !== oldPlanId) {
      isRenewal = true;
    }
    if (membershipStart && membershipStart !== oldStart) {
      isRenewal = true;
    }

    // Handle plan update recalculation if plan changes
    if (planId && planId !== oldPlanId) {
      const plan = await MembershipPlan.findOne({ _id: planId, gymOwnerId: req.user!.id, isDeleted: false });
      if (plan) {
        member.planId = planId;
        const start = membershipStart ? new Date(membershipStart) : new Date(member.membershipStart);
        
        let days = 30;
        if (plan.durationMonths === 1) days = 30;
        else if (plan.durationMonths === 3) days = 90;
        else if (plan.durationMonths === 6) days = 180;
        else if (plan.durationMonths === 12) days = 365;
        else days = plan.durationMonths * 30;

        const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        member.membershipStart = start;
        member.membershipEnd = end;
        
        const oldPaid = member.amountPaid;
        const newPaid = amountPaid !== undefined ? amountPaid : member.amountPaid;
        member.amountPaid = newPaid;
        member.remainingAmount = plan.price - newPaid;
        member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

        // Check for plan upgrade/downgrade/renewal event type
        const oldPlan = await MembershipPlan.findById(oldPlanId);
        let planAction = 'Membership Renewal';
        let activityType: 'plan_renewal' | 'plan_upgrade' | 'plan_downgrade' = 'plan_renewal';
        if (oldPlan) {
          if (plan.price > oldPlan.price) {
            planAction = 'Plan Upgrade';
            activityType = 'plan_upgrade';
          } else if (plan.price < oldPlan.price) {
            planAction = 'Plan Downgrade';
            activityType = 'plan_downgrade';
          }
        }

        const owner = await GymOwner.findById(req.user!.id);
        const opName = owner ? owner.ownerName : 'Admin';

        // Log Plan Activity
        await logMemberActivity(
          req.user!.id,
          member._id,
          activityType,
          planAction,
          opName,
          `Swapped plan from ${oldPlan ? oldPlan.name : 'N/A'} to ${plan.name}. Remaining dues: ₹${member.remainingAmount}`,
          {
            oldAmount: oldPlan ? oldPlan.price : 0,
            newAmount: plan.price,
            remainingDue: member.remainingAmount
          }
        );

        // Create Notification
        await createNotification(
          req.user!.id,
          planAction,
          `${member.name} packages adjusted to "${plan.name}".`,
          activityType === 'plan_renewal' ? 'renewal' : 'trial'
        );

        // Log payment receipt for additional amount
        const paidDiff = newPaid - oldPaid;
        if (paidDiff > 0) {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
          const rand = Math.floor(1000 + Math.random() * 9000);
          const receiptNumber = `REC-${dateStr}-${rand}`;
          
          const payment = await Payment.create({
            gymOwnerId: req.user!.id,
            memberId: member._id,
            amount: paidDiff,
            pendingAmount: member.remainingAmount,
            paymentMethod: req.body.paymentMethod || 'cash',
            receiptNumber,
            notes: `${planAction} Payment`,
            operatorName: opName,
            isVoided: false
          });

          // Log payment activity
          await logMemberActivity(
            req.user!.id,
            member._id,
            'payment_partial',
            'Plan Adjustment Payment',
            opName,
            `Collected additional ₹${paidDiff} via ${(req.body.paymentMethod || 'cash').toUpperCase()}. Receipt: ${receiptNumber}`,
            {
              receiptNumber,
              transactionId: payment._id,
              oldAmount: oldPaid,
              newAmount: newPaid,
              remainingDue: member.remainingAmount,
              paymentMethod: req.body.paymentMethod || 'cash'
            }
          );

          // Create notification
          await createNotification(
            req.user!.id,
            'Payment Collected',
            `Collected ₹${paidDiff} for plan adjustment from ${member.name}.`,
            'payment'
          );
        }
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

      // Update amountPaid directly
      if (amountPaid !== undefined && amountPaid !== member.amountPaid) {
        member.amountPaid = amountPaid;
        const plan = await MembershipPlan.findById(member.planId);
        if (plan) {
          member.remainingAmount = plan.price - amountPaid;
          member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
        }
      }
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
    let auditMsg = `Updated Member Profile: ${member.name}`;
    if (planId && planId !== oldPlanId) {
      const oldPlan = await MembershipPlan.findById(oldPlanId);
      const newPlan = await MembershipPlan.findById(planId);
      if (oldPlan && newPlan) {
        auditMsg += ` - Plan updated from ${oldPlan.name} (₹${oldPlan.price}) to ${newPlan.name} (₹${newPlan.price})`;
      }
    }
    await logAudit(auditMsg, owner!.email, req);

    let whatsappUrl = '';
    if (isRenewal) {
      const plan = await MembershipPlan.findById(member.planId);
      const renewalResult = await notificationProvider.sendRenewalMessage(member.phone, {
        memberName: member.name,
        planName: plan ? plan.name : 'Gym Membership',
        expiryDate: member.membershipEnd.toISOString().split('T')[0]
      });
      whatsappUrl = renewalResult.url || '';
    }

    return res.json({
      member,
      whatsappUrl
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating member.' });
  }
});

// 5. DELETE Soft Delete Member -> Now ARCHIVES member!
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    member.isArchived = true;
    await member.save();

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Archived Member Profile: ${member.name}`, owner!.email, req);

    return res.json({ message: 'Member profile archived successfully.', member });
  } catch (err) {
    return res.status(500).json({ message: 'Error archiving member.' });
  }
});

// 6. PUT Restore Member from Archive
router.put('/:id/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    member.isArchived = false;
    await member.save();

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Restored Member Profile from Archive: ${member.name}`, owner!.email, req);

    return res.json({ message: 'Member profile restored successfully.', member });
  } catch (err) {
    return res.status(500).json({ message: 'Error restoring member.' });
  }
});

// 7. POST Progress parameter metric (weight log)
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

export default router;
