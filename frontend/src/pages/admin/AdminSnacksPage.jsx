import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import { toast } from 'sonner';

const AdminSnacksPage = () => {
  const { notify } = useAuth();
  const [snacks, setSnacks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ Name: '', Price: '', Category: 'Bỏng ngô', Description: '', Image: '', Status: 'Active' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  useEffect(() => { fetchSnacks(); }, []);

  const fetchSnacks = async () => {
    const res = await fetch('/api/snacks/admin', { headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` } });
    const data = await res.json();
    if (data.success) setSnacks(data.data);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/snacks/${editId}` : '/api/snacks';
    
    const data = new FormData();
    data.append('Name', formData.Name);
    data.append('Price', formData.Price);
    data.append('Category', formData.Category);
    data.append('Description', formData.Description || '');
    data.append('Status', formData.Status);
    
    if (imageFile) {
      data.append('image', imageFile);
    } else {
      data.append('Image', formData.Image); // Gửi URL cũ nếu không chọn file mới
    }

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` },
      body: data
    });
    
    if (res.ok) {
      toast.success(isEditing ? "Đã cập nhật" : "Đã thêm món mới");
      setIsEditing(false); 
      setFormData({ Name: '', Price: '', Category: 'Bỏng ngô', Description: '', Image: '', Status: 'Active' });
      setImageFile(null);
      setImagePreview('');
      fetchSnacks();
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/snacks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` } });
    if (res.ok) { toast.success("Đã xóa"); fetchSnacks(); }
    else { const d = await res.json(); toast.error(d.message); }
    setConfirmModal({ isOpen: false, id: null });
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Quản lý Đồ Ăn & Nước Uống</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
        <input type="text" placeholder="Tên món" value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} className="p-2 border rounded" required />
        <input type="number" placeholder="Giá tiền" value={formData.Price} onChange={e => setFormData({...formData, Price: e.target.value})} className="p-2 border rounded" required />
        <select value={formData.Category} onChange={e => setFormData({...formData, Category: e.target.value})} className="p-2 border rounded">
            <option value="Bỏng ngô">Bỏng ngô</option>
            <option value="Nước uống">Nước uống</option>
            <option value="Combo">Combo</option>
        </select>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ảnh sản phẩm (Chọn từ máy)</label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
          {(imagePreview || formData.Image) && (
            <div className="mt-2 flex items-center gap-4">
              <img src={imagePreview || formData.Image} alt="Preview" className="h-16 w-16 object-cover rounded-lg border shadow-sm" />
              <span className="text-[10px] text-gray-400 italic">{imageFile ? 'Ảnh mới chọn' : 'Ảnh hiện tại'}</span>
            </div>
          )}
        </div>
        <button type="submit" className="bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">{isEditing ? "Cập nhật" : "Thêm mới"}</button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-5 py-3 text-left text-xs font-bold uppercase">Hình ảnh</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase">Tên</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase">Loại</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase">Giá</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {snacks.map(s => (
              <tr key={s.SnackID} className="border-b dark:border-gray-600">
                <td className="px-5 py-3"><img src={s.Image || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded" /></td>
                <td className="px-5 py-3 font-bold">{s.Name}</td>
                <td className="px-5 py-3 text-sm">{s.Category}</td>
                <td className="px-5 py-3 text-red-600 font-bold">{Number(s.Price).toLocaleString()}đ</td>
                <td className="px-5 py-3 flex gap-2">
                  <button onClick={() => { setIsEditing(true); setEditId(s.SnackID); setFormData(s); }} className="text-blue-600 font-bold underline">Sửa</button>
                  <button onClick={() => setConfirmModal({ isOpen: true, id: s.SnackID })} className="text-red-600 font-bold underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title="Xóa món ăn" 
        message="Bạn có chắc muốn xóa món này không?" 
        onConfirm={() => handleDelete(confirmModal.id)} 
        onClose={() => setConfirmModal({ isOpen: false, id: null })} 
      />
    </div>
  );
};

export default AdminSnacksPage;