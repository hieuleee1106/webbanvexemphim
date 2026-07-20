import { getPool } from "../config/db.js";
import sql from "mssql";

export async function getWheelData(req, res) {
    try {
        const userId = req.user.userId;
        const pool = await getPool();

        // 1. Kiểm tra xem hôm nay người dùng đã quay chưa
        const checkSpin = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT LastSpinDate FROM LuckyWheelSpins 
                WHERE UserID = @UserID AND CAST(LastSpinDate AS DATE) = CAST(GETDATE() AS DATE)
            `);

        const hasSpun = checkSpin.recordset.length > 0;

        // 2. Lấy 6 Voucher ngẫu nhiên đang hoạt động
        const vouchers = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
            SELECT TOP 6 VoucherID, Code, DiscountPercent, DiscountAmount 
            FROM Vouchers 
            WHERE Status = 'Active' AND Quantity > 0 AND ExpiryDate > GETDATE()
            ORDER BY NEWID()
        `);

        res.json({ 
            success: true, 
            hasSpun, 
            vouchers: vouchers.recordset 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function spinWheel(req, res) {
    try {
        const userId = req.user.userId;
        const pool = await getPool();

        // 1. Kiểm tra xem hôm nay người dùng đã quay chưa
        const checkSpin = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT LastSpinDate FROM LuckyWheelSpins 
                WHERE UserID = @UserID AND CAST(LastSpinDate AS DATE) = CAST(GETDATE() AS DATE)
            `);

        if (checkSpin.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Hôm nay bạn đã hết lượt quay. Hãy quay lại vào ngày mai nhé!" });
        }

        // 2. Lấy danh sách Voucher khả dụng làm phần thưởng
        const voucherResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
            SELECT TOP 1 VoucherID, Code, DiscountPercent, DiscountAmount 
            FROM Vouchers 
            WHERE Status = 'Active' AND Quantity > 0 AND ExpiryDate > GETDATE()
            ORDER BY NEWID() -- Lấy ngẫu nhiên
        `);

        if (voucherResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Hiện không có phần thưởng nào, vui lòng thử lại sau." });
        }

        const prize = voucherResult.recordset[0];

        // 3. Ghi nhận lượt quay và trao thưởng
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            // Cập nhật ngày quay
            await transaction.request()
                .input('UserID', sql.Int, userId)
                .query(`
                    IF EXISTS (SELECT 1 FROM LuckyWheelSpins WHERE UserID = @UserID)
                    BEGIN
                        UPDATE LuckyWheelSpins SET LastSpinDate = GETDATE() WHERE UserID = @UserID
                    END
                    ELSE
                    BEGIN
                        INSERT INTO LuckyWheelSpins (UserID, LastSpinDate) VALUES (@UserID, GETDATE())
                    END
                `);

            // Trao voucher: Cộng dồn số lượng và đảm bảo IsUsed = 0 để có thể dùng ngay
            await transaction.request()
                .input('UserID', sql.Int, userId)
                .input('VoucherID', sql.Int, prize.VoucherID)
                .query(`
                    IF EXISTS (SELECT 1 FROM VoucherUsage WHERE UserID = @UserID AND VoucherID = @VoucherID)
                    BEGIN
                        UPDATE VoucherUsage 
                        SET UserQuantity = ISNULL(UserQuantity, 0) + 1, IsUsed = 0 
                        WHERE UserID = @UserID AND VoucherID = @VoucherID
                    END
                    ELSE
                    BEGIN
                        INSERT INTO VoucherUsage (UserID, VoucherID, UserQuantity, HasClaimedFromNews, IsUsed) 
                        VALUES (@UserID, @VoucherID, 1, 0, 0)
                    END
                `);

            await transaction.commit();
            
            res.json({ 
                success: true, 
                message: `Chúc mừng! Bạn đã trúng mã: ${prize.Code}`,
                prize: prize
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}