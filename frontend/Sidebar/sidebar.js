const initializeSidebar = function () {
  const sidebare = document.getElementById("sidebare");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const navvLinks = document.querySelectorAll(".navv-link");
  const actionButtons = document.querySelectorAll(".action-btn");
  const logoutBtn = document.getElementById("logoutBtn");

  console.log("Sidebar: Initializing main logic...");

  if (!sidebare) {
      console.warn("Sidebar: Element #sidebare not found. Initialization skipped.");
      return;
  }

  // ===============================
  // DYNAMIC USER DATA
  // ===============================
  function updateUserInfo(userData = null) {
    const userStr = userData ? JSON.stringify(userData) : localStorage.getItem(API_CONFIG.KEYS.USER);
    if (!userStr) return;

    try {
      const user = userData || JSON.parse(userStr);
      const nameElement = document.getElementById("sidebarName");
      const roleElement = document.getElementById("sidebarRole");
      const avatarElement = document.getElementById("sidebarAvatar");

      if (nameElement) {
        // Handle all possible name field variations
        const firstName = user.firstName || user.firstname || user.S_firstname || user.T_firstname || user.T_name || '';
        const lastName = user.lastName || user.lastname || user.S_lastname || user.T_lastname || '';
        const fullName = `${firstName} ${lastName}`.trim();
        nameElement.textContent = fullName || user.username || 'User';
      }
      
      if (roleElement) {
        const role = user.role || (user.S_id ? 'student' : (user.T_id ? 'teacher' : 'User'));
        roleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
      }
      
      if (avatarElement) {
        // Handle all possible photo field variations
        const photo = user.pfp || user.profilePhoto || user.S_pfp || user.T_pfp || user.avatar;
        if (photo) {
          let avatarUrl = photo;
          if (!photo.startsWith('http')) {
            // Determine base URL - check if API_CONFIG exists
            let baseUrl = '';
            if (typeof API_CONFIG !== 'undefined') {
              baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
            } else {
              // Fallback to common backend URL if config is missing
              baseUrl = window.location.origin.replace(/:\d+$/, ':3000'); 
            }
            
            // Handle slashes carefully to avoid double slashes
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = photo.startsWith('/') ? photo : '/' + photo;
            avatarUrl = `${cleanBase}${cleanPath}`;
          }
          console.log("Sidebar: Setting avatar URL to:", avatarUrl);
          avatarElement.src = avatarUrl;
          
          // Handle image load error
          avatarElement.onerror = function() {
            this.src = "../asset/sidebar/proSide.jpg"; // Default fallback
            this.onerror = null;
          };
        }
      }
    } catch (e) {
      console.error("Error updating sidebar user info:", e);
    }
  }

  // Initial load
  updateUserInfo();

  // Listen for profile updates from profile.js
  window.addEventListener('profileUpdated', (e) => {
    console.log("Sidebar: Profile update received");
    updateUserInfo(e.detail);
  });


  // ===============================
  // CREATE / GET OVERLAY
  // ===============================
  let overlay = document.querySelector(".sidebare-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebare-overlay";
    document.body.appendChild(overlay);
  }

  // ===============================
  // SET ACTIVE PAGE
  // ===============================
  const currentPage = document.body.getAttribute('data-page');
  
  if (currentPage) {
    // Remove all active classes first
    navvLinks.forEach((link) => {
      link.parentElement.classList.remove("active");
    });
    
    // Add active class to matching page
    const activeLink = document.querySelector(`.navv-link[data-page="${currentPage}"]`);
    if (activeLink) {
      activeLink.parentElement.classList.add("active");
    }
  }

  // ===============================
  // HELPER FUNCTIONS
  // ===============================
  function openSidebar() {
    if (!sidebare) return;
    sidebare.classList.remove("collapsed");
    localStorage.setItem("sidebarCollapsed", "false");

    if (window.innerWidth <= 600 && overlay) {
      overlay.classList.add("active");
    }
  }

  function closeSidebar() {
    if (!sidebare) return;
    sidebare.classList.add("collapsed");
    if (overlay) overlay.classList.remove("active");
    localStorage.setItem("sidebarCollapsed", "true");
  }

  function toggleSidebar() {
    if (!sidebare) return;
    if (sidebare.classList.contains("collapsed")) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  // ===============================
  // ON PAGE LOAD — RESTORE STATE
  // ===============================
  const savedState = localStorage.getItem("sidebarCollapsed");

  if (sidebare) {
    if (window.innerWidth > 600) {
      if (savedState === "true") {
        sidebare.classList.add("collapsed");
      } else {
        sidebare.classList.remove("collapsed");
      }
    } else {
      sidebare.classList.add("collapsed");
    }
  }

  // ===============================
  // EVENT LISTENERS
  // ===============================

  // Toggle button
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function(e) {
        e.stopPropagation(); // Prevent document click listener from firing immediately
        toggleSidebar();
    });
  }

  // Close button
  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  // Close when clicking overlay
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Close when clicking outside sidebar (desktop)
  document.addEventListener("click", function (event) {
    if (sidebare && !sidebare.classList.contains("collapsed")) {
      if (!sidebare.contains(event.target) && sidebarToggle && !sidebarToggle.contains(event.target)) {
        closeSidebar();
      }
    }
  });

  // ===============================
  // WINDOW RESIZE
  // ===============================
  window.addEventListener("resize", function () {
    if (window.innerWidth > 600) {
      if (overlay) overlay.classList.remove("active");
    } else {
      if (sidebare && !sidebare.classList.contains("collapsed") && overlay) {
        overlay.classList.add("active");
      }
    }
  });

  // ===============================
  // NAVIGATION LINKS
  // ===============================
  navvLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      // Only prevent default if it's a # link, allow real navigation
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
      }

      // Click animation
      this.style.transform = "scale(0.95)";
      setTimeout(() => (this.style.transform = ""), 150);

      // Close sidebar on mobile after clicking
      if (window.innerWidth <= 600) {
        closeSidebar();
      }
    });
  });

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        if (typeof logout === 'function') {
            logout();
        } else if (typeof API_CONFIG !== 'undefined' && typeof window.logout === 'function') {
            window.logout();
        } else {
            // Robust fallback if global logout is missing
            localStorage.clear();
            window.location.href = "../Homepage/homepage.html";
        }
    });
  }

  // ===============================
  // ACTION BUTTONS
  // ===============================
  actionButtons.forEach((button) => {
    if (button.id === "logoutBtn") return; // Handled separately
    
    button.addEventListener("click", function () {
      // Animation
      this.style.transform = "scale(0.95)";
      setTimeout(() => (this.style.transform = ""), 150);
    });
  });

  // ===============================
  // KEYBOARD SHORTCUTS
  // ===============================
  document.addEventListener("keydown", function (e) {
    // Close with Escape key
    if (e.key === "Escape" && sidebare && !sidebare.classList.contains("collapsed")) {
      closeSidebar();
    }

    // Toggle with Alt + S
    if (e.altKey && e.key === "s") {
      e.preventDefault();
      toggleSidebar();
    }
  });
};

// Auto-initialize based on document state
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSidebar);
} else {
    initializeSidebar();
}
