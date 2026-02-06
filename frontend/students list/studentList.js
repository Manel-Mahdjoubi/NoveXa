/**
 * NoveXa Student Dashboard - Enhanced Edition
 * Professional student management system with advanced features
 */

// ========================================
// CONFIGURATION
// ========================================

const API_BASE_URL = API_CONFIG.BASE_URL;

// ========================================
// DATA MANAGEMENT
// ========================================

// Student data - Loaded from backend API
let studentsData = [];
 
// Configuration
const CONFIG = {
    rowsPerPage: 10,
    animationDuration: 300,
    debounceDelay: 300,
    toastDuration: 3000
};

// State management
const state = {
    currentPage: 1,
    sortColumn: 0,
    sortAscending: true,
    filters: {
        course: '',
        search: ''
    }
};

// ========================================
// AUTHENTICATION & API HELPERS
// ========================================

// Get JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem(API_CONFIG.KEYS.TOKEN);
}

// Check if user is authenticated
function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        alert('Please login to view students');
        window.location.href = '../login/login.html';
        return false;
    }
    return true;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...(options.headers || {}) }
        });

        const data = await response.json();

        if (response.status === 401) {
            alert('Session expired. Please login again.');
            window.location.href = '../login/login.html';
            return null;
        }

        if (response.status === 403) {
            alert('Access denied. You do not have permission to view this page.');
            return null;
        }

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message || 'Failed to connect to server', 'error');
        return null;
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        return;
    }
    
    setupEventListeners();
    initializeDashboard();
});

function initializeDashboard() {
    showLoadingState();
    // Populate course filter dropdown
    populateCourseFilter();
    // Load real data from backend
    loadStudentsData()
        .then(() => {
            renderTable();
            hideLoadingState();
        })
        .catch(() => {
            hideLoadingState();
        });
}

async function populateCourseFilter() {
    try {
        // Get unique courses from the current student data
        const result = await apiRequest('/students/with-quiz-stats?page=1&limit=1000');
        if (result && result.success && result.data) {
            const courses = [...new Set(result.data.map(s => s.course).filter(c => c && c !== 'No enrollment'))];
            courses.sort();
            
            const courseFilter = document.getElementById('courseFilter');
            if (courseFilter) {
                // Keep the "All Courses" option
                courseFilter.innerHTML = '<option value="">All Courses</option>';
                
                // Add each unique course
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course;
                    option.textContent = course;
                    courseFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading courses for filter:', error);
    }
}

function setupEventListeners() {
    // Search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.filters.search = e.target.value;
                searchStudents();
            }, CONFIG.debounceDelay);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Handle browser back button
    window.addEventListener('popstate', renderTable);
}

// ========================================
// DATA OPERATIONS
// ========================================

async function loadStudentsData() {
    try {
        const { currentPage, filters } = state;
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: CONFIG.rowsPerPage,
            search: filters.search || '',
            course: filters.course || ''
        });

        const result = await apiRequest(`/students/with-quiz-stats?${queryParams.toString()}`);
        
        if (!result || !result.success) {
            throw new Error('Failed to load students');
        }

        // Store metadata in state
        state.totalPages = result.totalPages || 1;
        state.totalItems = result.total || 0;

        // Transform backend data to frontend format
        studentsData = result.data.map(student => {
            let enrollDateStr = 'N/A';
            if (student.enrollmentDate) {
                try {
                    enrollDateStr = new Date(student.enrollmentDate).toISOString().split('T')[0];
                } catch (e) {
                    console.warn('Invalid enrollment date for student:', student.id);
                }
            }

            return {
                id: student.id,
                name: student.fullName,
                email: student.email,
                course: student.course || 'No enrollment',
                enrollmentDate: enrollDateStr,
                lastActive: new Date().toISOString().split('T')[0]
            };
        });

        console.log('✅ Loaded', studentsData.length, 'students from backend. Total items:', state.totalItems);
        return studentsData;
    } catch (error) {
        console.error('❌ Error loading students:', error);
        showToast('Failed to load student data', 'error');
        throw error;
    }
}

async function addStudentEnrollment(studentData) {
    try {
        // Validate input
        if (!validateStudentData(studentData)) {
            throw new Error('Invalid student data');
        }

        const newStudent = {
            id: generateUniqueId(),
            name: studentData.name,
            email: studentData.email,
            course: studentData.course,
            quizScore: 0,
            progress: 0,
            enrollmentDate: new Date().toISOString().split('T')[0],
            lastActive: new Date().toISOString().split('T')[0],
            completedQuizzes: 0,
            totalQuizzes: 10
        };
        
        studentsData.push(newStudent);
        updateStats();
        renderTable();
        showToast(`${newStudent.name} enrolled successfully!`, 'success');
        
        console.log('New student enrolled:', newStudent);
        return newStudent;
        
    } catch (error) {
        console.error(' Error enrolling student:', error);
        showToast('Failed to enroll student', 'error');
        throw error;
    }
}

