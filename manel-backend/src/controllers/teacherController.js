/**
 * Teacher Controller
 * Handles all teacher-related API endpoints
 */

/**
 * Get list of teachers for a specific student
 * Returns teachers whose courses the student is enrolled in
 * @param {Object} prisma - Prisma client instance
 */
const getTeachersForStudent = (prisma) => async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate studentId
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid student ID is required'
      });
    }

    // Authorization: Students can only see their own teachers
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own teachers'
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { S_id: parseInt(studentId) }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Get all teachers whose courses the student is enrolled in
    const teachers = await prisma.teacher.findMany({
      where: {
        Course: {
          some: {
            Enrollment: {
              some: {
                studentId: parseInt(studentId)
              }
            }
          }
        }
      },
      select: {
        T_id: true,
        T_firstname: true,
        T_lastname: true,
        T_email: true,
        T_phone: true,
        T_pfp: true,
        T_bio: true,
        T_study: true,
        T_studyplace: true,
        T_studyfield: true,
        Course: {
          where: {
            Enrollment: {
              some: {
                studentId: parseInt(studentId)
              }
            }
          },
          select: {
            C_id: true,
            C_title: true,
            C_desc: true,
            C_image: true,
            C_field: true,
            C_price: true,
            _count: {
              select: {
                Enrollment: true
              }
            }
          }
        }
      },
      orderBy: {
        T_firstname: 'asc'
      }
    });

    // Format the response with additional information
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.T_id,
      firstName: teacher.T_firstname,
      lastName: teacher.T_lastname,
      fullName: `${teacher.T_firstname} ${teacher.T_lastname}`,
      email: teacher.T_email,
      phone: teacher.T_phone,
      profilePicture: teacher.T_pfp,
      bio: teacher.T_bio,
      education: teacher.T_study,
      institution: teacher.T_studyplace,
      field: teacher.T_studyfield,
      courses: teacher.Course.map(course => ({
        id: course.C_id,
        title: course.C_title,
        description: course.C_desc,
        image: course.C_image,
        field: course.C_field,
        price: course.C_price,
        enrolledStudents: course._count.Enrollment
      })),
      totalCourses: teacher.Course.length
    }));

    res.json({
      success: true,
      count: formattedTeachers.length,
      data: formattedTeachers
    });

  } catch (error) {
    console.error('Error fetching teachers for student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teachers list',
      message: error.message
    });
  }
};

/**
 * Get list of teachers with optional filtering
 * @param {Object} prisma - Prisma client instance
 */
const getAllTeachers = (prisma) => async (req, res) => {
  try {
    const { field, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (field) {
      whereClause.T_studyfield = field;
    }
    
    if (search) {
      whereClause.OR = [
        { T_firstname: { contains: search, mode: 'insensitive' } },
        { T_lastname: { contains: search, mode: 'insensitive' } },
        { T_email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get total count for pagination
    const totalCount = await prisma.teacher.count({ where: whereClause });

    const teachers = await prisma.teacher.findMany({
      where: whereClause,
      skip,
      take,
      select: {
        T_id: true,
        T_firstname: true,
        T_lastname: true,
        T_email: true,
        T_phone: true,
        T_pfp: true,
        T_bio: true,
        T_study: true,
        T_studyplace: true,
        T_studyfield: true,
        _count: {
          select: {
            Course: true
          }
        },
        created_at: true
      },
      orderBy: {
        T_firstname: 'asc'
      }
    });

    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.T_id,
      firstName: teacher.T_firstname,
      lastName: teacher.T_lastname,
      fullName: `${teacher.T_firstname} ${teacher.T_lastname}`,
      email: teacher.T_email,
      phone: teacher.T_phone,
      profilePicture: teacher.T_pfp,
      bio: teacher.T_bio,
      education: teacher.T_study,
      institution: teacher.T_studyplace,
      field: teacher.T_studyfield,
      totalCourses: teacher._count.Course,
      created_at: teacher.created_at
    }));

    res.json({
      success: true,
      count: formattedTeachers.length,
      total: totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
      data: formattedTeachers
    });

  } catch (error) {
    console.error('Error fetching all teachers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teachers list',
      message: error.message
    });
  }
};

/**
 * Get teacher details by ID
 * @param {Object} prisma - Prisma client instance
 */
