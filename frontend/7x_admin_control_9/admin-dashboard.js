// ================================================
// ADMIN DASHBOARD - OPTIMIZED & DATABASE-DRIVEN
// ================================================

const API_URL = API_CONFIG.BASE_URL;

// Global State
let allStudents = [];
let allTeachers = [];
let allCourses = [];
let deletionRequests = [];
let libraryRequests = [];
let currentFilter = 'pending';
let currentSection = 'dashboard';
let currentRequestId = null;
let currentUserId = null;
let currentUserType = null;
let currentAdminId = null;
let adminRole = null;

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', async function () {
    const overlay = document.getElementById('loadingOverlay');

    try {
        // FORCE LOGIN CHECK - No token = immediate redirect
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.log(' No token - redirecting to login');
            window.location.href = 'admin-login.html';
            return;
        }

        // Mark session as active (persists during refresh, clears on tab close)
        sessionStorage.setItem('dashboardActive', 'true');

        // Verify token with backend (this also gets admin role)
        // This WILL THROW an error if server is down or token is invalid
        const authData = await verifyAdminAuth();

        // Store admin role and info
        adminRole = authData.role;
        sessionStorage.setItem('adminRole', adminRole);
        sessionStorage.setItem('adminName', authData.name);
        sessionStorage.setItem('adminId', authData.id);

        console.log('✅ Authenticated as:', adminRole);

        // Show the page now that auth is confirmed
        document.body.classList.add('authenticated');

        // Update UI with admin name
        document.getElementById('adminUsername').textContent = authData.name;

        // Update Mobile UI if exists
        const mobileName = document.getElementById('adminUsernameMobile');
        const mobileRole = document.getElementById('adminRoleMobile');
        const mobileHeader = document.getElementById('mobileMenuHeader');

        if (mobileName) mobileName.textContent = authData.name;
        if (mobileRole) mobileRole.textContent = authData.role || 'Administrator';
        if (mobileHeader) mobileHeader.classList.add('active');

        // Apply role-based access control
        applyRoleBasedAccess();

        // Setup event listeners
        setupEventListeners();

        // Fetch all data in parallel (FAST)
        console.log('⏳ Fetching data from database...');
        await Promise.all([
            fetchData('students'),
            fetchData('teachers'),
            fetchData('courses'),
            fetchDeletionRequests()
        ]);
        console.log('✅ Data loaded:', { students: allStudents.length, teachers: allTeachers.length, courses: allCourses.length });

        // If no data fetched, server is probably down
        if (allStudents.length === 0 && allTeachers.length === 0 && allCourses.length === 0) {
            showNotification('⚠️ Server connection failed - no data loaded', 'error');
        }

        // Load statistics
        await loadStatistics();
        loadDeletionRequests(currentFilter);

        // Handle URL hash navigation
        if (window.location.hash) {
            showSection(window.location.hash.substring(1));
        }

        // Hide loading overlay
        if (overlay) overlay.classList.add('hidden');

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        if (overlay) overlay.classList.add('hidden');

        // Clear tokens on any auth error
        localStorage.removeItem('adminToken');
        sessionStorage.clear();

        // Show appropriate error message
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            // Server is down
            alert('⚠️ Cannot connect to server!\n\nThe backend server is not running.\nPlease start the server and try again.');
        } else if (error.message?.includes('Unauthorized') || error.message?.includes('invalid token')) {
            // Invalid credentials
            alert('🔒 Session expired or invalid.\n\nPlease login again.');
        } else {
            // Other errors
            alert('❌ Authentication failed!\n\n' + error.message);
        }

        // Always redirect to login
        window.location.href = 'admin-login.html';
    }
});

// ================================================
// AUTHENTICATION & AUTHORIZATION
// ================================================

