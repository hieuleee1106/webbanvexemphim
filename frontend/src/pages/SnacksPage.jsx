import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SnacksPage = () => {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({}); // { snackId: quantity }
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSnacks = async () => {
      try {
        const res = await fetch('/api/snacks');
        const data = await res.json();
        if (data.success) setSnacks(data.data);
      } catch (error) {
        toast.error("Không thể tải danh sách bắp nước");
      } finally {
        setLoading(false);
      }
    };
    fetchSnacks();
  }, []);

  const handleUpdateQty = (snackId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [snackId]: Math.max(0, (prev[snackId] || 0) + delta)
    }));
  };

  const handleBuyRequest = () => {
    const selectedItems = snacks
      .filter(s => quantities[s.SnackID] > 0)
      .map(s => ({ ...s, Quantity: quantities[s.SnackID] }));

    if (selectedItems.length === 0) {
      return toast.warning("Vui lòng chọn số lượng bắp nước bạn muốn mua!");
    }

    navigate('/payment', { 
      state: { 
        selectedSnacks: selectedItems,
        initialTotalPrice: 0 // Không có tiền vé
      } 
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-red-700 text-white py-16 mb-10 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black italic mb-4 uppercase tracking-tighter">Bắp & Nước</h1>
          <p className="text-red-100 text-lg max-w-xl mx-auto font-medium">
            Thưởng thức vị bắp thơm ngon cùng nước uống mát lạnh để trải nghiệm điện ảnh thêm trọn vẹn.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {snacks.map((snack) => (
            <div key={snack.SnackID} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img 
                  src={snack.Image || 'https://via.placeholder.com/300?text=Snack'} 
                  alt={snack.Name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-gray-800">{snack.Name}</h3>
                  <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded uppercase">{snack.Category}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{snack.Description}</p>
                
                <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-red-600">{Number(snack.Price).toLocaleString()}đ</span>
                    <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-full">
                      <button 
                        onClick={() => handleUpdateQty(snack.SnackID, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm hover:text-red-500 font-bold"
                      >-</button>
                      <span className="w-4 text-center font-bold text-gray-800">{quantities[snack.SnackID] || 0}</span>
                      <button 
                        onClick={() => handleUpdateQty(snack.SnackID, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm hover:text-green-500 font-bold"
                      >+</button>
                    </div>
                  </div>
                  <button 
                    onClick={handleBuyRequest}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-red-600 transition-colors uppercase tracking-widest"
                  >
                    Mua Ngay
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SnacksPage;