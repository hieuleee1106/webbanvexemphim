import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const EditMoviePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    Title: '',
    Genre: '',
    Duration: '',
    Description: '',
    TrailerURL: ''
  });
  const [poster, setPoster] = useState(null);
  const [currentPoster, setCurrentPoster] = useState('');

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`/api/movies/${id}`);
        const data = await res.json();
        if (data.success) {
          setFormData({
            Title: data.data.Title,
            Genre: data.data.Genre,
            Duration: data.data.Duration,
            Description: data.data.Description,
            TrailerURL: data.data.TrailerURL || ''
          });
          setCurrentPoster(data.data.Poster);
        }
      } catch (error) {
        console.error("Lỗi tải phim:", error);
      }
    };
    fetchMovie();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.name === 'poster') setPoster(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = new FormData();
      data.append('Title', formData.Title);
      data.append('Genre', formData.Genre);
      data.append('Duration', formData.Duration);
      data.append('Description', formData.Description);
      data.append('TrailerURL', formData.TrailerURL);
      
      // Chỉ gửi poster nếu người dùng chọn ảnh mới
      if (poster) {
        data.append('poster', poster);
      } else {
        data.append('Poster', currentPoster); // Giữ nguyên ảnh cũ
      }

      const res = await fetch(`/api/movies/${id}`, {
        method: 'PUT',
        headers: {
           'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: data
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      showNotification('Cập nhật phim thành công!');
      navigate('/admin/movies');
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Cập Nhật Phim</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên phim</label>
          <input type="text" name="Title" value={formData.Title} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thể loại</label>
            <input type="text" name="Genre" value={formData.Genre} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thời lượng (phút)</label>
            <input type="number" name="Duration" value={formData.Duration} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
          <textarea name="Description" rows="4" value={formData.Description} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poster (Để trống nếu giữ nguyên)</label>
          <input type="file" name="poster" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500"/>
          {currentPoster && <img src={currentPoster} alt="Current" className="mt-2 h-20 object-cover rounded"/>}
        </div>

        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
          {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </form>
    </div>
  );
};

export default EditMoviePage;