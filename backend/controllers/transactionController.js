import { getPool } from "../config/db.js";
import sql from "mssql";

export async function getAllTransactions(req, res) {
  try {
    const pool = await getPool();
    // Truy vấn gom nhóm các vé được đặt cùng lúc bởi cùng 1 user
    const result = await pool.request().query(`
      SELECT 
        t.UserID, u.FullName, u.Username, u.Phone,
        -- 🔥 FIX: Dùng chuẩn 126 và thêm 'Z' để Frontend tự động cộng 7 tiếng (múi giờ VN)
        CONVERT(NVARCHAR(19), t.BookingTime, 126) + 'Z' as BookingTime, 
        t.Status,
        COUNT(t.TicketID) as TicketCount,
        SUM(CASE 
            WHEN s.SeatType = 'VIP' THEN ISNULL(st.PriceVIP, ISNULL(st.Price, 0) + 20000)
            WHEN s.SeatType = 'Double' THEN ISNULL(st.PriceDouble, ISNULL(st.Price, 0) * 2)
            ELSE ISNULL(st.Price, 50000)
        END) as TicketsPrice,
        SUM(ISNULL(t.DiscountAmount, 0)) as TotalDiscount,
        (SELECT SUM(ts.PriceAtBooking * ts.Quantity) 
         FROM TicketSnacks ts 
         WHERE ts.TicketID IN (
           SELECT TicketID FROM Tickets t2 
           WHERE t2.UserID = t.UserID AND CONVERT(NVARCHAR(19), t2.BookingTime, 126) = CONVERT(NVARCHAR(19), t.BookingTime, 126)
         )
        ) as SnacksPrice,
        (SELECT sn.Name, ts.Quantity 
         FROM TicketSnacks ts 
         JOIN Snacks sn ON ts.SnackID = sn.SnackID
         WHERE ts.TicketID IN (
           SELECT TicketID FROM Tickets t3 
           WHERE t3.UserID = t.UserID AND CONVERT(NVARCHAR(19), t3.BookingTime, 126) = CONVERT(NVARCHAR(19), t.BookingTime, 126)
         )
         FOR JSON PATH
        ) as SnacksJSON,
        (SELECT STRING_AGG(CONCAT(SeatCount, 'x ', SeatType), ', ')
         FROM (
            SELECT s2.SeatType, COUNT(*) as SeatCount
            FROM Tickets t2
            JOIN Seats s2 ON t2.SeatID = s2.SeatID
            WHERE t2.UserID = t.UserID AND CONVERT(NVARCHAR(19), t2.BookingTime, 126) = CONVERT(NVARCHAR(19), t.BookingTime, 126)
            GROUP BY s2.SeatType
         ) sub) as SeatBreakdown,
        MAX(m.Title) as MovieTitle
      FROM Tickets t
      JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN Seats s ON t.SeatID = s.SeatID
      LEFT JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
      LEFT JOIN Movies m ON st.MovieID = m.MovieID
      GROUP BY t.UserID, u.FullName, u.Username, u.Phone, CONVERT(NVARCHAR(19), t.BookingTime, 126), t.Status
      ORDER BY CONVERT(NVARCHAR(19), t.BookingTime, 126) DESC
    `);
    
    const transactions = result.recordset.map(row => {
        const bookingDate = new Date(row.BookingTime);
        return {
            ...row,
            Snacks: row.SnacksJSON ? JSON.parse(row.SnacksJSON) : [],
            TotalAmount: Math.max(0, (row.TicketsPrice || 0) + (row.SnacksPrice || 0) - (row.TotalDiscount || 0)),
            OrderCode: `ORD${new Date(row.BookingTime).getTime().toString().slice(-6)}${row.UserID}`
        };
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}