import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto as uploadPhoto,
  deleteProfilePhoto
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import { uploadProfilePhoto } from '../middleware/profileUpload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private
router.get('/', getProfile);

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', updateProfile);

// @route   POST /api/profile/upload-photo
// @desc    Upload profile photo
// @access  Private
router.post('/upload-photo', uploadProfilePhoto.single('profilePhoto'), uploadPhoto);

// @route   DELETE /api/profile/photo
// @desc    Delete profile photo
// @access  Private
router.delete('/photo', deleteProfilePhoto);

export default router;