async function updateQuizScore(studentId, score, quizNumber) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }

    try {
        const previousScore = student.quizScore;
        student.quizScore = score;
        student.completedQuizzes = quizNumber;
        student.lastActive = new Date().toISOString().split('T')[0];
        
        // Calculate new progress
        student.progress = Math.round((student.completedQuizzes / student.totalQuizzes) * 100);
        updateStats();
        renderTable();
        
        const improvement = score - previousScore;
        const message = improvement > 0 
            ? `${student.name} improved by ${improvement}%! 🎉`
            : `Quiz score updated for ${student.name}`;
        showToast(message, improvement > 0 ? 'success' : 'info');
        
    } catch (error) {
        console.error('❌ Error updating quiz score:', error);
        showToast('Failed to update quiz score', 'error');
    }
}

async function updateProgress(studentId, progress) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }

    try {
        student.progress = Math.max(0, Math.min(100, progress));
        student.lastActive = new Date().toISOString().split('T')[0];
        
        renderTable();
        showToast(`Progress updated for ${student.name}`, 'success');
        
    } catch (error) {
        console.error(' Error updating progress:', error);
        showToast('Failed to update progress', 'error');
    }
}

// ========================================
// STATISTICS
// ========================================

function updateStats() {
    const stats = calculateStats();
    
    animateNumber('totalStudents', stats.totalStudents);
    animateNumber('activeCourses', stats.activeCourses);
}

function calculateStats() {
    const totalStudents = state.totalItems || studentsData.length;
    const activeCourses = new Set(studentsData.map(s => s.course)).size;
    
    return { totalStudents, activeCourses };
}

function animateNumber(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuad(progress));
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

// ========================================
// TABLE RENDERING
// ========================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // Clear existing content immediately
    tbody.innerHTML = '';
    
    // With backend pagination, studentsData is already filtered and paginated correctly
    if (studentsData.length === 0) {
        showEmptyState(tbody);
    } else {
        studentsData.forEach((student, index) => {
            const row = createTableRow(student);
            row.style.animationDelay = `${index * 50}ms`;
            tbody.appendChild(row);
        });
    }
    
    updatePagination(state.totalItems);
    updateTableCount();
    updateStats();
}

function updateTableCount() {
    const tableCount = document.getElementById('tableCount');
    if (tableCount) {
        const count = studentsData.length;
        const total = state.totalItems || count;
        tableCount.textContent = `Showing ${count} of ${total} students`;
    }
}

function createTableRow(student) {
    const row = document.createElement('tr');
    row.className = 'table-row-animate';
    
    row.innerHTML = `
        <td><span class="id-badge">#${student.id}</span></td>
        <td>
            <div class="student-name">
                <strong>${escapeHtml(student.name)}</strong>
                <small class="last-active">Last active: ${getTimeAgo(student.lastActive)}</small>
            </div>
        </td>
        <td>
            <a href="mailto:${escapeHtml(student.email)}" class="email-link">
                ${escapeHtml(student.email)}
            </a>
        </td>
        <td>
            <span class="course-badge">${escapeHtml(student.course)}</span>
        </td>
        <td>
            <div class="date-info">
                ${formatDate(student.enrollmentDate)}
                <small>${getDaysEnrolled(student.enrollmentDate)} days ago</small>
            </div>
        </td>
    `;
    
    return row;
}

