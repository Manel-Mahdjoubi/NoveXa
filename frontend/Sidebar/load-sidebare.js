// load-sidebar.js
document.addEventListener('DOMContentLoaded', function() {
    console.log(' Starting to load sidebar...');
    
    // Get user role from localStorage
    const userKey = (typeof API_CONFIG !== 'undefined' && API_CONFIG.KEYS && API_CONFIG.KEYS.USER) ? API_CONFIG.KEYS.USER : 'user';
    const userStr = localStorage.getItem(userKey);
    const user = userStr ? JSON.parse(userStr) : null;
    let role = 'student'; // Default
    
    if (user) {
        role = user.role || (user.S_id ? 'student' : (user.T_id ? 'teacher' : 'student'));
    }
    
    const sidebarFile = role === 'teacher' ? 'teacher-sidebar.html' : 'student-sidebar.html';
    
    // Load sidebar HTML
    fetch(`../Sidebar/${sidebarFile}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Sidebar HTML not found (${sidebarFile}): ` + response.status);
            }
            return response.text();
        })
        .then(data => {
            console.log(`${role} sidebar HTML loaded successfully`);
            
            // Insert sidebar at the beginning of body
            document.body.insertAdjacentHTML('afterbegin', data);
            
            console.log('Sidebar inserted into DOM');
            
            // Wait a moment for DOM to be ready, then load JS
            setTimeout(() => {
                const script = document.createElement('script');
                script.src = '../Sidebar/sidebar.js';
                
                script.onload = function() {
                    console.log('Sidebar JavaScript loaded successfully');
                };
                
                script.onerror = function() {
                    console.error(' Failed to load sidebar.js');
                };
                
                document.body.appendChild(script);
            }, 100);
        })
        .catch(error => {
            console.error(' Error loading sidebar:', error);
        });
});
