import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminMoviesPage from './pages/admin/AdminMoviesPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminShowtimesPage from './pages/admin/AdminShowtimesPage';
import AdminSeatsPage from './pages/admin/AdminSeatsPage';
import AdminVouchersPage from './pages/admin/AdminVouchersPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminChatPage from './pages/admin/AdminChatPage';
import AdminSnacksPage from './pages/admin/AdminSnacksPage';
import BookingPage from './pages/BookingPage';
import MovieDetailsPage from './pages/MovieDetailsPage';
import PaymentPage from './pages/PaymentPage';
import MyTicketsPage from './pages/MyTicketsPage';
import ShowtimesPage from './pages/ShowtimesPage';
import NewsPage from './pages/NewsPage';
import SnacksPage from './pages/SnacksPage';
import MoviesPage from './pages/MoviesPage'; // Re-add this import
import LuckyWheelPage from './pages/LuckyWheelPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ErrorPage from './pages/ErrorPage';
function App() {
  return (
    <Routes>
      {/* --- ROUTES CHO USER (Layout Header/Footer thông thường) --- */}
      <Route
        element={
          <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Outlet />
            </main>
            <Footer />
          </div>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="movies/:id" element={<MovieDetailsPage />} />
        <Route path="booking/:showtimeId" element={<BookingPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="my-tickets" element={<MyTicketsPage />} />
        <Route path="showtimes" element={<ShowtimesPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="lucky-wheel" element={<LuckyWheelPage />} />
        <Route path="movies" element={<MoviesPage />} /> {/* Re-add this route */}
        <Route path="snacks" element={<SnacksPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Route bắt tất cả các đường dẫn không hợp lệ (404) */}
      <Route path="*" element={<ErrorPage />} />

      {/* --- ROUTES CHO ADMIN (Layout riêng, cần đăng nhập) --- */}
      <Route element={<ProtectedRoute allowedRoles={['Admin', 'Staff']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="movies" element={<AdminMoviesPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="rooms/:roomId/seats" element={<AdminSeatsPage />} />
          <Route path="showtimes" element={<AdminShowtimesPage />} />
          <Route path="vouchers" element={<AdminVouchersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="snacks" element={<AdminSnacksPage />} />
          <Route path="profile" element={<ProfilePage />} />
          {/* Thêm các route admin con tại đây: movies, users, etc. */}
        </Route>
      </Route>

    </Routes>
  );
}

export default App;