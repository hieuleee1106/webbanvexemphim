import express from 'express';
import { chatWithAI, getChatHistory, getActiveChatUsers } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, chatWithAI);
router.get('/history/:userId', getChatHistory);
router.get('/active-users', requireAuth, getActiveChatUsers);

export default router;