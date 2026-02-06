document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // RENDER SECTIONS FROM SHARED DATA
    // ===============================
    function renderCourseSections() {
        const sectionsContainer = document.querySelector('.sections-container');
        if (!sectionsContainer || !window.courseContentData) return;

        sectionsContainer.innerHTML = '';

        window.courseContentData.sections.forEach((section, sectionIndex) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-item';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'section-header';
            headerDiv.setAttribute('data-section', sectionIndex + 1);
            headerDiv.innerHTML = `
                <span class="toggle-icon">▼</span>
                <h3 class="section-title">${section.title}</h3>
                <span class="section-meta">${section.lectureCount} lectures · ${section.duration}</span>
            `;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'section-content';
            contentDiv.id = `section-${sectionIndex + 1}`;

            section.lectures.forEach(lecture => {
                const lectureDiv = document.createElement('div');
                lectureDiv.className = 'lecture-item';
                lectureDiv.innerHTML = `
                    <span class="lecture-icon">📄</span>
                    <p class="lecture-title">${lecture.title}</p>
                `;
                contentDiv.appendChild(lectureDiv);
            });

            if (section.quiz && section.quiz.hasQuiz) {
                const quizDiv = document.createElement('div');
                quizDiv.className = 'quiz-label';
                quizDiv.textContent = section.quiz.quizName;
                contentDiv.appendChild(quizDiv);
            }

            sectionDiv.appendChild(headerDiv);
            sectionDiv.appendChild(contentDiv);
            sectionsContainer.appendChild(sectionDiv);
        });

        attachSectionListeners();
    }

    // ===============================
    // ATTACH SECTION EVENT LISTENERS
    // ===============================
    function attachSectionListeners() {
        const sectionHeaders = document.querySelectorAll('.section-header');
        
        sectionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sectionNum = header.getAttribute('data-section');
                const content = document.getElementById(`section-${sectionNum}`);

                header.classList.toggle('active');
                content.classList.toggle('active');

                if (content.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + 50 + 'px';
                } else {
                    content.style.maxHeight = '0';
                }
            });
        });
    }

    if (window.courseContentData) {
        renderCourseSections();
    }
    
    // ===============================
    // SECTION COLLAPSE/EXPAND FUNCTIONALITY
    // ===============================
    const expandBtn = document.getElementById('expandBtn');
    let allExpanded = false;

    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            const sectionHeaders = document.querySelectorAll('.section-header');
            allExpanded = !allExpanded;

            sectionHeaders.forEach((header, index) => {
                const sectionNum = header.getAttribute('data-section');
                const content = document.getElementById(`section-${sectionNum}`);

                setTimeout(() => {
                    if (allExpanded) {
                        header.classList.add('active');
                        content.classList.add('active');
                        content.style.maxHeight = content.scrollHeight + 50 + 'px';
                    } else {
                        header.classList.remove('active');
                        content.classList.remove('active');
                        content.style.maxHeight = '0';
                    }
                }, index * 100);
            });

            expandBtn.textContent = allExpanded ? 'Collapse all sections' : 'Expand all sections';

            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
        });
    }

    // ===============================
    // SHOW MORE FUNCTIONALITY
    // ===============================
    const showMoreBtn = document.getElementById('showMoreBtn');
    const sectionsContainer = document.querySelector('.sections-container');
    let showingAll = false;

    if (showMoreBtn && sectionsContainer) {
        const allSections = sectionsContainer.querySelectorAll('.section-item');
        if (allSections.length <= 5) {
            showMoreBtn.style.display = 'none';
        } else {
            allSections.forEach((section, index) => {
                if (index >= 5) {
                    section.style.display = 'none';
                }
            });
        }

        showMoreBtn.addEventListener('click', () => {
            showingAll = !showingAll;
            const allSections = sectionsContainer.querySelectorAll('.section-item');

            allSections.forEach((section, index) => {
                if (index >= 5) {
                    if (showingAll) {
                        section.style.display = 'block';
                        setTimeout(() => {
                            section.style.opacity = '0';
                            section.style.transform = 'translateY(20px)';
                            section.style.transition = 'all 0.4s ease';
                            setTimeout(() => {
                                section.style.opacity = '1';
                                section.style.transform = 'translateY(0)';
                            }, 10);
                        }, (index - 5) * 100);
                    } else {
                        section.style.opacity = '0';
                        section.style.transform = 'translateY(-20px)';
                        setTimeout(() => {
                            section.style.display = 'none';
                        }, 400);
                    }
                }
            });

            showMoreBtn.textContent = showingAll ? 'Show Less' : 'Show More';

            if (!showingAll) {
                setTimeout(() => {
                    showMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        });
    }

    // ===============================
    // LECTURE ITEM INTERACTIONS
    // ===============================
    const lectureItems = document.querySelectorAll('.lecture-item');

    lectureItems.forEach(item => {
        item.addEventListener('click', () => {
            item.style.transform = 'translateX(10px)';
            item.style.background = '#d4ebf7';

            setTimeout(() => {
                item.style.transform = 'translateX(5px)';
                item.style.background = '';
            }, 200);

            console.log('Lecture clicked:', item.querySelector('.lecture-title').textContent);
        });
    });

    // ===============================
    // SMOOTH SCROLL ANIMATIONS
    // ===============================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('.section-item');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(section);
    });

    // ===============================
    // DYNAMIC SECTION CONTENT HEIGHT
    // ===============================
    window.addEventListener('resize', () => {
        const activeSections = document.querySelectorAll('.section-content.active');
        activeSections.forEach(section => {
            section.style.maxHeight = section.scrollHeight + 'px';
        });
    });

    // ===============================
    // INITIAL PAGE LOAD ANIMATION
    // ===============================
    window.addEventListener('load', () => {
        const courseOverview = document.querySelector('.course-overview-card');
        const courseContent = document.querySelector('.course-content');

        if (courseOverview) {
            courseOverview.style.opacity = '0';
            courseOverview.style.transform = 'translateY(-30px)';
            setTimeout(() => {
                courseOverview.style.transition = 'all 0.6s ease-out';
                courseOverview.style.opacity = '1';
                courseOverview.style.transform = 'translateY(0)';
            }, 100);
        }

        if (courseContent) {
            courseContent.style.opacity = '0';
            courseContent.style.transform = 'translateY(30px)';
            setTimeout(() => {
                courseContent.style.transition = 'all 0.6s ease-out';
                courseContent.style.opacity = '1';
                courseContent.style.transform = 'translateY(0)';
            }, 300);
        }
    });
});

