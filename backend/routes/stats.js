import express from 'express';
import { getSystemStats } from '../controllers/statsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireAuth, getSystemStats);

export default router;