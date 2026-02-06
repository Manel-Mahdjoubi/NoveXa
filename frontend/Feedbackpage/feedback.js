// ===============================
// MAIN INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    loadFeedbackContext();
    initFeedbackForm();
    initSmoothScrolling();
    initPageAnimations();
    addValidationStyles();// ===============================
// MAIN INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    loadFeedbackContext();
    initFeedbackForm();
    initSmoothScrolling();
    initPageAnimations();
    addValidationStyles();
});

// ===============================
// LOAD FEEDBACK CONTEXT
// ===============================
function loadFeedbackContext() {
    const feedbackContext = localStorage.getItem('feedbackContext');
    
    if (!feedbackContext) {
        showNotification('No course selected for feedback', 'error');
        setTimeout(() => {
            window.location.href = '../home_page2/home_page2.html';
        }, 2000);
        return;
    }

    try {
        const context = JSON.parse(feedbackContext);
        
        // Display course and teacher info
        document.getElementById('displayCourseName').textContent = context.courseTitle;
        document.getElementById('displayTeacherName').textContent = context.teacherName;
        
        // Set hidden fields
        document.getElementById('courseId').value = context.courseId;
        document.getElementById('teacherId').value = context.teacherId;
        
        console.log('✅ Feedback context loaded:', context);
    } catch (error) {
        console.error('Error loading feedback context:', error);
        showNotification('Error loading course information', 'error');
    }
}

// ===============================
// MOBILE MENU FUNCTIONALITY
// ===============================
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navItems = document.querySelectorAll('.nav-item');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!menuToggle || !navMenu) return;

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle('show');
        menuToggle.classList.toggle('active');

        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        menuToggle.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                closeMenuWithAnimation();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 &&
            navMenu.classList.contains('show') &&
            !navMenu.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeMenuWithAnimation();
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
                closeMenuWithAnimation();
            }
        }
    });

    function closeMenuWithAnimation() {
        navMenu.classList.remove('show');
        menuToggle.classList.remove('active');
        menuToggle.style.transform = 'rotate(0deg) scale(1)';

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
}

// ===============================
// SMOOTH SCROLLING FOR NAV LINKS
// ===============================
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (href.startsWith("#") && href !== "#") {
                e.preventDefault();
                const section = document.querySelector(href);
                if (section) {
                    section.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });
}

// ===============================
// FEEDBACK FORM INITIALIZATION
// ===============================
function initFeedbackForm() {
    const form = document.getElementById("feedbackForm");
    if (!form) return;

    form.setAttribute('novalidate', 'novalidate');
    
    form.querySelectorAll('[required]').forEach(input => {
        input.removeAttribute('required');
    });

    const formState = {
        teacherFeedback: "",
        courseFeedback: "",
        courseRating: 0,
        teacherRating: 0,
    };

    wrapFormInputs(form);
    initFormInputs(form, formState);
    initStarRatings(formState);
    initTextareaResize();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleFormSubmit(form, formState);
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const context = JSON.parse(localStorage.getItem('feedbackContext'));
            if (context && context.returnUrl) {
                window.location.href = context.returnUrl;
            } else {
                window.location.href = '../home_page2/home_page2.html';
            }
        });
    }
}

// ===============================
// WRAP INPUTS IN FORM-GROUP DIVS
// ===============================
function wrapFormInputs(form) {
    const inputs = form.querySelectorAll("input:not([type='submit']):not([type='hidden']):not([type='button']), textarea");
    
    inputs.forEach((input) => {
        if (!input.parentElement.classList.contains('form-group')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-group';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            const errorMsg = document.createElement('small');
            errorMsg.className = 'error-message';
            wrapper.appendChild(errorMsg);
        }
    });
    
    const starContainers = document.querySelectorAll('.stars');
    starContainers.forEach((stars) => {
        if (!stars.parentElement.classList.contains('star-group')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'star-group';
            stars.parentNode.insertBefore(wrapper, stars);
            wrapper.appendChild(stars);
            
            const errorMsg = document.createElement('small');
            errorMsg.className = 'error-message';
            wrapper.appendChild(errorMsg);
        }
    });
}

