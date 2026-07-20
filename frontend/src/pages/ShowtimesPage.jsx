import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Tạo danh sách 7 ngày tới để hiển thị trên thanh chọn
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    const fetchShowtimes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/showtimes'); // Lấy tất cả lịch chiếu
        const data = await res.json();
        if (data.success) {
          setShowtimes(data.data);
        }
      } catch (error) {
        console.error("Lỗi tải lịch chiếu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShowtimes();
  }, []);

  // Hàm so sánh ngày (bỏ qua giờ phút giây)
  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = typeof date1 === 'string' ? new Date(date1.endsWith('Z') ? date1 : date1 + 'Z') : new Date(date1);
    const d2 = typeof date2 === 'string' ? new Date(date2.endsWith('Z') ? date2 : date2 + 'Z') : new Date(date2);
    
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // 1. Lọc các suất chiếu theo ngày được chọn
  const filteredShowtimes = showtimes.filter(st => 
    isSameDate(st.StartTime, selectedDate) && new Date(st.StartTime.endsWith('Z') ? st.StartTime : st.StartTime + 'Z').getTime() > Date.now()
  );

  // 2. Gom nhóm suất chiếu theo Phim (MovieID)
  // Cấu trúc mong muốn: { MovieID: { info: movieData, times: [st1, st2] } }
  const moviesMap = {};
  filteredShowtimes.forEach(st => {
    if (!moviesMap[st.MovieID]) {
      moviesMap[st.MovieID] = {
        MovieID: st.MovieID,
        Title: st.MovieTitle,
        Poster: st.Poster, // Lấy Poster từ API
        showtimes: []
      };
    }
    moviesMap[st.MovieID].showtimes.push(st);
  });

  // Chuyển map thành mảng để render và sắp xếp suất chiếu tăng dần
  const groupedMovies = Object.values(moviesMap).map(movie => {
    movie.showtimes.sort((a, b) => new Date(a.StartTime) - new Date(b.StartTime));
    return movie;
  });

  if (loading) return <div className="text-center py-10">Đang tải lịch chiếu...</div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 border-l-4 border-red-600 pl-4">Lịch Chiếu Phim</h1>

      {/* Thanh chọn ngày */}
      <div className="flex overflow-x-auto gap-4 pb-4 mb-8 border-b border-gray-200 dark:border-gray-700">
        {next7Days.map((date, index) => {
          const isSelected = isSameDate(date, selectedDate);
          const dayName = index === 0 ? "Hôm nay" : `Thứ ${date.getDay() + 1 === 1 ? 'CN' : date.getDay() + 1}`;
          
          return (
            <button
              key={index}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                isSelected 
                  ? 'bg-red-600 text-white shadow-lg scale-105' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xs font-medium uppercase">{dayName}</span>
              <span className="text-2xl font-bold">{date.getDate()}</span>
              <span className="text-xs">Tháng {date.getMonth() + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Danh sách phim & Suất chiếu */}
      <div className="space-y-8">
        {groupedMovies.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
                <p className="text-xl">Không có suất chiếu nào vào ngày này.</p>
                <p>Vui lòng chọn ngày khác.</p>
            </div>
        ) : (
            groupedMovies.map(movie => (
                <div key={movie.MovieID} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col md:flex-row gap-6">
                    {/* Poster phim */}
                    <div className="w-full md:w-48 flex-shrink-0">
                        <Link to={`/movies/${movie.MovieID}`}>
                            <img 
                                src={movie.Poster} 
                                alt={movie.Title} 
                                className="w-full h-72 md:h-64 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                onError={(e) => {e.target.onerror=null; e.target.src='https://via.placeholder.com/300x450?text=No+Poster'}}
                            />
                        </Link>
                    </div>

                    {/* Thông tin và Lịch chiếu */}
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 hover:text-red-600 transition-colors">
                            <Link to={`/movies/${movie.MovieID}`}>{movie.Title}</Link>
                        </h2>
                        <p className="text-gray-500 text-sm mb-4">Chọn suất chiếu để đặt vé:</p>
                        
                        <div className="flex flex-wrap gap-3">
                          {movie.showtimes.map(st => (
                            <Link
                                key={st.ShowtimeID}
                                to={`/booking/${st.ShowtimeID}`}
                                className="group flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-all min-w-[100px]"
                            >
                                <span className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-red-600">
                                    {new Date(st.StartTime.endsWith('Z') ? st.StartTime : st.StartTime + 'Z').toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">
                                    Trống {st.TotalSeats - st.BookedSeats}/{st.TotalSeats}
                                </span>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-gray-500 group-hover:text-red-500">{st.RoomName}</span>
                                  <span className="text-[9px] font-black uppercase text-red-500/70 border border-red-200 px-1 rounded bg-red-50">{st.Format}</span>
                                </div>
                            </Link>
                          ))}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ShowtimesPage;