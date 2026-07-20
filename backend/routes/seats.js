import express from 'express';
import { 
    getSeatsByRoom,
    createSeat,
    createBulkSeats,
    deleteBulkSeats,
    updateBulkSeatTypes
} from '../controllers/seatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/room/:roomId', getSeatsByRoom);
router.post('/', requireAuth, createSeat);
router.post('/bulk', requireAuth, createBulkSeats);
router.post('/delete-bulk', requireAuth, deleteBulkSeats);
router.post('/update-type', requireAuth, updateBulkSeatTypes);

export default router;