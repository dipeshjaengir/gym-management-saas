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
        amountPaid: member.amountPaid,
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

export default router;
