import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Weather from './Weather';
import Button from './Button';
import Chatbot from './Chatbot';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/movies?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="relative shadow-md sticky top-0 z-50 bg-cover bg-center" style={{ backgroundImage: "url('https://image.slidesdocs.com/responsive-images/background/theatrical-red-curtain-with-a-3d-rendered-stage-in-red-and-gold-powerpoint-background_aeb8009bbb__960_540.jpg')" }}>
      {/* Overlay để làm tối ảnh nền giúp chữ dễ đọc hơn */}
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"></div>
      <div className="relative z-10">
      {/* Tầng trên: Logo - Announcement - User Actions */}
      <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-4 text-white">
        {/* Logo bên trái */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
          <span className="text-2xl font-bold text-red-600 hidden sm:block">CinemaDB</span>
        </Link>

        {/* Thanh tìm kiếm ở giữa */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm phim bom tấn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full px-5 py-2.5 pl-11 pr-4 rounded-full border border-gray-600 bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-inner"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* User Actions & Weather */}
        <div className="flex items-center space-x-4">
          <Weather variant="header" />
          
         
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 group">
                {user.Avatar ? (
                  <img src={user.Avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-red-500 shadow-sm transition-transform group-hover:scale-110" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shadow-inner transition-transform group-hover:scale-110">
                    {user.Username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col leading-tight hidden lg:flex">
                  <span className="text-white font-bold text-sm group-hover:text-red-400 transition-colors">
                    {user.FullName || user.Username}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Hồ sơ cá nhân</span>
                </div>
              </Link>
              <Button onClick={handleLogout} className="!px-3 !py-1.5 !text-xs !bg-white/10 !text-white !border-white/20 hover:!bg-red-600/20 transition-all shadow-none after:hidden">
                Đăng Xuất
              </Button>
            </div>

          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all transform hover:scale-105">
                Đăng Nhập
              </Link>
              <Link to="/register" className="hidden lg:block px-4 py-2 rounded border border-white hover:bg-white hover:text-gray-900 transition-colors">
                Đăng Ký
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tầng dưới: Navigation Tabs */}
      <div className="border-t border-gray-700 bg-black/20">
        <div className="container mx-auto px-4">
          <nav className="flex justify-center space-x-8 py-3 font-medium text-white overflow-x-auto">
            <Link to="/" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              Trang Chủ
            </Link>
            <Link to="/movies" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" /></svg>
              Phim Đang Chiếu
            </Link>
            <Link to="/showtimes" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
              Lịch Chiếu
            </Link>
            <Link to="/news" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" /></svg>
              Ưu Đãi
            </Link>
            <Link to="/snacks" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
              Bắp & Nước
            </Link>
            <Link to="/lucky-wheel" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
              <span className="animate-bounce">🎡</span>
              Vòng Quay May Mắn
            </Link>
            {user && (
              <Link to="/my-tickets" className="hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                Vé Của Tôi
              </Link>
            )}
             {/* Hotline Button */}
          <a href="tel:0971304944" className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-red-600/20 px-3 py-1.5 rounded-full border border-white/20 transition-all group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm font-bold tracking-tight"> HotLine 0971304944</span>
          </a>
          </nav>
        </div>
      </div>
      </div>
      {/* Tích hợp Chatbot AI */}
      <Chatbot />
    </header>
  );
}

export default Header;