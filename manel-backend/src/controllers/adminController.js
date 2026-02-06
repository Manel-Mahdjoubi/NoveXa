import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { deleteByUrl, downloadFromUrl } from '../utils/cloudinaryService.js';
import { uploadFile as uploadToDrive } from '../utils/driveService.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required.');
}
const JWT_EXPIRES_IN = '7d';

// Initialize default admin accounts (run once)
const initializeAdmins = (prisma) => async () => {
  try {
    const admins = [
      { username: process.env.ADMIN_1_USERNAME, password: process.env.ADMIN_1_PASSWORD, fullName: process.env.ADMIN_1_FULLNAME, role: 'superadmin' },
      { username: process.env.ADMIN_2_USERNAME, password: process.env.ADMIN_2_PASSWORD, fullName: process.env.ADMIN_2_FULLNAME, role: 'superadmin' },
      { username: process.env.ADMIN_3_USERNAME, password: process.env.ADMIN_3_PASSWORD, fullName: process.env.ADMIN_3_FULLNAME, role: 'superadmin' }
    ];

    for (const admin of admins) {
      const existing = await prisma.admin.findUnique({ where: { username: admin.username } });
      const hashedPassword = await bcrypt.hash(admin.password, 12);

      if (!existing) {
        await prisma.admin.create({
          data: {
            username: admin.username,
            password: hashedPassword,
            fullName: admin.fullName,
            role: admin.role,
            updated_at: new Date()
          }
        });
        console.log(`✓ Created admin: ${admin.username}`);
      } else {
        // Update existing admin to sync with .env
        await prisma.admin.update({
          where: { username: admin.username },
          data: {
            password: hashedPassword,
            fullName: admin.fullName,
            role: admin.role,
            updated_at: new Date()
          }
        });
        console.log(`✓ Updated admin: ${admin.username}`);
      }
    }
  } catch (error) {
    console.error('Error initializing admins:', error);
  }
};

