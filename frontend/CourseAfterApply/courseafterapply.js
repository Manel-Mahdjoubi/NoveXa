// ===============================
// GLOBAL VARIABLES
// ===============================
let currentLectureIndex = { section: 0, lecture: 0 };
let lectureSelected = false;

// ===============================
// PAGE INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
});

// Initialize all page components
// ===============================
// API INTEGRATION - COURSE LEARNING
// ===============================

// Get course ID from URL
function getCourseIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('courseId');
}

// Check authentication
function checkAuthentication() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    showNotification('Please login to access this course', 'error');
    setTimeout(() => {
      window.location.href = '../login_page/login.html';
    }, 2000);
    return false;
  }

  const user = JSON.parse(userStr);
  if (user.role !== 'student') {
    showNotification('Only students can access course content', 'error');
    setTimeout(() => {
      window.location.href = '../Homepage/homepage.html';
    }, 2000);
    return false;
  }

  return true;
}

// Fetch course learning content
async function fetchCourseLearningContent(courseId) {
  try {
    const data = await apiCall(`${API_CONFIG.ENDPOINTS.COURSE_LEARNING}/${courseId}`);
    
    if (data.success) {
      return data;
    }
  } catch (error) {
    console.error('Error fetching course content:', error);
    
    if (error.message.includes('not enrolled')) {
      showNotification('You are not enrolled in this course', 'error');
      setTimeout(() => {
        window.location.href = `../CourseDetails/coursedetails.html?courseId=${courseId}`;
      }, 2000);
    } else {
      showNotification('Failed to load course content', 'error');
    }
    
    return null;
  }
}

