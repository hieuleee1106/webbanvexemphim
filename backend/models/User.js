import sql from "mssql";
import bcrypt from "bcryptjs";
import { getPool } from "../config/db.js";

// Helper: Kiểm tra Gmail chuẩn (6-30 ký tự, đuôi @gmail.com)
const isValidGmail = (email) => {
  const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/;
  return gmailRegex.test(email.toLowerCase());
};

// Helper: Kiểm tra số điện thoại (10 số, bắt đầu bằng 0)
const isValidPhone = (phone) => {
  return /^0[0-9]{9}$/.test(phone);
};

// Thêm người dùng mới (mã hóa mật khẩu)
export async function createUser(userData) {
  try {
    const { Username, Password, FullName, Phone, Role, Avatar } = userData;
    const pool = await getPool();
    
    // Kiểm tra username đã tồn tại
    const checkUsername = await pool.request()
      .input("Username", sql.NVarChar, Username)
      .query("SELECT UserID FROM Users WHERE Username = @Username");
    
    if (checkUsername.recordset.length > 0) {
      throw new Error("Username đã tồn tại");
    }

    // Ràng buộc Gmail chuẩn ở tầng Model
    if (!isValidGmail(Username)) {
      throw new Error("Username phải là một địa chỉ Gmail hợp lệ.");
    }

    // Kiểm tra định dạng số điện thoại
    if (Phone && !isValidPhone(Phone)) {
      throw new Error("Số điện thoại không hợp lệ (phải có 10 số và bắt đầu bằng số 0)");
    }

    // Kiểm tra số điện thoại đã tồn tại
    if (Phone) {
      const checkPhone = await pool.request()
        .input("Phone", sql.NVarChar, Phone)
        .query("SELECT UserID FROM Users WHERE Phone = @Phone");
      if (checkPhone.recordset.length > 0) {
        throw new Error("Số điện thoại đã tồn tại");
      }
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    // Thêm người dùng mới
    const result = await pool.request()
      .input("Username", sql.NVarChar, Username)
      .input("Password", sql.NVarChar, hashedPassword)
      .input("FullName", sql.NVarChar, FullName || null)
      .input("Phone", sql.NVarChar, Phone || null)
      .input("Role", sql.NVarChar, Role || "User")
      .input("Avatar", sql.NVarChar, Avatar || null)
      .query(`
        INSERT INTO Users (Username, Password, FullName, Phone, Role, Avatar)
        VALUES (@Username, @Password, @FullName, @Phone, @Role, @Avatar);
        SELECT @@IDENTITY as UserID;
      `);

    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Lấy tất cả người dùng
export async function getAllUsers() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT UserID, Username, FullName, Phone, Role, Avatar FROM Users");
    return result.recordset;
  } catch (error) {
    throw error;
  }
}

// Lấy người dùng theo ID
export async function getUserById(userID) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("UserID", sql.Int, userID)
      .query("SELECT UserID, Username, FullName, Phone, Role, Avatar FROM Users WHERE UserID = @UserID");
    
    if (result.recordset.length === 0) {
      throw new Error("Người dùng không tồn tại");
    }
    
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Lấy người dùng theo Username (dùng cho auth)
export async function getUserAuthByUsername(username) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("Username", sql.NVarChar, username)
      .query("SELECT UserID, Username, Password, FullName, Phone, Role, Avatar FROM Users WHERE Username = @Username");
    
    return result.recordset[0] || null;
  } catch (error) {
    throw error;
  }
}

// Lấy người dùng theo Username (không trả về mật khẩu)
export async function getUserByUsername(username) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("Username", sql.NVarChar, username)
      .query("SELECT UserID, Username, FullName, Phone, Role, Avatar FROM Users WHERE Username = @Username");
    
    return result.recordset[0] || null;
  } catch (error) {
    throw error;
  }
}

// Cập nhật người dùng
export async function updateUser(userID, userData) {
  try {
    const { FullName, Phone, Role, Avatar } = userData;
    const pool = await getPool();
    
    // Kiểm tra định dạng số điện thoại
    if (Phone && !isValidPhone(Phone)) {
      throw new Error("Số điện thoại không hợp lệ (phải có 10 số và bắt đầu bằng số 0)");
    }

    // Kiểm tra trùng số điện thoại với người dùng khác
    if (Phone) {
      const checkPhone = await pool.request()
        .input("Phone", sql.NVarChar, Phone)
        .input("UserID", sql.Int, userID)
        .query("SELECT UserID FROM Users WHERE Phone = @Phone AND UserID <> @UserID");
      if (checkPhone.recordset.length > 0) {
        throw new Error("Số điện thoại đã tồn tại");
      }
    }

    const result = await pool.request()
      .input("UserID", sql.Int, userID)
      .input("FullName", sql.NVarChar, FullName || null)
      .input("Phone", sql.NVarChar, Phone || null)
      .input("Role", sql.NVarChar, Role || "User")
      .input("Avatar", sql.NVarChar, Avatar || null)
      .query(`
        UPDATE Users 
        SET FullName = @FullName, Phone = @Phone, Role = @Role, Avatar = @Avatar
        WHERE UserID = @UserID;
        SELECT UserID, Username, FullName, Phone, Role, Avatar FROM Users WHERE UserID = @UserID;
      `);
    
    if (result.recordset.length === 0) {
      throw new Error("Người dùng không tồn tại");
    }
    
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Cập nhật mật khẩu người dùng
export async function updateUserPassword(userID, hashedPassword) {
  try {
    const pool = await getPool();
    await pool.request()
      .input("UserID", sql.Int, userID)
      .input("Password", sql.NVarChar, hashedPassword)
      .query("UPDATE Users SET Password = @Password WHERE UserID = @UserID");
    return true;
  } catch (error) {
    throw error;
  }
}

// Xóa người dùng
export async function deleteUser(userID) {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input("UserID", sql.Int, userID)
      .query("DELETE FROM Users WHERE UserID = @UserID; SELECT @@ROWCOUNT as affected;");
    
    if (result.recordset[0].affected === 0) {
      throw new Error("Người dùng không tồn tại");
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}
