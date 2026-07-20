import React from 'react';
import { Link } from 'react-router-dom';

const ErrorPage = ({ title = "404", message = "Không tìm thấy trang" }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-red-200 to-pink-200 opacity-20 blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-orange-200 to-red-200 opacity-20 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-pink-200 to-purple-200 opacity-20 blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-[1.01] duration-300 border border-gray-100 dark:border-gray-700">
        <div className="p-8 md:p-12 text-center">
          
          {/* Icon / Error Code */}
          <div className="mb-6 relative inline-block">
             <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-600 drop-shadow-sm select-none">
                {title}
             </h1>
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/10 to-orange-600/10 blur-xl -z-10 rounded-full"></div>
          </div>

          {/* Message */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight">
            Oops! {message}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
            Có vẻ như có gì đó không ổn. Trang bạn đang tìm kiếm không tồn tại hoặc đã xảy ra lỗi hệ thống.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
                to="/" 
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-gradient-to-r from-red-600 to-red-500 rounded-xl hover:from-red-700 hover:to-red-600 focus:ring-4 focus:ring-red-300/50 shadow-lg shadow-red-500/30 transition-all duration-200 transform hover:-translate-y-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Về Trang Chủ
            </Link>
            <button 
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-200/50 transition-all duration-200"
            >
                Quay Lại
            </button>
          </div>
        </div>
        
        {/* Bottom decorative bar */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-red-500 to-pink-500"></div>
      </div>
    </div>
  );
};

export default ErrorPage;