async function verifyAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        throw new Error('No authentication token');
    }

    try {
        // Verify token by fetching admin profile - MUST succeed
        const response = await fetch(`${API_URL}/7x_admin_control_9/statistics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized - invalid token');
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Extract admin info from JWT (decode base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.adminId,
            username: payload.username,
            role: payload.role,
            name: sessionStorage.getItem('adminName') || payload.username
        };
    } catch (error) {
        console.error('❌ Auth verification failed:', error);
        // If server is unreachable or any error occurs, block access
        throw new Error('Cannot verify authentication: ' + error.message);
    }
}

function applyRoleBasedAccess() {
    const isSuperAdmin = adminRole === 'superadmin';

    // Finance & Stats - SUPER ADMIN ONLY
    const financeTab = document.getElementById('financeTab');
    const financeTabMobile = document.getElementById('financeTabMobile');
    const statsTab = document.getElementById('statsTab');
    const statsTabMobile = document.getElementById('statsTabMobile');
    const adminsTab = document.getElementById('adminsTab');
    const adminsTabMobile = document.getElementById('adminsTabMobile');

    if (isSuperAdmin) {
        // Show all tabs
        if (financeTab) financeTab.style.display = 'inline-block';
        if (financeTabMobile) financeTabMobile.style.display = 'block';
        if (statsTab) statsTab.style.display = 'inline-block';
        if (statsTabMobile) statsTabMobile.style.display = 'block';
        if (adminsTab) adminsTab.style.display = 'inline-block';
        if (adminsTabMobile) adminsTabMobile.style.display = 'block';
        console.log('✅ Super Admin - Full access');
    } else {
        // Hide finance, stats, and admin tabs for regular admin
        if (financeTab) financeTab.style.display = 'none';
        if (financeTabMobile) financeTabMobile.style.display = 'none';
        if (statsTab) statsTab.style.display = 'none';
        if (statsTabMobile) statsTabMobile.style.display = 'none';
        if (adminsTab) adminsTab.style.display = 'none';
        if (adminsTabMobile) adminsTabMobile.style.display = 'none';
        console.log(' Regular Admin - Limited access');
    }
}

// DATA FETCHING - OPTIMIZED

async function fetchData(type) {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No token');

        const response = await fetch(`${API_URL}/7x_admin_control_9/${type}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized - redirecting');
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch ${type}: ${response.status}`);
        }

        const data = await response.json();

        // Store data
        if (type === 'students') {
            if (data.success && data.students) {
                allStudents = data.students.map(s => ({
                    id: s.id,
                    name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
                    email: s.email || 'N/A',
                    phone: s.phone || 'N/A',
                    enrollmentCount: s.enrollmentCount || 0,
                    status: s.enrollmentCount > 0 ? 'active' : 'inactive',
                    joinedDate: s.createdAt,
                    ...s
                }));
            } else {
                allStudents = [];
            }
        } else if (type === 'teachers') {
            if (data.success && data.teachers) {
                allTeachers = data.teachers.map(t => ({
                    id: t.id,
                    name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown',
                    email: t.email || 'N/A',
                    phone: t.phone || 'N/A',
                    courseCount: t.courseCount || 0,
                    status: 'active',
                    ...t
                }));
            } else {
                allTeachers = [];
            }
        } else if (type === 'courses') {
            if (data.success && data.courses) {
                allCourses = data.courses.map(c => ({
                    id: c.id || c.C_id,
                    name: c.title || c.C_title || 'Untitled',
                    enrolledStudents: c.enrollmentCount || 0,
                    price: c.price || c.C_price || 0,
                    revenue: (c.price || 0) * (c.enrollmentCount || 0),
                    ...c
                }));
            } else {
                allCourses = [];
            }
        }

        console.log(`✅ Fetched ${type}:`, data.length || (type === 'students' ? allStudents.length : type === 'teachers' ? allTeachers.length : allCourses.length));
        return data;
    } catch (error) {
        console.error(`❌ Error fetching ${type}:`, error);
        if (error.message === 'Unauthorized - redirecting') {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        }

        // Return empty array on error
        if (type === 'students') allStudents = [];
        else if (type === 'teachers') allTeachers = [];
        else if (type === 'courses') allCourses = [];

        return [];
    }
}

async function loadStatistics() {
    // Only super admins can see stats
    if (adminRole !== 'superadmin') {
        console.log('⚠️ Regular admin - skipping stats');
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/statistics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error('Failed to fetch statistics');

        const { success, stats } = await response.json();
        console.log('✅ Statistics:', stats);

        if (success && stats) {
            document.getElementById('overviewTotalStudents').textContent = stats.students?.total || 0;
            document.getElementById('overviewActiveStudents').textContent = `${stats.students?.active || 0} Active`;
            document.getElementById('overviewTotalTeachers').textContent = stats.teachers?.total || 0;
            document.getElementById('overviewActiveTeachers').textContent = `${stats.teachers?.active || 0} Active`;
            document.getElementById('overviewTotalCourses').textContent = stats.courses?.total || 0;
            document.getElementById('overviewPendingRequests').textContent = `${stats.pendingDeletions || 0} Deletion Requests`;

            const totalRevenue = allCourses.reduce((sum, c) => sum + (c.revenue || 0), 0);
            document.getElementById('overviewTotalRevenue').textContent = '$' + totalRevenue.toLocaleString();
            document.getElementById('overviewMonthlyRevenue').textContent = `${stats.enrollments || 0} Enrollments`;
            document.getElementById('overviewAvgQuizScore').textContent = 'N/A';
            document.getElementById('overviewCompletionRate').textContent = 'View Stats';
            document.getElementById('overviewAvgRating').textContent = stats.courses?.total || 0;
            document.getElementById('overviewTotalEnrollments').textContent = `${stats.enrollments || 0} Enrollments`;
        }

        loadRecentActivity();
        loadTopCourses();
        loadPendingActions();
    } catch (error) {
        console.error('❌ Stats error:', error);
        if (error.message === 'Unauthorized') {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        }
    }
}

async function fetchDeletionRequests() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/deletion-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error('Unauthorized');
        if (!response.ok) throw new Error('Failed to fetch deletion requests');

        const data = await response.json();
        deletionRequests = Array.isArray(data) ? data : [];
        console.log('✅ Deletion requests:', deletionRequests.length);

        updateDeletionBadge();
        return deletionRequests;
    } catch (error) {
        console.error('❌ Error fetching deletion requests:', error);
        if (error.message === 'Unauthorized') {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        }
        deletionRequests = [];
        return [];
    }
}

async function fetchLibraryRequests() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/library-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error('Unauthorized');
        if (!response.ok) throw new Error('Failed to fetch library requests');

        const data = await response.json();
        libraryRequests = Array.isArray(data) ? data : [];
        console.log('✅ Library requests:', libraryRequests.length);

        return libraryRequests;
    } catch (error) {
        console.error('❌ Error fetching library requests:', error);
        if (error.message === 'Unauthorized') {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        }
        libraryRequests = [];
        return [];
    }
}

function loadRecentActivity() {
    const activities = [];
    allStudents.slice(0, 2).forEach(s => activities.push({
        icon: '👤', text: `Student: ${s.name}`, time: formatDate(s.joinedDate)
    }));
    allTeachers.slice(0, 2).forEach(t => activities.push({
        icon: '👨‍🏫', text: `Teacher: ${t.name}`, time: formatDate(t.createdAt)
    }));

    const html = activities.length ? activities.map(a => `
        <div class="activity-item">
            <span class="activity-icon">${a.icon}</span>
            <span class="activity-text">${a.text}</span>
            <span class="activity-time">${a.time}</span>
        </div>
    `).join('') : '<div class="activity-item"><span class="activity-icon">📭</span><span class="activity-text">No recent activity</span></div>';

    document.getElementById('recentActivityList').innerHTML = html;
}

function loadTopCourses() {
    if (!allCourses.length) {
        document.getElementById('topCoursesList').innerHTML = '<div class="activity-item"><span class="activity-icon">📭</span><span class="activity-text">No courses</span></div>';
        return;
    }

    const top = [...allCourses].sort((a, b) => (b.enrolledStudents || 0) - (a.enrolledStudents || 0)).slice(0, 5);
    document.getElementById('topCoursesList').innerHTML = top.map((c, i) => `
        <div class="activity-item">
            <span class="course-rank">#${i + 1}</span>
            <span class="activity-text"><strong>${c.name}</strong><br>${c.enrolledStudents || 0} students</span>
            <span class="activity-time">$${(c.revenue || 0).toLocaleString()}</span>
        </div>
    `).join('');
}

function loadPendingActions() {
    const pending = deletionRequests.filter(r => r.status === 'pending');
    const html = !pending.length ? '<div class="activity-item"><span class="activity-icon">✅</span><span class="activity-text">All caught up!</span></div>' :
        pending.map(req => `
            <div class="activity-item">
                <span class="activity-icon">⏳</span>
                <span class="activity-text">${req.courseName || 'Unknown'}<br><small>${req.teacherName || ''}</small></span>
                <span class="pending-badge">${req.enrolledStudents || 0} students</span>
            </div>
        `).join('');
    document.getElementById('pendingActionsList').innerHTML = html;
}

// DELETION REQUESTS

async function fetchDeletionRequests() {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const response = await fetch(`${API_URL}/7x_admin_control_9/deletion-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) deletionRequests = result.data || [];
        }
    } catch (error) {
        console.error('Fetch deletion requests error:', error);
    }
}

