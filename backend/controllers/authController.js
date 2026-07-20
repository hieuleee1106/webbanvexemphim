import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as UserModel from "../models/User.js";
import axios from "axios";
import authConfig from "../config/auth.js";
import sendEmail from "../utils/sendEmail.js";
import { getPool } from "../config/db.js";
import sql from "mssql";

// Helper: Kiểm tra Gmail chuẩn (6-30 ký tự, đuôi @gmail.com)
const isValidGmail = (email) => {
  const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/;
  return gmailRegex.test(email.toLowerCase());
};

// API: Gửi mã OTP về email để xác thực đăng ký
export async function sendRegistrationOTP(req, res) {
  try {
    const { email } = req.body;

    if (!email || !isValidGmail(email)) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập địa chỉ Gmail hợp lệ." });
    }

    const pool = await getPool();
    
    // 1. Kiểm tra email đã được đăng ký chưa
    const userCheck = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT UserID FROM Users WHERE Username = @email");
    
    if (userCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: "Gmail này đã được đăng ký bởi tài khoản khác." });
    }

    // 2. Tạo mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

    // 3. Lưu OTP vào DB (Upsert)
    await pool.request()
      .input("Email", sql.NVarChar, email)
      .input("Code", sql.NVarChar, otp)
      .input("Expiry", sql.DateTime, expiry)
      .query(`
        IF EXISTS (SELECT 1 FROM VerificationCodes WHERE Email = @Email)
          UPDATE VerificationCodes SET Code = @Code, Expiry = @Expiry WHERE Email = @Email
        ELSE
          INSERT INTO VerificationCodes (Email, Code, Expiry) VALUES (@Email, @Code, @Expiry)
      `);

    // 4. Gửi mail
    const message = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #e11d48;">Mã xác thực đăng ký CinemaDB</h2>
        <p>Chào bạn, đây là mã OTP để hoàn tất quá trình đăng ký tài khoản của bạn:</p>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #334155; border-radius: 8px;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    `;

    await sendEmail({ email, subject: "[CinemaDB] Xác thực đăng ký tài khoản", message });

    res.json({ success: true, message: "Mã OTP đã được gửi về Gmail của bạn." });
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi gửi mail." });
  }
}

