// Using global API_CONFIG from api-config.js

// Library resources state
let libraryResources = [];
let searchTerm = "";

document.addEventListener("DOMContentLoaded", async function () {
  /* CARDS REFERENCE */
  const cardsContainer = document.querySelector(".card-grid");
  const cards = cardsContainer
    ? Array.from(cardsContainer.querySelectorAll(".card"))
    : [];

  const DEFAULT_SUBJECTS = [
    "CyberSecurity",
    "Web Technology",
    "Machine Learning",
    "Graphic Design",
    "JavaScript",
    "Marketing",
    "Astronomy"
  ];

  /* GLOBAL STATE FOR FILTERS + SEARCH*/
  let activeSubject = null;
  let sortMode = "recent";

  /* API FUNCTIONS */
  async function fetchResources() {
    try {
      const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.LIBRARY);
      const data = await response.json();
      if (data.success) {
        libraryResources = data.data;
        renderLibraryCards();
      }
    } catch (error) {
      console.error("Failed to fetch library resources:", error);
    }
  }

  /* INITIAL DATA FETCH */
  await fetchResources();

  /*MOBILE NAV MENU */
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isVisible =
        mobileMenu.style.display === "flex" ||
        mobileMenu.classList.contains("active");

      if (isVisible) {
        mobileMenu.style.display = "none";
        mobileMenu.classList.remove("active");
      } else {
        mobileMenu.style.display = "flex";
        mobileMenu.classList.add("active");
      }
    });
  }

  /*EXPLORE BUTTON -> SCROLL TO CARDS*/
  const exploreBtn = document.querySelector(".explore");
  const cardsGrid = document.querySelector(".card-grid");

  if (exploreBtn && cardsGrid) {
    exploreBtn.addEventListener("click", () => {
      cardsGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }


  // the order 
  cards.forEach((card, index) => {
    if (!card.dataset.initialIndex) {
      card.dataset.initialIndex = String(index);
    }
  });


  function renderLibraryCards() {
    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";

    // Map to keep track of subjects and their resources
    const subjectGroups = {};

    // Pre-initialize with default subjects
    DEFAULT_SUBJECTS.forEach(sub => {
      subjectGroups[sub.toLowerCase()] = {
        name: sub,
        resources: [],
        latestDate: null,
        latestUrl: "#"
      };
    });

    // Group resources by subject
    libraryResources.forEach((res) => {
      const sub = res.subject.toLowerCase();
      if (!subjectGroups[sub]) {
        subjectGroups[sub] = {
          name: res.subject,
          resources: [],
          latestUrl: res.folderUrl || res.url,
          latestDate: new Date(res.createdAt)
        };
      }
      subjectGroups[sub].resources.push(res);

      // Update latest URL/Date if this one is newer
      const resDate = new Date(res.createdAt);
      if (!subjectGroups[sub].latestDate || resDate > subjectGroups[sub].latestDate) {
        subjectGroups[sub].latestDate = resDate;
      }
      
      // Always store the last seen folderUrl for the subject if it exists
      if (res.folderUrl) {
        subjectGroups[sub].latestUrl = res.folderUrl;
      } else if (!subjectGroups[sub].latestUrl || subjectGroups[sub].latestUrl === "#") {
        subjectGroups[sub].latestUrl = res.url;
      }
    });

    Object.values(subjectGroups).forEach((group) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.subject = group.name.toLowerCase();

      // Store all types present in this subject for filtering
      const types = [...new Set(group.resources.map(r => r.type.toLowerCase()))];
      card.dataset.types = types.join(",");

      const updateText = group.latestDate ? `Updated: ${group.latestDate.toLocaleDateString()}` : "No resources yet";
      const resourceCount = group.resources.length;
      const countText = `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}`;

      card.innerHTML = `
        <div class="card-image">
          <img src="${getThumbnailForSubject(group.name)}" alt="${group.name}">
          <div class="card-type-tag">${countText}</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${group.name} Library</h3>
          <p class="card-desc">Explore the latest resources and project files for ${group.name}.</p>
          <div class="card-meta">
            <span class="card-subject">${group.name}</span>
            <span class="card-date">${updateText}</span>
          </div>
          <button class="card-btn">Explore Drive</button>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (group.latestUrl && group.latestUrl !== "#") {
          window.open(group.latestUrl, "_blank");
        } else {
          showNotification("No resources available for this subject yet. Be the first to contribute!", "info");
        }
      });

      cardsContainer.appendChild(card);
    });

    // Re-initialize cards array for filtering
    const updatedCards = Array.from(cardsContainer.querySelectorAll(".card"));
    window.allCards = updatedCards;
  }

  function getThumbnailForSubject(subject) {
    const sub = subject.toLowerCase();
    if (sub.includes("cyber")) return "../Novexa_assets/e_library%26courses_assets/cybersecurity.jfif";
    if (sub.includes("web") || sub.includes("java")) return "../Novexa_assets/e_library%26courses_assets/webtech_ill.jfif";
    if (sub.includes("design") || sub.includes("graphic")) return "../Novexa_assets/e_library%26courses_assets/graphic_design_ill.jfif";
    if (sub.includes("marketing")) return "../Novexa_assets/e_library%26courses_assets/marketing_ill.jfif";
    if (sub.includes("machine") || sub.includes("ai")) return "../Novexa_assets/e_library%26courses_assets/ml_ill.jfif";
    if (sub.includes("astro")) return "../Novexa_assets/e_library%26courses_assets/photography_ill.jfif";

    // Default fallback
    return "../Novexa_assets/e_library%26courses_assets/appdev_ill.jfif";
  }

  /* HELPERS */

  // checkboxes (Files / Videos / Links) types
  function getSelectedTypes() {
    const typeCheckboxes = document.querySelectorAll(
      ".filters input[type='checkbox']"
    );
    const selected = [];
    typeCheckboxes.forEach((cb) => {
      if (cb.checked) {
        const label = cb.parentElement
          ? cb.parentElement.textContent.trim().toLowerCase()
          : "";
        if (label) selected.push(label);
      }
    });
    return selected;
  }

  // Unified Filter and Sort function
  const applyFilters = function () {
    const cardsToFilter = window.allCards || cards;
    const selectedTypes = getSelectedTypes();

    const filteredCards = cardsToFilter.filter((card) => {
      const titleEl = card.querySelector(".card-title");
      const descEl = card.querySelector(".card-desc");

      const title = titleEl ? titleEl.textContent.toLowerCase() : "";
      const desc = descEl ? descEl.textContent.toLowerCase() : "";
      const cardSubject = (card.dataset.subject || "").toLowerCase();

      const textMatch =
        !searchTerm ||
        title.includes(searchTerm) ||
        desc.includes(searchTerm) ||
        cardSubject.includes(searchTerm);

      const cardTypes = (card.dataset.types || "").split(",");
      const typeMatch =
        selectedTypes.length === 0 ||
        selectedTypes.some(t => cardTypes.includes(t));

      const subjectMatch =
        !activeSubject || cardSubject === activeSubject.toLowerCase();

      return textMatch && typeMatch && subjectMatch;
    });

    // Handle Sorting
    filteredCards.sort((a, b) => {
      if (sortMode === "popular") {
        const countA = parseInt(a.querySelector(".card-type-tag")?.textContent || "0");
        const countB = parseInt(b.querySelector(".card-type-tag")?.textContent || "0");
        return countB - countA;
      } else {
        // Default: Sort by date (Recent)
        const dateAStr = a.querySelector(".card-date")?.textContent.replace("Updated: ", "") || "";
        const dateBStr = b.querySelector(".card-date")?.textContent.replace("Updated: ", "") || "";
        const dateA = dateAStr ? new Date(dateAStr) : new Date(0);
        const dateB = dateBStr ? new Date(dateBStr) : new Date(0);
        return dateB - dateA;
      }
    });

    // Re-render the container in sorted order
    if (cardsContainer) {
      cardsContainer.innerHTML = "";
      filteredCards.forEach(card => {
        card.style.display = ""; 
        cardsContainer.appendChild(card);
      });

      // Show no results message if needed
      if (filteredCards.length === 0 && (searchTerm || activeSubject || selectedTypes.length > 0)) {
        const noResults = document.createElement("div");
        noResults.className = "no-results-message";
        noResults.style.cssText = "grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;";
        noResults.innerHTML = `
          <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
          <p>No resources found matching your filters.</p>
        `;
        cardsContainer.appendChild(noResults);
      }
    }

    // Hide cards that didn't match (for reference stability)
    cardsToFilter.forEach(card => {
      if (!filteredCards.includes(card)) {
        card.style.display = "none";
      }
    });
  };

  /*  SEARCH */

  function searchCourses() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    searchTerm = input.value.toLowerCase().trim();
    applyFilters();
  }
  window.searchCourses = searchCourses;


  // live search 
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", searchCourses);
    
    // Add Enter key support
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchCourses();
      }
    });
  }

  /* TYPE FILTERS  */
  const typeCheckboxes = document.querySelectorAll(
    ".filters input[type='checkbox']"
  );
  typeCheckboxes.forEach((cb) => {
    cb.addEventListener("change", applyFilters);
  });

  /* SUBJECT FILTER BUTTONS */
  const subjectButtons = [];
  const sortButtons = [];
  const filterHeadings = document.querySelectorAll(".filters h4");

  filterHeadings.forEach((heading) => {
    const text = heading.textContent.trim().toLowerCase();
    if (text === "subject" || text === "sort by") {
      let el = heading.nextElementSibling;
      while (el && el.tagName.toLowerCase() !== "h4") {
        const btns = el.querySelectorAll("button.filter-item");
        btns.forEach(btn => {
          if (text === "subject") subjectButtons.push(btn);
          else sortButtons.push(btn);
        });
        el = el.nextElementSibling;
      }
    }
  });

  function setActiveSubjectButton(clickedBtn) {
    subjectButtons.forEach((btn) =>
      btn.classList.remove("filter-item--active")
    );
    if (clickedBtn) {
      clickedBtn.classList.add("filter-item--active");
    }
  }

  subjectButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.textContent.trim().toLowerCase();

      //click on the same button to stop filtering
      if (activeSubject === value) {
        activeSubject = null;
        setActiveSubjectButton(null);
      } else {
        activeSubject = value;
        setActiveSubjectButton(btn);
      }
      applyFilters();
    });
  });



  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.textContent.trim().toLowerCase();
      sortMode = value === "popular" ? "popular" : "recent";
      setActiveSortButton(btn);
      applyFilters(); // Trigger re-render with sorting
    });
  });

  function setActiveSortButton(clickedBtn) {
    sortButtons.forEach((btn) =>
      btn.classList.remove("filter-item--active")
    );
    if (clickedBtn) {
      clickedBtn.classList.add("filter-item--active");
    }
  }

  /* UPLOAD MODAL & DRAG-DROP FUNCTIONALITY */
  const uploadModal = document.getElementById("uploadModal");
  const closeModalBtn = document.getElementById("closeModal");
  const uploadForm = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const selectedFileDisplay = document.getElementById("selectedFileDisplay");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const removeFileBtn = document.getElementById("removeFile");
  const submitBtn = document.getElementById("submitBtn");
  const subjectSelect = document.getElementById("subjectSelect");
  const fileTitleInput = document.getElementById("fileTitle");
  const pageDropOverlay = document.getElementById("pageDropOverlay");

  let currentFile = null;

  // Open modal function
  function openUploadModal(file = null) {
    uploadModal.classList.add("active");
    if (file) {
      handleFileSelection(file);
    }
  }

  // Close modal function
  function closeUploadModal() {
    uploadModal.classList.remove("active");
    uploadForm.reset();
    currentFile = null;
    selectedFileDisplay.classList.remove("active");
    submitBtn.disabled = true;
  }

  // Handle file selection
  function handleFileSelection(file) {
    if (!file) return;

    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    selectedFileDisplay.classList.add("active");

    // Enable submit button if subject is selected
    if (subjectSelect.value) {
      submitBtn.disabled = false;
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Click on old upload button to open modal
  const uploadInput = document.getElementById("upload-input");
  const uploadImgLabel = document.querySelector(".upload-image-btn");
  const uploadActions = document.querySelector(".upload-actions");

  if (uploadImgLabel) {
    uploadImgLabel.addEventListener("click", (e) => {
      e.preventDefault();
      openUploadModal();
    });
  }

  if (uploadActions) {
    uploadActions.addEventListener("click", (e) => {
      e.preventDefault();
      openUploadModal();
    });
  }

  // Close modal button
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeUploadModal);
  }

  // Close modal when clicking outside
  if (uploadModal) {
    uploadModal.addEventListener("click", (e) => {
      if (e.target === uploadModal) {
        closeUploadModal();
      }
    });
  }

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && uploadModal.classList.contains("active")) {
      closeUploadModal();
    }
  });

  // Drop zone click
  if (dropZone) {
    dropZone.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // File input change
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleFileSelection(file);
      }
    });
  }

  // Remove file button
  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", () => {
      currentFile = null;
      fileInput.value = '';
      selectedFileDisplay.classList.remove("active");
      submitBtn.disabled = true;
    });
  }

  // Subject select change - show/hide new subject input
  const newSubjectGroup = document.getElementById("newSubjectGroup");
  const newSubjectInput = document.getElementById("newSubjectName");

  if (subjectSelect) {
    subjectSelect.addEventListener("change", () => {
      if (subjectSelect.value === "OTHER") {
        if (newSubjectGroup) newSubjectGroup.style.display = "block";
        if (newSubjectInput) newSubjectInput.required = true;
      } else {
        if (newSubjectGroup) newSubjectGroup.style.display = "none";
        if (newSubjectInput) newSubjectInput.required = false;
      }

      if (currentFile && subjectSelect.value) {
        submitBtn.disabled = false;
      } else {
        submitBtn.disabled = true;
      }
    });
  }

  // Drop zone drag events
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });
  }

  // Page-wide drag and drop
  let dragCounter = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1 && !uploadModal.classList.contains("active")) {
      pageDropOverlay.classList.add("active");
    }
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      pageDropOverlay.classList.remove("active");
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    pageDropOverlay.classList.remove("active");

    const files = e.dataTransfer.files;
    if (files.length > 0 && !uploadModal.classList.contains("active")) {
      openUploadModal(files[0]);
    }
  });

  // Form submission
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

        showNotification("Please select both a subject and a file.", "warning");

      // Prepare form data
      const token = localStorage.getItem(API_CONFIG.KEYS.TOKEN);
      if (!token) {
        showNotification("Please log in to submit resources.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading to Cloudinary...";

      try {
        // 1. Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("upload_preset", API_CONFIG.CLOUDINARY.UPLOAD_PRESET);
        formData.append("folder", "library_resources");

        const cloudRes = await fetch(API_CONFIG.CLOUDINARY.URL, {
          method: "POST",
          body: formData
        });

        const cloudData = await cloudRes.json();

        if (!cloudData.secure_url) {
          console.error("Cloudinary Error:", cloudData);
          throw new Error(cloudData.error ? cloudData.error.message : "Failed to get URL from Cloudinary");
        }

        submitBtn.textContent = "Submitting for review...";

        // 2. Submit to NoveXa Backend
        const finalSubject = subjectSelect.value === "OTHER" ? newSubjectInput.value : subjectSelect.value;

        const body = {
          title: fileTitleInput.value || currentFile.name,
          subject: finalSubject,
          type: detectType(currentFile.name),
          url: cloudData.secure_url,
          description: `Uploaded file: ${currentFile.name}`
        };

        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.LIBRARY, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
          showNotification(`File "${currentFile.name}" submitted successfully! It will appear after admin review.`, "success");
          closeUploadModal();
        } else {
          showNotification(data.message || "Failed to submit resource.", "error");
        }
      } catch (error) {
        console.error('Error:', error);
        showNotification('Error: ' + error.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit for Review";
      }
    });
  }

  function detectType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
    if (videoExts.includes(ext)) return "VIDEO";
    return "FILE";
  }

  /* MOBILE SIDEBAR TOGGLE*/
  const sidebar = document.getElementById("librarySidebar");
  const sidebarToggle = document.querySelector(".sidebar-toggle");

  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("sidebar--open");
      sidebarToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
  // Close library tools when clicking outside  
  document.addEventListener("click", (e) => {
    if (!sidebar || !sidebarToggle) return;

    const clickedInsideSidebar = sidebar.contains(e.target);
    const clickedToggle = sidebarToggle.contains(e.target);

    // If sidebar is open and click is outside both sidebar and toggle -> close  
    if (
      sidebar.classList.contains("sidebar--open") &&
      !clickedInsideSidebar &&
      !clickedToggle
    ) {
      sidebar.classList.remove("sidebar--open");
      sidebarToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Subject cards now handle redirection directly in their creation loop
});

