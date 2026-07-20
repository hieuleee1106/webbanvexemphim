import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hiệu ứng này có thể được sử dụng để xác thực lại người dùng từ token khi tải trang
  useEffect(() => {
    const token = localStorage.getItem('cinema-token');
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          login(data.user);
        } else {
          logout(true); // Token hết hạn hoặc không hợp lệ
        }
      })
      .catch(() => logout())
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const updateUserProfile = (updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
  };

  const logout = (isExpired = false) => {
    setUser(null);
    localStorage.removeItem('cinema-token');
    if (isExpired) {
      toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    }
  };
  
  const notify = {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    info: (message) => toast.info(message),
    warning: (message) => toast.warning(message),
  };

  const value = { 
    user, 
    login, 
    logout, 
    notify, 
    updateUserProfile, 
    isAuthenticated: !!user 
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};