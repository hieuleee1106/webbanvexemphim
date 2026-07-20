import express from "express";
import { addRoom, getAllRooms, getRoomById, updateRoom, deleteRoom } from "../controllers/roomController.js";

const router = express.Router();

// POST - Thêm phòng mới
router.post("/", addRoom);

// GET - Lấy tất cả phòng
router.get("/", getAllRooms);

// GET - Lấy phòng theo ID
router.get("/:id", getRoomById);

// PUT - Cập nhật phòng
router.put("/:id", updateRoom);

// DELETE - Xóa phòng
router.delete("/:id", deleteRoom);

export default router;
