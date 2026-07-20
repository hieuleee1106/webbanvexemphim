import express from 'express';
import { getAllTransactions } from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/all', requireAuth, getAllTransactions);

export default router;