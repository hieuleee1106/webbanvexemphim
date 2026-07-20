import cron from 'node-cron';
import { getPool } from '../config/db.js';
import sql from 'mssql';
import sendEmail from './sendEmail.js'; // Giả định nằm cùng thư mục utils hoặc sửa thành ../sendEmail.js tùy vị trí thật

const startReminderJob = () => {
  // Tác vụ chạy định kỳ mỗi phút một lần
  cron.schedule('* * * * *', async () => {
    try {
      const pool = await getPool();
      
      // Lấy danh sách vé:
      // - Chưa gửi nhắc nhở (ReminderSent = 0)
      // - Suất chiếu bắt đầu trong khoảng 15 phút tới
      // - Vé ở trạng thái đã đặt (Status = 'Booked')
      const result = await pool.request().query(`
        SELECT 
            t.TicketID, u.Username as Email, u.FullName,
            m.Title as MovieTitle, r.RoomName, st.StartTime,
            s.SeatRow, s.SeatNumber
        FROM Tickets t
        JOIN Users u ON t.UserID = u.UserID
        JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        JOIN Movies m ON st.MovieID = m.MovieID
        JOIN Rooms r ON st.RoomID = r.RoomID
        JOIN Seats s ON t.SeatID = s.SeatID
        WHERE ISNULL(t.ReminderSent, 0) = 0 -- Xử lý trường hợp ReminderSent bị NULL
          AND t.Status = N'Đã đặt'
AND st.StartTime BETWEEN GETUTCDATE() AND DATEADD(minute, 15, GETUTCDATE())      `);

      const tickets = result.recordset;
      if (!tickets || tickets.length === 0) return;
      console.log(`[ReminderJob] Tìm thấy ${tickets.length} vé sắp chiếu. Đang tiến hành gửi mail...`);

      for (const ticket of tickets) {
        const message = `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #e11d48;">🔔 Nhắc nhở: Phim của bạn sắp bắt đầu!</h2>
            <p>Chào <b>${ticket.FullName || ticket.Email}</b>,</p>
            <p>Bạn có lịch xem phim <b>${ticket.MovieTitle}</b> tại rạp CinemaDB trong 15 phút nữa.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #e11d48; margin: 20px 0;">
              <p style="margin: 0;"><b>Phòng chiếu:</b> ${ticket.RoomName}</p>
              <p style="margin: 5px 0;"><b>Giờ bắt đầu:</b> ${new Date(ticket.StartTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
              <p style="margin: 0;"><b>Vị trí ghế:</b> ${ticket.SeatRow}${ticket.SeatNumber}</p>
            </div>
            <p>Bạn hãy mau chóng đến rạp để nhận vé và ổn định chỗ ngồi nhé!</p>
            <p>Chúc bạn xem phim vui vẻ!</p>
          </div>
        `;

        await sendEmail({
          email: ticket.Email,
          subject: `[CinemaDB] Nhắc nhở: Phim ${ticket.MovieTitle} sắp khởi chiếu`,
          message
        });
        console.log(`[ReminderJob] Đã gửi mail thành công cho khách hàng: ${ticket.Email}`);

        // Đánh dấu đã gửi nhắc nhở để không gửi lại ở lần quét sau
        await pool.request()
          .input('TicketID', sql.Int, ticket.TicketID)
          .query("UPDATE Tickets SET ReminderSent = 1 WHERE TicketID = @TicketID");
      }
    } catch (error) {
      console.error("❌ Lỗi Reminder Job:", error);
    }
  });
  
  console.log("⏰ Reminder Job đã khởi động - Hệ thống sẽ quét vé sắp chiếu mỗi phút.");
};

export default startReminderJob;