function loadDeletionRequests(filter = 'all') {
    const filtered = filter === 'all' ? deletionRequests : deletionRequests.filter(r => r.status === filter);
    const container = document.getElementById('requestsContainer');

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><h3>No deletion requests found</h3></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Course</th>
                        <th>Teacher</th>
                        <th>Students</th>
                        <th>Revenue</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(req => `
                        <tr>
                            <td>${req.id}</td>
                            <td>
                                <strong>${req.courseName || 'Unknown Course'}</strong><br>
                                <small>${req.courseId}</small>
                            </td>
                            <td>
                                ${req.teacherName || 'Unknown'}<br>
                                <small>${req.teacherEmail || ''}</small>
                            </td>
                            <td>${req.enrolledStudents || 0}</td>
                            <td>$${(req.revenue || 0).toLocaleString()}</td>
                            <td><span class="status-badge ${req.status}">${req.status}</span></td>
                            <td>
                                <button class="action-btn view" onclick="viewRequest(${req.id})">View Details</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterRequests(searchTerm) {
    const rows = document.querySelectorAll('#requestsContainer tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none');
}

function viewRequest(id) {
    console.log('🔍 Viewing request with ID:', id);
    currentRequestId = parseInt(id);
    const req = deletionRequests.find(r => parseInt(r.id) === currentRequestId);
    
    if (!req) {
        console.error('❌ Request not found in global array for ID:', id);
        showNotification('Could not find request data', 'error');
        return;
    }

    console.log('✅ Found request data:', req.courseName);

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="modal-premium-content">
            <div class="modal-grid">
                <div class="modal-item">
                    <span class="modal-item-label"><i class="icon-course"></i> Course Title</span>
                    <span class="modal-item-value">${req.courseName}</span>
                    <small class="modal-item-sub">ID: ${req.courseId}</small>
                </div>
                <div class="modal-item">
                    <span class="modal-item-label"><i class="icon-teacher"></i> Assigned Teacher</span>
                    <span class="modal-item-value">${req.teacherName}</span>
                    <small class="modal-item-sub">${req.teacherEmail}</small>
                </div>
                <div class="modal-item">
                    <span class="modal-item-label"><i class="icon-students"></i> Student Enrollment</span>
                    <span class="modal-item-value">${req.enrolledStudents.toLocaleString()}</span>
                    <small class="modal-item-sub">Active Learners</small>
                </div>
                <div class="modal-item">
                    <span class="modal-item-label"><i class="icon-revenue"></i> Generated Revenue</span>
                    <span class="modal-item-value text-success">$${(req.revenue || 0).toLocaleString()}</span>
                    <small class="modal-item-sub">Total Earnings</small>
                </div>
            </div>
            
            <div class="modal-reason-container">
                <span class="modal-item-label"><i class="icon-reason"></i> Reason for Deletion Request</span>
                <div class="reason-content-box">
                    <span class="quote-mark">"</span>
                    <p>${req.reason || 'No specific reason provided by the teacher.'}</p>
                    <span class="quote-mark end">"</span>
                </div>
                <div class="request-timestamp">
                    Submitted on ${formatDate(req.requestDate)}
                </div>
            </div>
        </div>
    `;

    document.getElementById('requestModal').classList.add('show');
}

function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('show');
    currentRequestId = null;
}

async function handleApprove() {
    if (!currentRequestId) return;
    await reviewDeletionRequest(currentRequestId, 'approved');
}

async function handleReject() {
    document.getElementById('rejectionModal').classList.add('show');
}

async function handleArchive() {
    if (!currentRequestId) return;
    await reviewDeletionRequest(currentRequestId, 'archived');
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').classList.remove('show');
    document.getElementById('rejectionReason').value = '';
}

async function reviewDeletionRequest(requestId, action, notes = '') {
    console.log(`🚀 Reviewing request ${requestId} with action ${action}...`);
    if (!requestId) {
        showNotification('No request ID provided', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/deletion-requests/${requestId}/review`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, notes })
        });

        const result = await response.json();
        console.log('✅ Review response:', result);

        if (response.ok && result.success) {
            closeRequestModal();
            closeRejectionModal();
            await fetchDeletionRequests();
            loadDeletionRequests(currentFilter);
            await loadStatistics();
            showNotification(action === 'approved' ? 'Request approved!' : 'Request rejected', 'success');
        } else {
            showNotification(result.error || 'Failed to process request', 'error');
        }
    } catch (error) {
        console.error('Review error:', error);
        showNotification('Failed to process request', 'error');
    }
}

// ================================================
// LIBRARY REQUESTS
// ================================================

async function fetchLibraryRequests(status = 'pending') {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/library-requests?status=${status}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) libraryRequests = data.requests || [];
            renderLibraryRequests();
        }
    } catch (error) {
        console.error('Fetch library requests error:', error);
    }
}

function renderLibraryRequests() {
    const tbody = document.getElementById('libRequestsBody');
    if (!libraryRequests.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#95a5a6">No library requests found</td></tr>';
        return;
    }

    tbody.innerHTML = libraryRequests.map(req => `
        <tr>
            <td><strong>${escapeHtml(req.title || 'Untitled')}</strong></td>
            <td>${escapeHtml(req.subject || 'N/A')}</td>
            <td>${escapeHtml(req.type || 'N/A')}</td>
            <td>${escapeHtml(req.uploadedBy || 'Unknown')}</td>
            <td>${formatDate(req.createdAt)}</td>
            <td><a href="${getFileURL(req.url)}" target="_blank" style="color:#3498db;text-decoration:underline">Preview</a></td>
            <td><span class="status-badge ${req.status}">${req.status}</span></td>
            <td class="action-btns">
                ${req.status === 'pending' ? `
                    <button class="action-btn approve" onclick="approveLibraryRequest(${req.id})">Approve</button>
                    <button class="action-btn reject" onclick="rejectLibraryRequest(${req.id})">Reject</button>
                ` : `
                    <button class="action-btn reject" onclick="deleteLibraryResource(${req.id})">Delete</button>
                `}
            </td>
        </tr>
    `).join('');
}

async function approveLibraryRequest(id) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/library-requests/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        showNotification(data.success ? 'Approved!' : data.error || 'Failed', data.success ? 'success' : 'error');
        if (data.success) await fetchLibraryRequests();
    } catch (error) {
        showNotification('Failed to approve', 'error');
    }
}

async function rejectLibraryRequest(id) {
    // For now, removing prompt as requested. If reason is needed, we should add a modal.
    const reason = 'Reason not provided';

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/library-requests/${id}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        showNotification(data.success ? 'Rejected and deleted' : 'Failed', data.success ? 'info' : 'error');
        if (data.success) await fetchLibraryRequests();
    } catch (error) {
        showNotification('Failed to reject', 'error');
    }
}

async function deleteLibraryResource(id) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/library-resources/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        showNotification(data.success ? 'Deleted successfully' : 'Failed to delete', data.success ? 'success' : 'error');
        if (data.success) {
            const status = document.getElementById('libStatusFilter')?.value || 'pending';
            fetchLibraryRequests(status);
        }
    } catch (error) {
        showNotification('Failed to delete', 'error');
    }
}

function filterLibraryRequests(searchTerm) {
    const rows = document.querySelectorAll('#libRequestsTableBody tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none');
}

function loadLibraryRequests() {
    const status = document.getElementById('libStatusFilter')?.value || 'pending';
    fetchLibraryRequests(status);
}

// ================================================
// STUDENTS & TEACHERS
// ================================================

function loadStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!allStudents.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem">No students found</td></tr>';
        return;
    }

    tbody.innerHTML = allStudents.map(s => `
        <tr>
            <td>${s.id}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.phone)}</td>
            <td>${s.enrollmentCount}</td>
            <td><span class="status-badge ${s.status}">${s.status}</span></td>
            <td>${formatDate(s.joinedDate)}</td>
            <td class="action-btns">
                <button class="action-btn view" onclick="viewUserDetails(${s.id}, 'student')">View</button>
            </td>
        </tr>
    `).join('');
}

function loadTeachers() {
    const tbody = document.getElementById('teachersTableBody');
    if (!allTeachers.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem">No teachers found</td></tr>';
        return;
    }

    tbody.innerHTML = allTeachers.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><strong>${escapeHtml(t.name)}</strong></td>
            <td>${escapeHtml(t.email)}</td>
            <td>${escapeHtml(t.phone)}</td>
            <td>${t.courseCount}</td>
            <td><span class="status-badge ${t.status}">${t.status}</span></td>
            <td>${formatDate(t.createdAt)}</td>
            <td class="action-btns">
                <button class="action-btn view" onclick="viewUserDetails(${t.id}, 'teacher')">View</button>
            </td>
        </tr>
    `).join('');
}

