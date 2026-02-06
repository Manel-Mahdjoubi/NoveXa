// Role-based access control for teacher-only pages
(function() {
    'use strict';
    
    // Notification function (same as used in other pages)
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const styles = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${styles[type] || styles.success};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Add animation styles
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Check if user is logged in and is a teacher
    function checkTeacherAccess() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        // Not logged in
        if (!token || !userStr) {
            showNotification('You must be logged in as a teacher to access this page', 'error');
            setTimeout(() => {
                window.location.href = '../login_page/login.html';
            }, 2000);
            return false;
        }
        
        try {
            const user = JSON.parse(userStr);
            
            // Check if user is a teacher
            if (user.role !== 'teacher') {
                showNotification('This page is only accessible to teachers', 'error');
                setTimeout(() => {
                    window.location.href = '../home_page2/home_page2.html';
                }, 2000);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error parsing user data:', error);
            showNotification('Authentication error. Please login again', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
                window.location.href = '../login_page/login.html';
            }, 2000);
            return false;
        }
    }
    
    // Run check immediately
    checkTeacherAccess();
})();
