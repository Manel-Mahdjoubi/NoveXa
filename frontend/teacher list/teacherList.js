// ========================================
// CONFIGURATION
// ========================================

const API_BASE_URL = API_CONFIG.BASE_URL;

// Teacher data - Loaded from backend API
let teachersData = [];


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
        alert('Please login to view teachers');
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

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// DATA OPERATIONS

document.addEventListener('DOMContentLoaded', function() {
    // Authentication is optional for teachers list (public browsing)
    setupEventListeners();
    initializeDashboard();
});

function initializeDashboard() {
    showLoadingState();
    // Load real data from backend
    loadTeachersData()
        .then(() => {
            renderTable();
            hideLoadingState();
        })
        .catch(() => {
            hideLoadingState();
        });
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
                searchTeachers();
            }, CONFIG.debounceDelay);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Handle browser back button
    window.addEventListener('popstate', renderTable);

    // Hide loading overlay after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.getElementById('loadingOverlay')?.classList.add('hidden');
        }, 500);
    });
}

// DATA OPERATIONS

async function loadTeachersData() {
    try {
        console.log('🔄 Loading teachers from backend...');
        
        const { currentPage, filters } = state;
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: CONFIG.rowsPerPage,
            search: filters.search || ''
        });
        
        // Teachers list is public, no authentication needed
        const result = await apiRequest(`/teachers?${queryParams.toString()}`);
        
        if (!result || !result.success) {
            throw new Error('Failed to load teachers');
        }

        // Store metadata in state
        state.totalPages = result.totalPages || 1;
        state.totalItems = result.total || 0;

        // Transform backend data to frontend format
        teachersData = result.data.map(teacher => {
            let joinedDateStr = 'N/A';
            const joinedAt = teacher.created_at;
            if (joinedAt) {
                try {
                    joinedDateStr = new Date(joinedAt).toISOString().split('T')[0];
                } catch (e) {
                    console.warn('Invalid date for teacher:', teacher.id, joinedAt);
                }
            }

            return {
                id: teacher.id,
                name: teacher.fullName,
                email: teacher.email,
                course: 'Multiple Courses',
                joinedDate: joinedDateStr,
                lastActive: new Date().toISOString().split('T')[0],
                totalCourses: teacher.totalCourses || 0,
                experience: teacher.experience || 'N/A'
            };
        });

        console.log('✅ Loaded', teachersData.length, 'teachers from backend. Total:', state.totalItems);
        return teachersData;
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
        showToast('Failed to load teachers', 'error');
        throw error;
    }
}

// TABLE RENDERING

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // Clear existing content immediately
    tbody.innerHTML = '';
    
    // With backend pagination, teachersData is already filtered and paginated
    if (teachersData.length === 0) {
        showEmptyState(tbody);
    } else {
        teachersData.forEach((teacher, index) => {
            const row = createTableRow(teacher);
            row.style.animationDelay = `${index * 50}ms`;
            tbody.appendChild(row);
        });
    }
    
    updatePagination(state.totalItems);
    updateTableCount();
}

function createTableRow(teacher) {
    const row = document.createElement('tr');
    row.className = 'table-row-animate';
    
    row.innerHTML = `
        <td><span class="id-badge">#${teacher.id}</span></td>
        <td>
            <div class="student-name">
                <strong>${escapeHtml(teacher.name)}</strong>
                <small class="last-active">Last active: ${getTimeAgo(teacher.lastActive)}</small>
            </div>
        </td>
        <td>
            <a href="mailto:${escapeHtml(teacher.email)}" class="email-link">
                ${escapeHtml(teacher.email)}
            </a>
        </td>
        <td>
            <span class="course-badge">${escapeHtml(teacher.course)}</span>
        </td>
        <td>
            <div class="date-info">
                ${formatDate(teacher.joinedDate)}
                <small>${getDaysJoined(teacher.joinedDate)} days ago</small>
            </div>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn-view" onclick="viewTeacher(${teacher.id})" 
                        title="View details">
                     view
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function showEmptyState(tbody) {
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <h3>No teachers found</h3>
                <p>Try adjusting your filters or search criteria</p>
                <button class="btn-primary" onclick="clearFilters()">Clear All Filters</button>
            </td>
        </tr>
    `;
}

// FILTERING & SORTING

function getFilteredData() {
    // For server-side filtering, we just return the data as is because the backend has already filtered it
    return teachersData;
}

