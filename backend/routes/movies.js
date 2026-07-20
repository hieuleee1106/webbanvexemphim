import express from 'express';
import { addMovie, getMovies, updateMovie, deleteMovie, getMovie, getRecommendedMovies } from '../controllers/movieController.js';
import { upload } from '../config/cloudinary.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Lấy danh sách tất cả phim (public, không cần đăng nhập)
router.get('/', getMovies);

// Lấy danh sách phim gợi ý dựa trên sở thích (Yêu cầu đăng nhập)
router.get('/recommendations', requireAuth, getRecommendedMovies);

// Lấy chi tiết 1 phim (để sửa)
router.get('/:MovieID', getMovie);

// Định nghĩa route POST /api/movies để thêm phim mới
// 1. requireAuth: Yêu cầu đăng nhập
// 2. requireRole: Yêu cầu vai trò 'Admin' hoặc 'Staff'
// 3. upload.fields: Middleware xử lý upload file lên Cloudinary
// 4. addMovie: Controller xử lý logic cuối cùng 

router.put('/:MovieID', requireAuth, requireRole(['Admin', 'Staff']), upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'trailer', maxCount: 1 }]), updateMovie);

router.delete('/:MovieID', requireAuth, requireRole(['Admin', 'Staff']), deleteMovie);
router.post('/', 
    requireAuth, 
    requireRole(['Admin', 'Staff']),
    upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'trailer', maxCount: 1 }]), 
    addMovie);

export default router;