import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const AdminRoomsPage = () => {
  const { notify } = useAuth();
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    roomName: ''
  });

  const [formData, setFormData] = useState({
    RoomName: '',
    TotalSeats: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Không thể tải danh sách phòng');
      const data = await res.json();
      setRooms(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomDetail = async (id) => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      if (data.success) {
        setFormData({
          RoomName: data.data.RoomName,
          TotalSeats: data.data.TotalSeats
        });
      }
    } catch (error) {
      console.error("Lỗi tải phòng:", error);
      notify.error("Lỗi tải thông tin phòng");
      setView('list');
    }
  };

  const handleDelete = async (RoomID) => {
    try {
      const res = await fetch(`/api/rooms/${RoomID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      if (!res.ok) throw new Error('Không thể xóa phòng');
      setRooms(rooms.filter(room => room.RoomID !== RoomID));
      notify.success("Xóa phòng thành công!");
    } catch (error) {
      console.error("Lỗi xóa phòng:", error);
      notify.error("Lỗi xóa phòng: " + error.message);
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const triggerDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      id,
      roomName: name
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = isEditing ? `/api/rooms/${editId}` : '/api/rooms';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      notify.success(isEditing ? 'Cập nhật phòng thành công!' : 'Thêm phòng thành công!');
      fetchRooms();
      switchToList();
    } catch (error) {
      notify.error('Lỗi: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ RoomName: '', TotalSeats: '' });
    setIsEditing(false);
    setEditId(null);
  };

  const switchToAdd = () => {
    resetForm();
    setIsEditing(false);
    setView('form');
  };

  const switchToEdit = (id) => {
    resetForm();
    setIsEditing(true);
    setEditId(id);
    setView('form');
    fetchRoomDetail(id);
  };

  const switchToList = () => {
    setView('list');
    resetForm();
  };

  if (view === 'form') {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isEditing ? 'Cập Nhật Phòng' : 'Thêm Phòng Mới'}</h2>
          <button onClick={switchToList} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Hủy bỏ</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên Phòng</label><input type="text" name="RoomName" value={formData.RoomName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tổng Số Ghế</label><input type="number" name="TotalSeats" value={formData.TotalSeats} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required /></div>
          <div className="pt-4 flex gap-4"><button type="submit" disabled={formLoading} className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50">{formLoading ? 'Đang xử lý...' : (isEditing ? 'Lưu Thay Đổi' : 'Thêm Phòng')}</button><button type="button" onClick={switchToList} className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Quay lại</button></div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Phòng Chiếu</h2>
        <button onClick={switchToAdd} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Thêm Phòng Mới
        </button>
      </div>
      <div className="overflow-x-auto"><table className="min-w-full leading-normal"><thead><tr><th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th><th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tên Phòng</th><th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tổng Số Ghế</th><th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hành động</th></tr></thead><tbody>{loading ? (<tr><td colSpan="4" className="text-center py-4">Đang tải dữ liệu...</td></tr>) : error ? (<tr><td colSpan="4" className="text-center py-4 text-red-500">{error}</td></tr>) : rooms.length === 0 ? (<tr><td colSpan="4" className="text-center py-4">Không có phòng nào.</td></tr>) : (rooms.map((room) => (<tr key={room.RoomID}><td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm"><p className="text-gray-900 dark:text-gray-300 font-semibold">#{room.RoomID}</p></td><td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm"><p className="text-gray-900 dark:text-gray-300 font-semibold">{room.RoomName}</p></td><td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm"><p className="text-gray-900 dark:text-gray-300">{room.TotalSeats}</p></td><td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
        <Link to={`/admin/rooms/${room.RoomID}/seats`} className="text-green-600 hover:text-green-900 mr-4 font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg> Ghế
        </Link>
        <button onClick={() => switchToEdit(room.RoomID)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium flex items-center gap-1 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg> Sửa
        </button>
        <button onClick={() => triggerDelete(room.RoomID, room.RoomName)} className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg> Xóa
        </button></td></tr>)))}</tbody></table></div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Xóa phòng chiếu"
        message={`Bạn có chắc muốn xóa phòng "${confirmModal.roomName}"? Các dữ liệu liên quan như Ghế và Suất chiếu có thể bị ảnh hưởng.`}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminRoomsPage;