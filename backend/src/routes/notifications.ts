import { Router, Response } from 'express';
import { Member, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { notificationProvider } from '../config/notifications';

const router = Router();

router.use(authenticateToken);

// 1. POST Dispatch / Generate WhatsApp Click-To-Chat URL
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  const { memberId, type, daysRemaining } = req.body;

  if (!memberId || !type) {
    return res.status(400).json({ message: 'Member ID and notification type are required.' });
  }

  try {
    const member = await Member.findOne({ _id: memberId, gymOwnerId: req.user!.id, isDeleted: false }).populate('planId');
    if (!member) return res.status(400).json({ message: 'Selected member is invalid.' });

    const owner = await GymOwner.findById(req.user!.id);
    if (!owner) return res.status(400).json({ message: 'Gym owner not found.' });

    const gymName = owner.branding?.gymName || owner.gymName;
    const to = member.phone;

    let result;

    if (type === 'welcome') {
      result = await notificationProvider.sendWelcomeMessage(to, {
        gymName,
        memberName: member.name,
        planName: (member.planId as any)?.name || 'General Membership',
        totalAmount: (member.planId as any)?.price || (member.amountPaid + member.remainingAmount),
        amountPaid: member.amountPaid,
        remainingDue: member.remainingAmount,
        startDate: member.membershipStart.toISOString().split('T')[0],
        expiryDate: member.membershipEnd.toISOString().split('T')[0]
      });
    } else if (type === 'renewal') {
      result = await notificationProvider.sendRenewalMessage(to, {
        memberName: member.name,
        planName: (member.planId as any)?.name || 'General Membership',
        expiryDate: member.membershipEnd.toISOString().split('T')[0]
      });
    } else if (type === 'due_collection') {
      const { amount } = req.body;
      result = await notificationProvider.sendDueCollectionMessage(to, {
        memberName: member.name,
        amount: amount || 0,
        remaining: member.remainingAmount
      });
    } else if (type === 'expiry_warning') {
      result = await notificationProvider.sendExpiryWarning(to, {
        gymName,
        memberName: member.name,
        daysRemaining: daysRemaining || 3,
        expiryDate: member.membershipEnd.toISOString().split('T')[0]
      });
    } else if (type === 'post_expiry') {
      result = await notificationProvider.sendPostExpiryNotice(to, {
        gymName,
        memberName: member.name,
        daysRemaining: 0,
        expiryDate: member.membershipEnd.toISOString().split('T')[0]
      });
    } else {
      return res.status(400).json({ message: 'Invalid notification type.' });
    }

    return res.json({
      message: 'WhatsApp notification prefilled text generated successfully.',
      whatsappUrl: result.url,
      rawMessage: result.rawMessage
    });
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return res.status(500).json({ message: 'Error compiling notification template.' });
  }
});

// 2. GET auto reminders lists grouped by type
router.get('/reminders', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    const members = await Member.find({ gymOwnerId, isDeleted: false }).populate('planId');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDay = 24 * 60 * 60 * 1000;

    const reminders: {
      type: '7_days' | '3_days' | '1_day' | 'today' | 'due';
      member: any;
      daysDiff?: number;
      message: string;
      whatsappUrl: string;
    }[] = [];

    for (const m of members) {
      const expiry = new Date(m.membershipEnd);
      const diffTime = expiry.getTime() - todayStart.getTime();
      const diffDays = Math.ceil(diffTime / oneDay);

      const owner = await GymOwner.findById(gymOwnerId);
      const gymName = owner?.branding?.gymName || owner?.gymName || 'GymLedger';
      const to = m.phone;

      if (diffDays === 7) {
        const msg = `Hello ${m.name}\n\nFriendly reminder from ${gymName}. Your membership is expiring in 7 days (on ${expiry.toLocaleDateString('en-IN')}). Please renew soon!\n\nThank you.`;
        reminders.push({
          type: '7_days',
          member: m,
          daysDiff: 7,
          message: `Expiring in 7 Days (${expiry.toLocaleDateString('en-IN')})`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      } else if (diffDays === 3) {
        const msg = `Hello ${m.name}\n\nFriendly reminder from ${gymName}. Your membership is expiring in 3 days (on ${expiry.toLocaleDateString('en-IN')}). Please renew at the receptionist desk!\n\nThank you.`;
        reminders.push({
          type: '3_days',
          member: m,
          daysDiff: 3,
          message: `Expiring in 3 Days (${expiry.toLocaleDateString('en-IN')})`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      } else if (diffDays === 1) {
        const msg = `Hello ${m.name}\n\nURGENT reminder from ${gymName}. Your membership is expiring tomorrow (on ${expiry.toLocaleDateString('en-IN')}). Please renew your package.\n\nThank you.`;
        reminders.push({
          type: '1_day',
          member: m,
          daysDiff: 1,
          message: `Expiring Tomorrow (${expiry.toLocaleDateString('en-IN')})`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      } else if (diffDays === 0) {
        const msg = `Hello ${m.name}\n\nYour membership at ${gymName} expires today! Please renew at the front desk to continue your workouts.\n\nThank you.`;
        reminders.push({
          type: 'today',
          member: m,
          daysDiff: 0,
          message: `Expires Today (${expiry.toLocaleDateString('en-IN')})`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      }

      if (m.remainingAmount > 0) {
        const msg = `Hello ${m.name}\n\nPayment Reminder from ${gymName}.\n\nYou have an outstanding due of ₹${m.remainingAmount} for your membership plan (${m.planId?.name || 'General'}). Please clear it as soon as possible.\n\nThank you.`;
        reminders.push({
          type: 'due',
          member: m,
          message: `Outstanding Dues: ₹${m.remainingAmount}`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      }
    }

    return res.json(reminders);
  } catch (err) {
    return res.status(500).json({ message: 'Error compiling reminders.' });
  }
});

export default router;
