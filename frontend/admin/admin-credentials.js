// Admin Authentication - Secure Backend API Version
// This file handles admin authentication using the backend API

const API_BASE_URL = API_CONFIG.BASE_URL;

// Function to validate admin login via backend API
async function validateAdminLogin(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success && data.token) {
            // Store the JWT token securely
            localStorage.setItem(API_CONFIG.KEYS.ADMIN_TOKEN, data.token);
            
            // Store session data
            sessionStorage.setItem('adminRole', data.admin.role || 'admin');
            sessionStorage.setItem('adminUsername', data.admin.username);
            sessionStorage.setItem('adminId', data.admin.id);
            sessionStorage.setItem('adminName', data.admin.fullName || data.admin.username);
            
            return {
                valid: true,
                role: data.admin.role || 'admin',
                id: data.admin.id,
                name: data.admin.fullName || data.admin.username,
                username: data.admin.username
            };
        } else {
            return { valid: false, role: null };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { valid: false, role: null };
    }
}

// Function to check if user is logged in as admin
function isAdminLoggedIn() {
    const token = localStorage.getItem('adminToken');
    return token !== null && token !== '';
}

// Function to logout admin
function logoutAdmin() {
    localStorage.removeItem('adminToken');
    sessionStorage.clear();
    window.location.href = 'admin-login.html';
}

// Function to get auth token for API requests
function getAuthToken() {
    return localStorage.getItem(API_CONFIG.KEYS.ADMIN_TOKEN);
}

// Validate token by making a test API call
async function validateToken() {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/statistics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            // Token is invalid/expired
            localStorage.removeItem('adminToken');
            sessionStorage.clear();
            return false;
        }
        
        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Helper function to make authenticated API requests
async function makeAuthenticatedRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
        window.location.href = 'admin-login.html';
        throw new Error('No authentication token');
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
        
        // If unauthorized, redirect to login
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
            throw new Error('Authentication failed');
        }

        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Admin management functions (for dashboard)
function getAdminAccounts() {
    // This should be fetched from backend in production
    // For now, return empty array - dashboard will load from API
    return [];
}

function saveAdminAccounts(admins) {
    // This should save to backend via API
    console.warn('saveAdminAccounts should use backend API');
}

function resetAdminAccounts() {
    // This should be handled by backend
    console.warn('resetAdminAccounts should use backend API');
    return [];
}