import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filter, setFilter] = useState('ALL'); // State cho bộ lọc
  const [ratingModal, setRatingModal] = useState({ 
    isOpen: false, 
    MovieID: null, 
    movieTitle: '',
    rating: 5,
    comment: ''
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    ticketIds: []
  });
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    ticketIds: [],
    reason: '',
    bankName: '',
    bankAccountNumber: ''
  });
  const { user, notify } = useAuth();

  // Hàm chuẩn hóa thời gian: Ép kiểu UTC để trình duyệt tự cộng 7 tiếng (GMT+7)
  const parseUTC = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets/my-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        // Nhóm các vé có cùng ShowtimeID và BookingTime lại để hiển thị 1 thẻ duy nhất
        const grouped = groupTickets(data.data);
        setTickets(grouped);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  // Thiết lập bộ đếm thời gian để cập nhật trạng thái vé mỗi 30 giây (Realtime)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); 
    return () => clearInterval(timer);
  }, []);

  // Hàm gom nhóm vé
  const groupTickets = (rawTickets) => {
    const groups = {};
    rawTickets.forEach(t => {
      const d = new Date(t.BookingTime.endsWith('Z') ? t.BookingTime : t.BookingTime + 'Z'); 
      // Fix: Không dùng toISOString() vì nó chuyển về múi giờ UTC gây lệch 7 tiếng.
      // Lấy các thành phần thời gian địa phương để tạo key gom nhóm chính xác theo từng phút.
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const date = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const timeKey = `${year}-${month}-${date} ${hours}:${minutes}`;

      const key = `${t.ShowtimeID}_${timeKey}`;
      if (!groups[key]) {
        groups[key] = { ...t, seats: [], ticketIds: [], snacks: [] };
      }
      // Chỉ thêm ghế nếu có dữ liệu thực tế
      if (t.SeatRow && t.SeatNumber) {
        groups[key].seats.push({
          name: `${t.SeatRow}${t.SeatNumber}`,
          type: t.SeatType
        });
      }
      groups[key].ticketIds.push(t.TicketID); // Lưu thêm danh sách TicketID để xóa
      // Nếu bản ghi vé này có chứa thông tin bắp nước, đưa vào nhóm
      if (t.Snacks && t.Snacks.length > 0) {
        groups[key].snacks = t.Snacks;
      }
      // Cộng dồn tiền giảm giá (thường chỉ có ở 1 vé trong nhóm nhưng cứ cộng cho chắc)
      groups[key].totalDiscount = (groups[key].totalDiscount || 0) + (Number(t.DiscountAmount) || 0);
    });
    return Object.values(groups).sort((a, b) => new Date(b.BookingTime) - new Date(a.BookingTime));
  };

  // Hàm lấy trạng thái vé (dùng chung cho việc render và lọc)
  const getTicketStatus = (ticket) => {
    if (ticket.Status === 'Cancelled') return 'CANCELLED';
    if (!ticket.StartTime) return 'SNACKS'; // Trạng thái riêng cho mua lẻ bắp nước

    const now = currentTime;
    const startTime = new Date(ticket.StartTime.endsWith('Z') ? ticket.StartTime : ticket.StartTime + 'Z').getTime();
    const durationVal = parseInt(ticket.Duration, 10);
    const duration = (durationVal && durationVal > 0) ? durationVal : 120;
    const endTime = startTime + (duration * 60 * 1000);

    if (now < startTime) return 'UPCOMING';
    if (now >= startTime && now <= endTime) return 'ONGOING';
    return 'ENDED';
  };

  // Xử lý xóa vé
  const handleDelete = async () => {
    const { ticketIds } = deleteModal;
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
        toast.success("Đã xóa vé khỏi lịch sử");
        // Cập nhật lại danh sách local bằng cách lọc bỏ vé vừa xóa
        setTickets(prev => prev.filter(t => !t.ticketIds.some(id => ticketIds.includes(id))));
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Lỗi kết nối server");
    } finally {
      setDeleteModal({ isOpen: false, ticketIds: [] });
    }
  };

  // Xử lý hủy vé
  const handleCancel = async () => {
    const { ticketIds, reason, bankName, bankAccountNumber } = cancelModal;

    if (!reason.trim()) return toast.warning("Vui lòng nhập lý do hủy vé.");
    if (!bankName.trim() || !bankAccountNumber.trim()) {
      return toast.warning("Vui lòng nhập đầy đủ thông tin ngân hàng để nhận tiền hoàn.");
    }

    try {
      const res = await fetch('/api/tickets/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ 
          ticketIds, 
          reason, 
          bankName, 
          bankAccountNumber 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        await fetchTickets(); // Tải lại để cập nhật trạng thái
      } else {
        toast.error(data.message);
      }
    } catch (err) { toast.error("Lỗi kết nối server"); }
    finally { 
      setCancelModal({ isOpen: false, ticketIds: [], reason: '', bankName: '', bankAccountNumber: '' }); 
    }
  };

  const openCancelModal = (ticket) => {
    setCancelModal({
      isOpen: true,
      ticketIds: ticket.ticketIds,
      reason: '',
      bankName: user?.BankName || '',
      bankAccountNumber: user?.BankAccountNumber || ''
    });
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
          MovieID: ratingModal.MovieID,
          Rating: ratingModal.rating,
          Comment: ratingModal.comment
        })
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message);
        // Đóng modal và reset dữ liệu modal
        setRatingModal(prev => ({ ...prev, isOpen: false, comment: '', rating: 5 }));
        // Làm mới danh sách vé để cập nhật trạng thái nút "Xem chi tiết"
        await fetchTickets();
      } else {
        toast.error(data.message || "Không thể gửi đánh giá lúc này");
      }
    } catch (e) { 
      console.error("Submit review error:", e);
      toast.error("Đã xảy ra lỗi khi gửi đánh giá. Vui lòng thử lại."); 
    }
  };

  // Lọc danh sách vé theo tab đang chọn
  const filteredTickets = tickets.filter(t => {
    if (filter === 'ALL') return true;
    const status = getTicketStatus(t);
    if (filter === 'UPCOMING') return status === 'UPCOMING' || status === 'SNACKS';
    return status === filter;
  });

  if (loading) return <div className="text-center p-10">Đang tải vé của bạn...</div>;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold border-l-4 border-red-600 pl-4">Vé Của Tôi</h1>
        
        {/* Bộ lọc Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto max-w-full">
          {[
            { label: 'Tất cả', value: 'ALL' },
            { label: 'Sắp chiếu', value: 'UPCOMING' },
            { label: 'Đang diễn ra', value: 'ONGOING' },
            { label: 'Đã xem', value: 'ENDED' },
            { label: 'Đã hủy', value: 'CANCELLED' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                filter === tab.value 
                ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">Không tìm thấy vé nào phù hợp.</p>
          <Link to="/movies" className="text-red-600 hover:underline font-semibold">Đặt vé ngay</Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredTickets.map((ticket, index) => {
             const status = getTicketStatus(ticket);
             
             let statusBadge;
             if (status === 'CANCELLED') {
                 statusBadge = <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">Đã hủy</span>;
             } else if (status === 'COLLECTED') {
                 statusBadge = <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">Đã lấy vé</span>;
             } else if (status === 'SNACKS') {
                 statusBadge = <span className="l text-sm font-semibold"></span>;
             } else if (status === 'UPCOMING') {
                 statusBadge = <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Sắp chiếu</span>;
             } else if (status === 'ONGOING') {
                 statusBadge = <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold animate-pulse">Đang diễn ra</span>;
             } else {
                 statusBadge = <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-semibold">Kết thúc</span>;
             }

             // 1. Tách riêng trạng thái nhận vé (Đã lấy hay chưa)
             let collectionBadge = null; // Khởi tạo collectionBadge
             if (ticket.Status === 'Đã lấy vé') {
                collectionBadge = <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm uppercase tracking-tighter">Đã nhận</span>;
             } else if (status !== 'CANCELLED') {
                const text = status === 'SNACKS' ? 'Chưa nhận đồ' : 'Chưa lấy vé';
                collectionBadge = <span className="px-3 py-1 bg-white/95 text-blue-600 border border-blue-200 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-tighter"> {text}</span>;
             }

             // Tính tổng tiền của nhóm vé
             const ticketsTotal = ticket.seats.reduce((sum, seatObj) => {
               const basePrice = Number(ticket.Price) || 50000;
               const vipPrice = Number(ticket.PriceVIP) || (basePrice + 20000);
               const doublePrice = Number(ticket.PriceDouble) || (basePrice * 2);

               if (seatObj.type === 'VIP') return sum + vipPrice;
               if (seatObj.type === 'Double') return sum + doublePrice;
               return sum + basePrice;
             }, 0);

             const snacksTotal = ticket.snacks?.reduce((sum, s) => sum + (s.PriceAtBooking * s.Quantity), 0) || 0;
             const totalGroupPrice = ticketsTotal + snacksTotal - (ticket.totalDiscount || 0);

             // Tạo mã vé giả lập ngẫu nhiên (dựa trên 6 số cuối của timestamp thời gian đặt + ID vé)
             const bookingCode = `${new Date(ticket.BookingTime.endsWith('Z') ? ticket.BookingTime : ticket.BookingTime + 'Z').getTime().toString().slice(-6)}${ticket.TicketID}`;

             // Tạo nội dung vé để đưa vào QR Code (Xuống dòng bằng %0A cho URL hoặc \n cho text)
             const qrDate = ticket.StartTime ? new Date(ticket.StartTime.endsWith('Z') ? ticket.StartTime : ticket.StartTime + 'Z') : null;
             const qrDisplayTime = qrDate ? qrDate.toLocaleString('vi-VN') : 'N/A';

             const qrContent = `VÉ XEM PHIM & COMBO\n
-------------------------
Phim: ${ticket.Title}
Rạp: ${ticket.RoomName}
Ghế: ${ticket.seats.map(s => s.name).join(', ')}
${ticket.snacks?.length > 0 ? `Bắp nước: ${ticket.snacks.map(s => `${s.Name} x${s.Quantity}`).join(', ')}\n` : ''}
Suất chiếu: ${qrDisplayTime}
Khách hàng: ${user.FullName || user.Username}
-------------------------
Mã Đặt Vé: ${bookingCode}`;
             
             // Logic hiển thị nút xóa
             const canDelete = user.Role === 'Admin' || (user.Role !== 'Admin' && ['ENDED', 'CANCELLED', 'SNACKS'].includes(status));

             // Logic hiển thị nút hủy (Trước 3 ngày = 72 tiếng)
             const startTimeMs = ticket.StartTime ? new Date(ticket.StartTime.endsWith('Z') ? ticket.StartTime : ticket.StartTime + 'Z').getTime() : 0;
             let canCancel = false;
             if (status === 'SNACKS') { // Đơn hàng chỉ có bắp nước
                 canCancel = true;
             } else if (status === 'UPCOMING' && ticket.StartTime) { // Vé phim sắp chiếu
                 const diffInHours = (startTimeMs - currentTime) / (1000 * 60 * 60);
                 canCancel = diffInHours >= 72;
             }

             return (
              <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row border border-gray-200 hover:shadow-lg transition-shadow">
                {/* Poster phim */}
                <div className="w-full md:w-48 h-64 md:h-auto flex-shrink-0 relative">
                  <img 
                    src={ticket.Poster || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'} 
                    alt={ticket.Title} 
                    className="w-full h-full object-cover" 
                  />
                  {/* Hiển thị cả 2 badge riêng biệt */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
                    {statusBadge}
                    {collectionBadge}
                  </div>
                  
                  {/* Nút Xóa */}
                  {canDelete && (
                    <button 
                        onClick={() => setDeleteModal({ isOpen: true, ticketIds: ticket.ticketIds })}
                        className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                        title="Xóa khỏi lịch sử"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                  )}
                </div>

                {/* Thông tin vé */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{ticket.ShowtimeID ? ticket.Title : "Hóa đơn Bắp & Nước"}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 mb-4">
                      <p><span className="font-semibold">Phòng:</span> {ticket.RoomName || "Quầy dịch vụ (Snack Bar)"}</p>
                      {ticket.StartTime ? (
                        <>
                          <p><span className="font-semibold">Thời lượng:</span> {ticket.Duration} phút</p>
                          <p><span className="font-semibold">Ngày chiếu:</span> {new Date(ticket.StartTime.endsWith('Z') ? ticket.StartTime : ticket.StartTime + 'Z').toLocaleDateString('vi-VN')}</p>
                          <p><span className="font-semibold">Giờ chiếu:</span> {new Date(ticket.StartTime.endsWith('Z') ? ticket.StartTime : ticket.StartTime + 'Z').toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
                        </>
                      ) : (
                        <p className="col-span-2 text-blue-600 font-bold italic">Vé không kèm suất chiếu - Đổi đồ tại quầy</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                          {ticket.seats.length > 0 ? (
                            <>
                              <p className="text-sm text-gray-500 mb-1">Ghế đã đặt ({ticket.seats.length}):</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {ticket.seats.map((s, sIdx) => (
                                  <span key={sIdx} className={`${s.type === 'VIP' ? 'bg-yellow-500' : s.type === 'Double' ? 'bg-pink-500' : 'bg-red-600'} text-white px-2 py-1 rounded text-sm font-bold flex items-center gap-1`}>
                                    {s.name}
                                    {s.type !== 'Standard' && <span className="text-[8px] opacity-80">({s.type})</span>}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <span className="text-xl">🍿</span>
                                <span className="font-bold text-sm">Dịch vụ ăn uống</span>
                            </div>
                          )}

                          {/* Hiển thị Bắp & Nước nếu có */}
                          {ticket.snacks && ticket.snacks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-500 mb-1 font-semibold">🍿 Bắp & Nước đi kèm:</p>
                              <div className="space-y-1">
                                {ticket.snacks.map((snack, sIdx) => (
                                  <div key={sIdx} className="flex justify-between text-xs text-gray-700 italic">
                                    <span>{snack.Name} (x{snack.Quantity})</span>
                                    <span className="font-bold">{(snack.PriceAtBooking * snack.Quantity).toLocaleString()} đ</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm">Tổng tiền: <span className="font-bold text-red-600 text-lg">{totalGroupPrice.toLocaleString()} đ</span></p>
                            {canCancel && (
                                <button 
                                  onClick={() => openCancelModal(ticket)}
                                  className="px-3 py-1 bg-white border border-red-500 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                                >
                                  Hủy Vé
                                </button>
                            )}
                          </div>
                          
                          {status === 'ENDED' && (
                            ticket.IsReviewed && ticket.MovieID ? ( // Chỉ hiện đã đánh giá nếu có MovieID
                              <div className="mt-4 flex flex-col gap-2">
                                <p className="text-sm text-green-600 font-bold text-center flex items-center justify-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Bạn đã đánh giá phim rồi
                                </p>
                                <Link 
                                  to={`/movies/${ticket.MovieID}#reviews`} 
                                  className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-gray-300 shadow-sm"
                                >
                                  Xem chi tiết
                                </Link>
                              </div>
                            ) : (
                              ticket.MovieID && <button // Chỉ hiện nút đánh giá nếu có MovieID
                                onClick={() => setRatingModal({ ...ratingModal, isOpen: true, MovieID: ticket.MovieID, movieTitle: ticket.Title, comment: '' })}
                                className="mt-4 w-full py-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                              >
                                ⭐ Đánh giá phim này
                              </button>
                            )
                          )}
                        </div>

                        {/* QR Code đối soát vé */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white border p-2 rounded-lg">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrContent)}`} 
                                alt="QR Check-in" 
                                className="w-20 h-20 md:w-24 md:h-24 mix-blend-multiply"
                            />
                            <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">Quét vào rạp</span>
                        </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                    <p>Ngày đặt: {new Date(ticket.BookingTime.endsWith('Z') ? ticket.BookingTime : ticket.BookingTime + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Mã Đặt Vé: #{bookingCode} (Gộp {ticket.seats.length} vé)</p>
                  </div>
                </div>
              </div>
             );
          })}
        </div>
      )}

      {/* Modal Đánh giá */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Đánh giá phim: {ratingModal.movieTitle}</h3>
            <div className="flex gap-2 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRatingModal({...ratingModal, rating: star})}
                  className={`text-3xl ${star <= ratingModal.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >★</button>
              ))}
            </div>
            <textarea 
              className="w-full border rounded-xl p-3 mb-4 dark:bg-gray-700 dark:border-gray-600"
              rows="3"
              placeholder="Cảm nhận của bạn về phim..."
              value={ratingModal.comment}
              onChange={e => setRatingModal({...ratingModal, comment: e.target.value})}
            ></textarea>
            <div className="flex gap-3">
              <button 
                onClick={() => setRatingModal({...ratingModal, isOpen: false})}
                className="flex-1 py-2 rounded-xl border font-semibold"
              >Hủy</button>
              <button 
                onClick={submitReview}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >Gửi đánh giá</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Vé với Form nhập liệu */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-4 uppercase">Yêu Cầu Hủy Vé</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1 tracking-wider">Lý do hủy vé</label>
                  <textarea 
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-red-500 transition-all"
                    rows="2"
                    placeholder="Lý do bạn muốn hủy đơn hàng này..."
                    value={cancelModal.reason}
                    onChange={e => setCancelModal({...cancelModal, reason: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1 tracking-wider">Tên ngân hàng</label>
                    <input 
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-red-500 transition-all"
                      placeholder="VD: Vietcombank, MB Bank..."
                      value={cancelModal.bankName}
                      onChange={e => setCancelModal({...cancelModal, bankName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1 tracking-wider">Số tài khoản nhận hoàn tiền</label>
                    <input 
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 font-mono outline-none focus:border-red-500 transition-all"
                      placeholder="Nhập số tài khoản của bạn"
                      value={cancelModal.bankAccountNumber}
                      onChange={e => setCancelModal({...cancelModal, bankAccountNumber: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[10px] text-gray-400 italic text-center">
                * Tiền vé sẽ được hoàn trả theo chính sách của rạp trong vòng 3-5 ngày làm việc.
              </p>
            </div>

            <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/50">
              <button onClick={() => setCancelModal({ isOpen: false, ticketIds: [] })} className="flex-1 py-2.5 text-sm font-semibold border border-gray-300 bg-white rounded-xl hover:bg-gray-100 transition-colors">Đóng</button>
              <button onClick={handleCancel} className="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all">Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa lịch sử vé"
        message="Bạn có chắc chắn muốn xóa lịch sử đặt vé này không? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onClose={() => setDeleteModal({ isOpen: false, ticketIds: [] })}
      />
    </div>
  );
};

export default MyTicketsPage;