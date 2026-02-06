import asyncHandler from 'express-async-handler';

/**
 * Middleware to allow only admins
 */
export const protectAdmin = asyncHandler(async (req, res, next) => {
  // Make sure user is authenticated
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  // Check if user is admin
  if (!req.user.isAdmin) { // assuming your user object has isAdmin boolean
    res.status(403);
    throw new Error('Not authorized as admin');
  }

  next();
});
