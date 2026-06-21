import { Router, Response } from 'express';
import { GymOwner, Member, Payment } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

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
router.put('/branding', async (req: AuthenticatedRequest, res: Response) => {
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
    const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    let expiringSoonCount = 0;
    let expiringTodayCount = 0;
    let expiringWithin3DaysCount = 0;
    let alreadyExpiredCount = 0;
    let newMembersToday = 0;
    
    // Pending Fee Recovery counters
    let totalPendingAmount = 0;
    let outstandingDuesCount = 0;

    members.forEach(member => {
      const end = new Date(member.membershipEnd);
      const start = new Date(member.membershipStart);
      const join = new Date(member.joiningDate);
      
      const isExpired = end < todayStart;
      
      if (isExpired) {
        expiredMembers++;
        alreadyExpiredCount++;
      } else {
        activeMembers++;
        if (end.getTime() === todayStart.getTime()) {
          expiringTodayCount++;
          expiringSoonCount++;
        } else if (end > todayStart && end <= threeDaysFromNow) {
          expiringWithin3DaysCount++;
          expiringSoonCount++;
        } else if (end > threeDaysFromNow && end <= sevenDaysFromNow) {
          expiringSoonCount++;
        }
      }

      // Check joining today
      if (join.toDateString() === now.toDateString()) {
        newMembersToday++;
      }

      // Check Outstanding Dues
      if (member.remainingAmount > 0) {
        totalPendingAmount += member.remainingAmount;
        outstandingDuesCount++;
      }
    });

    // C. Monthly Collections
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const payments = await Payment.find({
      gymOwnerId,
      isDeleted: false,
      paymentDate: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });

    const monthlyCollections = payments.reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      metrics: {
        totalMembers,
        activeMembers,
        expiredMembers,
        membershipExpiringSoon: expiringSoonCount,
        monthlyCollections,
        newMembersToday
      },
      feeRecovery: {
        totalPendingAmount,
        outstandingDuesCount,
        expiringToday: expiringTodayCount,
        expiringWithin3Days: expiringWithin3DaysCount,
        alreadyExpired: alreadyExpiredCount
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching gym dashboard stats.' });
  }
});

export default router;