// Helper to format duration in seconds to mm:ss
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert backend data to frontend format
function convertToFrontendFormat(backendData) {
  const { course, enrollment } = backendData;
  
  // Get progress data
  const progress = enrollment.progress || {};
  const lectureProgress = progress.lectures || {};
  const quizProgress = progress.quizzes || {};

  return {
    courseInfo: {
      title: course.C_title,
      description: course.C_desc,
      duration: `${course.totalLectures} lectures`,
      certificate: course.C_certificate ? 'Certified' : 'No Certificate',
      image: course.C_image,
      teacherId: course.teacher?.T_id || course.teacherId,
      teacherName: course.teacher ? `${course.teacher.T_firstname} ${course.teacher.T_lastname}` : "Your Teacher"
    },
    sections: course.chapters.map((chapter, chapterIndex) => {
      const lectures = chapter.lectures.map(lecture => {
        const isCompleted = lectureProgress[lecture.id || lecture.lec_id]?.completed || false;
        const durationSeconds = lecture.lec_duration || 480; // Fallback to 8 min
        return {
          id: lecture.id || lecture.lec_id,
          title: lecture.title || lecture.lec_title,
          type: 'video',
          durationSeconds: durationSeconds,
          duration: formatDuration(durationSeconds),
          videoUrl: lecture.lec_vid ? (lecture.lec_vid.startsWith('http') ? lecture.lec_vid : `${API_CONFIG.BASE_URL.replace('/api', '')}/${lecture.lec_vid}`) : '',
          files: lecture.lec_file || [],
          completed: isCompleted
        };
      });

      // Calculate total chapter duration
      const totalLectureSeconds = lectures.reduce((sum, l) => sum + l.durationSeconds, 0);
      const hasQuiz = chapter.quiz && chapter.quiz.hasQuiz;
      // Add 10 minutes (600 seconds) if there's a quiz, as requested by user
      const totalChapterSeconds = totalLectureSeconds + (hasQuiz ? 600 : 0);
      
      // For chapter duration, we'll use a slightly different format (e.g., "45 min")
      const totalMins = Math.ceil(totalChapterSeconds / 60);
      const chapterDurationText = totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins} min`;

      return {
        id: chapter.id || chapter.chap_id,
        title: `${chapterIndex + 1}. ${chapter.chap_title}`,
        lectureCount: chapter.lectures.length,
        duration: chapterDurationText,
        lectures: lectures,
        quiz: hasQuiz ? {
          hasQuiz: true,
          quizId: chapter.quiz.quiz_id,
          quizName: chapter.quiz.quiz_title || 'QUIZ',
          chapterId: chapter.chap_id,
          completed: chapter.quiz.completed || quizProgress[chapter.quiz.quiz_id]?.completed || false,
          score: chapter.quiz.score || quizProgress[chapter.quiz.quiz_id]?.score || 0
        } : {
          hasQuiz: false
        }
      };
    }),
    certificate: backendData.certificate || null,
    getTotalItems: function() {
      let total = 0;
      this.sections.forEach(section => {
        total += section.lectures.length;
        if (section.quiz && section.quiz.hasQuiz) {
          total += 1;
        }
      });
      return total;
    },
    getCompletedItems: function() {
      let completed = 0;
      this.sections.forEach(section => {
        completed += section.lectures.filter(l => l.completed).length;
        if (section.quiz && section.quiz.hasQuiz && section.quiz.completed) {
          completed += 1;
        }
      });
      return completed;
    },
    getProgressPercentage: function() {
      const total = this.getTotalItems();
      const completed = this.getCompletedItems();
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    },
    markLectureComplete: async function(sectionIndex, lectureIndex) {
      const lecture = this.sections[sectionIndex].lectures[lectureIndex];
      lecture.completed = true;
      
      // Save to backend
      await updateLectureProgress(lecture.id, true);
    },
    // Progression Helpers
    isChapterCompleted: function(sectionIndex) {
      const section = this.sections[sectionIndex];
      const allLecturesDone = section.lectures.every(l => l.completed);
      const quizDone = section.quiz.hasQuiz ? section.quiz.completed : true;
      return allLecturesDone && quizDone;
    },
    isChapterLocked: function(sectionIndex) {
      if (sectionIndex === 0) return false;
      return !this.isChapterCompleted(sectionIndex - 1);
    },
    isLectureLocked: function(sectionIndex, lectureIndex) {
      // If chapter is locked, all lectures in it are locked
      if (this.isChapterLocked(sectionIndex)) return true;
      
      // First lecture of an unlocked chapter is always unlocked
      if (lectureIndex === 0) return false;
      
      // Other lectures depend on the previous one being completed
      return !this.sections[sectionIndex].lectures[lectureIndex - 1].completed;
    },
    isQuizLocked: function(sectionIndex) {
      // If chapter is locked, quiz is locked
      if (this.isChapterLocked(sectionIndex)) return true;
      
      // Quiz requires all lectures in the chapter to be completed
      return !this.sections[sectionIndex].lectures.every(l => l.completed);
    }
  };
}

// Update lecture progress on backend
async function updateLectureProgress(lectureId, completed) {
  try {
    const courseId = getCourseIdFromURL();
    await apiCall(API_CONFIG.ENDPOINTS.UPDATE_PROGRESS, {
      method: 'POST',
      body: JSON.stringify({
        courseId: parseInt(courseId),
        lectureId: lectureId,
        completed: completed
      })
    });
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

// Initialize page with backend data
async function initializePage() {
  // Check authentication
  if (!checkAuthentication()) {
    return;
  }

  const courseId = getCourseIdFromURL();
  
  if (!courseId) {
    showNotification('No course selected', 'error');
    setTimeout(() => {
      window.location.href = '../home_page2/home_page2.html';
    }, 2000);
    return;
  }

  // Show loading state
  const sectionsContainer = document.getElementById('sectionsContainer');
  if (sectionsContainer) {
    sectionsContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading course...</div>';
  }

  // Fetch course learning content
  const backendData = await fetchCourseLearningContent(courseId);
  
  if (!backendData) {
    if (sectionsContainer) {
      sectionsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #f44336;">Failed to load course. Please try again.</div>';
    }
    return;
  }

  // Convert to frontend format
  window.courseContentData = convertToFrontendFormat(backendData);
  window.currentCourseId = courseId;

  // Load course info and render
  loadCourseInfo();
  renderSections();
  setupVideoControls();
  setupProfileButton();
  updateProgress();
  
  console.log('Course Learning Page Loaded Successfully! 🎓');
}

// ===============================
// COURSE INFORMATION
// ===============================
function loadCourseInfo() {
    const courseTitle = document.getElementById('courseTitle');
    const totalLectures = document.getElementById('totalLectures');
    
    if (courseTitle && courseContentData.courseInfo) {
        courseTitle.textContent = courseContentData.courseInfo.title;
    }
    
    if (totalLectures) {
        // Now includes quizzes
        totalLectures.textContent = courseContentData.getTotalItems();
    }
}

// ===============================
// RENDER COURSE SECTIONS
// ===============================

// Update renderSections to handle quiz redirection
function renderSections() {
  const container = document.getElementById('sectionsContainer');
  if (!container) return;
  
  container.innerHTML = '';

  courseContentData.sections.forEach((section, sectionIndex) => {
    const sectionDiv = createSectionElement(section, sectionIndex);
    container.appendChild(sectionDiv);
  });
}

function createSectionElement(section, sectionIndex) {
  const sectionDiv = document.createElement('div');
  const isLocked = courseContentData.isChapterLocked(sectionIndex);
  sectionDiv.className = `section-item ${isLocked ? 'locked' : ''}`;
  
  // Create section header
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <span class="toggle-icon">▼</span>
    <h3 class="section-title">${section.title} ${isLocked ? '🔒' : ''}</h3>
    <span class="section-meta">${section.lectureCount} lectures · ${section.duration}</span>
  `;
  
  // Create section content
  const content = document.createElement('div');
  content.className = 'section-content';
  
  // If not locked, we can toggle. If locked, keep it closed.
  if (!isLocked) {
    // Add lectures
    section.lectures.forEach((lecture, lectureIndex) => {
      const lectureDiv = createLectureElement(lecture, sectionIndex, lectureIndex);
      content.appendChild(lectureDiv);
    });

    // Add quiz button if exists
    if (section.quiz && section.quiz.hasQuiz) {
      const isQuizLocked = courseContentData.isQuizLocked(sectionIndex);
      const quizBtn = document.createElement('button');
      quizBtn.className = `quiz-button ${isQuizLocked ? 'locked' : ''}`;
      quizBtn.textContent = section.quiz.quizName;
      
      if (section.quiz.completed) {
        quizBtn.classList.add('completed');
        quizBtn.textContent = `${section.quiz.quizName} ✓ (Score: ${section.quiz.score || 'N/A'})`;
      }

      quizBtn.addEventListener('click', async function() {
        if (isQuizLocked) {
          showNotification('Complete all lectures in this chapter to unlock the quiz!', 'info');
          return;
        }
        await handleQuizRedirection(section.quiz.chapterId, section.quiz.quizId);
      });

      content.appendChild(quizBtn);
    }
    
    // Add toggle functionality
    header.addEventListener('click', () => {
      header.classList.toggle('active');
      content.classList.toggle('active');
    });
  } else {
    // Locked chapter click feedback
    header.addEventListener('click', () => {
      showNotification('Complete the previous chapter to unlock this content!', 'info');
    });
  }
  
  sectionDiv.appendChild(header);
  sectionDiv.appendChild(content);
  
  return sectionDiv;
}

// Handle quiz redirection
async function handleQuizRedirection(chapterId, quizId) {
  try {
    // Verify quiz access
    const data = await apiCall(API_CONFIG.ENDPOINTS.VERIFY_QUIZ, {
      method: 'POST',
      body: JSON.stringify({ chapterId: chapterId })
    });

    if (data.success && data.permissionGranted) {
      // Store data for quiz page
      localStorage.setItem('quizData', JSON.stringify({
        quizId: data.quiz.quiz_id,
        chapterId: data.quiz.chap_id,
        courseId: window.currentCourseId,
        quizTitle: data.quiz.quiz_title,
        returnUrl: window.location.href
      }));

      // Record attempt start
      await apiCall(API_CONFIG.ENDPOINTS.START_ATTEMPT, {
        method: 'POST',
        body: JSON.stringify({
          quizId: data.quiz.quiz_id,
          chapterId: chapterId,
          courseId: window.currentCourseId
        })
      });

      // Redirect to quiz page with all necessary IDs
      window.location.href = `../quiz pages/sQuiz.html?quizId=${data.quiz.quiz_id}&chapterId=${chapterId}&courseId=${window.currentCourseId}`;
    }
  } catch (error) {
    console.error('Quiz access error:', error);
    showNotification(error.message || 'Failed to access quiz', 'error');
  }
}

function createLectureElement(lecture, sectionIndex, lectureIndex) {
    const lectureDiv = document.createElement('div');
    
    // Determine lecture classes
    const isCompleted = lecture.completed;
    const isLocked = courseContentData.isLectureLocked(sectionIndex, lectureIndex);
    const isActive = sectionIndex === currentLectureIndex.section && 
                     lectureIndex === currentLectureIndex.lecture && 
                     lectureSelected;
    
    lectureDiv.className = `lecture-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
    
    const downloadHtml = (!isLocked && lecture.files && lecture.files !== "" && lecture.files.length > 0) ? 
        `<span class="lecture-download-link" onclick="event.stopPropagation(); downloadLectureFile('${lecture.files}', '${lecture.title}')">Download</span>` : "";

    lectureDiv.innerHTML = `
        <div class="lecture-checkbox"></div>
        <span class="lecture-icon">${isLocked ? '🔒' : '📄'}</span>
        <div class="lecture-content-wrapper">
            <div class="lecture-title-row">
                <p class="lecture-title">${lecture.title}</p>
                ${downloadHtml}
            </div>
            <span class="lecture-duration">${lecture.duration}</span>
        </div>
    `;
    
    // Add click event
    lectureDiv.addEventListener('click', () => {
        if (isLocked) {
          showNotification('Complete the previous lecture to unlock this one!', 'info');
          return;
        }
        loadLecture(sectionIndex, lectureIndex);
    });
    
    return lectureDiv;
}

// ===============================
// RENDER RESOURCES
// ===============================
function renderResources() {
    const container = document.getElementById('resourcesList');
    if (!container || !courseContentData.resources) return;
    
    container.innerHTML = '';

    courseContentData.resources.forEach(resource => {
        const resourceDiv = document.createElement('div');
        resourceDiv.className = 'resource-item';
        resourceDiv.innerHTML = `
            <div class="resource-icon">${resource.icon}</div>
            <div class="resource-info">
                <div class="resource-name">${resource.name}</div>
                <div class="resource-size">${resource.size} • ${resource.type}</div>
            </div>
            <button class="download-btn" onclick="downloadResource('${resource.name}')">Download</button>
        `;
        container.appendChild(resourceDiv);
    });
}

async function downloadResource(resourceName) {
    const courseId = getCourseIdFromURL();
    const section = courseContentData.sections[currentLectureIndex.section];
    const lecture = section.lectures[currentLectureIndex.lecture];
    const chapterId = section.id;
    const lectureId = lecture.id;

    if (!courseId || !chapterId || !lectureId) {
        showNotification('Missing identifier for download', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Unauthorized access', 'error');
        return;
    }

    // Construct the authenticated download URL
    const downloadUrl = `${API_CONFIG.BASE_URL}/files/courses/${courseId}/${chapterId}/${lectureId}/${resourceName}`;

    try {
        showNotification('Starting download...', 'info');
        
        const response = await fetch(downloadUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = resourceName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showNotification('Download successful', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Download failed', 'error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Error processing download', 'error');
    }
}

// Helper to download files with a specific name (Blob approach)
async function downloadLectureFile(url, lectureTitle) {
    if (!url) return;
    
    // Ensure the URL is absolute if it's from Cloudinary
    let fileUrl = url;
    if (url.includes('cloudinary.com') && !url.startsWith('http')) {
        fileUrl = (window.location.protocol === 'https:' ? 'https:' : 'http:') + url;
    }

    try {
        showNotification('Preparing your download...', 'info');
        
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Safety check to ensure we didn't get an HTML error page
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Retrieved content is HTML, not a file. CORS or 404 likely.');
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        
        // Construct a nice filename from the lecture title
        const safeTitle = lectureTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        // Extract extension from URL
        let extension = 'pdf';
        const urlPart = fileUrl.split('?')[0].split('#')[0];
        const match = urlPart.match(/\.([a-z0-9]+)$/i);
        if (match) extension = match[1];
        
        a.download = `${safeTitle}_Material.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 200);
        
        showNotification('Download started!', 'success');
    } catch (error) {
        console.error('Advanced download failed:', error);
        
        // Fallback: Use Cloudinary's built-in attachment flag to force a browser download
        let fallbackUrl = fileUrl;
        if (fileUrl.includes('/upload/')) {
            fallbackUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
        }
        
        window.open(fallbackUrl, '_blank');
        showNotification('Renaming failed. Opening direct download...', 'info');
    }
}

