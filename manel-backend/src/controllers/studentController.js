/**
 * Student Controller
 * Handles all student-related API endpoints
 */

/**
 * Get list of students enrolled in a teacher's courses
 * Can be filtered by specific course
 * @param {Object} prisma - Prisma client instance
 */
const getStudentsForTeacher = (prisma) => async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { courseId, courseName } = req.query;

    // Validate teacherId
    if (!teacherId || isNaN(teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid teacher ID is required'
      });
    }

    // Authorization: Teachers can only see their own students
    if (req.user.role === 'teacher' && req.user.id !== parseInt(teacherId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own students'
      });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { T_id: parseInt(teacherId) }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Build the where clause for filtering
    const courseWhereClause = {
      teacherId: parseInt(teacherId)
    };

    // Add course filtering if specified
    if (courseId) {
      courseWhereClause.C_id = parseInt(courseId);
    }

    if (courseName) {
      courseWhereClause.C_title = {
        contains: courseName,
        mode: 'insensitive'
      };
    }

    // Get students enrolled in the teacher's courses
    const students = await prisma.student.findMany({
      where: {
        Enrollment: {
          some: {
            Course: courseWhereClause
          }
        }
      },
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true,
        S_phone: true,
        S_pfp: true,
        S_bio: true,
        S_study: true,
        S_studyplace: true,
        S_studyfield: true,
        Enrollment: {
          where: {
            Course: courseWhereClause
          },
          select: {
            enrollment_id: true,
            enrolledAt: true,
            progress: true,
            Course: {
              select: {
                C_id: true,
                C_title: true,
                C_image: true,
                C_field: true
              }
            }
          }
        }
      },
      orderBy: {
        S_firstname: 'asc'
      }
    });

    // Format the response with additional information
    const formattedStudents = students.map(student => ({
      id: student.S_id,
      firstName: student.S_firstname,
      lastName: student.S_lastname,
      fullName: `${student.S_firstname} ${student.S_lastname}`,
      email: student.S_email,
      phone: student.S_phone,
      profilePicture: student.S_pfp,
      bio: student.S_bio,
      education: student.S_study,
      institution: student.S_studyplace,
      field: student.S_studyfield,
      enrollments: student.Enrollment.map(enrollment => ({
        enrollmentId: enrollment.enrollment_id,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress,
        course: {
          id: enrollment.Course.C_id,
          title: enrollment.Course.C_title,
          image: enrollment.Course.C_image,
          field: enrollment.Course.C_field
        }
      })),
      totalEnrollments: student.Enrollment.length
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      filter: {
        teacherId: parseInt(teacherId),
        courseId: courseId ? parseInt(courseId) : null,
        courseName: courseName || null
      },
      data: formattedStudents
    });

  } catch (error) {
    console.error('Error fetching students for teacher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students list',
      message: error.message
    });
  }
};

/**
 * Get list of students by specific course
 * @param {Object} prisma - Prisma client instance
 */
