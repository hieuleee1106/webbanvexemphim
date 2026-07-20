import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/Button";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState(""); // Có thể là username hoặc email
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, notify } = useAuth();

  // Lấy đường dẫn trang trước đó, nếu không có thì mặc định là trang chủ "/"
  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. Gọi API để đăng nhập và lấy token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend nên có khả năng xử lý 'identifier' là username hoặc email
        body: JSON.stringify({ identifier, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        notify.error(loginData.message || "Email/Tên đăng nhập hoặc mật khẩu không chính xác.");
        return;
      }

      // 2. Lấy token và user từ response, lưu token vào localStorage
      const { token, user } = loginData.data;
      localStorage.setItem('cinema-token', token);

      // 3. Cập nhật AuthContext với thông tin người dùng và điều hướng
      login(user);
      notify.success(`Chào mừng trở lại, ${user.FullName || user.Username}!`);

      // --- LOGIC ĐIỀU HƯỚNG ---
      if (['Admin', 'Staff'].includes(user.Role)) { // Khớp với 'Role' từ schema DB
        navigate('/admin/dashboard', { replace: true }); // Nếu là admin/staff, chuyển đến dashboard
      } else {
        navigate(from, { replace: true }); // Nếu là user thường, quay lại trang trước đó
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      notify.error("Không thể kết nối đến máy chủ hoặc có lỗi xảy ra.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      try {
        // 1. Gửi token của Google đến backend để xác thực
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: credentialResponse.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Xác thực Google thất bại.');

        // 2. Nhận lại token và user của ứng dụng, lưu vào localStorage
        const { token, user } = data.data;
        localStorage.setItem('cinema-token', token);

        // 3. Cập nhật context, thông báo chào mừng và điều hướng
        login(user);
        notify.success(`Chào mừng, ${user.FullName || user.Username}!`);

        // --- LOGIC ĐIỀU HƯỚNG ---
        if (['Admin', 'Staff'].includes(user.Role)) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      } catch (err) {
        notify.error(err.message);
        console.error("Lỗi đăng nhập Google:", err);
      }
    }
  };
  
  const handleGoogleError = () => {
    console.log("Login Failed");
    notify.error("Đăng nhập bằng Google thất bại. Vui lòng thử lại sau.");
  };

  const processFacebookLogin = async (accessToken) => {
    try {
      const res = await fetch('/api/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message);

      const { token, user } = data.data;
      localStorage.setItem('cinema-token', token);
      login(user);
      notify.success(`Chào mừng, ${user.FullName || user.Username}!`);
      
      if (['Admin', 'Staff'].includes(user.Role)) navigate('/admin/dashboard', { replace: true });
      else navigate(from, { replace: true });
    } catch (err) {
      notify.error(err.message || "Đăng nhập Facebook thất bại.");
    }
  };

  const handleFacebookLogin = () => {
    if (!window.FB) return notify.error("Facebook SDK chưa tải xong. Vui lòng đợi.");

    window.FB.login((response) => {
      if (response.authResponse) {
        processFacebookLogin(response.authResponse.accessToken);
      } else {
        notify.info("Bạn đã hủy đăng nhập Facebook.");
      }
    }, { scope: 'email,public_profile' });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-red-50/30 p-4 relative"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-red-100 p-8 relative z-10 border border-red-50">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Chào Mừng <span className="text-red-600">Trở Lại</span>
          </h1>
          <img src="/logo.png" alt="CinemaDB Logo" className="h-20 w-auto mx-auto my-4 object-contain" />
          <p className="text-slate-500 mt-3 text-sm font-medium">Đăng nhập để tiếp tục trải nghiệm</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 ml-1">Email hoặc Tên đăng nhập</label>
            <input
              type="text"
              placeholder="your.email@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              required
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-semibold text-slate-600">Mật khẩu</label>
              <Link to="/forgot-password" className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
          >
            Đăng nhập
          </Button>
        </form>

        <div className="my-8 flex items-center">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hoặc</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="rectangular"
            width="350px"
          />
          
          <button
            onClick={handleFacebookLogin}
            className="w-[350px] flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white py-2 px-4 rounded-md font-bold transition-all shadow-md h-[40px]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.962.925-1.962 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Đăng nhập với Facebook
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-red-600 hover:text-red-700 font-bold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;