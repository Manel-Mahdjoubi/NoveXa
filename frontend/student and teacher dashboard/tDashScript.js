// Removed import from config.js
// using global API_CONFIG from api-config.js

const TOKEN_KEY = API_CONFIG.KEYS.TOKEN;
const API_ENDPOINTS = {
  TEACHER_DASHBOARD: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TEACHER_DASHBOARD}`
};

// DATA MANAGEMENT
let coursesData = [];
let performanceData = {
    lectureAttendees: 0,
    completedCourses: 0,
    doingQuizzes: 0,
    doingQuizzes: 0
};
let tasks = [];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Teacher Dashboard Loading... 🚀');

    // Check authentication
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        window.location.href = "../login_page/login.html";
        return;
    }

    // Role-based auto-redirect
    const role = getUserRole();
    if (role === 'student') {
        console.log("Student detected on teacher dashboard. Redirecting... 🔄");
        window.location.href = "sDashboard.html";
        return;
    }

    toggleLoading(true);
    await fetchDashboardData();
    setupEventListeners();
    setupSearchListener();
});

function setupSearchListener() {
    const searchInput = document.querySelector('.search-box__input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredCourses = coursesData.filter(course => 
                course.name.toLowerCase().includes(searchTerm)
            );
            updateCoursesTable(filteredCourses);
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
    try {
        const response = await fetch(API_ENDPOINTS.TEACHER_DASHBOARD, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(API_CONFIG.KEYS.TOKEN)}`
            }
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "../login_page/login.html";
            return;
        }

        if (data) {
            coursesData = data.courses.map(c => ({
                name: c.title,
                studentsEnrolled: c.enrollmentCount || 0,
                averageGrade: c.avgGrade || 'N/A',
                id: c.courseId
            }));

            performanceData = {
                lectureAttendees: data.performance.lectureAttendees || 0,
                completedCourses: data.performance.completedCourses || 0,
                doingQuizzes: data.performance.doingQuizzes || 0
            };

            tasks = data.tasks || [];

            // Update UI
            displayWelcomeMessage(data.teacher.name);
            updateCoursesTable();
            updatePerformanceChart();
            animatePerformanceBars();
            displayTasks();
        }
    } catch (error) {
        console.error("Failed to fetch teacher dashboard data:", error);
        alert("Could not load dashboard data. Please try again later.");
    } finally {
        toggleLoading(false);
    }
}

// Display welcome message
function displayWelcomeMessage(teacherName) {
    const nameEl = document.querySelector(".user-name");
    if (nameEl) nameEl.textContent = teacherName;
}


// COURSES MANAGEMENT


function updateCoursesTable(coursesToRender = coursesData) {
    const tableBody = document.querySelector('.teacher-courses-table');
    if (!tableBody) return;

    // Keep the header, remove existing rows
    const header = tableBody.querySelector('.courses-table__header');
    tableBody.innerHTML = '';
    tableBody.appendChild(header);

    // Add course rows
    coursesToRender.forEach(course => {
        const row = createCourseRow(course);
        tableBody.appendChild(row);
    });
}

function createCourseRow(course) {
    const row = document.createElement('div');
    row.className = 'courses-table__row';
    row.innerHTML = `
        <div class="courses-table__cell">${course.name}</div>
        <div class="courses-table__cell">${course.studentsEnrolled}</div>
        <div class="courses-table__cell">${course.averageGrade}</div>
        <div class="courses-table__cell courses-table__cell--actions">
            <button class="btn btn--info btn--small" data-course-id="${course.id}">View Details</button>
            <button class="btn btn--danger btn--small" data-course-id="${course.id}">Request Deletion</button>
        </div>
    `;

    // Add click event to view details button
    const viewBtn = row.querySelector('.btn--info');
    viewBtn.addEventListener('click', () => showCourseDetails(course));

    // Add click event to delete request button
    const deleteBtn = row.querySelector('.btn--danger');
    deleteBtn.addEventListener('click', () => showDeletionConfirm(course));

    return row;
}

