import express from 'express';
import { 
    getAllShowtimes, 
    getShowtimeById, 
    getShowtimesByMovie, 
    createShowtime, 
    updateShowtime,
    deleteShowtime 
} from '../controllers/showtimeController.js';

const router = express.Router();

router.get('/', getAllShowtimes);
router.get('/:id', getShowtimeById);
router.get('/movie/:movieId', getShowtimesByMovie);
router.post('/', createShowtime); // Admin: Tạo lịch chiếu
router.put('/:id', updateShowtime); // Admin: Cập nhật lịch chiếu
router.delete('/:id', deleteShowtime); // Admin: Xóa lịch chiếu

export default router;