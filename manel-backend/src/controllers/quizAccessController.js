import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Verify student can access chapter quiz
 * @route   POST /api/quiz-access/verify
 * @access  Private/Student (must be enrolled)
 */
export const verifyQuizAccess = asyncHandler(async (req, res) => {
  const { chapterId } = req.body;
  const studentId = req.user.S_id;

  if (!chapterId) {
    res.status(400);
    throw new Error('Chapter ID is required');
  }

  const chapterIdInt = parseInt(chapterId);
  
  if (isNaN(chapterIdInt)) {
    res.status(400);
    throw new Error('Invalid chapter ID');
  }

  // Get chapter with quiz, lectures, and course info
  const chapter = await prisma.chapter.findUnique({
    where: { chap_id: chapterIdInt },
    include: {
      Quiz: true,
      Lecture: {
        select: {
          lec_id: true
        }
      },
      Course: {
        select: {
          C_id: true,
          C_title: true
        }
      }
    }
  });

  if (!chapter) {
    res.status(404);
    throw new Error('Chapter not found');
  }

  if (!chapter.Quiz) {
    res.status(404);
    throw new Error('This chapter does not have a quiz');
  }

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: chapter.Course.C_id
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You must be enrolled in this course to access the quiz');
  }

  // Check if all lectures in this chapter are completed
  const chapterLectures = chapter.Lecture.map(l => l.lec_id);
  const progress = enrollment.progress || {};
  const lectureProgress = progress.lectures || {};
  
  const allCompleted = chapterLectures.every(lecId => 
    lectureProgress[lecId] && lectureProgress[lecId].completed === true
  );

  if (!allCompleted) {
    return res.status(403).json({
      success: false,
      message: 'You must complete all lectures in this chapter before taking the quiz.',
      permissionGranted: false,
      missingLectures: true
    });
  }

  // Check if already attempted
  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: {
      studentId: studentId,
      quizId: chapter.Quiz.quiz_id,
      chapterId: chapterIdInt
    }
  });

  res.status(200).json({
    success: true,
    permissionGranted: true,
    quiz: {
      quiz_id: chapter.Quiz.quiz_id,
      quiz_title: chapter.Quiz.quiz_title,
      chap_id: chapter.chap_id,
      chap_title: chapter.chap_title,
      course: chapter.Course
    },
    attemptStatus: existingAttempt ? {
      hasAttempted: true,
      completed: existingAttempt.completed,
      score: existingAttempt.score,
      attemptedAt: existingAttempt.attemptedAt
    } : {
      hasAttempted: false,
      completed: false,
      score: null
    }
  });
});

/**
 * @desc    Get quiz status for a chapter
 * @route   GET /api/quiz-access/status/:chapterId
 * @access  Private/Student
 */
export const getQuizStatus = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const studentId = req.user.S_id;
  const chapterIdInt = parseInt(chapterId);

  if (isNaN(chapterIdInt)) {
    res.status(400);
    throw new Error('Invalid chapter ID');
  }

  // Get chapter with quiz
  const chapter = await prisma.chapter.findUnique({
    where: { chap_id: chapterIdInt },
    include: {
      Quiz: {
        select: {
          quiz_id: true,
          quiz_title: true
        }
      },
      Course: {
        select: {
          C_id: true
        }
      }
    }
  });

  if (!chapter) {
    res.status(404);
    throw new Error('Chapter not found');
  }

  const hasQuiz = !!chapter.Quiz;

  if (!hasQuiz) {
    return res.status(200).json({
      success: true,
      hasQuiz: false,
      quizStatus: null
    });
  }

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: chapter.Course.C_id
      }
    }
  });

  if (!enrollment) {
    return res.status(200).json({
      success: true,
      hasQuiz: true,
      isEnrolled: false,
      quizStatus: null
    });
  }

  // Get quiz attempt
  const quizAttempt = await prisma.quizAttempt.findFirst({
    where: {
      studentId: studentId,
      quizId: chapter.Quiz.quiz_id,
      chapterId: chapterIdInt
    }
  });

  res.status(200).json({
    success: true,
    hasQuiz: true,
    isEnrolled: true,
    quiz: chapter.Quiz,
    quizStatus: quizAttempt ? {
      completed: quizAttempt.completed,
      score: quizAttempt.score,
      attemptedAt: quizAttempt.attemptedAt,
      completedAt: quizAttempt.completedAt
    } : {
      completed: false,
      score: null,
      attemptedAt: null
    }
  });
});

/**
 * @desc    Record quiz attempt start (called by quiz page)
 * @route   POST /api/quiz-access/start-attempt
 * @access  Private/Student
 * @note    This is minimal - your teammate will handle actual quiz logic
 */
export const recordQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId, chapterId, courseId } = req.body;
  const studentId = req.user.S_id;

  if (!quizId || !chapterId || !courseId) {
    res.status(400);
    throw new Error('quizId, chapterId, and courseId are required');
  }

  // Check if attempt already exists
  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: {
      studentId: studentId,
      quizId: parseInt(quizId),
      chapterId: parseInt(chapterId)
    }
  });

  if (existingAttempt) {
    return res.status(200).json({
      success: true,
      message: 'Attempt already recorded',
      attempt: existingAttempt
    });
  }

  // Create new attempt record
  const attempt = await prisma.quizAttempt.create({
    data: {
      studentId: studentId,
      quizId: parseInt(quizId),
      chapterId: parseInt(chapterId),
      courseId: parseInt(courseId),
      completed: false
    }
  });

  res.status(201).json({
    success: true,
    message: 'Quiz attempt started',
    attempt
  });
});