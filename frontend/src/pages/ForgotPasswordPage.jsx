import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../components/Button';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setMessage(data.message);
      toast.success("Yêu cầu đã được gửi đi!");
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
          <h1 className="text-3xl font-extrabold text-slate-900">Quên Mật Khẩu</h1>
          <p className="text-slate-500 mt-2 text-sm">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
        </div>
        
        {message ? (
          <div className="text-center p-4 bg-green-100 text-green-800 rounded-lg">
            <p>{message}</p>
            <Link to="/login" className="font-bold text-green-900 hover:underline mt-2 block">Quay lại Đăng nhập</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-600">Email đăng ký</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5" placeholder="your.email@example.com" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Đang gửi...' : 'Gửi liên kết'}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-red-600 hover:underline">Quay lại Đăng nhập</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;