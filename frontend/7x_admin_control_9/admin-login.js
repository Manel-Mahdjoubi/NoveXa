// Admin Login Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Clear any existing tokens/sessions on login page load
    localStorage.removeItem('adminToken');
    sessionStorage.clear();
    
    // Check if already logged in (shouldn't happen with clearing above, but just in case)
    if (isAdminLoggedIn()) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    const loginForm = document.getElementById('adminLoginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const togglePassword = document.getElementById('togglePassword');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        // Update icon
        if (type === 'text') {
            this.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        } else {
            this.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
        }
    });

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Hide previous error
        errorMessage.classList.remove('show');

        // Show loading state
        const loginBtn = loginForm.querySelector('.login-btn');
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span>Logging in...</span>';
        loginBtn.disabled = true;

        try {
            // Validate credentials via backend API
            const result = await validateAdminLogin(username, password);
            
            if (result.valid) {
                // Session data is already stored in validateAdminLogin
                
                // Show success animation
                loginBtn.innerHTML = '<span>✓ Success!</span>';
                loginBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 500);
            } else {
                // Show error message
                errorMessage.textContent = 'Invalid username or password. Please try again.';
                errorMessage.classList.add('show');
                
                // Shake animation for inputs
                usernameInput.style.animation = 'shake 0.5s ease';
                passwordInput.style.animation = 'shake 0.5s ease';
                
                setTimeout(() => {
                    usernameInput.style.animation = '';
                    passwordInput.style.animation = '';
                }, 500);

                // Clear password field
                passwordInput.value = '';
                passwordInput.focus();

                // Reset button
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
        } catch (error) {
            // Show error message
            errorMessage.textContent = 'Connection error. Please try again.';
            errorMessage.classList.add('show');
            
            // Reset button
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
        }
    });

    // Clear error message when user starts typing
    usernameInput.addEventListener('input', () => {
        errorMessage.classList.remove('show');
    });

    passwordInput.addEventListener('input', () => {
        errorMessage.classList.remove('show');
    });

    // Focus on username input
    usernameInput.focus();
});