import express from 'express';
import { spinWheel, getWheelData } from '../controllers/luckyWheelController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', requireAuth, getWheelData);
router.post('/spin', requireAuth, spinWheel);

export default router;