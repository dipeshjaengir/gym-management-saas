import { Router, Response } from 'express';
import { GymOwner, Member, Payment, Attendance, MembershipPlan } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, updateBrandingSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. Fetch Branding configuration
router.get('/branding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const owner = await GymOwner.findById(req.user!.id).select('branding gymName address phone');
    if (!owner) return res.status(404).json({ message: 'Gym Owner profile not found.' });

    // Fallback if branding is empty
    const branding = owner.branding || {};
    return res.json({
      logo: branding.logo || '',
      gymName: branding.gymName || owner.gymName,
      address: branding.address || owner.address,
      contactNumber: branding.contactNumber || owner.phone,
      whatsAppNumber: branding.whatsAppNumber || owner.phone
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving gym branding.' });
  }
});

// 2. Update Branding configuration
router.put('/branding', validateBody(updateBrandingSchema), async (req: AuthenticatedRequest, res: Response) => {

  const { logo, gymName, address, contactNumber, whatsAppNumber } = req.body;

  try {
    const owner = await GymOwner.findById(req.user!.id);
    if (!owner) return res.status(404).json({ message: 'Gym Owner profile not found.' });

    owner.branding = {
      logo: logo || owner.branding?.logo || '',
      gymName: gymName || owner.branding?.gymName || owner.gymName,
      address: address || owner.branding?.address || owner.address,
      contactNumber: contactNumber || owner.branding?.contactNumber || owner.phone,
      whatsAppNumber: whatsAppNumber || owner.branding?.whatsAppNumber || owner.phone
    };

    await owner.save();
    await logAudit(`Updated Gym Branding for ${owner.gymName}`, owner.email, req);

    return res.json({ message: 'Gym branding configuration updated successfully.', branding: owner.branding });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating branding.' });
  }
});

