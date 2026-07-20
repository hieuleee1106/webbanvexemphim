import sql from 'mssql';
import { getPool } from '../config/db.js';

export async function createShowtime(data) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MovieID', sql.Int, data.MovieID)
      .input('RoomID', sql.Int, data.RoomID)
      .input('StartTime', sql.DateTime, data.StartTime)
      .query(`
        INSERT INTO Showtimes (MovieID, RoomID, StartTime)
        OUTPUT inserted.*
        VALUES (@MovieID, @RoomID, @StartTime);
      `);
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

export async function getAllShowtimes() {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        s.ShowtimeID,
        s.StartTime,
        s.MovieID,
        s.RoomID,

        m.Title as MovieTitle,
        r.RoomName,

        -- 🔥 THÊM 3 DÒNG NÀY
        s.Price,
        s.PriceVIP,
        s.PriceDouble

      FROM Showtimes s
      JOIN Movies m ON s.MovieID = m.MovieID
      JOIN Rooms r ON s.RoomID = r.RoomID
      ORDER BY s.StartTime DESC
    `);

    return result.recordset;
  } catch (error) {
    throw error;
  }
}

export async function getShowtimesByMovieId(movieId) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MovieID', sql.Int, movieId)
      .query('SELECT s.*, r.RoomName FROM Showtimes s JOIN Rooms r ON s.RoomID = r.RoomID WHERE MovieID = @MovieID ORDER BY StartTime');
    return result.recordset;
  } catch (error) {
    throw error;
  }
}

export async function getShowtimeById(id) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ShowtimeID', sql.Int, id)
      .query('SELECT * FROM Showtimes WHERE ShowtimeID = @ShowtimeID');
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

export async function updateShowtime(id, data) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ShowtimeID', sql.Int, id)
      .input('MovieID', sql.Int, data.MovieID)
      .input('RoomID', sql.Int, data.RoomID)
      .input('StartTime', sql.DateTime, data.StartTime)
      .query(`
        UPDATE Showtimes
        SET MovieID = @MovieID, RoomID = @RoomID, StartTime = @StartTime
        WHERE ShowtimeID = @ShowtimeID;
        SELECT * FROM Showtimes WHERE ShowtimeID = @ShowtimeID;
      `);
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

export async function deleteShowtime(id) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('ShowtimeID', sql.Int, id)
      .query('DELETE FROM Showtimes WHERE ShowtimeID = @ShowtimeID');
  } catch (error) {
    throw error;
  }
}
