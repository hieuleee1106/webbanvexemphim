import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const AdminShowtimesPage = () => {
  const { notify } = useAuth();
  
  const [view, setView] = useState('list');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Data states
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    movieTitle: '',
    startTime: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    MovieID: '',
    RoomID: '',
    StartTime: '',
    Price: '',
    PriceVIP: '',
    PriceDouble: '',
    Format: 'Vietsub'
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchShowtimes();
    fetchDropdownData();
  }, []);

  const fetchShowtimes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/showtimes');
      const data = await res.json();
      if (data.success) setShowtimes(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [moviesRes, roomsRes] = await Promise.all([
        fetch('/api/movies'),
        fetch('/api/rooms')
      ]);
      const moviesData = await moviesRes.json();
      const roomsData = await roomsRes.json();
      
      if(moviesData.success) setMovies(moviesData.data);
      if(roomsData.success) setRooms(roomsData.data);
    } catch (error) {
      console.error("Lỗi tải danh sách phim/phòng:", error);
    }
  };

  // ✅ FIX 1: fetchShowtimeDetail (QUAN TRỌNG NHẤT)
const fetchShowtimeDetail = async (id) => {
  try {
    const res = await fetch(`/api/showtimes/${id}`);
    const data = await res.json();

    if (data.success) {
      // FIX: Ép kiểu UTC trước khi tạo đối tượng Date
      const rawTime = data.data.StartTime;
      const utcDate = new Date(rawTime.endsWith('Z') ? rawTime : rawTime + 'Z');
      const localISOTime = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      
      setFormData({
        MovieID: data.data.MovieID,
        RoomID: data.data.RoomID,
        StartTime: localISOTime, // Gán giá trị đã chuyển đổi
        Price: data.data.Price || '',
        PriceVIP: data.data.PriceVIP || '',
        PriceDouble: data.data.PriceDouble || '',
        Format: data.data.Format || 'Vietsub'
      });
    }
  } catch (error) {
    notify.error("Lỗi tải thông tin lịch chiếu");
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = isEditing ? `/api/showtimes/${editId}` : '/api/showtimes';
      const method = isEditing ? 'PUT' : 'POST';

      // Chuyển đổi thời gian địa phương từ input thành chuỗi ISO UTC
      const startTimeUTC = new Date(formData.StartTime).toISOString(); // Input datetime-local trả về local ISO string, cần chuyển về UTC

      const res = await fetch(url, {
        method: method,
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ ...formData, StartTime: startTimeUTC })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      notify.success(isEditing ? 'Cập nhật thành công!' : 'Thêm thành công!');
      fetchShowtimes();
      switchToList();
    } catch (error) {
      notify.error('Lỗi: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/showtimes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      if (!res.ok) throw new Error('Không thể xóa');
      setShowtimes(showtimes.filter(s => s.ShowtimeID !== id));
      notify.success("Xóa thành công!");
    } catch (error) {
      notify.error("Lỗi xóa: " + error.message);
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const triggerDelete = (id, movieTitle, startTime) => {
    setConfirmModal({
      isOpen: true,
      id,
      movieTitle,
      startTime: new Date(startTime.endsWith('Z') ? startTime : startTime + 'Z').toLocaleString('vi-VN')
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Navigation helpers
  const resetForm = () => {
    setFormData({ MovieID: '', RoomID: '', StartTime: '', Price: '', PriceVIP: '', PriceDouble: '', Format: 'Vietsub' });
    setIsEditing(false);
    setEditId(null);
  };
  const switchToAdd = () => { resetForm(); setView('form'); };
  const switchToList = () => { resetForm(); setView('list'); };
  const switchToEdit = (id) => { 
    resetForm(); 
    setIsEditing(true); 
    setEditId(id); 
    setView('form'); 
    fetchShowtimeDetail(id);
  };

  if (view === 'form') {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isEditing ? 'Cập Nhật Lịch' : 'Thêm Lịch Mới'}</h2>
          <button onClick={switchToList} className="text-gray-500 hover:text-gray-700">Hủy bỏ</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phim</label>
            <select name="MovieID" value={formData.MovieID} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50">
              <option value="">-- Chọn Phim --</option>
              {movies.map(m => <option key={m.MovieID} value={m.MovieID}>{m.Title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phòng Chiếu</label>
            <select name="RoomID" value={formData.RoomID} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50">
              <option value="">-- Chọn Phòng --</option>
              {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian chiếu</label>
            <input type="datetime-local" name="StartTime" value={formData.StartTime} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Định dạng phim</label>
            <select name="Format" value={formData.Format} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50">
              <option value="Vietsub">Phụ đề (Vietsub)</option>
              <option value="Lồng tiếng">Lồng tiếng</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Giá Thường</label>
              <input type="number" name="Price" value={formData.Price} onChange={handleInputChange} placeholder="VD: 50000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Giá VIP</label>
              <input type="number" name="PriceVIP" value={formData.PriceVIP} onChange={handleInputChange} placeholder="Mặc định: +20k" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Giá Ghế Đôi</label>
              <input type="number" name="PriceDouble" value={formData.PriceDouble} onChange={handleInputChange} placeholder="Mặc định: x2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={formLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">{formLoading ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={switchToList} className="flex-1 border border-gray-300 bg-white text-gray-700 py-2 px-4 rounded hover:bg-gray-50">Quay lại</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Lịch Chiếu</h2>
        <button onClick={switchToAdd} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2">
          + Thêm Lịch Mới
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phim</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phòng</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Giờ Chiếu</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Giá Vé</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="text-center py-4">Đang tải...</td></tr> : 
             showtimes.length === 0 ? <tr><td colSpan="5" className="text-center py-4">Chưa có lịch chiếu.</td></tr> :
             showtimes.map(st => (
              <tr key={st.ShowtimeID}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-semibold">{st.MovieTitle}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">{st.RoomName}</td>
               <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
  {new Date(st.StartTime.endsWith('Z') ? st.StartTime : st.StartTime + 'Z').toLocaleString('vi-VN')}
</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-bold text-red-600">{Number(st.Price || 50000).toLocaleString()} đ</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                  <button onClick={() => switchToEdit(st.ShowtimeID)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg> Sửa
                  </button>
                  <button onClick={() => triggerDelete(st.ShowtimeID, st.MovieTitle, st.StartTime)} className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg> Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Xóa lịch chiếu"
        message={`Bạn có chắc chắn muốn xóa lịch chiếu phim "${confirmModal.movieTitle}" vào lúc ${confirmModal.startTime}?`}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminShowtimesPage;
