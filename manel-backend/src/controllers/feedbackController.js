import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Submit feedback for a course and teacher
 * @route   POST /api/feedback
 * @access  Private/Student (must be enrolled)
 */
export const submitFeedback = asyncHandler(async (req, res) => {
  const {
    courseId,
    teacherId,
    teacherComment,
    courseComment,
    teacherRating,
    courseRating
  } = req.body;

  const studentId = req.user.S_id;

  // ========================================
  // VALIDATION
  // ========================================

  // Validate required fields
  if (!courseId || !teacherId) {
    res.status(400);
    throw new Error('Course ID and Teacher ID are required');
  }

  if (!teacherComment?.trim()) {
    res.status(400);
    throw new Error('Teacher feedback is required');
  }

  if (teacherComment.trim().length < 10) {
    res.status(400);
    throw new Error('Teacher feedback must be at least 10 characters');
  }

  if (!courseComment?.trim()) {
    res.status(400);
    throw new Error('Course feedback is required');
  }

  if (courseComment.trim().length < 10) {
    res.status(400);
    throw new Error('Course feedback must be at least 10 characters');
  }

  // Validate ratings (1-5)
  if (!teacherRating || teacherRating < 1 || teacherRating > 5) {
    res.status(400);
    throw new Error('Teacher rating must be between 1 and 5');
  }

  if (!courseRating || courseRating < 1 || courseRating > 5) {
    res.status(400);
    throw new Error('Course rating must be between 1 and 5');
  }

  // ========================================
  // CHECK ENROLLMENT
  // ========================================

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: parseInt(courseId)
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You must be enrolled in this course to submit feedback');
  }

  // ========================================
  // VERIFY COURSE AND TEACHER
  // ========================================

  const course = await prisma.course.findUnique({
    where: { C_id: parseInt(courseId) },
    select: { teacherId: true, C_title: true }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacherId !== parseInt(teacherId)) {
    res.status(400);
    throw new Error('Teacher does not teach this course');
  }

  // ========================================
  // CHECK FOR EXISTING FEEDBACK
  // ========================================

  const existingFeedback = await prisma.feedback.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: parseInt(courseId)
      }
    }
  });

  if (existingFeedback) {
    res.status(400);
    throw new Error('You have already submitted feedback for this course');
  }

  // ========================================
  // CHECK COURSE COMPLETION
  // ========================================
  
  // Refresh course data with chapters and lectures
  const fullCourse = await prisma.course.findUnique({
    where: { C_id: parseInt(courseId) },
    include: {
      Chapter: {
        include: {
          Lecture: true
        }
      }
    }
  });

  const totalLectures = fullCourse.Chapter.reduce((sum, chap) => sum + chap.Lecture.length, 0);
  const progress = enrollment.progress || {};
  const lectureProgress = progress.lectures || {};
  const completedLecturesCount = Object.values(lectureProgress).filter(l => l.completed).length;

  if (completedLecturesCount < totalLectures) {
    res.status(403);
    throw new Error('Course not completed. Finish all lectures before submitting feedback.');
  }

  // ========================================
  // CREATE FEEDBACK
  // ========================================

  const feedback = await prisma.feedback.create({
    data: {
      studentId: studentId,
      courseId: parseInt(courseId),
      teacherId: parseInt(teacherId),
      teacherComment: teacherComment.trim(),
      courseComment: courseComment.trim(),
      teacherRating: parseInt(teacherRating),
      courseRating: parseInt(courseRating)
    },
    include: {
      Student: {
        select: {
          S_firstname: true,
          S_lastname: true,
          S_email: true
        }
      },
      Course: {
        select: {
          C_title: true
        }
      },
      Teacher: {
        select: {
          T_firstname: true,
          T_lastname: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    feedback
  });
});

/**
 * @desc    Get all feedback for a specific course
 * @route   GET /api/feedback/course/:courseId
 * @access  Public
 */
export const getFeedbackByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const courseIdInt = parseInt(courseId);

  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  const feedback = await prisma.feedback.findMany({
    where: { courseId: courseIdInt },
    include: {
      Student: {
        select: {
          S_firstname: true,
          S_lastname: true,
          S_pfp: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Calculate average ratings
  const avgTeacherRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.teacherRating, 0) / feedback.length
    : 0;

  const avgCourseRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.courseRating, 0) / feedback.length
    : 0;

  res.status(200).json({
    success: true,
    count: feedback.length,
    averageTeacherRating: Math.round(avgTeacherRating * 10) / 10,
    averageCourseRating: Math.round(avgCourseRating * 10) / 10,
    feedback
  });
});

/**
 * @desc    Get all feedback for a specific teacher
 * @route   GET /api/feedback/teacher/:teacherId
 * @access  Public
 */
export const getFeedbackByTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const teacherIdInt = parseInt(teacherId);

  if (isNaN(teacherIdInt)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }

  const feedback = await prisma.feedback.findMany({
    where: { teacherId: teacherIdInt },
    include: {
      Student: {
        select: {
          S_firstname: true,
          S_lastname: true,
          S_pfp: true
        }
      },
      Course: {
        select: {
          C_title: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Calculate average teacher rating
  const avgTeacherRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.teacherRating, 0) / feedback.length
    : 0;

  res.status(200).json({
    success: true,
    count: feedback.length,
    averageTeacherRating: Math.round(avgTeacherRating * 10) / 10,
    feedback
  });
});

/**
 * @desc    Get feedback submitted by current student
 * @route   GET /api/feedback/my-feedback
 * @access  Private/Student
 */
export const getMyFeedback = asyncHandler(async (req, res) => {
  const studentId = req.user.S_id;

  const feedback = await prisma.feedback.findMany({
    where: { studentId: studentId },
    include: {
      Course: {
        select: {
          C_title: true,
          C_image: true
        }
      },
      Teacher: {
        select: {
          T_firstname: true,
          T_lastname: true,
          T_pfp: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  res.status(200).json({
    success: true,
    count: feedback.length,
    feedback
  });
});

/**
 * @desc    Update existing feedback
 * @route   PUT /api/feedback/:feedbackId
 * @access  Private/Student (own feedback only)
 */
export const updateFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const studentId = req.user.S_id;

  const {
    teacherComment,
    courseComment,
    teacherRating,
    courseRating
  } = req.body;

  const feedbackIdInt = parseInt(feedbackId);

  if (isNaN(feedbackIdInt)) {
    res.status(400);
    throw new Error('Invalid feedback ID');
  }

  // Check if feedback exists and belongs to student
  const existingFeedback = await prisma.feedback.findUnique({
    where: { feedback_id: feedbackIdInt }
  });

  if (!existingFeedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (existingFeedback.studentId !== studentId) {
    res.status(403);
    throw new Error('Not authorized to update this feedback');
  }

  // Validate if provided
  if (teacherComment && teacherComment.trim().length < 10) {
    res.status(400);
    throw new Error('Teacher feedback must be at least 10 characters');
  }

  if (courseComment && courseComment.trim().length < 10) {
    res.status(400);
    throw new Error('Course feedback must be at least 10 characters');
  }

  if (teacherRating && (teacherRating < 1 || teacherRating > 5)) {
    res.status(400);
    throw new Error('Teacher rating must be between 1 and 5');
  }

  if (courseRating && (courseRating < 1 || courseRating > 5)) {
    res.status(400);
    throw new Error('Course rating must be between 1 and 5');
  }

  // Update feedback
  const updatedFeedback = await prisma.feedback.update({
    where: { feedback_id: feedbackIdInt },
    data: {
      ...(teacherComment && { teacherComment: teacherComment.trim() }),
      ...(courseComment && { courseComment: courseComment.trim() }),
      ...(teacherRating && { teacherRating: parseInt(teacherRating) }),
      ...(courseRating && { courseRating: parseInt(courseRating) })
    },
    include: {
      Student: {
        select: {
          S_firstname: true,
          S_lastname: true
        }
      },
      Course: {
        select: {
          C_title: true
        }
      },
      Teacher: {
        select: {
          T_firstname: true,
          T_lastname: true
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Feedback updated successfully',
    feedback: updatedFeedback
  });
});

/**
 * @desc    Delete feedback
 * @route   DELETE /api/feedback/:feedbackId
 * @access  Private/Student (own feedback only)
 */
export const deleteFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const studentId = req.user.S_id;

  const feedbackIdInt = parseInt(feedbackId);

  if (isNaN(feedbackIdInt)) {
    res.status(400);
    throw new Error('Invalid feedback ID');
  }

  // Check if feedback exists and belongs to student
  const existingFeedback = await prisma.feedback.findUnique({
    where: { feedback_id: feedbackIdInt }
  });

  if (!existingFeedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (existingFeedback.studentId !== studentId) {
    res.status(403);
    throw new Error('Not authorized to delete this feedback');
  }

  await prisma.feedback.delete({
    where: { feedback_id: feedbackIdInt }
  });

  res.status(200).json({
    success: true,
    message: 'Feedback deleted successfully'
  });
});

/**
 * @desc    Check if student can submit feedback for a course
 * @route   GET /api/feedback/can-submit/:courseId
 * @access  Private/Student
 */
export const canSubmitFeedback = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.S_id;
  const courseIdInt = parseInt(courseId);

  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  if (!enrollment) {
    return res.status(200).json({
      success: true,
      canSubmit: false,
      reason: 'Not enrolled in this course'
    });
  }

  // Check existing feedback
  const existingFeedback = await prisma.feedback.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  if (existingFeedback) {
    return res.status(200).json({
      success: true,
      canSubmit: false,
      reason: 'Feedback already submitted'
    });
  }

  // Check course completion
  const course = await prisma.course.findUnique({
    where: { C_id: courseIdInt },
    include: {
      Chapter: {
        include: {
          Lecture: true
        }
      }
    }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const totalLectures = course.Chapter.reduce((sum, chap) => sum + chap.Lecture.length, 0);
  
  // Get progress data
  const progress = enrollment.progress || {};
  const lectureProgress = progress.lectures || {};
  const completedLecturesCount = Object.values(lectureProgress).filter(l => l.completed).length;

  if (completedLecturesCount < totalLectures) {
    return res.status(200).json({
      success: true,
      canSubmit: false,
      reason: 'Course not completed. Finish all lectures to submit feedback.',
      progress: {
        completed: completedLecturesCount,
        total: totalLectures
      }
    });
  }

  res.status(200).json({
    success: true,
    canSubmit: true
  });
});