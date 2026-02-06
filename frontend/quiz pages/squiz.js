const API_BASE_URL = API_CONFIG.BASE_URL;

let quizData = [];
let currentQuestion = 0;
let selectedAnswer = null;
let score = 0;
let userAnswers = [];
let quizId = null;
let chapterId = null;
let courseId = null;

// Get auth token
function getAuthToken() {
    return localStorage.getItem(API_CONFIG.KEYS.TOKEN);
}

// Fetch quiz data from backend
async function fetchQuizData() {
    const urlParams = new URLSearchParams(window.location.search);
    quizId = urlParams.get('quizId');
    chapterId = urlParams.get('chapterId');
    courseId = urlParams.get('courseId');

    // Fallback to localStorage if IDs are missing from URL
    if (!courseId || !chapterId) {
        try {
            const storedQuizData = JSON.parse(localStorage.getItem('quizData') || '{}');
            courseId = courseId || storedQuizData.courseId;
            chapterId = chapterId || storedQuizData.chapterId;
        } catch (e) {
            console.error('Error reading quizData from localStorage:', e);
        }
    }

    if (!quizId) {
        alert('No quiz ID found in URL');
        window.location.href = '../CourseAfterApply/courseafterapply.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/quiz/${quizId.replace('quiz_', '')}`); // Adjust ID if needed
        const result = await response.json();

        if (result.success) {
            quizData = result.data.questions;
            document.title = result.data.title;
            
            // Record attempt start
            recordAttemptStart();
            
            loadQuestion();
        } else {
            throw new Error(result.error || 'Failed to fetch quiz data');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading quiz: ' + error.message);
    }
}

async function recordAttemptStart() {
    const token = getAuthToken();
    if (!token || !chapterId || !courseId) return;

    try {
        await fetch(`${API_BASE_URL}/quiz-access/start-attempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quizId: quizId.replace('quiz_', ''),
                chapterId: chapterId,
                courseId: courseId
            })
        });
    } catch (error) {
        console.error('Error recording attempt:', error);
    }
}

function loadQuestion() {
    const question = quizData[currentQuestion];
    
    document.getElementById('questionNumber').textContent = `Question ${currentQuestion + 1} of ${quizData.length}`;
    document.getElementById('questionTitle').textContent = `Question ${currentQuestion + 1}:`;
    document.getElementById('questionText').textContent = question.question;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}" onchange="selectAnswer(${index})" />
            ${option}
        `;
        optionsContainer.appendChild(label);
    });
    
    // Restore previous answer if exists
    if (userAnswers[currentQuestion] !== undefined) {
        selectAnswer(userAnswers[currentQuestion]);
        const radio = document.querySelector(`input[value="${userAnswers[currentQuestion]}"]`);
        if (radio) radio.checked = true;
    }
    
    updateProgress();
    updateButtons();
}

function selectAnswer(index) {
    selectedAnswer = index;
    
    const labels = document.querySelectorAll('.options label');
    labels.forEach((label, i) => {
        label.classList.remove('selected');
        if (i === index) {
            label.classList.add('selected');
        }
    });
    
    document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
    if (selectedAnswer === null) return;
    
    userAnswers[currentQuestion] = selectedAnswer;
    
    if (selectedAnswer === quizData[currentQuestion].correct) {
        score++;
    }
    
    if (currentQuestion < quizData.length - 1) {
        currentQuestion++;
        selectedAnswer = null;
        loadQuestion();
    } else {
        showResults();
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        selectedAnswer = null;
        loadQuestion();
    }
}

function updateProgress() {
    const progress = (currentQuestion / quizData.length) * 100;
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = progress + '%';
    progressFill.textContent = Math.round(progress) + '%';
    
    document.getElementById('progressText').textContent = `Question ${currentQuestion + 1} of ${quizData.length}`;
}

function updateButtons() {
    document.getElementById('prevBtn').disabled = currentQuestion === 0;
    document.getElementById('nextBtn').disabled = selectedAnswer === null;
    
    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestion === quizData.length - 1) {
        nextBtn.textContent = 'Submit';
    } else {
        nextBtn.textContent = 'Next →';
    }
}

