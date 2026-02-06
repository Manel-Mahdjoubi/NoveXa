import express from 'express';
import {
  enrollInCourse,
  getMyEnrollments,
  checkEnrollmentStatus,
  unenrollFromCourse
} from '../controllers/enrollmentController.js';
import { protect, restrictToStudent } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and student-only
router.use(protect, restrictToStudent);

router.post('/enroll', enrollInCourse);
router.get('/my-courses', getMyEnrollments);
router.get('/check/:courseId', checkEnrollmentStatus);
router.delete('/unenroll/:courseId', unenrollFromCourse);

export default router;