// ===============================
// LECTURE LOADING
// ===============================
function loadLecture(sectionIndex, lectureIndex) {
    // Final check for locking
    if (courseContentData.isLectureLocked(sectionIndex, lectureIndex)) {
        showNotification('This lecture is currently locked!', 'info');
        return;
    }

    currentLectureIndex = { section: sectionIndex, lecture: lectureIndex };
    lectureSelected = true;
    
    const lecture = courseContentData.sections[sectionIndex].lectures[lectureIndex];
    
    // Update lecture title
    const titleElement = document.getElementById('currentLectureTitle');
    if (titleElement) {
        titleElement.textContent = lecture.title;
    }
    
    // Enable controls
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
        completeBtn.disabled = false;
        
        // Update complete button state
        if (lecture.completed) {
            completeBtn.textContent = '✓ Completed';
            completeBtn.classList.add('completed');
        } else {
            completeBtn.textContent = '✓ Mark Complete';
            completeBtn.classList.remove('completed');
        }
    }
    
    updateNavigationButtons();
    renderSections();
    
    // Load video if URL exists
    loadVideo(lecture.videoUrl);
    
    // Scroll to top of video section
    document.querySelector('.video-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}



// Update loadVideo function to handle backend URLs
function loadVideo(videoUrl) {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;
  
  if (videoUrl && videoUrl.trim() !== '') {
    // Check if it's a YouTube/Vimeo URL or local video
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com')) {
      // External video (iframe)
      videoContainer.innerHTML = `
        <iframe 
          src="${videoUrl}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    } else {
      // Local video file
      videoContainer.innerHTML = `
        <video controls style="width: 100%; height: 100%;">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    }
  } else {
    // Show placeholder
    videoContainer.innerHTML = `
      <div class="video-placeholder">
        <div style="font-size: 80px;">▶️</div>
        <p>Video Player</p>
        <p style="font-size: 14px; margin-top: 10px;">Video content will load here</p>
      </div>
    `;
  }
}