// ===============================
// FORM INPUTS HANDLING
// ===============================
function initFormInputs(form, formState) {
    const inputs = form.querySelectorAll("input:not([type='hidden']), textarea");

    inputs.forEach((input) => {
        input.addEventListener("input", (e) => {
            formState[e.target.name] = e.target.value;
            
            if (e.target.value.trim()) {
                setSuccessFor(e.target);
            }
        });

        input.addEventListener("focus", (e) => {
            e.target.style.borderColor = "#004aad";
        });

        input.addEventListener("blur", (e) => {
            if (!e.target.value.trim()) {
                e.target.style.borderColor = "#ccc";
            }
        });
    });
}

// ===============================
// STAR RATINGS HANDLING
// ===============================
function initStarRatings(formState) {
    const starContainers = document.querySelectorAll(".stars");

    starContainers.forEach((container) => {
        const type = container.getAttribute("data-type");
        const stars = container.querySelectorAll(".star");

        stars.forEach((star, index) => {
            star.addEventListener("click", () => {
                formState[type] = index + 1;
                updateStars(stars, index);
                
                setSuccessForRating(container);
                
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                container.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    container.style.transform = 'scale(1)';
                }, 200);
            });

            if (window.innerWidth > 600) {
                star.addEventListener("mouseenter", () => {
                    updateStars(stars, index);
                });

                container.addEventListener("mouseleave", () => {
                    updateStars(stars, formState[type] - 1);
                });
            }
        });
    });
}

function updateStars(stars, activeIndex) {
    stars.forEach((s, i) => {
        if (i <= activeIndex) {
            s.classList.add("active");
            s.style.color = "#f5c518";
        } else {
            s.classList.remove("active");
            s.style.color = "#ccc";
        }
    });
}

// ===============================
// ERROR HANDLING FUNCTIONS
// ===============================
function setErrorFor(input, message) {
    const formControl = input.closest('.form-group');
    if (!formControl) return;
    
    const small = formControl.querySelector('small.error-message');
    
    formControl.classList.add('error');
    formControl.classList.remove('success');
    
    if (small) {
        small.textContent = message;
        small.style.display = 'block';
    }
    
    input.style.borderColor = '#f44336';
    input.style.backgroundColor = '#ffebee';
}

function setSuccessFor(input) {
    const formControl = input.closest('.form-group');
    if (!formControl) return;
    
    const small = formControl.querySelector('small.error-message');
    
    formControl.classList.remove('error');
    formControl.classList.add('success');
    
    if (small) {
        small.style.display = 'none';
        small.textContent = '';
    }
    
    input.style.borderColor = '';
    input.style.backgroundColor = '';
}

function setErrorForRating(container, message) {
    const starGroup = container.closest('.star-group') || container.parentElement;
    const small = starGroup.querySelector('small.error-message');
    
    if (small) {
        small.textContent = message;
        small.style.display = 'block';
    }
    
    container.style.border = '2px solid #f44336';
    container.style.padding = '8px';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#ffebee';
}

function setSuccessForRating(container) {
    const starGroup = container.closest('.star-group') || container.parentElement;
    const small = starGroup.querySelector('small.error-message');
    
    if (small) {
        small.style.display = 'none';
        small.textContent = '';
    }
    
    container.style.border = '';
    container.style.padding = '';
    container.style.borderRadius = '';
    container.style.backgroundColor = '';
}

