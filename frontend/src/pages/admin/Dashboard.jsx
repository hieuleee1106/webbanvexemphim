import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Gửi kèm tham số lọc thời gian lên backend
        let url = `/api/stats`;
        if (timeRange === 'custom' && startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        } else {
            url += `?range=${timeRange}`;
        }
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
        });
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        toast.error("Không thể tải dữ liệu thống kê");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeRange, startDate, endDate]);

  const stats = data ? [
    { title: "Tổng Phim", value: data.TotalMovies, color: "text-blue-600", bg: "bg-blue-100", icon: "🎬" },
    { title: "Người dùng", value: data.TotalUsers, color: "text-green-600", bg: "bg-green-100", icon: "👤" },
    { title: "Vé đã đặt", value: data.TotalTickets, color: "text-purple-600", bg: "bg-purple-100", icon: "🎟️" },
    { title: "Doanh thu", value: `${(Number(data.TotalRevenue || 0)).toLocaleString()}đ`, color: "text-red-600", bg: "bg-red-100", icon: "💰" },
  ] : [];

  const chartData = data?.RevenueTrend || [];
  const movieData = data?.TopMovies || [];
  const recentTransactions = data?.RecentTransactions || [];
  const perMovieStats = data?.PerMovieStats || [];

  // Tính toán giá trị cao nhất để vẽ biểu đồ tỷ lệ
  const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 1;
  const totalMovieTickets = movieData.length > 0 ? movieData.reduce((sum, m) => sum + m.value, 0) : 0;

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading && !data) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      <span className="ml-3 font-bold text-gray-500">Đang phân tích dữ liệu...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter italic">Thống kê</h3>
          <p className="text-gray-500 text-sm">Chào mừng quay trở lại. Đây là tình hình kinh doanh của rạp.</p>
        </div>
        
        {/* Bộ lọc thời gian chuyên nghiệp */}
        <div className="flex flex-col gap-2">
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {[
              { label: 'Hôm nay', value: 'day' },
              { label: 'Tuần này', value: 'week' },
              { label: 'Tháng này', value: 'month' },
              { label: 'Tùy chỉnh', value: 'custom' }
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => {
                  setTimeRange(btn.value);
                  if (btn.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  timeRange === btn.value 
                  ? 'bg-red-600 text-white shadow-md shadow-red-200' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white"
              />
              <span>đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white"
              />
              {/* Nút áp dụng không cần thiết vì useEffect đã lắng nghe startDate/endDate */}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} opacity-20 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.title}</p>
                <p className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ doanh thu tự chế bằng Tailwind */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">Xu hướng doanh thu</h4>
            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">+12.5% so với kỳ trước</span>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {chartData.map((item, idx) => {
              const heightPercent = (item.value / maxRevenue) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip khi di chuột vào cột */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {item.value.toLocaleString()}đ
                  </div>
                  {/* Cột biểu đồ */}
                  <div 
                    className="w-full max-w-[40px] bg-red-500/20 group-hover:bg-red-500 rounded-t-lg transition-all duration-500 relative"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-lg"></div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-2 font-bold">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thống kê phim bằng Progress Bars */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-6 uppercase text-xs tracking-widest">Phim bán chạy</h4>
          <div className="space-y-6">
            {movieData.map((item, idx) => {
              const widthPercent = totalMovieTickets > 0 ? (item.value / totalMovieTickets) * 100 : 0;
              const color = COLORS[idx % COLORS.length];
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{item.name}</span>
                    <span className="text-gray-900 dark:text-white">{item.value} vé</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${widthPercent}%`, backgroundColor: color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bảng thống kê theo từng phim */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h4 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">Thống kê chi tiết theo phim</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase text-gray-400 font-black">
              <tr>
                <th className="px-6 py-3">Phim</th>
                <th className="px-6 py-3 text-right">Vé đã bán</th>
                <th className="px-6 py-3 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {perMovieStats.length === 0 ? (
                <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-400 italic">Không có dữ liệu phim trong khoảng thời gian này.</td></tr>
              ) : (
                perMovieStats.map((movie, i) => (
                  <tr key={movie.MovieID} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{movie.MovieTitle}</td>
                    <td className="px-6 py-4 text-right">{movie.TicketsSold}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600">{movie.Revenue.toLocaleString()}đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng giao dịch gần đây - Dữ liệu thật */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h4 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">Giao dịch mới nhất</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase text-gray-400 font-black">
              <tr>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4 text-right">Tổng tiền</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentTransactions.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">Chưa có giao dịch nào</td></tr>
              ) : (
                recentTransactions.map((tx, i) => (
                  <tr key={i} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{tx.FullName}</td>
                    <td className="px-6 py-4 text-gray-500">{tx.MovieTitle || "Combo Bắp Nước"}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600">{(tx.Amount || 0).toLocaleString()}đ</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(tx.BookingTime?.endsWith('Z') ? tx.BookingTime : tx.BookingTime + 'Z').toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${tx.Status === 'Cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {tx.Status === 'Cancelled' ? 'Đã hủy' : 'Thành công'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;