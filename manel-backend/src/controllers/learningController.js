import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Get course learning content for enrolled student
 * @route   GET /api/learning/course/:courseId
 * @access  Private/Student (must be enrolled)
 */
export const getCourseLearningContent = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.S_id || req.user.id;
  const courseIdInt = parseInt(courseId);

  console.log(`[LearningContent] Fetching for student ${studentId}, course ${courseId}`);

  if (isNaN(courseIdInt)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Get course with all related data
  const course = await prisma.course.findUnique({
    where: { C_id: courseIdInt },
    include: {
      Teacher: {
        select: {
          T_id: true,
          T_firstname: true,
          T_lastname: true,
          T_pfp: true,
          T_bio: true
        }
      },
      Chapter: {
        orderBy: { chap_id: 'asc' },
        include: {
          Lecture: {
            orderBy: { lec_id: 'asc' },
            select: {
              lec_id: true,
              lec_title: true,
              lec_vid: true,
              lec_file: true,
              lec_duration: true
            }
          },
          Quiz: {
            select: {
              quiz_id: true,
            }
          }
        }
      }
    }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Get enrollment progress
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: courseIdInt
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You are not enrolled in this course');
  }

  // Get quiz attempts for this student in this course
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      studentId: studentId,
      courseId: courseIdInt
    },
    select: {
      quizId: true,
      chapterId: true,
      completed: true,
      score: true
    }
  });

  // Check if certificate already exists
  const existingCertificate = await prisma.certificate.findFirst({
    where: {
      studentId: studentId,
      courseId: courseIdInt
    },
    select: {
      certificateId: true,
      format: true
    }
  });

  // Create a map for quick quiz status lookup
  const quizStatusMap = {};
  quizAttempts.forEach(attempt => {
    quizStatusMap[attempt.chapterId] = {
      completed: attempt.completed,
      score: attempt.score
    };
  });

  // Format chapters with quiz status
  const formattedChapters = course.Chapter.map(chapter => {
    const hasQuiz = !!chapter.Quiz;
    const quizStatus = quizStatusMap[chapter.chap_id] || { completed: false, score: null };

    return {
      chap_id: chapter.chap_id,
      chap_title: chapter.chap_title,
      numlecture: chapter.numlecture,
      lectures: chapter.Lecture.map(lecture => {
        let parsedFiles = [];
        try {
          parsedFiles = (lecture.lec_file && lecture.lec_file.trim()) ? JSON.parse(lecture.lec_file) : [];
        } catch (e) {
          console.error(`Error parsing lec_file for lecture ${lecture.lec_id}:`, e);
          parsedFiles = [];
        }
        
        return {
          lec_id: lecture.lec_id,
          lec_title: lecture.lec_title,
          lec_vid: lecture.lec_vid,
          lec_file: parsedFiles,
          lec_duration: lecture.lec_duration
        };
      }),
      quiz: hasQuiz ? {
        quiz_id: chapter.Quiz.quiz_id,
        hasQuiz: true,
        completed: quizStatus.completed,
        score: quizStatus.score
      } : {
        hasQuiz: false,
        completed: false,
        score: null
      }
    };
  });

  // Calculate total lectures
  const totalLectures = course.Chapter.reduce((sum, chapter) => {
    return sum + chapter.Lecture.length;
  }, 0);

  res.status(200).json({
    success: true,
    course: {
      C_id: course.C_id,
      C_title: course.C_title,
      C_desc: course.C_desc,
      C_image: course.C_image,
      C_field: course.C_field,
      C_certificate: course.C_certificate,
      totalLectures: totalLectures,
      totalChapters: course.Chapter.length,
      teacher: course.Teacher,
      chapters: formattedChapters
    },
    enrollment: {
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress || {}
    },
    certificate: existingCertificate || null
  });
});

/**
 * @desc    Get single lecture details
 * @route   GET /api/learning/lecture/:lectureId
 * @access  Private/Student (must be enrolled in course)
 */
export const getLectureDetails = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const studentId = req.user.S_id || req.user.id;
  const lectureIdInt = parseInt(lectureId);

  if (isNaN(lectureIdInt)) {
    res.status(400);
    throw new Error('Invalid lecture ID');
  }

  // Get lecture with course info
  const lecture = await prisma.lecture.findUnique({
    where: { lec_id: lectureIdInt },
    include: {
      Chapter: {
        include: {
          Course: {
            select: {
              C_id: true,
              C_title: true
            }
          }
        }
      }
    }
  });

  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  // Verify student is enrolled in the course
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: studentId,
        courseId: lecture.Chapter.Course.C_id
      }
    }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You must be enrolled in this course to access lectures');
  }

  let parsedFiles = [];
  try {
    parsedFiles = (lecture.lec_file && lecture.lec_file.trim()) ? JSON.parse(lecture.lec_file) : [];
  } catch (e) {
    console.error(`Error parsing lec_file for lecture ${lecture.lec_id}:`, e);
    parsedFiles = [];
  }

  res.status(200).json({
    success: true,
    lecture: {
      lec_id: lecture.lec_id,
      lec_title: lecture.lec_title,
      lec_vid: lecture.lec_vid,
      lec_file: parsedFiles,
      lec_duration: lecture.lec_duration,
      chapter: {
        chap_id: lecture.Chapter.chap_id,
        chap_title: lecture.Chapter.chap_title
      },
      course: lecture.Chapter.Course
    }
  });
});

/**
 * @desc    Update lecture progress
 * @route   POST /api/learning/progress/lecture
 * @access  Private/Student
 */
export const updateLectureProgress = asyncHandler(async (req, res) => {
  const { courseId, lectureId, completed } = req.body;
  const studentId = req.user.S_id || req.user.id;

  if (!courseId || !lectureId || typeof completed !== 'boolean') {
    res.status(400);
    throw new Error('courseId, lectureId, and completed status are required');
  }

  const courseIdInt = parseInt(courseId);
  const lectureIdInt = parseInt(lectureId);

  // Get current enrollment
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

  // Update progress
  let progress = enrollment.progress || {};
  if (!progress.lectures) {
    progress.lectures = {};
  }
  
  progress.lectures[lectureIdInt] = {
    completed: completed,
    completedAt: completed ? new Date().toISOString() : null
  };

  // Update enrollment
  const updatedEnrollment = await prisma.enrollment.update({
    where: { enrollment_id: enrollment.enrollment_id },
    data: { progress: progress }
  });

  res.status(200).json({
    success: true,
    message: 'Progress updated successfully',
    progress: updatedEnrollment.progress
  });
});