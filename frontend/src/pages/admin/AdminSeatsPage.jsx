import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const AdminSeatsPage = () => {
  const { roomId } = useParams();
  const { notify } = useAuth();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');

  // State cho bộ tạo sơ đồ tự động
  const [layoutConfig, setLayoutConfig] = useState({
    rows: 10,
    cols: 12,
    vipFrom: 4, // Từ hàng thứ mấy (D)
    vipTo: 7,   // Đến hàng thứ mấy (G)
    doubleRow: true // Hàng cuối là ghế đôi
  });

  // State cho việc chọn ghế để xóa
  const [selectedSeats, setSelectedSeats] = useState([]);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: ''
  });

  useEffect(() => {
    fetchSeats();
    fetchRoomInfo();
  }, [roomId]);

  const fetchRoomInfo = async () => {
      try {
          const res = await fetch(`/api/rooms/${roomId}`);
          const data = await res.json();
          if(data.success) setRoomName(data.data.RoomName);
      } catch (err) { console.error(err); }
  }

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/seats/room/${roomId}`);
      const data = await res.json();
      if (data.success) setSeats(data.data);
    } catch (err) {
      notify.error("Lỗi tải ghế: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLayout = async () => {
    setLoading(true);
    try {
      const { rows, cols, vipFrom, vipTo, doubleRow } = layoutConfig;
      
      for (let i = 0; i < rows; i++) {
        const rowLetter = String.fromCharCode(65 + i); // A, B, C...
        let type = 'Standard';
        
        // Xác định loại ghế
        if (doubleRow && i === rows - 1) {
          type = 'Double';
        } else if (i + 1 >= vipFrom && i + 1 <= vipTo) {
          type = 'VIP';
        }

        // Với ghế đôi, thường 1 ghế đôi chiếm diện tích 2 ghế thường nhưng trong DB
        // ta có thể lưu 1 ID hoặc 2 ID tùy logic. Ở đây ta tạo số lượng ghế thực tế.
        const currentCols = type === 'Double' ? Math.floor(cols / 2) : cols;

        await fetch('/api/seats/bulk', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
          },
          body: JSON.stringify({ 
            RoomID: roomId, 
            Row: rowLetter, 
            StartNumber: 1, 
            Count: currentCols,
            SeatType: type 
          })
        });
      }
      
      notify.success("Đã tạo sơ đồ ghế thành công!");
      fetchSeats();
    } catch (err) {
      notify.error("Lỗi khi tạo sơ đồ");
    } finally {
      setLoading(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSeatSelect = (seatId) => {
    setSelectedSeats(prev => 
        prev.includes(seatId) 
        ? prev.filter(id => id !== seatId) 
        : [...prev, seatId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSeats.length === seats.length) {
      setSelectedSeats([]); // Bỏ chọn tất cả nếu đang chọn hết
    } else {
      setSelectedSeats(seats.map(s => s.SeatID)); // Chọn tất cả
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSeats.length === 0) return;
    try {
        const res = await fetch('/api/seats/delete-bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
            },
            body: JSON.stringify({ seatIds: selectedSeats })
        });
        const data = await res.json();
        if (data.success) {
            notify.success(data.message);
            // Cập nhật lại danh sách ghế trên giao diện
            setSeats(prev => prev.filter(seat => !selectedSeats.includes(seat.SeatID)));
            setSelectedSeats([]); // Reset ghế đã chọn
        } else {
            notify.error(data.message || "Lỗi: Ghế này đã có người đặt vé, không thể xóa!");
        }
    } catch (err) {
        notify.error("Lỗi xóa hàng loạt: " + err.message);
    } finally {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  }

  const handleUpdateType = async (type) => {
    if (selectedSeats.length === 0) return;
    try {
      const res = await fetch('/api/seats/update-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ seatIds: selectedSeats, type })
      });
      const data = await res.json();
      if (data.success) {
        notify.success(data.message);
        fetchSeats(); // Tải lại để cập nhật màu sắc
        setSelectedSeats([]);
      } else {
        notify.error(data.message);
      }
    } catch (err) {
      notify.error("Lỗi cập nhật loại ghế");
    }
  };

  const triggerConfirm = (type) => {
    if (type === 'bulkDelete') {
      setConfirmModal({
        isOpen: true,
        title: 'Xóa ghế hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${selectedSeats.length} ghế đã chọn?`,
        actionType: 'bulkDelete'
      });
    } else if (type === 'autoGenerate') {
      setConfirmModal({
        isOpen: true,
        title: 'Tạo ghế tự động',
        message: `Hệ thống sẽ tạo tự động ${layoutConfig.rows * layoutConfig.cols} ghế dựa trên cấu hình hiện tại. Bạn có muốn tiếp tục?`,
        actionType: 'generate'
      });
    }
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Ghế - Phòng {roomName}</h2>
            <div className="space-x-2">
                <Link to="/admin/rooms" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Quay lại</Link>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border-t-4 border-red-600">
            <h3 className="font-bold mb-4 text-xl">Cấu hình sơ đồ phòng chiếu nhanh</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">Số hàng (A-Z)</label>
                    <input type="number" value={layoutConfig.rows} onChange={e => setLayoutConfig({...layoutConfig, rows: parseInt(e.target.value)})} className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Số cột (1-20)</label>
                    <input type="number" value={layoutConfig.cols} onChange={e => setLayoutConfig({...layoutConfig, cols: parseInt(e.target.value)})} className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700" />
                </div>
                <div className="md:col-span-2 flex gap-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Hàng VIP từ</label>
                        <input type="number" value={layoutConfig.vipFrom} onChange={e => setLayoutConfig({...layoutConfig, vipFrom: parseInt(e.target.value)})} className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">đến</label>
                        <input type="number" value={layoutConfig.vipTo} onChange={e => setLayoutConfig({...layoutConfig, vipTo: parseInt(e.target.value)})} className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={layoutConfig.doubleRow} onChange={e => setLayoutConfig({...layoutConfig, doubleRow: e.target.checked})} id="doubleRow" />
                    <label htmlFor="doubleRow" className="text-sm font-bold">Hàng cuối là ghế đôi</label>
                </div>
                <button onClick={() => triggerConfirm('autoGenerate')} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-500/30">
                    Tạo Sơ Đồ Mới
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 min-h-[40px] gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Sơ đồ ghế</h3>
                    
                    {seats.length > 0 && (
                        <button 
                            onClick={handleSelectAll} 
                            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            {selectedSeats.length === seats.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    )}
                </div>
                
                {selectedSeats.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm animate-fade-in w-full md:w-auto">
                        <span className="font-bold text-blue-800 dark:text-blue-300 mr-2 text-sm">Đã chọn: {selectedSeats.length} ghế | Đổi sang:</span>
                        <button onClick={() => handleUpdateType('Standard')} className="bg-gray-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-gray-600">Thường</button>
                        <button onClick={() => handleUpdateType('VIP')} className="bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-yellow-600">VIP</button>
                        <button onClick={() => handleUpdateType('Double')} className="bg-pink-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-pink-600">Ghế Đôi</button>
                        <div className="h-4 w-px bg-blue-200 mx-2"></div>
                        <button onClick={() => triggerConfirm('bulkDelete')} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-[10px] font-bold uppercase shadow-sm">Xóa sạch</button>
                    </div>
                )}
                
            </div>
            
            <div className="flex gap-6 mb-6 text-sm font-bold justify-center border-b pb-4">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div> Ghế thường</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div> Ghế VIP</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-pink-500 rounded"></div> Ghế đôi</div>
            </div>

            {loading ? <p className="text-center py-10">Đang tải sơ đồ...</p> : 
            (
                <>
                {/* Thành phần Màn hình */}
                <div className="w-full max-w-2xl mx-auto bg-gray-300 dark:bg-gray-700 h-4 mb-12 rounded-lg shadow-inner text-center text-[10px] pt-0.5 text-gray-500 font-bold tracking-[0.5em] uppercase">MÀN HÌNH</div>

                <div className="flex flex-col gap-4 bg-black/5 dark:bg-white/5 p-8 rounded-3xl max-w-5xl mx-auto overflow-x-auto">
                    {seats.length === 0 ? (
                        <p className="text-center text-gray-500">Chưa có ghế nào.</p>
                    ) : (
                        // Gom nhóm ghế theo hàng để tránh việc ghế hàng dưới nhảy lên hàng trên khi xóa
                        // Hiển thị đầy đủ các hàng từ A đến MaxRow
                        Array.from({ length: layoutConfig.rows }, (_, i) => String.fromCharCode(65 + i)).map(rowLabel => (
                            <div key={rowLabel} className="flex items-center gap-4">
                                <div className="w-6 text-gray-400 font-bold text-sm">{rowLabel}</div>
                                <div className="grid grid-cols-12 gap-3 justify-items-center flex-1">
                                    {/* Lặp qua từ 1 đến MaxCols để giữ vị trí cố định */}
                                    {Array.from({ length: layoutConfig.cols }, (_, i) => i + 1).map(colNum => {
                                        const seat = seats.find(s => s.SeatRow === rowLabel && s.SeatNumber === colNum);
                                        if (!seat) return <div key={colNum} className="w-12 h-12 bg-transparent border border-dashed border-gray-200 dark:border-gray-700 rounded-lg"></div>;

                                        const isSelected = selectedSeats.includes(seat.SeatID);
                                        let typeClass = "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
                                        if (seat.SeatType === 'VIP') typeClass = "bg-yellow-500 text-white border-yellow-600";
                                        if (seat.SeatType === 'Double') typeClass = "bg-pink-500 text-white border-pink-600";

                                        return (
                                            <div 
                                                key={seat.SeatID} 
                                                onClick={() => handleSeatSelect(seat.SeatID)}
                                                className={`h-12 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-all shadow-sm border-2
                                                    ${isSelected 
                                                        ? 'bg-red-500 text-white border-red-700 ring-2 ring-red-300' 
                                                        : `${typeClass} hover:scale-105 hover:brightness-110`}
                                                    ${seat.SeatType === 'Double' ? 'col-span-2 w-full max-w-[108px]' : 'w-12'}` }>
                                                {seat.SeatNumber}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="w-6 text-gray-400 font-bold text-sm text-right">{rowLabel}</div>
                            </div>
                        ))
                    )}
                </div>
                </>
            )}
        </div>

        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.actionType === 'bulkDelete' ? handleBulkDelete : handleGenerateLayout}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
    </div>
  );
};

export default AdminSeatsPage;
