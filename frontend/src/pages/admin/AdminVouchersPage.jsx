import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const AdminVouchersPage = () => {
  const { notify } = useAuth();
  
  const [view, setView] = useState('list');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    code: ''
  });

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    Code: '',
    DiscountPercent: '',
    DiscountAmount: '',
    ExpiryDate: '',
    Quantity: '',
    MinOrderValue: '',
    Status: 'Active',
    IsPublic: true
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vouchers', { headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` } });
      const data = await res.json();
      if (data.success) setVouchers(data.data);
    } catch (err) {
      notify.error("Lỗi tải mã giảm giá");
    } finally {
      setLoading(false);
    }
  };

  const fetchVoucherDetail = async (id) => {
    try {
      const res = await fetch(`/api/vouchers/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` } });
      const data = await res.json();
      if (data.success) {
        const v = data.data;
        setFormData({
          Code: v.Code,
          DiscountPercent: v.DiscountPercent || '',
          DiscountAmount: v.DiscountAmount || '',
          ExpiryDate: new Date(v.ExpiryDate).toISOString().slice(0, 16),
          Quantity: v.Quantity,
          MinOrderValue: v.MinOrderValue || '',
          Status: v.Status,
          IsPublic: v.IsPublic
        });
      }
    } catch (error) {
        notify.error("Lỗi tải chi tiết mã");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = isEditing ? `/api/vouchers/${editId}` : '/api/vouchers';
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

      notify.success(isEditing ? 'Cập nhật thành công!' : 'Thêm thành công!');
      fetchVouchers();
      switchToList();
    } catch (error) {
      notify.error('Lỗi: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      if (!res.ok) throw new Error('Không thể xóa');
      setVouchers(vouchers.filter(v => v.VoucherID !== id));
      notify.success("Xóa thành công!");
    } catch (error) {
      notify.error("Lỗi xóa: " + error.message);
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const triggerDelete = (id, code) => {
    setConfirmModal({
      isOpen: true,
      id,
      code
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const newFormData = { ...formData, [name]: val };

    if (name === 'DiscountPercent' && value) {
        newFormData.DiscountAmount = '';
    }
    if (name === 'DiscountAmount' && value) {
        newFormData.DiscountPercent = '';
    }

    setFormData(newFormData);
  };

  const resetForm = () => {
    setFormData({ Code: '', DiscountPercent: '', DiscountAmount: '', ExpiryDate: '', Quantity: '', MinOrderValue: '', Status: 'Active', IsPublic: true });
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
    fetchVoucherDetail(id);
  };

  if (view === 'form') {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isEditing ? 'Cập Nhật Mã Giảm Giá' : 'Thêm Mã Mới'}</h2>
          <button onClick={switchToList} className="text-gray-500 hover:text-gray-700">Hủy bỏ</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Mã Code</label>
            <input type="text" name="Code" value={formData.Code} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50 uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Giảm theo %</label>
              <input type="number" name="DiscountPercent" value={formData.DiscountPercent} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" placeholder="VD: 10" />
            </div>
            <div>
              <label className="block text-sm font-medium">Giảm tiền cố định</label>
              <input type="number" name="DiscountAmount" value={formData.DiscountAmount} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" placeholder="VD: 50000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Số lượng</label>
              <input type="number" name="Quantity" value={formData.Quantity} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium">Đơn tối thiểu</label>
              <input type="number" name="MinOrderValue" value={formData.MinOrderValue} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" placeholder="Để trống nếu không có"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Ngày hết hạn</label>
            <input type="datetime-local" name="ExpiryDate" value={formData.ExpiryDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>

          <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <input 
              type="checkbox" 
              name="IsPublic" 
              id="IsPublic"
              checked={formData.IsPublic} 
              onChange={handleInputChange}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
            />
            <label htmlFor="IsPublic" className="text-sm font-bold text-blue-800 cursor-pointer">Công khai mã này ở trang Tin tức & Ưu đãi</label>
          </div>

          {isEditing && (
            <div>
                <label className="block text-sm font-medium">Trạng thái</label>
                <select name="Status" value={formData.Status} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50">
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                </select>
            </div>
          )}
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
        <h2 className="text-2xl font-bold">Quản lý Mã Giảm Giá</h2>
        <button onClick={switchToAdd} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">+ Thêm Mã Mới</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Code</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Giảm giá</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Số lượng</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Hiển thị</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Hết hạn</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Trạng thái</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="text-center py-4">Đang tải...</td></tr> : 
             vouchers.map(v => (
              <tr key={v.VoucherID}>
                <td className="px-5 py-5 border-b text-sm font-bold text-red-600">{v.Code}</td>
                <td className="px-5 py-5 border-b text-sm">{v.DiscountAmount ? `${parseInt(v.DiscountAmount).toLocaleString()}đ` : `${v.DiscountPercent}%`}</td>
                <td className="px-5 py-5 border-b text-sm">{v.Quantity}</td>
                <td className="px-5 py-5 border-b text-sm">
                    {v.IsPublic ? 
                        <span className="text-green-600 font-bold flex items-center gap-1"><span className="text-xs">🌍</span> Công khai</span> : 
                        <span className="text-gray-400 font-medium flex items-center gap-1"><span className="text-xs">🔒</span> Ẩn</span>}
                </td>
                <td className="px-5 py-5 border-b text-sm">{new Date(v.ExpiryDate).toLocaleDateString('vi-VN')}</td>
                <td className="px-5 py-5 border-b text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{v.Status}</span>
                </td>
                <td className="px-5 py-5 border-b text-sm">
                  <button onClick={() => switchToEdit(v.VoucherID)} className="text-indigo-600 hover:text-indigo-900 mr-4">Sửa</button>
                  <button onClick={() => triggerDelete(v.VoucherID, v.Code)} className="text-red-600 hover:text-red-900">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Xóa mã giảm giá"
        message={`Bạn có chắc chắn muốn xóa mã "${confirmModal.code}"?`}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminVouchersPage;