
// API Configuration
// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;

// Get JWT token from localStorage
function getAuthToken() {
  return localStorage.getItem(API_CONFIG.KEYS.TOKEN);
}

// Fetch headers with authentication
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
}



// PROFILE PAGE - VALIDATION AND FUNCTIONALITY
//Consolidated logic moved to initializeProfilePage and setupEventListeners

// STATE & CONFIGURATION (keep for future API integration)

document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
   
    initSmoothScrolling();
   
});

// ===============================
// MOBILE MENU FUNCTIONALITY (CONSOLIDATED)
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


const state = {
    isEditing: false,
    profileData: {
        firstName: '',
        lastName: '',
        bio: '',
        birthday: '',
        phone: '',
        studyAt: '',
        fieldOfStudy: '',
        address: '',
        profilePhoto: '',
        social: {
            youtube: '',
            facebook: '',
            instagram: '',
            linkedin: ''
        }
    },
    originalData: null
};

const CONFIG = {
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    animationDelay: 100
};

// INITIALIZATION

document.addEventListener('DOMContentLoaded', () => {
    initializeProfilePage();
    setupEventListeners();
    loadUserData();
});

function toggleLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) overlay.classList.add('active');
        else overlay.classList.remove('active');
    }
}

function initializeProfilePage() {
    animateOnLoad();
    setupIntersectionObserver();
    setupFormValidation();
    
    // Initial UI Setup
    const inputs = document.querySelectorAll('.form__input, .form__textarea');
    inputs.forEach(i => i.disabled = true);
    const changePhotoBtn = document.querySelector('.btn--secondary');
    if (changePhotoBtn) changePhotoBtn.disabled = true;

    // Check cache for instant load
    const cachedProfile = localStorage.getItem(API_CONFIG.KEYS.USER);
    if (cachedProfile) {
        try {
            const data = JSON.parse(cachedProfile);
            if (data.firstName || data.S_firstname || data.T_firstname) {
                console.log("Profile: Loading from cache...");
                populateForm(data);
                const photo = data.profilePhoto || data.pfp || data.S_pfp || data.T_pfp;
                if (photo) updateProfilePhoto(photo);
            }
        } catch (e) {
            console.error("Profile: Cache parse error", e);
        }
    }
}

// ANIMATIONS

function animateOnLoad() {
    const elements = [
        { selector: '.profile-header', delay: 0 },
        { selector: '.edit-section', delay: 100 },
        { selector: '.card', delay: 200, stagger: 100 }
    ];

    elements.forEach(({ selector, delay, stagger }) => {
        const items = document.querySelectorAll(selector);
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, delay + (stagger ? index * stagger : 0));
        });
    });
}

function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card);
    });
}

function animateInputFocus(input) {
    const parent = input.closest('.form__group');
    if (parent) {
        parent.style.transform = 'scale(1.02)';
        parent.style.transition = 'transform 0.2s ease';
    }
}

function animateInputBlur(input) {
    const parent = input.closest('.form__group');
    if (parent) {
        parent.style.transform = 'scale(1)';
    }
}

function animateButton(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

function showSuccessAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.innerHTML = '<div class="success-icon">✓</div><p>Profile Updated Successfully</p>';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }, 2000);
}

// EVENT LISTENERS

function setupEventListeners() {
    const editBtn = document.querySelector('.btn-edit-info');
    const changePhotoBtn = document.querySelector('.btn--secondary');
    const inputs = document.querySelectorAll('.form__input, .form__textarea');
    
    if (editBtn) {
        editBtn.addEventListener('click', toggleEditMode);
    }
    
    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', handleChangePhoto);
    }
    
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => animateInputFocus(e.target));
        input.addEventListener('blur', (e) => animateInputBlur(e.target));
        input.addEventListener('input', handleInputChange);
    });
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.isEditing) {
            saveProfileData();
        }
    }
    
    if (e.key === 'Escape' && state.isEditing) {
        cancelEdit();
    }
}


// PROFILE PHOTO MANAGEMENT

function handleChangePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = CONFIG.allowedTypes.join(',');
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            validateAndUploadPhoto(file);
        }
    };
    
    input.click();
}

function validateAndUploadPhoto(file) {
    if (!CONFIG.allowedTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPEG, PNG, WebP)', 'error');
        return;
    }
    
    if (file.size > CONFIG.maxFileSize) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        updateProfilePhoto(e.target.result);
        uploadPhotoToServer(file);
    };
    reader.readAsDataURL(file);
}

