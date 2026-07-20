import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { toast } from 'sonner';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Lấy dữ liệu được truyền từ trang BookingPage
  const { showtime, selectedSeats, seatIds, initialTotalPrice, selectedSnacks = [] } = location.state || {};

  const [paymentMethod, setPaymentMethod] = useState('ZaloPay');
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [showVoucherList, setShowVoucherList] = useState(false);

  // Nếu người dùng truy cập trực tiếp link này mà không qua đặt vé, đẩy về trang chủ
  useEffect(() => {
    if (!location.state || (!showtime && selectedSnacks.length === 0)) {
      navigate('/');
    } else {
      fetchAvailableVouchers();
    }
  }, [location, navigate]);

  const fetchAvailableVouchers = async () => {
    try {
      const res = await fetch('/api/vouchers', { // API này giờ trả về myVouchers
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const currentTotal = (Number(initialTotalPrice) || 0) + 
                             selectedSnacks.reduce((sum, s) => sum + (s.Price * s.Quantity), 0);

        // Chỉ lấy những mã người dùng ĐANG SỞ HỮU và đủ điều kiện đơn hàng
        const myValidVouchers = (data.myVouchers || []).filter(v => 
            v.UserQuantity > 0 && 
            currentTotal >= Number(v.MinOrderValue)
        );
        setAvailableVouchers(myValidVouchers);
      }
    } catch (e) { console.error("Lỗi fetch voucher:", e); }
  };

  if (!location.state) return null;

  const handleApplyVoucher = async () => {
    if (!voucherCode) {
      setDiscount(0);
      return;
    }
    await handleApplyVoucherLogic(voucherCode);
  };

  // Tách logic áp dụng voucher để tái sử dụng khi người dùng click chọn từ danh sách
  const handleApplyVoucherLogic = async (code) => {
    try {
      const res = await fetch('/api/vouchers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          // Sửa lỗi: orderValue phải bao gồm cả tiền vé và bắp nước
          orderValue: price + snacksTotal
        })
      });

      const data = await res.json();

      if (data.success) {
        const amt = Math.round(Number(data.discountAmount)) || 0;
        setDiscount(amt);
        toast.success(`Đã áp dụng mã: ${code.toUpperCase()} (-${amt.toLocaleString()}đ)`);
      } else {
        setDiscount(0);
        toast.error(data.message || 'Mã giảm giá không hợp lệ.');
      }
    } catch (err) {
      setDiscount(0);
      toast.error('Lỗi khi áp dụng mã giảm giá.');
    }
  };

  const selectVoucher = (code) => {
    setVoucherCode(code);
    setShowVoucherList(false);
    handleApplyVoucherLogic(code);
  };

  const price = Number(initialTotalPrice) || 0;
  const snacksTotal = selectedSnacks.reduce((sum, s) => sum + (s.Price * s.Quantity), 0);
  const finalTotal = Math.max(0, Math.round(price + snacksTotal - discount));

  const handleConfirmPayment = async () => {
    if (!user) return toast.error("Vui lòng đăng nhập lại");

    const totalToPay = Math.round(finalTotal);
    const isDirect = paymentMethod === 'Direct';

    if (paymentMethod === 'ATM') {
      return toast.info("Phương thức thanh toán này đang bảo trì. Vui lòng chọn phương thức khác.");
    }

    try {
      setLoading(true);
      
      let endpoint = '/api/payment/create'; // Mặc định ZaloPay
      if (isDirect) endpoint = '/api/payment/direct';
      // Kiểm tra nếu là các hình thức của MoMo
      if (paymentMethod.startsWith('MoMo')) endpoint = '/api/payment/momo';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ 
          UserID: user.UserID,
          ShowtimeID: showtime?.ShowtimeID || null, 
          SelectedSeats: seatIds || [],
          TotalAmount: totalToPay, 
          VoucherCode: discount > 0 ? voucherCode : null,
          SelectedSnacks: selectedSnacks.map(s => ({ SnackID: s.SnackID, Quantity: s.Quantity, Price: s.Price })),
          // Gửi requestType tương ứng cho MoMo
          requestType: paymentMethod === 'MoMoATM' ? 'payWithATM' : 
                       paymentMethod === 'MoMoCC' ? 'payWithCC' : 'captureWallet'
        })
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Giao dịch thất bại");
      }

      if (isDirect) {
        toast.success("Thanh toán thành công!");
        navigate('/my-tickets');
      } else if (data.order_url) {
        window.location.href = data.order_url;
        // Đặt loading = false sau 2s để đảm bảo UI mượt mà khi chuyển trang
        setTimeout(() => setLoading(false), 2000);
      } else {
        throw new Error("Không nhận được phản hồi từ hệ thống thanh toán");
      }

    } catch (err) {
      toast.error(err.message || "Đã xảy ra lỗi khi xử lý thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // Lấy tên các ghế để hiển thị (Ví dụ: A1, A2)
  // Cần tìm trong danh sách seats gốc hoặc xử lý từ component trước. 
  // Ở đây giả sử selectedSeats là mảng ID, ta hiển thị số lượng cho đơn giản hoặc cần truyền object ghế từ BookingPage.
  
  return (
    <div className="container mx-auto p-4 max-w-5xl py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Xác Nhận Thanh Toán</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cột trái: Phương thức thanh toán */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
              Phương thức thanh toán
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ZaloPay */}
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'ZaloPay' ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="ZaloPay" 
                  checked={paymentMethod === 'ZaloPay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute top-4 right-4 w-4 h-4 text-blue-600"
                />
                <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png" alt="ZaloPay" className="w-16 h-16 rounded-xl mb-3 object-contain shadow-sm"/>
                <span className="font-bold text-gray-700 text-sm">Ví ZaloPay</span>
                <span className="text-[10px] text-gray-400 mt-1">Giảm thêm qua app</span>
              </label>

              {/* MoMo QR */}
              {/* <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'MoMo' ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-200' : 'border-gray-100 hover:border-pink-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="MoMo" 
                  checked={paymentMethod === 'MoMo'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute top-4 right-4 w-4 h-4 text-pink-600"
                />
                <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Transparent.png" alt="MoMo" className="w-16 h-16 rounded-xl mb-3 object-contain shadow-sm"/>
                <span className="font-bold text-gray-700 text-sm">Ví MoMo QR</span>
                <span className="text-[10px] text-gray-400 mt-1">Nhanh chóng, tiện lợi</span>
              </label> */}

              {/* MoMo ATM */}
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'MoMoATM' ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-200' : 'border-gray-100 hover:border-pink-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="MoMoATM" 
                  checked={paymentMethod === 'MoMoATM'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute top-4 right-4 w-4 h-4 text-pink-600"
                />
                <div className="w-16 h-16 bg-pink-600 rounded-xl flex flex-col items-center justify-center text-white font-bold mb-3 shadow-md">
                  <span className="text-lg">ATM</span>
                  <span className="text-[8px] uppercase">Nội địa</span>
                </div>
                <span className="font-bold text-gray-700 text-sm text-center">Thẻ ATM nội địa</span>
                <span className="text-[10px] text-gray-400 mt-1 text-center">Cổng MoMo</span>
              </label>

              {/* MoMo CC */}
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'MoMoCC' ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-200' : 'border-gray-100 hover:border-pink-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="MoMoCC" 
                  checked={paymentMethod === 'MoMoCC'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute top-4 right-4 w-4 h-4 text-pink-600"
                />
                <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex flex-col items-center justify-center text-white font-bold mb-3 shadow-md border-b-4 border-pink-500">
                  <span className="text-lg italic">VISA</span>
                  <span className="text-[8px] uppercase opacity-80">MasterCard</span>
                </div>
                <span className="font-bold text-gray-700 text-sm text-center">Thẻ quốc tế</span>
                <span className="text-[10px] text-gray-400 mt-1 text-center">Visa / Master / JCB</span>
              </label>

              {/* Cash */}
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'Direct' ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-100 hover:border-red-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="Direct" 
                  checked={paymentMethod === 'Direct'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute top-4 right-4 w-4 h-4 text-red-600"
                />
                <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center text-white text-2xl mb-3 shadow-md">
                  💵
                </div>
                <span className="font-bold text-gray-700 text-sm">Tiền mặt</span>
                <span className="text-[10px] text-gray-400 mt-1">Tại quầy rạp</span>
              </label>

              {/* Maintenance */}
              <label className="relative flex flex-col items-center p-4 border-2 border-gray-100 rounded-2xl cursor-not-allowed opacity-50 grayscale">
                <input 
                  type="radio" 
                  name="payment" 
                  value="ATM" 
                  disabled
                  className="absolute top-4 right-4 w-4 h-4"
                />
                <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-inner">
                  🏦
                </div>
                <span className="font-bold text-gray-400 text-sm">Napas / ATM</span>
                <span className="text-[10px] text-red-500 mt-1 font-bold">Đang bảo trì</span>
              </label>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin đơn hàng */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden sticky top-24">
            <div className="bg-red-600 p-4 text-white text-center">
               <h2 className="text-lg font-black uppercase tracking-widest">Hóa đơn chi tiết</h2>
               <p className="text-[10px] opacity-80 uppercase font-bold">CinemaDB Entertainment</p>
            </div>
            <div className="p-6">
            {showtime ? (
              <div className="space-y-2 mb-4 text-sm text-gray-600 pb-4 border-b">
                  <p><span className="font-semibold">Phim:</span> {showtime.Title || showtime.MovieTitle || "Unknown"}</p>
                  <p><span className="font-semibold">Rạp:</span> {showtime.RoomName || "Phòng Chiếu"}</p>
                  <p><span className="font-semibold">Thời gian:</span> {showtime.StartTime ? new Date(showtime.StartTime.endsWith('Z') ? showtime.StartTime : showtime.StartTime + 'Z').toLocaleString('vi-VN') : "N/A"}</p>
                  <p>
                    <span className="font-semibold">Ghế:</span>{' '}
                    <span className="font-bold text-red-600 tracking-tighter">{selectedSeats?.map(s => `${s.SeatRow}${s.SeatNumber}`).join(", ") || ""}</span>
                  </p>
              </div>
            ) : (
              <div className="mb-4 pb-4 border-b text-sm text-blue-600 font-bold italic">
                Đơn hàng: Mua lẻ Bắp & Nước
              </div>
            )}

            {/* Snacks Summary */}
            {selectedSnacks.length > 0 && (
              <div className="mb-4 pb-4 border-b text-sm text-gray-600">
                <p className="font-semibold mb-1 text-gray-800">Đồ ăn & Nước uống:</p>
                {selectedSnacks.map(s => (
                  <div key={s.SnackID} className="flex justify-between">
                    <span>{s.Name} (x{s.Quantity})</span>
                    <span>{(s.Price * s.Quantity).toLocaleString()} đ</span>
                  </div>
                ))}
              </div>
            )}

            {/* Voucher */}
            <div className="mb-6">
                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Mã giảm giá</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        placeholder="Nhập mã (VD: CINEMA50)"
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm uppercase focus:outline-none focus:border-red-500"
                    />
                    <button onClick={handleApplyVoucher} className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-gray-700">Áp dụng</button>
                </div>

                {/* Danh sách Voucher khả dụng */}
                {availableVouchers.length > 0 && (
                  <div className="mt-2">
                    <button 
                      onClick={() => setShowVoucherList(!showVoucherList)}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                      {showVoucherList ? 'Thu gọn' : `Bạn có ${availableVouchers.length} mã ưu đãi khả dụng`}
                    </button>
                    
                    {showVoucherList && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide animate-fade-in">
                        {availableVouchers.map(v => (
                          <div 
                            key={v.VoucherID}
                            onClick={() => selectVoucher(v.Code)}
                            className="p-2 border border-dashed border-red-300 rounded-lg bg-red-50 cursor-pointer hover:bg-red-100 transition-colors flex justify-between items-center group"
                          >
                            <span className="text-xs font-bold text-red-700 group-hover:scale-105 transition-transform">{v.Code}</span>
                            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded italic">Giảm {v.DiscountPercent ? `${v.DiscountPercent}%` : `${parseInt(v.DiscountAmount).toLocaleString()}đ`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Tạm tính:</span>
                <span className="font-semibold">{Number(initialTotalPrice || 0).toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-green-600">
                <span className="text-sm">Giảm giá:</span>
                <span>- {discount.toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between items-center mb-6 pt-4 border-t border-dashed border-gray-300">
                <span className="text-lg font-black text-gray-800 uppercase tracking-tighter">Tổng tiền</span>
                <span className="text-3xl font-black text-red-600">{finalTotal.toLocaleString()}đ</span>
            </div>

            <div className="mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start gap-3">
               <span className="text-lg">🛡️</span>
               <div className="text-[10px] text-yellow-800 leading-tight">
                  <b>Thanh toán an toàn:</b> Mọi giao dịch đều được mã hóa SSL 256-bit. Vui lòng kiểm tra kỹ thông tin suất chiếu trước khi hoàn tất.
               </div>
            </div>
            </div>

            <Button 
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full py-3 text-lg"
            >
                {loading ? 'Đang xử lý...' : 'Thanh Toán Ngay'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;