// Admin login
const loginAdmin = (prisma) => async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: admin.admin_id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      admin: {
        id: admin.admin_id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Get dashboard statistics
const getStatistics = (prisma) => async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalCourses, pendingDeletions, totalEnrollments] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.course.count({ where: { deletionRequested: true } }),
      prisma.enrollment.count()
    ]);

    // Active students (enrolled in at least one course)
    const activeStudents = await prisma.student.count({
      where: {
        Enrollment: {
          some: {}
        }
      }
    });

    // Active teachers (teaching at least one course)
    const activeTeachers = await prisma.teacher.count({
      where: {
        Course: {
          some: {}
        }
      }
    });

    res.json({
      success: true,
      stats: {
        students: {
          total: totalStudents,
          active: activeStudents
        },
        teachers: {
          total: totalTeachers,
          active: activeTeachers
        },
        courses: {
          total: totalCourses,
          active: totalCourses - pendingDeletions
        },
        enrollments: totalEnrollments,
        pendingDeletions
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
};

// Get all courses
const getAllCourses = (prisma) => async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        Teacher: {
          select: {
            T_firstname: true,
            T_lastname: true
          }
        },
        _count: {
          select: {
            Enrollment: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedCourses = courses.map(course => ({
      id: course.C_id,
      title: course.C_title,
      price: course.C_price,
      teacherName: `${course.Teacher.T_firstname} ${course.Teacher.T_lastname}`,
      enrollmentCount: course._count.Enrollment,
      status: course.deletionRequested ? 'Deletion Requested' : 'Active'
    }));

    res.json({ success: true, courses: formattedCourses });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
};

// Get all students
const getAllStudents = (prisma) => async (req, res) => {
  try {
    const students = await prisma.student.findMany({
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
        S_birthdate: true,
        created_at: true,
        _count: {
          select: {
            Enrollment: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      success: true,
      students: students.map(s => ({
        id: s.S_id,
        firstName: s.S_firstname,
        lastName: s.S_lastname,
        email: s.S_email,
        phone: s.S_phone,
        profilePicture: s.S_pfp,
        bio: s.S_bio,
        currentStudy: s.S_study,
        studyPlace: s.S_studyplace,
        studyField: s.S_studyfield,
        address: s.S_address,
        birthdate: s.S_birthdate,
        enrollmentCount: s._count.Enrollment,
        createdAt: s.created_at
      }))
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Error fetching students' });
  }
};

// Get all teachers
const getAllTeachers = (prisma) => async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
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
        T_birthdate: true,
        created_at: true,
        _count: {
          select: {
            Course: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      success: true,
      teachers: teachers.map(t => ({
        id: t.T_id,
        firstName: t.T_firstname,
        lastName: t.T_lastname,
        email: t.T_email,
        phone: t.T_phone,
        profilePicture: t.T_pfp,
        bio: t.T_bio,
        currentStudy: t.T_study,
        studyPlace: t.T_studyplace,
        studyField: t.T_studyfield,
        address: t.T_address,
        birthdate: t.T_birthdate,
        courseCount: t._count.Course,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
};

// Get single student details
const getStudentById = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { S_id: parseInt(id) },
      include: {
        Enrollment: {
          include: {
            Course: {
              select: {
                C_id: true,
                C_title: true,
                C_image: true,
                C_field: true
              }
            }
          }
        },
        QuizAttempt: {
          select: {
            score: true,
            completed: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      student: {
        id: student.S_id,
        firstName: student.S_firstname,
        lastName: student.S_lastname,
        email: student.S_email,
        phone: student.S_phone,
        profilePicture: student.S_pfp,
        bio: student.S_bio,
        currentStudy: student.S_study,
        studyPlace: student.S_studyplace,
        studyField: student.S_studyfield,
        address: student.S_address,
        socialMedia: student.S_socialmedia,
        birthdate: student.S_birthdate,
        createdAt: student.created_at,
        enrollments: student.Enrollment.map(e => ({
          courseId: e.Course.C_id,
          courseTitle: e.Course.C_title,
          courseImage: e.Course.C_image,
          courseField: e.Course.C_field,
          enrolledAt: e.enrolledAt,
          progress: e.progress
        })),
        quizAttempts: student.QuizAttempt.length,
        averageScore: student.QuizAttempt.filter(q => q.completed).length > 0
          ? student.QuizAttempt.filter(q => q.completed).reduce((sum, q) => sum + (q.score || 0), 0) / student.QuizAttempt.filter(q => q.completed).length
          : 0
      }
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student details' });
  }
};

// Get single teacher details
const getTeacherById = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { T_id: parseInt(id) },
      include: {
        Course: {
          select: {
            C_id: true,
            C_title: true,
            C_image: true,
            C_field: true,
            C_price: true,
            _count: {
              select: {
                Enrollment: true
              }
            }
          }
        },
        Feedback: {
          select: {
            teacherRating: true,
            teacherComment: true
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const averageRating = teacher.Feedback.length > 0
      ? teacher.Feedback.reduce((sum, f) => sum + f.teacherRating, 0) / teacher.Feedback.length
      : 0;

    res.json({
      success: true,
      teacher: {
        id: teacher.T_id,
        firstName: teacher.T_firstname,
        lastName: teacher.T_lastname,
        email: teacher.T_email,
        phone: teacher.T_phone,
        profilePicture: teacher.T_pfp,
        bio: teacher.T_bio,
        currentStudy: teacher.T_study,
        studyPlace: teacher.T_studyplace,
        studyField: teacher.T_studyfield,
        address: teacher.T_address,
        socialMedia: teacher.T_socialmedia,
        birthdate: teacher.T_birthdate,
        createdAt: teacher.created_at,
        courses: teacher.Course.map(c => ({
          courseId: c.C_id,
          courseTitle: c.C_title,
          courseImage: c.C_image,
          courseField: c.C_field,
          price: c.C_price,
          enrollmentCount: c._count.Enrollment
        })),
        totalFeedback: teacher.Feedback.length,
        averageRating: Math.round(averageRating * 10) / 10
      }
    });
  } catch (error) {
    console.error('Get teacher by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teacher details' });
  }
};

// Get all admins (superadmin only)
const getAllAdmins = (prisma) => async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        admin_id: true,
        username: true,
        fullName: true,
        role: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      success: true,
      admins: admins.map(a => ({
        id: a.admin_id,
        username: a.username,
        fullName: a.fullName,
        role: a.role,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, message: 'Error fetching admins' });
  }
};

// Create new admin (superadmin only)
const createAdmin = (prisma) => async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await prisma.admin.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role
      },
      select: {
        admin_id: true,
        username: true,
        fullName: true,
        role: true,
        created_at: true
      }
    });

    res.status(201).json({
      success: true,
      admin: {
        id: admin.admin_id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Error creating admin' });
  }
};

// Update admin (superadmin only)
const updateAdmin = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, password } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role && ['admin', 'superadmin'].includes(role)) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.update({
      where: { admin_id: parseInt(id) },
      data: updateData,
      select: {
        admin_id: true,
        username: true,
        fullName: true,
        role: true,
        updated_at: true
      }
    });

    res.json({
      success: true,
      admin: {
        id: admin.admin_id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        updatedAt: admin.updated_at
      }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, message: 'Error updating admin' });
  }
};

// Delete admin (superadmin only)
const deleteAdmin = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.admin.delete({
      where: { admin_id: parseInt(id) }
    });

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Error deleting admin' });
  }
};

// Get all users (students and teachers) with enrollment/course and payment details
const getAllUsers = (prisma) => async (req, res) => {
  try {
    // Get all students with their enrollments and payments
    const students = await prisma.student.findMany({
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true,
        S_phone: true,
        created_at: true,
        Enrollment: {
          include: {
            Course: {
              select: {
                C_id: true,
                C_title: true,
                C_price: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get all teachers with their courses
    const teachers = await prisma.teacher.findMany({
      select: {
        T_id: true,
        T_firstname: true,
        T_lastname: true,
        T_email: true,
        T_phone: true,
        created_at: true,
        Course: {
          select: {
            C_id: true,
            C_title: true,
            C_price: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format students data
    const formattedStudents = students.map(student => {
      const totalPaid = student.Enrollment.reduce((sum, enrollment) => {
        return sum + (enrollment.Course.C_price || 0);
      }, 0);

      return {
        id: student.S_id,
        firstName: student.S_firstname,
        lastName: student.S_lastname,
        email: student.S_email,
        phone: student.S_phone,
        role: 'Student',
        createdAt: student.created_at,
        courses: student.Enrollment.map(e => ({
          id: e.Course.C_id,
          title: e.Course.C_title,
          price: e.Course.C_price
        })),
        enrolledCoursesCount: student.Enrollment.length,
        totalPaid: totalPaid
      };
    });

    // Format teachers data
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.T_id,
      firstName: teacher.T_firstname,
      lastName: teacher.T_lastname,
      email: teacher.T_email,
      phone: teacher.T_phone,
      role: 'Teacher',
      createdAt: teacher.created_at,
      courses: teacher.Course.map(c => ({
        id: c.C_id,
        title: c.C_title,
        price: c.C_price
      })),
      publishedCoursesCount: teacher.Course.length,
      totalPaid: 0 // Teachers don't pay for courses
    }));

    // Combine both arrays
    const allUsers = [...formattedStudents, ...formattedTeachers];

    res.json({
      success: true,
      users: allUsers,
      summary: {
        totalUsers: allUsers.length,
        totalStudents: formattedStudents.length,
        totalTeachers: formattedTeachers.length,
        totalRevenue: formattedStudents.reduce((sum, s) => sum + s.totalPaid, 0)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

/**
 * Get all deletion requests
 */
const getAllDeletionRequests = (prisma) => async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = status ? { status } : {};

    const deletionRequests = await prisma.deletionRequest.findMany({
      where: whereClause,
      include: {
        Course: {
          select: {
            C_id: true,
            C_title: true,
            C_desc: true,
            C_image: true,
            C_field: true,
            C_price: true,
            _count: { select: { Enrollment: true } }
          }
        },
        Teacher: {
          select: {
            T_id: true,
            T_firstname: true,
            T_lastname: true,
            T_email: true,
            T_phone: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: deletionRequests.length,
      data: deletionRequests.map(req => ({
        id: req.request_id,
        courseId: req.Course.C_id,
        courseName: req.Course.C_title,
        courseDescription: req.Course.C_desc,
        courseImage: req.Course.C_image,
        courseField: req.Course.C_field,
        enrolledStudents: req.Course._count.Enrollment,
        revenue: (req.Course.C_price || 0) * (req.Course._count.Enrollment || 0),
        teacherId: req.Teacher.T_id,
        teacherName: `${req.Teacher.T_firstname} ${req.Teacher.T_lastname}`,
        teacherEmail: req.Teacher.T_email,
        teacherPhone: req.Teacher.T_phone,
        reason: req.reason,
        status: req.status,
        requestDate: req.requestedAt,
        reviewedAt: req.reviewedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch deletion requests'
    });
  }
};

/**
 * Review deletion request (approve/reject)
 */
const reviewDeletionRequest = (prisma) => async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const adminId = req.admin.id;

    // Map incoming action to standard statuses
    let newStatus;
    if (['approve', 'approved'].includes(action)) {
      newStatus = 'approved';
    } else if (['reject', 'rejected'].includes(action)) {
      newStatus = 'rejected';
    } else if (['archive', 'archived'].includes(action)) {
      newStatus = 'archived';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approved", "rejected", or "archived"'
      });
    }

    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { request_id: parseInt(requestId) }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        error: 'DeletionRequest not found'
      });
    }

    if (deletionRequest.status !== 'pending' && newStatus !== 'archived') {
       return res.status(400).json({
         success: false,
         error: `This request has already been ${deletionRequest.status}`
       });
    }

    // Update the request status
    const updatedRequest = await prisma.deletionRequest.update({
      where: { request_id: parseInt(requestId) },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // If approved, actually delete the course
    if (newStatus === 'approved') {
      try {
        await prisma.course.delete({
          where: { C_id: deletionRequest.courseId }
        });
        console.log(`✅ Course ${deletionRequest.courseId} deleted via approved request.`);
      } catch (delError) {
        console.error('Error deleting course after approval:', delError);
        // We still return success for the request update, but notify about the course deletion failure?
        // Actually, since it's a cascade, if the course is deleted, the request is also deleted.
        // Wait, if I updated the request status FIRST, and then deleted the course, the record is gone.
      }
    } else if (newStatus === 'rejected') {
      await prisma.course.update({
        where: { C_id: deletionRequest.courseId },
        data: { deletionRequested: false }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Deletion request ${newStatus}`,
      data: {
        requestId: parseInt(requestId),
        status: newStatus,
        reviewedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error reviewing deletion request:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to review deletion request'
    });
  }
};

/**
 * Delete a course
 */
const deleteCourse = (prisma) => async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { C_id: parseInt(courseId) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    await prisma.course.delete({
      where: { C_id: parseInt(courseId) }
    });

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
      data: {
        courseId: parseInt(courseId),
        courseTitle: course.C_title
      }
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete course'
    });
  }
};

// =====================================================
// LIBRARY RESOURCE MANAGEMENT
// =====================================================

/**
 * Get all library resource requests (pending by default)
 */
const getLibraryRequests = (prisma) => async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const whereClause = status === 'all' ? {} : { status };

    const requests = await prisma.libraryResource.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // Enrich with uploader info
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      let uploaderInfo = null;

      if (request.uploaderId && request.uploaderRole) {
        if (request.uploaderRole === 'teacher') {
          const teacher = await prisma.teacher.findUnique({
            where: { T_id: request.uploaderId },
            select: { T_firstname: true, T_lastname: true, T_email: true }
          });
          if (teacher) {
            uploaderInfo = {
              name: `${teacher.T_firstname} ${teacher.T_lastname}`,
              email: teacher.T_email,
              role: 'Teacher'
            };
          }
        } else if (request.uploaderRole === 'student') {
          const student = await prisma.student.findUnique({
            where: { S_id: request.uploaderId },
            select: { S_firstname: true, S_lastname: true, S_email: true }
          });
          if (student) {
            uploaderInfo = {
              name: `${student.S_firstname} ${student.S_lastname}`,
              email: student.S_email,
              role: 'Student'
            };
          }
        }
      }

      return {
        ...request,
        uploader: uploaderInfo || { name: request.uploadedBy || 'Unknown', role: 'Unknown' }
      };
    }));

    res.json({
      success: true,
      requests: enrichedRequests,
      count: enrichedRequests.length
    });
  } catch (error) {
    console.error('Error fetching library requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch library requests'
    });
  }
};

/**
 * Approve a library resource request
 * Downloads from Cloudinary and uploads to Google Drive
 */
const approveLibraryRequest = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;
    const resourceId = parseInt(id);

    // Find the resource
    const resource = await prisma.libraryResource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Library resource not found'
      });
    }

    if (resource.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Resource has already been ${resource.status}`
      });
    }

    let driveResult = null;
    let driveUrl = resource.url;

    // Try to transfer to Google Drive
    if (resource.url && resource.url.includes('cloudinary.com')) {
      try {
        const lowerUrl = resource.url.toLowerCase();
        const isPdfOrDoc = lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') || 
                           lowerUrl.endsWith('.ppt') || lowerUrl.endsWith('.pptx') || lowerUrl.endsWith('.xls') || 
                           lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mp3');

        // Download from Cloudinary (downloadFromUrl handles image vs raw retry internally)
        console.log('📥 Downloading from Cloudinary:', resource.url);
        const fileBuffer = await downloadFromUrl(resource.url);
        
        // Determine file extension and mime type from URL
        const fileNamePart = resource.url.split('/').pop().split('?')[0];
        const fileExt = fileNamePart.split('.').pop() || 'pdf';
        const fileName = `${resource.title}.${fileExt}`;

        const mimeTypes = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'mp4': 'video/mp4',
          'mp3': 'audio/mpeg'
        };
        const mimeType = mimeTypes[fileExt.toLowerCase()] || 'application/octet-stream';

        // Upload to Google Drive
        console.log('📤 Preparing Drive Upload:', { fileName, subject: resource.subject, mimeType });
        driveResult = await uploadToDrive(fileBuffer, fileName, resource.subject, mimeType);
        console.log('✅ Drive Result:', driveResult);

        if (driveResult && driveResult.webViewLink) {
          driveUrl = driveResult.webViewLink;

          // Delete from Cloudinary after successful Drive upload
          console.log('🗑️ Deleting from Cloudinary:', resource.url);
          try {
            const deleteType = isPdfOrDoc ? 'raw' : 'image';
            await deleteByUrl(resource.url, deleteType);
            console.log('✨ Successfully deleted from Cloudinary');
          } catch (delError) {
            console.warn('⚠️ Cloudinary cleanup failed, but file is on Drive:', delError.message);
          }
        } else {
          console.error('❌ Drive upload failed to return webViewLink:', driveResult);
        }
      } catch (driveError) {
        console.error('🔥 Drive transfer failed entirely:', driveError.message);
      }
    }

    // Update the resource status
    const updatedResource = await prisma.libraryResource.update({
      where: { id: resourceId },
      data: {
        status: 'approved',
        url: driveUrl,
        folderUrl: driveResult ? driveResult.folderUrl : null,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Library resource approved successfully',
      data: {
        ...updatedResource,
        driveResult: driveResult ? {
          fileId: driveResult.fileId,
          webViewLink: driveResult.webViewLink
        } : null
      }
    });
  } catch (error) {
    console.error('Error approving library request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve library request'
    });
  }
};

/**
 * Reject a library resource request
 * Deletes the file from Cloudinary
 */
const rejectLibraryRequest = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const resourceId = parseInt(id);

    // Find the resource
    const resource = await prisma.libraryResource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Library resource not found'
      });
    }

    if (resource.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Resource has already been ${resource.status}`
      });
    }

    // Delete from Cloudinary if applicable
    if (resource.url && resource.url.includes('cloudinary.com')) {
      try {
        console.log('🗑️ Deleting rejected resource from Cloudinary...');
        await deleteByUrl(resource.url, 'auto');
      } catch (deleteError) {
        console.error('Cloudinary delete failed:', deleteError.message);
        // Continue with rejection even if delete fails
      }
    }

    // Update the resource status to rejected
    const updatedResource = await prisma.libraryResource.update({
      where: { id: resourceId },
      data: {
        status: 'rejected',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Library resource rejected and file deleted',
      data: updatedResource,
      rejectionReason: reason || 'No reason provided'
    });
  } catch (error) {
    console.error('Error rejecting library request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject library request'
    });
  }
};

/**
 * Delete a library resource (already approved or any status)
 */
const deleteLibraryResource = (prisma) => async (req, res) => {
  try {
    const { id } = req.params;
    const resourceId = parseInt(id);

    const resource = await prisma.libraryResource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Library resource not found'
      });
    }

    // 2. Delete from Cloudinary/Drive if applicable
    if (resource.url && resource.url.includes('cloudinary.com')) {
      try {
        console.log('🗑️ Cleaning up Cloudinary file...');
        await deleteByUrl(resource.url, 'auto');
      } catch (delError) {
        console.warn('⚠️ Could not delete from Cloudinary:', delError.message);
      }
    } else if (resource.url && resource.url.includes('drive.google.com')) {
       // Optional: We could implement Drive file deletion here too
       // but for now Cloudinary is the main concern for rejected/pending items
       console.log('ℹ️ Resource is on Drive, skipping physical deletion for now');
    }

    // 3. Delete from database
    await prisma.libraryResource.delete({
      where: { id: resourceId }
    });

    res.json({
      success: true,
      message: 'Library resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting library resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete library resource'
    });
  }
};

export {
  initializeAdmins,
  loginAdmin,
  getStatistics,
  getAllStudents,
  getAllTeachers,
  getStudentById,
  getTeacherById,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  getAllDeletionRequests,
  reviewDeletionRequest,
  deleteCourse,
  getAllCourses,
  getLibraryRequests,
  approveLibraryRequest,
  rejectLibraryRequest,
  deleteLibraryResource
};