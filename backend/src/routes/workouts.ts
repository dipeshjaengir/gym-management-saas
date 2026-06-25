import { Router, Response } from 'express';
import { WorkoutPlan, GymOwner } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, saveWorkoutSchema } from '../middleware/validation';
import { logMemberActivity } from '../utils/activityLogger';

const router = Router();

router.use(authenticateToken);

// 1. GET Workout Plan for specific member
router.get('/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await WorkoutPlan.findOne({
      memberId: req.params.memberId,
      gymOwnerId: req.user!.id,
      isDeleted: false
    });
    
    if (!plan) return res.json({ instructions: '', exercises: [] });
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving workout details.' });
  }
});

// 2. POST Save/Update Workout Plan
router.post('/member/:memberId', validateBody(saveWorkoutSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { instructions, exercises } = req.body;

  try {
    let plan = await WorkoutPlan.findOne({
      memberId: req.params.memberId,
      gymOwnerId: req.user!.id,
      isDeleted: false
    });

    if (plan) {
      plan.instructions = instructions;
      plan.exercises = exercises || [];
      await plan.save();
    } else {
      plan = await WorkoutPlan.create({
        gymOwnerId: req.user!.id,
        memberId: req.params.memberId,
        instructions: instructions || '',
        exercises: exercises || []
      });
    }

    // Resolve operator name
    const owner = await GymOwner.findById(req.user!.id);
    const opName = owner ? owner.ownerName : 'Admin';

    // Log Activity
    await logMemberActivity(
      req.user!.id,
      req.params.memberId,
      'workout_updated',
      'Workout Plan Updated',
      opName,
      `Workout details saved with ${exercises?.length || 0} exercises.`
    );

    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Error saving workout details.' });
  }
});

export default router;
