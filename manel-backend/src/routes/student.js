/**
 * Student Routes
 * Defines all API endpoints for student-related operations
 */

import express from 'express';
import {
  getStudentsForTeacher,
  getStudentsByCourse,
  getAllStudents,
  getStudentById,
  getStudentQuizStats,
  getAllStudentsWithQuizStats
} from '../controllers/studentController.js';
import { verifyToken, isTeacher, isStudent } from '../middleware/authMiddleware.js';

export default (prisma) => {
  const router = express.Router();

  /**
   * @route   GET /api/students/teacher/:teacherId
   * @desc    Get all students enrolled in a teacher's courses
   * @access  Protected - Teachers only, can only see their own students
   * @params  teacherId - The ID of the teacher
   * @query   courseId - Optional: Filter by specific course ID
   * @query   courseName - Optional: Filter by course name (partial match)
   * @returns Array of students enrolled in the teacher's courses
   */
  router.get('/teacher/:teacherId', verifyToken, isTeacher, getStudentsForTeacher(prisma));

  /**
   * @route   GET /api/students/course/:courseId
   * @desc    Get all students enrolled in a specific course
   * @access  Protected - Teachers only, can only see students in their courses
   * @params  courseId - The ID of the course
   * @returns Array of students enrolled in the course
   */
  router.get('/course/:courseId', verifyToken, isTeacher, getStudentsByCourse(prisma));

  /**
   * @route   GET /api/students/with-quiz-stats
   * @desc    Get all students with quiz statistics included
   * @access  Protected - Teachers only
   * @query   field - Filter by study field
   * @query   search - Search by name or email
   * @returns Array of all students with quiz statistics
   */
  router.get('/with-quiz-stats', verifyToken, isTeacher, getAllStudentsWithQuizStats(prisma));

  /**
   * @route   GET /api/students/:studentId/quiz-stats
   * @desc    Get quiz statistics for a specific student
   * @access  Protected - Students can only see their own stats, teachers can see their students' stats
   * @params  studentId - The ID of the student
   * @returns Quiz statistics including completed quizzes, average scores, and course breakdown
   */
  router.get('/:studentId/quiz-stats', verifyToken, getStudentQuizStats(prisma));

  /**
   * @route   GET /api/students/:studentId
   * @desc    Get detailed information about a specific student
   * @access  Protected - Students can only see their own profile, teachers can see their students
   * @params  studentId - The ID of the student
   * @returns Student details with all their enrollments
   */
  router.get('/:studentId', verifyToken, getStudentById(prisma));

  /**
   * @route   GET /api/students
   * @desc    Get all students with optional filtering
   * @access  Protected - Teachers only
   * @query   field - Filter by study field
   * @query   search - Search by name or email
   * @returns Array of all students
   */
  router.get('/', verifyToken, isTeacher, getAllStudents(prisma));

  return router;
};