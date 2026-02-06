import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Get overall course completion status for a student
 * @route   GET /api/learning/course/:courseId/completion-status
 * @access  Private/Student
 */
export const getCourseCompletionStatus = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.S_id || req.user.id;

  const courseIdInt = parseInt(courseId);

  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Get course with all chapters and their lectures/quizzes
  const course = await prisma.course.findUnique({
    where: { C_id: courseIdInt },
    include: {
      Chapter: {
        include: {
          Lecture: {
            select: { lec_id: true }
          },
          Quiz: {
            select: { quiz_id: true }
          }
        }
      }
    }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Get enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: parseInt(studentId),
        courseId: courseIdInt
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You are not enrolled in this course');
  }

  const progress = enrollment.progress || {};
  const lectureProgress = progress.lectures || {};
  const quizProgress = progress.quizzes || {};

  // Calculate completion
  let totalLectures = 0;
  let completedLectures = 0;
  let totalQuizzes = 0;
  let completedQuizzes = 0;

  course.Chapter.forEach(chapter => {
    // Count lectures
    totalLectures += chapter.Lecture.length;
    chapter.Lecture.forEach(lecture => {
      if (lectureProgress[lecture.lec_id] && lectureProgress[lecture.lec_id].completed) {
        completedLectures++;
      }
    });

    // Count quizzes
    if (chapter.Quiz) {
      totalQuizzes += 1;
      if (quizProgress[chapter.Quiz.quiz_id] && quizProgress[chapter.Quiz.quiz_id].completed) {
        completedQuizzes++;
      }
    }
  });

  const totalItems = totalLectures + totalQuizzes;
  const totalCompleted = completedLectures + completedQuizzes;
  const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  
  const isCompleted = percentage === 100;

  res.status(200).json({
    success: true,
    data: {
      courseId: courseIdInt,
      totalLectures,
      completedLectures,
      totalQuizzes,
      completedQuizzes,
      totalItems,
      totalCompleted,
      percentage,
      isCompleted
    }
  });
});
