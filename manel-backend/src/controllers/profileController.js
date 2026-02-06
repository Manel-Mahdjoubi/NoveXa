import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { deleteOldProfilePhoto, uploadToCloudinary } from '../middleware/profileUpload.middleware.js';

/**
 * @desc    Get user profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const userId = role === 'teacher' ? req.user.T_id : req.user.S_id;

  let user;
  
  if (role === 'teacher') {
    user = await prisma.teacher.findUnique({
      where: { T_id: userId },
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
        updated_at: true
      }
    });
  } else {
    user = await prisma.student.findUnique({
      where: { S_id: userId },
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
        updated_at: true
      }
    });
  }

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Format response to match frontend expectations
  const formattedUser = {
    firstName: role === 'teacher' ? user.T_firstname : user.S_firstname,
    lastName: role === 'teacher' ? user.T_lastname : user.S_lastname,
    email: role === 'teacher' ? user.T_email : user.S_email,
    phone: role === 'teacher' ? user.T_phone : user.S_phone,
    profilePhoto: role === 'teacher' ? user.T_pfp : user.S_pfp,
    bio: role === 'teacher' ? user.T_bio : user.S_bio,
    birthday: role === 'teacher' ? user.T_birthdate : user.S_birthdate,
    studyAt: role === 'teacher' ? user.T_studyplace : user.S_studyplace,
    fieldOfStudy: role === 'teacher' ? user.T_studyfield : user.S_studyfield,
    address: role === 'teacher' ? user.T_address : user.S_address,
    social: parseSocialMedia(role === 'teacher' ? user.T_socialmedia : user.S_socialmedia),
    role: role
  };

  res.status(200).json({
    success: true,
    data: formattedUser
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const userId = role === 'teacher' ? req.user.T_id : req.user.S_id;

  const {
    firstName,
    lastName,
    phone,
    bio,
    birthday,
    studyAt,
    fieldOfStudy,
    address,
    social
  } = req.body;

  // Build update object
  const fieldsToUpdate = {};
  const prefix = role === 'teacher' ? 'T' : 'S';

  if (firstName) fieldsToUpdate[`${prefix}_firstname`] = firstName.trim();
  if (lastName) fieldsToUpdate[`${prefix}_lastname`] = lastName.trim();
  if (phone) {
    // Validate phone number (10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      res.status(400);
      throw new Error('Phone number must be exactly 10 digits');
    }
    fieldsToUpdate[`${prefix}_phone`] = cleanPhone;
  }
  if (bio !== undefined) fieldsToUpdate[`${prefix}_bio`] = bio.trim();
  if (birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 5 || age > 120) {
      res.status(400);
      throw new Error('Invalid birth date');
    }
    fieldsToUpdate[`${prefix}_birthdate`] = birthDate;
  }
  if (studyAt !== undefined) fieldsToUpdate[`${prefix}_studyplace`] = studyAt.trim();
  if (fieldOfStudy !== undefined) fieldsToUpdate[`${prefix}_studyfield`] = fieldOfStudy.trim();
  if (address !== undefined) fieldsToUpdate[`${prefix}_address`] = address.trim();
  
  // Handle social media
  if (social) {
    const socialArray = formatSocialMedia(social);
    fieldsToUpdate[`${prefix}_socialmedia`] = socialArray;
  }

  // Update user
  let updatedUser;
  
  if (role === 'teacher') {
    updatedUser = await prisma.teacher.update({
      where: { T_id: userId },
      data: fieldsToUpdate,
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
        updated_at: true
      }
    });
  } else {
    updatedUser = await prisma.student.update({
      where: { S_id: userId },
      data: fieldsToUpdate,
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
        updated_at: true
      }
    });
  }

  // Format response
  const formattedUser = {
    firstName: role === 'teacher' ? updatedUser.T_firstname : updatedUser.S_firstname,
    lastName: role === 'teacher' ? updatedUser.T_lastname : updatedUser.S_lastname,
    email: role === 'teacher' ? updatedUser.T_email : updatedUser.S_email,
    phone: role === 'teacher' ? updatedUser.T_phone : updatedUser.S_phone,
    profilePhoto: role === 'teacher' ? updatedUser.T_pfp : updatedUser.S_pfp,
    bio: role === 'teacher' ? updatedUser.T_bio : updatedUser.S_bio,
    birthday: role === 'teacher' ? updatedUser.T_birthdate : updatedUser.S_birthdate,
    studyAt: role === 'teacher' ? updatedUser.T_studyplace : updatedUser.S_studyplace,
    fieldOfStudy: role === 'teacher' ? updatedUser.T_studyfield : updatedUser.S_studyfield,
    address: role === 'teacher' ? updatedUser.T_address : updatedUser.S_address,
    social: parseSocialMedia(role === 'teacher' ? updatedUser.T_socialmedia : updatedUser.S_socialmedia),
    role: role
  };

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: formattedUser
  });
});

/**
 * @desc    Upload profile photo
 * @route   POST /api/profile/upload-photo
 * @access  Private
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  console.log('--- Profile Upload Started ---');
  if (!req.file) {
    console.log('No file found in request');
    res.status(400);
    throw new Error('Please upload a file');
  }

  // With memory storage, we don't have a path, but we have a buffer
  // console.log('File received by Multer:', req.file.path); 

  const role = req.user.role;
  const userId = role === 'teacher' ? req.user.T_id : req.user.S_id;
  console.log('User Role:', role, 'User ID:', userId);

  // Delete old profile photo if exists
  const user = role === 'teacher'
    ? await prisma.teacher.findUnique({ where: { T_id: userId } })
    : await prisma.student.findUnique({ where: { S_id: userId } });

  const oldPhoto = role === 'teacher' ? user.T_pfp : user.S_pfp;
  
  if (oldPhoto) {
    deleteOldProfilePhoto(oldPhoto);
  }

  // Save new photo URL via Cloudinary
  let photoUrl;
  try {
    console.log('Attempting Cloudinary upload (Stream)...');
    photoUrl = await uploadToCloudinary(req.file.buffer);
    console.log('Cloudinary response URL:', photoUrl);
  } catch (error) {
    console.error('Cloudinary upload error details:', error);
    res.status(500);
    throw new Error('Image upload failed');
  }

  const prefix = role === 'teacher' ? 'T' : 'S';
  console.log('Updating database with pfp URL...');

  const updatedUser = role === 'teacher'
    ? await prisma.teacher.update({
        where: { T_id: userId },
        data: { T_pfp: photoUrl }
      })
    : await prisma.student.update({
        where: { S_id: userId },
        data: { S_pfp: photoUrl }
      });

  res.status(200).json({
    success: true,
    message: 'Profile photo uploaded successfully',
    photoUrl: photoUrl
  });
});

/**
 * @desc    Delete profile photo
 * @route   DELETE /api/profile/photo
 * @access  Private
 */
