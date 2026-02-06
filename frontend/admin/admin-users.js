// Admin User Management Page
const API_BASE_URL = API_CONFIG.BASE_URL;

let allUsers = [];
let filteredUsers = [];

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkAdminAuth();
        
        // Auth passed - show page
        document.body.classList.add('authenticated');
        
        setupEventListeners();
        loadUsers();
        
        // Set admin username
        const adminName = getCurrentAdminName();
        const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');;
    
    document.getElementById('adminUsername').textContent = adminName || 'Admin';
    
    // Update Mobile UI
    const mobileName = document.getElementById('adminUsernameMobile');
    const mobileRole = document.getElementById('adminRoleMobile');
    const mobileHeader = document.getElementById('mobileMenuHeader');
    
    if (mobileName) mobileName.textContent = adminName || 'Admin';
    if (mobileRole) mobileRole.textContent = adminData.role || 'Administrator';
    if (mobileHeader) mobileHeader.classList.add('active');
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('adminToken');
        window.location.replace('admin-login.html');
    }
});

async function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        throw new Error('No token');
    }
    
    // Verify token with backend
    const response = await fetch(`${API_BASE_URL}/admin/statistics`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 401) {
        throw new Error('Invalid token');
    }
    
    if (!response.ok) {
        throw new Error('Server error');
    }
    
    return true;
}

function getCurrentAdminName() {
    const adminData = localStorage.getItem('adminData');
    if (adminData) {
        try {
            const admin = JSON.parse(adminData);
            return admin.fullName || admin.username;
        } catch (e) {
            return 'Admin';
        }
    }
    return 'Admin';
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logoutAdmin);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', logoutAdmin);
    
    // Filter and search
    document.getElementById('roleFilter').addEventListener('change', filterUsers);
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
            mobileOverlay.classList.toggle('show');
            if (mobileMenu.classList.contains('show')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        mobileMenuClose?.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
            mobileOverlay.classList.remove('show');
            document.body.style.overflow = '';
        });
        
        mobileOverlay.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
            mobileOverlay.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Dashboard navigation links
    ['courseDeletionTab', 'studentsTab', 'teachersTab', 'financeTab', 'statsTab', 'adminsTab'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            const section = id.replace('Tab', '').replace('courseDeletion', 'requests');
            window.location.href = `admin-dashboard.html#${section}`;
        });
    });
    
    ['courseDeletionTabMobile', 'studentsTabMobile', 'teachersTabMobile', 'financeTabMobile', 'statsTabMobile', 'adminsTabMobile'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            const section = id.replace('TabMobile', '').replace('courseDeletion', 'requests');
            window.location.href = `admin-dashboard.html#${section}`;
        });
    });
}

// function logoutAdmin() {
//     if (confirm('Are you sure you want to logout?')) {
//         localStorage.removeItem('adminToken');
//         localStorage.removeItem('adminData');
//         window.location.href = 'admin-login.html';
//     }
// }
// utilize common logoutAdmin from admin-credentials.js

async function loadUsers() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const usersTable = document.getElementById('usersTable');
    
    try {
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        const tableContainer = document.getElementById('usersTableContainer');
        if (tableContainer) tableContainer.style.display = 'none';
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminData');
                window.location.href = 'admin-login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            filteredUsers = [...allUsers];
            
            renderUsers();
            
            loadingIndicator.style.display = 'none';
            document.getElementById('usersTableContainer').style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Error loading users: ${error.message}`;
    }
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredUsers = allUsers.filter(user => {
        // Filter by role
        if (roleFilter !== 'all' && user.role !== roleFilter) {
            return false;
        }
        
        // Filter by search query
        if (searchQuery) {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            const email = user.email.toLowerCase();
            return fullName.includes(searchQuery) || email.includes(searchQuery);
        }
        
        return true;
    });
    
    renderUsers();
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #95a5a6;">
                    No users found matching your criteria.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const coursesHTML = renderCourses(user);
        const roleClass = user.role.toLowerCase();
        const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-name">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</div>
                        <div class="user-email">${escapeHtml(user.email)}</div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${roleClass}">${user.role}</span>
                </td>
                <td>${escapeHtml(user.phone)}</td>
                <td>
                    <div class="courses-list">
                        ${coursesHTML}
                    </div>
                </td>
                <td>
                    <span class="amount">${formatCurrency(user.totalPaid)}</span>
                </td>
                <td>${joinedDate}</td>
            </tr>
        `;
    }).join('');
}

function renderCourses(user) {
    if (user.role === 'Student') {
        if (user.courses.length === 0) {
            return '<div class="no-courses">Not enrolled in any course</div>';
        }
        return `
            <div style="margin-bottom: 0.3rem; color: #7f8c8d; font-size: 0.85rem;">
                Enrolled in ${user.enrolledCoursesCount} course${user.enrolledCoursesCount !== 1 ? 's' : ''}:
            </div>
            ${user.courses.map(course => `
                <div class="course-item">
                    • ${escapeHtml(course.title)} (${formatCurrency(course.price)})
                </div>
            `).join('')}
        `;
    } else if (user.role === 'Teacher') {
        if (user.courses.length === 0) {
            return '<div class="no-courses">No published courses</div>';
        }
        return `
            <div style="margin-bottom: 0.3rem; color: #7f8c8d; font-size: 0.85rem;">
                Published ${user.publishedCoursesCount} course${user.publishedCoursesCount !== 1 ? 's' : ''}:
            </div>
            ${user.courses.map(course => `
                <div class="course-item">
                    • ${escapeHtml(course.title)} (${formatCurrency(course.price)})
                </div>
            `).join('')}
        `;
    }
    return '<div class="no-courses">N/A</div>';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
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