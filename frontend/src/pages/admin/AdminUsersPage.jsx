import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import ConfirmModal from '../../components/ConfirmModal';

const AdminUsersPage = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({
    // ... (giữ nguyên các thuộc tính khác)
    isOpen: false,
    id: null,
    username: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (error) {
      toast.error("Lỗi tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const triggerDelete = (userId, username) => {
    setConfirmModal({
      isOpen: true,
      id: userId,
      username
    });
  };

  const handleDelete = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Đã xóa người dùng");
        setUsers(users.filter(u => u.UserID !== userId));
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Lỗi xóa người dùng");
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` 
        },
        body: JSON.stringify({ Role: newRole })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Đã thay đổi quyền thành ${newRole}`);
        setUsers(users.map(u => u.UserID === userId ? { ...u, Role: newRole } : u));
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Lỗi thay đổi quyền hạn");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Quản lý Người Dùng</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tên Đăng Nhập</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Họ Tên</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">SĐT</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Vai Trò</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center py-4">Đang tải...</td></tr> : 
             users.map(user => (
              <tr key={user.UserID}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">#{user.UserID}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm font-semibold">{user.Username}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">{user.FullName}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">{user.Phone}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                  <select 
                    value={user.Role} 
                    onChange={(e) => handleRoleChange(user.UserID, e.target.value)}
                    disabled={user.UserID === authUser?.UserID} // Không cho phép admin tự hạ quyền của mình
                    className={`px-2 py-1 rounded-full text-xs font-bold outline-none cursor-pointer border-none ${user.Role === 'Admin' ? 'bg-red-100 text-red-600' : user.Role === 'Staff' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}
                  >
                    <option value="User">User</option>
                   
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                  <button 
                    onClick={() => triggerDelete(user.UserID, user.Username)} 
                    className="text-red-600 hover:text-red-900"
                    disabled={user.Role === 'Admin'} // Không cho xóa Admin
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${confirmModal.username}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminUsersPage;