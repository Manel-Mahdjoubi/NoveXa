import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendTokenResponse } from '../utils/generateToken.js';
import { sendResetEmail } from '../utils/sendRestEmail.js';

/**
 * @desc    Register a new teacher
 * @route   POST /api/auth/register/teacher
 * @access  Public
 */
export const registerTeacher = asyncHandler(async (req, res) => {
  console.log('registerTeacher - body:', req.body);
  
  const { T_firstname, T_lastname, T_email, T_phone, T_password, T_birthdate } = req.body;

  // Validate required fields
  if (!T_firstname || !T_lastname || !T_email || !T_phone || !T_password || !T_birthdate) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if teacher already exists
  const teacherExists = await prisma.teacher.findUnique({ 
    where: { T_email } 
  });
  
  if (teacherExists) {
    res.status(400);
    throw new Error('Teacher with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(T_password, 10);

  // Create teacher
  const teacher = await prisma.teacher.create({
    data: {
      T_firstname,
      T_lastname,
      T_email,
      T_phone,
      T_password: hashedPassword,
      T_birthdate: new Date(T_birthdate),
      T_socialmedia: [] // Initialize empty array for social media
    }
  });

  // Remove password from response
  delete teacher.T_password;
  
  sendTokenResponse(teacher, 'teacher', 201, res);
});

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register/student
 * @access  Public
 */
export const registerStudent = asyncHandler(async (req, res) => {
  console.log('registerStudent - body:', req.body);
  
  const { S_firstname, S_lastname, S_email, S_phone, S_password, S_birthdate } = req.body;

  // Validate required fields
  if (!S_firstname || !S_lastname || !S_email || !S_phone || !S_password || !S_birthdate) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if student already exists
  const studentExists = await prisma.student.findUnique({ 
    where: { S_email } 
  });
  
  if (studentExists) {
    res.status(400);
    throw new Error('Student with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(S_password, 10);

  // Create student
  const student = await prisma.student.create({
    data: {
      S_firstname,
      S_lastname,
      S_email,
      S_phone,
      S_password: hashedPassword,
      S_birthdate: new Date(S_birthdate),
      S_socialmedia: [] // Initialize empty array for social media
    }
  });

  // Remove password from response
  delete student.S_password;
  
  sendTokenResponse(student, 'student', 201, res);
});

/**
 * @desc    Login user (teacher or student)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  let { email, password, role } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }
  
  let user;

  // If role is provided, search specific table
  if (role) {
    if (!['teacher', 'student'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role. Must be "teacher" or "student"');
    }

    user = role === 'teacher'
      ? await prisma.teacher.findUnique({ where: { T_email: email } })
      : await prisma.student.findUnique({ where: { S_email: email } });

  } else {
    // Role not provided - Auto-detect
    // Check student first (more common)
    user = await prisma.student.findUnique({ where: { S_email: email } });
    if (user) {
      role = 'student';
    } else {
      // Check teacher
      user = await prisma.teacher.findUnique({ where: { T_email: email } });
      if (user) {
        role = 'teacher';
      }
    }
  }

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check password
  const passwordField = role === 'teacher' ? 'T_password' : 'S_password';
  const isPasswordMatch = await bcrypt.compare(password, user[passwordField]);
  
  if (!isPasswordMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Remove password from response
  delete user[passwordField];
  
  sendTokenResponse(user, role, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ 
    success: true, 
    user: req.user 
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const userId = role === 'teacher' ? req.user.T_id : req.user.S_id;
  
  const fieldsToUpdate = {};
  const prefix = role === 'teacher' ? 'T' : 'S';

  // Build update object dynamically
  if (req.body.pfp) fieldsToUpdate[`${prefix}_pfp`] = req.body.pfp;
  if (req.body.bio) fieldsToUpdate[`${prefix}_bio`] = req.body.bio;
  if (req.body.phone) fieldsToUpdate[`${prefix}_phone`] = req.body.phone;
  if (req.body.address) fieldsToUpdate[`${prefix}_address`] = req.body.address;
  if (req.body.study) fieldsToUpdate[`${prefix}_study`] = req.body.study;
  if (req.body.studyplace) fieldsToUpdate[`${prefix}_studyplace`] = req.body.studyplace;
  if (req.body.studyfield) fieldsToUpdate[`${prefix}_studyfield`] = req.body.studyfield;
  if (req.body.socialmedia && Array.isArray(req.body.socialmedia)) {
    fieldsToUpdate[`${prefix}_socialmedia`] = req.body.socialmedia;
  }

  // Update user
  const updatedUser = role === 'teacher'
    ? await prisma.teacher.update({ 
        where: { T_id: userId }, 
        data: fieldsToUpdate 
      })
    : await prisma.student.update({ 
        where: { S_id: userId }, 
        data: fieldsToUpdate 
      });

  res.status(200).json({ 
    success: true, 
    message: 'Profile updated successfully', 
    user: updatedUser 
  });
});

/**
 * @desc    Delete a teacher
 * @route   DELETE /api/auth/teacher/:id
 * @access  Private/Teacher
 */
export const deleteTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Convert id to integer
  const teacherId = parseInt(id);
  
  if (isNaN(teacherId)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }
  
  // Check if teacher exists
  const teacher = await prisma.teacher.findUnique({
    where: { T_id: teacherId }
  });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  // Delete teacher
  const deletedTeacher = await prisma.teacher.delete({ 
    where: { T_id: teacherId } 
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'Teacher deleted successfully', 
    data: deletedTeacher 
  });
});


/**
 * @desc    Forgot password - generate reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide an email');
  }

  // Look for student first
  let user = await prisma.student.findUnique({
    where: { S_email: email }
  });

  let role = 'student';

  // If not student, look for teacher
  if (!user) {
    user = await prisma.teacher.findUnique({
      where: { T_email: email }
    });
    role = 'teacher';
  }

  // Always return success (security)
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const expireTime = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  // Save token & expiry
  if (role === 'student') {
    await prisma.student.update({
      where: { S_id: user.S_id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: expireTime
      }
    });
  } else {
    await prisma.teacher.update({
      where: { T_id: user.T_id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: expireTime
      }
    });
  }

  // Create reset URL (Frontend)
  const frontendUrl = process.env.FRONTEND_URL ;
  const resetUrl = `${frontendUrl}/reset_pasword_page/reset_password_page.html?token=${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendResetEmail(
      user.S_email || user.T_email,
      resetToken,
      user.S_firstname || user.T_firstname
    );

    res.status(200).json({
      success: true,
      message: 'Email sent'
    });
  } catch (err) {
    console.log(err);
    
    // Rollback token changes if email fails
    if (role === 'student') {
      await prisma.student.update({
        where: { S_id: user.S_id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpire: null
        }
      });
    } else {
      await prisma.teacher.update({
        where: { T_id: user.T_id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpire: null
        }
      });
    }

    res.status(500);
    throw new Error('Email could not be sent');
  }
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Please provide a new password');
  }

  // Hash token from URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Look for student
  let user = await prisma.student.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: {
        gt: new Date()
      }
    }
  });

  let role = 'student';

  // If not student, look for teacher
  if (!user) {
    user = await prisma.teacher.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: {
          gt: new Date()
        }
      }
    });
    role = 'teacher';
  }

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update password and clear reset fields
  if (role === 'student') {
    await prisma.student.update({
      where: { S_id: user.S_id },
      data: {
        S_password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null
      }
    });
  } else {
    await prisma.teacher.update({
      where: { T_id: user.T_id },
      data: {
        T_password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});
