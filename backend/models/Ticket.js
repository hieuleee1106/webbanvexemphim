import sql from 'mssql';
import { getPool } from '../config/db.js';

export async function createTicket(data) {
  const pool = await getPool();
  const result = await pool.request()
    .input('UserID', sql.Int, data.UserID)
    .input('ShowtimeID', sql.Int, data.ShowtimeID)
    .input('SeatID', sql.Int, data.SeatID)
    .query(`
      INSERT INTO Tickets (UserID, ShowtimeID, SeatID)
      OUTPUT inserted.*
      VALUES (@UserID, @ShowtimeID, @SeatID);
    `);
  return result.recordset[0];
}

export async function getBookedSeats(showtimeId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('ShowtimeID', sql.Int, showtimeId)
    .query("SELECT SeatID FROM Tickets WHERE ShowtimeID = @ShowtimeID AND Status != 'Cancelled'");
  return result.recordset.map(row => row.SeatID);
}