const getTeacherById = (prisma) => async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId || isNaN(teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid teacher ID is required'
      });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { T_id: parseInt(teacherId) },
      select: {
        T_id: true,
        T_firstname: true,
        T_lastname: true,
        T_email: true,
        T_phone: true,
        T_pfp: true,
        T_bio: true,
        T_study: true,
        T_studyplace: true,
        T_studyfield: true,
        T_address: true,
        T_socialmedia: true,
        T_birthdate: true,
        created_at: true,
        Course: {
          select: {
            C_id: true,
            C_title: true,
            C_desc: true,
            C_image: true,
            C_field: true,
            C_price: true,
            C_sessnum: true,
            Chapter: {
              select: {
                chap_id: true,
                chap_title: true,
                numlecture: true,
                Quiz: {
                  select: {
                    quiz_id: true
                  }
                }
              },
              orderBy: {
                chap_id: 'asc'
              }
            },
            _count: {
              select: {
                Enrollment: true
              }
            }
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    const formattedTeacher = {
      id: teacher.T_id,
      firstName: teacher.T_firstname,
      lastName: teacher.T_lastname,
      fullName: `${teacher.T_firstname} ${teacher.T_lastname}`,
      email: teacher.T_email,
      phone: teacher.T_phone,
      profilePicture: teacher.T_pfp,
      bio: teacher.T_bio,
      education: teacher.T_study,
      institution: teacher.T_studyplace,
      field: teacher.T_studyfield,
      address: teacher.T_address,
      socialMedia: teacher.T_socialmedia,
      birthdate: teacher.T_birthdate,
      joinedAt: teacher.created_at,
      courses: teacher.Course.map(course => ({
        id: course.C_id,
        title: course.C_title,
        description: course.C_desc,
        image: course.C_image,
        field: course.C_field,
        price: course.C_price,
        sessions: course.C_sessnum,
        enrolledStudents: course._count.Enrollment,
        Chapter: course.Chapter.map(chapter => ({
          chap_id: chapter.chap_id,
          chap_title: chapter.chap_title,
          numlecture: chapter.numlecture,
          hasQuiz: !!chapter.Quiz
        }))
      })),
      totalCourses: teacher.Course.length
    };

    res.json({
      success: true,
      data: formattedTeacher
    });

  } catch (error) {
    console.error('Error fetching teacher details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teacher details',
      message: error.message
    });
  }
};

/**
 * Request course deletion
 * Teacher requests deletion of their course with a reason
 * @param {Object} prisma - Prisma client instance
 */
const requestCourseDeletion = (prisma) => async (req, res) => {
  try {
    const { courseId, reason } = req.body;
    const teacherId = req.user.id;

    // Validate input
    if (!courseId || !reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Course ID and reason are required'
      });
    }

    // Check if course exists and belongs to the teacher
    const course = await prisma.course.findUnique({
      where: { C_id: parseInt(courseId) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    if (course.teacherId !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'You can only request deletion for your own courses'
      });
    }

    // Check if there's already a pending deletion request
    const existingRequest = await prisma.deletionRequest.findFirst({
      where: {
        courseId: parseInt(courseId),
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'A deletion request for this course is already pending'
      });
    }

    // Create deletion request
    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        courseId: parseInt(courseId),
        teacherId: teacherId,
        reason: reason.trim(),
        status: 'pending'
      },
      include: {
        Course: {
          select: {
            C_title: true,
            C_id: true
          }
        },
        Teacher: {
          select: {
            T_firstname: true,
            T_lastname: true,
            T_email: true
          }
        }
      }
    });

    // Update course deletionRequested flag
    await prisma.course.update({
      where: { C_id: parseInt(courseId) },
      data: { deletionRequested: true }
    });

    return res.status(201).json({
      success: true,
      message: 'Deletion request submitted successfully',
      data: {
        requestId: deletionRequest.request_id,
        courseTitle: deletionRequest.Course.C_title,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt
      }
    });

  } catch (error) {
    console.error('Error requesting course deletion:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit deletion request',
      message: error.message
    });
  }
};

/**
 * Get deletion requests for teacher's courses
 * @param {Object} prisma - Prisma client instance
 */
const getMyDeletionRequests = (prisma) => async (req, res) => {
  try {
    const teacherId = req.user.id;

    const deletionRequests = await prisma.deletionRequest.findMany({
      where: {
        teacherId: teacherId
      },
      include: {
        Course: {
          select: {
            C_id: true,
            C_title: true,
            C_image: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      data: deletionRequests.map(req => ({
        requestId: req.request_id,
        courseId: req.courseId,
        courseTitle: req.Course.C_title,
        courseImage: req.Course.C_image,
        reason: req.reason,
        status: req.status,
        requestedAt: req.requestedAt,
        reviewedAt: req.reviewedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch deletion requests',
      message: error.message
    });
  }
};

export {
  getTeachersForStudent,
  getAllTeachers,
  getTeacherById,
  requestCourseDeletion,
  getMyDeletionRequests
};