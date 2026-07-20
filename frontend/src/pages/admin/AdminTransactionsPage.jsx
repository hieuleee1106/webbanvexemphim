import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const AdminTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/transactions/all', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
        });
        const data = await res.json();
        if (data.success) setTransactions(data.data);
      } catch (error) {
        toast.error("Lỗi tải lịch sử giao dịch");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const filteredData = transactions.filter(t => 
    (t.OrderCode?.toString().toLowerCase().includes(filter.toLowerCase())) ||
    (t.Username?.toLowerCase().includes(filter.toLowerCase())) ||
    (t.FullName?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-red-600">💰</span> Quản lý Giao dịch
        </h2>
        <input 
          type="text" 
          placeholder="Tìm theo mã đơn, khách hàng..." 
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-4 py-2 w-full md:w-80 outline-none focus:ring-2 focus:ring-red-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase font-bold">
              <th className="px-6 py-4 text-left">Mã Đơn</th>
              <th className="px-6 py-4 text-left">Khách Hàng</th>
              <th className="px-6 py-4 text-left">Nội dung đơn hàng</th>
              <th className="px-6 py-4 text-right">Tổng Tiền</th>
              <th className="px-6 py-4 text-center">Thời gian</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10">Đang tính toán dữ liệu...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-500">Chưa có giao dịch nào được ghi nhận.</td></tr>
            ) : (
              filteredData.map((t, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-red-600">{t.OrderCode}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{t.FullName || t.Username}</div>
                    <div className="text-xs text-gray-500">{t.Phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {t.MovieTitle && (
                      <div className="font-semibold text-gray-700 dark:text-gray-300">
                        🎬 Phim: {t.MovieTitle}
                        <div className="flex gap-1 mt-1">
                           {t.SeatBreakdown?.split(',').map((item, i) => (
                             <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                               {item.trim()}
                             </span>
                           ))}
                        </div>
                      </div>
                    )}
                    {t.Snacks.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        🍿 Bắp nước: {t.Snacks.map(s => `${s.Name} x${s.Quantity}`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-lg text-gray-900 dark:text-white">
                    {t.TotalAmount.toLocaleString()}đ
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {new Date(t.BookingTime.endsWith('Z') ? t.BookingTime : t.BookingTime + 'Z').toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      t.Status === 'Cancelled' ? 'bg-red-100 text-red-600' : 
                      t.Status === 'Đã lấy vé' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {t.Status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTransactionsPage;