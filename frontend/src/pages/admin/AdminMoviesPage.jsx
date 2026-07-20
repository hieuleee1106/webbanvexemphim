import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const AdminMoviesPage = () => {
  const { notify } = useAuth();
  
  // --- STATE QUẢN LÝ GIAO DIỆN ---
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    id: null, 
    title: '', 
    message: '' 
  });

  // --- STATE DỮ LIỆU ---
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- STATE FORM ---
  const [formData, setFormData] = useState({
    Title: '',
    Genre: '',
    Duration: '',
    Description: '',
    TrailerURL: '',
    Director: '',
    Cast: '',
    ReleaseDate: '',
    Language: '',
    Rated: ''
  });
  const [poster, setPoster] = useState(null);
  const [currentPoster, setCurrentPoster] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    fetchMovies();
  }, []);

  // --- API CALLS ---
  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/movies');
      if (!res.ok) throw new Error('Không thể tải danh sách phim');
      const data = await res.json();
      setMovies(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovieDetail = async (id) => {
    try {
      const res = await fetch(`/api/movies/${id}`);
      const data = await res.json();
      if (data.success) {
        setFormData({
          Title: data.data.Title,
          Genre: data.data.Genre,
          Duration: data.data.Duration,
          Description: data.data.Description,
          TrailerURL: data.data.TrailerURL || '',
          Director: data.data.Director || '',
          Cast: data.data.Cast || '',
          ReleaseDate: data.data.ReleaseDate ? data.data.ReleaseDate.split('T')[0] : '',
          Language: data.data.Language || '',
          Rated: data.data.Rated || ''
        });
        setCurrentPoster(data.data.Poster);
      }
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      notify.error("Lỗi tải thông tin phim");
      setView('list');
    }
  };

  const handleDelete = async (MovieID) => {
    try {
      const res = await fetch(`/api/movies/${MovieID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cinema-token')}` }
      });
      if (!res.ok) throw new Error('Không thể xóa phim');
      setMovies(movies.filter(movie => movie.MovieID !== MovieID));
      notify.success("Xóa phim thành công!");
    } catch (error) {
      console.error("Lỗi xóa phim:", error);
      notify.error("Lỗi xóa phim: " + error.message);
    } finally {
      setConfirmModal({ ...confirmModal, isOpen: false });
    }
  };

  const triggerDelete = (id, title) => {
    setConfirmModal({
      isOpen: true,
      id,
      title: 'Xóa phim',
      message: `Bạn có chắc chắn muốn xóa phim "${title}"? Hành động này không thể hoàn tác.`
    });
  };

  // --- FORM HANDLERS ---
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.name === 'poster') setPoster(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const data = new FormData();
      data.append('Title', formData.Title);
      data.append('Genre', formData.Genre);
      data.append('Duration', formData.Duration);
      data.append('Description', formData.Description);
      data.append('TrailerURL', formData.TrailerURL);
      data.append('Director', formData.Director);
      data.append('Cast', formData.Cast);
      data.append('ReleaseDate', formData.ReleaseDate);
      data.append('Language', formData.Language);
      data.append('Rated', formData.Rated);
      
      if (isEditing) {
        // Logic cho Sửa
        if (poster) data.append('poster', poster);
        else data.append('Poster', currentPoster);
      } else {
        // Logic cho Thêm
        if (poster) data.append('poster', poster);
      }

      const url = isEditing ? `/api/movies/${editId}` : '/api/movies';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
           'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: data
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      notify.success(isEditing ? 'Cập nhật phim thành công!' : 'Thêm phim thành công!');
      fetchMovies(); // Load lại danh sách
      switchToList();
    } catch (error) {
      notify.error('Lỗi: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  // --- NAVIGATION HELPERS ---
  const resetForm = () => {
    setFormData({ Title: '', Genre: '', Duration: '', Description: '', TrailerURL: '', Director: '', Cast: '', ReleaseDate: '', Language: '', Rated: '' });
    setPoster(null);
    setCurrentPoster('');
    setIsEditing(false);
    setEditId(null);
  };

  const switchToAdd = () => {
    resetForm();
    setIsEditing(false);
    setView('form');
  };

  const switchToEdit = (id) => {
    resetForm();
    setIsEditing(true);
    setEditId(id);
    setView('form');
    fetchMovieDetail(id);
  };

  const switchToList = () => {
    setView('list');
    resetForm();
  };

  // --- RENDER ---
  if (view === 'form') {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isEditing ? 'Cập Nhật Phim' : 'Thêm Phim Mới'}
          </h2>
          <button 
            onClick={switchToList}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Hủy bỏ
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên phim</label>
            <input type="text" name="Title" value={formData.Title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thể loại</label>
              <input type="text" name="Genre" value={formData.Genre} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thời lượng (phút)</label>
              <input type="number" name="Duration" value={formData.Duration} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Đạo diễn</label>
              <input type="text" name="Director" value={formData.Director} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ngôn ngữ</label>
              <input type="text" name="Language" value={formData.Language} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Diễn viên chính</label>
            <input type="text" name="Cast" value={formData.Cast} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ngày khởi chiếu</label>
              <input type="date" name="ReleaseDate" value={formData.ReleaseDate} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phân loại (Rated)</label>
              <select name="Rated" value={formData.Rated} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50">
                <option value="">-- Chọn --</option>
                <option value="P">P - Mọi lứa tuổi</option>
                <option value="K">K - Dưới 13 tuổi (có giám hộ)</option>
                <option value="T13">T13 - Từ 13 tuổi</option>
                <option value="T16">T16 - Từ 16 tuổi</option>
                <option value="T18">T18 - Từ 18 tuổi</option>
                <option value="C">C - Cấm chiếu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
            <textarea name="Description" rows="4" value={formData.Description} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poster {isEditing && '(Để trống nếu giữ nguyên)'}</label>
            <input type="file" name="poster" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
            {isEditing && currentPoster && <img src={currentPoster} alt="Current" className="mt-2 h-20 object-cover rounded"/>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Trailer YouTube</label>
            <input 
              type="text" 
              name="TrailerURL" 
              value={formData.TrailerURL} 
              onChange={handleInputChange} 
              placeholder="https://www.youtube.com/watch?v=..." 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" 
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={formLoading} className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50">
              {formLoading ? 'Đang xử lý...' : (isEditing ? 'Lưu Thay Đổi' : 'Thêm Phim')}
            </button>
            <button type="button" onClick={switchToList} className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
              Quay lại
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Phim</h2>
        <button 
          onClick={switchToAdd}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm Phim Mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Poster</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tên Phim</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Thể loại</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Thời lượng</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-4">Đang tải dữ liệu...</td></tr>
            ) : error ? (
              <tr><td colSpan="5" className="text-center py-4 text-red-500">{error}</td></tr>
            ) : movies.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4">Không có phim nào.</td></tr>
            ) : (
              movies.map((movie) => (
                <tr key={movie.MovieID}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                    <img src={movie.Poster} alt={movie.Title} className="w-16 h-24 object-cover rounded" onError={(e) => {e.target.onerror=null; e.target.src='https://via.placeholder.com/64x96?text=No+Img'}}/>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                    <p className="text-gray-900 dark:text-gray-300 font-semibold">{movie.Title}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                    <p className="text-gray-900 dark:text-gray-300">{movie.Genre}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                    <p className="text-gray-900 dark:text-gray-300">{movie.Duration} phút</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white dark:bg-gray-800 text-sm">
                    <button onClick={() => switchToEdit(movie.MovieID)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg> Sửa
                    </button>
                  <button onClick={() => triggerDelete(movie.MovieID, movie.Title)} className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg> Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => handleDelete(confirmModal.id)}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default AdminMoviesPage;
