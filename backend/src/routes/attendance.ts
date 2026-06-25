import { Router, Response } from 'express';
import { Attendance, Member, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, checkInSchema } from '../middleware/validation';
import { logMemberActivity, createNotification } from '../utils/activityLogger';

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
      return res.status(404).json({ message: 'Invalid QR' });
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
      return res.status(400).json({ message: 'Already Checked In' });
    }

    const owner = await GymOwner.findById(gymOwnerId);
    const receptionistName = owner ? owner.ownerName : 'Admin';
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

    // Create daily attendance check-in record
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const attendance = await Attendance.create({
      gymOwnerId,
      memberId: member._id,
      date: todayStr,
      checkInTime: timeStr,
      checkOutTime: '',
      workoutDuration: '',
      status: 'present',
      receptionist: receptionistName,
      qrScanTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      deviceInfo: deviceInfo,
      browserInfo: req.headers['user-agent'] || 'Unknown Browser'
    });

    // Log Member Activity
    await logMemberActivity(
      gymOwnerId,
      member._id,
      'check_in',
      'Checked In via QR',
      receptionistName,
      `Device: ${deviceInfo}`
    );

    // Create Notification
    await createNotification(
      gymOwnerId,
      'Member Checked In',
      `${member.name} checked in today at ${timeStr}.`,
      'attendance'
    );

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

// 2.5 POST scan check-out member by QR code
router.post('/check-out', validateBody(checkInSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { qrCode } = req.body;
  const gymOwnerId = req.user!.id;

  if (!qrCode) return res.status(400).json({ message: 'QR Code is required.' });

  try {
    const member = await Member.findOne({ qrCode, gymOwnerId, isDeleted: false });
    if (!member) {
      return res.status(404).json({ message: 'Invalid QR' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Find today's check-in record
    const attendance = await Attendance.findOne({ gymOwnerId, memberId: member._id, date: todayStr });
    if (!attendance) {
      return res.status(400).json({ message: 'Not Checked In Today' });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'Already Checked Out' });
    }

    const owner = await GymOwner.findById(gymOwnerId);
    const receptionistName = owner ? owner.ownerName : 'Admin';
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    // Calculate duration
    let workoutDuration = '';
    try {
      const [inH, inM, inS] = attendance.checkInTime.split(':').map(Number);
      const [outH, outM, outS] = timeStr.split(':').map(Number);
      const inDate = new Date(2000, 0, 1, inH, inM, inS || 0);
      const outDate = new Date(2000, 0, 1, outH, outM, outS || 0);
      let diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        diffMs %= 1000 * 60 * 60;
        const minutes = Math.floor(diffMs / (1000 * 60));
        workoutDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;
      } else {
        workoutDuration = '0 mins';
      }
    } catch (e) {
      workoutDuration = 'N/A';
    }

    attendance.checkOutTime = timeStr;
    attendance.workoutDuration = workoutDuration;
    attendance.status = 'checked_out';
    attendance.browserInfo = req.headers['user-agent'] || 'Unknown Browser';
    await attendance.save();

    // Log Activity
    await logMemberActivity(
      gymOwnerId,
      member._id,
      'check_out',
      'Checked Out via QR',
      receptionistName,
      `Workout Duration: ${workoutDuration}`
    );

    // Create Notification
    await createNotification(
      gymOwnerId,
      'Member Checked Out',
      `${member.name} checked out. Workout duration: ${workoutDuration}`,
      'attendance'
    );

    return res.json({
      message: `Access Granted. Goodbye, ${member.name}!`,
      member: { name: member.name, status: 'checked_out' },
      attendance
    });
  } catch (err) {
    console.error('Scan check-out error:', err);
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

// 4. GET all gym attendance history with optional filters (startDate, endDate)
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  const { startDate, endDate } = req.query;

  try {
    let query: any = { gymOwnerId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = String(startDate);
      }
      if (endDate) {
        query.date.$lte = String(endDate);
      }
    }

    const list = await Attendance.find(query)
      .populate({ path: 'memberId', select: 'name phone qrCode gender' })
      .sort({ createdAt: -1 });

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving attendance history.' });
  }
});

export default router;
