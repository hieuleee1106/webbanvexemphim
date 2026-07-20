import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { name: 'Phim', path: '/admin/movies', icon: '🎬' },
    { name: 'Phòng chiếu', path: '/admin/rooms', icon: '🏢' },
    { name: 'Lịch chiếu phim', path: '/admin/showtimes', icon: '🕒' },
    { name: 'Mã giảm giá', path: '/admin/vouchers', icon: '🎟️' },
    { name: 'Vé đã đặt', path: '/admin/tickets', icon: '🎫' },
    { name: 'Giao dịch', path: '/admin/transactions', icon: '💳' },
    { name: 'Chat hỗ trợ', path: '/admin/chat', icon: '💬' },
    { name: 'Đồ ăn & nước uống', path: '/admin/snacks', icon: '🍿' },
    { name: 'Người dùng', path: '/admin/users', icon: '👥' },
    { name: 'Hồ sơ cá nhân', path: '/admin/profile', icon: '👤' }
  ];

 return (
  <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">

    {/* Sidebar */}
    <aside className="w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl border-r border-white/5">

      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
        <img
          src="/logo.png"
          alt="Logo"
          className="h-11 w-auto object-contain"
        />

        <div>
          <h1 className="text-2xl font-black tracking-wide">
            <span className="text-red-500">Cinema</span>
            <span className="text-white">DB</span>
          </h1>

          <p className="text-[11px] text-slate-400 uppercase tracking-[3px]">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-2">

        <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">
          Quản lý hệ thống
        </p>

        {[
          {
            to: '/admin/dashboard',
            label: 'Thống kê',
            icon: '📊'
          },
          {
            to: '/admin/movies',
            label: 'Phim',
            icon: '🎬'
          },
          {
            to: '/admin/rooms',
            label: 'Phòng chiếu',
            icon: '🎦'
          },
          {
            to: '/admin/showtimes',
            label: 'Lịch chiếu',
            icon: '🕒'
          },
          {
            to: '/admin/vouchers',
            label: 'Mã giảm giá',
            icon: '🎁'
          },
          {
            to: '/admin/tickets',
            label: 'Vé đặt',
            icon: '🎟️'
          },
          {
            to: '/admin/transactions',
            label: 'Giao dịch',
            icon: '💳'
          },
          {
            to: '/admin/chat',
            label: 'Chat hỗ trợ',
            icon: '💬'
          },
          {
            to: '/admin/snacks',
            label: 'Đồ ăn & nước',
            icon: '🍿'
          },
          {
            to: '/admin/users',
            label: 'Người dùng',
            icon: '👥'
          },
          {
            to: '/admin/profile',
            label: 'Hồ sơ',
            icon: '👤'
          }
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-red-600 hover:text-white transition-all duration-300 hover:translate-x-1"
          >
            <span className="text-lg">
              {item.icon}
            </span>

            <span className="font-semibold text-[15px]">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">

        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-bold transition-all duration-300"
        >
          Đăng xuất
        </button>

      </div>
    </aside>

    {/* Content */}
    <div className="flex-1 flex flex-col min-w-0">

      {/* Header */}
      <header className="h-20 bg-white dark:bg-[#111827] border-b border-black/5 dark:border-white/5 px-8 flex items-center justify-between shadow-sm">

        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white">
            Khu vực quản trị
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quản lý hệ thống CinemaDB
          </p>
        </div>

        <Link
          to="/admin/profile"
          className="flex items-center gap-3 group"
        >
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Xin chào
            </p>

            <h3 className="font-bold text-gray-800 dark:text-white">
              {user?.FullName || 'Admin'}
            </h3>
          </div>

          {user?.Avatar ? (
            <img
              src={user.Avatar}
              alt="Avatar"
              className="w-11 h-11 rounded-full object-cover border-2 border-red-500"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
              {user?.Username?.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto overflow-x-auto p-6 bg-gray-100 dark:bg-[#020617]">

        <div className="min-w-[1100px]">
          <Outlet />
        </div>

      </main>
    </div>
  </div>
);
};

export default AdminLayout;