// ===============================
// FORM VALIDATION
// ===============================
function validateForm(form, formState) {
    let isValid = true;
    let firstErrorElement = null;

    // Validate teacher feedback
    const teacherFeedbackInput = form.querySelector('textarea[name="teacherFeedback"]');
    if (!formState.teacherFeedback || formState.teacherFeedback.trim() === "") {
        setErrorFor(teacherFeedbackInput, 'Teacher feedback is required');
        if (!firstErrorElement) firstErrorElement = teacherFeedbackInput;
        isValid = false;
    } else if (formState.teacherFeedback.trim().length < 10) {
        setErrorFor(teacherFeedbackInput, 'Teacher feedback must be at least 10 characters');
        if (!firstErrorElement) firstErrorElement = teacherFeedbackInput;
        isValid = false;
    } else {
        setSuccessFor(teacherFeedbackInput);
    }

    // Validate course feedback
    const courseFeedbackInput = form.querySelector('textarea[name="courseFeedback"]');
    if (!formState.courseFeedback || formState.courseFeedback.trim() === "") {
        setErrorFor(courseFeedbackInput, 'Course feedback is required');
        if (!firstErrorElement) firstErrorElement = courseFeedbackInput;
        isValid = false;
    } else if (formState.courseFeedback.trim().length < 10) {
        setErrorFor(courseFeedbackInput, 'Course feedback must be at least 10 characters');
        if (!firstErrorElement) firstErrorElement = courseFeedbackInput;
        isValid = false;
    } else {
        setSuccessFor(courseFeedbackInput);
    }

    // Validate course rating
    const courseStars = document.querySelector('.stars[data-type="courseRating"]');
    if (formState.courseRating === 0) {
        setErrorForRating(courseStars, 'Please rate the course');
        if (!firstErrorElement) firstErrorElement = courseStars;
        isValid = false;
    } else {
        setSuccessForRating(courseStars);
    }

    // Validate teacher rating
    const teacherStars = document.querySelector('.stars[data-type="teacherRating"]');
    if (formState.teacherRating === 0) {
        setErrorForRating(teacherStars, 'Please rate the teacher');
        if (!firstErrorElement) firstErrorElement = teacherStars;
        isValid = false;
    } else {
        setSuccessForRating(teacherStars);
    }

    // Scroll to first error
    if (!isValid && firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

// ===============================
// FORM SUBMISSION HANDLING
// ===============================
async function handleFormSubmit(form, formState) {
    if (!validateForm(form, formState)) {
        return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;
    }

    try {
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showNotification('Please login to submit feedback', 'error');
            setTimeout(() => {
                window.location.href = '../Login/login.html';
            }, 1500);
            return;
        }

        // Get IDs from hidden fields
        const courseId = parseInt(document.getElementById('courseId').value);
        const teacherId = parseInt(document.getElementById('teacherId').value);

        if (!courseId || !teacherId) {
            showNotification('Missing course or teacher information', 'error');
            if (submitBtn) {
                submitBtn.textContent = "Submit Feedback";
                submitBtn.disabled = false;
            }
            return;
        }

        // Prepare feedback data
        const feedbackData = {
            courseId: courseId,
            teacherId: teacherId,
            teacherComment: formState.teacherFeedback.trim(),
            courseComment: formState.courseFeedback.trim(),
            teacherRating: formState.teacherRating,
            courseRating: formState.courseRating
        };

        console.log('Submitting feedback:', feedbackData);

        // Submit feedback to backend
        const data = await apiCall('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackData)
        });

        if (data.success) {
            // Success
            if (submitBtn) {
                submitBtn.textContent = "Submitted ✓";
                submitBtn.style.background = "#4CAF50";
            }

            showNotification('Feedback submitted successfully!', 'success');

            // Clear feedback context
            localStorage.removeItem('feedbackContext');

            setTimeout(() => {
                window.location.href = "../after_feedback_page/after_feedback.html";
            }, 2000);
        }

    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification(error.message || 'Failed to submit feedback. Please try again.', 'error');
        
        if (submitBtn) {
            submitBtn.textContent = "Submit Feedback";
            submitBtn.disabled = false;
        }
    }
}

// ===============================
// NOTIFICATION FUNCTION
// ===============================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===============================
// TEXTAREA AUTO-RESIZE
// ===============================
function initTextareaResize() {
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
        textarea.addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 150) + "px";
        });
    });
}

