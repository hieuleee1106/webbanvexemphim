import * as RoomModel from "../models/Room.js";

// Thêm phòng mới
export async function addRoom(req, res) {
  try {
    const { RoomName, TotalSeats } = req.body;

    if (!RoomName || TotalSeats == null) {
      return res.status(400).json({
        success: false,
        message: "RoomName và TotalSeats là bắt buộc"
      });
    }

    const result = await RoomModel.createRoom({ RoomName, TotalSeats });

    res.status(201).json({
      success: true,
      message: "Thêm phòng thành công",
      data: {
        RoomID: result.RoomID,
        RoomName,
        TotalSeats
      }
    });
  } catch (error) {
    console.error("❌ Lỗi thêm phòng:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
}

// Lấy tất cả phòng
export async function getAllRooms(req, res) {
  try {
    const rooms = await RoomModel.getAllRooms();

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error("❌ Lỗi lấy phòng:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
}

// Lấy phòng theo ID
export async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    const room = await RoomModel.getRoomById(id);

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error("❌ Lỗi lấy phòng:", error.message);

    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại"
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
}

// Cập nhật phòng
export async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const { RoomName, TotalSeats } = req.body;

    if (!RoomName || TotalSeats == null) {
      return res.status(400).json({
        success: false,
        message: "RoomName và TotalSeats là bắt buộc"
      });
    }

    const room = await RoomModel.updateRoom(id, { RoomName, TotalSeats });

    res.json({
      success: true,
      message: "Cập nhật phòng thành công",
      data: room
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật phòng:", error.message);

    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại"
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
}

// Xóa phòng
export async function deleteRoom(req, res) {
  try {
    const { id } = req.params;
    await RoomModel.deleteRoom(id);

    res.json({
      success: true,
      message: "Xóa phòng thành công"
    });
  } catch (error) {
    console.error("❌ Lỗi xóa phòng:", error.message);

    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại"
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
}
