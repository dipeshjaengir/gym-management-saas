import { Router, Response } from 'express';
import { MembershipPlan } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { validateBody, createPlanSchema, updatePlanSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. GET all plans
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await MembershipPlan.find({ gymOwnerId: req.user!.id, isDeleted: false }).sort({ createdAt: -1 });
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving plans.' });
  }
});

// 2. POST create plan
router.post('/', validateBody(createPlanSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { name, durationMonths, price, status } = req.body;
  if (!name || !durationMonths || !price) {
    return res.status(400).json({ message: 'All parameters are required.' });
  }

  try {
    const plan = await MembershipPlan.create({
      gymOwnerId: req.user!.id,
      name,
      durationMonths,
      price,
      status: status || 'active'
    });

    return res.status(201).json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating plan.' });
  }
});

// 3. PUT edit plan
router.put('/:id', validateBody(updatePlanSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await MembershipPlan.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false },
      req.body,
      { new: true }
    );
    if (!plan) return res.status(404).json({ message: 'Plan not found.' });
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating plan.' });
  }
});

// 4. DELETE soft delete plan
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await MembershipPlan.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!plan) return res.status(404).json({ message: 'Plan not found.' });
    return res.json({ message: 'Plan soft-deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting plan.' });
  }
});

export default router;
