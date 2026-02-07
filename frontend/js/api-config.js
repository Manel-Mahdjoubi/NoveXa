// API Configuration
const API_CONFIG = {
  BASE_URL: 'https://novexa-backend.onrender.com/api',
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER_STUDENT: '/auth/register/student',
    REGISTER_TEACHER: '/auth/register/teacher',
    GET_ME: '/auth/me',
    
    // Courses
    GET_ALL_COURSES: '/courses',
    GET_COURSE_BY_ID: '/courses',
    CREATE_COURSE: '/courses',
    GET_COURSES_BY_TEACHER: '/courses/teacher',
    UPDATE_COURSE: '/courses',
    
    // Quiz Management
    LINK_QUIZ_TO_CHAPTER: (chapterId) => `/courses/chapters/${chapterId}/quiz`,
    GET_QUIZ_BY_CHAPTER: (chapterId) => `/courses/chapters/${chapterId}/quiz`,
    
    // Enrollment
    ENROLL: '/enrollment/enroll',
    CHECK_ENROLLMENT: '/enrollment/check',
    MY_COURSES: '/enrollment/my-courses',
    
    // Learning
    COURSE_LEARNING: '/learning/course',
    LECTURE_DETAILS: '/learning/lecture',
    UPDATE_PROGRESS: '/learning/progress/lecture',
    
    // Quiz Access
    VERIFY_QUIZ: '/quiz-access/verify',
    QUIZ_STATUS: '/quiz-access/status',
    START_ATTEMPT: '/quiz-access/start-attempt',
    
    // Files
    COURSE_FILES: '/files/courses',

    // Dashboard
    STUDENT_DASHBOARD: '/student/dashboard',
    TEACHER_DASHBOARD: '/teacher/dashboard',
    LIBRARY: '/library',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',

    // Admin
    ADMIN_LOGIN: '/admin/login',
    ADMIN_STATISTICS: '/admin/statistics',
    ADMIN_STUDENTS: '/admin/students',
    ADMIN_TEACHERS: '/admin/teachers',
    ADMIN_DELETION_REQUESTS: '/admin/deletion-requests',
    ADMIN_REVIEW_DELETION_REQUEST: (requestId) => `/admin/deletion-requests/${requestId}/review`,
    ADMIN_LIBRARY_REQUESTS: '/admin/library-requests',
    ADMIN_APPROVE_LIBRARY_REQUEST: (id) => `/admin/library-requests/${id}/approve`,
    ADMIN_REJECT_LIBRARY_REQUEST: (id) => `/admin/library-requests/${id}/reject`,

    // Legacy/Generic (from config.js)
    QUIZ: '/quiz',
    TEACHERS: '/teachers',
    STUDENTS: '/students',
    PAYMENTS: '/payments',
  },
  // Storage Keys
  KEYS: {
    TOKEN: 'token',
    USER: 'user',
    ADMIN_TOKEN: 'adminToken',
    ROLE: 'role'
  },
  // Cloudinary Constants
  CLOUDINARY: {
    CLOUD_NAME: 'dzupis7ps',
    UPLOAD_PRESET: 'novexa_library_preset',
    URL: 'https://api.cloudinary.com/v1_1/dzupis7ps/auto/upload'
  }
};

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem(API_CONFIG.KEYS.TOKEN);
}

// Helper function to get admin token
function getAdminToken() {
  return localStorage.getItem(API_CONFIG.KEYS.ADMIN_TOKEN);
}

// Helper function to get auth headers
function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}
// Helper function to get user data
function getUserData() {
  const userStr = localStorage.getItem(API_CONFIG.KEYS.USER);
  return userStr ? JSON.parse(userStr) : null;
}

// Helper function to check if user is logged in
function isUserLoggedIn() {
  return !!getAuthToken();
}

// Helper function to get user role
function getUserRole() {
  const user = getUserData();
  return user ? user.role : null;
}

// Helper function to logout
function logout() {
  localStorage.clear();
  window.location.href = '../Homepage/homepage.html';
}

// Helper function to logout admin
function logoutAdmin() {
  localStorage.removeItem(API_CONFIG.KEYS.ADMIN_TOKEN);
  sessionStorage.clear();
  window.location.href = '../admin/admin-login.html';
}

// Generic API call function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Helper function to build file URL
function getFileURL(filePath) {
  if (!filePath) return '';
  
  // If it's already a full URL, return it
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Build full URL from relative path
  const baseURL = API_CONFIG.BASE_URL.replace('/api', '');
  return `${baseURL}/${filePath}`;
}

// Helper function to show notifications (Top-Right)
function showNotification(message, type = 'info') {
  // Remove existing notifications to avoid overlap
  const existing = document.querySelectorAll('.custom-notification');
  existing.forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `custom-notification notification-${type}`;
  
  // Base styles for the notification
  const baseStyles = `
    position: fixed;
    top: 20px;
    right: 20px;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    z-index: 100000;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform: translateX(120%);
    opacity: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    pointer-events: auto;
    cursor: pointer;
  `;
  
  // Type-specific styles
  const themes = {
    success: { bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', icon: '✅' },
    error: { bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', icon: '❌' },
    info: { bg: 'linear-gradient(135deg, #3498db, #2980b9)', icon: 'ℹ️' },
    warning: { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', icon: '⚠️' }
  };
  
  const theme = themes[type] || themes.info;
  
  notification.style.cssText = baseStyles + `background: ${theme.bg};`;
  notification.innerHTML = `<span>${theme.icon}</span> <span>${message}</span>`;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  });
  
  // Animate out and remove
  const timer = setTimeout(() => {
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 400);
  }, 4000);

  // Click to dismiss
  notification.onclick = () => {
    clearTimeout(timer);
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 400);
  };
}