// ===============================
// VIDEO CONTROLS
// ===============================
function setupVideoControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const completeBtn = document.getElementById('completeBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', previousLecture);
    if (nextBtn) nextBtn.addEventListener('click', nextLecture);
    if (completeBtn) completeBtn.addEventListener('click', markComplete);
}

function updateNavigationButtons() {
    const { section, lecture } = currentLectureIndex;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!prevBtn || !nextBtn) return;
    
    // Check if previous lecture exists
    const hasPrevious = lecture > 0 || section > 0;
    prevBtn.disabled = !hasPrevious;
    
    // Check if next lecture exists
    const isLastLecture = lecture >= courseContentData.sections[section].lectures.length - 1;
    const isLastSection = section >= courseContentData.sections.length - 1;
    const hasNext = !(isLastLecture && isLastSection);
    nextBtn.disabled = !hasNext;
}

function previousLecture() {
    const { section, lecture } = currentLectureIndex;
    
    if (lecture > 0) {
        // Go to previous lecture in same section
        loadLecture(section, lecture - 1);
    } else if (section > 0) {
        // Go to last lecture of previous section
        const prevSection = section - 1;
        const lastLectureIndex = courseContentData.sections[prevSection].lectures.length - 1;
        loadLecture(prevSection, lastLectureIndex);
    }
}