// ===============================
// PAGE LOAD ANIMATIONS
// ===============================
function initPageAnimations() {
    window.addEventListener("load", () => {
        const container = document.querySelector(".feedback-container");
        if (container) {
            container.style.opacity = "0";
            container.style.transform = "translateY(30px)";
            
            setTimeout(() => {
                container.style.transition = "all 0.6s ease-out";
                container.style.opacity = "1";
                container.style.transform = "translateY(0)";
            }, 100);
        }
    });
}

// ===============================
// VALIDATION STYLES
// ===============================
function addValidationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        .form-group {
            position: relative;
            margin-bottom: 1rem;
        }
        
        .star-group {
            position: relative;
        }
        
        .form-group.error input,
        .form-group.error textarea {
            border-color: #f44336 !important;
            background-color: #ffebee !important;
        }
        
        .form-group.success input,
        .form-group.success textarea {
            border-color: #4CAF50 !important;
        }
        
        .error-message {
            display: none;
            color: #f44336;
            font-size: 0.85rem;
            margin-top: 0.3rem;
            font-weight: 500;
            animation: slideIn 0.2s ease;
        }
        
        .rating-section .error-message {
            display: none;
            margin-top: 0.5rem;
        }

        .feedback-info {
            background: linear-gradient(135deg, #0e84c8 0%, #3ba5e2 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(14, 132, 200, 0.2);
        }

        .info-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: white;
        }

        .info-item:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: 600;
            margin-right: 10px;
            min-width: 120px;
            font-size: 15px;
        }

        .info-value {
            font-weight: 500;
            font-size: 16px;
        }

        .cancel-btn {
            background-color: #757575;
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
            margin-left: 10px;
            transition: background 0.3s ease;
        }

        .cancel-btn:hover {
            background-color: #616161;
        }
    `;
    document.head.appendChild(style);
}

// Profile button
const profilebtn = document.querySelector('.btn-profile');

if (profilebtn) {
    profilebtn.addEventListener('click', () => {
        window.location.href = '../profile/profile.html';
    });
}
});

// ===============================
// LOAD FEEDBACK CONTEXT
// ===============================
function loadFeedbackContext() {
    const feedbackContext = localStorage.getItem('feedbackContext');
    
    if (!feedbackContext) {
        showNotification('No course selected for feedback', 'error');
        setTimeout(() => {
            window.location.href = '../home_page2/home_page2.html';
        }, 2000);
        return;
    }

    try {
        const context = JSON.parse(feedbackContext);
        
        // Display course and teacher info
        document.getElementById('displayCourseName').textContent = context.courseTitle;
        document.getElementById('displayTeacherName').textContent = context.teacherName;
        
        // Set hidden fields
        document.getElementById('courseId').value = context.courseId;
        document.getElementById('teacherId').value = context.teacherId;
        
        console.log('Feedback context loaded:', context);
    } catch (error) {
        console.error('Error loading feedback context:', error);
        showNotification('Error loading course information', 'error');
    }
}

// ===============================
// MOBILE MENU FUNCTIONALITY
// ===============================
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navItems = document.querySelectorAll('.nav-item');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!menuToggle || !navMenu) return;

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle('show');
        menuToggle.classList.toggle('active');

        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        menuToggle.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                closeMenuWithAnimation();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 &&
            navMenu.classList.contains('show') &&
            !navMenu.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeMenuWithAnimation();
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
                closeMenuWithAnimation();
            }
        }
    });

    function closeMenuWithAnimation() {
        navMenu.classList.remove('show');
        menuToggle.classList.remove('active');
        menuToggle.style.transform = 'rotate(0deg) scale(1)';

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
}

// ===============================
// SMOOTH SCROLLING FOR NAV LINKS
// ===============================
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (href.startsWith("#") && href !== "#") {
                e.preventDefault();
                const section = document.querySelector(href);
                if (section) {
                    section.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });
}

// ===============================
// FEEDBACK FORM INITIALIZATION
// ===============================
function initFeedbackForm() {
    const form = document.getElementById("feedbackForm");
    if (!form) return;

    form.setAttribute('novalidate', 'novalidate');
    
    form.querySelectorAll('[required]').forEach(input => {
        input.removeAttribute('required');
    });

    const formState = {
        teacherFeedback: "",
        courseFeedback: "",
        courseRating: 0,
        teacherRating: 0,
    };

    wrapFormInputs(form);
    initFormInputs(form, formState);
    initStarRatings(formState);
    initTextareaResize();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleFormSubmit(form, formState);
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const context = JSON.parse(localStorage.getItem('feedbackContext'));
            if (context && context.returnUrl) {
                window.location.href = context.returnUrl;
            } else {
                window.location.href = '../home_page2/home_page2.html';
            }
        });
    }
}

// ===============================
// WRAP INPUTS IN FORM-GROUP DIVS
// ===============================
function wrapFormInputs(form) {
    const inputs = form.querySelectorAll("input:not([type='submit']):not([type='hidden']):not([type='button']), textarea");
    
    inputs.forEach((input) => {
        if (!input.parentElement.classList.contains('form-group')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-group';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            const errorMsg = document.createElement('small');
            errorMsg.className = 'error-message';
            wrapper.appendChild(errorMsg);
        }
    });
    
    const starContainers = document.querySelectorAll('.stars');
    starContainers.forEach((stars) => {
        if (!stars.parentElement.classList.contains('star-group')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'star-group';
            stars.parentNode.insertBefore(wrapper, stars);
            wrapper.appendChild(stars);
            
            const errorMsg = document.createElement('small');
            errorMsg.className = 'error-message';
            wrapper.appendChild(errorMsg);
        }
    });
}

// ===============================
// FORM INPUTS HANDLING
// ===============================
function initFormInputs(form, formState) {
    const inputs = form.querySelectorAll("input:not([type='hidden']), textarea");

    inputs.forEach((input) => {
        input.addEventListener("input", (e) => {
            formState[e.target.name] = e.target.value;
            
            if (e.target.value.trim()) {
                setSuccessFor(e.target);
            }
        });

        input.addEventListener("focus", (e) => {
            e.target.style.borderColor = "#004aad";
        });

        input.addEventListener("blur", (e) => {
            if (!e.target.value.trim()) {
                e.target.style.borderColor = "#ccc";
            }
        });
    });
}

// ===============================
// STAR RATINGS HANDLING
// ===============================
function initStarRatings(formState) {
    const starContainers = document.querySelectorAll(".stars");

    starContainers.forEach((container) => {
        const type = container.getAttribute("data-type");
        const stars = container.querySelectorAll(".star");

        stars.forEach((star, index) => {
            star.addEventListener("click", () => {
                formState[type] = index + 1;
                updateStars(stars, index);
                
                setSuccessForRating(container);
                
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                container.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    container.style.transform = 'scale(1)';
                }, 200);
            });

            if (window.innerWidth > 600) {
                star.addEventListener("mouseenter", () => {
                    updateStars(stars, index);
                });

                container.addEventListener("mouseleave", () => {
                    updateStars(stars, formState[type] - 1);
                });
            }
        });
    });
}

function updateStars(stars, activeIndex) {
    stars.forEach((s, i) => {
        if (i <= activeIndex) {
            s.classList.add("active");
            s.style.color = "#f5c518";
        } else {
            s.classList.remove("active");
            s.style.color = "#ccc";
        }
    });
}

// ===============================
// ERROR HANDLING FUNCTIONS
// ===============================
function setErrorFor(input, message) {
    const formControl = input.closest('.form-group');
    if (!formControl) return;
    
    const small = formControl.querySelector('small.error-message');
    
    formControl.classList.add('error');
    formControl.classList.remove('success');
    
    if (small) {
        small.textContent = message;
        small.style.display = 'block';
    }
    
    input.style.borderColor = '#f44336';
    input.style.backgroundColor = '#ffebee';
}

function setSuccessFor(input) {
    const formControl = input.closest('.form-group');
    if (!formControl) return;
    
    const small = formControl.querySelector('small.error-message');
    
    formControl.classList.remove('error');
    formControl.classList.add('success');
    
    if (small) {
        small.style.display = 'none';
        small.textContent = '';
    }
    
    input.style.borderColor = '';
    input.style.backgroundColor = '';
}

function setErrorForRating(container, message) {
    const starGroup = container.closest('.star-group') || container.parentElement;
    const small = starGroup.querySelector('small.error-message');
    
    if (small) {
        small.textContent = message;
        small.style.display = 'block';
    }
    
    container.style.border = '2px solid #f44336';
    container.style.padding = '8px';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#ffebee';
}

function setSuccessForRating(container) {
    const starGroup = container.closest('.star-group') || container.parentElement;
    const small = starGroup.querySelector('small.error-message');
    
    if (small) {
        small.style.display = 'none';
        small.textContent = '';
    }
    
    container.style.border = '';
    container.style.padding = '';
    container.style.borderRadius = '';
    container.style.backgroundColor = '';
}

// ===============================
// FORM VALIDATION
// ===============================
function validateForm(form, formState) {
    let isValid = true;
    let firstErrorElement = null;

    // Validate teacher feedback
    const teacherFeedbackInput = form.querySelector('textarea[name="teacherFeedback"]');
    if (!formState.teacherFeedback || formState.teacherFeedback.trim() === "") {
        setErrorFor(teacherFeedbackInput, 'Teacher feedback is required');
        if (!firstErrorElement) firstErrorElement = teacherFeedbackInput;
        isValid = false;
    } else if (formState.teacherFeedback.trim().length < 10) {
        setErrorFor(teacherFeedbackInput, 'Teacher feedback must be at least 10 characters');
        if (!firstErrorElement) firstErrorElement = teacherFeedbackInput;
        isValid = false;
    } else {
        setSuccessFor(teacherFeedbackInput);
    }

    // Validate course feedback
    const courseFeedbackInput = form.querySelector('textarea[name="courseFeedback"]');
    if (!formState.courseFeedback || formState.courseFeedback.trim() === "") {
        setErrorFor(courseFeedbackInput, 'Course feedback is required');
        if (!firstErrorElement) firstErrorElement = courseFeedbackInput;
        isValid = false;
    } else if (formState.courseFeedback.trim().length < 10) {
        setErrorFor(courseFeedbackInput, 'Course feedback must be at least 10 characters');
        if (!firstErrorElement) firstErrorElement = courseFeedbackInput;
        isValid = false;
    } else {
        setSuccessFor(courseFeedbackInput);
    }

    // Validate course rating
    const courseStars = document.querySelector('.stars[data-type="courseRating"]');
    if (formState.courseRating === 0) {
        setErrorForRating(courseStars, 'Please rate the course');
        if (!firstErrorElement) firstErrorElement = courseStars;
        isValid = false;
    } else {
        setSuccessForRating(courseStars);
    }

    // Validate teacher rating
    const teacherStars = document.querySelector('.stars[data-type="teacherRating"]');
    if (formState.teacherRating === 0) {
        setErrorForRating(teacherStars, 'Please rate the teacher');
        if (!firstErrorElement) firstErrorElement = teacherStars;
        isValid = false;
    } else {
        setSuccessForRating(teacherStars);
    }

    // Scroll to first error
    if (!isValid && firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

// ===============================
// FORM SUBMISSION HANDLING
// ===============================
async function handleFormSubmit(form, formState) {
    if (!validateForm(form, formState)) {
        return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;
    }

    try {
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showNotification('Please login to submit feedback', 'error');
            setTimeout(() => {
                window.location.href = '../Login/login.html';
            }, 1500);
            return;
        }

        // Get IDs from hidden fields
        const courseId = parseInt(document.getElementById('courseId').value);
        const teacherId = parseInt(document.getElementById('teacherId').value);

        if (!courseId || !teacherId) {
            showNotification('Missing course or teacher information', 'error');
            if (submitBtn) {
                submitBtn.textContent = "Submit Feedback";
                submitBtn.disabled = false;
            }
            return;
        }

        // Prepare feedback data
        const feedbackData = {
            courseId: courseId,
            teacherId: teacherId,
            teacherComment: formState.teacherFeedback.trim(),
            courseComment: formState.courseFeedback.trim(),
            teacherRating: formState.teacherRating,
            courseRating: formState.courseRating
        };

        console.log('📤 Submitting feedback:', feedbackData);

        // Submit feedback to backend
        const data = await apiCall('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackData)
        });

        if (data.success) {
            // Success
            if (submitBtn) {
                submitBtn.textContent = "Submitted ✓";
                submitBtn.style.background = "#4CAF50";
            }

            showNotification('Feedback submitted successfully! 🎉', 'success');

            // Clear feedback context
            localStorage.removeItem('feedbackContext');

            setTimeout(() => {
                // Redirect back to course or home
                const context = JSON.parse(localStorage.getItem('feedbackContext') || '{}');
                if (context.returnUrl) {
                    window.location.href = context.returnUrl;
                } else {
                    window.location.href = "../home_page2/home_page2.html";
                }
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Error submitting feedback:', error);
        showNotification(error.message || 'Failed to submit feedback. Please try again.', 'error');
        
        if (submitBtn) {
            submitBtn.textContent = "Submit Feedback";
            submitBtn.disabled = false;
        }
    }
}

// ===============================
// NOTIFICATION FUNCTION
// ===============================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===============================
// TEXTAREA AUTO-RESIZE
// ===============================
function initTextareaResize() {
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
        textarea.addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 150) + "px";
        });
    });
}

// ===============================
// PAGE LOAD ANIMATIONS
// ===============================
function initPageAnimations() {
    window.addEventListener("load", () => {
        const container = document.querySelector(".feedback-container");
        if (container) {
            container.style.opacity = "0";
            container.style.transform = "translateY(30px)";
            
            setTimeout(() => {
                container.style.transition = "all 0.6s ease-out";
                container.style.opacity = "1";
                container.style.transform = "translateY(0)";
            }, 100);
        }
    });
}

// ===============================
// VALIDATION STYLES
// ===============================
function addValidationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        .form-group {
            position: relative;
            margin-bottom: 1rem;
        }
        
        .star-group {
            position: relative;
        }
        
        .form-group.error input,
        .form-group.error textarea {
            border-color: #f44336 !important;
            background-color: #ffebee !important;
        }
        
        .form-group.success input,
        .form-group.success textarea {
            border-color: #4CAF50 !important;
        }
        
        .error-message {
            display: none;
            color: #f44336;
            font-size: 0.85rem;
            margin-top: 0.3rem;
            font-weight: 500;
            animation: slideIn 0.2s ease;
        }
        
        .rating-section .error-message {
            display: none;
            margin-top: 0.5rem;
        }

        .feedback-info {
            background: linear-gradient(135deg, #0e84c8 0%, #3ba5e2 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(14, 132, 200, 0.2);
        }

        .info-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: white;
        }

        .info-item:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: 600;
            margin-right: 10px;
            min-width: 120px;
            font-size: 15px;
        }

        .info-value {
            font-weight: 500;
            font-size: 16px;
        }

        .cancel-btn {
            background-color: #757575;
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
            margin-left: 10px;
            transition: background 0.3s ease;
        }

        .cancel-btn:hover {
            background-color: #616161;
        }
    `;
    document.head.appendChild(style);
}

// Profile button
const profilebtn = document.querySelector('.btn-profile');

if (profilebtn) {
    profilebtn.addEventListener('click', () => {
        window.location.href = '../profile/profile.html';
    });
}