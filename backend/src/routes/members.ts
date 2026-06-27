import { Router, Response } from 'express';
import { Member, MembershipPlan, ProgressMetric, GymOwner, Payment, MemberActivity, ImportHistory } from '../models';
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

    const heightInMeters = height / 100;
    const bmiVal = heightInMeters > 0 ? parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1)) : 0;

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
      bmi: bmiVal,
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
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
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

    // Direct parameters override and BMI calculation
    member.name = name || member.name;
    member.phone = phone || member.phone;
    member.email = email !== undefined ? email : member.email;
    member.gender = gender || member.gender;
    member.dob = dob || member.dob;
    member.height = height !== undefined ? height : member.height;
    member.weight = weight !== undefined ? weight : member.weight;
    member.address = address !== undefined ? address : member.address;
    member.emergencyContact = emergencyContact !== undefined ? emergencyContact : member.emergencyContact;
    member.notes = notes !== undefined ? notes : member.notes;

    const hM = member.height / 100;
    member.bmi = hM > 0 ? parseFloat((member.weight / (hM * hM)).toFixed(1)) : 0;

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

// GET /migration/history
router.get('/migration/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await ImportHistory.find({ gymOwnerId: req.user!.id }).sort({ createdAt: -1 });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching import history.' });
  }
});

