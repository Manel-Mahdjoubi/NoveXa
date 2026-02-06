import multer from 'multer';
import path from 'path';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';

// Switch to Memory Storage (No temp files)
const storage = multer.memoryStorage();

// File filter (unchanged)
const fileFilter = (req, file, cb) => {
  // Course image
  if (file.fieldname === 'courseImage') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Course image must be an image file'), false);
    }
  }
  // Videos
  else if (file.fieldname.startsWith('video_')) {
    const allowedVideoMimes = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi'
    ];
    if (allowedVideoMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for lecture videos'), false);
    }
  }
  // Files
  else if (file.fieldname.includes('files')) {
    cb(null, true); // Allow all file types for simplicity or keep validation if needed
  } else {
    cb(null, true);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit per file
  }
});

export const uploadCourseFiles = upload.any();

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

export const organizeFiles = async (courseId, chapterId, lectureId, fileObject) => {
  try {
    if (!fileObject || !fileObject.buffer) {
        throw new Error('No file buffer found');
    }

    // Determine resource type
    const ext = path.extname(fileObject.originalname).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.avi', '.wmv', '.mkv', '.webm'].includes(ext);
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    const resourceType = isVideo ? 'video' : (isImage ? 'image' : 'raw');

    // Cloudinary folder path
    const folderPath = `novexa/courses/${courseId}/${chapterId}`;
    
    // Upload options
    const uploadOptions = {
        folder: folderPath,
        resource_type: resourceType,
        access_mode: "public", // Ensures the resource is publicly accessible
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        timeout: 600000 // 10 minutes timeout
    };

    console.log(`Uploading ${resourceType} to Cloudinary (Stream)...`);
    
    // Perform stream upload
    const result = await streamUpload(fileObject.buffer, uploadOptions);

    console.log(`Cloudinary Upload Success: ${result.secure_url}`);

    return {
      url: result.secure_url,
      duration: isVideo ? result.duration : null,
      resourceType: result.resource_type
    };
    
  } catch (error) {
    console.error('Cloudinary stream upload failed:', error);
    throw new Error(`Upload failed for ${fileObject.originalname}: ${error.message}`);
  }
};

// Helper to clean up temp files (No-op now since we use memory)
export const cleanupTempFiles = (files) => {
  // No files to clean up
};