const getStudentsByCourse = (prisma) => async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId
    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid course ID is required'
      });
    }

    // Check if course exists and verify teacher ownership
    const course = await prisma.course.findUnique({
      where: { C_id: parseInt(courseId) },
      select: {
        C_id: true,
        C_title: true,
        C_field: true,
        teacherId: true,
        Teacher: {
          select: {
            T_id: true,
            T_firstname: true,
            T_lastname: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Authorization: Teachers can only see students in their own courses
    if (req.user.role === 'teacher' && req.user.id !== course.teacherId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view students in your own courses'
      });
    }

    // Get students enrolled in this course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(courseId)
      },
      include: {
        Student: {
          select: {
            S_id: true,
            S_firstname: true,
            S_lastname: true,
            S_email: true,
            S_phone: true,
            S_pfp: true,
            S_bio: true,
            S_study: true,
            S_studyplace: true,
            S_studyfield: true
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    const formattedStudents = enrollments.map(enrollment => ({
      id: enrollment.Student.S_id,
      firstName: enrollment.Student.S_firstname,
      lastName: enrollment.Student.S_lastname,
      fullName: `${enrollment.Student.S_firstname} ${enrollment.Student.S_lastname}`,
      email: enrollment.Student.S_email,
      phone: enrollment.Student.S_phone,
      profilePicture: enrollment.Student.S_pfp,
      bio: enrollment.Student.S_bio,
      education: enrollment.Student.S_study,
      institution: enrollment.Student.S_studyplace,
      field: enrollment.Student.S_studyfield,
      enrollment: {
        enrollmentId: enrollment.enrollment_id,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress
      }
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      course: {
        id: course.C_id,
        title: course.C_title,
        field: course.C_field,
        teacher: {
          id: course.Teacher.T_id,
          fullName: `${course.Teacher.T_firstname} ${course.Teacher.T_lastname}`
        }
      },
      data: formattedStudents
    });

  } catch (error) {
    console.error('Error fetching students by course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students for course',
      message: error.message
    });
  }
};

/**
 * Get all students with optional filtering
 * @param {Object} prisma - Prisma client instance
 */
const getAllStudents = (prisma) => async (req, res) => {
  try {
    const { field, search } = req.query;
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (field) {
      whereClause.S_studyfield = field;
    }
    
    if (search) {
      whereClause.OR = [
        { S_firstname: { contains: search, mode: 'insensitive' } },
        { S_lastname: { contains: search, mode: 'insensitive' } },
        { S_email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true,
        S_phone: true,
        S_pfp: true,
        S_bio: true,
        S_study: true,
        S_studyplace: true,
        S_studyfield: true,
        _count: {
          select: {
            Enrollment: true
          }
        }
      },
      orderBy: {
        S_firstname: 'asc'
      }
    });

    const formattedStudents = students.map(student => ({
      id: student.S_id,
      firstName: student.S_firstname,
      lastName: student.S_lastname,
      fullName: `${student.S_firstname} ${student.S_lastname}`,
      email: student.S_email,
      phone: student.S_phone,
      profilePicture: student.S_pfp,
      bio: student.S_bio,
      education: student.S_study,
      institution: student.S_studyplace,
      field: student.S_studyfield,
      totalEnrollments: student._count.Enrollment
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      data: formattedStudents
    });

  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students list',
      message: error.message
    });
  }
};

/**
 * Get student details by ID
 * @param {Object} prisma - Prisma client instance
 */
const getStudentById = (prisma) => async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid student ID is required'
      });
    }

    // Authorization: Students can only see their own profile
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own profile'
      });
    }

    // If teacher, verify they teach this student
    if (req.user.role === 'teacher') {
      const teacherHasStudent = await prisma.enrollment.findFirst({
        where: {
          studentId: parseInt(studentId),
          Course: {
            teacherId: req.user.id
          }
        }
      });

      if (!teacherHasStudent) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view your own students'
        });
      }
    }

    const student = await prisma.student.findUnique({
      where: { S_id: parseInt(studentId) },
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true,
        S_phone: true,
        S_pfp: true,
        S_bio: true,
        S_study: true,
        S_studyplace: true,
        S_studyfield: true,
        S_address: true,
        S_socialmedia: true,
        S_birthdate: true,
        created_at: true,
        Enrollment: {
          include: {
            Course: {
              select: {
                C_id: true,
                C_title: true,
                C_desc: true,
                C_image: true,
                C_field: true,
                C_price: true,
                Teacher: {
                  select: {
                    T_id: true,
                    T_firstname: true,
                    T_lastname: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const formattedStudent = {
      id: student.S_id,
      firstName: student.S_firstname,
      lastName: student.S_lastname,
      fullName: `${student.S_firstname} ${student.S_lastname}`,
      email: student.S_email,
      phone: student.S_phone,
      profilePicture: student.S_pfp,
      bio: student.S_bio,
      education: student.S_study,
      institution: student.S_studyplace,
      field: student.S_studyfield,
      address: student.S_address,
      socialMedia: student.S_socialmedia,
      birthdate: student.S_birthdate,
      joinedAt: student.created_at,
      enrollments: student.Enrollment.map(enrollment => ({
        enrollmentId: enrollment.enrollment_id,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress,
        course: {
          id: enrollment.Course.C_id,
          title: enrollment.Course.C_title,
          description: enrollment.Course.C_desc,
          image: enrollment.Course.C_image,
          field: enrollment.Course.C_field,
          price: enrollment.Course.C_price,
          teacher: {
            id: enrollment.Course.Teacher.T_id,
            fullName: `${enrollment.Course.Teacher.T_firstname} ${enrollment.Course.Teacher.T_lastname}`
          }
        }
      })),
      totalEnrollments: student.Enrollment.length
    };

    res.json({
      success: true,
      data: formattedStudent
    });

  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student details',
      message: error.message
    });
  }
};

/**
 * Get quiz statistics for a specific student
 * @param {Object} prisma - Prisma client instance
 */
const getStudentQuizStats = (prisma) => async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid student ID is required'
      });
    }

    // Authorization: Students can only see their own stats
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own quiz statistics'
      });
    }

    // If teacher, verify they teach this student
    if (req.user.role === 'teacher') {
      const teacherHasStudent = await prisma.enrollment.findFirst({
        where: {
          studentId: parseInt(studentId),
          Course: {
            teacherId: req.user.id
          }
        }
      });

      if (!teacherHasStudent) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view statistics for your own students'
        });
      }
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { S_id: parseInt(studentId) },
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Get all quiz attempts for the student
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: parseInt(studentId),
        completed: true
      },
      include: {
        Quiz: {
          include: {
            Chapter: {
              select: {
                chap_id: true,
                chap_title: true
              }
            }
          }
        },
        Course: {
          select: {
            C_id: true,
            C_title: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Calculate statistics
    const totalQuizzes = quizAttempts.length;
    const scores = quizAttempts.map(attempt => attempt.score || 0);
    const averageScore = totalQuizzes > 0 
      ? (scores.reduce((sum, score) => sum + score, 0) / totalQuizzes).toFixed(2)
      : 0;

    // Group by course
    const statsByCourse = {};
    quizAttempts.forEach(attempt => {
      const courseId = attempt.courseId;
      if (!statsByCourse[courseId]) {
        statsByCourse[courseId] = {
          courseId: attempt.Course.C_id,
          courseTitle: attempt.Course.C_title,
          totalQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          scores: []
        };
      }
      statsByCourse[courseId].completedQuizzes++;
      statsByCourse[courseId].scores.push(attempt.score || 0);
    });

    // Get total quizzes available per course
    for (const courseId in statsByCourse) {
      const totalAvailableQuizzes = await prisma.quiz.count({
        where: {
          Chapter: {
            courseId: parseInt(courseId)
          }
        }
      });
      
      const courseStats = statsByCourse[courseId];
      courseStats.totalQuizzes = totalAvailableQuizzes;
      courseStats.averageScore = courseStats.scores.length > 0
        ? (courseStats.scores.reduce((sum, s) => sum + s, 0) / courseStats.scores.length).toFixed(2)
        : 0;
      delete courseStats.scores; // Remove raw scores from response
    }

    res.json({
      success: true,
      data: {
        studentId: student.S_id,
        studentName: `${student.S_firstname} ${student.S_lastname}`,
        overallStats: {
          totalCompletedQuizzes: totalQuizzes,
          averageScore: parseFloat(averageScore)
        },
        courseStats: Object.values(statsByCourse),
        recentAttempts: quizAttempts.slice(0, 10).map(attempt => ({
          attemptId: attempt.attempt_id,
          quizId: attempt.quizId,
          chapterTitle: attempt.Quiz.Chapter.chap_title,
          courseTitle: attempt.Course.C_title,
          score: attempt.score,
          completedAt: attempt.completedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching student quiz stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz statistics',
      message: error.message
    });
  }
};

/**
 * Get all students with quiz statistics included
 * @param {Object} prisma - Prisma client instance
 */
const getAllStudentsWithQuizStats = (prisma) => async (req, res) => {
  try {
    const { course, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (course) {
      whereClause.Enrollment = {
        some: {
          Course: {
            C_title: course
          }
        }
      };
    }
    
    if (search) {
      whereClause.OR = [
        { S_firstname: { contains: search, mode: 'insensitive' } },
        { S_lastname: { contains: search, mode: 'insensitive' } },
        { S_email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Role-based filtering: Teachers only see their students
    if (req.user.role === 'teacher') {
      // If course filter is already set, we need to combine it with teacher filter
      if (whereClause.Enrollment) {
        whereClause.Enrollment.some.Course.teacherId = req.user.id;
      } else {
        whereClause.Enrollment = {
          some: {
            Course: {
              teacherId: req.user.id
            }
          }
        };
      }
    }

    // Get total count for pagination metadata
    const totalCount = await prisma.student.count({ where: whereClause });

    // Get paginated students with optimized field selection
    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true,
        created_at: true,
        Enrollment: {
          select: {
            enrolledAt: true,
            Course: {
              select: {
                C_title: true
              }
            }
          },
          orderBy: {
            enrolledAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            Enrollment: true
          }
        }
      },
      orderBy: {
        S_firstname: 'asc'
      },
      skip,
      take
    });

    if (students.length === 0) {
      return res.json({
        success: true,
        count: 0,
        total: totalCount,
        page: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        data: []
      });
    }

    // Get aggregated quiz stats for these students in a single query
    const formattedStudents = students.map(student => {
      return {
        id: student.S_id,
        firstName: student.S_firstname,
        lastName: student.S_lastname,
        fullName: `${student.S_firstname} ${student.S_lastname}`,
        email: student.S_email,
        enrollmentDate: student.created_at,
        course: student.Enrollment[0]?.Course.C_title || 'No enrollment',
        totalEnrollments: student._count.Enrollment
      };
    });

    res.json({
      success: true,
      count: formattedStudents.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / take),
      data: formattedStudents
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students list',
      message: error.message
    });
  }
};

export {
  getStudentsForTeacher,
  getStudentsByCourse,
  getAllStudents,
  getStudentById,
  getStudentQuizStats,
  getAllStudentsWithQuizStats
};