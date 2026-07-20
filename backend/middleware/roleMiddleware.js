export function requireRole(allowedRoles) {
  return (req, res, next) => {
    // Middleware này phải chạy sau requireAuth, nên req.user đã tồn tại
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập. Yêu cầu quyền Admin hoặc Staff." });
    }
    next();
  };
}