function sortTable(columnIndex) {
    if (state.sortColumn === columnIndex) {
        state.sortAscending = !state.sortAscending;
    } else {
        state.sortColumn = columnIndex;
        state.sortAscending = true;
    }
    
    const sortKeys = ['id', 'name', 'email', 'course'];
    const key = sortKeys[columnIndex];
    
    teachersData.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (typeof aVal === 'string') {
            return state.sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
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

async function searchTeachers() {
    state.currentPage = 1;
    showLoadingState();
    try {
        await loadTeachersData();
        renderTable();
    } catch (error) {
        console.error('Error searching teachers:', error);
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
        await loadTeachersData();
        renderTable();
        showToast('Filters cleared', 'info');
    } catch (error) {
        console.error('Error clearing filters:', error);
    } finally {
        hideLoadingState();
    }
}

// PAGINATION

function getPaginatedData(data) {
    // Backend handles pagination
    return data;
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
        loadTeachersData()
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

// TEACHER ACTIONS

async function viewTeacher(id) {
    const modal = document.getElementById('teacherModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    // Show loading state in modal
    modalBody.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    
    try {
        const result = await apiRequest(`/teachers/${id}`);
        
        if (!result || !result.success) {
            throw new Error('Failed to load teacher details');
        }
        
        const teacher = result.data;
        
        // Generate courses list HTML
        const coursesListHtml = teacher.courses && teacher.courses.length > 0 
            ? `<ul class="course-list-detail">
                ${teacher.courses.map(c => `<li>${escapeHtml(c.title)} <span class="badge-sm">${c.field || 'General'}</span></li>`).join('')}
               </ul>`
            : '<em>No courses listed</em>';

        modalBody.innerHTML = `
            <div class="student-details">
                <div class="detail-header">
                    <img src="${teacher.profilePicture || '../assets/default-avatar.png'}" alt="Profile" class="detail-avatar">
                    <h3>${escapeHtml(teacher.fullName)}</h3>
                    <p class="text-muted">${escapeHtml(teacher.field || 'Instructor')}</p>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Email</label>
                        <a href="mailto:${escapeHtml(teacher.email)}">${escapeHtml(teacher.email)}</a>
                    </div>
                    
                    <div class="detail-item">
                        <label>Courses</label>
                        <div class="courses-container">
                            ${coursesListHtml}
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <label>Joined Date</label>
                        <strong>${formatDate(teacher.joinedAt)}</strong>
                    </div>

                    <div class="detail-item">
                        <label>Bio</label>
                        <p>${escapeHtml(teacher.bio || 'No biography available.')}</p>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn-secondary" onclick="closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching teacher details:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <p>Failed to load teacher details</p>
                <button class="btn-secondary" onclick="closeModal()">Close</button>
            </div>
        `;
    }
}

function closeModal() {
    const modal = document.getElementById('teacherModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('teacherModal');
    if (event.target === modal) {
        closeModal();
    }
}

// UTILITY FUNCTIONS

async function refreshData() {
    showLoadingState();
    
    try {
        await loadTeachersData();
        renderTable();
    } catch (error) {
        console.error('Failed to refresh data', error);
    } finally {
        hideLoadingState();
    }
}

// Update table count - SPECIFIC FOR TEACHERS
function updateTableCount() {
    const countElement = document.getElementById('tableCount');
    if (!countElement) return;
    
    const filteredData = getFilteredData();
    const totalTeachers = teachersData.length;
    const showing = filteredData.length;
    
    if (showing === totalTeachers) {
        countElement.textContent = `Showing ${showing} teacher${showing !== 1 ? 's' : ''}`;
    } else {
        countElement.textContent = `Showing ${showing} of ${totalTeachers} teacher${totalTeachers !== 1 ? 's' : ''}`;
    }
}

// HELPER FUNCTIONS

function getRatingClass(rating) {
    if (rating >= 4.8) return 'status-excellent';
    if (rating >= 4.5) return 'status-good';
    if (rating >= 4.0) return 'status-average';
    return 'status-needs-improvement';
}

function getRatingStars(rating) {
    if (rating >= 4.8) return '⭐⭐⭐⭐⭐';
    if (rating >= 4.5) return '⭐⭐⭐⭐';
    if (rating >= 4.0) return '⭐⭐⭐';
    if (rating >= 3.5) return '⭐⭐';
    return '⭐';
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

function getDaysJoined(joinedDate) {
    if (!joinedDate || joinedDate === 'N/A') return 0;
    const joined = new Date(joinedDate);
    if (isNaN(joined.getTime())) return 0;
    const now = new Date();
    const diffTime = Math.abs(now - joined);
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

// UI FEEDBACK

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


// KEYBOARD SHORTCUTS

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
    
    // Escape: Close modal
    if (e.key === 'Escape') {
        closeModal();
        closeHelpModal();
    }
}


// HELP MODAL FUNCTIONS


function showHelp() {
    showKeyboardShortcuts();
}

function showKeyboardShortcuts() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    loadTeachersData();
    setupEventListeners();
});
