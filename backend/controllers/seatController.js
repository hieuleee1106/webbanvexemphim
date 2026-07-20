import { getPool } from "../config/db.js";
import sql from "mssql";

// Lấy tất cả ghế của một phòng (kèm giá)
export async function getSeatsByRoom(req, res) {
    try {
        const { roomId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('RoomID', sql.Int, roomId)
            .query("SELECT * FROM Seats WHERE RoomID = @RoomID ORDER BY SeatRow, SeatNumber");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Thêm một ghế lẻ
export async function createSeat(req, res) {
    try {
        const { RoomID, SeatRow, SeatNumber, SeatType } = req.body;
        const pool = await getPool();

        // 1. Kiểm tra giới hạn số lượng ghế của phòng
        const roomCheck = await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .query("SELECT TotalSeats FROM Rooms WHERE RoomID = @RoomID");
        
        const currentSeatsCheck = await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .query("SELECT COUNT(*) as count FROM Seats WHERE RoomID = @RoomID");

        const totalAllowed = roomCheck.recordset[0]?.TotalSeats || 0;
        const currentCount = currentSeatsCheck.recordset[0]?.count || 0;

        if (currentCount + 1 > totalAllowed) {
            return res.status(400).json({ success: false, message: `Phòng đã đạt giới hạn tối đa ${totalAllowed} ghế.` });
        }

        // Kiểm tra ghế đã tồn tại trong phòng này chưa
        const checkResult = await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .input('SeatRow', sql.NVarChar, SeatRow)
            .input('SeatNumber', sql.Int, SeatNumber)
            .query("SELECT SeatID FROM Seats WHERE RoomID = @RoomID AND SeatRow = @SeatRow AND SeatNumber = @SeatNumber");

        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ success: false, message: `Ghế ${SeatRow}${SeatNumber} đã tồn tại trong phòng này.` });
        }

        await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .input('SeatRow', sql.NVarChar, SeatRow)
            .input('SeatNumber', sql.Int, SeatNumber)
            .input('SeatType', sql.NVarChar, SeatType || 'Standard')
            .query("INSERT INTO Seats (RoomID, SeatRow, SeatNumber, SeatType) VALUES (@RoomID, @SeatRow, @SeatNumber, @SeatType)");
        res.status(201).json({ success: true, message: "Thêm ghế thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi thêm ghế: " + error.message });
    }
}

// Thêm ghế hàng loạt
export async function createBulkSeats(req, res) {
    try {
        const { RoomID, Row, StartNumber, Count, SeatType } = req.body;
        const pool = await getPool();

        // 1. Kiểm tra giới hạn số lượng ghế của phòng trước khi thực hiện bulk insert
        const roomCheck = await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .query("SELECT TotalSeats FROM Rooms WHERE RoomID = @RoomID");
        
        const currentSeatsCheck = await pool.request()
            .input('RoomID', sql.Int, RoomID)
            .query("SELECT COUNT(*) as count FROM Seats WHERE RoomID = @RoomID");

        const totalAllowed = roomCheck.recordset[0]?.TotalSeats || 0;
        const currentCount = currentSeatsCheck.recordset[0]?.count || 0;
        const requestedCount = parseInt(Count);

        if (currentCount + requestedCount > totalAllowed) {
            return res.status(400).json({ 
                success: false, 
                message: `Không thể thêm ${requestedCount} ghế. Phòng chỉ còn trống ${totalAllowed - currentCount} chỗ (Tối đa: ${totalAllowed}).` 
            });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            for (let i = 0; i < Count; i++) {
                const seatNumber = parseInt(StartNumber) + i;

                // Kiểm tra ghế đã tồn tại chưa trong cùng transaction
                const checkRequest = new sql.Request(transaction);
                const checkResult = await checkRequest
                    .input('RoomID', sql.Int, RoomID)
                    .input('SeatRow', sql.NVarChar, Row)
                    .input('SeatNumber', sql.Int, seatNumber)
                    .query("SELECT SeatID FROM Seats WHERE RoomID = @RoomID AND SeatRow = @SeatRow AND SeatNumber = @SeatNumber");

                if (checkResult.recordset.length > 0) {
                    // Nếu phát hiện trùng, báo lỗi để rollback toàn bộ transaction
                    throw new Error(`Ghế ${Row}${seatNumber} đã tồn tại trong phòng này.`);
                }

                const request = new sql.Request(transaction);
                await request
                    .input('RoomID', sql.Int, RoomID)
                    .input('SeatRow', sql.NVarChar, Row)
                    .input('SeatNumber', sql.Int, seatNumber)
                    .input('SeatType', sql.NVarChar, SeatType || 'Standard')
                    .query("INSERT INTO Seats (RoomID, SeatRow, SeatNumber, SeatType) VALUES (@RoomID, @SeatRow, @SeatNumber, @SeatType)");
            }
            await transaction.commit();
            res.status(201).json({ success: true, message: `Đã thêm thành công ${Count} ghế vào hàng ${Row}` });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi thêm ghế hàng loạt: " + error.message });
    }
}

// Xóa ghế hàng loạt
export async function deleteBulkSeats(req, res) {
    try {
        const { seatIds } = req.body;
        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return res.status(400).json({ success: false, message: "Danh sách ghế không hợp lệ" });
        }
        const pool = await getPool();
        const ids = seatIds.join(',');
        await pool.request().query(`DELETE FROM Seats WHERE SeatID IN (${ids})`);
        res.json({ success: true, message: `Đã xóa ${seatIds.length} ghế.` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi xóa ghế: " + error.message });
    }
}

// Cập nhật loại ghế hàng loạt
export async function updateBulkSeatTypes(req, res) {
    try {
        const { seatIds, type } = req.body;
        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return res.status(400).json({ success: false, message: "Danh sách ghế không hợp lệ" });
        }
        const pool = await getPool();
        const ids = seatIds.join(',');
        await pool.request()
            .input('Type', sql.NVarChar, type)
            .query(`UPDATE Seats SET SeatType = @Type WHERE SeatID IN (${ids})`);
        res.json({ success: true, message: `Đã chuyển ${seatIds.length} ghế sang loại ${type}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi cập nhật loại ghế: " + error.message });
    }
}