// ===============================
// MAIN INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initCourseManagement();
    initSidebar();
    initProfileButton();
});

// ===============================
// MOBILE MENU
// ===============================
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!menuToggle || !navMenu) return;

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
            navMenu.classList.remove('show');
        }
    });
}

// ===============================
// COURSE MANAGEMENT
// ===============================
function initCourseManagement() {
    let courseStructure = { chapters: [] };
    let selectedCourseImage = null;

    initCourseImageUpload();
    initChaptersDynamicInput();
    initDynamicUploadSections();
    initFormValidation();
    initDynamicUploadSections();
    initFormValidation();
    initCreateCourseButton();
    
    // Check for saved state (from quiz creation return)
    setTimeout(restoreState, 500); // Small delay to ensure DOM is ready

    function initCourseImageUpload() {
        const btn = document.getElementById('courseImageBtn');
        const input = document.getElementById('courseImageInput');
        const name = document.getElementById('courseImageName');
        const preview = document.getElementById('courseImagePreview');

        if (!btn || !input) return;

        btn.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                selectedCourseImage = file;
                name.textContent = file.name;

                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview"><button class="remove-image-btn" id="removeCourseImage">Remove</button>`;
                    preview.style.display = 'block';

                    document.getElementById('removeCourseImage').addEventListener('click', () => {
                        selectedCourseImage = null;
                        input.value = '';
                        name.textContent = 'No image selected';
                        preview.style.display = 'none';
                        preview.innerHTML = '';
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function initChaptersDynamicInput() {
        const sessionsInput = document.getElementById('sessions');
        if (!sessionsInput) return;

        const container = document.createElement('div');
        container.id = 'chaptersContainer';
        container.className = 'chapters-container';
        container.style.display = 'none';
        sessionsInput.parentElement.insertAdjacentElement('afterend', container);

        sessionsInput.addEventListener('input', (e) => {
            const num = parseInt(e.target.value) || 0;
            if (num > 0) {
                createChaptersInputs(num);
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
                courseStructure.chapters = [];
                updateUploadSections();
            }
        });

        function createChaptersInputs(count) {
            const existing = courseStructure.chapters.slice(0, count);
            
            container.innerHTML = `
                <div class="chapters-header">
                    <span class="chapters-badge">${count}</span>
                    <h3 class="chapters-title">Chapters Configuration</h3>
                </div>
                <div class="chapters-list" id="chaptersList"></div>
            `;

            const list = document.getElementById('chaptersList');

            for (let i = 0; i < count; i++) {
                const ex = existing[i] || { name: '', numLectures: '', lectures: [] };
                
                const row = document.createElement('div');
                row.className = 'chapter-row';
                row.innerHTML = `
                    <div class="chapter-config">
                        <span class="chapter-number">Chapter ${i + 1}</span>
                        <div class="chapter-inputs-grid">
                            <div class="form-group">
                                <label class="mini-label">Chapter Name</label>
                                <input type="text" class="chapter-name-input" placeholder="e.g., Introduction" data-chapter-index="${i}" value="${ex.name}">
                                <small class="error-message"></small>
                            </div>
                            <div class="form-group">
                                <label class="mini-label">Lectures</label>
                                <input type="number" class="chapter-lectures-input" placeholder="0" min="0" max="50" data-chapter-index="${i}" value="${ex.numLectures}">
                                <small class="error-message"></small>
                            </div>
                        </div>
                    </div>
                `;
                list.appendChild(row);

                if (!courseStructure.chapters[i]) {
                    courseStructure.chapters[i] = { name: ex.name, numLectures: ex.numLectures, lectures: ex.lectures };
                }
            }

            courseStructure.chapters = courseStructure.chapters.slice(0, count);

            document.querySelectorAll('.chapter-name-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    courseStructure.chapters[parseInt(e.target.dataset.chapterIndex)].name = e.target.value;
                    updateUploadSections();
                });
            });

            document.querySelectorAll('.chapter-lectures-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = parseInt(e.target.dataset.chapterIndex);
                    const num = parseInt(e.target.value) || 0;
                    
                    courseStructure.chapters[idx].numLectures = num;
                    courseStructure.chapters[idx].lectures = [];
                    for (let i = 0; i < num; i++) {
                        const exL = existing[idx]?.lectures[i];
                        courseStructure.chapters[idx].lectures.push(exL || { name: '', video: null, files: [] });
                    }
                    
                    updateUploadSections();
                });
            });
        }
    }

    function initDynamicUploadSections() {
        const uploadSections = document.querySelector('.upload-sections');
        if (!uploadSections) return;

        uploadSections.innerHTML = `
            <div id="dynamicUploadContainer" class="dynamic-upload-container">
                <div class="upload-placeholder">
                    <div class="placeholder-icon">📚</div>
                    <h3>Configure Chapters First</h3>
                    <p>Enter chapters and lectures to upload content</p>
                </div>
            </div>
        `;
    }

    function updateUploadSections() {
        const container = document.getElementById('dynamicUploadContainer');
        if (!container) return;

        const hasChapters = courseStructure.chapters.some(ch => ch.name.trim() !== '' && ch.numLectures > 0);

        if (!hasChapters) {
            container.innerHTML = `
                <div class="upload-placeholder">
                    <div class="placeholder-icon">📚</div>
                    <h3>Configure Chapters First</h3>
                    <p>Enter chapters and lectures to upload content</p>
                </div>
            `;
            return;
        }

        let html = '<div class="chapter-tabs">';
        
        courseStructure.chapters.forEach((ch, i) => {
            if (ch.name.trim() === '' || ch.numLectures === 0) return;
            html += `
                <button class="chapter-tab ${i === 0 ? 'active' : ''}" data-chapter="${i}">
                    <span class="tab-number">${i + 1}</span>
                    <span class="tab-name">${ch.name}</span>
                    <span class="tab-count">${ch.numLectures} lectures</span>
                </button>
            `;
        });
        
        html += '</div><div class="chapter-content-area">';
        
        courseStructure.chapters.forEach((ch, ci) => {
            if (ch.name.trim() === '' || ch.numLectures === 0) return;
            
            html += `<div class="chapter-content ${ci === 0 ? 'active' : ''}" data-chapter="${ci}">
                <div class="chapter-content-header">
                    <h3>Chapter ${ci + 1}: ${ch.name}</h3>
                    <span class="lecture-count-badge">${ch.numLectures} Lectures</span>
                </div>
                
                <!-- Quiz Button for this Chapter -->
                <div class="chapter-quiz-section">
                    <button type="button" class="upload-btn quiz-btn ${ch.quiz ? 'quiz-added' : ''}" data-chapter-index="${ci}">
                        ${ch.quiz ? '✅ Quiz Added - Edit' : '📝 Add Quiz'} for Chapter ${ci + 1}
                    </button>
                </div>
                
                <div class="lectures-list">`;
            
            for (let li = 0; li < ch.numLectures; li++) {
                const lec = ch.lectures[li];
                const vName = lec.video ? lec.video.name : 'No video';
                const fCount = lec.files ? lec.files.length : 0;
                
                html += `
                    <div class="lecture-card" data-chapter="${ci}" data-lecture="${li}">
                        <div class="lecture-header"><span class="lecture-number">Lecture ${li + 1}</span></div>
                        
                        <div class="form-group">
                            <label class="lecture-label">Lecture Name</label>
                            <input type="text" class="lecture-name-input" placeholder="e.g., Variables" data-chapter="${ci}" data-lecture="${li}" value="${lec.name || ''}">
                            <small class="error-message"></small>
                        </div>
                        
                        <div class="lecture-uploads">
                            <div class="upload-group">
                                <label class="lecture-label">Video</label>
                                <div class="file-select-area">
                                    <button type="button" class="select-video-btn" data-chapter="${ci}" data-lecture="${li}">🎹 Video</button>
                                    <span class="file-name">${vName}</span>
                                </div>
                                <input type="file" class="hidden-video-input" accept="video/*" data-chapter="${ci}" data-lecture="${li}" hidden>
                            </div>
                            
                            <div class="upload-group">
                                <label class="lecture-label">Files</label>
                                <div class="file-select-area">
                                    <button type="button" class="select-files-btn" data-chapter="${ci}" data-lecture="${li}">📄 Files</button>
                                    <span class="file-name">${fCount > 0 ? `${fCount} file(s)` : 'No files'}</span>
                                </div>
                                <input type="file" class="hidden-files-input" multiple data-chapter="${ci}" data-lecture="${li}" hidden>
                                ${fCount > 0 ? generateFilesList(lec.files, ci, li) : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div></div>';
        });
        
        html += '</div>';
        container.innerHTML = html;

        // Initialize chapter tabs
        document.querySelectorAll('.chapter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.chapter;
                document.querySelectorAll('.chapter-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.chapter-content').forEach(c => c.classList.remove('active'));
                document.querySelector(`.chapter-content[data-chapter="${idx}"]`).classList.add('active');
            });
        });

        // Initialize quiz buttons for each chapter
        document.querySelectorAll('.quiz-btn[data-chapter-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chapterIndex = e.target.dataset.chapterIndex;
                
                // Save current form state to localStorage
                const courseData = {
                    courseName: document.getElementById('courseName').value,
                    field: document.getElementById('field').value,
                    destinatedTo: document.getElementById('destinatedTo').value,
                    sessions: document.getElementById('sessions').value,
                    description: document.getElementById('description').value,
                    maxStudents: document.getElementById('maxStudents').value,
                    price: document.getElementById('price').value,
                    certificate: document.getElementById('certificate').value
                };
                localStorage.setItem('courseFormData', JSON.stringify(courseData));
                
                // Store data for when user returns from quiz page
                localStorage.setItem('currentChapterForQuiz', chapterIndex);
                localStorage.setItem('courseStructure', JSON.stringify(courseStructure));
                
                // Redirect to quiz creation page
                window.location.href = '../quiz pages/tQuiz.html';
            });
        });

        initLectureInputs();
    }

    function generateFilesList(files, ci, li) {
        if (!files || files.length === 0) return '';
        let html = '<div class="mini-files-list">';
        files.forEach((f, fi) => {
            html += `<div class="mini-file-item"><span class="mini-file-name">${f.name}</span><button type="button" class="remove-mini-file" data-chapter="${ci}" data-lecture="${li}" data-file="${fi}">×</button></div>`;
        });
        html += '</div>';
        return html;
    }

    function restoreState() {
        try {
            const savedStructure = localStorage.getItem('courseStructure');
            
            if (!savedStructure) return;
            
            const parsed = JSON.parse(savedStructure);
            
            // Restore course details
            const sessionsInput = document.getElementById('sessions');
            if (!sessionsInput) return; // Should not happen
            
            // We need to verify if this data matches the current form state or if we need to restore inputs too.
            // Since the page reloaded, the inputs are likely empty (unless browser cached them).
            // But we should prioritize the data in localStorage if it exists and looks valid.
            
            // However, we only saved 'courseStructure' (chapters/lectures/quizzes). 
            // We didn't explicitly save the course metadata (name, desc, etc.) in localStorage in the previous step.
            // Wait, looking at teacher-quiz.js:
            // "const courseStructure = JSON.parse(localStorage.getItem('courseStructure'));"
            // It seems we only stored courseStructure. Let's check where we set it.
            // In coursemanagement.js: "localStorage.setItem('courseStructure', JSON.stringify(courseStructure));"
            // This 'courseStructure' variable only contains { chapters: [] } based on line 36.
            // Ah, so we are missing the restoration of the main form fields (Course Name, etc.)!
            
            // Restore course metadata
            const formDataStr = localStorage.getItem('courseFormData');
            if (formDataStr) {
                const formData = JSON.parse(formDataStr);
                document.getElementById('courseName').value = formData.courseName || '';
                document.getElementById('field').value = formData.field || '';
                document.getElementById('destinatedTo').value = formData.destinatedTo || '';
                document.getElementById('sessions').value = formData.sessions || '';
                document.getElementById('description').value = formData.description || '';
                document.getElementById('maxStudents').value = formData.maxStudents || '';
                document.getElementById('price').value = formData.price || '';
                document.getElementById('certificate').value = formData.certificate || '';
            }
            
            // Restore sessions count from structure if available (more reliable)
            if (parsed.chapters && parsed.chapters.length > 0) {
                // Restore sessions count
                sessionsInput.value = parsed.chapters.length;
                
                // Trigger input event to generate chapter fields
                sessionsInput.dispatchEvent(new Event('input'));
                
                // Restore chapter details
                parsed.chapters.forEach((ch, ci) => {
                     // Restore Chapter Name
                     const chapNameInput = document.querySelector(`.chapter-name-input[data-chapter-index="${ci}"]`);
                     if (chapNameInput) chapNameInput.value = ch.name || '';
                     
                     // Restore Num Lectures
                     const numLecInput = document.querySelector(`.chapter-lectures-input[data-chapter-index="${ci}"]`);
                     if (numLecInput) {
                         numLecInput.value = ch.numLectures || '';
                         numLecInput.dispatchEvent(new Event('input')); // This triggers generation of lecture rows
                     }
                     
                     // Restore Lecture Details
                     if (ch.lectures) {
                         ch.lectures.forEach((lec, li) => {
                             const lecNameInput = document.querySelector(`.lecture-name-input[data-chapter="${ci}"][data-lecture="${li}"]`);
                             if (lecNameInput) lecNameInput.value = lec.name || '';
                             
                             // Restore file names in UI (files themselves usually can't be restored to file input due to security, but we can show what was selected if we persisted metadata)
                             // Actually, we can't restore File objects from localStorage. They are lost on reload.
                             // This is a browser security limitation. 
                             // The user will have to re-select files if they reload properly.
                             // EXCEPT if we had uploaded them to a temp storage? 
                             // For now, let's at least restore the text structure so they don't lose their typing.
                         });
                     }
                });
                
                // Update internal structure
                courseStructure.chapters = parsed.chapters;
                updateUploadSections(); // Refresh UI states (like quiz buttons)
                
               
            }
            
            // Note: State restoration for files is not possible with localStorage alone.
            // If the user hasn't uploaded them yet, they are lost. 
            // But quiz data IS preserved in localStorage, so that part is safe.
            
        } catch (e) {
            console.error('Failed to restore state:', e);
            localStorage.removeItem('courseStructure');
        }
    }

    function initLectureInputs() {
        document.querySelectorAll('.lecture-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const ci = parseInt(e.target.dataset.chapter);
                const li = parseInt(e.target.dataset.lecture);
                courseStructure.chapters[ci].lectures[li].name = e.target.value;
            });
        });

        document.querySelectorAll('.select-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = document.querySelector(`.hidden-video-input[data-chapter="${e.target.dataset.chapter}"][data-lecture="${e.target.dataset.lecture}"]`);
                input.click();
            });
        });

        document.querySelectorAll('.hidden-video-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const ci = parseInt(e.target.dataset.chapter);
                const li = parseInt(e.target.dataset.lecture);
                const file = e.target.files[0];
                
                if (file) {
                    // Validate video file type
                    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/x-msvideo'];
                    
                    if (!validVideoTypes.includes(file.type)) {
                        showNotification('Please select a valid video file (MP4, WebM, MOV, MKV, AVI)', 'error');
                        e.target.value = ''; // Clear the input
                        return;
                    }
                    
                    courseStructure.chapters[ci].lectures[li].video = file;
                    const card = e.target.closest('.lecture-card');
                    const fileName = card.querySelector('.upload-group:first-child .file-name');
                    fileName.textContent = file.name;
                    fileName.style.color = '#4CAF50';
                }
            });
        });

        document.querySelectorAll('.select-files-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = document.querySelector(`.hidden-files-input[data-chapter="${e.target.dataset.chapter}"][data-lecture="${e.target.dataset.lecture}"]`);
                input.click();
            });
        });

        document.querySelectorAll('.hidden-files-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const ci = parseInt(e.target.dataset.chapter);
                const li = parseInt(e.target.dataset.lecture);
                const files = Array.from(e.target.files);
                
                if (files.length > 0) {
                    // Validate file types - only allow documents, not videos
                    const validFileTypes = [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-powerpoint',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain',
                        'application/zip',
                        'application/x-zip-compressed'
                    ];
                    
                    // Check for invalid files (videos)
                    const invalidFiles = files.filter(file => {
                        const isVideo = file.type.startsWith('video/');
                        const isValidDocument = validFileTypes.includes(file.type);
                        return isVideo || !isValidDocument;
                    });
                    
                    if (invalidFiles.length > 0) {
                        const videoFiles = invalidFiles.filter(f => f.type.startsWith('video/'));
                        if (videoFiles.length > 0) {
                            showNotification('Videos cannot be uploaded as files. Please use the video upload button instead.', 'error');
                        } else {
                            showNotification('Please upload only document files (PDF, Word, PowerPoint, Excel, Text, ZIP)', 'error');
                        }
                        e.target.value = ''; // Clear the input
                        return;
                    }
                    
                    if (!courseStructure.chapters[ci].lectures[li].files) {
                        courseStructure.chapters[ci].lectures[li].files = [];
                    }
                    courseStructure.chapters[ci].lectures[li].files.push(...files);
                    updateUploadSections();
                }
            });
        });

        document.querySelectorAll('.remove-mini-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ci = parseInt(e.target.dataset.chapter);
                const li = parseInt(e.target.dataset.lecture);
                const fi = parseInt(e.target.dataset.file);
                courseStructure.chapters[ci].lectures[li].files.splice(fi, 1);
                updateUploadSections();
            });
        });
    }

    function initFormValidation() {
        const priceInput = document.getElementById('price');
        if (priceInput) {
            priceInput.addEventListener('input', function(e) {
                let val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val ? val + ' DA' : '';
            });
        }
    }

    function initCreateCourseButton() {
        const btn = document.getElementById('createCourseBtn');
        if (!btn) return;

        btn.addEventListener('click', async function (e) {
            e.preventDefault(); //to prevent page refresh

            // Disable button to prevent multiple submissions
            btn.disabled = true;
            btn.textContent = 'Creating...';

            const data = {
                courseName: document.getElementById('courseName')?.value || '',
                field: document.getElementById('field')?.value || '',
                destinatedTo: document.getElementById('destinatedTo')?.value || '',
                sessions: document.getElementById('sessions')?.value || '',
                chapters: courseStructure.chapters,
                description: document.getElementById('description')?.value || '',
                maxStudents: document.getElementById('maxStudents')?.value || '',
                price: document.getElementById('price')?.value || '',
                certificate: document.getElementById('certificate')?.value || '',
                courseImage: selectedCourseImage
            };

            try {
                const createdCourse = await createCourse(data);
                console.log("Created course:", createdCourse);
                
                showNotification('Course created successfully!', 'success');
                resetForm();

                // Redirect after success
                setTimeout(() => {
                    window.location.href = '../student and teacher dashboard/tDashboard.html';
                }, 2000);

            } catch (error) {
                console.error("Full error object:", error);
                console.log("Error errors:", error.errors);
                btn.disabled = false;
                btn.textContent = 'Create Course';
                
                if (error.errors && Array.isArray(error.errors)) {
                    showNotification('Please fix the errors in the form', 'error');
                    
                    error.errors.forEach(err => {
                        console.log(`Processing error for field: ${err.field}`);
                        // Handle standard fields
                        const input = document.getElementById(err.field);
                        if (input && err.field !== 'courseImage') {
                            setErrorFor(input, err.message);
                        } else {
                            // Handle file uploads/chapters/lectures
                             if (err.field === 'courseImage') {
                                // Highlight course image area
                                const imageArea = document.querySelector('.course-image-upload');
                                if (imageArea) {
                                  imageArea.style.border = '2px solid #e74c3c';
                                  // Add error message if not present
                                  let msg = imageArea.parentElement.querySelector('.image-error-msg');
                                  if(!msg) {
                                      msg = document.createElement('small');
                                      msg.className = 'image-error-msg';
                                      msg.style.color = '#e74c3c';
                                      msg.style.display = 'block';
                                      imageArea.parentElement.appendChild(msg);
                                  }
                                  msg.textContent = err.message;
                                } else {
                                    console.warn('Course image area not found');
                                }
                            } else if (err.field.startsWith('video_')) {
                                // Highlight specific video upload
                                // format: video_chapterIndex_lectureIndex
                                const parts = err.field.split('_');
                                const chapterIndex = parts[1];
                                const lectureIndex = parts[2];
                                
                                const chaptersContainer = document.getElementById('chaptersContainer');
                                if (chaptersContainer && chaptersContainer.children[chapterIndex]) {
                                    const chapterDiv = chaptersContainer.children[chapterIndex];
                                    const lecturesContainer = chapterDiv.querySelector('.lectures-container');
                                    
                                    if (lecturesContainer && lecturesContainer.children[lectureIndex]) {
                                        const lectureDiv = lecturesContainer.children[lectureIndex];
                                        // Try to find the video upload button or area
                                        // Based on `addLecture` logic, it likely has a class or button
                                        const videoBtn = lectureDiv.querySelector('.add-video-btn');
                                        const videoArea = videoBtn ? videoBtn.parentElement : null;

                                        if (videoArea) {
                                            videoBtn.style.border = '2px solid #e74c3c';
                                            
                                            let msg = lectureDiv.querySelector('.video-error-msg');
                                            if(!msg) {
                                                 msg = document.createElement('small');
                                                 msg.className = 'video-error-msg';
                                                 msg.style.color = '#e74c3c';
                                                 msg.style.display = 'block';
                                                 msg.style.marginTop = '5px';
                                                 // Insert after the button
                                                 videoBtn.parentNode.insertBefore(msg, videoBtn.nextSibling);
                                            }
                                            msg.textContent = err.message;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    showNotification(error.message, 'error');
                }
            }
        });

        function resetForm() {
            console.log('Resetting form...');
            
            // 1. Clear text inputs
            const inputs = ['courseName', 'field', 'destinatedTo', 'sessions', 'description', 'maxStudents', 'price', 'certificate'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = '';
                    // Clear error state if any
                    const parent = el.parentElement;
                    if (parent) {
                        parent.classList.remove('error');
                        const small = parent.querySelector('small');
                        if (small) small.style.display = 'none';
                    }
                }
            });

            // 2. Clear course image
            selectedCourseImage = null;
            const imageInput = document.getElementById('courseImageInput');
            const imageName = document.getElementById('courseImageName');
            const imagePreview = document.getElementById('courseImagePreview');
            const imageArea = document.querySelector('.course-image-upload');
            
            if (imageInput) imageInput.value = '';
            if (imageName) imageName.textContent = 'No image selected';
            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.innerHTML = '';
            }
            if (imageArea) {
                imageArea.style.border = '2px dashed #ccc'; // Reset border
                const msgs = imageArea.parentElement.querySelectorAll('.image-error-msg');
                msgs.forEach(msg => msg.remove());
            }

            // 3. Reset Course Structure
            courseStructure.chapters = [];
            
            // 4. Remove chapters from DOM
            const chaptersContainer = document.getElementById('chaptersContainer');
            if (chaptersContainer) {
                chaptersContainer.innerHTML = '';
                chaptersContainer.style.display = 'none';
            }

            // 5. Clear LocalStorage
            localStorage.removeItem('courseStructure');
            localStorage.removeItem('editCourseId'); 
            
            // 6. Reset button state
            btn.disabled = false;
            btn.textContent = 'Create Course';
            
            console.log('Form reset complete.');
        }
    }

    window.getCourseStructure = () => courseStructure;
}

/*=======================================
    Backend fetch request to create a course
==========================================*/
async function createCourse(courseData) {
    const token = localStorage.getItem('token');

    try {
        // Create FormData instead of JSON
        const formData = new FormData();

        // Prepare course data without file objects
        const courseDataCopy = { ...courseData };
        delete courseDataCopy.courseImage;
        
        // Remove file/video File objects from chapters
        const chaptersData = courseDataCopy.chapters.map(ch => ({
            ...ch,
            lectures: ch.lectures.map(lec => ({
                name: lec.name
                // Don't include video and files (they're File objects)
            }))
        }));
        
        courseDataCopy.chapters = chaptersData;
        
        // Add course data as JSON string
        formData.append('courseData', JSON.stringify(courseDataCopy));

        // Add course image file
        if (courseData.courseImage) {
            formData.append('courseImage', courseData.courseImage);
        }

        // Add lecture videos and files with proper field names
        courseData.chapters.forEach((chapter, chapterIndex) => {
            chapter.lectures.forEach((lecture, lectureIndex) => {
                // Add video for this lecture
                if (lecture.video) {
                    formData.append(`video_${chapterIndex}_${lectureIndex}`, lecture.video);
                }

                // Add files for this lecture
                if (lecture.files && lecture.files.length > 0) {
                    lecture.files.forEach(file => {
                        formData.append(`files_${chapterIndex}_${lectureIndex}`, file);
                    });
                }
            });
        });

        // Send FormData (NOT JSON)
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_COURSE}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // DON'T set Content-Type - browser will set it automatically with boundary
            },
            body: formData  // Send FormData instead of JSON.stringify
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || 'Failed to create course');
            if (data.errors) {
                error.errors = data.errors;
            }
            throw error;
        }

        return data.course;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

function setErrorFor(input, msg) {
    const parent = input.parentElement;
    const small = parent.querySelector('small') || createErrorElement(parent);
    parent.classList.add('error');
    small.textContent = msg;
    small.style.display = 'block';
}

function createErrorElement(parent) {
    const small = document.createElement('small');
    small.className = 'error-message';
    parent.appendChild(small);
    return small;
}

function showNotification(msg, type) {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = msg;
    div.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'success' ? '#4CAF50' : '#f44336'};color:white;padding:1rem 2rem;border-radius:10px;z-index:9999;animation:slideIn 0.3s`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function initSidebar() {
    const sidebar = document.getElementById('sidebare');
    const toggle = document.getElementById('sidebarToggle');
    const close = document.getElementById('sidebarClose');
    const overlay = document.querySelector('.sidebare-overlay') || createOverlay();

    function createOverlay() {
        const el = document.createElement('div');
        el.className = 'sidebare-overlay';
        document.body.appendChild(el);
        return el;
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (window.innerWidth <= 600) overlay.classList.toggle('active');
        });
    }

    if (close) {
        close.addEventListener('click', () => {
            sidebar.classList.add('collapsed');
            overlay.classList.remove('active');
        });
    }

    overlay.addEventListener('click', () => {
        sidebar.classList.add('collapsed');
        overlay.classList.remove('active');
    });
}

function initProfileButton() {
    const btn = document.querySelector('.btn-profile');
    if (btn) {
        btn.addEventListener('click', () => {
            setTimeout(() => window.location.href = '../profile/profile.html', 300);
        });
    }
}