function nextLecture() {
    const { section, lecture } = currentLectureIndex;
    
    if (lecture < courseContentData.sections[section].lectures.length - 1) {
        // Go to next lecture in same section
        loadLecture(section, lecture + 1);
    } else if (section < courseContentData.sections.length - 1) {
        // Go to first lecture of next section
        loadLecture(section + 1, 0);
    }
}

// Update markComplete to save to backend
async function markComplete() {
  const { section, lecture } = currentLectureIndex;
  const currentLecture = courseContentData.sections[section].lectures[lecture];
  
  if (!currentLecture.completed) {
    // Mark as complete
    await courseContentData.markLectureComplete(section, lecture);
    
    // Update UI
    renderSections();
    updateProgress();
    
    // Update button
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
      completeBtn.textContent = '✓ Completed';
      completeBtn.classList.add('completed');
    }
    
    showNotification('Lecture completed!', 'success');
    
    // Auto advance
    setTimeout(() => {
      const sectionIndex = currentLectureIndex.section;
      const lectureIndex = currentLectureIndex.lecture;
      const section = courseContentData.sections[sectionIndex];
      
      // If there's a quiz in this chapter and it's not completed, don't auto-advance to next chapter
      if (lectureIndex >= section.lectures.length - 1) {
        if (section.quiz && section.quiz.hasQuiz && !section.quiz.completed) {
          showNotification('You finished all lectures! Now take the quiz to unlock the next chapter. ✍️', 'success');
          return;
        }
      }

      const hasNext = lectureIndex < section.lectures.length - 1 ||
                     sectionIndex < courseContentData.sections.length - 1;
      
      if (hasNext) {
        // If next is in next section, check if it's locked
        if (lectureIndex >= section.lectures.length - 1) {
           if (courseContentData.isChapterLocked(sectionIndex + 1)) {
              showNotification('Chapter complete! Finish the quiz to unlock the next chapter. 🔒', 'info');
              return;
           }
        }
        nextLecture();
      } else {
        showNotification('Congratulations! You completed the course! 🎉', 'success');
      }
    }, 1500);
  }
}


