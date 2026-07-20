import express from 'express';
import { 
    getAllVouchers, 
    getVoucherById,
    createVoucher, 
    updateVoucher, 
    deleteVoucher,
    applyVoucher,
    claimVoucher
} from '../controllers/voucherController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin routes
router.get('/', requireAuth, getAllVouchers);
router.get('/:id', requireAuth, getVoucherById);
router.post('/', requireAuth, createVoucher);
router.put('/:id', requireAuth, updateVoucher);
router.delete('/:id', requireAuth, deleteVoucher);

// User route
router.post('/apply', requireAuth, applyVoucher);
router.post('/claim', requireAuth, claimVoucher);

export default router;