function showCourseDetails(course) {
    console.log('Opening course details for:', course);
    const popup = document.getElementById('courseDetailsPopup');
    if (!popup) {
        console.error('Popup not found!');
        return;
    }
    document.getElementById('popupCourseName').textContent = course.name;
    document.getElementById('popupStudentsEnrolled').textContent = course.studentsEnrolled;
    document.getElementById('popupAverageGrade').textContent = course.averageGrade;

    popup.classList.add('active');
    console.log('Popup should be visible now');
}

function showDeletionConfirm(course) {
    console.log('Opening deletion confirm for:', course);
    const popup = document.getElementById('deletionConfirmPopup');
    if (!popup) {
        console.error('Deletion popup not found!');
        return;
    }
    document.getElementById('deletionCourseName').textContent = course.name;

    // Store course id for confirmation
    popup.dataset.courseId = course.id;
    popup.dataset.courseName = course.name;

    popup.classList.add('active');
    console.log('Deletion popup should be visible now');
}

// Course Management button
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Task checkboxes and inputs
    setupTaskListeners();

    // Popup close buttons
    setupPopupListeners();

    // View Details and Delete buttons
    setupCourseButtons();

    console.log('Event listeners setup complete');
}

function setupCourseButtons() {
    // View Details buttons
    const viewButtons = document.querySelectorAll('.btn--info');
    console.log('Found view buttons:', viewButtons.length);

    viewButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const courseId = this.dataset.courseId;
            console.log('View clicked, courseId:', courseId);

            // Get course data from the actual table row
            const row = this.closest('.courses-table__row');
            if (row) {
                const cells = row.querySelectorAll('.courses-table__cell');
                const course = {
                    name: cells[0].textContent.trim(),
                    studentsEnrolled: cells[1].textContent.trim(),
                    averageGrade: cells[2].textContent.trim(),
                    id: courseId
                };
                showCourseDetails(course);
            } else {
                console.error('Could not find course row');
            }
        });
    });

    // Delete Request buttons
    const deleteButtons = document.querySelectorAll('.btn--danger');
    console.log('Found delete buttons:', deleteButtons.length);

    deleteButtons.forEach(btn => {
        // Skip the confirm deletion button in the popup
        if (btn.id === 'confirmDeletion') return;

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const courseId = this.dataset.courseId;
            console.log('Delete clicked, courseId:', courseId);

            // Get course data from the actual table row
            const row = this.closest('.courses-table__row');
            if (row) {
                const cells = row.querySelectorAll('.courses-table__cell');
                const course = {
                    name: cells[0].textContent.trim(),
                    studentsEnrolled: cells[1].textContent.trim(),
                    averageGrade: cells[2].textContent.trim(),
                    id: courseId
                };
                showDeletionConfirm(course);
            } else {
                console.error('Could not find course row');
            }
        });
    });
}

function setupPopupListeners() {
    console.log('Setting up popup listeners...');

    // Course details popup
    const courseDetailsPopup = document.getElementById('courseDetailsPopup');
    const closePopup = document.getElementById('closePopup');

    console.log('Course details popup:', courseDetailsPopup ? 'found' : 'NOT FOUND');
    console.log('Close button:', closePopup ? 'found' : 'NOT FOUND');

    if (closePopup) {
        closePopup.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('Close button clicked');
            courseDetailsPopup.classList.remove('active');
        });
    }

    // Click outside to close
    if (courseDetailsPopup) {
        courseDetailsPopup.addEventListener('click', function (e) {
            if (e.target === courseDetailsPopup) {
                console.log('Clicked outside popup content');
                courseDetailsPopup.classList.remove('active');
            }
        });
    }

    // Deletion confirmation popup
    const deletionPopup = document.getElementById('deletionConfirmPopup');
    const closeDeletionPopup = document.getElementById('closeDeletionPopup');
    const cancelDeletion = document.getElementById('cancelDeletion');
    const confirmDeletion = document.getElementById('confirmDeletion');

    console.log('Deletion popup:', deletionPopup ? 'found' : 'NOT FOUND');

    if (closeDeletionPopup) {
        closeDeletionPopup.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('Close deletion popup clicked');
            deletionPopup.classList.remove('active');
        });
    }

    if (cancelDeletion) {
        cancelDeletion.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('Cancel deletion clicked');
            deletionPopup.classList.remove('active');
        });
    }

    if (confirmDeletion) {
        confirmDeletion.addEventListener('click', async function (e) {
            e.stopPropagation();
            const reason = document.getElementById('deletionReason').value.trim();
            const errorEl = document.getElementById('deletionError');

            if (reason.length < 10) {
                errorEl.textContent = 'Please provide a reason (at least 10 characters).';
                errorEl.style.display = 'block';
                return;
            }

            errorEl.style.display = 'none';
            confirmDeletion.disabled = true;
            confirmDeletion.textContent = 'Submitting...';

            console.log('Confirm deletion clicked');
            const success = await handleDeletionRequest(deletionPopup.dataset.courseId, deletionPopup.dataset.courseName, reason);

            confirmDeletion.disabled = false;
            confirmDeletion.textContent = 'Confirm Request';

            if (success) {
                deletionPopup.classList.remove('active');
                document.getElementById('deletionReason').value = '';
            }
        });
    }

    // Click outside to close
    if (deletionPopup) {
        deletionPopup.addEventListener('click', function (e) {
            if (e.target === deletionPopup) {
                console.log('Clicked outside deletion popup content');
                deletionPopup.classList.remove('active');
            }
        });
    }

    // Escape key to close any open popup
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            console.log('Escape pressed');
            if (courseDetailsPopup) courseDetailsPopup.classList.remove('active');
            if (deletionPopup) deletionPopup.classList.remove('active');
        }
    });

    console.log('Popup listeners setup complete');
}

