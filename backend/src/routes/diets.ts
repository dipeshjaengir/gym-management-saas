import { Router, Response } from 'express';
import { DietPlan, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, saveDietSchema } from '../middleware/validation';
import { logMemberActivity } from '../utils/activityLogger';

const router = Router();

router.use(authenticateToken);

// 1. GET Diet Plan for specific member
router.get('/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await DietPlan.findOne({
      memberId: req.params.memberId,
      gymOwnerId: req.user!.id,
      isDeleted: false
    });
    
    if (!plan) return res.json({ instructions: '', meals: [] });
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving diet details.' });
  }
});

// 2. POST Save/Update Diet Plan
router.post('/member/:memberId', validateBody(saveDietSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { instructions, meals } = req.body;

  try {
    let plan = await DietPlan.findOne({
      memberId: req.params.memberId,
      gymOwnerId: req.user!.id,
      isDeleted: false
    });

    if (plan) {
      plan.instructions = instructions;
      plan.meals = meals || [];
      await plan.save();
    } else {
      plan = await DietPlan.create({
        gymOwnerId: req.user!.id,
        memberId: req.params.memberId,
        instructions: instructions || '',
        meals: meals || []
      });
    }

    // Resolve operator name
    const owner = await GymOwner.findById(req.user!.id);
    const opName = owner ? owner.ownerName : 'Admin';

    // Log Activity
    await logMemberActivity(
      req.user!.id,
      req.params.memberId,
      'diet_updated',
      'Diet Plan Updated',
      opName,
      `Diet details saved with ${meals?.length || 0} meals.`
    );

    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error saving diet details.' });
  }
});

export default router;
