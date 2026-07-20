import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import TrailerModal from './TrailerModal';

const HeroSlider = ({ movies }) => {
  const [current, setCurrent] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState('');

  // Tự động chuyển slide sau mỗi 6 giây
  useEffect(() => {
    if (!movies || movies.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === movies.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  const nextSlide = () => setCurrent(current === movies.length - 1 ? 0 : current + 1);
  const prevSlide = () => setCurrent(current === 0 ? movies.length - 1 : current - 1);

  const openTrailer = (url) => {
    setActiveTrailerUrl(url);
    setShowTrailer(true);
  };

  return (
<div className="relative w-full h-[380px] md:h-[500px] overflow-hidden rounded-[2rem] shadow-2xl mb-10 group bg-black">      {movies.map((movie, index) => (
        <div
          key={movie.MovieID}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
            index === current ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
          }`}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
             <img 
                src={movie.Poster} 
                alt={movie.Title} 
                className="w-full h-full object-cover opacity-60" 
             />
             {/* Gradient overlays for better text readability */}
             <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/40 to-transparent opacity-80"></div>
          </div>

          {/* Content */}
          <div className={`absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3 flex flex-col justify-end h-full transition-all duration-1000 delay-300 transform ${index === current ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="text-red-500 font-bold tracking-widest uppercase mb-2 text-sm md:text-base animate-pulse">Phim Mới Nổi Bật</span>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-lg">
              {movie.Title}
            </h2>
            <div className="flex items-center gap-4 text-gray-300 text-sm md:text-base mb-6 font-medium">
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">{movie.Genre}</span>
                <span>{movie.Duration} phút</span>
            </div>
            <p className="text-gray-300 text-lg md:text-xl mb-8 line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed">
              {movie.Description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={`/movies/${movie.MovieID}`} state={{ scrollTo: "showtime" }}>
                <Button className="!py-3 !px-8 !text-lg shadow-lg shadow-rose-500/40">
                  Đặt Vé Ngay
                </Button>
              </Link>
              <div className="flex flex-wrap gap-4">
                <Link to={`/movies/${movie.MovieID}`}>
                  <button className="px-8 py-3 rounded-md text-white font-bold border border-gray-500 hover:bg-white hover:text-black transition-all duration-300 text-lg backdrop-blur-sm bg-white/5">
                    Xem Chi Tiết
                  </button>
                </Link>
                {movie.TrailerURL && (
                  <button 
                    onClick={() => openTrailer(movie.TrailerURL)}
                    className="px-8 py-3 rounded-md text-white font-bold border border-red-500 bg-red-600/20 hover:bg-red-600 transition-all duration-300 text-lg flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Xem Trailer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Controls - Left/Right Arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>

      {/* Indicators - Bottom Dots */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-3">
        {movies.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'w-8 bg-red-500' : 'w-2 bg-gray-600 hover:bg-gray-400'}`}
          />
        ))}
      </div>

      {/* Modal hiển thị Trailer YouTube */}
      {showTrailer && (
        <TrailerModal 
          trailerUrl={activeTrailerUrl} 
          onClose={() => setShowTrailer(false)} 
        />
      )}
    </div>
  );
};

export default HeroSlider;