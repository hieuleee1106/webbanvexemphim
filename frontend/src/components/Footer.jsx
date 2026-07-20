import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 border-t-4 border-red-600 mt-auto">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {/* Column 1: Brand */}
                <div className="space-y-4">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="CinemaDB Logo" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
                        <span className="text-2xl font-bold text-red-500">CinemaDB</span>
                    </Link>
                    <p className="text-gray-400 text-sm leading-relaxed pr-4">
                        Trải nghiệm điện ảnh đỉnh cao với hệ thống rạp chiếu phim hiện đại, âm thanh sống động và tiện ích đặt vé trực tuyến nhanh chóng.
                    </p>
                </div>

                {/* Column 2: Quick Links */}
                <div>
                    <h3 className="text-lg font-bold mb-6 text-white border-b-2 border-red-600 inline-block pb-1">Khám Phá</h3>
                    <ul className="space-y-3 text-gray-400">
                        <li><Link to="/" className="hover:text-red-500 transition-colors flex items-center gap-2"><span className="text-red-500">›</span> Trang Chủ</Link></li>
                        <li><Link to="/movies" className="hover:text-red-500 transition-colors flex items-center gap-2"><span className="text-red-500">›</span> Phim Đang Chiếu</Link></li>
                        <li><Link to="/showtimes" className="hover:text-red-500 transition-colors flex items-center gap-2"><span className="text-red-500">›</span> Lịch Chiếu</Link></li>
                        <li><Link to="/news" className="hover:text-red-500 transition-colors flex items-center gap-2"><span className="text-red-500">›</span> Tin Tức & Ưu Đãi</Link></li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div>
                    <h3 className="text-lg font-bold mb-6 text-white border-b-2 border-red-600 inline-block pb-1">Liên Hệ</h3>
                    <ul className="space-y-4 text-gray-400">
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>147 Phố Triều Khúc- Thanh Xuân- Hà Nội</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>0971304944</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span>hieulee05@gmail.com</span>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Socials */}
                <div>
                    <h3 className="text-lg font-bold mb-6 text-white border-b-2 border-red-600 inline-block pb-1">Kết Nối</h3>
                    <p className="text-gray-400 mb-6 text-sm">Theo dõi chúng tôi trên mạng xã hội để không bỏ lỡ thông tin mới nhất.</p>
                    <div className="flex gap-4">
                        <a href="https://www.facebook.com/oantrunghieu.215447" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all transform hover:-translate-y-1 shadow-lg border border-gray-700">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.962.925-1.962 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 hover:text-white transition-all transform hover:-translate-y-1 shadow-lg border border-gray-700">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#0068FF] hover:text-white transition-all transform hover:-translate-y-1 shadow-lg border border-gray-700">
                            <span className="font-bold text-xs">Zalo</span>
                        </a>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-800 pt-8 mt-8 text-center md:flex md:justify-between md:text-left items-center">
                <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} CinemaDB. All rights reserved. Designed for Project.</p>
                <div className="flex gap-6 justify-center md:justify-end mt-4 md:mt-0 text-sm text-gray-500">
                    <a href="#" className="hover:text-red-500 transition-colors">Điều khoản sử dụng</a>
                    <a href="#" className="hover:text-red-500 transition-colors">Chính sách bảo mật</a>
                    <a href="#" className="hover:text-red-500 transition-colors">Câu hỏi thường gặp</a>
                </div>
            </div>
        </div>
    </footer>
  );
}

export default Footer;