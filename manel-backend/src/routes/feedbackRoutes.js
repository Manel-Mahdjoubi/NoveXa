import express from 'express';
import {
  submitFeedback,
  getFeedbackByCourse,
  getFeedbackByTeacher,
  getMyFeedback,
  updateFeedback,
  deleteFeedback,
  canSubmitFeedback
} from '../controllers/feedbackController.js';
import { protect, restrictToStudent } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/course/:courseId', getFeedbackByCourse);
router.get('/teacher/:teacherId', getFeedbackByTeacher);

// Student routes (protected)
router.post('/', protect, restrictToStudent, submitFeedback);
router.get('/my-feedback', protect, restrictToStudent, getMyFeedback);
router.get('/can-submit/:courseId', protect, restrictToStudent, canSubmitFeedback);
router.put('/:feedbackId', protect, restrictToStudent, updateFeedback);
router.delete('/:feedbackId', protect, restrictToStudent, deleteFeedback);

export default router;