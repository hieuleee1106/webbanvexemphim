import { getPool } from "../config/db.js";
import sql from "mssql";

// Admin: Get all vouchers
export async function getAllVouchers(req, res) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const pool = await getPool();

    // Tự động cập nhật trạng thái các mã đã hết hạn trước khi lấy danh sách
    await pool.request().query("UPDATE Vouchers SET Status = 'Expired' WHERE ExpiryDate < GETDATE() AND Status = 'Active'");
    
    let query = "";
    const request = pool.request(); // Tạo request chung

    if (userId && role === 'Admin') {
      const result = await pool.request().query("SELECT * FROM Vouchers ORDER BY ExpiryDate DESC");
      return res.json({ 
        success: true, 
        data: result.recordset,
        publicVouchers: result.recordset,
        myVouchers: [] 
      });
    } else if (userId) {
      // Thành viên đã đăng nhập
      const userRequest = pool.request();
      userRequest.input('UserID', sql.Int, userId);
      
      // 1. Lấy danh sách Voucher công khai để nhặt (Chặn nếu đã nhặt từ News)
      const publicRes = await userRequest.query(`
        SELECT v.*, ISNULL(vu.HasClaimedFromNews, 0) as AlreadyClaimed 
        FROM Vouchers v
        LEFT JOIN VoucherUsage vu ON v.VoucherID = vu.VoucherID AND vu.UserID = @UserID
        WHERE v.Status = 'Active' AND v.ExpiryDate > GETDATE() AND v.Quantity > 0 AND v.IsPublic = 1
      `);

      // 2. Lấy Kho Voucher cá nhân (Những mã có số lượng sở hữu > 0)
      const myRes = await userRequest.query(`
          SELECT v.*, vu.UserQuantity 
          FROM VoucherUsage vu
          JOIN Vouchers v ON vu.VoucherID = v.VoucherID
          WHERE vu.UserID = @UserID AND vu.UserQuantity > 0 AND v.Status = 'Active' AND v.ExpiryDate > GETDATE() AND v.Quantity > 0
        `);

      return res.json({ 
        success: true, 
        publicVouchers: publicRes.recordset,
        myVouchers: myRes.recordset 
      });
    } else {
      // Khách chưa đăng nhập: Chỉ lấy mã công khai
      const result = await pool.request().query(`
        SELECT * FROM Vouchers 
        WHERE Status = 'Active' AND ExpiryDate > GETDATE() AND Quantity > 0 AND IsPublic = 1
      `);
      return res.json({ 
        success: true, 
        publicVouchers: result.recordset,
        data: result.recordset 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Admin: Get single voucher
export async function getVoucherById(req, res) {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request().input('ID', sql.Int, id).query("SELECT * FROM Vouchers WHERE VoucherID = @ID");
        if (result.recordset.length === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Admin: Create a new voucher
export async function createVoucher(req, res) {
  try {
    const { Code, DiscountPercent, DiscountAmount, ExpiryDate, Quantity, MinOrderValue, IsPublic } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('Code', sql.NVarChar, Code)
      .input('DiscountPercent', sql.Int, DiscountPercent || null)
      .input('DiscountAmount', sql.Decimal(10, 2), DiscountAmount || null)
      .input('ExpiryDate', sql.DateTime, ExpiryDate)
      .input('Quantity', sql.Int, Quantity)
      .input('MinOrderValue', sql.Decimal(10, 2), MinOrderValue || 0)
      .input('IsPublic', sql.Bit, IsPublic === undefined ? 1 : IsPublic)
      .query(`
        INSERT INTO Vouchers (Code, DiscountPercent, DiscountAmount, ExpiryDate, Quantity, MinOrderValue, IsPublic)
        VALUES (@Code, @DiscountPercent, @DiscountAmount, @ExpiryDate, @Quantity, @MinOrderValue, @IsPublic)
      `);
    res.status(201).json({ success: true, message: "Tạo mã giảm giá thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Admin: Update a voucher
export async function updateVoucher(req, res) {
  try {
    const { id } = req.params;
    const { Code, DiscountPercent, DiscountAmount, ExpiryDate, Quantity, MinOrderValue, Status, IsPublic } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('ID', sql.Int, id)
      .input('Code', sql.NVarChar, Code)
      .input('DiscountPercent', sql.Int, DiscountPercent || null)
      .input('DiscountAmount', sql.Decimal(10, 2), DiscountAmount || null)
      .input('ExpiryDate', sql.DateTime, ExpiryDate)
      .input('Quantity', sql.Int, Quantity)
      .input('MinOrderValue', sql.Decimal(10, 2), MinOrderValue || 0)
      .input('Status', sql.NVarChar, Status)
      .input('IsPublic', sql.Bit, IsPublic)
      .query(`
        UPDATE Vouchers SET 
        Code = @Code, DiscountPercent = @DiscountPercent, DiscountAmount = @DiscountAmount, 
        ExpiryDate = @ExpiryDate, Quantity = @Quantity, MinOrderValue = @MinOrderValue, Status = @Status, IsPublic = @IsPublic
        WHERE VoucherID = @ID
      `);
    res.json({ success: true, message: "Cập nhật mã giảm giá thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Admin: Delete a voucher
export async function deleteVoucher(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.request().input('ID', sql.Int, id).query("DELETE FROM Vouchers WHERE VoucherID = @ID");
    res.json({ success: true, message: "Xóa mã giảm giá thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// User: Apply a voucher code
export async function applyVoucher(req, res) {
    try {
        const { code, orderValue } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('Code', sql.NVarChar, code)
            .query("SELECT * FROM Vouchers WHERE Code = @Code");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Mã giảm giá không tồn tại." });
        }

        const voucher = result.recordset[0];

        if (voucher.Status !== 'Active') {
            return res.status(400).json({ success: false, message: "Mã giảm giá không hoạt động." });
        }
        if (new Date(voucher.ExpiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: "Mã giảm giá đã hết hạn." });
        }
        if (voucher.Quantity <= 0) {
            return res.status(400).json({ success: false, message: "Mã giảm giá đã hết lượt sử dụng." });
        }
        if (orderValue < voucher.MinOrderValue) {
            return res.status(400).json({ success: false, message: `Áp dụng cho đơn hàng từ ${parseInt(voucher.MinOrderValue).toLocaleString()}đ.` });
        }
        
        const userId = req.user.userId; // Lấy UserID từ token đã xác thực
        const usageCheck = await pool.request()
            .input('UserID', sql.Int, userId)
            .input('VoucherID', sql.Int, voucher.VoucherID)
            // Kiểm tra xem trong kho còn mã nào không
            .query(`SELECT UserQuantity FROM VoucherUsage WHERE UserID = @UserID AND VoucherID = @VoucherID`);

        if (usageCheck.recordset.length === 0 || usageCheck.recordset[0].UserQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Bạn không sở hữu mã giảm giá này hoặc đã dùng hết." });
        }


        const orderVal = parseFloat(orderValue) || 0;
        let discountAmount = 0;

        if (voucher.DiscountAmount != null && voucher.DiscountAmount > 0) {
            discountAmount = parseFloat(voucher.DiscountAmount);
        } else if (voucher.DiscountPercent) {
            discountAmount = (orderVal * voucher.DiscountPercent) / 100;
        }

        // Đảm bảo tiền giảm không lớn hơn giá trị đơn hàng và làm tròn
        const finalDiscount = Math.min(Math.round(discountAmount), Math.round(orderVal));

        res.json({ success: true, discountAmount: finalDiscount, message: "Áp dụng mã thành công!" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// User: Claim a voucher (Lưu vết đã lấy mã)
export async function claimVoucher(req, res) {
    try {
        const { voucherId } = req.body;
        const userId = req.user.userId;
        const pool = await getPool();

        // Kiểm tra xem đã nhặt từ News chưa
        const check = await pool.request()
            .input('uID', sql.Int, userId)
            .input('vID', sql.Int, voucherId)
            .query("SELECT HasClaimedFromNews FROM VoucherUsage WHERE UserID = @uID AND VoucherID = @vID");

        if (check.recordset.length > 0 && check.recordset[0].HasClaimedFromNews) {
            return res.status(400).json({ success: false, message: "Bạn đã nhận mã này từ tin tức rồi. Hãy thử vận may tại Vòng quay để có thêm nhé!" });
        }

        if (check.recordset.length === 0) {
            await pool.request()
                .input('uID', sql.Int, userId)
                .input('vID', sql.Int, voucherId)
                .query("INSERT INTO VoucherUsage (UserID, VoucherID, UserQuantity, HasClaimedFromNews) VALUES (@uID, @vID, 1, 1)");
        } else {
            await pool.request()
                .input('uID', sql.Int, userId)
                .input('vID', sql.Int, voucherId)
                .query("UPDATE VoucherUsage SET UserQuantity = UserQuantity + 1, HasClaimedFromNews = 1 WHERE UserID = @uID AND VoucherID = @vID");
        }

        res.json({ success: true, message: "Đã nhận mã thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}