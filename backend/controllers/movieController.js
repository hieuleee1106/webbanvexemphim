import * as MovieModel from '../models/Movie.js';
import { getPool } from "../config/db.js";
import sql from "mssql";

export async function addMovie(req, res) {
  try {
    const { Title, Genre, Duration, Description, TrailerURL, Director, Cast, ReleaseDate, Language, Rated } = req.body;
    
    // Kiểm tra xem file đã được upload chưa
    if (!req.files || !req.files['poster'] || req.files['poster'].length === 0) {
      return res.status(400).json({ success: false, message: "Ảnh poster là bắt buộc." });
    }

    // Lấy đường dẫn file từ Cloudinary sau khi upload thành công
    const posterUrl = req.files['poster'][0].path;

    if (!Title || !Duration) {
      return res.status(400).json({ success: false, message: "Tên phim và Thời lượng là bắt buộc." });
    }

    const newMovieData = {
      Title,
      Genre,
      Duration: parseInt(Duration, 10),
      Description,
      Poster: posterUrl,
      TrailerURL: TrailerURL,
      Director,
      Cast,
      ReleaseDate,
      Language,
      Rated
    };

    const createdMovie = await MovieModel.createMovie(newMovieData);

    res.status(201).json({
      success: true,
      message: "Thêm phim thành công!",
      data: createdMovie
    });

  } catch (error) {
    console.error("❌ Lỗi khi thêm phim:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ.", error: error.message });
  }
}

export async function getMovies(req, res) {
  try {
    const movies = await MovieModel.getAllMovies();
    res.status(200).json({
      success: true,
      message: "Lấy danh sách phim thành công",
      data: movies
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách phim:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  }
}

export async function getMovie(req, res) {
  try {
    const { MovieID } = req.params;
    const movie = await MovieModel.getMovieById(MovieID);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Phim không tồn tại" });
    }
    res.json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

export async function updateMovie(req, res) {
  try {
    const { MovieID } = req.params;
    const { Title, Genre, Duration, Description, TrailerURL, Director, Cast, ReleaseDate, Language, Rated } = req.body;

    // Xử lý Poster: Ưu tiên file mới upload, nếu không thì lấy URL cũ từ body
    let Poster = req.body.Poster;
    if (req.files && req.files['poster'] && req.files['poster'][0]) {
      Poster = req.files['poster'][0].path;
    }

    const updatedMovie = await MovieModel.updateMovie(MovieID, {
      Title,
      Genre,
      Duration: parseInt(Duration),
      Description,
      Poster,
      TrailerURL,
      Director,
      Cast,
      ReleaseDate,
      Language,
      Rated
    });

    if (updatedMovie) {
      res.json({ success: true, message: "Cập nhật phim thành công", data: updatedMovie });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy phim" });
    }
  } catch (error) {
    console.error("Lỗi cập nhật phim:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
}
export async function deleteMovie(req, res) { // Đảm bảo hàm này đã được export
    try {
        const { MovieID } = req.params;

        // Check if the movie exists
        const movieToDelete = await MovieModel.getMovieById(MovieID);
        if (!movieToDelete) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        await MovieModel.deleteMovie(MovieID);

        res.json({
            success: true,
            message: "Movie deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

export async function getRecommendedMovies(req, res) {
  try {
    const UserID = req.user.userId;
    const pool = await getPool();

    // 1. Lấy tất cả thể loại phim mà user đã từng xem thành công
    const userHistoryRes = await pool.request()
      .input('UserID', sql.Int, UserID)
      .query(`
        SELECT m.Genre, m.MovieID
        FROM Tickets t
        JOIN Showtimes st ON t.ShowtimeID = st.ShowtimeID
        JOIN Movies m ON st.MovieID = m.MovieID
        WHERE t.UserID = @UserID AND t.Status != 'Cancelled'
      `);

    if (userHistoryRes.recordset.length === 0) {
      return res.json({ success: true, data: [], message: "Chưa có lịch sử để gợi ý" });
    }

    // 2. Phân tích thể loại yêu thích (Genre Scoring)
    const genreCount = {};
    const watchedMovieIds = new Set();

    userHistoryRes.recordset.forEach(row => {
      watchedMovieIds.add(row.MovieID);
      // Chuẩn hóa về chữ thường để thống kê chính xác hơn
      const genres = row.Genre ? row.Genre.split(',').map(g => g.trim().toLowerCase()).filter(Boolean) : [];
      genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });

    // Lấy top 3 thể loại user xem nhiều nhất
    const favoriteGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    // 3. Lấy tất cả phim đang có suất chiếu tương lai
    const allCurrentMovies = await MovieModel.getAllMovies();

    // 4. Lọc phim: Thuộc favoriteGenres VÀ user chưa xem
    const recommended = allCurrentMovies.filter(movie => {
      if (watchedMovieIds.has(movie.MovieID)) return false;
      
      // Chuẩn hóa về chữ thường để so sánh với danh sách favoriteGenres
      const movieGenres = movie.Genre ? movie.Genre.split(',').map(g => g.trim().toLowerCase()).filter(Boolean) : [];
      return movieGenres.some(mg => favoriteGenres.includes(mg));
    }).slice(0, 8); // Giới hạn 8 phim gợi ý

    res.json({ success: true, data: recommended });

  } catch (error) {
    console.error("Lỗi lấy phim gợi ý:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}