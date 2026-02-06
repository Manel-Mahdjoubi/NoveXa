/**
 * Teacher Routes
 * Defines all API endpoints for teacher-related operations
 */

import express from 'express';
import {
  getTeachersForStudent,
  getAllTeachers,
  getTeacherById,
  requestCourseDeletion,
  getMyDeletionRequests
} from '../controllers/teacherController.js';
import { verifyToken, isStudent } from '../middleware/authMiddleware.js';

export default (prisma) => {
  const router = express.Router();

  /**
   * @route   GET /api/teachers/student/:studentId
   * @desc    Get all teachers whose courses a specific student is enrolled in
   * @access  Protected - Students only, can only see their own teachers
   * @params  studentId - The ID of the student
   * @returns Array of teachers with their courses that the student is enrolled in
   */
  router.get('/student/:studentId', verifyToken, isStudent, getTeachersForStudent(prisma));

  /**
   * @route   POST /api/teachers/deletion-request
   * @desc    Request deletion of a course
   * @access  Protected - Teachers only
   * @body    courseId, reason
   * @returns Deletion request confirmation
   */
  router.post('/deletion-request', verifyToken, requestCourseDeletion(prisma));

  /**
   * @route   GET /api/teachers/deletion-requests
   * @desc    Get all deletion requests for the teacher's courses
   * @access  Protected - Teachers only
   * @returns Array of deletion requests
   */
  router.get('/deletion-requests', verifyToken, getMyDeletionRequests(prisma));

  /**
   * @route   GET /api/teachers/:teacherId
   * @desc    Get detailed information about a specific teacher
   * @access  Protected - Authenticated users only
   * @params  teacherId - The ID of the teacher
   * @returns Teacher details with all their courses
   */
  router.get('/:teacherId', verifyToken, getTeacherById(prisma));

  /**
   * @route   GET /api/teachers
   * @desc    Get all teachers with optional filtering
   * @access  Public - Anyone can browse teachers
   * @query   field - Filter by study field
   * @query   search - Search by name or email
   * @returns Array of all teachers
   */
  router.get('/', getAllTeachers(prisma));

  return router;
};