export const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const userId = role === 'teacher' ? req.user.T_id : req.user.S_id;

  const user = role === 'teacher'
    ? await prisma.teacher.findUnique({ where: { T_id: userId } })
    : await prisma.student.findUnique({ where: { S_id: userId } });

  const photoPath = role === 'teacher' ? user.T_pfp : user.S_pfp;

  if (photoPath) {
    deleteOldProfilePhoto(photoPath);
  }

  // Remove photo URL from database
  const prefix = role === 'teacher' ? 'T' : 'S';
  
  role === 'teacher'
    ? await prisma.teacher.update({
        where: { T_id: userId },
        data: { T_pfp: null }
      })
    : await prisma.student.update({
        where: { S_id: userId },
        data: { S_pfp: null }
      });

  res.status(200).json({
    success: true,
    message: 'Profile photo deleted successfully'
  });
});

// Helper functions

function parseSocialMedia(socialArray) {
  if (!socialArray || !Array.isArray(socialArray)) {
    return {
      youtube: '',
      facebook: '',
      instagram: '',
      linkedin: ''
    };
  }

  const social = {
    youtube: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  };

  socialArray.forEach(url => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      social.youtube = url;
    } else if (url.includes('facebook.com')) {
      social.facebook = url;
    } else if (url.includes('instagram.com')) {
      social.instagram = url;
    } else if (url.includes('linkedin.com')) {
      social.linkedin = url;
    }
  });

  return social;
}

function formatSocialMedia(socialObj) {
  const socialArray = [];

  if (socialObj.youtube && socialObj.youtube.trim()) {
    socialArray.push(socialObj.youtube.trim());
  }
  if (socialObj.facebook && socialObj.facebook.trim()) {
    socialArray.push(socialObj.facebook.trim());
  }
  if (socialObj.instagram && socialObj.instagram.trim()) {
    socialArray.push(socialObj.instagram.trim());
  }
  if (socialObj.linkedin && socialObj.linkedin.trim()) {
    socialArray.push(socialObj.linkedin.trim());
  }

  return socialArray;
}