import express from 'express';
import { bookTicket, getBookedSeats, getMyTickets, deleteTickets, getAllTickets, updateTicketStatus, cancelTickets } from '../controllers/ticketController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/book', requireAuth, bookTicket);
router.get('/booked/:showtimeId', getBookedSeats);
router.get('/my-tickets', requireAuth, getMyTickets);
router.post('/delete', requireAuth, deleteTickets); // Dùng POST để gửi body mảng IDs dễ dàng
router.get('/all', requireAuth, getAllTickets); // API cho Admin
router.put('/status', requireAuth, updateTicketStatus);
router.post('/cancel', requireAuth, cancelTickets);

export default router;
