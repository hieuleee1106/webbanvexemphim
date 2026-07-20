import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import Button from '../components/Button';

const LuckyWheelPage = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState(null);
  const [wheelVouchers, setWheelVouchers] = useState([]);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchWheelInfo();
  }, []);

  const fetchWheelInfo = async () => {
    try {
      const res = await fetch('/api/lucky-wheel/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setWheelVouchers(data.vouchers);
        setHasSpunToday(data.hasSpun);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu vòng quay");
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || hasSpunToday) return;
    
    try {
      const res = await fetch('/api/lucky-wheel/spin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        return toast.error(data.message);
      }

      setIsSpinning(true);
      // Tạo vòng quay ảo (quay ít nhất 5 vòng + góc ngẫu nhiên)
      const newRotation = rotation + 1800 + Math.floor(Math.random() * 360);
      setRotation(newRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setPrize(data.prize);
        setHasSpunToday(true);
        toast.success(data.message, { duration: 5000 });
      }, 4000); // Khớp với thời gian transition CSS

    } catch (error) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Đang chuẩn bị vòng quay...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-red-500 mb-2 italic">VÒNG QUAY MAY MẮN</h1>
        <div className="bg-red-600/20 px-4 py-2 rounded-full border border-red-500/30 inline-block mt-2">
          <span className="text-gray-300 uppercase tracking-tighter text-xs font-bold">Lượt quay hôm nay: </span>
          <span className="text-xl font-black text-white">{hasSpunToday ? "0" : "1"}</span>
        </div>
      </div>

      <div className="relative w-80 h-80 md:w-96 md:h-96">
        {/* Kim chỉ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-8 h-10 bg-yellow-500 clip-path-arrow shadow-lg"></div>
        </div>

        {/* Vòng quay */}
        <div 
          className="w-full h-full rounded-full border-8 border-yellow-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden relative transition-transform duration-[4000ms] ease-out"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            backgroundImage: 'conic-gradient(#ef4444 0deg 60deg, #1f2937 60deg 120deg, #ef4444 120deg 180deg, #1f2937 180deg 240deg, #ef4444 240deg 300deg, #1f2937 300deg 360deg)'
          }}
        >
          {/* Nội dung text trên vòng quay */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            // Lấy voucher theo vòng lặp nếu danh sách < 6
            const v = wheelVouchers && wheelVouchers.length > 0 
                      ? wheelVouchers[i % wheelVouchers.length] 
                      : null;
            return (
              <div 
                key={i} 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-xs md:text-sm text-center text-white"
                style={{ transform: `rotate(${(i * 60) + 30}deg) translateY(-120px)` }}
              >
                {v ? (
                  <>
                    <div className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                      {v.DiscountPercent ? `${v.DiscountPercent}%` : `${parseInt(v.DiscountAmount / 1000)}K`}
                    </div>
                    <div className="text-[8px] opacity-70 uppercase tracking-tighter">OFF</div>
                  </>
                ) : (
                  <div className="opacity-50 italic">QUÀ TẶNG</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nút bấm ở tâm */}
        <button 
          onClick={handleSpin}
          disabled={isSpinning || hasSpunToday}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-500 rounded-full border-4 border-white z-30 font-black text-gray-900 shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {hasSpunToday ? 'HẾT LƯỢT' : 'QUAY'}
        </button>
      </div>

      {prize && !isSpinning && (
        <div className="mt-10 p-6 bg-red-600/20 border border-red-500 rounded-2xl animate-fade-in text-center">
          <p className="text-sm uppercase font-bold text-red-400 mb-1">Phần quà của bạn:</p>
          <h3 className="text-3xl font-black text-white">{prize.Code}</h3>
          <p className="text-gray-300 text-xs mt-2 italic">Mã đã được tự động thêm vào kho Voucher của bạn.</p>
        </div>
      )}

      <div className="mt-12 text-gray-500 text-xs max-w-xs text-center">
        * Lưu ý: Mỗi tài khoản chỉ được quay 1 lần duy nhất trong ngày. Voucher trúng thưởng có hạn sử dụng theo quy định của rạp.
      </div>

      <style>{`
        .clip-path-arrow {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LuckyWheelPage;