export async function register(req, res) {
  try {
    const { Username, Password, FullName, Phone, Role, otp } = req.body;

    if (!Username || !Password || !otp) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin và mã OTP." });
    }

    const pool = await getPool();

    // 1. Xác thực OTP
    const otpCheck = await pool.request()
      .input("Email", sql.NVarChar, Username)
      .input("Code", sql.NVarChar, otp)
      .input("Now", sql.DateTime, new Date())
      .query("SELECT * FROM VerificationCodes WHERE Email = @Email AND Code = @Code AND Expiry > @Now");

    if (otpCheck.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "Mã OTP không đúng hoặc đã hết hạn." });
    }

    // 2. Tạo User
    const user = await UserModel.createUser({ Username, Password, FullName, Phone, Role });

    // 3. Xóa OTP sau khi dùng xong
    await pool.request().input("Email", sql.NVarChar, Username).query("DELETE FROM VerificationCodes WHERE Email = @Email");

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        UserID: user.UserID,
        Username,
        FullName,
        Phone,
        Role: Role || "User",
        Avatar: user.Avatar || null
      }
    });
  } catch (error) {
    console.error("❌ Lỗi đăng ký:", error.message);

    if (error.message.includes("Username đã tồn tại")) {
      return res.status(400).json({ success: false, message: "Username đã tồn tại" });
    }
    if (error.message.includes("Số điện thoại đã tồn tại")) {
      return res.status(400).json({ success: false, message: "Số điện thoại này đã được đăng ký tài khoản khác" });
    }
    if (error.message.includes("Số điện thoại không hợp lệ")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}

export async function facebookLogin(req, res) {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Không tìm thấy Facebook Access Token." });
    }

    // 1. Xác thực Access Token với Facebook Graph API để lấy thông tin email, name
    const fbUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    const fbResponse = await axios.get(fbUrl);
    const { email, name } = fbResponse.data;

    if (!email) {
      return res.status(400).json({ success: false, message: "Tài khoản Facebook của bạn cần có Email công khai để đăng nhập." });
    }

    // 2. Kiểm tra xem người dùng đã tồn tại trong DB chưa (dùng email làm username)
    let user = await UserModel.getUserAuthByUsername(email);

    if (!user) {
      // Nếu chưa tồn tại, tạo người dùng mới với mật khẩu ngẫu nhiên
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const newUserResult = await UserModel.createUser({
        Username: email,
        Password: randomPassword,
        FullName: name,
        Role: "User"
      });
      user = {
        UserID: newUserResult.UserID,
        Username: email,
        FullName: name,
        Role: "User",
        Avatar: null // Default for new social login users
      };
    }

    // 3. Tạo JWT token của ứng dụng CinemaDB
    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, role: user.Role },
      authConfig.JWT_SECRET,
      { expiresIn: authConfig.JWT_EXPIRES_IN }
    );

    res.json({ success: true, message: "Đăng nhập Facebook thành công", data: { token, user } });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập Facebook:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Lỗi xử lý đăng nhập Facebook từ máy chủ.", error: error.message });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await UserModel.getUserAuthByUsername(email);

    // Vì lý do bảo mật, ta không báo lỗi nếu không tìm thấy email.
    // Ta chỉ gửi mail nếu email tồn tại trong hệ thống.
    if (user) {
      // 1. Tạo một token ngẫu nhiên
      const resetToken = crypto.randomBytes(32).toString('hex');

      // 2. Hash token và lưu vào DB
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút

      const pool = await getPool();
      await pool.request()
        .input('ResetToken', sql.NVarChar, hashedToken)
        .input('ResetTokenExpiry', sql.DateTime, tokenExpiry)
        .input('UserID', sql.Int, user.UserID)
        .query("UPDATE Users SET ResetToken = @ResetToken, ResetTokenExpiry = @ResetTokenExpiry WHERE UserID = @UserID");

      // 3. Gửi email cho người dùng
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetURL = `${frontendUrl}/reset-password/${resetToken}`;
      const message = `
        <h1>Yêu cầu đặt lại mật khẩu</h1>
        <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấn vào liên kết dưới đây để đặt lại mật khẩu:</p>
        <a href="${resetURL}" target="_blank">Đặt lại mật khẩu</a>
        <p>Liên kết này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
      `;

      await sendEmail({
        email: user.Username,
        subject: 'Yêu cầu đặt lại mật khẩu CinemaDB',
        message,
      });
    }

    res.json({ success: true, message: "Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một liên kết đặt lại mật khẩu." });

  } catch (error) {
    console.error("❌ Lỗi quên mật khẩu:", error);
    // Xóa token nếu có lỗi để tránh user bị kẹt
    // (Trong thực tế, bạn có thể cần tìm user và xóa token)
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    // 1. Hash token từ client để so sánh với DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const pool = await getPool();
    // 2. Tìm user với token hợp lệ và chưa hết hạn
    const userResult = await pool.request()
      .input('ResetToken', sql.NVarChar, hashedToken)
      .input('Now', sql.DateTime, new Date())
      .query("SELECT * FROM Users WHERE ResetToken = @ResetToken AND ResetTokenExpiry > @Now");

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
    }

    const user = userResult.recordset[0];

    // 3. Hash mật khẩu mới và cập nhật user
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.request()
      .input('Password', sql.NVarChar, hashedPassword)
      .input('UserID', sql.Int, user.UserID)
      .query("UPDATE Users SET Password = @Password, ResetToken = NULL, ResetTokenExpiry = NULL WHERE UserID = @UserID");

    res.json({ success: true, message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại." });

  } catch (error) {
    console.error("❌ Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

export async function login(req, res) {
  try {
    // Frontend gửi lên identifier (có thể là username hoặc email) và password
    const { identifier, password, Username, Password } = req.body;
    const usernameInput = identifier || Username;
    const passwordInput = password || Password;

    if (!usernameInput || !passwordInput) {
      return res.status(400).json({ success: false, message: "Tên đăng nhập và mật khẩu là bắt buộc" });
    }

    const user = await UserModel.getUserAuthByUsername(usernameInput);

    if (!user) {
      return res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const isValid = await bcrypt.compare(passwordInput, user.Password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const token = jwt.sign(
      {
        userId: user.UserID,
        username: user.Username,
        role: user.Role
      },
      authConfig.JWT_SECRET,
      { expiresIn: authConfig.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          UserID: user.UserID,
          Username: user.Username,
          FullName: user.FullName,
          Phone: user.Phone,
        Role: user.Role,
        Avatar: user.Avatar
        }
      }
    });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error.message);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}

export async function googleLogin(req, res) {
  try {
    const { credential } = req.body;
    
    // 1. Xác thực token Google
    // Sử dụng endpoint của Google để verify token thay vì cài thư viện nặng
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const googlePayload = await googleRes.json();

    if (googlePayload.error) {
      return res.status(400).json({ success: false, message: "Token Google không hợp lệ" });
    }

    const { email, name, sub } = googlePayload;
    
    // 2. Kiểm tra xem user đã tồn tại chưa (dùng email làm username)
    let user = await UserModel.getUserAuthByUsername(email);

    if (!user) {
      // 3. Nếu chưa tồn tại, tạo user mới
      // Tạo mật khẩu ngẫu nhiên vì user này đăng nhập bằng Google
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      const newUserResult = await UserModel.createUser({
        Username: email,
        Password: randomPassword,
        FullName: name,
        Role: "User"
      });

      // Lấy thông tin user vừa tạo để tạo token
      user = {
        UserID: newUserResult.UserID,
        Username: email,
        FullName: name,
        Role: "User",
        Avatar: null // Default for new social login users
      };
    }

    // 4. Tạo JWT token
    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, role: user.Role },
      authConfig.JWT_SECRET,
      { expiresIn: authConfig.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Đăng nhập Google thành công",
      data: { token, user }
    });

  } catch (error) {
    console.error("❌ Lỗi Google login:", error);
    res.status(500).json({ success: false, message: "Lỗi xử lý đăng nhập Google" });
  }
}

export async function getMe(req, res) {
  try {
    // req.user được middleware requireAuth giải mã từ token
    const user = await UserModel.getUserAuthByUsername(req.user.username);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        UserID: user.UserID,
        Username: user.Username,
        FullName: user.FullName,
        Phone: user.Phone,
        Role: user.Role,
        Avatar: user.Avatar
      }
    });
  } catch (error) {
    console.error("❌ Lỗi lấy thông tin user:", error.message);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}
