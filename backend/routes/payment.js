import express from "express";
import { createPayment, callback, createDirectPayment, createMoMoPayment, momoCallback } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route tạo thanh toán (Yêu cầu đăng nhập)
router.post("/create", requireAuth, createPayment);

// Route thanh toán trực tiếp
router.post("/direct", requireAuth, createDirectPayment);

// Route MoMo
router.post("/momo", requireAuth, createMoMoPayment);
router.post("/momo-callback", momoCallback);

// Route callback (ZaloPay gọi tự động, không cần Auth, phải public)
router.post("/callback", callback);

export default router;