// ===============================
//  MOBILE MENU ANIMATIONS
// ===============================

document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navItems = document.querySelectorAll('.nav-item');
    const navLinks = document.querySelectorAll('.nav-link');

    if (toggle && navMenu) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('show');

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            toggle.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)';
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    navMenu.classList.remove('show');
                    toggle.style.transform = 'rotate(0deg) scale(1)';

                    navItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.transform = 'translateX(50px) rotateY(20deg)';
                            item.style.opacity = '0';
                        }, index * 50);
                    });

                    setTimeout(() => {
                        navItems.forEach(item => {
                            item.style.transform = '';
                            item.style.opacity = '';
                        });
                    }, 500);
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 &&
                navMenu.classList.contains('show') &&
                !navMenu.contains(e.target) &&
                !toggle.contains(e.target)) {

                navMenu.classList.remove('show');
                toggle.style.transform = 'rotate(0deg) scale(1)';

                navItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.transform = 'translateX(-50px) rotateY(-20deg)';
                        item.style.opacity = '0';
                    }, index * 50);
                });

                setTimeout(() => {
                    navItems.forEach(item => {
                        item.style.transform = '';
                        item.style.opacity = '';
                    });
                }, 500);
            }
        });

        let touchStartY = 0;
        navMenu.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        navMenu.addEventListener('touchmove', (e) => {
            if (window.innerWidth <= 900 && navMenu.classList.contains('show')) {
                const touchY = e.touches[0].clientY;
                const diff = touchStartY - touchY;

                if (diff > 100) {
                    navMenu.classList.remove('show');
                    toggle.style.transform = 'rotate(0deg) scale(1)';
                }
            }
        });
    }
});

// ===============================
// API INTEGRATION
// ===============================

function getCourseIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('courseId');
}

function isUserLoggedIn() {
  return !!localStorage.getItem('token');
}

function getUserRole() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.role;
  }
  return null;
}

async function fetchCourseDetails(courseId) {
  try {
    const data = await apiCall(`${API_CONFIG.ENDPOINTS.GET_COURSE_BY_ID}/${courseId}`);
    
    if (data.success) {
      return data.course;
    }
  } catch (error) {
    console.error('Error fetching course details:', error);
    showNotification('Failed to load course details', 'error');
    return null;
  }
}