// 3. Gym Owner Dashboard KPI Counters & Statistics
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gymOwnerId = req.user!.id;

    // A. Fetch all active members for this gym
    const members = await Member.find({ gymOwnerId, isDeleted: false });
    
    // B. Calculate stats
    const totalMembers = members.length;
    let activeMembers = 0;
    let expiredMembers = 0;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let expiringTodayCount = 0;
    let expiringWithin3DaysCount = 0;
    let expiringWithin7DaysCount = 0;
    let expiringWithin15DaysCount = 0;
    let alreadyExpiredCount = 0;
    let newMembersToday = 0;
    let todayBirthdays = 0;
    
    // Pending Fee Recovery counters
    let totalPendingAmount = 0;
    let outstandingDuesCount = 0;

    const oneDay = 24 * 60 * 60 * 1000;

    members.forEach(member => {
      const join = new Date(member.joiningDate);
      
      if (member.membershipEnd) {
        const end = new Date(member.membershipEnd);
        const isExpired = end < todayStart;
        
        if (isExpired) {
          expiredMembers++;
          alreadyExpiredCount++;
        } else {
          activeMembers++;
          
          const diffTime = end.getTime() - todayStart.getTime();
          const diffDays = Math.ceil(diffTime / oneDay);
          
          if (diffDays === 0) {
            expiringTodayCount++;
          } else if (diffDays >= 1 && diffDays <= 3) {
            expiringWithin3DaysCount++;
          } else if (diffDays >= 4 && diffDays <= 7) {
            expiringWithin7DaysCount++;
          } else if (diffDays >= 8 && diffDays <= 15) {
            expiringWithin15DaysCount++;
          }
        }
      }

      // Check joining today
      if (join.toDateString() === now.toDateString()) {
        newMembersToday++;
      }

      // Check Birthdays today
      if (member.dob) {
        const dobDate = new Date(member.dob);
        if (dobDate.getMonth() === now.getMonth() && dobDate.getDate() === now.getDate()) {
          todayBirthdays++;
        }
      }

      // Check Outstanding Dues
      const memberTotalOutstanding = (member.remainingAmount || 0) + (member.previousOutstanding || 0);
      if (memberTotalOutstanding > 0) {
        totalPendingAmount += memberTotalOutstanding;
        outstandingDuesCount++;
      }
    });

    // C. Attendance Overview
    const todayStr = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const todayCheckIns = await Attendance.find({ gymOwnerId, date: todayStr });
    const todayAttendance = todayCheckIns.length;
    const uniqueCheckIns = new Set(todayCheckIns.map(c => String(c.memberId))).size;

    const currentMonthPrefix = now.toISOString().substring(0, 7); // Format YYYY-MM
    const monthlyCheckInsCount = await Attendance.countDocuments({
      gymOwnerId,
      date: { $regex: `^${currentMonthPrefix}` }
    });

    // D. Collections overview
    // Today's Collection
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayPayments = await Payment.find({
      gymOwnerId,
      isDeleted: false,
      paymentDate: { $gte: startOfToday, $lte: endOfToday }
    });
    const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly Collections
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyPayments = await Payment.find({
      gymOwnerId,
      isDeleted: false,
      paymentDate: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });
    const monthlyCollections = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      metrics: {
        totalMembers,
        activeMembers,
        expiredMembers,
        blockedMembers: 0,
        monthlyCollections,
        newMembersToday,
        outstandingDuesCount
      },
      ptPlanOverview: {
        activePtPlans: 0,
        expiredPtPlans: 0,
        totalPtPlans: 0
      },
      attendanceOverview: {
        todayAttendance,
        monthlyAttendance: monthlyCheckInsCount,
        uniqueCheckIns,
        expiringToday: expiringTodayCount,
        ptPlanExpiringToday: 0,
        expiring1to3Days: expiringWithin3DaysCount,
        expiring4to7Days: expiringWithin7DaysCount,
        expiring8to15Days: expiringWithin15DaysCount,
        todayBirthdays
      },
      paymentOverview: {
        todayCollection,
        membershipCollectedToday: todayCollection,
        admissionFees: Math.floor(monthlyCollections * 0.05), // Simulated 5% admission fees
        membershipCollection: monthlyCollections,
        membershipDue: totalPendingAmount,
        ptCollection: 0,
        ptDue: 0,
        servicePaid: 0,
        serviceDue: 0
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching gym dashboard stats.' });
  }
});

// 4. Unified Global Search for Gym Owner
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.json({ members: [], payments: [], attendance: [], plans: [] });
  }

  try {
    const regex = { $regex: q, $options: 'i' };

    // Search members by name, phone, email, qrCode
    const members = await Member.find({
      gymOwnerId,
      isDeleted: false,
      $or: [{ name: regex }, { phone: regex }, { email: regex }, { qrCode: regex }]
    }).limit(10);

    // Search payments by receiptNumber, notes
    const payments = await Payment.find({
      gymOwnerId,
      isDeleted: false,
      $or: [{ receiptNumber: regex }, { notes: regex }]
    }).populate({ path: 'memberId', select: 'name phone' }).limit(10);

    // Search plans by name
    const plans = await MembershipPlan.find({
      gymOwnerId,
      isDeleted: false,
      name: regex
    }).limit(10);

    // Search attendance by date, receptionist, and matching member name
    const matchingMembers = await Member.find({ gymOwnerId, name: regex, isDeleted: false }).select('_id');
    const memberIds = matchingMembers.map(m => m._id);

    const attendance = await Attendance.find({
      gymOwnerId,
      $or: [
        { date: regex },
        { checkInTime: regex },
        { checkOutTime: regex },
        { receptionist: regex },
        { memberId: { $in: memberIds } }
      ]
    }).populate({ path: 'memberId', select: 'name phone' }).limit(10);

    return res.json({ members, payments, plans, attendance });
  } catch (err) {
    console.error('GymOwner Global search error:', err);
    return res.status(500).json({ message: 'Error performing global search.' });
  }
});

export default router;
