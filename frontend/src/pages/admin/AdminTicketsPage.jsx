import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import ConfirmModal from '../../components/ConfirmModal';

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    id: null,
    bookingCode: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets/all', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      const data = await res.json();
        if (data.success) {
          // 🔥 Sửa lỗi: Phải gọi groupTickets để gom nhóm vé lẻ thành đơn hàng
          const grouped = groupTickets(data.data);
          setTickets(grouped);
        }
    } catch (error) {
      toast.error("Lỗi tải danh sách vé");
    } finally {
      setLoading(false);
    }
  };

  // Hàm gom nhóm vé theo đơn hàng cho Admin
  const groupTickets = (rawTickets) => {
    const groups = {};
    rawTickets.forEach(t => {
      const d = new Date(t.BookingTime.endsWith('Z') ? t.BookingTime : t.BookingTime + 'Z');
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const date = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const timeKey = `${year}-${month}-${date} ${hours}:${minutes}`;

      // Nhóm theo Username, Suất chiếu và thời gian (phút) để tạo đơn hàng duy nhất
      const key = `${t.Username}_${t.ShowtimeID || 'snack'}_${timeKey}`;
      if (!groups[key]) {
        groups[key] = { ...t, seats: [], ticketIds: [], totalDiscount: 0, snacks: t.Snacks || [] };
      }
      if (t.SeatRow && t.SeatNumber) {
        groups[key].seats.push({
          name: `${t.SeatRow}${t.SeatNumber}`,
          type: t.SeatType,
          price: t.TicketPrice
        });
      }
      groups[key].ticketIds.push(t.TicketID); // Thêm TicketID vào mảng để xử lý hàng loạt
      // Cộng dồn tiền giảm giá từ các vé trong nhóm (thường chỉ lưu ở vé đầu tiên)
      groups[key].totalDiscount += (Number(t.DiscountAmount) || 0);
      if (t.Snacks && t.Snacks.length > 0 && groups[key].snacks.length === 0) {
        groups[key].snacks = t.Snacks;
      }
    });
    return Object.values(groups).sort((a, b) => new Date(b.BookingTime) - new Date(a.BookingTime));
  };

  const triggerDelete = (ticketId, bookingCode) => {
    setConfirmModal({
      isOpen: true,
      id: ticketId, // TicketID đầu tiên của nhóm
      ticketIds: tickets.find(t => t.TicketID === ticketId)?.ticketIds || [ticketId], // Lấy toàn bộ mảng ID của đơn
      bookingCode: bookingCode
    });
  };

  const handleDelete = async () => {
    const { ticketIds } = confirmModal; 
    try {
      const res = await fetch('/api/tickets/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ ticketIds })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Đã xóa vé thành công");
        fetchTickets(); // Tải lại danh sách
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Lỗi kết nối server");
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleUpdateStatus = async (ticketIds) => {
    try {
      // Cập nhật trạng thái cho tất cả vé trong đơn hàng cùng lúc
      const promises = ticketIds.map(id => 
        fetch('/api/tickets/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
          },
          body: JSON.stringify({ ticketId: id, status: 'Đã lấy vé' })
        }).then(r => r.json())
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        toast.success("Đã xác nhận lấy vé");
        fetchTickets(); // Tải lại để cập nhật giao diện
      } else {
        toast.error("Có lỗi khi cập nhật một số vé trong đơn");
      }
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  // Lọc vé theo tên người dùng hoặc tên phim
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
    const bookingCode = `${new Date(t.BookingTime.endsWith('Z') ? t.BookingTime : t.BookingTime + 'Z').getTime().toString().slice(-6)}${t.TicketID}`;
    const snackMatch = t.snacks?.some(s => s.Name.toLowerCase().includes(filter.toLowerCase()));
    return t.Username.toLowerCase().includes(filter.toLowerCase()) || 
           (t.MovieTitle && t.MovieTitle.toLowerCase().includes(filter.toLowerCase())) ||
           snackMatch ||
           bookingCode.includes(filter);
    });
  }, [tickets, filter]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Vé Đặt</h2>
        <input 
            type="text" 
            placeholder="Tìm theo Mã vé, Tên User, Tên Phim..." 
            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-80"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">Mã Vé</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Khách Hàng</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phim</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Suất Chiếu</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ghế</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Trạng Thái</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Giá Vé</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ghi chú Admin</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center py-4">Đang tải...</td></tr> : 
             filteredTickets.length === 0 ? <tr><td colSpan="6" className="text-center py-4">Không tìm thấy vé.</td></tr> :
             filteredTickets.map((t) => {
               let statusColor = "bg-green-100 text-green-700";
               if (t.Status === 'Cancelled') statusColor = "bg-red-100 text-red-700";
               if (t.Status === 'Đã lấy vé') statusColor = "bg-blue-100 text-blue-700";
               if (t.Status === 'Đã đặt') statusColor = "bg-green-100 text-green-700";

               let displayStatus = t.Status; // Mặc định hiển thị Status từ DB
               if (t.Status === 'Cancelled') displayStatus = 'Đã hủy';
               else if (t.Status === 'Đã lấy vé') displayStatus = 'Đã lấy vé';
               // Các trạng thái khác sẽ hiển thị nguyên văn từ DB

               // Tính toán giá tiền thực tế cho cả đơn hàng (đã gom nhóm)
               const seatTotal = (t.seats || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
               const snackTotal = (t.snacks || []).reduce((sum, s) => sum + (Number(s.PriceAtBooking || 0) * Number(s.Quantity || 0)), 0);
               const finalTotal = Math.max(0, seatTotal + snackTotal - Number(t.totalDiscount || 0));

               // Tạo mã vé hiển thị giống bên User (6 số cuối timestamp + TicketID)
               const bookingCode = `${new Date(t.BookingTime.endsWith('Z') ? t.BookingTime : t.BookingTime + 'Z').getTime().toString().slice(-6)}${t.TicketID}`;
               
               return (
                <tr key={t.TicketID} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-bold">#{bookingCode}</td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        <div className="font-semibold">{t.FullName || t.Username}</div>
                        <div className="text-xs text-gray-500">{t.Phone}</div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        {t.MovieTitle ? (
                            <div className="font-bold text-gray-800 dark:text-white mb-1">{t.MovieTitle}</div>
                        ) : (
                            <div className="text-blue-600 font-bold mb-1 italic">Dịch vụ lẻ</div>
                        )}
                        
                        {t.snacks && t.snacks.length > 0 && (
                            <div className="mt-1 text-[11px] leading-tight text-gray-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-100 dark:border-orange-800 shadow-sm">
                                {t.snacks.map((snack, idx) => (
                                    <div key={idx} className="flex justify-between gap-2">
                                        <span>• {snack.Name}</span>
                                        <span className="font-bold text-red-600">x{snack.Quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        {t.StartTime ? (
                            <>
                                <div>{new Date(t.StartTime.endsWith('Z') ? t.StartTime : t.StartTime + 'Z').toLocaleDateString('vi-VN')}</div>
                                <div className="text-xs text-gray-500 font-bold">{new Date(t.StartTime.endsWith('Z') ? t.StartTime : t.StartTime + 'Z').toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                                <div className="text-xs text-gray-400">{t.RoomName}</div>
                            </>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-bold text-red-600">
                        {/* 🔥 HIỂN THỊ TẤT CẢ GHẾ ĐÃ GOM NHÓM */}
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {t.seats && t.seats.length > 0 ? t.seats.map((s, idx) => (
                            <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm">
                              {s.name}
                            </span>
                          )) : <span className="text-gray-400 text-xs italic">Dịch vụ lẻ</span>}
                        </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        {/* 🔥 ĐÚNG CỘT TRẠNG THÁI */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${statusColor}`}>
                            {displayStatus}
                        </span>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-medium">
                        {/* 🔥 ĐÚNG CỘT GIÁ VÉ */}
                        <div className="flex flex-col">
                            <span className="text-red-600 font-bold">{Math.round(finalTotal).toLocaleString()}đ</span>
                            {t.totalDiscount > 0 && (
                              <span className="text-[9px] text-green-600 font-black italic bg-green-50 px-1 rounded w-fit">-{Number(t.totalDiscount).toLocaleString()}đ</span>
                            )}
                        </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        {/* 🔥 ĐÚNG CỘT GHI CHÚ */}
                        {t.AdminNote && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic max-w-[200px] whitespace-normal">{t.AdminNote}</p>
                        )}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => triggerDelete(t.TicketID, bookingCode)}
                                className="text-red-600 hover:text-red-900 font-medium text-xs hover:underline"
                            >
                                Xóa lịch sử
                            </button>
                        </div>
                        {t.Status === 'Đã đặt' && (
                            <button 
                                onClick={() => handleUpdateStatus(t.ticketIds)}
                                className="text-blue-600 hover:text-blue-900 font-bold text-xs uppercase border border-blue-600 px-2 py-1 rounded mt-2"
                            >
                                Trả vé cho khách
                            </button>
                        )}
                    </td>
                </tr>
               )
             })}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Xóa vé đặt"
        message={`Bạn có chắc chắn muốn xóa vé #${confirmModal.bookingCode}? Dữ liệu này sẽ biến mất vĩnh viễn.`}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default AdminTicketsPage;