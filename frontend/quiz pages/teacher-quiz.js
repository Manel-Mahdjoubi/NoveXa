// Teacher Quiz Creator
let questions = [];
let questionCount = 0;
let selectedCourse = null;
let selectedChapter = null;

// API_BASE_URL will be provided by api-config.js

// Get auth token
function getAuthToken() {
    return localStorage.getItem(API_CONFIG.KEYS.TOKEN);
}

// Check if teacher has selected a chapter from coursemanagement
function checkCourseSelection() {
    // Get course structure from localStorage (set by coursemanagement page)
    const courseData = localStorage.getItem('courseStructure');
    const chapterIndex = localStorage.getItem('currentChapterForQuiz');
    
    if (!courseData || chapterIndex === null) {
        showNotification('No chapter selected. Please create quiz from course management page.', 'error');
        setTimeout(() => {
            window.location.href = '../Coursemanagement/coursemanagement.html';
        }, 2000);
        return false;
    }
    
    try {
        selectedCourse = JSON.parse(courseData);
        const idx = parseInt(chapterIndex);
        
        // Auto-select the chapter
        if (selectedCourse.chapters && selectedCourse.chapters[idx]) {
            selectedChapter = selectedCourse.chapters[idx];
            console.log('Auto-selected chapter:', selectedChapter);
            return true;
        } else {
            showNotification('Invalid chapter selection', 'error');
            setTimeout(() => {
                window.location.href = '../Coursemanagement/coursemanagement.html';
            }, 2000);
            return false;
        }
    } catch (error) {
        console.error('Error parsing course data:', error);
        showNotification('Invalid course data. Please try again.', 'error');
        setTimeout(() => {
            window.location.href = '../Coursemanagement/coursemanagement.html';
        }, 2000);
        return false;
    }
}

// Notification function for error messages
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

// Display selected chapter info
function displayChapterInfo() {
    if (selectedChapter) {
        const chapterNameElement = document.getElementById('selectedChapterName');
        if (chapterNameElement) {
            chapterNameElement.textContent = selectedChapter.name || 'Chapter ' + (parseInt(localStorage.getItem('currentChapterForQuiz')) + 1);
        }
    }
}

// Add initial question on load
document.addEventListener('DOMContentLoaded', function() {
    // Check course selection first
    if (!checkCourseSelection()) {
        return;
    }
    
    // Display chapter info
    displayChapterInfo();
    
    // Check if chapter has existing quiz data
    if (selectedChapter.quiz) {
        console.log('Loading existing quiz:', selectedChapter.quiz);
        loadQuizFromData(selectedChapter.quiz);
    } else {
        addQuestion();
    }
    
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
    document.getElementById('quizForm').addEventListener('submit', handleSubmit);
});

