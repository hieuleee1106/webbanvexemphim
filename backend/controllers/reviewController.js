import { getPool } from "../config/db.js";
import sql from "mssql";

export async function addReview(req, res) {
    try {
        const { MovieID, Rating, Comment } = req.body;
        const UserID = req.user?.userId;

        if (!UserID) {
            return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để đánh giá." });
        }

        const pool = await getPool();

        // 1. Kiểm tra xem người dùng đã thực sự xem phim này chưa (vé ở trạng thái Booked và suất chiếu đã kết thúc)
        const checkWatch = await pool.request()
            .input('uID', sql.Int, UserID)
            .input('mID', sql.Int, parseInt(MovieID))
            .query(`
                SELECT TOP 1 t.TicketID
                FROM Tickets t
                JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
                JOIN Movies m ON st.MovieID = m.MovieID
                WHERE t.UserID = @uID AND st.MovieID = @mID AND t.Status != 'Cancelled'
                -- Kiểm tra phim đã kết thúc chưa (dùng giờ máy chủ địa phương)
                AND DATEADD(MINUTE, ISNULL(m.Duration, 120), st.StartTime) < GETDATE()
            `);

        if (checkWatch.recordset.length === 0) {
            return res.status(403).json({ success: false, message: "Bạn chỉ có thể đánh giá phim sau khi đã xem thực tế." });
        }

        // 2. Thêm hoặc cập nhật đánh giá (Upsert)
        await pool.request()
            .input('mID', sql.Int, parseInt(MovieID))
            .input('uID', sql.Int, UserID)
            .input('rate', sql.Int, parseInt(Rating))
            .input('cmt', sql.NVarChar, Comment || '')
            .query(`
                IF EXISTS (SELECT 1 FROM Reviews WHERE UserID = @uID AND MovieID = @mID)
                    UPDATE Reviews SET Rating = @rate, Comment = @cmt, CreatedAt = GETDATE() WHERE UserID = @uID AND MovieID = @mID
                ELSE
                    INSERT INTO Reviews (MovieID, UserID, Rating, Comment) VALUES (@mID, @uID, @rate, @cmt)
            `);

        res.json({ success: true, message: "Cảm ơn bạn đã dành thời gian đánh giá phim!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteReview(req, res) {
    try {
        const { MovieID } = req.params;
        const UserID = req.user.userId;
        const pool = await getPool();

        await pool.request()
            .input('mID', sql.Int, MovieID)
            .input('uID', sql.Int, UserID)
            .query("DELETE FROM Reviews WHERE UserID = @uID AND MovieID = @mID");

        res.json({ success: true, message: "Đã xóa bình luận thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getMovieReviews(req, res) {
    try {
        const { MovieID } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('mID', sql.Int, MovieID)
            .query(`
                SELECT r.*, u.FullName, u.Username
                FROM Reviews r
                JOIN Users u ON r.UserID = u.UserID
                WHERE r.MovieID = @mID
                ORDER BY r.CreatedAt DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}