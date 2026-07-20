import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB, getPool } from './config/db.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import movieRoutes from './routes/movies.js';
import showtimeRoutes from './routes/showtimes.js';
import seatRoutes from './routes/seats.js';
import ticketRoutes from './routes/tickets.js';
import paymentRoutes from './routes/payment.js';
import transactionRoutes from './routes/transactions.js';
import voucherRoutes from './routes/vouchers.js';
import chatRoutes from './routes/chat.js';
import statsRoutes from './routes/stats.js';
import luckyWheelRoutes from './routes/luckyWheel.js';
import snackRoutes from './routes/snacks.js';
import reviewRoutes from './routes/reviews.js';
import startReminderJob from './utils/reminderJob.js';
import sql from "mssql";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Địa chỉ Frontend của bạn
    methods: ["GET", "POST"]
  }
});

// Lưu io vào app để các controller có thể sử dụng thông qua req.app.get('socketio')
app.set('socketio', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối database khi khởi động
connectDB().catch(err => {
  console.error('Không thể kết nối database:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/lucky-wheel', luckyWheelRoutes);
app.use('/api/snacks', snackRoutes);
app.use('/api/reviews', reviewRoutes);

// Kích hoạt hệ thống nhắc nhở tự động
startReminderJob();

// --- Socket.IO Logic ---
io.on("connection", (socket) => {
  // Khi người dùng vào trang đặt vé của một lịch chiếu cụ thể
  socket.on("join_room", (showtimeId) => {
    socket.join(showtimeId);
  });

  // Khi có ai đó đặt vé thành công, báo cho mọi người trong cùng lịch chiếu đó biết
  socket.on("refresh_seats", (showtimeId) => {
    // Gửi sự kiện 'update_seat_status' cho tất cả mọi người trong phòng TRỪ người gửi
    // Hoặc gửi cho tất cả (io.to) để đảm bảo đồng bộ
    io.to(showtimeId).emit("update_seat_status");
  });

  // --- Logic Chat Trực Tiếp (Socket.IO) ---
  socket.on("join_chat", (userId) => {
    socket.join(`chat_${userId}`);
    console.log(`[Chat] User ${userId} đã tham gia phòng chat.`);
  });

  socket.on("staff_join_notifications", () => {
    socket.join("staff_notifications");
  });

  socket.on("send_message", async (data) => {
    const { userId, text, senderName, isAdmin, avatar } = data;
    const room = `chat_${userId}`;

    // --- LƯU TIN NHẮN VÀO DATABASE ---
    try {
      const pool = await getPool();
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('Text', sql.NVarChar, text)
        .input('SenderName', sql.NVarChar, senderName)
        .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
        .query("INSERT INTO ChatMessages (UserID, [Text], SenderName, IsAdmin) VALUES (@UserID, @Text, @SenderName, @IsAdmin)");
    } catch (err) {
      console.error("❌ Lỗi lưu tin nhắn chat:", err.message);
    }

    io.to(room).emit("receive_message", { userId, text, senderName, isAdmin, avatar, timestamp: new Date() });
    
    // Luôn thông báo cho staff để cập nhật tin nhắn mới nhất ở Sidebar
    io.to("staff_notifications").emit("new_message_alert", { userId, senderName, text, isAdmin, avatar });
  });
});

// Example route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Start the server
const port = 3000;
httpServer.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
export default app;