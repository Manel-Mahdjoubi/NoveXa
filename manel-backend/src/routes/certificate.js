/**
 * NoveXa Certificate Routes
 * 
 * Secure routes for certificate generation, download, and verification
 */

import express from 'express';
import {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  getStudentCertificates,
  checkTemplateStatus,
  exportCertificate
} from '../controllers/certificateController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const createCertificateRoutes = (prisma) => {
  const router = express.Router();

  console.log('✅ Certificate Router Initialized');

  // Debug route
  router.get('/debug/ping', (req, res) => {
    console.log('🔔 Certificate Ping received');
    res.json({ success: true, message: 'Pong from Certificate Router' });
  });

  // Public route - Certificate verification (for QR codes)
  router.get('/verify/:certificateId', verifyCertificate(prisma));

  // Protected routes - Require authentication
  router.post('/generate', verifyToken, generateCertificate(prisma));
  router.get('/download/:certificateId', verifyToken, downloadCertificate(prisma));
  router.get('/student/:studentId', verifyToken, getStudentCertificates(prisma));
  
  // Admin/Development routes
  router.get('/template/status', verifyToken, checkTemplateStatus(prisma));
  router.post('/export/:certificateId', verifyToken, exportCertificate(prisma));

  return router;
};

export default createCertificateRoutes;