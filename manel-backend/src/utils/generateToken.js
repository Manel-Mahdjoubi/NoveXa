import jwt from 'jsonwebtoken';

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role (teacher/student)
 * @returns {string} JWT token
 */
export const generateToken = (id, role) => {
  return jwt.sign(
    { id, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Generate and send token in response
 * @param {object} user - User object
 * @param {string} role - User role
 * @param {number} statusCode - HTTP status code
 * @param {object} res - Express response object
 */
export const sendTokenResponse = (user, role, statusCode, res) => {
  const prefix = role === 'teacher' ? 'T' : 'S';
  const token = generateToken(user[`${prefix}_id`], role);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user[`${prefix}_id`],
      firstName: user[`${prefix}_firstname`],
      lastName: user[`${prefix}_lastname`],
      email: user[`${prefix}_email`],
      pfp: user[`${prefix}_pfp`] || null,
      role,
      // Include prefixed versions for compatibility
      [`${prefix}_firstname`]: user[`${prefix}_firstname`],
      [`${prefix}_lastname`]: user[`${prefix}_lastname`],
      [`${prefix}_pfp`]: user[`${prefix}_pfp`]
    }
  });
};