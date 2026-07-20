import { useState, useEffect } from "react"; // Đảm bảo useEffect được import
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/Button";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    Username: "",
    Password: "",
    FullName: "",
    Phone: "",
    otp: ""
  });
  const [confirmPassword, setConfirmPassword] = useState(""); // State cho xác nhận mật khẩu
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { notify } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Bộ đếm ngược cho nút gửi lại OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const isValidGmail = (email) => {
    const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/;
    return gmailRegex.test(email.toLowerCase());
  };

  const handleSendOTP = async () => {
    if (!isValidGmail(formData.Username)) {
      return notify.error("Vui lòng nhập địa chỉ Gmail chính chủ (ví dụ: user@gmail.com).");
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.Username.toLowerCase() }),
      });
      const data = await res.json();

      if (data.success) {
        notify.success(data.message);
        setCountdown(60); // Khóa nút 60 giây
      } else {
        notify.error(data.message);
      }
    } catch (error) {
      notify.error("Không thể kết nối đến máy chủ.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(formData.Phone)) {
      return notify.error("Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0.");
    }

    if (formData.Password !== confirmPassword) { // Logic kiểm tra mật khẩu đã có
      notify.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!formData.otp) {
      return notify.warning("Vui lòng nhập mã xác thực OTP.");
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, Username: formData.Username.toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Đăng ký thất bại.");
      }

      notify.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err) {
      console.error('Lỗi đăng ký:', err);
      notify.error(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50/30 p-4 relative">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-red-100 p-8 relative z-10 border border-red-50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Tạo <span className="text-red-600">Tài Khoản</span>
          </h1>
          <img src="/logo.png" alt="CinemaDB Logo" className="h-16 w-auto mx-auto my-4 object-contain" />
          <p className="text-slate-500 mt-2 text-sm font-medium">Đăng ký bằng Gmail chính chủ để bảo mật tài khoản</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 ml-1">Họ và tên</label>
              <input type="text" name="FullName" placeholder="Nguyễn Văn A" value={formData.FullName} onChange={handleChange} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm focus:border-red-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 ml-1">Số điện thoại</label>
              <input type="tel" name="Phone" placeholder="098xxxxxxx" value={formData.Phone} onChange={handleChange} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm focus:border-red-500 outline-none" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 ml-1">Địa chỉ Gmail</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                name="Username" 
                placeholder="ten-ban@gmail.com" 
                value={formData.Username} 
                onChange={handleChange} 
                className="flex-1 border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm focus:border-red-500 outline-none" 
                required 
              />
              <button 
                type="button" 
                onClick={handleSendOTP} 
                disabled={otpLoading || countdown > 0} 
                className="px-4 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap transition-all"
              >
                {otpLoading ? "..." : countdown > 0 ? `${countdown}s` : "Gửi mã"}
              </button>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <label className="text-sm font-semibold text-slate-600">Mã OTP (6 số)</label>
            <input 
              type="text" 
              name="otp" 
              placeholder="000000" 
              maxLength="6" 
              value={formData.otp} 
              onChange={handleChange} 
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-center tracking-[10px] text-lg font-bold focus:border-red-500 outline-none" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 ml-1">Mật khẩu</label>
              <input
                type="password"
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 ml-1">Xác nhận lại</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full disabled:opacity-70"
          >
            {isLoading ? "Đang xử lý..." : "Đăng Ký Ngay"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-slate-500 text-sm">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-bold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;