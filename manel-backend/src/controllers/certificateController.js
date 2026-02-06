/**
 * NoveXa Certificate Controller
 * 
 * Handles certificate generation, retrieval, and verification
 * with strict security checks for course completion
 */

import certificateService from '../utils/certificateService.js';
import { uploadCertificate } from '../utils/cloudinaryService.js';

/**
 * @desc    Generate certificate for completed course
 * @route   POST /api/certificates/generate
 * @access  Private (Student only, after course completion)
 */
const generateCertificate = (prisma) => async (req, res) => {
  console.log('📥 Certificate generation request received');
  try {
    const { studentId, courseId, format = 'png' } = req.body;
    console.log(`   Data: studentId=${studentId}, courseId=${courseId}, format=${format}`);
    
    const requesterId = req.user.S_id || req.user.id;
    const requesterRole = req.user.role;
    console.log(`   User: requesterId=${requesterId}, role=${requesterRole}`);

    // Validation
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Course ID are required'
      });
    }

    // AUTHORIZATION: Only students can generate certificates
    if (requesterRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can generate certificates'
      });
    }

    // AUTHORIZATION: Students can only generate certificates for themselves
    if (requesterId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate certificates for yourself'
      });
    }

    // Validate format
    const validFormats = ['png', 'jpg', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    // --- SECURITY CHECK 1: Verify student exists ---
    const student = await prisma.student.findUnique({
      where: { S_id: parseInt(studentId) },
      select: {
        S_id: true,
        S_firstname: true,
        S_lastname: true,
        S_email: true
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // --- SECURITY CHECK 2: Verify course exists and offers certificates ---
    const course = await prisma.course.findUnique({
      where: { C_id: parseInt(courseId) },
      select: {
        C_id: true,
        C_title: true,
        C_certificate: true,
        Chapter: {
          select: {
            chap_id: true,
            Quiz: {
              select: {
                quiz_id: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.C_certificate) {
      return res.status(403).json({
        success: false,
        message: 'This course does not offer certificates'
      });
    }

    // --- SECURITY CHECK 3: Verify enrollment ---
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId)
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Student is not enrolled in this course'
      });
    }

    // --- SECURITY CHECK 4: Verify course completion (100% progress) ---
    // Note: Your friend will provide the actual completion tracking token/logic
    // For now, we check enrollment progress
    if (enrollment.progress < 100) {
      return res.status(403).json({
        success: false,
        message: 'Course must be 100% completed to generate certificate',
        currentProgress: enrollment.progress
      });
    }

    // --- SECURITY CHECK 5: Verify all quizzes passed (if any) ---
    const allQuizIds = course.Chapter
      .filter(ch => ch.Quiz)
      .map(ch => ch.Quiz.quiz_id);

    if (allQuizIds.length === 0) {
      console.log('   ℹ️ Course has no quizzes. Skipping quiz validation.');
    } else {
      console.log(`   🔍 Validating ${allQuizIds.length} quizzes...`);
      // Check quiz attempts for all quizzes
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId),
          completed: true
        },
        orderBy: {
          score: 'desc'
        }
      });

      // Group by quiz and get best score for each
      const quizScores = {};
      quizAttempts.forEach(attempt => {
        if (!quizScores[attempt.quizId] || quizScores[attempt.quizId] < attempt.score) {
          quizScores[attempt.quizId] = attempt.score;
        }
      });

      // Check if all quizzes have been attempted and passed (score >= 50%)
      const passingScore = 50;
      const failedQuizzes = allQuizIds.filter(quizId => {
        return !quizScores[quizId] || quizScores[quizId] < passingScore;
      });

      if (failedQuizzes.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'All course quizzes must be passed (score >= 50%) to generate certificate',
          failedQuizzes: failedQuizzes.length,
          totalQuizzes: allQuizIds.length
        });
      }
      console.log('   ✅ All quizzes passed.');
    }

    // --- SECURITY CHECK 6: Check if certificate already exists ---
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        studentId: parseInt(studentId),
        courseId: parseInt(courseId)
      }
    });

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already exists for this course',
        certificate: {
          certificateId: existingCertificate.certificateId,
          studentName: existingCertificate.studentName,
          courseName: existingCertificate.courseName,
          completionDate: existingCertificate.completionDate,
          format: existingCertificate.format,
          qrCodeData: existingCertificate.qrCodeData,
          cloudinaryUrl: existingCertificate.cloudinaryUrl,
          createdAt: existingCertificate.createdAt
        }
      });
    }

    // --- ALL CHECKS PASSED - Generate Certificate ---
    const studentFullName = `${student.S_firstname} ${student.S_lastname}`;
    const completionDate = enrollment.enrolledAt; 

    console.log('🔄 Calling certificateService.generateCertificate...');
    console.log('   Params:', { studentName: studentFullName, courseName: course.C_title });

    const certificateData = await certificateService.generateCertificate({
      studentName: studentFullName,
      courseName: course.C_title,
      completionDate: completionDate,
      format: format.toLowerCase()
    });

    console.log('✅ Certificate generated! ID:', certificateData.certificateId);

    // --- Upload to Cloudinary ---
    let cloudinaryResult = null;
    try {
      // Use rawFileData for Cloudinary upload (unencrypted PNG/JPG/PDF)
      cloudinaryResult = await uploadCertificate(
        certificateData.rawFileData,
        'novexa/certificates',
        certificateData.certificateId
      );
      console.log('✅ Certificate uploaded to Cloudinary:', cloudinaryResult.secureUrl);
    } catch (cloudinaryError) {
      console.error('⚠️ Cloudinary upload failed, continuing without cloud storage:', cloudinaryError.message);
    }

    // --- Save to database ---
    const savedCertificate = await prisma.certificate.create({
      data: {
        certificateId: certificateData.certificateId,
        studentId: parseInt(studentId),
        courseId: parseInt(courseId),
        studentName: certificateData.studentName,
        courseName: certificateData.courseName,
        completionDate: certificateData.completionDate,
        qrCodeData: certificateData.qrCodeData,
        format: certificateData.format,
        fileData: certificateData.fileData,  // Encrypted data for database
        cloudinaryUrl: cloudinaryResult?.secureUrl || null,
        cloudinaryPublicId: cloudinaryResult?.public_id || null // Note: Cloudinary returns public_id, not publicId
      }
    });

    // Return success (without exposing the encrypted file data)
    return res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      certificate: {
        certificateId: savedCertificate.certificateId,
        studentName: savedCertificate.studentName,
        courseName: savedCertificate.courseName,
        completionDate: savedCertificate.completionDate,
        format: savedCertificate.format,
        qrCodeData: savedCertificate.qrCodeData,
        cloudinaryUrl: savedCertificate.cloudinaryUrl,
        verificationLink: certificateData.verificationLink,
        createdAt: savedCertificate.createdAt
      },
      metadata: certificateData.metadata
    });

  } catch (error) {
    console.error('❌ FATAL Certificate generation error:', error);
    // Log stack trace for easier debugging
    console.error(error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Certificate generation failed',
      error: error.message
    });
  }
};

