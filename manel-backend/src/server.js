import express from 'express';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import quizAccessRoutes from './routes/quizAccessRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import studentDashboardRoutes from './routes/studentDashboard.routes.js';
import teacherDashboardRoutes from './routes/teacherDashboard.routes.js';
import teacherTaskRoutes from './routes/teacherTask.routes.js';
import createQuizRoutes from './routes/quiz.js';
import adminRoutes from './routes/admin.js';
import libraryRoutes from './routes/library.routes.js';
import studentRoutes from './routes/student.js'; 
import teacherRoutes from './routes/teacher.js'; 
import createCertificateRoutes from './routes/certificate.js'; 
import { initializeAdmins } from './controllers/adminController.js';
import { prisma } from './config/db.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Global Request Logger - ABSOLUTE TOP
app.use((req, res, next) => {
  console.log(`📡 [HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

const PORT = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://novexa-online.vercel.app',
    'http://localhost:5500', 
    'http://127.0.0.1:5500',
    'http://127.0.0.1:54578'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Fallback to wildcard if origin is not in list but we want to be permissive
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/quiz-access', quizAccessRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes(prisma));
app.use('/api/students', studentRoutes(prisma));
app.use('/api/teachers', teacherRoutes(prisma));
app.use('/api/certificates', createCertificateRoutes(prisma)); 
app.use('/api/student', studentDashboardRoutes);
app.use('/api/teacher', teacherDashboardRoutes);
app.use('/api/teacher/tasks', teacherTaskRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/quiz', createQuizRoutes(prisma));

// Error handling
app.use(notFound);
app.use(errorHandler);

// --- SERVER STARTUP SEQUENCE ---
const startServer = async () => {
  try {
    console.log('🚀 Starting NoveXa Backend...');
    
    // 1. Connect to Database
    await connectDB();
    
    // 2. Initialize Admins
    console.log('👥 Initializing admins...');
    await initializeAdmins(prisma)();
    
    // 3. Start Express Server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ PORT ${PORT} IS ALREADY IN USE! Kill the other node process.`);
      } else {
        console.error('❌ Server Error:', err);
      }
      process.exit(1);
    });

    // Stability: Keep event loop alive
    setInterval(() => {}, 1000 * 60 * 60);

    // Increase timeouts
    server.timeout = 10 * 60 * 1000;

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 ${signal} received. Shutting down...`);
      server.close(async () => {
        await disconnectDB();
        console.log('👋 Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('💥 FATAL ERROR DURING STARTUP:');
    console.error(error);
    process.exit(1);
  }
};

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('📛 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('📛 Uncaught Exception:', err);
    process.exit(1);
});

startServer();

export default app;