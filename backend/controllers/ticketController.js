import * as TicketModel from '../models/Ticket.js';
import { getPool } from "../config/db.js";
import sql from "mssql";

export async function bookTicket(req, res) {
  try {
    const { ShowtimeID, SeatID } = req.body;
    const UserID = req.user.userId; // Lấy từ token
    
    // Kiểm tra xem ghế đã được đặt chưa (Optional but recommended)
    const bookedSeats = await TicketModel.getBookedSeats(ShowtimeID);
    if (bookedSeats.includes(SeatID)) {
        return res.status(400).json({ success: false, message: "Ghế này đã có người đặt" });
    }

    const ticket = await TicketModel.createTicket({ UserID, ShowtimeID, SeatID });
    res.status(201).json({ success: true, data: ticket, message: "Đặt vé thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMyTickets(req, res) {
  try {
    const userId = req.user.userId;
    const pool = await getPool();
    
    // Join các bảng để lấy đầy đủ thông tin: Phim, Phòng, Ghế, Thời gian
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT 
            t.TicketID, t.Status, 
            CONVERT(NVARCHAR(50), t.BookingTime, 127) as BookingTime, 
            t.SeatID, t.DiscountAmount,
            m.MovieID, m.Title, m.Poster, m.Duration, 
            st.Price, st.PriceVIP, st.PriceDouble,
            r.RoomName, s.SeatType,
            s.SeatRow, s.SeatNumber,
            CONVERT(NVARCHAR(50), st.StartTime, 127) as StartTime, -- Convert to ISO 8601 UTC string
            st.ShowtimeID,
            (CASE 
                WHEN s.SeatType = 'VIP' THEN ISNULL(st.PriceVIP, st.Price + 20000)
                WHEN s.SeatType = 'Double' THEN ISNULL(st.PriceDouble, st.Price * 2)
                ELSE ISNULL(st.Price, 50000)
            END) as TicketPrice,
            CAST(CASE WHEN EXISTS (
                SELECT 1 FROM Reviews rev 
                WHERE rev.UserID = t.UserID AND rev.MovieID = m.MovieID
            ) THEN 1 ELSE 0 END AS BIT) as IsReviewed,
            (SELECT sn.Name, ts.Quantity, ts.PriceAtBooking 
             FROM TicketSnacks ts 
             JOIN Snacks sn ON ts.SnackID = sn.SnackID 
             WHERE ts.TicketID = t.TicketID 
             FOR JSON PATH) AS SnacksData
        FROM Tickets t
        LEFT JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        LEFT JOIN Movies m ON st.MovieID = m.MovieID
        LEFT JOIN Rooms r ON st.RoomID = r.RoomID
        LEFT JOIN Seats s ON t.SeatID = s.SeatID
        WHERE t.UserID = @UserID
        ORDER BY t.BookingTime DESC
      `);

    // Chuyển đổi chuỗi JSON từ SQL Server thành mảng object thực tế
    const formattedData = result.recordset.map(row => ({
      ...row,
      Snacks: row.SnacksData ? JSON.parse(row.SnacksData) : []
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Lỗi lấy vé của tôi:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách vé" });
  }
}

export async function getBookedSeats(req, res) {
  try {
    const { showtimeId } = req.params;
    const seatIds = await TicketModel.getBookedSeats(showtimeId);
    res.json({ success: true, data: seatIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteTickets(req, res) {
  try {
    const { ticketIds } = req.body; // Mảng các TicketID cần xóa
    const { userId, role } = req.user; // Lấy thêm role từ token

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách vé không hợp lệ" });
    }

    const pool = await getPool();
    const request = pool.request();
    
    // Tạo danh sách tham số để tránh SQL Injection
    const parameterNames = ticketIds.map((id, index) => `@id${index}`);
    ticketIds.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
    });

    const idList = parameterNames.join(',');
    let userCondition = "";
    // Nếu không phải Admin, chỉ cho phép xóa vé của chính mình
    if (role !== 'Admin') {
      request.input('UserID', sql.Int, userId);
      userCondition = ` AND UserID = @UserID`;
    }

    // 1. Xóa đồ ăn đi kèm trước để tránh lỗi ràng buộc khóa ngoại (FK)
    const deleteSnacksQuery = `DELETE FROM TicketSnacks WHERE TicketID IN (SELECT TicketID FROM Tickets WHERE TicketID IN (${idList})${userCondition})`;
    await request.query(deleteSnacksQuery);

    // 2. Xóa vé
    const deleteTicketQuery = `DELETE FROM Tickets WHERE TicketID IN (${idList})${userCondition}`;
    await request.query(deleteTicketQuery);

    res.json({ success: true, message: "Đã xóa lịch sử vé thành công" });
  } catch (error) {
    console.error("Lỗi xóa vé:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi xóa vé" });
  }
}

// Cập nhật trạng thái vé (Ví dụ: Từ 'Đã đặt' sang 'Đã lấy vé')
export async function updateTicketStatus(req, res) {
  try {
    const { ticketId, status } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('TicketID', sql.Int, ticketId)
      .input('Status', sql.NVarChar, status)
      .query('UPDATE Tickets SET Status = @Status WHERE TicketID = @TicketID');
    res.json({ success: true, message: "Cập nhật trạng thái thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllTickets(req, res) {
  try {
    const pool = await getPool();
    
    // Join thêm bảng Users để biết ai đặt vé
    const result = await pool.request()
      .query(`
        SELECT 
            t.TicketID, t.Status, 
            CONVERT(NVARCHAR(50), t.BookingTime, 127) as BookingTime, -- Chuẩn hóa ISO
            t.SeatID, m.MovieID, t.AdminNote, t.DiscountAmount,
            u.FullName, u.Username, u.Phone,
            m.Title as MovieTitle, s.SeatType,
            r.RoomName,
            s.SeatRow, s.SeatNumber,
            CONVERT(NVARCHAR(50), st.StartTime, 127) as StartTime, -- Convert to ISO 8601 UTC string
            st.Price, st.PriceVIP, st.PriceDouble, 
            (CASE 
                WHEN s.SeatType = 'VIP' THEN ISNULL(st.PriceVIP, st.Price + 20000)
                WHEN s.SeatType = 'Double' THEN ISNULL(st.PriceDouble, st.Price * 2)
                ELSE ISNULL(st.Price, 50000)
            END) as TicketPrice,
            CAST(CASE WHEN EXISTS (
                SELECT 1 FROM Reviews rev 
                WHERE rev.UserID = t.UserID AND rev.MovieID = m.MovieID
            ) THEN 1 ELSE 0 END AS BIT) as IsReviewed,
            (SELECT sn.Name, ts.Quantity, ts.PriceAtBooking 
             FROM TicketSnacks ts 
             JOIN Snacks sn ON ts.SnackID = sn.SnackID 
             WHERE ts.TicketID = t.TicketID 
             FOR JSON PATH) AS SnacksData
        FROM Tickets t
        LEFT JOIN Users u ON t.UserID = u.UserID
        LEFT JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        LEFT JOIN Movies m ON st.MovieID = m.MovieID
        LEFT JOIN Rooms r ON st.RoomID = r.RoomID
        LEFT JOIN Seats s ON t.SeatID = s.SeatID
        ORDER BY t.BookingTime DESC
      `);

    const formattedData = result.recordset.map(row => ({
      ...row,
      Snacks: row.SnacksData ? JSON.parse(row.SnacksData) : []
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Lỗi lấy tất cả vé:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách vé" });
  }
}

export async function cancelTickets(req, res) {
  try {
    const { ticketIds, reason, bankName, bankAccountNumber } = req.body;
    const userId = req.user.userId;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách vé không hợp lệ" });
    }

    const pool = await getPool();
    
    // Tạo request object riêng cho mỗi truy vấn để tránh xung đột tham số
    const checkRequest = pool.request();
    const updateRequest = pool.request();

    // Thiết lập tham số cho danh sách ID cho cả hai request
    const parameterNames = ticketIds.map((id, index) => `@id${index}`);
    ticketIds.forEach((id, index) => {
        checkRequest.input(`id${index}`, sql.Int, id);
        updateRequest.input(`id${index}`, sql.Int, id);
    });
    const idList = parameterNames.join(',');

    // 1. Kiểm tra quyền sở hữu và thời gian (áp dụng cho vé phim)
    const checkQuery = `
        SELECT t.TicketID, t.ShowtimeID, st.StartTime 
        FROM Tickets t
        LEFT JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        WHERE t.TicketID IN (${idList}) AND t.UserID = @UserID
    `;
    checkRequest.input('UserID', sql.Int, userId);
    const checkRes = await checkRequest.query(checkQuery);

    if (checkRes.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy vé hợp lệ để hủy." });
    }

    // Kiểm tra xem có bất kỳ vé nào trong nhóm có ShowtimeID không
    const hasMovieTickets = checkRes.recordset.some(t => t.ShowtimeID !== null);

    if (hasMovieTickets) {
        // Nếu có vé phim, tìm StartTime sớm nhất trong số các vé phim đó
        const earliestMovieTicket = checkRes.recordset
            .filter(t => t.ShowtimeID !== null && t.StartTime !== null)
            .sort((a, b) => new Date(a.StartTime).getTime() - new Date(b.StartTime).getTime())[0];

        if (!earliestMovieTicket) {
            return res.status(400).json({ success: false, message: "Không thể xác định thời gian chiếu cho vé phim." });
        }

        const startTime = new Date(earliestMovieTicket.StartTime);
        const now = new Date();
        const diffHours = (startTime - now) / (1000 * 60 * 60);

        if (diffHours < 72) {
            return res.status(400).json({ success: false, message: "Chỉ được phép hủy vé trước giờ chiếu ít nhất 3 ngày (72 tiếng)." });
        }
    }

    // 2. Cập nhật trạng thái thành 'Cancelled' và lưu thông tin hoàn tiền
    // Ở đây ta dùng trường Status để ghi nhận, trong thực tế bạn có thể thêm các cột 
    // CancellationReason, RefundBank, RefundAccount vào bảng Tickets.

    // Sử dụng request object đã có từ đầu hàm để tránh tạo request mới không cần thiết
    // và đảm bảo các tham số được truyền đúng cách.
    // Các tham số cho AdminNote đã được thêm vào request object ở phần checkQuery.
    // Tuy nhiên, để đảm bảo chúng có sẵn cho updateQuery, ta thêm lại nếu cần.
    // Hoặc tốt hơn là dùng một request object duy nhất cho toàn bộ hàm.
    // Hiện tại, request đã được tạo ở đầu hàm và các tham số idX và UserID đã được thêm.
    // Ta chỉ cần thêm các tham số cho Reason, Bank, Account.
    updateRequest.input('UserID', sql.Int, userId);
    updateRequest.input('Reason', sql.NVarChar, reason || '');
    updateRequest.input('Bank', sql.NVarChar, bankName || '');
    updateRequest.input('Account', sql.NVarChar, bankAccountNumber || '');
    const updateQuery = `
        UPDATE Tickets 
        SET Status = 'Cancelled',
            AdminNote = ISNULL(AdminNote, '') + N' | Lý do hủy: ' + @Reason + N' | Hoàn tiền: ' + @Bank + N' - ' + @Account
        WHERE TicketID IN (${idList}) AND UserID = @UserID AND Status != 'Cancelled'
    `;
    await updateRequest.query(updateQuery);

    res.json({ success: true, message: "Hủy vé thành công! Tiền sẽ được hoàn trả theo chính sách của rạp." });
  } catch (error) {
    console.error("Lỗi hủy vé:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
  }
}
