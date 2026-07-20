// c:\Đồ án\frontend\src\pages\MovieDetailsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import TrailerModal from '../components/TrailerModal';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';

const MovieDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date()); // State quản lý ngày được chọn
  const [ratingModal, setRatingModal] = useState({ 
    isOpen: false, 
    rating: 5, 
    comment: '' 
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tạo danh sách 7 ngày tới để hiển thị bộ lọc
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Hàm kiểm tra hai ngày có trùng nhau không (bỏ qua giờ phút)
  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = typeof date1 === 'string' ? new Date(date1.endsWith('Z') ? date1 : date1 + 'Z') : new Date(date1);
    const d2 = typeof date2 === 'string' ? new Date(date2.endsWith('Z') ? date2 : date2 + 'Z') : new Date(date2);

    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/movie/${id}`);
      const data = await res.json();
      if (data.success) setReviews(data.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [movieRes, stRes] = await Promise.all([
          fetch(`/api/movies/${id}`),
          fetch(`/api/showtimes/movie/${id}`)
        ]);
        const mData = await movieRes.json();
        const sData = await stRes.json();
        if (mData.success) setMovie(mData.data);
        if (sData.success) setShowtimes(sData.data);
        await fetchReviews();
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Xử lý cuộn trang: Đến phần bình luận, phần Suất chiếu hoặc Lên đầu trang
  useEffect(() => {
    if (loading) return;

    if (window.location.hash === '#reviews') {
      const element = document.getElementById('reviews');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else if (location.state?.scrollTo === 'showtime') {
      const element = document.getElementById('showtimes-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Mặc định lên đầu trang
    }
  }, [loading, location.state, location.hash]);

  // Lọc danh sách suất chiếu dựa trên ngày người dùng đang chọn
  const filteredShowtimes = showtimes.filter(st => {
    if (!st.StartTime) return false;
    const showtimeStart = new Date(st.StartTime.endsWith('Z') ? st.StartTime : st.StartTime + 'Z');
    return isSameDate(showtimeStart, selectedDate) && showtimeStart.getTime() > Date.now(); // Chỉ hiện suất chiếu chưa bắt đầu
  });

  const handleEditReview = (rev) => {
    setRatingModal({
      isOpen: true,
      rating: rev.Rating,
      comment: rev.Comment
    });
  };

  const handleDeleteReview = async () => {
    try {
      const res = await fetch(`/api/reviews/movie/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchReviews();
      } else { toast.error(data.message); }
    } catch (e) { toast.error("Lỗi xóa bình luận"); }
    finally { setConfirmDelete(false); }
  };

  const submitReview = async () => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({
          MovieID: id,
          Rating: ratingModal.rating,
          Comment: ratingModal.comment
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setRatingModal(prev => ({ ...prev, isOpen: false, comment: '', rating: 5 }));
        fetchReviews();
      } else { toast.error(data.message); }
    } catch (e) { toast.error("Lỗi gửi đánh giá"); }
  };

  if (loading) return <div className="text-center py-10">Đang tải...</div>;
  if (!movie) return <div className="text-center py-10">Không tìm thấy phim.</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        <div className="w-full md:w-1/3">
            <img src={movie.Poster} alt={movie.Title} className="w-full rounded-lg shadow-lg object-cover" />
        </div>

        {/* Thông tin phim */}
        <div className="w-full md:w-2/3">
            <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">{movie.Title}</h1>
            
            {/* Nút Xem Trailer */}
            {movie.TrailerURL && (
              <button 
                onClick={() => setShowTrailer(true)}
                className="mb-6 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-red-500/30 transition-all transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Xem Trailer
              </button>
            )}
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-8 space-y-4">

  {/* Đạo diễn */}
  <div className="grid grid-cols-[140px_1fr] border-b pb-3 border-gray-100 dark:border-gray-700">
    <span className="text-gray-500 flex items-center gap-2">🎬 Đạo diễn:</span>
    <span className="text-gray-900 dark:text-white font-semibold">
      {movie.Director || 'Đang cập nhật'}
    </span>
  </div>

  {/* Diễn viên */}
  <div className="grid grid-cols-[140px_1fr] border-b pb-3 border-gray-100 dark:border-gray-700">
    <span className="text-gray-500 flex items-center gap-2">🎭 Diễn viên:</span>
    <span className="text-gray-900 dark:text-white font-semibold break-words">
      {movie.Cast || 'Đang cập nhật'}
    </span>
  </div>

  {/* Khởi chiếu */}
  <div className="grid grid-cols-[140px_1fr] border-b pb-3 border-gray-100 dark:border-gray-700">
    <span className="text-gray-500 flex items-center gap-2">📅 Khởi chiếu:</span>
    <span className="text-gray-900 dark:text-white font-semibold">
      {movie.ReleaseDate 
        ? new Date(movie.ReleaseDate).toLocaleDateString('vi-VN') 
        : 'Đang cập nhật'}
    </span>
  </div>

  {/* Ngôn ngữ */}
  <div className="grid grid-cols-[140px_1fr] border-b pb-3 border-gray-100 dark:border-gray-700">
    <span className="text-gray-500 flex items-center gap-2">🌐 Ngôn ngữ:</span>
    <span className="text-gray-900 dark:text-white font-semibold">
      {movie.Language || 'Đang cập nhật'}
    </span>
  </div>

  {/* Thể loại */}
  <div className="grid grid-cols-[140px_1fr] border-b pb-3 border-gray-100 dark:border-gray-700">
    <span className="text-gray-500 flex items-center gap-2">🎞️ Thể loại:</span>
    <span className="text-gray-900 dark:text-white font-semibold">
      {movie.Genre || 'Đang cập nhật'}
    </span>
  </div>

  {/* Phân loại */}
  <div className="grid grid-cols-[140px_1fr]">
    <span className="text-gray-500 flex items-center gap-2">🔞 Phân loại:</span>
    <span>
      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
        {movie.Rated || 'N/A'}
      </span>
    </span>
  </div>

  {/* Chi tiết phim */}
  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-2">
      📖 Chi tiết phim:
    </h3>
    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
      {movie.Description || 'Chưa có mô tả'}
    </p>
  </div>