function updateProfilePhoto(imageData) {
    const avatar = document.querySelector('.profile-header__avatar');
    if (avatar) {
        avatar.style.backgroundImage = `url(${imageData})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        
        avatar.style.transform = 'scale(0.9)';
        setTimeout(() => {
            avatar.style.transition = 'transform 0.3s ease';
            avatar.style.transform = 'scale(1)';
        }, 50);
        
        state.profileData.profilePhoto = imageData;
    }
}

// Updated uploadPhotoToServer function
async function uploadPhotoToServer(file) {
  const formData = new FormData();
  formData.append('profilePhoto', file);
  
  try {
    const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    showNotification('Profile photo updated successfully', 'success');
    return result;
    
  } catch (error) {
    console.error('Photo upload error:', error);
    showNotification('Failed to upload photo', 'error');
  }
}


// EDIT MODE MANAGEMENT

function toggleEditMode() {
    const editBtn = document.querySelector('.btn-edit-info');
    
    if (state.isEditing) {
        saveProfileData();
    } else {
        enableEditMode();
    }
}

function enableEditMode() {
    state.isEditing = true;
    state.originalData = { ...state.profileData };
    
    const inputs = document.querySelectorAll('.form__input, .form__textarea');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.add('editing');
    });
    
    const editBtn = document.querySelector('.btn-edit-info');
    if (editBtn) {
        editBtn.textContent = 'Save Changes';
        editBtn.classList.add('btn--save');
        animateButton(editBtn);
    }

    const changePhotoBtn = document.querySelector('.btn--secondary');
    if (changePhotoBtn) {
        changePhotoBtn.disabled = false;
    }
    
    createCancelButton();
}

function disableEditMode() {
    state.isEditing = false;
    
    const inputs = document.querySelectorAll('.form__input, .form__textarea');
    inputs.forEach(input => {
        input.disabled = true;
        input.classList.remove('editing');
    });
    
    const editBtn = document.querySelector('.btn-edit-info');
    if (editBtn) {
        editBtn.textContent = 'Edit Information';
        editBtn.classList.remove('btn--save');
    }

    const changePhotoBtn = document.querySelector('.btn--secondary');
    if (changePhotoBtn) {
        changePhotoBtn.disabled = true;
    }
    
    removeCancelButton();
}

function createCancelButton() {
    const editSection = document.querySelector('.edit-section');
    if (!editSection || document.querySelector('.btn-cancel')) return;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel editing');
    cancelBtn.onclick = cancelEdit;
    
    editSection.appendChild(cancelBtn);
    
    setTimeout(() => {
        cancelBtn.style.opacity = '1';
        cancelBtn.style.transform = 'translateY(0)';
    }, 10);
}

function removeCancelButton() {
    const cancelBtn = document.querySelector('.btn-cancel');
    if (cancelBtn) {
        cancelBtn.style.opacity = '0';
        cancelBtn.style.transform = 'translateY(-10px)';
        setTimeout(() => cancelBtn.remove(), 300);
    }
}

function cancelEdit() {
    state.profileData = { ...state.originalData };
    populateForm(state.profileData);
    disableEditMode();
    showNotification('Changes cancelled', 'info');
}

// DATA MANAGEMENT


// Updated loadUserData function
async function loadUserData() {
  toggleLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '../login_page/login.html';
        return;
      }
      throw new Error('Failed to load profile');
    }
    
    const result = await response.json();
    const data = result.data;
    
    state.profileData = data;
    
    // Update user in localStorage to sync with sidebar immediately on load
    const currentUser = JSON.parse(localStorage.getItem(API_CONFIG.KEYS.USER) || '{}');
    const newUser = { ...currentUser, ...data };
    localStorage.setItem(API_CONFIG.KEYS.USER, JSON.stringify(newUser));
    
    // Notify sidebar and other components
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: newUser }));
    
    populateForm(data);
    
    const photo = data.profilePhoto || data.pfp;
    if (photo) {
      // Check if it's an absolute URL (Cloudinary) or relative (Local)
      let photoUrl = photo;
      if (!photo.startsWith('http')) {
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = photo.startsWith('/') ? photo : '/' + photo;
        photoUrl = `${cleanBase}${cleanPath}`;
      }
      console.log("Profile: Setting photo URL to:", photoUrl);
      updateProfilePhoto(photoUrl);
    }
    
  } catch (error) {
    console.error('Load error:', error);
    showNotification('Failed to load profile data', 'error');
  } finally {
    toggleLoading(false);
  }
}

function populateForm(data) {
    document.getElementById('first-name').value = data.firstName || '';
    document.getElementById('last-name').value = data.lastName || '';
    if (data.birthday) {
        document.getElementById('birthday').value = new Date(data.birthday).toISOString().split('T')[0];
    } else {
        document.getElementById('birthday').value = '';
    }
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('bio').value = data.bio || '';
    document.getElementById('study-at').value = data.studyAt || '';
    document.getElementById('field-of-study').value = data.fieldOfStudy || '';
    document.getElementById('address').value = data.address || '';
    
    document.getElementById('youtube').value = data.social?.youtube || '';
    document.getElementById('facebook').value = data.social?.facebook || '';
    document.getElementById('instagram').value = data.social?.instagram || '';
    document.getElementById('linkedin').value = data.social?.linkedin || '';
    
    const profileName = document.querySelector('.profile-header__name');
    if (profileName && data.firstName) {
        profileName.textContent = `${data.firstName} ${data.lastName || ''}`.trim();
    }
    
    const profileBio = document.querySelector('.profile-header__bio');
    if (profileBio && data.bio) {
        profileBio.textContent = data.bio;
    }
}

function collectFormData() {
    return {
        firstName: document.getElementById('first-name').value.trim(),
        lastName: document.getElementById('last-name').value.trim(),
        birthday: document.getElementById('birthday').value,
        phone: document.getElementById('phone').value.trim(),
        bio: document.getElementById('bio').value.trim(),
        studyAt: document.getElementById('study-at').value.trim(),
        fieldOfStudy: document.getElementById('field-of-study').value.trim(),
        address: document.getElementById('address').value.trim(),
        profilePhoto: state.profileData.profilePhoto,
        social: {
            youtube: document.getElementById('youtube').value.trim(),
            facebook: document.getElementById('facebook').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            linkedin: document.getElementById('linkedin').value.trim()
        }
    };
}

// Updated saveProfileData function
async function saveProfileData() {
  const formData = collectFormData();
  
  if (!validateFormData(formData)) {
    return;
  }
  
  const editBtn = document.querySelector('.btn-edit-info');
  if (editBtn) {
    editBtn.disabled = true;
    editBtn.textContent = 'Saving...';
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error('Save failed');
    }
    
    const result = await response.json();
    const updatedUser = result.data;
    state.profileData = updatedUser;
    
    // Update user in localStorage to sync with sidebar
    const currentUser = JSON.parse(localStorage.getItem(API_CONFIG.KEYS.USER) || '{}');
    const newUser = { ...currentUser, ...updatedUser };
    localStorage.setItem(API_CONFIG.KEYS.USER, JSON.stringify(newUser));
    
    // Notify sidebar and other components
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: newUser }));
    
    disableEditMode();
    showSuccessAnimation();
    showNotification('Profile updated successfully', 'success');
    
  } catch (error) {
    console.error('Save error:', error);
    showNotification('Failed to save profile', 'error');
  } finally {
    if (editBtn) {
      editBtn.disabled = false;
      editBtn.textContent = 'Edit Information';
    }
  }
}

// VALIDATION

function setupFormValidation() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', validatePhoneInput);
    }
    
    const urlInputs = document.querySelectorAll('#youtube, #facebook, #instagram, #linkedin');
    urlInputs.forEach(input => {
        input.addEventListener('blur', () => validateUrlInput(input));
    });
    
    const bioTextarea = document.getElementById('bio');
    if (bioTextarea) {
        bioTextarea.addEventListener('input', updateCharacterCount);
    }
}

function validateFormData(data) {
    if (!data.firstName) {
        showNotification('First name is required', 'error');
        document.getElementById('first-name').focus();
        return false;
    }
    
    if (data.phone && !isValidPhone(data.phone)) {
        showNotification('Please enter a valid phone number', 'error');
        document.getElementById('phone').focus();
        return false;
    }
    
    return true;
}

function validatePhoneInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) {
        value = value.slice(0, 10);
    }
    e.target.value = value;
}

function isValidPhone(phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

function validateUrlInput(input) {
    const value = input.value.trim();
    if (!value) return true;
    
    try {
        new URL(value);
        input.classList.remove('invalid');
        return true;
    } catch {
        input.classList.add('invalid');
        showNotification('Please enter a valid URL', 'error');
        return false;
    }
}

function updateCharacterCount(e) {
    const maxLength = e.target.getAttribute('maxlength');
    const currentLength = e.target.value.length;
    
    let counter = document.querySelector('.char-counter');
    if (!counter) {
        counter = document.createElement('div');
        counter.className = 'char-counter';
        e.target.parentNode.appendChild(counter);
    }
    
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.style.color = currentLength >= maxLength * 0.9 ? '#dc3545' : '#666';
}

function handleInputChange(e) {
    const input = e.target;
    if (input.value) {
        input.classList.add('has-value');
    } else {
        input.classList.remove('has-value');
    }
}

// UTILITIES

function getUserId() {
    return localStorage.getItem('userId') || 'demo-user';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// LOCAL STORAGE FALLBACK

// Local storage fallback removed - using real API calls now

console.log('%cProfile Page Ready', 'color: #004e92; font-size: 16px; font-weight: bold;');
console.log('Available commands:');
console.log('- state: View current profile state');
console.log('- saveProfileData(): Manually save profile');



const profilebtn = document.querySelector('.btn-profile');

if (profilebtn) {
    profilebtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../profile/profile.html';
        }, 300);
    });


      //////////the SideBar JS



// Add notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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
`;
document.head.appendChild(notificationStyles);


const probtn = document.querySelector('.action-btn btn-secondary');

if (probtn) {
    probtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../Homepage/homepage.html';
        }, 300);
    });
  }
}
