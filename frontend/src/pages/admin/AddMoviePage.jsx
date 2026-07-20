import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';

const AddMoviePage = () => {
  const [formData, setFormData] = useState({
    Title: '',
    Genre: '',
    Duration: '',
    Description: '',
    TrailerURL: ''
  });
  const [poster, setPoster] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { showNotification } = useAuth();

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
      if (poster) data.append('poster', poster);

      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: {
           // Khi dùng FormData, KHÔNG set Content-Type thủ công, để browser tự set boundary
           'Authorization': `Bearer ${localStorage.getItem('cinema-token')}`
        },
        body: data
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      showNotification('Thêm phim thành công!');
      navigate('/admin/movies'); // Chuyển hướng về danh sách phim
    } catch (error) {
      console.error(error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Thêm Phim Mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên phim</label>
          <input type="text" name="Title" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thể loại</label>
            <input type="text" name="Genre" onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thời lượng (phút)</label>
            <input type="number" name="Duration" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
          <textarea name="Description" rows="4" onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poster (Ảnh)</label>
          <input type="file" name="poster" accept="image/*" required onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Trailer YouTube</label>
          <input 
            type="text" 
            name="TrailerURL" 
            placeholder="Ví dụ: https://www.youtube.com/watch?v=..." 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" 
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center disabled:opacity-50 text-base"
          >
            {isLoading ? 'Đang tải lên Cloudinary...' : 'Lưu Phim'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddMoviePage;