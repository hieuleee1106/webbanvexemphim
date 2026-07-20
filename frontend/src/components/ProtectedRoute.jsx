import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  // 1. Chưa đăng nhập -> Về trang login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Đã đăng nhập nhưng không đúng quyền -> Về trang chủ
  if (allowedRoles && !allowedRoles.includes(user.Role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;