async function viewUserDetails(userId, type) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/${type}s/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const { success, [type]: user } = await response.json();
            if (!success) return;

            document.getElementById('userDetailsTitle').textContent = type === 'student' ? 'Student Details' : 'Teacher Details';
            document.getElementById('userDetailsBody').innerHTML = `
                <div class="form-grid">
                    <div class="form-group"><label>ID:</label><div><strong>${user.id}</strong></div></div>
                    <div class="form-group"><label>Name:</label><div><strong>${user.firstName} ${user.lastName}</strong></div></div>
                    <div class="form-group"><label>Email:</label><div>${user.email}</div></div>
                    <div class="form-group"><label>Phone:</label><div>${user.phone || 'N/A'}</div></div>
                    ${type === 'student' ? `
                        <div class="form-group"><label>Enrollments:</label><div>${user.enrollments?.length || 0}</div></div>
                    ` : `
                        <div class="form-group"><label>Courses:</label><div>${user.courses?.length || 0}</div></div>
                    `}
                </div>
            `;
            document.getElementById('userDetailsModal').classList.add('show');
        }
    } catch (error) {
        console.error('View user error:', error);
    }
}

function closeUserDetailsModal() {
    document.getElementById('userDetailsModal').classList.remove('show');
}

function filterStudents(searchTerm) {
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none');
}

