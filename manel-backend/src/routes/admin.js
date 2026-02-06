import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';

const createAdminRoutes = (prisma) => {
  const router = express.Router();

  // Public routes
  router.post('/login', adminController.loginAdmin(prisma));

  // Protected routes (require admin authentication)
  router.get('/statistics', authenticateAdmin, adminController.getStatistics(prisma));
  router.get('/students', authenticateAdmin, adminController.getAllStudents(prisma));
  router.get('/students/:id', authenticateAdmin, adminController.getStudentById(prisma));
  router.get('/teachers', authenticateAdmin, adminController.getAllTeachers(prisma));
  router.get('/teachers/:id', authenticateAdmin, adminController.getTeacherById(prisma));
  router.get('/courses', authenticateAdmin, adminController.getAllCourses(prisma));
  router.get('/users', authenticateAdmin, adminController.getAllUsers(prisma));
  
  // Deletion request management
  router.get('/deletion-requests', authenticateAdmin, adminController.getAllDeletionRequests(prisma));
  router.put('/deletion-requests/:requestId/review', authenticateAdmin, adminController.reviewDeletionRequest(prisma));
  router.delete('/courses/:courseId', authenticateAdmin, adminController.deleteCourse(prisma));

  // Library resource management
  router.get('/library-requests', authenticateAdmin, adminController.getLibraryRequests(prisma));
  router.put('/library-requests/:id/approve', authenticateAdmin, adminController.approveLibraryRequest(prisma));
  router.put('/library-requests/:id/reject', authenticateAdmin, adminController.rejectLibraryRequest(prisma));
  router.delete('/library-resources/:id', authenticateAdmin, adminController.deleteLibraryResource(prisma));

  // Superadmin only routes
  router.get('/admins', authenticateAdmin, requireSuperAdmin, adminController.getAllAdmins(prisma));
  router.post('/admins', authenticateAdmin, requireSuperAdmin, adminController.createAdmin(prisma));
  router.put('/admins/:id', authenticateAdmin, requireSuperAdmin, adminController.updateAdmin(prisma));
  router.delete('/admins/:id', authenticateAdmin, requireSuperAdmin, adminController.deleteAdmin(prisma));

  return router;
};

export default createAdminRoutes;