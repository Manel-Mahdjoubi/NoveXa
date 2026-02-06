import express from 'express';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import { checkEnrollmentOrTeacher } from '../middleware/enrollmentCheck.js';

const router = express.Router();

/**
 * @desc    Serve protected course files
 * @route   GET /api/files/courses/:courseId/:chapterId/:lectureId/:filename
 * @access  Private (enrolled students or course teacher)
 */
router.get(
  '/courses/:courseId/:chapterId/:lectureId/:filename',
  protect,
  checkEnrollmentOrTeacher,
  async (req, res) => {
    try {
      const { courseId, chapterId, lectureId, filename } = req.params;

      // Construct file path
      const filePath = path.join('uploads', 'courses', courseId, chapterId, lectureId, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ message: 'Error serving file' });
    }
  }
);

export default router;