function showEmptyState(tbody) {
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No students found</h3>
                <p>Try adjusting your filters or search criteria</p>
                <button class="btn-primary" onclick="clearFilters()">Clear All Filters</button>
            </td>
        </tr>
    `;
}

// ========================================
// FILTERING & SORTING
// ========================================

function getFilteredData() {
    let filtered = [...studentsData];
    
    // Course filter
    const courseFilter = document.getElementById('courseFilter')?.value || '';
    if (courseFilter) {
        filtered = filtered.filter(s => s.course === courseFilter);
    }
    
    // Search filter
    const searchTerm = state.filters.search.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.course.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

function sortTable(columnIndex) {
    if (state.sortColumn === columnIndex) {
        state.sortAscending = !state.sortAscending;
    } else {
        state.sortColumn = columnIndex;
        state.sortAscending = true;
    }
    
    const sortKeys = ['id', 'name', 'email', 'course', 'quizScore', 'progress'];
    const key = sortKeys[columnIndex];
    
    studentsData.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (typeof aVal === 'string') {
            return state.sortAscending 
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        } else {
            return state.sortAscending ? aVal - bVal : bVal - aVal;
        }
    });
    
    // Update sort icons
    updateSortIcons(columnIndex);
    renderTable();
}

function updateSortIcons(activeColumn) {
    document.querySelectorAll('.sort-icon').forEach((icon, index) => {
        if (index === activeColumn) {
            icon.textContent = state.sortAscending ? '▲' : '▼';
            icon.style.opacity = '1';
        } else {
            icon.textContent = '⇅';
            icon.style.opacity = '0.5';
        }
    });
}

async function searchStudents() {
    state.currentPage = 1;
    state.filters.search = document.getElementById('searchInput')?.value || '';
    
    showLoadingState();
    try {
        await loadStudentsData();
        renderTable();
    } catch (error) {
        console.error('Error searching students:', error);
    } finally {
        hideLoadingState();
    }
}

async function filterTable() {
    state.currentPage = 1;
    state.filters.course = document.getElementById('courseFilter')?.value || '';
    
    showLoadingState();
    try {
        await loadStudentsData();
        renderTable();
    } catch (error) {
        console.error('Error filtering table:', error);
    } finally {
        hideLoadingState();
    }
}

async function clearFilters() {
    const courseFilter = document.getElementById('courseFilter');
    if (courseFilter) courseFilter.value = '';
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    state.filters = { course: '', search: '' };
    state.currentPage = 1;
    
    showLoadingState();
    try {
        await loadStudentsData();
        renderTable();
        
    } catch (error) {
        console.error('Error clearing filters:', error);
    } finally {
        hideLoadingState();
    }
}

// ========================================
// PAGINATION
// ========================================

function getPaginatedData(data) {
    const start = (state.currentPage - 1) * CONFIG.rowsPerPage;
    const end = start + CONFIG.rowsPerPage;
    return data.slice(start, end);
}

function updatePagination(totalItems) {
    const pageInfoEl = document.getElementById('pageInfo');
    if (!pageInfoEl) return;
    
    const totalPages = Math.ceil(totalItems / CONFIG.rowsPerPage) || 1;
    pageInfoEl.textContent = `Page ${state.currentPage} of ${totalPages}`;
    
    // Update button states
    const prevBtn = document.querySelector('.btn-page:first-child');
    const nextBtn = document.querySelector('.btn-page:last-child');
    
    if (prevBtn) prevBtn.disabled = state.currentPage === 1;
    if (nextBtn) nextBtn.disabled = state.currentPage === totalPages;
}

function changePage(direction) {
    const newPage = state.currentPage + direction;
    
    if (newPage >= 1 && newPage <= (state.totalPages || 1)) {
        state.currentPage = newPage;
        
        showLoadingState();
        loadStudentsData()
            .then(() => {
                renderTable();
                hideLoadingState();
                
                // Smooth scroll to top of table
                document.querySelector('.table-container')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            })
            .catch(() => {
                hideLoadingState();
            });
    }
}

// ========================================
// STUDENT ACTIONS
// ========================================

function viewStudent(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }
    
    const modal = document.getElementById('studentModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <div class="student-details">
            <div class="detail-header">
                <h3>${escapeHtml(student.name)}</h3>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Email</label>
                    <a href="mailto:${escapeHtml(student.email)}">${escapeHtml(student.email)}</a>
                </div>
                
                <div class="detail-item">
                    <label> Course</label>
                    <strong>${escapeHtml(student.course)}</strong>
                </div>
                
                <div class="detail-item">
                    <label>Enrollment Date</label>
                    <strong>${formatDate(student.enrollmentDate)}</strong>
                    <small>(${getDaysEnrolled(student.enrollmentDate)} days ago)</small>
                </div>
                
                <div class="detail-item">
                    <label>Last Active</label>
                    <strong>${formatDate(student.lastActive)}</strong>
                    <small>(${getTimeAgo(student.lastActive)})</small>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn-primary" onclick="editStudent(${student.id}); closeModal();">
                     Edit Student
                </button>
                <button class="btn-secondary" onclick="closeModal()">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function editStudent(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;
    
    // This is a placeholder - implement your edit functionality
    showToast(`Edit functionality for ${student.name} - Coming soon!`, 'info');
    console.log('Edit student:', student);
}

function deleteStudent(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete ${student.name}?\n\nThis action cannot be undone.`)) {
        studentsData = studentsData.filter(s => s.id !== id);
        updateStats();
        renderTable();
        showToast(`${student.name} has been removed`, 'success');
    }
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('studentModal');
    if (event.target === modal) {
        closeModal();
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

async function refreshData() {
    showLoadingState();
    
    try {
        await loadStudentsData();
        updateStats();
        renderTable();
    } catch (error) {
        showToast('Failed to refresh data', 'error');
    } finally {
        hideLoadingState();
    }
}

function exportToCSV() {
    try {
        const headers = ['ID', 'Name', 'Email', 'Course', 'Quiz Score', 'Progress', 'Completed Quizzes', 'Total Quizzes', 'Enrollment Date', 'Last Active'];
        const rows = studentsData.map(s => [
            s.id,
            s.name,
            s.email,
            s.course,
            s.quizScore,
            s.progress,
            s.completedQuizzes,
            s.totalQuizzes,
            s.enrollmentDate,
            s.lastActive
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NoveXa_students_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        showToast('CSV exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export CSV', 'error');
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPerformanceClass(score) {
    if (score >= 90) return 'status-excellent';
    if (score >= 75) return 'status-good';
    if (score >= 60) return 'status-average';
    return 'status-needs-improvement';
}

function getPerformanceEmoji(score) {
    if (score >= 90) return '';
    if (score >= 75) return '';
    if (score >= 60) return '';
    return '';
}

function getProgressClass(progress) {
    if (progress >= 80) return 'progress-excellent';
    if (progress >= 60) return 'progress-good';
    if (progress >= 40) return 'progress-average';
    return 'progress-low';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function getDaysEnrolled(enrollmentDate) {
    const enrolled = new Date(enrollmentDate);
    const now = new Date();
    const diffTime = Math.abs(now - enrolled);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function generateUniqueId() {
    return Math.max(...studentsData.map(s => s.id), 0) + 1;
}

function validateStudentData(data) {
    if (!data.name || data.name.trim().length < 2) {
        showToast('Invalid student name', 'error');
        return false;
    }
    
    if (!data.email || !data.email.includes('@')) {
        showToast('Invalid email address', 'error');
        return false;
    }
    
    if (!data.course || data.course.trim().length < 2) {
        showToast('Invalid course name', 'error');
        return false;
    }
    
    return true;
}

// ========================================
// UI FEEDBACK
// ========================================

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${getToastIcon(type)}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.toastDuration);
}

function showLoadingState() {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.add('loading');
    }
}

function hideLoadingState() {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.remove('loading');
    }
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
    }
    
    // Ctrl/Cmd + R: Refresh data
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
    
    // Ctrl/Cmd + E: Export CSV
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportToCSV();
    }
    
    // Escape: Close modal
    if (e.key === 'Escape') {
        closeModal();
    }
}

// ========================================
// BATCH OPERATIONS (BONUS FEATURES)
// ========================================

function selectAllStudents() {
    // Implementation for bulk operations
    showToast('Bulk operations coming soon!', 'info');
}

function exportSelectedStudents() {
    // Implementation for exporting selected students
    showToast('Export selected - Coming soon!', 'info');
}

// ========================================
// ANALYTICS (BONUS)
// ========================================

function getStudentAnalytics() {
    const analytics = {
        averageScore: studentsData.reduce((sum, s) => sum + s.quizScore, 0) / studentsData.length,
        averageProgress: studentsData.reduce((sum, s) => sum + s.progress, 0) / studentsData.length,
        topCourse: getMostPopularCourse(),
        completionRate: getOverallCompletionRate(),
        activeStudents: getActiveStudentsCount()
    };
    
    return analytics;
}

function getMostPopularCourse() {
    const courseCounts = {};
    studentsData.forEach(s => {
        courseCounts[s.course] = (courseCounts[s.course] || 0) + 1;
    });
    
    return Object.entries(courseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}

function getOverallCompletionRate() {
    const totalCompleted = studentsData.reduce((sum, s) => sum + s.completedQuizzes, 0);
    const totalQuizzes = studentsData.reduce((sum, s) => sum + s.totalQuizzes, 0);
    return totalQuizzes > 0 ? Math.round((totalCompleted / totalQuizzes) * 100) : 0;
}

function getActiveStudentsCount() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return studentsData.filter(s => new Date(s.lastActive) >= sevenDaysAgo).length;
}
// ========================================
// AUTO-SAVE (LOCAL STORAGE BACKUP)
// ========================================

function saveToLocalStorage() {
    try {
        localStorage.setItem('novexa_students_backup', JSON.stringify(studentsData));
        localStorage.setItem('novexa_backup_date', new Date().toISOString());
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const backup = localStorage.getItem('novexa_students_backup');
        if (backup) {
            const backupDate = localStorage.getItem('novexa_backup_date');
            console.log(` Backup found from ${backupDate}`);
            return JSON.parse(backup);
        }
    } catch (error) {
        console.warn('Could not load from localStorage:', error);
    }
    return null;
}

// Auto-save every 30 seconds
setInterval(saveToLocalStorage, 30000);