function filterTeachers(searchTerm) {
    const rows = document.querySelectorAll('#teachersTableBody tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none');
}

// ================================================
// ADMIN MANAGEMENT
// ================================================

async function loadAdmins() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/admins`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const { success, admins } = await response.json();
            if (!success || !admins) {
                document.getElementById('adminsTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#95a5a6">No admins found</td></tr>';
                return;
            }

            const tbody = document.getElementById('adminsTableBody');
            const currentUsername = sessionStorage.getItem('adminUsername');
            const isZakaria = currentUsername === 'zakaria';

            console.log('✅ Loaded admins:', admins.length);

            tbody.innerHTML = admins.map(admin => `
                <tr>
                    <td>${admin.admin_id}</td>
                    <td><strong>${escapeHtml(admin.fullName)}</strong></td>
                    <td>${escapeHtml(admin.username)}</td>
                    <td><span class="status-badge ${admin.role === 'superadmin' ? 'approved' : 'pending'}">${admin.role}</span></td>
                    <td>${formatDate(admin.created_at)}</td>
                    <td class="action-btns">
                        ${admin.username === currentUsername ? '<span style="color:#999">Current User</span>' :
                    isZakaria ? `
                            <button class="action-btn view" onclick="showChangeRoleModal(${admin.admin_id}, '${escapeHtml(admin.username)}')">Change Role</button>
                            <button class="action-btn delete" onclick="showDeleteAdminModal(${admin.admin_id}, '${escapeHtml(admin.username)}')">Delete</button>
                          ` : '<span style="color:#999">Restricted</span>'}
                    </td>
                </tr>
            `).join('');

            // Show/hide add admin button based on zakaria access
            const addAdminBtn = document.getElementById('addAdminBtn');
            if (addAdminBtn) {
                addAdminBtn.style.display = isZakaria ? 'inline-block' : 'none';
            }
        }
    } catch (error) {
        console.error('❌ Load admins error:', error);
        document.getElementById('adminsTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#e74c3c">Failed to load admins</td></tr>';
    }
}

function checkAdminsAccess() {
    // Only super admin can access admin management
    if (adminRole === 'superadmin') {
        const currentUsername = sessionStorage.getItem('adminUsername');
        const isZakaria = currentUsername === 'zakaria';

        document.getElementById('adminsContent').style.display = 'block';
        document.getElementById('adminsWarning').style.display = 'none';

        // Show restriction message for non-zakaria super admins
        const restrictionMsg = document.getElementById('adminRestrictionMsg');
        if (restrictionMsg) {
            restrictionMsg.style.display = isZakaria ? 'none' : 'block';
            if (!isZakaria) {
                restrictionMsg.textContent = '⚠️ View-only access. Only zakaria can add/delete admins.';
                restrictionMsg.style.cssText = 'background:#fff3cd;color:#856404;padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid #ffc107';
            }
        }

        loadAdmins();
    } else {
        document.getElementById('adminsContent').style.display = 'none';
        document.getElementById('adminsWarning').style.display = 'flex';
    }
}

// ================================================
// FINANCE & STATISTICS (SUPER ADMIN ONLY)
// ================================================

function loadFinanceData() {
    // Only super admin can view finance
    if (adminRole !== 'superadmin') {
        document.getElementById('financeContent').style.display = 'none';
        document.getElementById('superAdminWarning').style.display = 'flex';
        return;
    }

    const totalRevenue = allCourses.reduce((sum, c) => sum + (c.revenue || 0), 0);
    document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toLocaleString();
    document.getElementById('paidCourses').textContent = allCourses.reduce((sum, c) => sum + (c.enrolledStudents || 0), 0);
    document.getElementById('pendingPayments').textContent = '$0';
    document.getElementById('payingStudents').textContent = allStudents.filter(s => s.enrollmentCount > 0).length;

    document.getElementById('revenueByCourseBody').innerHTML = allCourses.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.enrolledStudents || 0}</td>
            <td>$${c.price || 0}</td>
            <td><strong>$${(c.revenue || 0).toLocaleString()}</strong></td>
        </tr>
    `).join('');
}

