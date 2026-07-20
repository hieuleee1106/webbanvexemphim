import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, notify, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      notify.error("Vui lòng đăng nhập để xem trang cá nhân.");
      navigate('/login');
      return;
    }
    setFullName(user.FullName || '');
    setPhone(user.Phone || '');
    // Kiểm tra chuỗi rỗng để tránh warning src=""
    const currentAvatar = (user.Avatar && user.Avatar !== "") ? user.Avatar : 'https://res.cloudinary.com/dqj0g0d0p/image/upload/v1700000000/default_avatar.png';
    setAvatarPreview(currentAvatar); 
  }, [user, navigate, notify]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarFile(null);
      const currentAvatar = (user.Avatar && user.Avatar !== "") ? user.Avatar : 'https://res.cloudinary.com/dqj0g0d0p/image/upload/v1700000000/default_avatar.png';
      setAvatarPreview(currentAvatar);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const phoneRegex = /^0[0-9]{9}$/;
    if (phone && !phoneRegex.test(phone)) {
      return toast.error("Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0.");
    }

    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append('FullName', fullName);
      formData.append('Phone', phone);
      if (avatarFile) {
        formData.append('avatar', avatarFile); // 'avatar' matches the field name in upload.single('avatar')
      } else if (user.Avatar) {
        formData.append('Avatar', user.Avatar); // Send back existing avatar URL if no new file
      }

      const res = await fetch(`/api/users/${user.UserID}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Cập nhật thông tin thành công!");
        updateUserProfile(data.data); // Update user in AuthContext
      } else {
        toast.error(data.message || "Cập nhật thông tin thất bại.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Lỗi server khi cập nhật thông tin.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/users/${user.UserID}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Thay đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        // Optionally log out the user after password change for security
        // logout();
        // navigate('/login');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(data.message || "Thay đổi mật khẩu thất bại.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Lỗi server khi thay đổi mật khẩu.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null; // Render nothing if user is not logged in yet

  return (
    <div className="container mx-auto p-4 max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Quản lý Hồ sơ cá nhân</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cập nhật thông tin cá nhân */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Thông tin cá nhân</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <img 
                src={avatarPreview} 
                alt="Avatar Preview" 
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 mb-2"
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
              <input 
                type="text" 
                id="username" 
                value={user.Username} 
                disabled 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Họ và tên</label>
              <input 
                type="text" 
                id="fullName" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
              <input 
                type="text" 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <Button type="submit" loading={profileLoading} className="w-full">
              Cập nhật thông tin
            </Button>
          </form>
        </div>

        {/* Thay đổi mật khẩu */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Thay đổi mật khẩu</h2>
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Mật khẩu hiện tại</label>
              <input 
                type="password" 
                id="currentPassword" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
              <input 
                type="password" 
                id="newPassword" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
              <input 
                type="password" 
                id="confirmNewPassword" 
                value={confirmNewPassword} 
                onChange={(e) => setConfirmNewPassword(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <Button type="submit" loading={passwordLoading} className="w-full bg-blue-600 hover:bg-blue-700">
              Thay đổi mật khẩu
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;