// ===============================
// PROGRESS TRACKING
// ===============================
// ===============================
// PROGRESS TRACKING
// ===============================
function updateProgress() {
    const percentage = courseContentData.getProgressPercentage();
    const completed = courseContentData.getCompletedItems();
    const total = courseContentData.getTotalItems();
    
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const completedLectures = document.getElementById('completedLectures');
    const feedbackBtn = document.getElementById('feedback');
    
    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressPercent) progressPercent.textContent = percentage;
    if (completedLectures) completedLectures.textContent = completed;

    // Certificate Button Logic
    const certificateArea = document.getElementById('certificateArea');
    const getCertificateBtn = document.getElementById('getCertificateBtn');

    if (certificateArea && getCertificateBtn) {
        if (percentage >= 100) {
            certificateArea.style.display = 'block';
            if (courseContentData.certificate) {
                getCertificateBtn.innerHTML = '🎓 Download Certificate';
                getCertificateBtn.classList.add('download-mode');
            } else {
                getCertificateBtn.innerHTML = '🎓 Get Certificate';
                getCertificateBtn.classList.remove('download-mode');
            }
            getCertificateBtn.onclick = generateCertificate;
        } else {
            certificateArea.style.display = 'none';
        }
    }

    // Handle Feedback Button enabling/disabling
    if (feedbackBtn) {
        if (percentage >= 100) {
            feedbackBtn.disabled = false;
            feedbackBtn.style.opacity = '1';
            feedbackBtn.style.cursor = 'pointer';
            feedbackBtn.classList.add('enabled');

            // Add click event for redirection
            feedbackBtn.onclick = () => {
                const courseInfo = courseContentData.courseInfo;
                localStorage.setItem('feedbackContext', JSON.stringify({
                    courseId: window.currentCourseId,
                    courseTitle: courseInfo.title,
                    teacherId: courseInfo.teacherId,
                    teacherName: courseInfo.teacherName,
                    returnUrl: window.location.href
                }));
                window.location.href = '../Feedbackpage/feedback.html';
            };
        } else {
            feedbackBtn.disabled = true;
            feedbackBtn.style.opacity = '0.5';
            feedbackBtn.style.cursor = 'not-allowed';
            
            // Helpful tooltip/msg on click
            feedbackBtn.onclick = () => {
                showNotification(`Complete all lectures and quizzes to give feedback! (${completed}/${total})`, 'info');
            };
        }
    }
}