async function handleDeletionRequest(courseId, courseName, reason) {
    console.log(`Deletion request submitted for course: ${courseName} (${courseId}) with reason: ${reason}`);
    const token = localStorage.getItem(TOKEN_KEY);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/courses/${courseId}/request-deletion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Deletion request submitted for "${courseName}".\n\nAdministrators will review your request.`);
            return true;
        } else {
            alert(data.message || "Failed to submit deletion request.");
            return false;
        }
    } catch (error) {
        console.error("Failed to submit deletion request:", error);
        alert("An error occurred. Please try again later.");
        return false;
    }
}



// PERFORMANCE CHART


function updatePerformanceChart() {
    const performanceBars = document.querySelectorAll('.performance-bar__fill');
    const legendValues = document.querySelectorAll('.performance-legend__value');

    const data = [
        performanceData.lectureAttendees || 0,
        performanceData.completedCourses || 0,
        performanceData.doingQuizzes || 0,
    ];

    performanceBars.forEach((bar, index) => {
        const percentage = data[index];
        bar.style.width = `${percentage}%`;
        const label = bar.querySelector('.performance-bar__label');
        if (label) {
            label.textContent = `${percentage}%`;
        }
    });

    legendValues.forEach((val, index) => {
        const percentage = data[index];
        val.textContent = `${percentage}%`;
    });
}

function animatePerformanceBars() {
    const bars = document.querySelectorAll('.performance-bar__fill');

    bars.forEach((bar, index) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';

        setTimeout(() => {
            bar.style.transition = 'width 1.5s ease-out';
            bar.style.width = targetWidth;
        }, index * 200);
    });
}


// TASKS MANAGEMENT


// TASKS MANAGEMENT

function setupTaskListeners() {
    const taskItems = document.querySelectorAll('.task-item');

    taskItems.forEach((taskItem, index) => {
        const checkbox = taskItem.querySelector('.task-item__checkbox');
        const input = taskItem.querySelector('.task-item__input');

        if (checkbox) {
            checkbox.addEventListener('change', async function () {
                const task = tasks[index];
                if (task) {
                    await handleTaskCheckbox(this, input, task);
                } else if (input.value.trim()) {
                    // Create new task if it doesn't exist
                    await createNewTask(input.value.trim(), this, input, index);
                }
            });
        }

        if (input) {
            setupTaskInputListeners(input, checkbox, index);
        }

        const deleteBtn = taskItem.querySelector('.btn--task-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function () {
                const task = tasks[index];
                if (task) {
                    await handleTaskDeletion(task.task_id, index, taskItem);
                } else {
                    // Just clear the input if it hasn't been saved yet
                    const input = taskItem.querySelector('.task-item__input');
                    if (input) input.value = '';
                }
            });
        }
    });
}

function setupTaskInputListeners(input, checkbox, index) {
    // Debounce save
    let timeout;
    input.addEventListener('input', function () {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            const task = tasks[index];
            if (task) {
                await updateTaskText(task.task_id, this.value.trim());
            }
        }, 1000);
    });

    input.addEventListener('blur', async function () {
        if (!tasks[index] && this.value.trim()) {
            await createNewTask(this.value.trim(), checkbox, this, index);
        }
    });
}

async function handleTaskDeletion(taskId, index, taskElement) {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/teacher/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.success) {
            // Remove from local array
            tasks.splice(index, 1);
            // Refresh display
            displayTasks();
        }
    } catch (error) {
        console.error("Failed to delete task:", error);
    }
}

async function createNewTask(text, checkbox, input, index) {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/teacher/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (data.success) {
            tasks[index] = data.data;
            checkbox.checked = data.data.completed;
        }
    } catch (error) {
        console.error("Failed to create task:", error);
    }
}

async function updateTaskText(taskId, text) {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
        await fetch(`${API_CONFIG.BASE_URL}/teacher/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
    } catch (error) {
        console.error("Failed to update task text:", error);
    }
}

