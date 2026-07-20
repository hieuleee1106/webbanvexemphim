import sql from 'mssql';
import { getPool } from '../config/db.js';

export async function createSeat(data) {
  const pool = await getPool();
  const result = await pool.request()
    .input('RoomID', sql.Int, data.RoomID)
    .input('SeatRow', sql.NVarChar, data.SeatRow)
    .input('SeatNumber', sql.Int, data.SeatNumber)
    .query(`
      INSERT INTO Seats (RoomID, SeatRow, SeatNumber)
      OUTPUT inserted.*
      VALUES (@RoomID, @SeatRow, @SeatNumber);
    `);
  return result.recordset[0];
}

export async function createBulkSeats(roomId, seats) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    for (const seat of seats) {
      const request = new sql.Request(transaction);
      await request
        .input('RoomID', sql.Int, roomId)
        .input('SeatRow', sql.NVarChar, seat.SeatRow)
        .input('SeatNumber', sql.Int, seat.SeatNumber)
        .query(`INSERT INTO Seats (RoomID, SeatRow, SeatNumber) VALUES (@RoomID, @SeatRow, @SeatNumber)`);
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function deleteBulkSeats(seatIds) {
  if (!seatIds || seatIds.length === 0) {
    return;
  }
  const pool = await getPool();
  const request = pool.request();
  // Tạo chuỗi tham số an toàn dạng @id0,@id1,@id2...
  const idParams = seatIds.map((_, i) => `@id${i}`).join(',');
  // Gán giá trị cho từng tham số
  seatIds.forEach((id, i) => {
    request.input(`id${i}`, sql.Int, id);
  });

  await request.query(`DELETE FROM Seats WHERE SeatID IN (${idParams})`);
}

export async function getSeatsByRoomId(roomId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('RoomID', sql.Int, roomId)
    .query('SELECT * FROM Seats WHERE RoomID = @RoomID ORDER BY SeatRow, SeatNumber');
  return result.recordset;
}

export async function deleteSeat(id) {
  const pool = await getPool();
  await pool.request()
    .input('SeatID', sql.Int, id)
    .query('DELETE FROM Seats WHERE SeatID = @SeatID');
}

export async function updateSeat(id, data) {
    const pool = await getPool();
    await pool.request()
        .input('SeatID', sql.Int, id)
        .input('SeatRow', sql.NVarChar, data.SeatRow)
        .input('SeatNumber', sql.Int, data.SeatNumber)
        .query('UPDATE Seats SET SeatRow = @SeatRow, SeatNumber = @SeatNumber WHERE SeatID = @SeatID');
}
