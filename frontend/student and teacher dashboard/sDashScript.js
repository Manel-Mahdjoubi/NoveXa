// Removed import from config.js
// using global API_CONFIG from api-config.js

const TOKEN_KEY = API_CONFIG.KEYS.TOKEN;
const API_ENDPOINTS = {
  STUDENT_DASHBOARD: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STUDENT_DASHBOARD}`
};

// -------- STATE --------
let studentCourses = [];
let certificates = [];
let grades = [];
let studentTasks = [];

// ==============================
// INITIALIZATION
// ==============================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Student Dashboard Loading... 🚀");

  // Check authentication
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = "../login_page/login.html";
    return;
  }

  // Role-based auto-redirect
  const role = getUserRole();
  if (role === 'teacher') {
    console.log("Teacher detected on student dashboard. Redirecting... 🔄");
    window.location.href = "tDashboard.html";
    return;
  }

  toggleLoading(true);
  await fetchDashboardData();
  setupTaskListeners();
  setupSearchListener();
});

function setupSearchListener() {
  const searchInput = document.querySelector('.search-box__input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredCourses = studentCourses.filter(course => 
        course.name.toLowerCase().includes(searchTerm)
      );
      renderCourses(filteredCourses);
    });
  }
}

function toggleLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    if (show) overlay.classList.add('active');
    else overlay.classList.remove('active');
  }
}

async function fetchDashboardData() {
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (!token) {
      console.error("No token found");
      window.location.href = "../login_page/login.html";
      return;
  }

  const url = API_ENDPOINTS.STUDENT_DASHBOARD;
  console.log("Fetching dashboard from:", url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY); 
      window.location.href = "../login_page/login.html";
      return;
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data) {
      // Map data from API to our state
      if (data.student) loadStudentInfo(data.student);

      if (data.courses && Array.isArray(data.courses)) {
          studentCourses = data.courses.map(c => ({
            id: c.courseId,
            name: c.title,
            progress: c.progress || 0,
            color: getProgressColor(c.progress || 0),
            nextUrl: `../CourseAfterApply/courseafterapply.html?courseId=${c.courseId}`
          }));
      } else {
          studentCourses = [];
      }

      if (data.certificates && Array.isArray(data.certificates)) {
          certificates = data.certificates
            .filter(cert => cert.available)
            .map(cert => ({
                 name: cert.courseName,
                 id: cert.certificateId
            }));
      } else {
          certificates = [];
      }

      if (data.grades && Array.isArray(data.grades)) {
          grades = data.grades.map(g => ({
            course: g.courseName,
            grade: g.grade || 'N/A',
            total: g.total
          }));
      } else {
          grades = [];
      }

      // Render UI
      renderCourses();
      renderCertificates();
      renderGrades();
      loadTasks(); // From localStorage for now as student tasks are local
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    
    // Show user friendly error
    const overlay = document.querySelector('.dashboard__container');
    if (overlay) {
        const errorBanner = document.createElement('div');
        errorBanner.style.background = '#ffebee';
        errorBanner.style.color = '#c62828';
        errorBanner.style.padding = '15px';
        errorBanner.style.borderRadius = '8px';
        errorBanner.style.marginBottom = '20px';
        errorBanner.style.textAlign = 'center';
        errorBanner.innerHTML = `
            <strong>Unable to load dashboard</strong><br>
            ${error.message || 'Please check your connection and try again.'}
            <br><button onclick="location.reload()" style="margin-top:10px; padding:5px 15px; cursor:pointer;">Retry</button>
        `;
        overlay.prepend(errorBanner);
    }
  } finally {
    toggleLoading(false);
  }
}

function getProgressColor(progress) {
  if (progress === 100) return 'green';
  if (progress < 50) return 'yellow';
  
  // For 50-99%, pick a random color excluding green/yellow
  const randomColors = ['purple', 'blue', 'pink', 'orange', 'cyan'];
  return randomColors[Math.floor(Math.random() * randomColors.length)];
}

// ==============================
// USER INFO
// ==============================

function loadStudentInfo(student) {
  const nameEl = document.querySelector(".user-name");
  const roleEl = document.querySelector(".user-role");

  if (nameEl && student) nameEl.textContent = student.name;
  if (roleEl) roleEl.textContent = "Student";
}


// ==============================
// COURSES
// ==============================
function renderCourses(coursesToRender = studentCourses) {
  const table = document.querySelector(".courses-table");
  if (!table) return;

  // Remove old rows (keep header)
  table.querySelectorAll(".courses-table__row").forEach(row => row.remove());

  coursesToRender.forEach(course => {
    const row = document.createElement("div");
    row.className = "courses-table__row";

    row.innerHTML = `
      <div class="courses-table__cell courses-table__cell--name">
        <span class="course-name">${course.name}</span>
      </div>

      <div class="courses-table__cell courses-table__cell--progress">
        <div class="progress-bar">
          <div class="progress-bar__fill progress-bar__fill--${course.color}" style="width:${course.progress}%"></div>
        </div>
        <span class="progress-text">${course.progress}%</span>
      </div>

      <div class="courses-table__cell courses-table__cell--actions">
        <button class="btn btn--primary">Details</button>
        <button class="btn btn--secondary">Continue</button>
      </div>
    `;

    // Continue button
    row.querySelector(".btn--secondary").addEventListener("click", () => {
      window.location.href = course.nextUrl;
    });

    // Details button (placeholder)
    row.querySelector(".btn--primary").addEventListener("click", () => {
      alert(`Course: ${course.name}\nProgress: ${course.progress}%`);
    });

    table.appendChild(row);
  });
}


// ==============================
// CERTIFICATES
// ==============================

function renderCertificates() {
  const container = document.querySelector(".certificate-list");
  if (!container) return;

  container.innerHTML = "";

  certificates.forEach(cert => {
    const item = document.createElement("div");
    item.className = "certificate-item";

    item.innerHTML = `
      <span class="certificate-item__name">${cert.name}</span>
      <div class="certificate-item__actions">
        <button class="btn btn--small btn--info btn--download">Download</button>
      </div>
    `;

    // Programmatic event listener to avoid scope issues with module script
    const downloadBtn = item.querySelector(".btn--download");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", (e) => downloadCertificate(cert.id, e));
    }

    container.appendChild(item);
  });
}

async function downloadCertificate(certId, event) {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
        const btn = event.currentTarget || event.target;
        const originalText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;

        const response = await fetch(`${API_CONFIG.BASE_URL}/certificates/download/${certId}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            // Try to get filename from header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Certificate-${certId}.png`;
            if (contentDisposition) {
                const matches = /filename="([^"]*)"/.exec(contentDisposition);
                if (matches && matches[1]) filename = matches[1];
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename; 
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert("Failed to download certificate");
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
    } catch(e) {
        console.error(e);
        alert("Error downloading certificate");
    }
}


