import sql from 'mssql';
import { getPool } from '../config/db.js';

export async function createMovie(movieData) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Title', sql.NVarChar, movieData.Title)
      .input('Genre', sql.NVarChar, movieData.Genre)
      .input('Duration', sql.Int, movieData.Duration)
      .input('Description', sql.NVarChar, movieData.Description)
      .input('Poster', sql.NVarChar, movieData.Poster)
      .input('TrailerURL', sql.NVarChar, movieData.TrailerURL)
      .input('Director', sql.NVarChar, movieData.Director)
      .input('Cast', sql.NVarChar, movieData.Cast)
      .input('ReleaseDate', sql.Date, movieData.ReleaseDate)
      .input('Language', sql.NVarChar, movieData.Language)
      .input('Rated', sql.NVarChar, movieData.Rated)
      .query(`
        INSERT INTO Movies (Title, Genre, Duration, Description, Poster, TrailerURL, Director, Cast, ReleaseDate, Language, Rated)
        OUTPUT inserted.*
        VALUES (@Title, @Genre, @Duration, @Description, @Poster, @TrailerURL, @Director, @Cast, @ReleaseDate, @Language, @Rated);
      `);
    return result.recordset[0];
  } catch (error) {
    console.error("SQL Error in createMovie:", error);
    throw error;
  }
}

export async function getAllMovies() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Movies ORDER BY MovieID DESC');
    return result.recordset;
  } catch (error) {
    console.error("SQL Error in getAllMovies:", error);
    throw error;
  }
}

export async function updateMovie(MovieID, movieData) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MovieID', sql.Int, MovieID)
      .input('Title', sql.NVarChar, movieData.Title)
      .input('Genre', sql.NVarChar, movieData.Genre)
      .input('Duration', sql.Int, movieData.Duration)
      .input('Description', sql.NVarChar, movieData.Description)
      .input('Poster', sql.NVarChar, movieData.Poster)
      .input('TrailerURL', sql.NVarChar, movieData.TrailerURL)
      .input('Director', sql.NVarChar, movieData.Director)
      .input('Cast', sql.NVarChar, movieData.Cast)
      .input('ReleaseDate', sql.Date, movieData.ReleaseDate)
      .input('Language', sql.NVarChar, movieData.Language)
      .input('Rated', sql.NVarChar, movieData.Rated)
      .query(`
        UPDATE Movies SET
          Title = @Title,
          Genre = @Genre,
          Duration = @Duration,
          Description = @Description,
          Poster = @Poster,
          TrailerURL = @TrailerURL,
          Director = @Director,
          Cast = @Cast,
          ReleaseDate = @ReleaseDate,
          Language = @Language,
          Rated = @Rated
        WHERE MovieID = @MovieID;
        SELECT * FROM Movies WHERE MovieID = @MovieID;
      `);
    return result.recordset[0];
  } catch (error) {
    console.error("SQL Error in updateMovie:", error);
    throw error;
  }
}
export async function deleteMovie(MovieID) {
    try {
        const pool = await getPool();
        await pool.request().input('MovieID', sql.Int, MovieID).query('DELETE FROM Movies WHERE MovieID = @MovieID');
    } catch (error) {
        throw error;
    }
}

export async function getMovieById(MovieID) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MovieID', sql.Int, MovieID)
      .query('SELECT * FROM Movies WHERE MovieID = @MovieID');
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}