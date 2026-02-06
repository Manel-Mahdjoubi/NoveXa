import express from 'express';
import {
  getCourseLearningContent,
  getLectureDetails,
  updateLectureProgress
} from '../controllers/learningController.js';
import { getCourseCompletionStatus } from '../controllers/completionController.js';
import { protect, restrictToStudent } from '../middleware/auth.js';
import { checkEnrollment } from '../middleware/enrollmentCheck.js';

const router = express.Router();

// All routes require authentication and student role
router.use(protect, restrictToStudent);

// Get course learning content (requires enrollment)
router.get('/course/:courseId', checkEnrollment, getCourseLearningContent);

// Get completion status
router.get('/course/:courseId/completion-status', checkEnrollment, getCourseCompletionStatus);

// Get lecture details (enrollment checked inside controller)
router.get('/lecture/:lectureId', getLectureDetails);

// Update progress
router.post('/progress/lecture', updateLectureProgress);

export default router;