</div>

            {/* Danh sách lịch chiếu */}
            <h2 id="showtimes-section" 
  className="text-2xl font-bold mb-4 border-l-4 border-red-600 pl-3 scroll-mt-24">Chọn Suất Chiếu</h2>
            
            {/* Bộ lọc ngày chiếu */}
            <div className="flex overflow-x-auto gap-3 mb-6 pb-2 scrollbar-hide">
              {next7Days.map((date, index) => {
                const isSelected = isSameDate(date, selectedDate);
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 min-w-[100px] py-2 px-3 rounded-xl border transition-all ${
                      isSelected 
                      ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-80">
                      {index === 0 ? "Hôm nay" : `Thứ ${date.getDay() + 1 === 1 ? 'CN' : date.getDay() + 1}`}
                    </div>
                    <div className="text-lg font-bold">{date.getDate()}/{date.getMonth() + 1}</div>
                  </button>
                );
              })}
            </div>

            {filteredShowtimes.length === 0 ? (
                <p className="text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">Rất tiếc, hiện không có suất chiếu nào cho ngày này.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredShowtimes.map(st => (
                        <Link
                            key={st.ShowtimeID}
                            to={`/booking/${st.ShowtimeID}`}
                            className="block bg-white border border-gray-200 hover:border-red-500 hover:shadow-md rounded-lg p-3 text-center transition-all group"
                        >
                            <div className="text-lg font-bold text-red-600 group-hover:scale-110 transition-transform">
                                {new Date(st.StartTime.endsWith('Z') ? st.StartTime : st.StartTime + 'Z').toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold mb-1">
                                Trống {st.TotalSeats - st.BookedSeats}/{st.TotalSeats} 
                            </div>
                            <div className="flex justify-between items-center mt-1 px-1">
                               <span className="text-[10px] text-gray-400">{st.RoomName}</span>
                               <span className="text-[10px] font-bold text-blue-600 italic">{st.Format}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Phần bình luận & Đánh giá */}
      <div id="reviews" className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-yellow-500">★</span> Đánh giá từ khán giả ({reviews.length})
        </h2>
        <div className="space-y-6">
          {reviews.length === 0 ? <p className="italic text-gray-500">Chưa có đánh giá nào cho phim này.</p> : (
            reviews.map((rev, idx) => {
              const isOwnReview = user && user.UserID === rev.UserID;
              return (
                <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-red-600">{rev.FullName || rev.Username}</div>
                    <div className="text-yellow-500">{'★'.repeat(rev.Rating)}{'☆'.repeat(5-rev.Rating)}</div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic">"{rev.Comment}"</p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-[10px] text-gray-400">{new Date(rev.CreatedAt).toLocaleDateString()}</div>
                    {isOwnReview && (
                      <div className="flex gap-3 text-xs">
                        <button 
                          onClick={() => handleEditReview(rev)} 
                          className="text-blue-500 hover:underline font-semibold"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(true)} 
                          className="text-red-500 hover:underline font-semibold"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Sửa Đánh giá */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden transform transition-all scale-100">
            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white border-b pb-2">Chỉnh sửa đánh giá</h3>
            
            <div className="flex gap-2 mb-6 justify-center mt-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRatingModal(prev => ({ ...prev, rating: star }))}
                  className={`text-4xl transition-transform active:scale-125 ${star <= ratingModal.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >★</button>
              ))}
            </div>

            <textarea 
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-4 mb-6 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all"
              rows="4"
              placeholder="Cảm nhận của bạn về phim..."
              value={ratingModal.comment}
              onChange={e => setRatingModal(prev => ({ ...prev, comment: e.target.value }))}
            ></textarea>

            <div className="flex gap-3">
              <button 
                onClick={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >Hủy</button>
              <button 
                onClick={submitReview}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
              >Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị Trailer */}
      {showTrailer && (
        <TrailerModal 
          trailerUrl={movie.TrailerURL} 
          onClose={() => setShowTrailer(false)} 
        />
      )}

      {/* Modal xác nhận xóa bình luận */}
      <ConfirmModal 
        isOpen={confirmDelete}
        title="Xóa bình luận"
        message="Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteReview}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
};

export default MovieDetailsPage;
