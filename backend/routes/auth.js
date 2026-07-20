import express from "express";
import { register, login, googleLogin, facebookLogin, getMe, forgotPassword, resetPassword, sendRegistrationOTP } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Gửi OTP xác thực đăng ký
router.post("/send-otp", sendRegistrationOTP);

// Đăng ký
router.post("/register", register);

// Đăng nhập
router.post("/login", login);

// Đăng nhập Google
router.post("/google", googleLogin);

// Đăng nhập Facebook
router.post("/facebook", facebookLogin);

// Lấy thông tin user hiện tại (xác thực token)
router.get("/me", requireAuth, getMe);

// Quên mật khẩu
router.post("/forgot-password", forgotPassword);

// Đặt lại mật khẩu
router.post("/reset-password", resetPassword);

export default router;