function addQuestion() {
    const allQuestions = document.querySelectorAll('.question-block');
    
    if (allQuestions.length >= 10) {
        alert('Maximum 10 questions per quiz');
        return;
    }
    
    questionCount++;
    const questionsContainer = document.getElementById('questionsContainer');
    
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    questionBlock.setAttribute('data-question-id', questionCount);
    
    questionBlock.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <label>Question ${questionCount}:</label>
            ${questionCount > 1 ? '<button type="button" class="remove-question-btn" onclick="removeQuestion(this)">✕ Remove</button>' : ''}
        </div>
        <input type="text" class="question-input" placeholder="Enter your question" data-question-index="${questionCount}" required />
        <div style="font-size: 0.85em; color: #aaa; margin: 5px 0; font-style: italic;">Select one or more correct answers:</div>
        <div class="options" data-question-index="${questionCount}">
            <label class="option-label">
                <input type="checkbox" class="correct-checkbox" data-option-index="0" /> 
                <input type="text" class="option-text" placeholder="Option 1" required />
            </label>
            <label class="option-label">
                <input type="checkbox" class="correct-checkbox" data-option-index="1" /> 
                <input type="text" class="option-text" placeholder="Option 2" required />
            </label>
        </div>
        <button type="button" class="add-option" onclick="addOption(this)">+ Add an option</button>
    `;
    
    questionsContainer.appendChild(questionBlock);
    updateProgress();
}

function removeQuestion(button) {
    const questionBlock = button.closest('.question-block');
    questionBlock.remove();
    
    // Re-number questions
    const allQuestions = document.querySelectorAll('.question-block');
    allQuestions.forEach((block, index) => {
        const label = block.querySelector('label');
        label.textContent = `Question ${index + 1}:`;
        
        const questionInput = block.querySelector('.question-input');
        questionInput.setAttribute('data-question-index', index + 1);
        
        const optionsDiv = block.querySelector('.options');
        optionsDiv.setAttribute('data-question-index', index + 1);
        
        // Update checkbox indices
        const checkboxes = block.querySelectorAll('.correct-checkbox');
        checkboxes.forEach((checkbox, checkboxIndex) => {
            checkbox.setAttribute('data-option-index', checkboxIndex);
        });
    });
    
    questionCount = allQuestions.length;
    updateProgress();
}

function addOption(button) {
    const questionBlock = button.closest('.question-block');
    const optionsDiv = questionBlock.querySelector('.options');
    const currentOptions = optionsDiv.querySelectorAll('.option-label');
    const optionIndex = currentOptions.length;
    
    if (optionIndex >= 5) {
        alert('Maximum 5 options per question');
        return;
    }
    
    const questionIndex = optionsDiv.getAttribute('data-question-index');
    
    const optionLabel = document.createElement('label');
    optionLabel.className = 'option-label';
    optionLabel.innerHTML = `
        <input type="checkbox" class="correct-checkbox" data-option-index="${optionIndex}" /> 
        <input type="text" class="option-text" placeholder="Option ${optionIndex + 1}" required />
        <button type="button" class="remove-option-btn" onclick="removeOption(this)">✕</button>
    `;
    
    optionsDiv.appendChild(optionLabel);
}

function removeOption(button) {
    const optionLabel = button.closest('.option-label');
    const optionsDiv = optionLabel.closest('.options');
    const currentOptions = optionsDiv.querySelectorAll('.option-label');
    
    if (currentOptions.length <= 2) {
        alert('Must have at least 2 options per question');
        return;
    }
    
    optionLabel.remove();
    
    // Re-index remaining options
    const updatedOptions = optionsDiv.querySelectorAll('.option-label');
    const questionIndex = optionsDiv.getAttribute('data-question-index');
    
    updatedOptions.forEach((label, index) => {
        const checkbox = label.querySelector('.correct-checkbox');
        const textInput = label.querySelector('.option-text');
        
        checkbox.setAttribute('data-option-index', index);
        textInput.placeholder = `Option ${index + 1}`;
    });
}

function updateProgress() {
    const totalQuestions = document.querySelectorAll('.question-block').length;
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    
    progressText.textContent = `${totalQuestions} Question${totalQuestions !== 1 ? 's' : ''}`;
    
    // Scale progress (max at 10 questions for visual purposes)
    const progress = Math.min(100, (totalQuestions / 10) * 100);
    progressFill.style.width = `${Math.max(10, progress)}%`;
    progressFill.textContent = totalQuestions;
}

async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear any previous error highlights
    clearErrorHighlights();
    
    // STEP 0: Validate Chapter Selection (FIRST)
    if (!selectedChapter) {
        showNotification('No chapter selected. Please try again from course management.', 'error');
        return;
    }

    
    // STEP 1: Validate Quiz Title (SECOND)
    const quizTitleInput = document.getElementById('quizTitle');
    const quizTitle = quizTitleInput ? quizTitleInput.value.trim() : '';
    
    if (!quizTitle) {
        showError('Please enter a quiz title', quizTitleInput);
        alert('⚠️ Quiz Title Required\n\nPlease enter a title for your quiz before submitting.');
        if (quizTitleInput) {
            quizTitleInput.focus();
            quizTitleInput.style.border = '2px solid #ff4444';
        }
        return;
    }
    
    if (quizTitle.length < 3) {
        showError('Quiz title must be at least 3 characters long', quizTitleInput);
        alert('⚠️ Quiz Title Too Short\n\nPlease enter a title with at least 3 characters.');
        if (quizTitleInput) {
            quizTitleInput.focus();
            quizTitleInput.style.border = '2px solid #ff4444';
        }
        return;
    }
    
    if (quizTitle.length > 100) {
        showError('Quiz title must be less than 100 characters', quizTitleInput);
        alert('⚠️ Quiz Title Too Long\n\nPlease enter a title with less than 100 characters.');
        if (quizTitleInput) {
            quizTitleInput.focus();
            quizTitleInput.style.border = '2px solid #ff4444';
        }
        return;
    }
    
    // STEP 2: Check if at least one question exists
    const questionBlocks = document.querySelectorAll('.question-block');
    if (questionBlocks.length === 0) {
        alert('⚠️ No Questions\n\nPlease add at least one question to your quiz.');
        return;
    }
    
    // STEP 3: Check disclaimer
    const disclaimerCheck = document.getElementById('disclaimerCheck');
    if (!disclaimerCheck || !disclaimerCheck.checked) {
        showError('Please confirm that you have read the disclaimer', disclaimerCheck);
        alert('⚠️ Disclaimer Required\n\nPlease confirm that you have read and understood the disclaimer.');
        if (disclaimerCheck) {
            disclaimerCheck.focus();
            const disclaimerLabel = disclaimerCheck.closest('label');
            if (disclaimerLabel) {
                disclaimerLabel.style.color = '#ff4444';
                disclaimerLabel.style.fontWeight = 'bold';
            }
        }
        return;
    }
    
    // STEP 4: Validate all questions and options
    const quizQuestions = [];
    let validationErrors = [];
    
    for (let i = 0; i < questionBlocks.length; i++) {
        const block = questionBlocks[i];
        const questionNumber = i + 1;
        const questionInput = block.querySelector('.question-input');
        const questionText = questionInput ? questionInput.value.trim() : '';
        
        // Validate question text
        if (!questionText) {
            showError(`Question ${questionNumber} is empty`, questionInput);
            validationErrors.push(`Question ${questionNumber} is empty`);
            if (questionInput) {
                questionInput.style.border = '2px solid #ff4444';
            }
            continue;
        }
        
        if (questionText.length < 5) {
            showError(`Question ${questionNumber} is too short (minimum 5 characters)`, questionInput);
            validationErrors.push(`Question ${questionNumber} is too short`);
            if (questionInput) {
                questionInput.style.border = '2px solid #ff4444';
            }
            continue;
        }
        
        const optionsDiv = block.querySelector('.options');
        const optionLabels = optionsDiv ? optionsDiv.querySelectorAll('.option-label') : [];
        const options = [];
        const correctAnswers = [];
        let hasEmptyOption = false;
        let hasDuplicateOption = false;
        const optionTexts = [];
        
        // Validate options
        for (let j = 0; j < optionLabels.length; j++) {
            const optionTextInput = optionLabels[j].querySelector('.option-text');
            const optionText = optionTextInput ? optionTextInput.value.trim() : '';
            
            if (!optionText) {
                showError(`Question ${questionNumber}, Option ${j + 1} is empty`, optionTextInput);
                validationErrors.push(`Question ${questionNumber}, Option ${j + 1} is empty`);
                hasEmptyOption = true;
                if (optionTextInput) {
                    optionTextInput.style.border = '2px solid #ff4444';
                }
                continue;
            }
            
            // Check for duplicate options
            const lowerCaseOption = optionText.toLowerCase();
            if (optionTexts.includes(lowerCaseOption)) {
                showError(`Question ${questionNumber} has duplicate options`, optionTextInput);
                validationErrors.push(`Question ${questionNumber} has duplicate options`);
                hasDuplicateOption = true;
                if (optionTextInput) {
                    optionTextInput.style.border = '2px solid #ff9944';
                }
            }
            optionTexts.push(lowerCaseOption);
            
            const optionData = {
                optionText: optionText,
                isCorrect: false
            };
            
            const checkbox = optionLabels[j].querySelector('.correct-checkbox');
            if (checkbox && checkbox.checked) {
                optionData.isCorrect = true;
                correctAnswers.push(j);
            }
            
            options.push(optionData);
        }
        
        if (hasEmptyOption) {
            continue;
        }
        
        // Check if at least one correct answer is selected
        if (correctAnswers.length === 0) {
            showError(`Question ${questionNumber} has no correct answer selected`, block);
            validationErrors.push(`Question ${questionNumber} needs at least one correct answer`);
            block.style.border = '2px solid #ff4444';
            block.style.padding = '15px';
            continue;
        }
        
        quizQuestions.push({
            questionText: questionText,
            options: options
        });
    }
    
    // If there are validation errors, show them all
    if (validationErrors.length > 0) {
        const errorMessage = '⚠️ Validation Errors:\n\n' + validationErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
        alert(errorMessage);
        
        // Scroll to first error
        const firstErrorElement = document.querySelector('[style*="border: 2px solid"]');
        if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorElement.focus();
        }
        return;
    }
    
    // Final check: make sure we have valid questions
    if (quizQuestions.length === 0) {
        alert('⚠️ No Valid Questions\n\nPlease ensure all questions are properly filled out with at least one correct answer.');
        return;
    }
    
    // Generate unique quiz ID
    const quizId = 'quiz_' + Date.now();
    
    // Prepare quiz data for backend
    const quizData = {
        quiz_title: quizTitle,
        questions: quizQuestions
    };
    
    try {
        // Get auth token
        const token = getAuthToken();
        if (!token) {
            showNotification('Please login as a teacher to create quizzes', 'error');
            setTimeout(() => {
                window.location.href = '../login_page/login.html';
            }, 2000);
            return;
        }

        // Since we're creating a quiz during course creation (chapter doesn't have ID yet),
        // we'll store the quiz data in the courseStructure and it will be sent when the course is created
        console.log('📝 Storing quiz data for chapter:', selectedChapter.name);
        console.log('Quiz data:', quizData);
        
        // Get the chapter index
        const chapterIndex = parseInt(localStorage.getItem('currentChapterForQuiz'));
        
        // Update the course structure with quiz data
        const courseStructure = JSON.parse(localStorage.getItem('courseStructure'));
        if (courseStructure && courseStructure.chapters && courseStructure.chapters[chapterIndex]) {
            courseStructure.chapters[chapterIndex].quiz = quizData;
            localStorage.setItem('courseStructure', JSON.stringify(courseStructure));
        }
        
        // Show success notification
        showNotification('Quiz saved! Redirecting back to course management...', 'success');
        
        // Clear the chapter selection data
        localStorage.removeItem('currentChapterForQuiz');
        
        // Redirect back to course management after a short delay
        setTimeout(() => {
            window.location.href = '../Coursemanagement/coursemanagement.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error saving quiz:', error);
        showNotification(error.message || 'Failed to save quiz', 'error');
    }
}

function showSuccessScreen(quizData, quizId) {
    document.getElementById('quizCreationPage').style.display = 'none';
    document.getElementById('successPage').style.display = 'block';
    
    const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const quizLink = `${window.location.origin}${currentPath}/sQuiz.html?quizId=${quizId}`;
    
    document.getElementById('displayQuizTitle').textContent = quizData.title;
    document.getElementById('displayTotalQuestions').textContent = quizData.questions.length;
    document.getElementById('displayQuizId').textContent = quizId;
    document.getElementById('displayQuizLink').textContent = quizLink;
    
    // Store the link for copying
    window.currentQuizLink = quizLink;
}

function copyQuizLink() {
    const link = window.currentQuizLink;
    
    if (!link) {
        alert('No quiz link available');
        return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
        alert('Quiz link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        alert('Quiz link copied to clipboard!');
    });
}

function createNewQuiz() {
    // Reset form
    document.getElementById('quizTitle').value = '';
    document.getElementById('disclaimerCheck').checked = false;
    document.getElementById('questionsContainer').innerHTML = '';
    
    questionCount = 0;
    questions = [];
    
    // Clear any error highlights
    clearErrorHighlights();
    
    // Add first question
    addQuestion();
    
    // Show creation page
    document.getElementById('successPage').style.display = 'none';
    document.getElementById('quizCreationPage').style.display = 'block';
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Helper function to show error
function showError(message, element) {
    console.error('Validation Error:', message);
    if (element) {
        element.setAttribute('data-error', message);
    }
}

// Helper function to clear error highlights
function clearErrorHighlights() {
    // Clear all error borders
    const errorElements = document.querySelectorAll('[style*="border: 2px solid"]');
    errorElements.forEach(el => {
        el.style.border = '';
        el.style.padding = '';
    });
    
    // Clear error attributes
    const elementsWithErrors = document.querySelectorAll('[data-error]');
    elementsWithErrors.forEach(el => {
        el.removeAttribute('data-error');
    });
    
    // Reset disclaimer label color
    const disclaimerCheck = document.getElementById('disclaimerCheck');
    if (disclaimerCheck) {
        const disclaimerLabel = disclaimerCheck.closest('label');
        if (disclaimerLabel) {
            disclaimerLabel.style.color = '';
            disclaimerLabel.style.fontWeight = '';
        }
    }
}

// Add real-time validation for quiz title
document.addEventListener('DOMContentLoaded', function() {
    const quizTitleInput = document.getElementById('quizTitle');
    if (quizTitleInput) {
        quizTitleInput.addEventListener('input', function() {
            // Clear error highlight when user starts typing
            if (this.style.border) {
                this.style.border = '';
            }
            
            // Show character count
            const charCount = this.value.length;
            let borderColor = '';
            
            if (charCount > 0 && charCount < 3) {
                borderColor = '1px solid #ff9944'; // Orange for too short
            } else if (charCount >= 3 && charCount <= 100) {
                borderColor = '1px solid #44ff88'; // Green for valid
            } else if (charCount > 100) {
                borderColor = '1px solid #ff4444'; // Red for too long
            }
            
            if (borderColor) {
                this.style.border = borderColor;
            }
        });
        
        quizTitleInput.addEventListener('blur', function() {
            // Reset border on blur if no error
            if (!this.hasAttribute('data-error')) {
                this.style.border = '';
            }
        });
    }
});



//////SideBar
      

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

function loadQuizFromData(quizData) {
    console.log('loadQuizFromData called with:', quizData);

    // Set title
    const quizTitleInput = document.getElementById('quizTitle');
    if (quizTitleInput) {
        quizTitleInput.value = quizData.quiz_title || '';
        // Trigger input event to update validation state
        quizTitleInput.dispatchEvent(new Event('input'));
    }

    // Clear existing questions container (just in case)
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = '';
    questionCount = 0;

    // Load questions
    if (quizData.questions && Array.isArray(quizData.questions)) {
        quizData.questions.forEach(q => {
            // Add new question block
            addQuestion();
            
            // Get the last added question block (current one)
            const currentBlock = questionsContainer.lastElementChild;
            
            // Set question text
            const qInput = currentBlock.querySelector('.question-input');
            const qText = q.questionText || q.question || ''; // Fallback for legacy data
            if (qInput) qInput.value = qText;

            // Handle options
            const optionsDiv = currentBlock.querySelector('.options');
            if (optionsDiv && q.options) {
                // Clear default options created by addQuestion()
                optionsDiv.innerHTML = '';
                
                // Add saved options
                q.options.forEach((opt, optIndex) => {
                    const optionLabel = document.createElement('label');
                    optionLabel.className = 'option-label';
                    
                    const isCorrect = opt.isCorrect || false;
                    const optText = opt.optionText || opt.text || ''; // Fallback for legacy data
                    
                    let removeBtnHtml = '';
                    if (optIndex >= 2) {
                        removeBtnHtml = `<button type="button" class="remove-option-btn" onclick="removeOption(this)">✕</button>`;
                    }

                    // Create elements safely
                    optionLabel.innerHTML = `
                        <input type="checkbox" class="correct-checkbox" data-option-index="${optIndex}" /> 
                        <input type="text" class="option-text" placeholder="Option ${optIndex + 1}" required />
                        ${removeBtnHtml}
                    `;
                    
                    // Set state explicitly
                    const checkbox = optionLabel.querySelector('.correct-checkbox');
                    if (checkbox) checkbox.checked = isCorrect;
                    
                    const textInput = optionLabel.querySelector('.option-text');
                    if (textInput) textInput.value = optText;

                    optionsDiv.appendChild(optionLabel);
                });
            }
        });
        
        // Update progress one last time
        updateProgress();
    }
}