function checkFinanceAccess() {
    // Only super admin can access finance
    if (adminRole === 'superadmin') {
        document.getElementById('financeContent').style.display = 'block';
        document.getElementById('superAdminWarning').style.display = 'none';
        loadFinanceData();
    } else {
        document.getElementById('financeContent').style.display = 'none';
        document.getElementById('superAdminWarning').style.display = 'flex';
    }
}

function loadStatisticsSection() {
    // Placeholder for stats section
}

// ================================================
// UI & NAVIGATION
// ================================================

function showSection(section) {
    ['statsSection', 'requestsSection', 'studentsSection', 'teachersSection', 'financeSection', 'statisticsSection', 'adminsSection', 'libRequestsSection'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    switch (section) {
        case 'dashboard':
        case 'requests':
            document.getElementById('statsSection').style.display = 'block';
            document.getElementById('requestsSection').style.display = 'block';
            document.getElementById('courseDeletionTab')?.classList.add('active');
            break;
        case 'libRequests':
        case 'library':
            document.getElementById('libRequestsSection').style.display = 'block';
            document.getElementById('libRequestsTab')?.classList.add('active');
            loadLibraryRequests();
            break;
        case 'students':
            document.getElementById('studentsSection').style.display = 'block';
            document.getElementById('studentsTab')?.classList.add('active');
            loadStudents();
            break;
        case 'teachers':
            document.getElementById('teachersSection').style.display = 'block';
            document.getElementById('teachersTab')?.classList.add('active');
            loadTeachers();
            break;
        case 'finance':
            document.getElementById('financeSection').style.display = 'block';
            document.getElementById('financeTab')?.classList.add('active');
            checkFinanceAccess();
            break;
        case 'stats':
            document.getElementById('statisticsSection').style.display = 'block';
            document.getElementById('statsTab')?.classList.add('active');
            loadStatisticsSection();
            break;
        case 'admins':
            document.getElementById('adminsSection').style.display = 'block';
            document.getElementById('adminsTab')?.classList.add('active');
            checkAdminsAccess();
            break;
    }
}

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logoutAdmin);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', logoutAdmin);

    // Mobile menu toggle with proper class handling
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    const close = document.getElementById('mobileMenuClose');

    const openMobileMenu = () => {
        menu?.classList.add('show');
        overlay?.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    };

    const closeMobileMenu = () => {
        menu?.classList.remove('show');
        overlay?.classList.remove('show');
        document.body.style.overflow = ''; // Restore scroll
    };

    toggle?.addEventListener('click', openMobileMenu);
    close?.addEventListener('click', closeMobileMenu);
    overlay?.addEventListener('click', closeMobileMenu);

    // Navigation
    ['courseDeletionTab', 'studentsTab', 'teachersTab', 'financeTab', 'statsTab', 'adminsTab', 'libRequestsTab'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => {
            e.preventDefault();
            const section = id.replace('Tab', '').replace('courseDeletion', 'requests').replace('libRequests', 'library');
            showSection(section);
        });
    });

    ['courseDeletionTabMobile', 'studentsTabMobile', 'teachersTabMobile', 'financeTabMobile', 'statsTabMobile', 'adminsTabMobile', 'libRequestsTabMobile'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => {
            e.preventDefault();
            const section = id.replace('TabMobile', '').replace('courseDeletion', 'requests').replace('libRequests', 'library');
            showSection(section);
            closeMobileMenu(); // Close menu after navigation
        });
    });

    // Filters & Search
    document.getElementById('statusFilter')?.addEventListener('change', e => {
        currentFilter = e.target.value;
        loadDeletionRequests(currentFilter);
    });
    document.getElementById('libStatusFilter')?.addEventListener('change', loadLibraryRequests);
    document.getElementById('libSearchInput')?.addEventListener('input', e => filterLibraryRequests(e.target.value));
    document.getElementById('searchInput')?.addEventListener('input', e => filterRequests(e.target.value));
    document.getElementById('studentSearchInput')?.addEventListener('input', e => filterStudents(e.target.value));
    document.getElementById('teacherSearchInput')?.addEventListener('input', e => filterTeachers(e.target.value));

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').classList.remove('show'));
    });

    // Action buttons
    document.getElementById('approveBtn')?.addEventListener('click', handleApprove);
    document.getElementById('archiveBtn')?.addEventListener('click', handleArchive);
    document.getElementById('rejectBtn')?.addEventListener('click', handleReject);
    document.getElementById('submitRejectionBtn')?.addEventListener('click', async () => {
        const reason = document.getElementById('rejectionReason').value;
        await reviewDeletionRequest(currentRequestId, 'rejected', reason);
    });
    document.getElementById('cancelRejectionBtn')?.addEventListener('click', closeRejectionModal);
    document.getElementById('closeUserDetailsBtn')?.addEventListener('click', closeUserDetailsModal);
}

