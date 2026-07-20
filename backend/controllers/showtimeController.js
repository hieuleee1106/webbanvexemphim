import { getPool } from "../config/db.js";
import sql from "mssql";

// Lấy tất cả lịch chiếu (kèm tên phim, tên phòng)
export async function getAllShowtimes(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT st.ShowtimeID, CONVERT(NVARCHAR(50), st.StartTime, 127) as StartTime, st.RoomID, st.MovieID, st.Price, st.PriceVIP, st.PriceDouble, st.Format, m.Title as MovieTitle, m.Poster, r.RoomName, r.TotalSeats,
             (SELECT COUNT(*) FROM Tickets t WHERE t.ShowtimeID = st.ShowtimeID AND t.Status != 'Cancelled') as BookedSeats
      FROM Showtimes st
      JOIN Movies m ON st.MovieID = m.MovieID
      JOIN Rooms r ON st.RoomID = r.RoomID
      ORDER BY st.StartTime DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy chi tiết 1 lịch chiếu
export async function getShowtimeById(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request().input('ID', sql.Int, id).query(`
      SELECT st.ShowtimeID, CONVERT(NVARCHAR(50), st.StartTime, 127) as StartTime, st.RoomID, st.MovieID, st.Price, st.PriceVIP, st.PriceDouble, st.Format, m.Title, m.Duration, r.RoomName 
      FROM Showtimes st
      JOIN Movies m ON st.MovieID = m.MovieID
      JOIN Rooms r ON st.RoomID = r.RoomID
      WHERE st.ShowtimeID = @ID
    `);
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy lịch chiếu theo phim (cho trang MovieDetails)
export async function getShowtimesByMovie(req, res) {
  try {
    const { movieId } = req.params;
    const pool = await getPool();
    const result = await pool.request().input('MovieID', sql.Int, movieId).query(`
      SELECT st.ShowtimeID, CONVERT(NVARCHAR(50), st.StartTime, 127) as StartTime, st.RoomID, st.MovieID, st.Price, st.PriceVIP, st.PriceDouble, st.Format, r.RoomName, r.TotalSeats,
             (SELECT COUNT(*) FROM Tickets t WHERE t.ShowtimeID = st.ShowtimeID AND t.Status != 'Cancelled') as BookedSeats
      FROM Showtimes st
      JOIN Rooms r ON st.RoomID = r.RoomID
      -- Chỉ lấy các suất chiếu chưa bắt đầu (tương lai)
      WHERE st.MovieID = @MovieID AND st.StartTime > GETUTCDATE()
      ORDER BY st.StartTime ASC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Tạo lịch chiếu mới (Có kiểm tra trùng lặp)
export async function createShowtime(req, res) {
  try {
    const { MovieID, RoomID, StartTime, Price, PriceVIP, PriceDouble, Format } = req.body;
    const pool = await getPool();
    
    // 1. Lấy thông tin phim để biết thời lượng
    const movieRes = await pool.request().input('MovieID', sql.Int, MovieID).query("SELECT Duration FROM Movies WHERE MovieID = @MovieID");
    if (movieRes.recordset.length === 0) return res.status(404).json({ success: false, message: "Phim không tồn tại" });
    
    // Chuyển chuỗi ISO (UTC) từ frontend thành đối tượng Date
    const newStart = new Date(StartTime);
    const duration = movieRes.recordset[0].Duration;
    const CLEANING_TIME = 15; // Thời gian dọn dẹp giữa các suất
    
    const newEnd = new Date(newStart.getTime() + (duration + CLEANING_TIME) * 60000);

    // 2. Kiểm tra trùng lịch trong cùng phòng
    // Logic: Tìm các suất chiếu trong cùng phòng mà khoảng thời gian bị chồng lấn
    const conflictCheck = await pool.request()
      .input('RoomID', sql.Int, RoomID)
      .query(`
        SELECT st.ShowtimeID, st.StartTime, m.Duration
        FROM Showtimes st
        JOIN Movies m ON st.MovieID = m.MovieID
        WHERE st.RoomID = @RoomID
      `);

    const conflict = conflictCheck.recordset.find(existing => {
        const existStart = new Date(existing.StartTime);
        const existEnd = new Date(existStart.getTime() + (existing.Duration + CLEANING_TIME) * 60000);
        
        // Điều kiện trùng: (StartA < EndB) và (EndA > StartB)
        return (newStart < existEnd && newEnd > existStart);
    });

    if (conflict) {
        return res.status(400).json({ 
            success: false, 
            message: `Trùng lịch! Phòng này đang chiếu phim khác từ ${new Date(conflict.StartTime).toLocaleTimeString()} đến ${new Date(new Date(conflict.StartTime).getTime() + (conflict.Duration + 15)*60000).toLocaleTimeString()}` 
        });
    }

    // 3. Nếu không trùng, thêm vào DB
    await pool.request()
      .input('MovieID', sql.Int, MovieID)
      .input('RoomID', sql.Int, RoomID)
      .input('StartTime', sql.DateTime, newStart) // Truyền trực tiếp đối tượng Date
      .input('Price', sql.Decimal(10, 2), Price || 50000)
      .input('PriceVIP', sql.Decimal(10, 2), PriceVIP || null)
      .input('PriceDouble', sql.Decimal(10, 2), PriceDouble || null)
      .input('Format', sql.NVarChar, Format || 'Vietsub')
      .query("INSERT INTO Showtimes (MovieID, RoomID, StartTime, Price, PriceVIP, PriceDouble, Format) VALUES (@MovieID, @RoomID, @StartTime, @Price, @PriceVIP, @PriceDouble, @Format)");

    res.json({ success: true, message: "Tạo lịch chiếu thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Cập nhật lịch chiếu (Có kiểm tra trùng lặp)
export async function updateShowtime(req, res) {
  try {
    const { id } = req.params;
    const { MovieID, RoomID, StartTime, Price, PriceVIP, PriceDouble, Format } = req.body;
    const pool = await getPool();
    
    const movieRes = await pool.request().input('MovieID', sql.Int, MovieID).query("SELECT Duration FROM Movies WHERE MovieID = @MovieID");
    if (movieRes.recordset.length === 0) return res.status(404).json({ success: false, message: "Phim không tồn tại" });
    
    const newStart = new Date(StartTime);
    const duration = movieRes.recordset[0].Duration;
    const CLEANING_TIME = 15;
    const newEnd = new Date(newStart.getTime() + (duration + CLEANING_TIME) * 60000);

    // Kiểm tra trùng lịch (loại trừ ID hiện tại)
    const conflictCheck = await pool.request()
      .input('RoomID', sql.Int, RoomID)
      .input('ID', sql.Int, id)
      .query(`
        SELECT st.ShowtimeID, st.StartTime, m.Duration
        FROM Showtimes st
        JOIN Movies m ON st.MovieID = m.MovieID
        WHERE st.RoomID = @RoomID AND st.ShowtimeID <> @ID
      `);

    const conflict = conflictCheck.recordset.find(existing => {
        const existStart = new Date(existing.StartTime);
        const existEnd = new Date(existStart.getTime() + (existing.Duration + CLEANING_TIME) * 60000);
        return (newStart < existEnd && newEnd > existStart);
    });

    if (conflict) {
        return res.status(400).json({ 
            success: false, 
            message: `Trùng lịch với suất chiếu khác trong phòng này!` 
        });
    }

    await pool.request()
      .input('ID', sql.Int, id)
      .input('MovieID', sql.Int, MovieID)
      .input('RoomID', sql.Int, RoomID)
      .input('StartTime', sql.DateTime, newStart)
      .input('Price', sql.Decimal(10, 2), Price || 50000)
      .input('PriceVIP', sql.Decimal(10, 2), PriceVIP || null)
      .input('PriceDouble', sql.Decimal(10, 2), PriceDouble || null)
      .input('Format', sql.NVarChar, Format || 'Vietsub')
      .query(`
        UPDATE Showtimes 
        SET MovieID = @MovieID, RoomID = @RoomID, StartTime = @StartTime, Price = @Price, PriceVIP = @PriceVIP, PriceDouble = @PriceDouble, Format = @Format
        WHERE ShowtimeID = @ID
      `);

    res.json({ success: true, message: "Cập nhật lịch chiếu thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteShowtime(req, res) {
    try {
        const { id } = req.params;
        const pool = await getPool();
        await pool.request().input('ID', sql.Int, id).query("DELETE FROM Showtimes WHERE ShowtimeID = @ID");
        res.json({ success: true, message: "Đã xóa lịch chiếu" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}