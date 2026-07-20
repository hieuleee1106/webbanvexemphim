import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { io } from 'socket.io-client';

const BookingPage = () => {
  const { showtimeId } = useParams();
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [snacks, setSnacks] = useState([]);
  const [selectedSnacks, setSelectedSnacks] = useState({}); // { snackId: quantity }
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Kết nối Socket.IO
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    // Tham gia vào phòng của lịch chiếu này
    newSocket.emit("join_room", showtimeId);

    // Lắng nghe sự kiện cần cập nhật lại ghế từ server
    newSocket.on("update_seat_status", () => {
      fetchData(); // Gọi lại API để lấy danh sách ghế mới nhất
      notify.info("Dữ liệu ghế vừa được cập nhật!");
    });

    return () => newSocket.disconnect();
  }, [showtimeId]);

  useEffect(() => {
    if (!user) {
      notify.warning("Vui lòng đăng nhập để đặt vé!");
      navigate('/login', { state: { from: location } });
      return;
    }
    fetchData();
  }, [showtimeId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Lấy thông tin lịch chiếu (để biết RoomID và Phim)
      const stRes = await fetch(`/api/showtimes/${showtimeId}`);
      const stData = await stRes.json();
      if (!stData.success) throw new Error("Không tìm thấy lịch chiếu");
      
      let showtimeInfo = stData.data;

      // FIX: Nếu Backend chưa trả về tên Phim/Phòng, gọi thêm API để lấy chi tiết
      if (!showtimeInfo.Title || !showtimeInfo.RoomName) {
        try {
           const [movieRes, roomRes] = await Promise.all([
              fetch(`/api/movies/${showtimeInfo.MovieID}`),
              fetch(`/api/rooms/${showtimeInfo.RoomID}`)
           ]);

           if (movieRes.ok) {
              const mData = await movieRes.json();
              if (mData.success) showtimeInfo = { ...showtimeInfo, ...mData.data };
           }
           if (roomRes.ok) {
              const rData = await roomRes.json();
              if (rData.success) showtimeInfo.RoomName = rData.data.RoomName;
           }
        } catch (e) { console.warn("Lỗi lấy thông tin bổ sung:", e); }
      }
      setShowtime(showtimeInfo);

      // 2. Lấy danh sách ghế của phòng đó
      const seatsRes = await fetch(`/api/seats/room/${showtimeInfo.RoomID}`);
      const seatsData = await seatsRes.json();
      setSeats(seatsData.data);

      // 3. Lấy danh sách ghế ĐÃ ĐẶT của lịch chiếu này
      const bookedRes = await fetch(`/api/tickets/booked/${showtimeId}`);
      const bookedData = await bookedRes.json();
      setBookedSeats(bookedData.data); // Mảng các SeatID [1, 5, 10...]

      // 4. Lấy danh sách đồ ăn
      const snacksRes = await fetch('/api/snacks');
      const snacksData = await snacksRes.json();
      if (snacksData.success) setSnacks(snacksData.data);

    } catch (err) {
      console.error(err);
      notify.error("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (bookedSeats.includes(seat.SeatID)) return; // Ghế đã đặt

    if (selectedSeats.includes(seat.SeatID)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seat.SeatID));
    } else {
      setSelectedSeats([...selectedSeats, seat.SeatID]);
    }
  };

  const handleUpdateSnack = (snackId, delta) => {
    setSelectedSnacks(prev => {
      const currentQty = prev[snackId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const { [snackId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [snackId]: newQty };
    });
  };

  const handleBooking = async () => {
    // Kiểm tra phải chọn ít nhất 1 ghế hoặc 1 món bắp nước
    if (selectedSeats.length === 0 && Object.keys(selectedSnacks).length === 0) {
      return notify.warning("Vui lòng chọn ít nhất 1 ghế hoặc bắp nước!");
    }
    
    const seatsTotal = selectedSeats.reduce((sum, seatId) => {
      const seat = seats.find(s => s.SeatID === seatId);
      if (!seat) return sum;
      if (seat.SeatType === 'VIP') return sum + (Number(showtime.PriceVIP) || Number(showtime.Price) + 20000);
      if (seat.SeatType === 'Double') return sum + (Number(showtime.PriceDouble) || Number(showtime.Price) * 2);
      return sum + Number(showtime.Price);
    }, 0);

    // Chuẩn bị danh sách đồ ăn đã chọn để gửi đi
    const snackDetails = snacks
      .filter(s => selectedSnacks[s.SnackID] > 0)
      .map(s => ({ ...s, Quantity: selectedSnacks[s.SnackID] }));

    // Lấy thông tin chi tiết của các ghế đã chọn (để hiển thị tên ghế bên trang thanh toán)
    const selectedSeatDetails = seats.filter(seat => selectedSeats.includes(seat.SeatID));

    // Chuyển hướng sang trang PaymentPage và mang theo dữ liệu
    navigate('/payment', { 
      state: { 
        showtime, 
        selectedSeats: selectedSeatDetails, // Gửi danh sách object ghế đầy đủ (bao gồm Row, Number)
        seatIds: selectedSeats, // Danh sách ID ghế để gửi API
        initialTotalPrice: seatsTotal,
        selectedSnacks: snackDetails
      } 
    });
  };

  // Kiểm tra nếu suất chiếu đã qua giờ
  // So sánh timestamp để chính xác tuyệt đối, cho phép trễ 10 phút
  const showtimeDate = showtime?.StartTime ? new Date(showtime.StartTime.endsWith('Z') ? showtime.StartTime : showtime.StartTime + 'Z') : null;
  const isExpired = showtimeDate && showtimeDate.getTime() < (Date.now() - 10 * 60 * 1000);

  if (loading) return <div className="text-center p-10">Đang tải phòng vé...</div>;
  if (!showtime) return <div className="text-center p-10">Lỗi dữ liệu.</div>;

  // Tính tổng tiền (Giả sử giá vé cố định 50k - bạn có thể thêm field Price vào Showtimes)
  const seatsTotal = selectedSeats.reduce((sum, seatId) => {
    const seat = seats.find(s => s.SeatID === seatId);
    if (!seat) return sum;
    if (seat.SeatType === 'VIP') return sum + (Number(showtime.PriceVIP) || Number(showtime.Price) + 20000);
    if (seat.SeatType === 'Double') return sum + (Number(showtime.PriceDouble) || Number(showtime.Price) * 2);
    return sum + Number(showtime.Price);
  }, 0);

  const ticketPrice = Number(showtime.Price) || 50000;
  const snacksTotal = snacks.reduce((sum, s) => sum + (s.Price * (selectedSnacks[s.SnackID] || 0)), 0);
  const totalPrice = seatsTotal + snacksTotal;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-2">Đặt Vé: {showtime.Title || showtime.MovieTitle || "Phim"}</h1>
      <p className="text-center text-gray-600 mb-8">
        Phòng: {showtime.RoomName} - Giờ chiếu: {showtimeDate?.toLocaleString('vi-VN')} <br/>
        <span className="font-bold text-red-600">Giá vé: {ticketPrice.toLocaleString()} đ/vé</span>
      </p>

      {isExpired ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 text-center" role="alert">
          <p className="font-bold">Đã hết giờ đặt vé!</p>
          <p>Suất chiếu này đã bắt đầu hoặc kết thúc. Vui lòng chọn suất chiếu khác.</p>
        </div>
      ) : (
      <>
      {/* Màn hình */}
      <div className="w-full bg-gray-300 h-4 mb-10 rounded-lg shadow-inner text-center text-xs pt-0.5 text-gray-500">MÀN HÌNH</div>

      {/* Lưới ghế */}
      <div className="flex justify-center mb-8">
        <div className="flex flex-col gap-3 max-w-4xl mx-auto bg-black/5 p-6 rounded-3xl overflow-x-auto">
          {[...new Set(seats.map(s => s.SeatRow))].sort().map(rowLabel => (
            <div key={rowLabel} className="flex items-center gap-3">
              <div className="w-5 text-gray-400 font-bold text-[10px]">{rowLabel}</div>
              <div className="grid grid-cols-12 gap-3 flex-1 justify-items-center">
                {seats.filter(s => s.SeatRow === rowLabel).map(seat => {
                  const isBooked = bookedSeats.includes(seat.SeatID);
                  const isSelected = selectedSeats.includes(seat.SeatID);
                  let seatClass = "h-10 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all shadow-sm border ";
                  
                  if (isBooked) {
                      seatClass += "bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed"; 
                  } else if (isSelected) {
                      seatClass += "bg-green-600 text-white border-green-700 shadow-lg transform scale-110 z-10"; 
                  } else {
                      if (seat.SeatType === 'VIP') seatClass += "bg-yellow-500 text-white border-yellow-600 hover:brightness-110";
                      else if (seat.SeatType === 'Double') seatClass += "bg-pink-500 text-white border-pink-600 hover:brightness-110";
                      else seatClass += "bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50";
                  }

                  return (
                    <div 
                      key={seat.SeatID} 
                      className={`${seatClass} ${seat.SeatType === 'Double' ? 'col-span-2 w-full max-w-[92px]' : 'w-10'}`}
                      onClick={() => handleSeatClick(seat)}
                    >
                      {seat.SeatNumber}
                    </div>
                  );
                })}
              </div>
              <div className="w-5 text-gray-400 font-bold text-[10px] text-right">{rowLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chú thích */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 text-xs font-bold uppercase">
          <div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-gray-300 rounded"></div> Thường</div>
          <div className="flex items-center gap-2"><div className="w-5 h-5 bg-yellow-500 rounded"></div> VIP</div>
          <div className="flex items-center gap-2"><div className="w-5 h-5 bg-pink-500 rounded"></div> Ghế Đôi</div>
          <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 rounded"></div> Đang chọn</div>
          <div className="flex items-center gap-2"><div className="w-5 h-5 bg-gray-400 rounded"></div> Đã đặt</div>
      </div>

      {/* Chọn đồ ăn */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border-t-4 border-blue-500">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🍿</span> Chọn Bắp & Nước
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {snacks.map(snack => (
              <div key={snack.SnackID} className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={snack.Image || 'https://via.placeholder.com/50'} alt={snack.Name} className="w-12 h-12 object-cover rounded-lg" />
                  <div>
                    <p className="font-bold text-gray-800">{snack.Name}</p>
                    <p className="text-xs text-red-600 font-bold">{Number(snack.Price).toLocaleString()} đ</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-full">
                  <button 
                    onClick={() => handleUpdateSnack(snack.SnackID, -1)}
                    className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm hover:text-red-500 font-bold"
                  >-</button>
                  <span className="w-4 text-center font-bold">{selectedSnacks[snack.SnackID] || 0}</span>
                  <button 
                    onClick={() => handleUpdateSnack(snack.SnackID, 1)}
                    className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm hover:text-green-500 font-bold"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Thanh toán */}
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-red-500 flex flex-col md:flex-row justify-between items-center">
          <div>
              <p className="text-lg">Ghế chọn: <span className="font-bold">{selectedSeats.length}</span></p>
              <p className="text-2xl font-bold text-red-600">Tổng cộng: {totalPrice.toLocaleString()} đ</p>
          </div>
          <Button 
            onClick={handleBooking}
            disabled={selectedSeats.length === 0 && Object.keys(selectedSnacks).length === 0}
            className="mt-4 md:mt-0 disabled:opacity-50 disabled:cursor-not-allowed text-xl"
          >
            Tiếp Tục
          </Button>
      </div>
      </>
      )}
    </div>
  );
};

export default BookingPage;
