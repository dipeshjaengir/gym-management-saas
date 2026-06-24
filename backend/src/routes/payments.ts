import { Router, Response } from 'express';
import { Payment, Member, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createPaymentSchema } from '../middleware/validation';
import { notificationProvider } from '../config/notifications';

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

// 2. GET all payments for a specific member
router.get('/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await Payment.find({
      memberId: req.params.memberId,
      gymOwnerId: req.user!.id,
      isDeleted: false
    }).sort({ paymentDate: -1 });
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching member payments.' });
  }
});

// 3. POST log payment transaction
router.post('/', validateBody(createPaymentSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { memberId, amount, paymentMethod, notes } = req.body;

  if (!memberId || amount === undefined || !paymentMethod) {
    return res.status(400).json({ message: 'Missing transaction parameters.' });
  }

  try {
    const member = await Member.findOne({ _id: memberId, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(400).json({ message: 'Selected member is invalid.' });

    const owner = await GymOwner.findById(req.user!.id);
    if (!owner) return res.status(400).json({ message: 'Gym owner not found.' });

    // Ensure they don't overpay
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
      notes: notes || '',
      operatorName: owner.ownerName || 'Owner',
      isVoided: false
    });

    await logAudit(`Logged Payment receipt ${receiptNumber} (₹${amount}) for Member: ${member.name}`, owner.email, req);

    // Generate WhatsApp dues recovery url
    const welcomeResult = await notificationProvider.sendDueCollectionMessage(member.phone, {
      memberName: member.name,
      amount,
      remaining: newRemainingAmount
    });

    return res.status(201).json({
      payment,
      whatsappUrl: welcomeResult.url
    });
  } catch (err) {
    console.error('Error logging payment:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. PUT Edit Payment transaction
router.put('/:id/edit', async (req: AuthenticatedRequest, res: Response) => {
  const { amount, notes } = req.body;
  if (amount === undefined || amount <= 0) {
    return res.status(400).json({ message: 'Valid payment amount is required.' });
  }

  try {
    const payment = await Payment.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });
    if (payment.isVoided) return res.status(400).json({ message: 'Voided payments cannot be edited.' });

    const member = await Member.findOne({ _id: payment.memberId, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(400).json({ message: 'Associated member not found.' });

    const owner = await GymOwner.findById(req.user!.id);
    const operator = owner ? owner.ownerName : 'Admin';

    const oldAmount = payment.amount;
    const diff = amount - oldAmount;

    // Update member paid/remaining dues
    member.amountPaid += diff;
    member.remainingAmount = Math.max(0, member.remainingAmount - diff);
    member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : (member.amountPaid > 0 ? 'partial' : 'unpaid');
    await member.save();

    // Preserve original amount & track auditor fields
    if (payment.originalAmount === undefined || payment.originalAmount === null) {
      payment.originalAmount = oldAmount;
    }
    payment.updatedAmount = amount;
    payment.updatedBy = operator;
    payment.updatedDate = new Date();
    
    payment.amount = amount;
    payment.pendingAmount = member.remainingAmount;
    if (notes !== undefined) payment.notes = notes;
    await payment.save();

    await logAudit(`Edited Payment receipt ${payment.receiptNumber}: changed from ₹${oldAmount} to ₹${amount} for Member: ${member.name}`, owner ? owner.email : 'Admin', req);

    return res.json(payment);
  } catch (err) {
    console.error('Error editing payment:', err);
    return res.status(500).json({ message: 'Error adjusting payment transaction.' });
  }
});

// 5. PUT Void Payment transaction
router.put('/:id/void', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false });
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });
    if (payment.isVoided) return res.status(400).json({ message: 'Payment is already voided.' });

    const member = await Member.findOne({ _id: payment.memberId, gymOwnerId: req.user!.id, isDeleted: false });
    if (!member) return res.status(400).json({ message: 'Associated member not found.' });

    const owner = await GymOwner.findById(req.user!.id);

    // Revert amounts on member
    member.amountPaid = Math.max(0, member.amountPaid - payment.amount);
    member.remainingAmount += payment.amount;
    member.paymentStatus = member.remainingAmount <= 0 ? 'paid' : (member.amountPaid > 0 ? 'partial' : 'unpaid');
    await member.save();

    // Mark payment voided
    payment.isVoided = true;
    payment.pendingAmount = member.remainingAmount;
    await payment.save();

    await logAudit(`Voided Payment receipt ${payment.receiptNumber} (₹${payment.amount}) for Member: ${member.name}`, owner ? owner.email : 'Admin', req);

    return res.json(payment);
  } catch (err) {
    console.error('Error voiding payment:', err);
    return res.status(500).json({ message: 'Error voiding payment transaction.' });
  }
});

// 6. GET receipt metadata details
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
      operatorName: payment.operatorName || 'Admin',
      isVoided: payment.isVoided || false,
      originalAmount: payment.originalAmount,
      updatedAmount: payment.updatedAmount,
      updatedBy: payment.updatedBy,
      updatedDate: payment.updatedDate,
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

// 7. DELETE soft delete payment
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
