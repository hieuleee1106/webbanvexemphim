import { getPool } from "../config/db.js";
import sql from "mssql";

// Thêm phòng mới
export async function createRoom(roomData) {
  try {
    const { RoomName, TotalSeats } = roomData;
    const pool = await getPool();

    const result = await pool.request()
      .input("RoomName", sql.NVarChar, RoomName)
      .input("TotalSeats", sql.Int, TotalSeats)
      .query(`
        INSERT INTO Rooms (RoomName, TotalSeats)
        VALUES (@RoomName, @TotalSeats);
        SELECT @@IDENTITY AS RoomID;
      `);

    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Lấy tất cả phòng
export async function getAllRooms() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT RoomID, RoomName, TotalSeats FROM Rooms");
    return result.recordset;
  } catch (error) {
    throw error;
  }
}

// Lấy phòng theo ID
export async function getRoomById(roomID) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("RoomID", sql.Int, roomID)
      .query("SELECT RoomID, RoomName, TotalSeats FROM Rooms WHERE RoomID = @RoomID");

    if (result.recordset.length === 0) {
      throw new Error("Phòng không tồn tại");
    }

    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Cập nhật phòng
export async function updateRoom(roomID, roomData) {
  try {
    const { RoomName, TotalSeats } = roomData;
    const pool = await getPool();

    const result = await pool.request()
      .input("RoomID", sql.Int, roomID)
      .input("RoomName", sql.NVarChar, RoomName)
      .input("TotalSeats", sql.Int, TotalSeats)
      .query(`
        UPDATE Rooms
        SET RoomName = @RoomName, TotalSeats = @TotalSeats
        WHERE RoomID = @RoomID;
        SELECT RoomID, RoomName, TotalSeats FROM Rooms WHERE RoomID = @RoomID;
      `);

    if (result.recordset.length === 0) {
      throw new Error("Phòng không tồn tại");
    }

    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Xóa phòng
export async function deleteRoom(roomID) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("RoomID", sql.Int, roomID)
      .query("DELETE FROM Rooms WHERE RoomID = @RoomID; SELECT @@ROWCOUNT as affected;");

    if (result.recordset[0].affected === 0) {
      throw new Error("Phòng không tồn tại");
    }

    return true;
  } catch (error) {
    throw error;
  }
}