/**
 * @desc    Download certificate (decrypt and return file)
 * @route   GET /api/certificates/download/:certificateId
 * @access  Private (Student who owns the certificate)
 */
const downloadCertificate = (prisma) => async (req, res) => {
  try {
    const { certificateId } = req.params;
    const requesterId = req.user?.S_id || req.user?.id || req.user?.S_ID;
    const requesterRole = req.user?.role;
    
    console.log(`📥 Download request for cert: ${certificateId}`);
    console.log(`   User: requesterId=${requesterId}, role=${requesterRole}`);

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required'
      });
    }

    // Find certificate
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId }
    });

    if (!certificate) {
      console.log('   ❌ Certificate not found in database');
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    console.log(`   Found cert! format: ${certificate.format}, owner: ${certificate.studentId}`);

    // Authorization: Only the student who owns the certificate can download it
    // Or an Admin
    if (requesterRole !== 'admin' && requesterId && parseInt(requesterId) !== certificate.studentId) {
      console.log(`   ❌ Auth failed: requester ${requesterId} != owner ${certificate.studentId}`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only download your own certificates'
      });
    }

    console.log('   ✅ Auth check passed. Retrieving file data...');
    // Decrypt certificate data
    const decryptedData = await certificateService.retrieveCertificate(certificate.fileData);
    console.log('   File retrieved, size:', decryptedData.length);

    // Set appropriate headers based on format
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      pdf: 'application/pdf'
    };

    const mimeType = mimeTypes[certificate.format] || 'application/octet-stream';
    const fileName = `NoveXa_Certificate_${certificate.certificateId}.${certificate.format}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', decryptedData.length);

    return res.send(decryptedData);

  } catch (error) {
    console.error('Certificate download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Certificate download failed',
      error: error.message
    });
  }
};

/**
 * @desc    Verify certificate authenticity
 * @route   GET /api/certificates/verify/:certificateId
 * @access  Public (for QR code verification)
 */
const verifyCertificate = (prisma) => async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required'
      });
    }

    // Find certificate
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId },
      select: {
        certificateId: true,
        studentName: true,
        courseName: true,
        completionDate: true,
        format: true,
        createdAt: true
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Certificate not found or invalid'
      });
    }

    // Certificate is valid
    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Certificate is authentic',
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        completionDate: certificate.completionDate,
        issuedAt: certificate.createdAt
      }
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Certificate verification failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get all certificates for a student
 * @route   GET /api/certificates/student/:studentId
 * @access  Private (Student or Admin)
 */
const getStudentCertificates = (prisma) => async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Get all certificates for the student
    const certificates = await prisma.certificate.findMany({
      where: {
        studentId: parseInt(studentId)
      },
      select: {
        certificateId: true,
        studentName: true,
        courseName: true,
        completionDate: true,
        format: true,
        qrCodeData: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });

  } catch (error) {
    console.error('Get student certificates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve certificates',
      error: error.message
    });
  }
};

/**
 * @desc    Check certificate template status
 * @route   GET /api/certificates/template/status
 * @access  Private (Admin only)
 */
const checkTemplateStatus = (prisma) => async (req, res) => {
  try {
    const templateStatus = await certificateService.verifyTemplate();

    return res.status(200).json({
      success: true,
      template: templateStatus
    });

  } catch (error) {
    console.error('Template status check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check template status',
      error: error.message
    });
  }
};

/**
 * @desc    Export certificate to file system (for development/testing)
 * @route   POST /api/certificates/export/:certificateId
 * @access  Private (Admin only)
 */
const exportCertificate = (prisma) => async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { outputDir } = req.body; // Optional custom output directory

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required'
      });
    }

    // Find certificate
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Decrypt certificate data
    const decryptedData = await certificateService.retrieveCertificate(certificate.fileData);

    // Export to file
    const exportResult = await certificateService.exportCertificateToFile(
      decryptedData,
      certificate.certificateId,
      certificate.format,
      outputDir
    );

    return res.status(200).json({
      success: true,
      message: 'Certificate exported successfully',
      export: exportResult
    });

  } catch (error) {
    console.error('Certificate export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Certificate export failed',
      error: error.message
    });
  }
};

export {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  getStudentCertificates,
  checkTemplateStatus,
  exportCertificate
};