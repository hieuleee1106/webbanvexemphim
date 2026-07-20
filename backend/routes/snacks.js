import express from 'express';
import { 
    getAllSnacks, 
    adminGetAllSnacks, 
    createSnack, 
    updateSnack, 
    deleteSnack 
} from '../controllers/snackController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// Route cho người dùng (Công khai)
router.get('/', getAllSnacks);

// Route cho Admin/Staff
router.get('/admin', requireAuth, requireRole(['Admin', 'Staff']), adminGetAllSnacks);
router.post('/', requireAuth, requireRole(['Admin', 'Staff']), upload.single('image'), createSnack);
router.put('/:id', requireAuth, requireRole(['Admin', 'Staff']), upload.single('image'), updateSnack);
router.delete('/:id', requireAuth, requireRole(['Admin', 'Staff']), deleteSnack);

export default router;