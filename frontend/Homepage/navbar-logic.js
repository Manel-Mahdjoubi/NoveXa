// navbar-logic.js
// This script handles role-based navigation bar updates and redirects.

(function() {
    // Standard logout function
    const logoutUser = () => {
        console.log("🚀 Logging out...");
        if (typeof logout === 'function') {
            logout();
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("role");
            localStorage.removeItem("teacherId");
            localStorage.removeItem("studentId");
            localStorage.removeItem("adminToken");
            window.location.href = "../Homepage/homepage.html";
        }
    };

    const initNavbar = () => {
        console.log('🔄 Initializing role-based navbar logic...');

        const userKey = (typeof API_CONFIG !== 'undefined' && API_CONFIG.KEYS && API_CONFIG.KEYS.USER) ? API_CONFIG.KEYS.USER : 'user';
        const userStr = localStorage.getItem(userKey);
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user) {
            console.log('ℹ️ No user logged in, navbar remains unchanged.');
            return;
        }

        const role = user.role || (user.S_id ? 'student' : (user.T_id ? 'teacher' : 'student'));
        
        // 1. Update Home & Logo Links
        const homeLinks = document.querySelectorAll('.nav-links a, .mobile-menu a, .logo a');
        homeLinks.forEach(link => {
            const text = link.textContent.trim().toLowerCase();
            const isLogo = link.id === 'logoButton' || link.querySelector('img');
            
            if (text === 'home' || isLogo) {
                const currentHref = link.getAttribute('href');
                if (currentHref && currentHref.includes('Homepage/homepage.html')) {
                    link.href = currentHref.replace('Homepage/homepage.html', 'home_page2/home_page2.html');
                }
            }
        });

        // 2. Handle Auth UI consistency
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Find or create auth-buttons container
            let authContainer = navbar.querySelector('.auth-buttons');
            if (!authContainer) {
                authContainer = document.createElement('div');
                authContainer.className = 'auth-buttons';
                authContainer.style.cssText = 'display: flex; gap: 15px; align-items: center;';
                
                const menuToggle = document.getElementById('menu-toggle');
                if (menuToggle) {
                    navbar.insertBefore(authContainer, menuToggle);
                } else {
                    navbar.appendChild(authContainer);
                }
            } else {
                // Ensure it's visible and clear guest pins
                authContainer.style.display = 'flex';
                authContainer.innerHTML = '';
            }

            // Common button style
            const btnBase = `
                display: inline-block;
                padding: 7px 15px;
                border-radius: 26px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: none;
                text-decoration: none;
                line-height: normal;
                white-space: nowrap;
            `;

            // My Profile Button (Matches Login style)
            const profileBtn = document.createElement('a');
            profileBtn.href = '../profile/profile.html';
            profileBtn.className = 'profile-btn-nav';
            profileBtn.textContent = 'My profile';
            profileBtn.style.cssText = btnBase + `
                background: rgba(0, 0, 0, 0.3);
                color: white;
            `;
            profileBtn.onmouseover = () => { profileBtn.style.background = 'rgba(0, 0, 0, 0.5)'; };
            profileBtn.onmouseout = () => { profileBtn.style.background = 'rgba(0, 0, 0, 0.3)'; };

            // Logout Button (Matches Registration style but with red text)
            const logoutNavBtn = document.createElement('button');
            logoutNavBtn.className = 'logout-nav-btn';
            logoutNavBtn.textContent = 'Logout';
            logoutNavBtn.style.cssText = btnBase + `
                background: white;
                color: #ff4d4d;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            `;
            logoutNavBtn.onmouseover = () => {
                logoutNavBtn.style.transform = 'translateY(-2px)';
                logoutNavBtn.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.2)';
            };
            logoutNavBtn.onmouseout = () => {
                logoutNavBtn.style.transform = 'translateY(0)';
                logoutNavBtn.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
            };
            logoutNavBtn.onclick = logoutUser;

            
            
            // Remove any stray profile buttons (safety check)
            const strays = navbar.querySelectorAll('.profile-btn');
            strays.forEach(s => { if (s.parentElement !== authContainer) s.remove(); });
        }

        // 3. Update Mobile Menu
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && !mobileMenu.querySelector('.mobile-logout-link')) {
            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.className = 'mobile-logout-link';
            logoutLink.textContent = 'Logout';
            logoutLink.style.color = '#ff4d4d';
            logoutLink.onclick = (e) => {
                e.preventDefault();
                logoutUser();
            };
            
        }

        // 4. Role-based: Teachers -> Students & Library fixes
        const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
        navLinks.forEach(link => {
            const text = link.textContent.trim().toLowerCase();
            const currentHref = link.getAttribute('href');
            
            if (currentHref && currentHref.includes('login_page/login.html')) {
                if (text === 'teachers') {
                    link.href = '../teacher list/teachersList.html';
                } else if (text === 'library') {
                    link.href = '../e_library/e_library.html';
                }
            }

            if (role === 'teacher') {
                if (text === 'teachers' || text === 'teacher list') {
                    link.textContent = 'Students';
                    if (link.href.includes('teachersList.html')) {
                        link.href = link.href.replace('teacher list/teachersList.html', 'students list/studentsList.html');
                    } else if (link.getAttribute('href') === '#') {
                        link.href = '../students list/studentsList.html';
                    }
                }
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }
})();
