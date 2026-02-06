import express from 'express';
import {
  verifyQuizAccess,
  getQuizStatus,
  recordQuizAttempt
} from '../controllers/quizAccessController.js';
import { protect, restrictToStudent } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and student role
router.use(protect, restrictToStudent);

router.post('/verify', verifyQuizAccess);
router.get('/status/:chapterId', getQuizStatus);
router.post('/start-attempt', recordQuizAttempt);

export default router;