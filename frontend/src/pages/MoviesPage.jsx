import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import TrailerModal from '../components/TrailerModal';
import { toast } from 'sonner';

const MoviesPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tất cả');
  const [selectedRated, setSelectedRated] = useState('Tất cả');

  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState('');

  // ================= FETCH =================
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);

        const res = await fetch('/api/movies');

        if (!res.ok) {
          throw new Error('Không thể tải danh sách phim');
        }

        const result = await res.json();

        setMovies(result.data || []);
        setFilteredMovies(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // ================= SEARCH PARAM =================
  useEffect(() => {
    const query = searchParams.get('q');

    if (query) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  // ================= FILTER =================
  useEffect(() => {
    let result = [...movies];

    if (selectedGenre !== 'Tất cả') {
      result = result.filter((movie) =>
        movie.Genre?.includes(selectedGenre)
      );
    }

    if (selectedRated !== 'Tất cả') {
      result = result.filter(
        (movie) => movie.Rated === selectedRated
      );
    }

    if (searchTerm.trim()) {
      result = result.filter((movie) =>
        movie.Title?.toLowerCase().includes(
          searchTerm.toLowerCase()
        )
      );
    }

    setFilteredMovies(result);
  }, [movies, searchTerm, selectedGenre, selectedRated]);

  // ================= DATA =================
  const genres = [
    'Tất cả',
    ...new Set(
      movies.flatMap((movie) =>
        movie.Genre
          ? movie.Genre.split(',').map((g) => g.trim())
          : []
      )
    )
  ];

  const ratedList = [
    'Tất cả',
    'P',
    'K',
    'T13',
    'T16',
    'T18',
    'C'
  ];

  // ================= ACTIONS =================
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenre('Tất cả');
    setSelectedRated('Tất cả');
  };

  const openTrailer = (e, url) => {
    e.preventDefault();
    e.stopPropagation();

    if (!url) {
      toast.info('Phim chưa có trailer');
      return;
    }

    setActiveTrailerUrl(url);
    setShowTrailer(true);
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-lg">
        Đang tải phim...
      </div>
    );
  }

  // ================= ERROR =================
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 text-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">

      {/* HERO */}
      <div className="relative h-52 bg-gradient-to-r from-red-900 via-black to-black flex items-center justify-center overflow-hidden">

        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-3">
            Phim Đang Chiếu
          </h1>

          <p className="text-red-200 text-sm uppercase tracking-[4px]">
            Trải nghiệm điện ảnh đỉnh cao
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div className="max-w-7xl mx-auto px-4 mt-8 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">

          {/* SEARCH */}
          <div className="relative w-full lg:w-80 group">

            <input
              type="text"
              placeholder="Tìm tên phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-gray-100 dark:bg-gray-800 border-none rounded-xl pl-12 pr-4 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
            />

            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* GENRE */}
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase tracking-tighter text-black dark:text-white outline-none min-w-[140px] cursor-pointer"
            >
              <option disabled>Thể loại</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre === 'Tất cả' ? '🎬 Mọi thể loại' : genre}
                </option>
              ))}
            </select>

            {/* RATED */}
            <select
              value={selectedRated}
              onChange={(e) => setSelectedRated(e.target.value)}
              className="h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase tracking-tighter text-black dark:text-white outline-none min-w-[120px] cursor-pointer"
            >
              <option disabled>Độ tuổi</option>
              {ratedList.map((rated) => (
                <option key={rated} value={rated}>
                  {rated === 'Tất cả' ? '🔞 Mọi độ tuổi' : `Hạn chế ${rated}`}
                </option>
              ))}
            </select>

            {/* CLEAR */}
            <button
              onClick={clearFilters}
              className="h-12 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all font-bold whitespace-nowrap shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* MOVIES */}
      <div className="max-w-7xl mx-auto px-4">

        {filteredMovies.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-xl">
              Không tìm thấy bộ phim phù hợp
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-7">

            {filteredMovies.map((movie) => (
              <div
                key={movie.MovieID}
                className="group bg-gray-900 rounded-3xl overflow-hidden shadow-xl hover:-translate-y-2 hover:shadow-red-900/20 transition-all duration-500"
              >
                <Link to={`/movies/${movie.MovieID}`}>

                  {/* POSTER */}
                  <div className="relative aspect-[2/3] overflow-hidden">

                    <img
                      src={movie.Poster || '/no-image.jpg'}
                      alt={movie.Title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* OVERLAY */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center gap-4 p-4">

                      <button
                        onClick={(e) =>
                          openTrailer(e, movie.TrailerURL)
                        }
                        className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                      >
                        ▶ Trailer
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();

                          navigate(`/movies/${movie.MovieID}`, {
                            state: { scrollTo: 'showtime' }
                          });
                        }}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 transition font-bold"
                      >
                        Đặt Vé
                      </button>
                    </div>

                    {/* BADGE */}
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] px-3 py-1 rounded-lg font-black uppercase">
                      {movie.Rated || 'P'}
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-4">

                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-red-500 transition-colors">
                      {movie.Title}
                    </h3>

                    <div className="flex items-center justify-between mt-2">

                      <span className="text-xs text-gray-400 line-clamp-1">
                        {movie.Genre || 'Unknown'}
                      </span>

                      <span className="text-xs text-red-500 font-bold whitespace-nowrap">
                        {movie.Duration || 0} phút
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TRAILER MODAL */}
      {showTrailer && (
        <TrailerModal
          trailerUrl={activeTrailerUrl}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
};

export default MoviesPage;