async function generateCertificate() {
    const btn = document.getElementById('getCertificateBtn');
    
    // If certificate already exists, trigger download instead
    if (courseContentData.certificate) {
        const certId = courseContentData.certificate.certificateId;
        const format = courseContentData.certificate.format;
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Preparing...';
        }
        
        try {
            const token = localStorage.getItem(API_CONFIG.KEYS.TOKEN);
            const response = await fetch(`${API_CONFIG.BASE_URL}/certificates/download/${certId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Certificate_${certId}.${format}`; 
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showNotification('Certificate downloaded!', 'success');
            } else {
                showNotification('Failed to download certificate', 'error');
            }
        } catch (e) {
            console.error('Download error:', e);
            showNotification('Error downloading certificate', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🎓 Download Certificate';
            }
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⚙️ Generating...';
    }

    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) throw new Error('User not found');
        const user = JSON.parse(userStr);
        
        console.log('Generating certificate for:', {
            user: user,
            S_id: user.S_id,
            id: user.id,
            courseId: window.currentCourseId
        });

        const studentId = user.S_id || user.id;

        const response = await apiCall('/certificates/generate', {
            method: 'POST',
            body: JSON.stringify({
                studentId: studentId,
                courseId: window.currentCourseId
            })
        });

        if (response.success) {
            showNotification('Certificate generated successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '../student and teacher dashboard/sDashboard.html';
            }, 2000);
        } else {
             if (response.message && response.message.includes('already exists')) {
                 showNotification('Certificate already exists. Redirecting...', 'info');
                 setTimeout(() => {
                    window.location.href = '../student and teacher dashboard/sDashboard.html';
                 }, 1500);
             } else {
                throw new Error(response.message);
             }
        }
    } catch (error) {
        console.error('Certificate generation error:', error);
        showNotification(error.message || 'Failed to generate certificate', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🎓 Get Certificate';
        }
    }
}

// ===============================
// TABS FUNCTIONALITY
// ===============================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

// ===============================
// PROFILE BUTTON
// ===============================
function setupProfileButton() {
    const profileBtn = document.querySelector('.btn-profile');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = '../profile/profile.html';
        });
    }
}

// ===============================
// NOTIFICATION SYSTEM
// ===============================
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

    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// ===============================
// ERROR HANDLING
// ===============================
function showError(message) {
    const mainContent = document.querySelector('.course-learning-page');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #f44336; margin-bottom: 15px;">Error Loading Course</h2>
            <p style="color: #666; font-size: 18px; margin-bottom: 25px;">${message}</p>
            <button onclick="location.reload()" style="padding: 12px 30px; background: #0e84c8; color: white; border: none; border-radius: 25px; font-size: 16px; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;
}

// ===============================
// KEYBOARD SHORTCUTS
// ===============================
document.addEventListener('keydown', (e) => {
    // Only trigger if no input is focused
    if (document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.tagName === 'INPUT') {
        return;
    }
    
    // Arrow Left - Previous lecture
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn && !prevBtn.disabled) {
            previousLecture();
        }
    }
    
    // Arrow Right - Next lecture
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && !nextBtn.disabled) {
            nextLecture();
        }
    }
    
    // Spacebar - Mark complete
    if (e.key === ' ' && lectureSelected) {
        e.preventDefault();
        const completeBtn = document.getElementById('completeBtn');
        if (completeBtn && !completeBtn.disabled) {
            markComplete();
        }
    }
});

