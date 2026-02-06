// Protect routes - verify JWT token
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  // if No Authorization header or not Bearer
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer')
  ) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Extract token
    token = req.headers.authorization.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If teacher
    if (decoded.role === 'teacher') {
      const id = Number(decoded.id);

      if (!Number.isInteger(id)) {
        return res
          .status(401)
          .json({ message: 'Not authorized, invalid token id' });
      }

      req.user = await prisma.teacher.findUnique({
        where: { T_id: id },
        select: {
          T_id: true,
          T_firstname: true,
          T_lastname: true,
          T_email: true,
          T_phone: true,
          T_pfp: true,
          T_bio: true
        }
      });
    }

    // If student
    else if (decoded.role === 'student') {
      const id = Number(decoded.id);

      if (!Number.isInteger(id)) {
        return res
          .status(401)
          .json({ message: 'Not authorized, invalid token id' });
      }

      req.user = await prisma.student.findUnique({
        where: { S_id: id },
        select: {
          S_id: true,
          S_firstname: true,
          S_lastname: true,
          S_email: true,
          S_phone: true,
          S_pfp: true,
          S_bio: true
        }
      });
    }

    // User not found
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach role to request
    req.user.role = decoded.role;

    // Continue to next middleware / controller
    next();

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};


// Restrict routes
export const restrictToTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied. Only teachers can perform this action.' });
  next();
};

export const restrictToStudent = (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied. Only students can perform this action.' });
  next();
};