import { Router, Response } from 'express';
import { Member, GymOwner, Notification } from '../models';
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
      if (!m.membershipEnd) continue;

      const expiry = new Date(m.membershipEnd);
      const diffTime = expiry.getTime() - todayStart.getTime();
      const diffDays = Math.ceil(diffTime / oneDay);

      const owner = await GymOwner.findById(gymOwnerId);
      const gymName = owner?.branding?.gymName || owner?.gymName || 'GymLedger';
      const to = m.phone;

      if (diffDays <= 7) {
        let typeLabel = 'expiry_alert';
        let msg = '';
        let message = '';
        if (diffDays < 0) {
          typeLabel = 'expired';
          msg = `Hello ${m.name}\n\nFriendly reminder from ${gymName}. Your membership expired ${Math.abs(diffDays)} days ago (on ${expiry.toLocaleDateString('en-IN')}). Please renew at the front desk to continue your workouts.\n\nThank you.`;
          message = `Expired ${Math.abs(diffDays)} Days Ago (${expiry.toLocaleDateString('en-IN')})`;
        } else if (diffDays === 0) {
          typeLabel = 'today';
          msg = `Hello ${m.name}\n\nYour membership at ${gymName} expires today! Please renew at the front desk to continue your workouts.\n\nThank you.`;
          message = `Expires Today (${expiry.toLocaleDateString('en-IN')})`;
        } else {
          typeLabel = diffDays === 1 ? '1_day' : (diffDays === 3 ? '3_days' : (diffDays === 7 ? '7_days' : 'expiry_alert'));
          msg = `Hello ${m.name}\n\nFriendly reminder from ${gymName}. Your membership is expiring in ${diffDays} days (on ${expiry.toLocaleDateString('en-IN')}). Please renew soon!\n\nThank you.`;
          message = `Expiring in ${diffDays} Days (${expiry.toLocaleDateString('en-IN')})`;
        }

        reminders.push({
          type: typeLabel as any,
          member: m,
          daysDiff: diffDays,
          message,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      }

      const totalOutstandingVal = (m.remainingAmount || 0) + (m.previousOutstanding || 0);
      if (totalOutstandingVal > 0) {
        const msg = `Hello ${m.name}\n\nPayment Reminder from ${gymName}.\n\nYou have a total outstanding due of ₹${totalOutstandingVal} for your membership. Please clear it as soon as possible.\n\nThank you.`;
        reminders.push({
          type: 'due',
          member: m,
          message: `Outstanding Dues: ₹${totalOutstandingVal}`,
          whatsappUrl: `https://wa.me/${to.replace(/\D/g, '').length === 10 ? `91${to.replace(/\D/g, '')}` : to.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        });
      }
    }

    return res.json(reminders);
  } catch (err) {
    return res.status(500).json({ message: 'Error compiling reminders.' });
  }
});

// 3. GET all active notifications for in-app tray
router.get('/center', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    // A. Gym Owner Subscription Expiring / Trial Ending
    const owner = await GymOwner.findById(gymOwnerId);
    if (owner) {
      const expiry = new Date(owner.subscription.expiryDate);
      const now = new Date();
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= 7) {
        if (owner.isTrial) {
          const title = 'Trial Ending Soon';
          const existing = await Notification.findOne({ gymOwnerId, title, isDismissed: false });
          if (!existing) {
            await Notification.create({
              gymOwnerId,
              title,
              message: `Your free trial expires in ${daysLeft} days (on ${expiry.toLocaleDateString('en-IN')}). Upgrade now to keep full access.`,
              category: 'trial'
            });
          }
        } else {
          const title = 'Gym Subscription Expiring';
          const existing = await Notification.findOne({ gymOwnerId, title, isDismissed: false });
          if (!existing) {
            await Notification.create({
              gymOwnerId,
              title,
              message: `Your platform subscription expires in ${daysLeft} days (on ${expiry.toLocaleDateString('en-IN')}). Please renew.`,
              category: 'expiry'
            });
          }
        }
      }
    }

    // B. Member Membership Expiring Soon (7 days)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringMembers = await Member.find({
      gymOwnerId,
      membershipEnd: { $gte: todayStart, $lte: sevenDaysFromNow },
      isDeleted: false,
      isArchived: false
    });

    for (const m of expiringMembers) {
      const title = `Membership Expiring: ${m.name}`;
      const existing = await Notification.findOne({ gymOwnerId, title, isDismissed: false });
      if (!existing) {
        await Notification.create({
          gymOwnerId,
          title,
          message: `Membership for ${m.name} is expiring soon (on ${new Date(m.membershipEnd).toLocaleDateString('en-IN')}).`,
          category: 'renewal'
        });
      }
    }

    const list = await Notification.find({ gymOwnerId, isDismissed: false })
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving notifications.' });
  }
});

// 4. PUT mark notification as read
router.put('/center/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json(notification);
  } catch (err) {
    return res.status(500).json({ message: 'Error marking notification as read.' });
  }
});

// 5. PUT dismiss specific notification
router.put('/center/:id/dismiss', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId },
      { isDismissed: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json(notification);
  } catch (err) {
    return res.status(500).json({ message: 'Error dismissing notification.' });
  }
});

// 6. PUT dismiss all notifications
router.put('/center/dismiss-all', async (req: AuthenticatedRequest, res: Response) => {
  const gymOwnerId = req.user!.id;
  try {
    await Notification.updateMany(
      { gymOwnerId, isDismissed: false },
      { isDismissed: true }
    );
    return res.json({ message: 'All notifications dismissed successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error dismissing all notifications.' });
  }
});

export default router;