// ===============================
// WINDOW RESIZE HANDLER
// ===============================
window.addEventListener('resize', () => {
    // Handle any responsive adjustments if needed
    console.log('Window resized');
});



 const profilebtn = document.querySelector('.btn-profile');

if (profilebtn) {
    profilebtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../profile/profile.html';
        }, 300);
      })};



      document.addEventListener("DOMContentLoaded", function () {
  const sidebare = document.getElementById("sidebare");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const navvLinks = document.querySelectorAll(".navv-link");
  const actionButtons = document.querySelectorAll(".action-btn");

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
    sidebare.classList.remove("collapsed");
    localStorage.setItem("sidebarCollapsed", "false");

    if (window.innerWidth <= 600) {
      overlay.classList.add("active");
    }
  }

  function closeSidebar() {
    sidebare.classList.add("collapsed");
    overlay.classList.remove("active");
    localStorage.setItem("sidebarCollapsed", "true");
  }

  function toggleSidebar() {
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

  if (window.innerWidth > 600) {
    if (savedState === "true") {
      sidebare.classList.add("collapsed");
    } else {
      sidebare.classList.remove("collapsed");
    }
  } else {
    sidebare.classList.add("collapsed");
  }

  // ===============================
  // EVENT LISTENERS
  // ===============================

  // Toggle button
  sidebarToggle.addEventListener("click", toggleSidebar);

  // Close button
  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  // Close when clicking overlay
  overlay.addEventListener("click", closeSidebar);

  // Close when clicking outside sidebar (desktop)
  document.addEventListener("click", function (event) {
    if (!sidebare.classList.contains("collapsed")) {
      if (!sidebare.contains(event.target) && !sidebarToggle.contains(event.target)) {
        closeSidebar();
      }
    }
  });

  // ===============================
  // WINDOW RESIZE
  // ===============================
  window.addEventListener("resize", function () {
    if (window.innerWidth > 600) {
      overlay.classList.remove("active");
    } else {
      if (!sidebare.classList.contains("collapsed")) {
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

  // ===============================
  // ACTION BUTTONS
  // ===============================
  actionButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Animation
      this.style.transform = "scale(0.95)";
      setTimeout(() => (this.style.transform = ""), 150);

      console.log("Action:", this.querySelector(".btn-text").textContent);
    });
  });

  // ===============================
  // KEYBOARD SHORTCUTS
  // ===============================
  document.addEventListener("keydown", function (e) {
    // Close with Escape key
    if (e.key === "Escape" && !sidebare.classList.contains("collapsed")) {
      closeSidebar();
    }

    // Toggle with Alt + S
    if (e.altKey && e.key === "s") {
      e.preventDefault();
      toggleSidebar();
    }
  });
});




const probtn = document.querySelector('.action-btn btn-secondary');

if (probtn) {
    probtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../Homepage/homepage.html';
        }, 300);
      })};



const feedbackBtn = document.getElementById('feedback');

if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
        // Get current course data
        const courseId = currentCourseId;
        const courseTitle = courseContentData?.courseInfo?.title || 'Unknown Course';
        const teacherId = courseContentData?.course?.teacher?.T_id || null;
        const teacherName = courseContentData?.course?.teacher ? 
            `${courseContentData.course.teacher.T_firstname} ${courseContentData.course.teacher.T_lastname}` : 
            'Unknown Teacher';

        // Store feedback context in localStorage
        localStorage.setItem('feedbackContext', JSON.stringify({
            courseId: parseInt(courseId),
            courseTitle: courseTitle,
            teacherId: teacherId,
            teacherName: teacherName,
            returnUrl: window.location.href
        }));

        // Redirect to feedback page
        window.location.href = '../Feedbackpage/feedback.html';
    });
}