import express from 'express';
import {
  registerTeacher,
  registerStudent,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  deleteTeacher
} from '../controllers/authController.js';
import { protect, restrictToTeacher } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register/teacher', registerTeacher);
router.post('/register/student', registerStudent);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Delete a teacher by ID (only teachers allowed)
router.delete('/teacher/:id', protect, restrictToTeacher, deleteTeacher);

export default router;