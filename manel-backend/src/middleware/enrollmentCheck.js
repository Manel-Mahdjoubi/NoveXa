import { prisma } from '../config/db.js';
import { asyncHandler } from './errorHandler.js';

/**
 * Middleware to check if student is enrolled in a course
 * Requires protect middleware to run first
 */
export const checkEnrollment = asyncHandler(async (req, res, next) => {
  // Only students can be enrolled
  if (req.user.role !== 'student') {
    res.status(403);
    throw new Error('Only students can access enrolled courses');
  }

  const courseId = parseInt(req.params.courseId || req.params.id);
  
  if (isNaN(courseId)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  const studentId = req.user.S_id || req.user.id;

  // Check if enrollment exists
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseId
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You are not enrolled in this course. Please enroll first.');
  }

  // Attach enrollment to request for use in controllers
  req.enrollment = enrollment;
  next();
});

/**
 * Middleware to allow both enrolled students AND course teacher
 * Useful for file access routes
 */
export const checkEnrollmentOrTeacher = asyncHandler(async (req, res, next) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.T_id || req.user.S_id;
  const userRole = req.user.role;

  if (isNaN(courseId)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Get course info
  const course = await prisma.course.findUnique({
    where: { C_id: courseId },
    select: { teacherId: true }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if user is the teacher
  if (userRole === 'teacher' && course.teacherId === userId) {
    return next();
  }

  // Check if user is an enrolled student
  if (userRole === 'student') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId: courseId
        }
      }
    });

    if (enrollment) {
      req.enrollment = enrollment;
      return next();
    }
  }

  res.status(403);
  throw new Error('Access denied. You must be enrolled or be the course teacher.');
});