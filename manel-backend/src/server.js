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

// --- 1. CORS & Security Headers ---
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://novexa-online.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5500'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // For debugging: if origin is not allowed, still log it but don't block yet (or block if desired)
    console.log(`⚠️ Origin ${origin} not in explicit whitelist, defaulting to *`);
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// --- 2. Basic Routes ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'up', time: new Date().toISOString() });
});

app.get('/api/test-email', async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'RESEND_API_KEY missing' });
    }

    console.log('🔍 Testing Resend API connection...');
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'NoveXa Academy <onboarding@resend.dev>',
      to: ['novexaacademy@gmail.com'], // Test to yourself
      subject: 'Test connection from Render',
      html: '<strong>Resend API (HTTP) is working!</strong>'
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.status(200).json({ success: true, message: 'Resend API verified!', data: response.data });
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error('❌ Resend Test Failed:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// --- 3. Body Parsing ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/quiz-access', quizAccessRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/7x_admin_control_9', adminRoutes(prisma));
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