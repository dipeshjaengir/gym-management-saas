import { Router, Response } from 'express';
import { Attendance, Member } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, checkInSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. GET daily check-ins feed
router.get('/daily', async (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.query;
  const gymOwnerId = req.user!.id;
  const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];

  try {
    const list = await Attendance.find({ gymOwnerId, date: targetDate })
      .populate({ path: 'memberId', select: 'name phone qrCode gender' })
      .sort({ createdAt: -1 });

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving daily attendance.' });
  }
});

// 2. POST scan check-in member by QR code
router.post('/check-in', validateBody(checkInSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { qrCode } = req.body;
  const gymOwnerId = req.user!.id;

  if (!qrCode) return res.status(400).json({ message: 'QR Code is required.' });

  try {
    // Find member by QR code
    const member = await Member.findOne({ qrCode, gymOwnerId, isDeleted: false });
    if (!member) {
      return res.status(404).json({ message: 'Access Denied: Invalid member entry pass.' });
    }

    // Verify subscription/membership expiration date
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const expiry = new Date(member.membershipEnd);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (expiry < todayStart) {
      return res.status(403).json({
        message: `Access Denied: Membership plan expired on ${member.membershipEnd.toISOString().split('T')[0]}.`,
        member: { name: member.name, status: 'expired' }
      });
    }

    // Verify outstanding dues (warn if partial/unpaid, but grant access)
    let paymentWarning = '';
    if (member.paymentStatus !== 'paid') {
      paymentWarning = `Dues Alert: Outstanding balance of ₹${member.remainingAmount} remaining.`;
    }

    // Check if attendance already recorded today
    const existing = await Attendance.findOne({ gymOwnerId, memberId: member._id, date: todayStr });
    if (existing) {
      return res.json({
        message: `Welcome back, ${member.name}. Check-in already logged today at ${existing.checkInTime}. ${paymentWarning}`,
        member: { name: member.name, status: 'checked_in' },
        attendance: existing
      });
    }

    // Create daily attendance check-in record
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const attendance = await Attendance.create({
      gymOwnerId,
      memberId: member._id,
      date: todayStr,
      checkInTime: timeStr,
      status: 'present'
    });

    return res.status(201).json({
      message: `Access Granted. Welcome, ${member.name}! ${paymentWarning}`,
      member: { name: member.name, status: 'present' },
      attendance
    });
  } catch (err) {
    console.error('Scan check-in error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 3. GET Member check-in history
router.get('/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    const list = await Attendance.find({ gymOwnerId, memberId: req.params.memberId })
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving member check-in history.' });
  }
});

export default router;