async function showResults() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('active');
    
    const percentage = Math.round((score / quizData.length) * 100);
    
    // Animate the circular progress tracker
    animateCircularProgress(percentage);
    
    document.getElementById('totalQuestions').textContent = quizData.length;
    document.getElementById('correctAnswers').textContent = score;
    document.getElementById('incorrectAnswers').textContent = quizData.length - score;
    document.getElementById('finalScore').textContent = percentage + '%';
    
    // Submit result to backend
    await submitResults(percentage);
    
    let message = '';
    if (percentage === 100) {
        message = 'Perfect Score! Outstanding! ';
    } else if (percentage >= 80) {
        message = 'Excellent Work! Well Done! ';
    } else if (percentage >= 60) {
        message = 'Good Job! Keep Practicing! ';
    } else {
        message = 'Keep Learning! You Can Do Better! ';
    }
    
    document.getElementById('resultsMessage').textContent = message;
    
    // Update buttons based on score
    const buttonsContainer = document.querySelector('.results-container .submit-btn').parentElement;
    if (percentage === 100) {
        buttonsContainer.innerHTML = '<button class="submit-btn" onclick="goToNextPage()">Next →</button>';
    } else {
        buttonsContainer.innerHTML = `
            <button class="submit-btn secondary" onclick="restartQuiz()">Restart Quiz</button>
            <button class="submit-btn" onclick="goToNextPage()">Next →</button>
        `;
    }
}

async function submitResults(percentage) {
    const token = getAuthToken();
    if (!token) return;

    try {
        await fetch(`${API_BASE_URL}/quiz/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quizId: quizId.replace('quiz_', ''),
                score: percentage,
                chapterId: chapterId,
                courseId: courseId,
                answers: userAnswers
            })
        });
    } catch (error) {
        console.error('Error submitting results:', error);
    }
}

function goToNextPage() {
    // Pass the courseId and chapterId back to preserve context
    let url = '../CourseAfterApply/courseafterapply.html';
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (chapterId) params.append('chapterId', chapterId);
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    window.location.href = url;
}

function animateCircularProgress(targetPercentage) {
    const circle = document.getElementById('scoreCircle');
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    
    //  look for an svg to replace the circle ============================IMPORTANT==========================
    circle.innerHTML = `
        <svg width="150" height="150" style="transform: rotate(-90deg)">
            <circle
                cx="75"
                cy="75"
                r="${radius}"
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                stroke-width="10"
            />
            <circle
                id="progressCircle"
                cx="75"
                cy="75"
                r="${radius}"
                fill="none"
                stroke="#ffffff"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${circumference}"
                style="transition: stroke-dashoffset 2s ease-out"
            />
        </svg>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: clamp(2rem, 6vw, 2.5rem); font-weight: 700; color: white;">
            <span id="percentageText">0</span>%
        </div>
    `;
    
    // Animate the circular progress
    setTimeout(() => {
        const progressCircle = document.getElementById('progressCircle');
        const offset = circumference - (targetPercentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }, 100);
    
    // Animate the percentage counter
    let currentPercentage = 0;
    const duration = 2000; // 2 seconds
    const increment = targetPercentage / (duration / 16); // 60fps
    
    const counter = setInterval(() => {
        currentPercentage += increment;
        if (currentPercentage >= targetPercentage) {
            currentPercentage = targetPercentage;
            clearInterval(counter);
        }
        document.getElementById('percentageText').textContent = Math.round(currentPercentage);
    }, 16);
}

function restartQuiz() {
    currentQuestion = 0;
    selectedAnswer = null;
    score = 0;
    userAnswers = [];
    
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('resultsSection').classList.remove('active');
    
    loadQuestion();
}

// Initialize quiz on page load
fetchQuizData();




   //////////the SideBar JS

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