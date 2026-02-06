import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Enroll student in a course
 * @route   POST /api/enrollment/enroll
 * @access  Private/Student
 */
export const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.S_id;

  if (!courseId) {
    res.status(400);
    throw new Error('Course ID is required');
  }

  const courseIdInt = parseInt(courseId);
  
  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Check if course exists
  const course = await prisma.course.findUnique({
    where: { C_id: courseIdInt }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  if (existingEnrollment) {
    res.status(400);
    throw new Error('You are already enrolled in this course');
  }

  // Check if course is full
  const enrollmentCount = await prisma.enrollment.count({
    where: { courseId: courseIdInt }
  });

  if (enrollmentCount >= course.C_maxstud) {
    res.status(400);
    throw new Error('Course is full. Maximum students reached.');
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: studentId,
      courseId: courseIdInt,
      progress: {} 
    },
    include: {
      Course: {
        select: {
          C_id: true,
          C_title: true,
          C_image: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Successfully enrolled in course',
    enrollment
  });
});

/**
 * @desc    Get all enrollments for current student
 * @route   GET /api/enrollment/my-courses
 * @access  Private/Student
 */
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const studentId = req.user.S_id;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentId },
    include: {
      Course: {
        include: {
          Teacher: {
            select: {
              T_id: true,
              T_firstname: true,
              T_lastname: true,
              T_pfp: true
            }
          },
          Chapter: {
            select: {
              chap_id: true,
              chap_title: true
            }
          }
        }
      }
    },
    orderBy: { enrolledAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    count: enrollments.length,
    enrollments
  });
});

/**
 * @desc    Check if student is enrolled in a course
 * @route   GET /api/enrollment/check/:courseId
 * @access  Private/Student
 */
export const checkEnrollmentStatus = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.S_id;

  const courseIdInt = parseInt(courseId);
  
  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  res.status(200).json({
    success: true,
    isEnrolled: !!enrollment,
    enrollmentDate: enrollment?.enrolledAt || null
  });
});

/**
 * @desc    Unenroll from a course
 * @route   DELETE /api/enrollment/unenroll/:courseId
 * @access  Private/Student
 */
export const unenrollFromCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.S_id;

  const courseIdInt = parseInt(courseId);
  
  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  await prisma.enrollment.delete({
    where: {
      enrollment_id: enrollment.enrollment_id
    }
  });

  res.status(200).json({
    success: true,
    message: 'Successfully unenrolled from course'
  });
});