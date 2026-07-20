import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../components/Button';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp.");
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.message || "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50/30 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Đặt Lại Mật Khẩu</h1>
          <p className="text-slate-500 mt-2 text-sm">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-600">Mật khẩu mới</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5" 
              placeholder="••••••••" 
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Xác nhận mật khẩu mới</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5" 
              placeholder="••••••••" 
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Đang xử lý...' : 'Lưu Mật Khẩu Mới'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;