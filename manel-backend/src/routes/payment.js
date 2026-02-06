/**
 * Payment Routes (DEMO VERSION)
 * For presentation purposes only
 */

import express from 'express';
import {
  getCourseForPayment,
  processDummyPayment,
  getPaymentHistory
} from '../controllers/paymentController.js';
import { verifyToken, isStudent } from '../middleware/authMiddleware.js';

export default (prisma) => {
  const router = express.Router();

  /**
   * @route   GET /api/payments/course/:courseId
   * @desc    Get course details for payment page
   * @access  Protected - Students only
   * @params  courseId - The ID of the course
   * @returns Course details with price
   */
  router.get('/course/:courseId', verifyToken, isStudent, getCourseForPayment(prisma));

  /**
   * @route   POST /api/payments/process
   * @desc    Process dummy payment and enroll student (DEMO ONLY)
   * @access  Protected - Students only
   * @body    { courseId, paymentMethod, cardNumber, cardHolder }
   * @returns Enrollment confirmation with transaction ID
   */
  router.post('/process', verifyToken, isStudent, processDummyPayment(prisma));

  /**
   * @route   GET /api/payments/history
   * @desc    Get payment history for logged-in student
   * @access  Protected - Students only
   * @returns Array of payments/enrollments
   */
  router.get('/history', verifyToken, isStudent, getPaymentHistory(prisma));

  return router;
};