/**
 * Simple admin check middleware
 * Assumes admin is identified by a specific teacher ID or email
 * Modify this according to your admin identification logic
 */
export const protectAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  // OPTION A: Check by email
  const adminEmails = [
    'admin@novexa.com',
    'manelmahdjoubi@gmail.com'  // Add your admin teacher emails here
  ];
  
  if (req.user.role === 'teacher' && adminEmails.includes(req.user.T_email)) {
    return next();
  }

  res.status(403);
  throw new Error('Admin access required');
};