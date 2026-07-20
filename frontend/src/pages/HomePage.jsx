import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TrailerModal from '../components/TrailerModal';
import HeroSlider from '../components/HeroSlider';
import { toast } from 'sonner';

function HomePage() {
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  const [movies, setMovies] = useState([]);
  const [promoVoucher, setPromoVoucher] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTrailer, setSelectedTrailer] = useState(null);

  const [sliderIndex, setSliderIndex] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // ================= FETCH =================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('cinema-token');

        const headers = token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {};

        // 1. Chỉ chặn trang nếu phim không tải được.
        const movieRes = await fetch("/api/movies", { headers });
        if (!movieRes.ok) throw new Error('Không thể tải danh sách phim');
        
        const movieData = await movieRes.json();
        if (movieData.success) setMovies(movieData.data || []);

        // 2. Tải các thành phần phụ (Voucher, Gợi ý). Nếu lỗi (vd: khách chưa login) thì bỏ qua, không treo trang.
        const [voucherRes, recommendRes] = await Promise.all([
          fetch("/api/vouchers", { headers }).catch(() => null),
          token ? fetch("/api/movies/recommendations", { headers }).catch(() => null) : null
        ]);

        if (recommendRes && recommendRes.ok) {
          const recommendData = await recommendRes.json();
          if (recommendData.success) setRecommendedMovies(recommendData.data || []);
        }

        if (voucherRes && voucherRes.ok) {
          const voucherData = await voucherRes.json();
          if (voucherData.success) {
          const activeVoucher = (
            voucherData.publicVouchers ||
            voucherData.data ||
            []
          ).find(
            (v) =>
              v.Status === 'Active' &&
              v.Quantity > 0
          );

          setPromoVoucher(activeVoucher);
        }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ================= RESET SLIDER =================
  useEffect(() => {
    setSliderIndex(0);
  }, [movies]);

  // ================= TRAILER =================
  const handlePlayTrailer = (url) => {
    if (!url) {
      toast.info('Phim chưa có trailer');
      return;
    }

    setSelectedTrailer(url);
  };

  // ================= SLIDER =================
  const nextSlide = () => {
    if (sliderIndex + 4 < movies.length) {
      setSliderIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (sliderIndex > 0) {
      setSliderIndex((prev) => prev - 1);
    }
  };

  // ================= DRAG =================
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX || e.touches[0].pageX);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.pageX || e.touches[0].pageX;
    setDragOffset(currentX - startX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }

    setDragOffset(0);
  };

  return (
    <div className="pb-4">
      {/* 1. HERO SLIDER */}
      <HeroSlider movies={movies.slice(0, 6)} />

      {/* 2. PROMO VOUCHER BANNER (Đã đưa lên trước danh sách phim) */}
      <div className="max-w-7xl mx-auto px-4 mt-8 mb-4">
        {promoVoucher ? (
          <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl shadow-red-500/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl animate-bounce shadow-lg">
                🎁
              </div>
              <div>
                <h3 className="text-white text-lg font-black uppercase">
                  Ưu đãi đặc biệt
                </h3>
                <p className="text-red-100 text-sm">
                  Dùng mã{' '}
                  <span className="bg-black/20 px-2 py-1 rounded font-bold text-white">
                    {promoVoucher.Code}
                  </span>{' '}
                  để nhận giảm giá hấp dẫn
                </p>
              </div>
            </div>
            <Link
              to="/news"
              className="bg-white text-red-600 px-6 py-3 rounded-xl font-black hover:bg-gray-100 transition"
            >
              Nhận Ngay
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-700 to-gray-600 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-center gap-6 shadow-xl shadow-gray-500/10 border border-gray-400/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">✨</div>
              <h3 className="text-white text-xl font-black uppercase tracking-tight">Chào mừng đến với CinemaDB</h3>
            </div>
            <Link to="/news" className="bg-white text-gray-800 px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg text-sm">
              Khám phá ưu đãi
            </Link>
          </div>
        )}
      </div>

      {/* 2.5 RECOMMENDED FOR YOU (Chỉ hiện khi có dữ liệu) */}
      {recommendedMovies.length > 0 && (
<section className="max-w-7xl mx-auto px-4 mb-4 animate-fade-in">          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-red-600 rounded-full"></div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Dành riêng cho bạn</h2>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold italic">SMART AI</span>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
            {recommendedMovies.map(movie => (
              <div key={movie.MovieID} className="w-[200px] flex-shrink-0 group">
                <Link to={`/movies/${movie.MovieID}`}>
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg transition-transform group-hover:scale-105">
                    <img src={movie.Poster} alt={movie.Title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                       <button className="w-full py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Đặt vé ngay</button>
                    </div>
                    <div className="absolute top-2 right-2">
                       <span className="bg-black/60 backdrop-blur-md text-white text-[8px] px-2 py-1 rounded-full font-bold">
                         {movie.Genre.split(',')[0]}
                       </span>
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm font-bold truncate group-hover:text-red-500 transition-colors">{movie.Title}</h3>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. MOVIES (Phim Đang Chiếu) */}
<section className="py-12 bg-gray-50/70 dark:bg-white/5 rounded-[3rem] mt-2">        <div className="max-w-7xl mx-auto px-4">
          
          {/* MOVIES HEADER */}
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black border-l-4 border-red-600 pl-4 uppercase tracking-tight">
              Phim Đang Chiếu
            </h2>
            <Link
              to="/movies"
              className="text-red-600 font-bold hover:underline flex items-center gap-1"
            >
              Xem tất cả
            </Link>
          </div>

          {/* MOVIES STATE HANDLING */}
          {loading ? (
            <div className="text-center py-16">
              Đang tải phim...
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">
              {error}
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Không có phim nào
            </div>
          ) : (
            <div className="relative">
              {/* PREV BUTTON */}
              {sliderIndex > 0 && (
                <button
                  onClick={prevSlide}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                >
                  ❮
                </button>
              )}

              {/* NEXT BUTTON */}
              {sliderIndex + 4 < movies.length && (
                <button
                  onClick={nextSlide}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                >
                  ❯
                </button>
              )}

              {/* MOVIES CAROUSEL */}
              <div
                ref={sliderRef}
                className="overflow-hidden py-4 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
              >
                <div
                  className="flex gap-6"
                  style={{
                    transform: `translateX(calc(-${sliderIndex * 25}% + ${dragOffset}px))`,
                    transition: isDragging ? 'none' : 'transform 0.6s ease'
                  }}
                >
                  {movies.map((movie) => (
                    <div
                      key={movie.MovieID}
                      className="w-[85%] sm:w-[48%] lg:w-[calc(25%-18px)] flex-shrink-0 group"
                    >
                      <Link to={`/movies/${movie.MovieID}`}>
                        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827] shadow-xl hover:shadow-red-500/20 transition-all duration-500 hover:-translate-y-3">
                          
                          {/* POSTER & BADGES */}
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={movie.Poster || '/no-image.jpg'}
                              alt={movie.Title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handlePlayTrailer(movie.TrailerURL);
                              }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white text-2xl opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500"
                            >
                              ▶
                            </button>

                            <div className="absolute top-4 left-4 flex gap-2">
                              <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase">
                                {movie.Rated || 'P'}
                              </span>
                              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full">
                                {movie.Duration}m
                              </span>
                            </div>
                          </div>

                          {/* MOVIE INFO & ACTION */}
                          <div className="p-5">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white line-clamp-1 mb-2 group-hover:text-red-500 transition-colors">
                              {movie.Title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-1 mb-5">
                              {movie.Genre?.split(',').join(' • ')}
                            </p>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/movies/${movie.MovieID}`, {
                                  state: { scrollTo: 'showtime' }
                                });
                              }}
                              className="w-full py-3 rounded-2xl bg-red-600 text-white font-black tracking-wide hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                            >
                              MUA VÉ NGAY
                            </button>
                          </div>

                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* 4. WEEKLY HOT TAGS BANNER (Thứ 2 - Thứ 6) */}
      <div className="max-w-7xl mx-auto px-4 mt-12 mb-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-black via-gray-900 to-red-950 p-8 md:p-10 shadow-2xl">
          
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/20 blur-3xl rounded-full"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* LEFT TEXT */}
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-widest mb-4">
                Ưu Đãi Trong Tuần
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                Thứ 2 - Thứ 6 Hàng Tuần
                <br />
                <span className="text-red-500">
                  Giá Vé Chỉ Từ 50K
                </span>
              </h2>
              <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-6">
                Đặt vé online nhanh chóng với mức giá ưu đãi cực hấp dẫn.
                Trải nghiệm những bom tấn điện ảnh mới nhất tại CinemaDB.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/movies"
                  className="px-7 py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-lg shadow-red-600/30"
                >
                  Đặt Vé Ngay
                </Link>
                <Link
                  to="/news"
                  className="px-7 py-3 rounded-xl border border-gray-600 text-white font-bold hover:bg-white hover:text-black transition-all"
                >
                  Xem Chi Tiết
                </Link>
              </div>
            </div>

            {/* RIGHT GRAPHICS */}
            <div className="hidden md:flex items-center gap-4">
              <div className="w-32 h-48 rounded-2xl overflow-hidden rotate-[-8deg] shadow-2xl">
                <img
                  src={movies[0]?.Poster}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-36 h-56 rounded-2xl overflow-hidden rotate-[6deg] shadow-2xl border-4 border-white/10">
                <img
                  src={movies[1]?.Poster}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 5. GOOGLE MAP LOCATION */}
      <div className="max-w-7xl mx-auto px-4 mt-2 mb-0">
        <a
          href="https://maps.google.com/?q=Ngõ+147+Triều+Khúc+Thanh+Xuân+Hà+Nội"
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-[2rem] h-[320px] shadow-2xl"
        >
          <img
            src="/image.png"
            alt="CinemaDB Location"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 flex items-center">
            <div className="p-8 md:p-12 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-widest mb-5">
                📍 CinemaDB
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
                Hệ Thống Rạp CinemaDB
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Ngõ 147 Triều Khúc, Thanh Xuân, Hà Nội
              </p>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white text-black font-black hover:bg-red-600 hover:text-white transition-all duration-300">
                Xem Trên Google Maps
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* 6. MODAL TRAILER COMPONENT */}
      <TrailerModal
        trailerUrl={selectedTrailer}
        onClose={() => setSelectedTrailer(null)}
      />
    </div>
  );
}

export default HomePage;