// showNotification is now provided by api-config.js

// ================================================
// UTILITIES
// ================================================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================================================
// ADMIN MANAGEMENT MODALS (ZAKARIA ONLY)
// ================================================

function showChangeRoleModal(adminId, username) {
    const currentUsername = sessionStorage.getItem('adminUsername');
    if (currentUsername !== 'zakaria') {
        showNotification('⛔ Only zakaria can change admin roles', 'error');
        return;
    }

    changeAdminRole(adminId);
}

function showDeleteAdminModal(adminId, username) {
    const currentUsername = sessionStorage.getItem('adminUsername');
    if (currentUsername !== 'zakaria') {
        showNotification('⛔ Only zakaria can delete admins', 'error');
        return;
    }

    deleteAdmin(adminId);
}

async function changeAdminRole(adminId) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/admins/${adminId}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            showNotification('✅ Role updated successfully', 'success');
            loadAdmins();
        } else {
            showNotification('❌ ' + (data.error || 'Failed to update role'), 'error');
        }
    } catch (error) {
        console.error('Change role error:', error);
        showNotification('❌ Failed to update role', 'error');
    }
}

async function deleteAdmin(adminId) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/7x_admin_control_9/admins/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            showNotification('✅ Admin deleted successfully', 'success');
            loadAdmins();
        } else {
            showNotification('❌ ' + (data.error || 'Failed to delete admin'), 'error');
        }
    } catch (error) {
        console.error('Delete admin error:', error);
        showNotification('❌ Failed to delete admin', 'error');
    }
}

// Make functions globally accessible
window.viewRequest = viewRequest;
window.closeRequestModal = closeRequestModal;
window.approveLibraryRequest = approveLibraryRequest;
window.rejectLibraryRequest = rejectLibraryRequest;
window.viewUserDetails = viewUserDetails;
window.closeUserDetailsModal = closeUserDetailsModal;
window.filterLibraryRequests = filterLibraryRequests;
window.filterStudents = filterStudents;
window.filterTeachers = filterTeachers;
window.filterRequests = filterRequests;
window.loadLibraryRequests = loadLibraryRequests;
window.showChangeRoleModal = showChangeRoleModal;
window.showDeleteAdminModal = showDeleteAdminModal;