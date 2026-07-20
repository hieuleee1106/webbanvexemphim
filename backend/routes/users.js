import express from 'express';
import { getAllUsers, deleteUser, updateUser, changePassword } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', requireAuth, getAllUsers);
router.delete('/:id', requireAuth, deleteUser);

// Route cập nhật thông tin cá nhân và avatar
router.put('/:id', requireAuth, upload.single('avatar'), updateUser);

// Route thay đổi mật khẩu
router.put('/:id/change-password', requireAuth, changePassword);

export default router;