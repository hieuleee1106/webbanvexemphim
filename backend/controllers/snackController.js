import { getPool } from "../config/db.js";
import sql from "mssql";

export async function getAllSnacks(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM Snacks WHERE Status = 'Active'");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function adminGetAllSnacks(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM Snacks ORDER BY SnackID DESC");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function createSnack(req, res) {
    try {
        const { Name, Price, Description, Category } = req.body;
        // Ưu tiên ảnh từ file upload, nếu không có lấy từ body.Image
        const imageUrl = (req.file && req.file.path) ? req.file.path : req.body.Image;

        const pool = await getPool();
        await pool.request()
            .input('Name', sql.NVarChar, Name)
            .input('Price', sql.Decimal(10, 2), parseFloat(Price))
            .input('Description', sql.NVarChar, Description)
            .input('Category', sql.NVarChar, Category)
            .input('Image', sql.NVarChar, imageUrl)
            .query(`INSERT INTO Snacks (Name, Price, Description, Category, Image) VALUES (@Name, @Price, @Description, @Category, @Image)`);
        res.json({ success: true, message: "Thêm thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateSnack(req, res) {
    try {
        const { id } = req.params;
        const { Name, Price, Description, Category, Status } = req.body;
        // Ưu tiên ảnh mới upload, nếu không giữ nguyên ảnh hiện tại (req.body.Image)
        const imageUrl = (req.file && req.file.path) ? req.file.path : req.body.Image;

        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .input('Name', sql.NVarChar, Name)
            .input('Price', sql.Decimal(10, 2), parseFloat(Price))
            .input('Description', sql.NVarChar, Description)
            .input('Category', sql.NVarChar, Category)
            .input('Status', sql.NVarChar, Status)
            .input('Image', sql.NVarChar, imageUrl)
            .query(`UPDATE Snacks SET Name=@Name, Price=@Price, Description=@Description, Category=@Category, Status=@Status, Image=@Image WHERE SnackID=@ID`);
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteSnack(req, res) {
    try {
        const { id } = req.params;
        const pool = await getPool();
        // Kiểm tra xem đã có ai mua chưa
        const check = await pool.request().input('ID', sql.Int, id).query("SELECT TOP 1 TicketSnackID FROM TicketSnacks WHERE SnackID=@ID");
        if (check.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Không thể xóa món đã có lịch sử đặt hàng. Hãy chuyển trạng thái sang Inactive." });
        }
        await pool.request().input('ID', sql.Int, id).query("DELETE FROM Snacks WHERE SnackID = @ID");
        res.json({ success: true, message: "Xóa thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}