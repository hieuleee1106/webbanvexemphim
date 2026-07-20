import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const NewsPage = () => {
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchVouchers = async () => {
    try {
      const res = await fetch('/api/vouchers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPublicVouchers(data.publicVouchers || []);
        setMyVouchers(data.myVouchers || []);
      }
    } catch (error) {
      console.error("Lỗi tải voucher:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleClaimVoucher = async (id, code) => {
    try {
      const res = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` },
        body: JSON.stringify({ voucherId: id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã nhặt mã ${code}! Kiểm tra trong Kho Voucher của bạn.`);
        fetchVouchers(); // Cập nhật lại danh sách mà không cần load lại trang
      } else { toast.error(data.message); }
    } catch (error) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Banner Khuyến Mãi */}
      <div className="bg-red-700 text-white py-12 md:py-16 mb-10 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black italic mb-4 uppercase tracking-tighter">TIN TỨC & ƯU ĐÃI</h1>
          <p className="text-red-100 text-lg max-w-xl font-medium">
            Đừng bỏ lỡ các chương trình khuyến mãi cực hot và những mã giảm giá độc quyền dành riêng cho thành viên CinemaDB.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-16">
        
        {/* PHẦN 1: ƯU ĐÃI MỚI NHẤT (VOUCHER CÔNG KHAI) */}
        <section>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 text-gray-800">
            <span className="w-2 h-8 bg-red-600 rounded-full"></span>
            Ưu đãi mới nhất
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicVouchers.map((v) => (
              <div key={v.VoucherID} className="bg-white rounded-2xl shadow-md overflow-hidden flex border border-red-50">
                <div className="bg-red-600 text-white w-32 flex flex-col items-center justify-center p-4 border-r-2 border-dashed border-white/30">
                  <div className="text-3xl font-black">
                    {v.DiscountPercent ? `${v.DiscountPercent}%` : `${(Number(v.DiscountAmount) / 1000)}k`}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-tighter opacity-80">Giảm giá</div>
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-gray-800 text-xl">{v.Code}</h3>
                    <p className="text-xs text-gray-500 mt-1">Đơn tối thiểu: {Number(v.MinOrderValue).toLocaleString()}đ</p>
                  </div>
                  <button 
                    disabled={v.AlreadyClaimed}
                    onClick={() => handleClaimVoucher(v.VoucherID, v.Code)}
                    className={`mt-4 w-full py-2 text-xs font-bold rounded-lg transition-colors uppercase tracking-widest ${
                      v.AlreadyClaimed 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-red-600'
                    }`}
                  >
                    {v.AlreadyClaimed ? 'Đã trong kho' : 'Nhận mã ngay'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PHẦN 2: KHO VOUCHER CỦA TÔI */}
        <section className="bg-red-50/50 p-8 rounded-3xl border border-red-100 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 text-red-800">
            <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">🎁</span>
            Kho Voucher của bạn
          </h2>
          {myVouchers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic">Kho đang trống. Hãy nhặt mã ở trên hoặc thử vận may tại Vòng quay!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {myVouchers.map((v) => (
                <div key={v.VoucherID} className="bg-white rounded-xl shadow-sm border-2 border-green-500 p-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 text-[10px] font-bold rounded-bl-lg">
                    x{v.UserQuantity} mã
                  </div>
                  <div className="text-2xl font-black text-green-600 mb-1">
                    {v.DiscountPercent ? `${v.DiscountPercent}%` : `${(Number(v.DiscountAmount) / 1000)}k`} OFF
                  </div>
                  <div className="text-sm font-bold text-gray-800 mb-3">{v.Code}</div>
                  <div className="text-[10px] text-gray-400">HSD: {new Date(v.ExpiryDate).toLocaleDateString('vi-VN')}</div>
                  <button 
                    onClick={() => navigate('/movies')}
                    className="mt-4 w-full py-2 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 uppercase"
                  >
                    Dùng ngay
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 text-center border-t border-red-100 pt-6">
            <Link to="/lucky-wheel" className="inline-flex items-center gap-2 text-red-600 font-bold hover:underline group">
              <span className="group-hover:animate-bounce">🎡</span> Muốn thêm mã? Thử vận may tại Vòng Quay!
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};

export default NewsPage;