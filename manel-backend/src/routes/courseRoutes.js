import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  getCoursesByTeacher,
  updateCourse,
  requestCourseDeletion,
  handleCourseDeletionRequest,
  getPendingDeletionRequests,
  linkQuizToChapter,
  getQuizByChapter
} from '../controllers/courseController.js';
import { protect, restrictToTeacher } from '../middleware/auth.js';
import { uploadCourseFiles } from '../middleware/upload.middleware.js';
import { protectAdmin } from '../middleware/protectAdmin.js';

const router = express.Router();

// Public routes

router.get('/', getAllCourses);
router.get('/teacher/:teacherId', getCoursesByTeacher);
router.get('/:id', getCourseById);

// Quiz routes
router.get('/chapters/:chapterId/quiz', getQuizByChapter);
router.post('/chapters/:chapterId/quiz', protect, restrictToTeacher, linkQuizToChapter);

// Teacher routes
router.post('/', protect, restrictToTeacher, uploadCourseFiles, createCourse);
router.put('/:id', protect, restrictToTeacher, updateCourse);
router.post('/:id/request-deletion', protect, restrictToTeacher, requestCourseDeletion);
router.delete('/:id', protect, restrictToTeacher, requestCourseDeletion); // Kept for backward compatibility if needed

// Admin routes
router.get('/admin/deletion-requests', protect, protectAdmin, getPendingDeletionRequests);
router.post('/admin/deletion', protect, protectAdmin, handleCourseDeletionRequest);

export default router;