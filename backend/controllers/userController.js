import { getPool } from "../config/db.js";
import sql from "mssql";
import * as UserModel from "../models/User.js"; // Import User Model
import bcrypt from "bcryptjs";
import { upload } from "../config/cloudinary.js"; // Import upload middleware

export async function getAllUsers(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT UserID, Username, FullName, Phone, Role, Avatar FROM Users");
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Cập nhật thông tin người dùng (FullName, Phone, Avatar)
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { FullName, Phone } = req.body;
    const userIdFromToken = req.user.userId; // Lấy UserID từ token

    // Đảm bảo người dùng chỉ có thể cập nhật thông tin của chính họ (trừ Admin)
    if (req.user.role !== 'Admin' && parseInt(id) !== userIdFromToken) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền cập nhật thông tin người dùng này." });
    }

    let avatarUrl = req.body.Avatar; // Giữ avatar cũ nếu không có file mới

    // Xử lý upload avatar mới nếu có
    if (req.file && req.file.path) {
      avatarUrl = req.file.path;
    }

    // Lấy thông tin hiện tại để tránh mất Role khi user cập nhật profile
    const currentUser = await UserModel.getUserById(id);

    // Logic trộn dữ liệu: Nếu trong body không có (undefined) thì lấy lại từ database cũ
    const roleToUpdate = (req.user.role === 'Admin' && req.body.Role) ? req.body.Role : currentUser.Role;
    const fullNameToUpdate = FullName !== undefined ? FullName : currentUser.FullName;
    const phoneToUpdate = Phone !== undefined ? Phone : currentUser.Phone;
    
    // Ưu tiên: File mới > URL gửi lên trong Body > Ảnh cũ trong DB
    const finalAvatarUrl = (req.file && req.file.path) ? req.file.path : (req.body.Avatar !== undefined ? req.body.Avatar : currentUser.Avatar);

    console.log("🛠 Đang cập nhật User:", id);

    const updatedUser = await UserModel.updateUser(id, { FullName: fullNameToUpdate, Phone: phoneToUpdate, Avatar: finalAvatarUrl, Role: roleToUpdate });

    res.json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: {
        UserID: updatedUser.UserID,
        Username: updatedUser.Username,
        FullName: updatedUser.FullName,
        Phone: updatedUser.Phone,
        Role: updatedUser.Role,
        Avatar: updatedUser.Avatar
      }
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật người dùng:", error); // Log toàn bộ object lỗi để debug
    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }
    if (error.message.includes("Số điện thoại đã tồn tại")) {
      return res.status(400).json({ success: false, message: "Số điện thoại này đã được sử dụng bởi người dùng khác" });
    }
    if (error.message.includes("Số điện thoại không hợp lệ")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}

// Thay đổi mật khẩu người dùng
export async function changePassword(req, res) {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const userIdFromToken = req.user.userId; // Lấy UserID từ token

    // Đảm bảo người dùng chỉ có thể thay đổi mật khẩu của chính họ
    if (parseInt(id) !== userIdFromToken) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền thay đổi mật khẩu người dùng này." });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu hiện tại và mật khẩu mới là bắt buộc." });
    }

    // 1. Lấy thông tin người dùng để kiểm tra mật khẩu hiện tại
    const user = await UserModel.getUserAuthByUsername(req.user.username); // Lấy cả password

    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.Password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng." });
    }

    // 2. Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Cập nhật mật khẩu vào DB
    await UserModel.updateUserPassword(id, hashedPassword);

    res.json({ success: true, message: "Thay đổi mật khẩu thành công." });

  } catch (error) {
    console.error("❌ Lỗi thay đổi mật khẩu:", error.message);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    // Kiểm tra xem user có vé hoặc lịch sử không
    const checkTicket = await pool.request()
        .input('UserID', sql.Int, id)
        .query("SELECT TOP 1 TicketID FROM Tickets WHERE UserID = @UserID");

    if (checkTicket.recordset.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Không thể xóa người dùng này vì đã có lịch sử đặt vé. Hãy cân nhắc khóa tài khoản thay vì xóa." 
        });
    }

    // Xóa các bảng phụ trước khi xóa User (nếu cần)
    await pool.request().input('UserID', sql.Int, id).query("DELETE FROM LuckyWheelSpins WHERE UserID = @UserID");
    await pool.request().input('UserID', sql.Int, id).query("DELETE FROM ChatMessages WHERE UserID = @UserID");
    await pool.request().input('UserID', sql.Int, id).query("DELETE FROM VoucherUsage WHERE UserID = @UserID");
    await pool.request().input('UserID', sql.Int, id).query("DELETE FROM Reviews WHERE UserID = @UserID");

    await pool.request()
        .input('UserID', sql.Int, id)
        .query("DELETE FROM Users WHERE UserID = @UserID");

    res.json({ success: true, message: "Xóa người dùng thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xóa người dùng: " + error.message });
  }
}