async function handleTaskCheckbox(checkbox, input, task) {
    const token = localStorage.getItem(TOKEN_KEY);
    const completed = checkbox.checked;

    if (completed) {
        input.style.textDecoration = 'line-through';
        input.style.opacity = '0.6';
        showTaskCompleteAnimation(checkbox.closest('.task-item'));
    } else {
        input.style.textDecoration = 'none';
        input.style.opacity = '1';
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/teacher/tasks/${task.task_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed })
        });
        const data = await response.json();
        if (data.success) {
            task.completed = completed;
        }
    } catch (error) {
        console.error("Failed to update task status:", error);
    }
}

function displayTasks() {
    const taskItems = document.querySelectorAll('.task-item');

    // Clear all inputs first
    taskItems.forEach(item => {
        item.querySelector('.task-item__input').value = '';
        item.querySelector('.task-item__checkbox').checked = false;
        item.querySelector('.task-item__input').style.textDecoration = 'none';
        item.querySelector('.task-item__input').style.opacity = '1';
        const deleteBtn = item.querySelector('.btn--task-delete');
        if (deleteBtn) deleteBtn.style.display = 'none';
    });

    tasks.forEach((task, index) => {
        if (index < taskItems.length) {
            const input = taskItems[index].querySelector('.task-item__input');
            const checkbox = taskItems[index].querySelector('.task-item__checkbox');
            const deleteBtn = taskItems[index].querySelector('.btn--task-delete');

            input.value = task.text;
            checkbox.checked = task.completed;
            if (deleteBtn) deleteBtn.style.display = 'flex';
            if (task.completed) {
                input.style.textDecoration = 'line-through';
                input.style.opacity = '0.6';
            }
        }
    });
}

function showTaskCompleteAnimation(taskElement) {
    taskElement.style.transition = 'transform 0.3s ease';
    taskElement.style.transform = 'scale(1.05)';

    setTimeout(() => {
        taskElement.style.transform = 'scale(1)';
    }, 300);
}


// UTILITY FUNCTIONS


// Format date
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Calculate statistics
function calculateAverageGrade() {
    const total = coursesData.reduce((sum, course) => sum + course.averageGrade, 0);
    return (total / coursesData.length).toFixed(2);
}

function calculateTotalStudents() {
    return coursesData.reduce((sum, course) => sum + course.studentsEnrolled, 0);
}



// EXPORT STATISTICS 


function exportDashboardData() {
    const dashboardData = {
        courses: coursesData,
        performance: performanceData,
        tasks: tasks,
        statistics: {
            averageGrade: calculateAverageGrade(),
            totalStudents: calculateTotalStudents()
        },
        exportDate: new Date().toISOString()
    };

    console.log('Dashboard Data:', dashboardData);
    return dashboardData;
}


// CONSOLE COMMANDS 


console.log('%c Teacher Dashboard Loaded Successfully! ', 'background: #1c587a; color: #fff; padding: 5px 10px; border-radius: 5px;');
console.log('Available commands:');
console.log('- exportDashboardData() : Export all dashboard data');
console.log('- calculateAverageGrade() : Get average grade across all courses');
console.log('- calculateTotalStudents() : Get total number of enrolled students');