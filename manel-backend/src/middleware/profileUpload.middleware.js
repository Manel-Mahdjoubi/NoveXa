import multer from 'multer';
import path from 'path';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';

// Switch to Memory Storage (No temp files)
const storage = multer.memoryStorage();

// File filter for profile photos only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, JPG, PNG, WebP)'), false);
  }
};

// Configure multer
export const uploadProfilePhoto = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper to upload buffer to Cloudinary using streams
const streamUpload = (buffer, options) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        Readable.from(buffer).pipe(stream);
    });
};

// Helper to upload to Cloudinary (Updated for memory storage)
export const uploadToCloudinary = async (fileBuffer, folder = 'novexa/profiles') => {
  console.log('[Cloudinary Helper] Starting upload to folder:', folder);
  try {
    const uploadOptions = {
        folder: folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false
    };

    const result = await streamUpload(fileBuffer, uploadOptions);

    console.log('[Cloudinary Helper] Upload successful. Result URL:', result.secure_url);

    return result.secure_url;
  } catch (error) {
    console.error('[Cloudinary Helper] ERROR:', error.message);
    throw error;
  }
};

// Helper to delete old profile photo
export const deleteOldProfilePhoto = async (photoPath) => {
  if (!photoPath) return;

  // Handle Cloudinary URLs
  if (photoPath.startsWith('http')) {
    try {
      // Extract public ID from URL
      // Format: https://res.cloudinary.com/cloudname/image/upload/v1234567/folder/publicid.jpg
      const parts = photoPath.split('/');
      const fileNameWithExt = parts.pop();
      const fileName = fileNameWithExt.split('.')[0];
      const uploadIndex = parts.indexOf('upload');
      const folder = parts.slice(uploadIndex + 2).join('/');
      const publicId = folder ? `${folder}/${fileName}` : fileName;

      console.log('[Cloudinary Helper] Deleting old asset:', publicId);
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('[Cloudinary Helper] Failed to delete old asset:', error.message);
    }
    return;
  }

  // Handle local files (only for legacy cleanup, though we are moving away from it)
  // We can leave this empty or keep it if there might still be old local paths in DB.
  // Ideally, we just ignore local paths if we are strictly cloud now, or keep it for transition.
  // I will keep a safe check but no-op or log only if we want to be strict.
  // For now, let's just log it.
  if (photoPath.startsWith('/uploads/')) {
      console.log('Skipping local file deletion for:', photoPath);
  }
};