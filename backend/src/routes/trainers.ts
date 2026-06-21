import { Router, Response } from 'express';
import { Trainer } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, createTrainerSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

// 1. GET all trainers
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await Trainer.find({ gymOwnerId: req.user!.id, isDeleted: false }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching trainers.' });
  }
});

// 2. POST create trainer
router.post('/', validateBody(createTrainerSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, specialization, status } = req.body;
  if (!name || !phone) return res.status(400).json({ message: 'Name and Phone are required.' });

  try {
    const trainer = await Trainer.create({
      gymOwnerId: req.user!.id,
      name,
      phone,
      specialization: specialization || '',
      status: status || 'active'
    });
    return res.status(201).json(trainer);
  } catch (err) {
    return res.status(500).json({ message: 'Error registering trainer.' });
  }
});

// 3. PUT update trainer
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainer = await Trainer.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false },
      req.body,
      { new: true }
    );
    if (!trainer) return res.status(404).json({ message: 'Trainer not found.' });
    return res.json(trainer);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating trainer details.' });
  }
});

// 4. DELETE soft delete trainer
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainer = await Trainer.findOneAndUpdate(
      { _id: req.params.id, gymOwnerId: req.user!.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!trainer) return res.status(404).json({ message: 'Trainer not found.' });
    return res.json({ message: 'Trainer deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting trainer.' });
  }
});

export default router;