// ==============================
// GRADES
// ==============================

function renderGrades() {
  const table = document.querySelector(".grades-table");
  if (!table) return;

  table.querySelectorAll(".grades-table__row").forEach(r => r.remove());

  grades.forEach(g => {
    const row = document.createElement("div");
    row.className = "grades-table__row";

    row.innerHTML = `
      <div class="grades-table__cell">${g.course}</div>
      <div class="grades-table__cell">${g.grade}</div>
      <div class="grades-table__cell">${g.total}</div>
      <div class="grades-table__cell grades-table__cell--action">
        <button class="btn btn--link">view details</button>
      </div>
    `;

    table.appendChild(row);
  });
}


// ==============================
// TASKS (LOCAL)
// ==============================

function loadTasks() {
  const saved = localStorage.getItem("studentTasks");
  if (saved) studentTasks = JSON.parse(saved);

  const items = document.querySelectorAll(".task-item");

  // Initial Clear
  items.forEach(item => {
    const input = item.querySelector(".task-item__input");
    const checkbox = item.querySelector(".task-item__checkbox");
    const deleteBtn = item.querySelector(".btn--task-delete");

    if (input) input.value = "";
    if (checkbox) checkbox.checked = false;
    if (deleteBtn) deleteBtn.style.display = "none";
    if (input) toggleTaskStyle(input, false);
  });

  studentTasks.forEach((task, index) => {
    if (index < items.length) {
      const checkbox = items[index].querySelector(".task-item__checkbox");
      const input = items[index].querySelector(".task-item__input");
      const deleteBtn = items[index].querySelector(".btn--task-delete");

      if (input && task) {
        input.value = task.text;
        checkbox.checked = task.done;
        if (deleteBtn) deleteBtn.style.display = "flex";
        toggleTaskStyle(input, task.done);
      }
    }
  });
}

function setupTaskListeners() {
  const items = document.querySelectorAll(".task-item");

  items.forEach((item, index) => {
    const checkbox = item.querySelector(".task-item__checkbox");
    const input = item.querySelector(".task-item__input");
    const deleteBtn = item.querySelector(".btn--task-delete");

    if (!checkbox || !input) return;

    checkbox.addEventListener("change", () => {
      toggleTaskStyle(input, checkbox.checked);
      saveTask(index, input.value, checkbox.checked);
    });

    input.addEventListener("input", () => {
      saveTask(index, input.value, checkbox.checked);
      // Show delete button once text is added
      if (deleteBtn) {
        deleteBtn.style.display = input.value.trim() ? "flex" : "none";
      }
    });

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        handleTaskDeletion(index);
      });
    }
  });
}

function handleTaskDeletion(index) {
  // Remove from the array if it exists
  if (studentTasks[index]) {
    studentTasks.splice(index, 1);
    localStorage.setItem("studentTasks", JSON.stringify(studentTasks));
  }

  // Refresh UI
  loadTasks();
}

function toggleTaskStyle(input, done) {
  input.style.textDecoration = done ? "line-through" : "none";
  input.style.opacity = done ? "0.6" : "1";
}

function saveTask(index, text, done) {
  studentTasks[index] = { text, done };
  localStorage.setItem("studentTasks", JSON.stringify(studentTasks));
}


// ==============================
// DEBUG
// ==============================

console.log("Student Dashboard JS ready ✅");