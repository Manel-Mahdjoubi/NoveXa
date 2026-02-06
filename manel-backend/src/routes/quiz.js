import express from 'express';
import { createQuiz, getQuiz, submitQuizResult } from '../controllers/quizController.js';
import { protect, restrictToTeacher, restrictToStudent } from '../middleware/auth.js';

const createQuizRoutes = (prisma) => {
  const router = express.Router();

  // Create quiz (teacher only)
  router.post('/create', protect, restrictToTeacher, createQuiz(prisma));

  // Get quiz by ID (can be public or verified)
  router.get('/:quizId', getQuiz(prisma));

  // Submit quiz result (students only)
  router.post('/submit', protect, restrictToStudent, submitQuizResult(prisma));

  return router;
};

export default createQuizRoutes;