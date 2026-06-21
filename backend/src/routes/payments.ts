import { Router, Response } from 'express';
import { Payment, Member, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createPaymentSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. GET all payment transactions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await Payment.find({ gymOwnerId: req.user!.id, isDeleted: false })
      .populate({ path: 'memberId', select: 'name phone email remainingAmount' })
      .sort({ createdAt: -1 });
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching payment logs.' });
  }
});

// 2. POST log payment transaction
router.post('/', validateBody(createPaymentSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { memberId, amount, paymentMethod, notes } = req.body;

  if (!memberId || amount === undefined || !paymentMethod) {
    return res.status(400).json({ message: 'Missing transaction parameters.' });
  }

  try {
    const member = await Member.findOne({ _id: memberId, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(400).json({ message: 'Selected member is invalid.' });

    // Ensure they don't overpay (optional validation, but let's just subtract)
    const newRemainingAmount = Math.max(0, member.remainingAmount - amount);
    member.amountPaid += amount;
    member.remainingAmount = newRemainingAmount;
    member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : 'partial';
    
    await member.save();

    // Generate unique receipt number (REC-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${dateStr}-${rand}`;

    const payment = await Payment.create({
      gymOwnerId: req.user!.id,
      memberId,
      amount,
      pendingAmount: newRemainingAmount,
      paymentMethod,
      receiptNumber,
      notes: notes || ''
    });

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Logged Payment receipt ${receiptNumber} (₹${amount}) for Member: ${member.name}`, owner!.email, req);

    return res.status(201).json(payment);
  } catch (err) {
    console.error('Error logging payment:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 3. GET receipt metadata details
router.get('/:id/receipt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false })
      .populate({ path: 'memberId', select: 'name phone address joiningDate' });
    if (!payment) return res.status(404).json({ message: 'Receipt not found.' });

    const owner = await GymOwner.findById(req.user!.id).select('branding gymName address phone');
    if (!owner) return res.status(404).json({ message: 'Gym details not found.' });

    return res.json({
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      pendingAmount: payment.pendingAmount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      member: payment.memberId,
      branding: {
        logo: owner.branding?.logo || '',
        gymName: owner.branding?.gymName || owner.gymName,
        address: owner.branding?.address || owner.address,
        contactNumber: owner.branding?.contactNumber || owner.phone
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error loading receipt.' });
  }
});

// 4. DELETE soft delete payment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    payment.isDeleted = true;
    await payment.save();

    const owner = await GymOwner.findById(req.user!.id);
    await logAudit(`Deleted Payment receipt ${payment.receiptNumber}`, owner!.email, req);

    return res.json({ message: 'Payment record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting payment record.' });
  }
});

export default router;
