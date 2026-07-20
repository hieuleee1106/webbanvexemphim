import { getPool } from "../config/db.js";
import sql from "mssql";

export async function getSystemStats(req, res) {
  try {
    const { range = 'week', startDate, endDate } = req.query;
    const pool = await getPool();
    const request = pool.request(); // Sử dụng một request object duy nhất

    // 1. Định nghĩa CTE để tính toán giá trị của từng vé (Ghế + Snacks) độc lập
    const baseQuery = `
      WITH TicketValuation AS (
        SELECT 
          t.TicketID, t.UserID, t.BookingTime, t.Status, t.ShowtimeID, m.Title,
          m.MovieID, -- Thêm MovieID để thống kê theo phim
          (CASE 
            WHEN t.ShowtimeID IS NULL THEN 0 
            ELSE ISNULL(CASE 
              WHEN s.SeatType = 'VIP' THEN ISNULL(st.PriceVIP, ISNULL(st.Price, 50000) + 20000)
              WHEN s.SeatType = 'Double' THEN ISNULL(st.PriceDouble, ISNULL(st.Price, 50000) * 2)
              ELSE ISNULL(st.Price, 50000)
            END, 0)
          END) as BaseTicketPrice,
          ISNULL((SELECT SUM(ts.Quantity * ts.PriceAtBooking) FROM TicketSnacks ts WHERE ts.TicketID = t.TicketID), 0) as SnackPrice
        FROM Tickets t
        LEFT JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        LEFT JOIN Seats s ON t.SeatID = s.SeatID
        LEFT JOIN Movies m ON st.MovieID = m.MovieID
      )
    `;

    // 2. Xác định filter thời gian (Dùng DATEDIFF để chuẩn múi giờ)
    let timeWhere = "";
    if (startDate && endDate) {
        // Khoảng thời gian tùy chỉnh
        request.input('StartDate', sql.DateTime, new Date(startDate));
        // Đặt EndDate vào cuối ngày 23:59:59
        request.input('EndDate', sql.DateTime, new Date(new Date(endDate).setHours(23, 59, 59, 999)));
        timeWhere = "tv.BookingTime BETWEEN @StartDate AND @EndDate";
    } else if (range === 'day') {
        timeWhere = "CAST(DATEADD(HOUR, 7, tv.BookingTime) AS DATE) = CAST(DATEADD(HOUR, 7, GETUTCDATE()) AS DATE)";
    } else if (range === 'month') {
        timeWhere = "tv.BookingTime >= DATEADD(day, -30, GETUTCDATE())";
    } else { // Mặc định là 'week'
        timeWhere = "tv.BookingTime >= DATEADD(day, -7, GETUTCDATE())";
    }

    // 3. Thực hiện truy vấn KPIs (Tổng số)
    const kpiRes = await request.query(`
      ${baseQuery}
      SELECT 
        (SELECT COUNT(*) FROM Movies) as TotalMovies,
        (SELECT COUNT(*) FROM Users WHERE Role = 'User') as TotalUsers,
        ISNULL((SELECT COUNT(*) FROM TicketValuation tv WHERE tv.Status != 'Cancelled' AND ${timeWhere}), 0) as TotalTickets,
        ISNULL((SELECT SUM(BaseTicketPrice + SnackPrice) FROM TicketValuation tv WHERE tv.Status != 'Cancelled' AND ${timeWhere}), 0) as TotalRevenue
    `);
    const kpis = kpiRes.recordset[0];

    // 4. Thực hiện truy vấn Phim bán chạy
    const topMoviesRes = await request.query(`
      ${baseQuery}
      SELECT TOP 5 tv.Title as name, COUNT(tv.TicketID) as value
      FROM TicketValuation tv
      WHERE tv.Status != 'Cancelled' AND tv.ShowtimeID IS NOT NULL AND ${timeWhere}
      GROUP BY tv.Title
      ORDER BY value DESC
    `);

    // 5. Thực hiện truy vấn Xu hướng (Trend) cho biểu đồ
    let trendQuery = "";
    if (range === 'day') {
      trendQuery = `
        ${baseQuery}
        SELECT CAST(DATEPART(HOUR, DATEADD(HOUR, 7, BookingTime)) AS VARCHAR) + ':00' as name, 
               SUM(BaseTicketPrice + SnackPrice) as value
        FROM TicketValuation tv
        WHERE tv.Status != 'Cancelled' AND ${timeWhere}
        GROUP BY DATEPART(HOUR, DATEADD(HOUR, 7, BookingTime))
        ORDER BY DATEPART(HOUR, DATEADD(HOUR, 7, BookingTime))`;
    } else if (range === 'month') {
      trendQuery = `
        ${baseQuery}
        SELECT FORMAT(DATEADD(HOUR, 7, BookingTime), 'dd/MM') as name, 
               SUM(BaseTicketPrice + SnackPrice) as value
        FROM TicketValuation tv
        WHERE tv.Status != 'Cancelled' AND ${timeWhere}
        GROUP BY FORMAT(DATEADD(HOUR, 7, BookingTime), 'dd/MM'), CAST(DATEADD(HOUR, 7, BookingTime) AS DATE)
        ORDER BY CAST(DATEADD(HOUR, 7, BookingTime) AS DATE)`;
    } else {
      trendQuery = `
        ${baseQuery}
        SELECT 
          CASE DATEPART(WEEKDAY, DATEADD(HOUR, 7, BookingTime))
            WHEN 1 THEN 'CN' WHEN 2 THEN 'T2' WHEN 3 THEN 'T3' 
            WHEN 4 THEN 'T4' WHEN 5 THEN 'T5' WHEN 6 THEN 'T6' WHEN 7 THEN 'T7'
          END as name,
          SUM(BaseTicketPrice + SnackPrice) as value
        FROM TicketValuation tv
        WHERE tv.Status != 'Cancelled' AND ${timeWhere}
        GROUP BY DATEPART(WEEKDAY, DATEADD(HOUR, 7, BookingTime))
        ORDER BY MIN(DATEADD(HOUR, 7, BookingTime))`;
    }
    const trendRes = await request.query(trendQuery);

    // 6. Thực hiện truy vấn Giao dịch gần đây (Gộp các vé cùng đơn)
    const recentRes = await request.query(`
      ${baseQuery}
      SELECT TOP 5 
        CONVERT(NVARCHAR(30), MAX(tv.BookingTime), 127) as BookingTime, 
        ISNULL(MAX(u.FullName), MAX(u.Username)) as FullName, 
        tv.Status,
        MAX(tv.Title) as MovieTitle,
        COUNT(tv.TicketID) as TicketCount,
        SUM(tv.BaseTicketPrice + tv.SnackPrice) as Amount
      FROM TicketValuation tv
      LEFT JOIN Users u ON tv.UserID = u.UserID
      WHERE ${timeWhere}
      GROUP BY tv.UserID, tv.Status, FORMAT(tv.BookingTime, 'yyyy-MM-dd HH:mm')
      ORDER BY MAX(tv.BookingTime) DESC
    `);

    // 7. Thực hiện truy vấn thống kê theo từng phim
    const perMovieStatsRes = await request.query(`
      ${baseQuery}
      SELECT 
        tv.MovieID,
        MAX(tv.Title) as MovieTitle,
        COUNT(tv.TicketID) as TicketsSold,
        ISNULL(SUM(tv.BaseTicketPrice + tv.SnackPrice), 0) as Revenue
      FROM TicketValuation tv
      WHERE tv.Status != 'Cancelled' AND tv.ShowtimeID IS NOT NULL AND ${timeWhere}
      GROUP BY tv.MovieID, tv.Title
      ORDER BY Revenue DESC
    `);

    res.json({
      success: true,
      data: {
        ...kpis,
        TopMovies: topMoviesRes.recordset,
        RevenueTrend: trendRes.recordset,
        RecentTransactions: recentRes.recordset,
        PerMovieStats: perMovieStatsRes.recordset // Thêm dữ liệu thống kê theo phim
      }
    });
  } catch (error) {
    console.error("❌ Lỗi Backend Dashboard:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}