// POST /migrate/excel
router.post('/migrate/excel', async (req: AuthenticatedRequest, res: Response) => {
  const { fileName, members } = req.body;
  if (!Array.isArray(members)) {
    return res.status(400).json({ message: 'Members data array is required.' });
  }
  const gymOwnerId = req.user!.id;
  const operatorEmail = req.user!.email;

  try {
    // 1. Fetch existing members for duplicate checking
    const existingList = await Member.find({ gymOwnerId, isDeleted: false }, { phone: 1, email: 1 });
    const existingPhones = new Set(existingList.map(m => m.phone.trim()));
    const existingEmails = new Set(existingList.filter(m => m.email).map(m => m.email.trim().toLowerCase()));

    // 2. Fetch existing plans for mapping
    const plans = await MembershipPlan.find({ gymOwnerId, isDeleted: false });
    const planMap = new Map(plans.map(p => [p.name.trim().toLowerCase(), p]));

    const membersToInsert: any[] = [];
    const errors: Array<{ row: number; name?: string; error: string }> = [];
    let duplicateCount = 0;

    const processedPhones = new Set<string>();
    const processedEmails = new Set<string>();

    for (let i = 0; i < members.length; i++) {
      const row = members[i];
      const rowIndex = i + 1;

      // Basic field extraction
      const name = row.name || row['Member Name'];
      const phone = String(row.phone || row['Phone Number'] || '').trim();
      const email = String(row.email || row['Email'] || '').trim().toLowerCase();
      const gender = String(row.gender || row['Gender'] || '').trim().toLowerCase();
      const dob = row.dob || row['Date of Birth'] || row['DOB'];
      const height = Number(row.height || row['Height'] || row['Height (cm)']);
      const weight = Number(row.weight || row['Weight'] || row['Weight (kg)']);
      const address = String(row.address || row['Address'] || '');
      const emergencyContact = String(row.emergencyContact || row['Emergency Contact'] || '');
      const planName = String(row.planName || row['Membership Plan'] || '').trim();
      const startDate = row.startDate || row['Membership Start Date'];
      const expiryDate = row.expiryDate || row['Membership Expiry Date'];
      const totalAmount = Number(row.totalAmount || row['Total Plan Amount'] || 0);
      const amountPaid = Number(row.amountPaid || row['Amount Paid'] || 0);
      const remainingDue = Number(row.remainingDue || row['Remaining Due'] || 0);
      const paymentStatus = String(row.paymentStatus || row['Payment Status'] || 'unpaid').trim().toLowerCase();
      const notes = String(row.notes || row['Medical Notes'] || row['Notes'] || '');
      const statusStr = String(row.status || row['Active / Inactive'] || 'active').trim().toLowerCase();

      // Validation checks
      if (!name) {
        errors.push({ row: rowIndex, error: 'Name is required.' });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowIndex, name, error: 'Phone number is required.' });
        continue;
      }
      if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
        errors.push({ row: rowIndex, name, error: 'Gender must be male, female, or other.' });
        continue;
      }
      if (!dob || isNaN(Date.parse(dob))) {
        errors.push({ row: rowIndex, name, error: 'Valid Date of Birth is required.' });
        continue;
      }
      if (!planName) {
        errors.push({ row: rowIndex, name, error: 'Membership Plan Name is required.' });
        continue;
      }
      if (!startDate || isNaN(Date.parse(startDate))) {
        errors.push({ row: rowIndex, name, error: 'Valid Membership Start Date is required.' });
        continue;
      }
      if (!expiryDate || isNaN(Date.parse(expiryDate))) {
        errors.push({ row: rowIndex, name, error: 'Valid Membership Expiry Date is required.' });
        continue;
      }
      if (isNaN(height) || height <= 0) {
        errors.push({ row: rowIndex, name, error: 'Height must be a valid positive number.' });
        continue;
      }
      if (isNaN(weight) || weight <= 0) {
        errors.push({ row: rowIndex, name, error: 'Weight must be a valid positive number.' });
        continue;
      }

      // Duplicate detection
      if (existingPhones.has(phone) || processedPhones.has(phone)) {
        duplicateCount++;
        errors.push({ row: rowIndex, name, error: `Member with Phone ${phone} already exists.` });
        continue;
      }
      if (email && (existingEmails.has(email) || processedEmails.has(email))) {
        duplicateCount++;
        errors.push({ row: rowIndex, name, error: `Member with Email ${email} already exists.` });
        continue;
      }

      // Check plan ID map
      let planId;
      const planNameKey = planName.toLowerCase();
      if (planMap.has(planNameKey)) {
        planId = planMap.get(planNameKey)!._id;
      } else {
        // Create plan dynamically
        const startD = new Date(startDate);
        const expiryD = new Date(expiryDate);
        let durationMonths = (expiryD.getFullYear() - startD.getFullYear()) * 12 + (expiryD.getMonth() - startD.getMonth());
        if (durationMonths <= 0) durationMonths = 1;

        const newPlan = await MembershipPlan.create({
          gymOwnerId,
          name: planName,
          price: totalAmount || 0,
          durationMonths,
          status: 'active'
        });
        planMap.set(planNameKey, newPlan);
        planId = newPlan._id;
      }

      // BMI calculation
      const hM = height / 100;
      const bmiVal = hM > 0 ? parseFloat((weight / (hM * hM)).toFixed(1)) : 0;

      // Unique QR code format
      const qrCode = `GYM-${gymOwnerId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      processedPhones.add(phone);
      if (email) processedEmails.add(email);

      // Status
      const isArchived = (statusStr === 'inactive' || statusStr === 'expired');

      membersToInsert.push({
        gymOwnerId,
        name,
        phone,
        email: email || '',
        gender,
        dob: new Date(dob),
        height,
        weight,
        address,
        emergencyContact,
        planId,
        membershipStart: new Date(startDate),
        membershipEnd: new Date(expiryDate),
        amountPaid,
        remainingAmount: remainingDue,
        paymentStatus: paymentStatus === 'paid' || paymentStatus === 'partial' || paymentStatus === 'unpaid' ? paymentStatus : 'unpaid',
        qrCode,
        notes,
        bmi: bmiVal,
        isArchived,
        isMigrated: true,
        migrationMethod: 'excel',
        openingBalance: remainingDue
      });
    }

    let insertedCount = 0;
    if (membersToInsert.length > 0) {
      const inserted = await Member.insertMany(membersToInsert);
      insertedCount = inserted.length;

      // Log activity timeline bulk records
      const activities: any[] = [];
      for (const m of inserted) {
        activities.push({
          gymOwnerId,
          memberId: m._id,
          activityType: 'migration',
          title: 'Member Migrated',
          remarks: `Member migrated from previous software. Method: Excel. Operator: ${operatorEmail}`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date()
        });

        if (m.remainingAmount > 0) {
          activities.push({
            gymOwnerId,
            memberId: m._id,
            activityType: 'opening_balance',
            title: 'Opening Balance',
            remainingDue: m.remainingAmount,
            remarks: 'Opening outstanding balance from previous software.',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date()
          });
        }
      }
      await MemberActivity.insertMany(activities);
    }

    // Save import history log
    const hist = await ImportHistory.create({
      gymOwnerId,
      importedBy: operatorEmail,
      fileName: fileName || 'excel_import',
      totalRecords: members.length,
      successCount: insertedCount,
      failedCount: errors.length,
      duplicateCount,
      rowErrors: errors
    });

    await logAudit(`Uploaded Member Migration Excel: ${fileName} (${insertedCount} succeeded, ${errors.length} failed)`, operatorEmail, req);

    return res.json({
      success: true,
      importHistory: hist,
      importedCount: insertedCount,
      duplicateCount,
      failedCount: errors.length
    });

  } catch (err: any) {
    console.error('Migration Excel error:', err);
    return res.status(500).json({ message: 'Error processing excel migration.' });
  }
});

// POST /migrate/manual
router.post('/migrate/manual', async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    phone,
    email,
    gender,
    dob,
    height,
    weight,
    address,
    emergencyContact,
    planName,
    startDate,
    expiryDate,
    totalAmount,
    amountPaid,
    remainingDue,
    paymentStatus,
    notes
  } = req.body;

  const gymOwnerId = req.user!.id;
  const operatorEmail = req.user!.email;

  if (!name || !phone || !gender || !dob || !planName || !startDate || !expiryDate || !height || !weight) {
    return res.status(400).json({ message: 'All required fields must be supplied for migration.' });
  }

  try {
    // Duplicate check
    const existing = await Member.findOne({
      gymOwnerId,
      isDeleted: false,
      $or: [{ phone }, { email: email ? email : undefined }]
    });

    if (existing) {
      return res.status(400).json({ message: 'Member with this phone number or email already exists.' });
    }

    // Map or create plan
    let plan = await MembershipPlan.findOne({ gymOwnerId, name: planName, isDeleted: false });
    if (!plan) {
      const startD = new Date(startDate);
      const expiryD = new Date(expiryDate);
      let durationMonths = (expiryD.getFullYear() - startD.getFullYear()) * 12 + (expiryD.getMonth() - startD.getMonth());
      if (durationMonths <= 0) durationMonths = 1;

      plan = await MembershipPlan.create({
        gymOwnerId,
        name: planName,
        price: totalAmount || 0,
        durationMonths,
        status: 'active'
      });
    }

    const hM = height / 100;
    const bmiVal = hM > 0 ? parseFloat((weight / (hM * hM)).toFixed(1)) : 0;
    const qrCode = `GYM-${gymOwnerId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const member = await Member.create({
      gymOwnerId,
      name,
      phone,
      email: email || '',
      gender,
      dob: new Date(dob),
      height,
      weight,
      address: address || '',
      emergencyContact: emergencyContact || '',
      planId: plan._id,
      membershipStart: new Date(startDate),
      membershipEnd: new Date(expiryDate),
      amountPaid: amountPaid || 0,
      remainingAmount: remainingDue || 0,
      paymentStatus: paymentStatus || 'unpaid',
      qrCode,
      notes: notes || '',
      bmi: bmiVal,
      isMigrated: true,
      migrationMethod: 'manual',
      openingBalance: remainingDue || 0
    });

    // Write Activities
    await MemberActivity.create({
      gymOwnerId,
      memberId: member._id,
      activityType: 'migration',
      title: 'Member Migrated',
      remarks: `Member migrated from previous software. Method: Manual. Operator: ${operatorEmail}`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date()
    });

    if (member.remainingAmount > 0) {
      await MemberActivity.create({
        gymOwnerId,
        memberId: member._id,
        activityType: 'opening_balance',
        title: 'Opening Balance',
        remainingDue: member.remainingAmount,
        remarks: 'Opening outstanding balance from previous software.',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date()
      });
    }

    await logAudit(`Manually migrated member: ${member.name}`, operatorEmail, req);

    return res.status(201).json(member);

  } catch (err: any) {
    console.error('Manual migration error:', err);
    return res.status(500).json({ message: 'Error performing manual migration.' });
  }
});

export default router;
