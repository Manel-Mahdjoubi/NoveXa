document.addEventListener("DOMContentLoaded", () => {
  /*MOBILE MENU TOGGLE*/
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const MOBILE_BREAKPOINT = 600;

  const closeMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("active");
  };

  const toggleMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.toggle("active");
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });

    document.addEventListener("click", (e) => {
      if (!mobileMenu.classList.contains("active")) return;
      const clickedInsideMenu = mobileMenu.contains(e.target);
      const clickedToggle = menuToggle.contains(e.target);
      if (!clickedInsideMenu && !clickedToggle) {
        closeMobileMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMobileMenu();
      }
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMobileMenu());
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        closeMobileMenu();
      }
    });
  }

  // ===============================
  // BACKEND COURSES INTEGRATION
  // ===============================

  let allCourses = []; // Store all courses for search functionality
  let hasBackendData = false; // Track if backend data loaded

  // Fetch courses from backend
  async function fetchCourses() {
    try {
      // Get user role
      const userStr = localStorage.getItem(API_CONFIG.KEYS.USER);
      const user = userStr ? JSON.parse(userStr) : null;
      const isTeacher = user && (user.role === 'teacher' || user.T_id);

      // Show loading state
      const coursesGrid = document.getElementById('coursesGrid');
      if (coursesGrid) {
        coursesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <p style="font-size: 18px; color: #0e84c8;">Loading your courses...</p>
          </div>
        `;
      }

      let endpoint = API_CONFIG.ENDPOINTS.GET_ALL_COURSES;
      
      // Teacher specific logic
      if (isTeacher) {
        // Ensure we have a valid ID to fetch with
        const teacherId = user.T_id || user.id;
        if (!teacherId) {
            console.error('Teacher ID not found in user object');
            throw new Error('Teacher identification missing');
        }
        endpoint = `${API_CONFIG.ENDPOINTS.GET_COURSES_BY_TEACHER}/${teacherId}`;
        
        // Update header
        const exploreHeader = document.querySelector('.explore-header');
        if (exploreHeader) {
          exploreHeader.innerHTML = `
            <h2>My Courses</h2>
            <p>Manage and track your teaching portfolio</p>
            <a href="../Coursemanagement/coursemanagement.html" class="details-btn" style="display: inline-block; margin-top: 15px; background: linear-gradient(135deg, #2ecc71, #27ae60);">
              + Add New Course
            </a>
          `;
        }

        // Update Dashboard Card Link for Teachers
        const dashboardCard = document.querySelector('.card[data-link*="sDashboard.html"]');
        if (dashboardCard) {
            dashboardCard.dataset.link = "../student and teacher dashboard/tDashboard.html";
        }
      }

      const data = await apiCall(endpoint);
      
      if (data.success && data.courses) {
        allCourses = data.courses;
        hasBackendData = true;
        displayCourses(allCourses);
        console.log(`Loaded ${allCourses.length} courses from backend`);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      
      const coursesGrid = document.getElementById('coursesGrid');
      if (coursesGrid) {
        coursesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
            <div style="font-size: 48px; margin-bottom: 20px; color: #f44336;">⚠️</div>
            <p style="font-size: 18px; color: #666; margin-bottom: 20px;">
              Could not load courses.<br>
              ${error.message || 'Please check your connection and try again.'}
            </p>
            <button onclick="location.reload()" style="padding: 12px 30px; background: #0e84c8; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Retry
            </button>
          </div>
        `;
      }
      
      // Keep static courses as fallback ONLY if not teacher
      // Teachers shouldn't see random static courses if their fetch fails
      const userStr = localStorage.getItem(API_CONFIG.KEYS.USER);
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || user.role !== 'teacher') {
          hasBackendData = false;
          console.log('Using static courses as fallback');
      }
    }
  }

  // Display courses in the grid
  function displayCourses(courses) {
    const coursesGrid = document.getElementById('coursesGrid');
    if (!coursesGrid) return;

    // Clear existing courses
    coursesGrid.innerHTML = '';

    if (courses.length === 0) {
      coursesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
          <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
          <p style="font-size: 18px; color: #666;">No courses available at the moment.</p>
          <p style="font-size: 14px; color: #999; margin-top: 10px;">Check back soon for new courses!</p>
        </div>
      `;
      return;
    }

    courses.forEach(course => {
      const courseCard = createCourseCard(course);
      coursesGrid.appendChild(courseCard);
    });
  }

  // Create course card element
  function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.setAttribute('data-category', course.C_field.toLowerCase().replace(/\s+/g, ''));
    
    // Add fade-in animation
    card.style.opacity = '0';
    card.style.animation = 'fadeInCards 0.6s ease forwards';

    // Calculate total lectures
    const totalLectures = course.Chapter ? 
      course.Chapter.reduce((sum, chapter) => sum + (chapter.numlecture || 0), 0) : 0;

    // Get teacher name
    const teacherName = course.Teacher ? 
      `${course.Teacher.T_firstname} ${course.Teacher.T_lastname}` : 'Instructor';

    // Get course image URL
    const imageUrl = getFileURL(course.C_image);

    // Truncate description
    const description = course.C_desc.length > 120 ? 
      course.C_desc.substring(0, 120) + '...' : 
      course.C_desc;

    card.innerHTML = `
      <div class="course-image">
        <img
          src="${imageUrl}"
          alt="${course.C_title}"
          class="course-image-photo"
          onerror="this.src='../Novexa_assets/e_library&courses_assets/webtech_ill.jfif'"
        />
      </div>
      <div class="course-content">
        <span class="course-category">${course.C_field}</span>
        <h3 class="course-title">${course.C_title}</h3>
        <p class="course-description">${description}</p>
        <div class="course-teacher" style="margin: 10px 0; color: #666; font-size: 14px;">
          <span>👨‍🏫 ${teacherName}</span>
        </div>
        <div class="course-footer">
          <div class="course-info">
            <span>📚 ${totalLectures} lectures</span>
          </div>
          <button class="details-btn" onclick="viewCourseDetails(${course.C_id})">
            View Details
          </button>
        </div>
      </div>
    `;

    return card;
  }

  // View course details - redirect to course details page
  window.viewCourseDetails = function(courseId) {
    console.log(`Viewing course ID: ${courseId}`);
    window.location.href = `../CourseDetails/coursedetails.html?courseId=${courseId}`;
  };

  // Keep backward compatibility with old viewDetails function
  window.viewDetails = function(courseId) {
    // If backend data loaded, use new function
    if (hasBackendData) {
      window.viewCourseDetails(courseId);
    } else {
      // Fallback to old behavior for static courses
      const courseRoutes = {
        1: "../CourseDetails/coursedetails.html",
        2: "../CourseDetails/coursedetails.html",
        3: "../CourseDetails/coursedetails.html",
        4: "../CourseDetails/coursedetails.html",
        5: "../CourseDetails/coursedetails.html",
        6: "../CourseDetails/coursedetails.html",
      };
      
      const target = courseRoutes[courseId];
      if (target) {
        window.location.href = target;
      } else {
        alert("Course details page is not ready yet.");
      }
    }
  };

  /* SEARCH COURSES - Updated to work with both backend and static data */
  window.searchCourses = function () {
    const inputEl = document.getElementById("searchInput");
    const coursesGrid = document.querySelector('.course-grid');
    if (!inputEl || !coursesGrid) return;

    const query = inputEl.value.toLowerCase().trim();

    // Clear any existing "no results" message
    const existingNoResults = coursesGrid.querySelector('.no-results-message');
    if (existingNoResults) existingNoResults.remove();

    // If empty query and we have backend courses, show all
    if (query === "" && hasBackendData && allCourses.length > 0) {
      displayCourses(allCourses);
      return;
    }

    // If empty query and no backend courses, show all static cards
    if (query === "") {
      const cards = document.querySelectorAll(".course-card");
      cards.forEach((card) => {
        card.style.display = "";
        card.style.animation = "";
      });
      return;
    }

    // Search logic
    let resultsCount = 0;
    
    if (hasBackendData && allCourses.length > 0) {
      const filteredCourses = allCourses.filter(course => {
        const title = course.C_title.toLowerCase();
        const description = course.C_desc.toLowerCase();
        const category = course.C_field.toLowerCase();
        const teacher = course.Teacher ? 
          `${course.Teacher.T_firstname} ${course.Teacher.T_lastname}`.toLowerCase() : '';
        
        return title.includes(query) || 
               description.includes(query) || 
               category.includes(query) ||
               teacher.includes(query);
      });

      displayCourses(filteredCourses);
      resultsCount = filteredCourses.length;
    } else {
      // DOM search for static courses
      const cards = document.querySelectorAll(".course-card");
      
      cards.forEach((card) => {
        const title = card.querySelector(".course-title")?.textContent.toLowerCase() || '';
        const description = card.querySelector(".course-description")?.textContent.toLowerCase() || '';
        const category = card.querySelector(".course-category")?.textContent.toLowerCase() || '';
        const teacher = card.querySelector(".course-teacher")?.textContent.toLowerCase() || '';

        if (title.includes(query) || description.includes(query) || category.includes(query) || teacher.includes(query)) {
          card.style.display = "block";
          card.style.animation = "fadeInCards 0.6s ease forwards";
          resultsCount++;
        } else {
          card.style.display = "none";
        }
      });
    }

    // Show "No results" message if no matches found
    if (resultsCount === 0) {
      const noResults = document.createElement("div");
      noResults.className = "no-results-message";
      noResults.style.cssText = "grid-column: 1/-1; text-align: center; padding: 60px; color: #64748b;";
      noResults.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
        <p style="font-size: 18px; font-weight: 500;">No courses found matching "${query}"</p>
        <p style="font-size: 14px; margin-top: 10px;">Try searching for a different topic or category.</p>
      `;
      coursesGrid.appendChild(noResults);
    }
  };

  // Real-time search with debounce
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let searchTimeoutId = null;

    const handleSearchInput = () => {
      clearTimeout(searchTimeoutId);
      searchTimeoutId = setTimeout(() => {
        window.searchCourses();
      }, 250);
    };

    searchInput.addEventListener("input", handleSearchInput);

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        window.searchCourses();
      }
    });
  }

  /* CLICKABLE DASHBOARD CARDS */
  const featureCards = document.querySelectorAll(".cards .card[data-link]");

  featureCards.forEach((card) => {
    const navigate = () => {
      const target = card.dataset.link;
      if (target) {
        window.location.href = target;
      }
    };

    card.style.cursor = "pointer";
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", navigate);

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate();
      }
    });
  });

  /* ACTIVE NAV LINK HIGHLIGHT */
  const highlightActiveNav = () => {
    const currentFile = window.location.pathname.split("/").pop();
    const allNavLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");

    allNavLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const linkFile = href.split("/").pop();

      if (linkFile === currentFile) {
        link.style.fontWeight = "";
      } else {
        link.style.fontWeight = "";
      }
    });
  };

  highlightActiveNav();

  // Load footer
  fetch("../Footer/footer.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    })
    .catch(error => console.error("Error loading footer:", error));

  // ===============================
  // INITIALIZE - FETCH COURSES FROM BACKEND
  // ===============================
  
  // Check if API config is loaded
  if (typeof API_CONFIG === 'undefined') {
    console.error('API_CONFIG not found! Make sure api-config.js is included before home_page2.js');
    
    const coursesGrid = document.getElementById('coursesGrid');
    if (coursesGrid) {
      coursesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
          <div style="font-size: 48px; margin-bottom: 20px; color: #f44336;">⚠️</div>
          <p style="font-size: 18px; color: #666; margin-bottom: 10px;">
            Configuration Error
          </p>
          <p style="font-size: 14px; color: #999;">
            Please ensure api-config.js is loaded before this script.
          </p>
        </div>
      `;
    }
  } else {
    // Fetch courses from backend
    fetchCourses();
    console.log(' Homepage initialized with backend integration');
  }
});