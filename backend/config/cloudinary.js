import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cinema_db_media', // Tên thư mục trên Cloudinary
    resource_type: 'auto', // Tự động nhận diện loại file (ảnh/video)
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov', 'avi'],
  },
});

export const upload = multer({ storage: storage });