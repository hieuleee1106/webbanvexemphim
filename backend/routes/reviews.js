import express from 'express';
import { addReview, getMovieReviews, deleteReview } from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/movie/:MovieID', getMovieReviews);
router.post('/', requireAuth, addReview);
router.delete('/movie/:MovieID', requireAuth, deleteReview);

export default router;