async function checkEnrollmentStatus(courseId) {
  if (!isUserLoggedIn() || getUserRole() !== 'student') {
    return { isEnrolled: false };
  }

  try {
    const data = await apiCall(`${API_CONFIG.ENDPOINTS.CHECK_ENROLLMENT}/${courseId}`);
    return data;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return { isEnrolled: false };
  }
}

function populateCourseSections(chapters) {
  const sectionsContainer = document.querySelector('.sections-container');
  if (!sectionsContainer) return;

  sectionsContainer.innerHTML = '';

  chapters.forEach((chapter, chapterIndex) => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-item';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'section-header';
    headerDiv.setAttribute('data-section', chapterIndex + 1);
    
    const duration = `${chapter.numlecture * 8} min`;
    
    headerDiv.innerHTML = `
      <span class="toggle-icon">▼</span>
      <h3 class="section-title">${chapter.chap_title}</h3>
      <span class="section-meta">${chapter.numlecture} lectures · ${duration}</span>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'section-content';
    contentDiv.id = `section-${chapterIndex + 1}`;
    contentDiv.style.maxHeight = '0';
    contentDiv.style.overflow = 'hidden';
    contentDiv.style.transition = 'max-height 0.3s ease-out';

    if (chapter.Lecture && chapter.Lecture.length > 0) {
      chapter.Lecture.forEach(lecture => {
        const lectureDiv = document.createElement('div');
        lectureDiv.className = 'lecture-item';
        lectureDiv.innerHTML = `
          <span class="lecture-icon">📄</span>
          <p class="lecture-title">${lecture.lec_title}</p>
        `;
        contentDiv.appendChild(lectureDiv);
      });
    }

    if (chapter.Quiz) {
      const quizDiv = document.createElement('div');
      quizDiv.className = 'quiz-label';
      quizDiv.textContent = chapter.Quiz.quiz_title || 'QUIZ';
      contentDiv.appendChild(quizDiv);
    }

    headerDiv.addEventListener('click', () => {
      const isActive = headerDiv.classList.contains('active');
      
      headerDiv.classList.toggle('active');
      contentDiv.classList.toggle('active');

      if (!isActive) {
        contentDiv.style.maxHeight = contentDiv.scrollHeight + 50 + 'px';
      } else {
        contentDiv.style.maxHeight = '0';
      }
    });

    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(contentDiv);
    sectionsContainer.appendChild(sectionDiv);
  });
}

// OPTIMIZED: Smart image path construction
function populateCourseDetails(course) {
  const titleElement = document.querySelector('.course-title');
  if (titleElement) {
    titleElement.textContent = course.C_title;
  }

  const descElement = document.querySelector('.course-description');
  if (descElement) {
    descElement.textContent = course.C_desc;
  }

  // FIXED: Image loading with proper retry mechanism
  const imageContainer = document.querySelector('.course-image-container');
  if (imageContainer && course.C_image) {
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    
    // Normalize path: convert backslashes to forward slashes
    let imagePath = course.C_image.replace(/\\/g, '/');
    
    // Remove 'uploads/' prefix if it exists
    if (imagePath.startsWith('uploads/')) {
      imagePath = imagePath.substring(8);
    }
    
    // Try multiple possible paths
    const possiblePaths = [];
    
    // Check if image is an absolute URL (Cloudinary)
    if (course.C_image.startsWith('http') || course.C_image.startsWith('https')) {
      possiblePaths.push(course.C_image);
    } else {
      // Local paths fallback
      possiblePaths.push(
        `${baseUrl}/uploads/${imagePath}`,
        `${baseUrl}/${imagePath}`,
        `${baseUrl}/${course.C_image.replace(/\\/g, '/')}`
      );
    }
    
    console.log('🖼️ Loading image:', possiblePaths[0]);
    console.log('Check if file exists at: uploads/' + imagePath);
    
    let currentPathIndex = 0;
    
    const img = document.createElement('img');
    img.alt = course.C_title;
    img.className = 'course-image';
    
    img.onload = function() {
      console.log('Image loaded successfully!');
      // Image loaded - ensure it stays visible
      this.style.opacity = '1';
    };
    
    img.onerror = function() {
      currentPathIndex++;
      
      if (currentPathIndex < possiblePaths.length) {
        console.log(`Trying alternative path ${currentPathIndex + 1}:`, possiblePaths[currentPathIndex]);
        this.src = possiblePaths[currentPathIndex];
      } else {
        console.error(' All image paths failed');
        console.error('Expected file at: uploads/' + imagePath);
        
        // Only show placeholder after all attempts fail
        this.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e8e8e8' width='400' height='300'/%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='16' fill='%23666'%3E${encodeURIComponent(course.C_title)}%3C/text%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='12' fill='%23999'%3EImage not available%3C/text%3E%3C/svg%3E`;
        this.onerror = null;
      }
    };
    
    // Set initial src
    img.src = possiblePaths[0];
    
    // Clear container and add image
    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
  }

  const statsGrid = document.querySelector('.course-stats-grid');
  if (statsGrid) {
    const totalLectures = course.Chapter.reduce((sum, chapter) => sum + chapter.numlecture, 0);
    
    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-icon">🌟</div>
        <div class="stat-value">4.7</div>
        <div class="stat-label">Rating</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${totalLectures}</div>
        <div class="stat-label">Lectures</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">📜</div>
        <div class="stat-value">${course.C_certificate ? 'Certified' : 'No Cert'}</div>
        <div class="stat-label">Certificate</div>
      </div>
      <div class="stat-action">
        <button class="apply-course-btn" id="apply-btn">
          ${course.C_price > 0 ? `Apply for ${course.C_price} DZD` : 'Enroll Free'}
        </button>
      </div>
    `;
  }

  populateCourseSections(course.Chapter);
  window.currentCourseData = course;
}

async function initCourseDetailsPage() {
  const courseId = getCourseIdFromURL();
  
  if (!courseId) {
    showNotification('No course selected', 'error');
    setTimeout(() => {
      window.location.href = '../home_page2/home_page2.html';
    }, 2000);
    return;
  }

  const sectionsContainer = document.querySelector('.sections-container');
  if (sectionsContainer) {
    sectionsContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading course details...</div>';
  }

  const course = await fetchCourseDetails(courseId);
  
  if (!course) {
    if (sectionsContainer) {
      sectionsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #f44336;">Failed to load course. Please try again.</div>';
    }
    return;
  }

  populateCourseDetails(course);

  const enrollmentData = await checkEnrollmentStatus(courseId);
  updateApplyButtons(enrollmentData.isEnrolled, course);
}

function updateApplyButtons(isEnrolled, course) {
  const applyBtns = document.querySelectorAll('.apply-course-btn, .apply-btn');
  
  applyBtns.forEach(btn => {
    if (isEnrolled) {
      btn.textContent = 'Go to Course';
      btn.onclick = () => {
        window.location.href = `../CourseAfterApply/courseafterapply.html?courseId=${course.C_id}`;
      };
    } else {
      btn.onclick = () => {
        if (!isUserLoggedIn()) {
          showNotification('Please login to enroll', 'error');
          setTimeout(() => {
            window.location.href = '../Login/login.html';
          }, 1500);
          return;
        }
        
        if (getUserRole() !== 'student') {
          showNotification('Only students can enroll in courses', 'error');
          return;
        }

        localStorage.setItem('enrollmentCourse', JSON.stringify({
          courseId: course.C_id,
          title: course.C_title,
          price: course.C_price
        }));
        
        window.location.href = '../epayment/epayment.html';
      };
    }
  });
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;

  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: type === 'success' ? '#4CAF50' : '#f44336',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    zIndex: '10000',
    fontSize: '16px',
    fontWeight: '600',
    opacity: '0',
    transform: 'translateX(400px)',
    transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  initCourseDetailsPage();
});

// Button ripple effects
document.addEventListener('DOMContentLoaded', function() {
  const addRippleEffect = (button) => {
    if (!button) return;
    
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        animation: ripple 0.6s ease-out;
      `;
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  };

  // Add to all buttons
  setTimeout(() => {
    const applyBtn = document.querySelector('.apply-course-btn');
    const applyBtn2 = document.querySelector('.apply-btn');
    const profileBtn = document.querySelector('.btn-profile');
    
    addRippleEffect(applyBtn);
    addRippleEffect(applyBtn2);
    
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        setTimeout(() => {
          window.location.href = '../profile/profile.html';
        }, 300);
      });
      addRippleEffect(profileBtn);
    }
  }, 1000);
});

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    from {
      transform: scale(0);
      opacity: 1;
    }
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);