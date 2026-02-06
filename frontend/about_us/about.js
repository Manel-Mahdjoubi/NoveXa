document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (!menuToggle || !mobileMenu) return;

  // helper functions 
  const setBodyScroll = (lock) => {
    document.body.style.overflow = lock ? "hidden" : "";
  };

  const setAria = (isOpen) => {
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  const openMenu = () => {
    mobileMenu.classList.add("active");
    setBodyScroll(true);
    setAria(true);
  };

  const closeMenu = () => {
    mobileMenu.classList.remove("active");
    setBodyScroll(false);
    setAria(false);
  };

  const toggleMenu = () => {
    const isOpen = !mobileMenu.classList.contains("active");
    isOpen ? openMenu() : closeMenu();
  };

  //important accessability preferences
  menuToggle.setAttribute("role", "button");
  menuToggle.setAttribute("tabindex", "0");
  menuToggle.setAttribute("aria-controls", "mobileMenu");
  menuToggle.setAttribute("aria-expanded", "false");

  // open and close wih mouse
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation(); //not any click can close it 
    toggleMenu();
  });

  //open &close with keyboard
  menuToggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMenu();
    }
  });

  // close menu when u click outside
  document.addEventListener("click", (e) => {
    if (
      mobileMenu.classList.contains("active") &&
      !mobileMenu.contains(e.target) &&
      !menuToggle.contains(e.target)
    ) {
      closeMenu();
    }
  });

  // close menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  // close menu when link is clicked 
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  //delect btwn links
  const currentFile = window.location.pathname.split("/").pop();
  document
    .querySelectorAll(".nav-links a, .mobile-menu a")
    .forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const linkFile = href.split("/").pop();
      if (linkFile === currentFile) {
        link.style.fontWeight = "700"; 
      }
    });
});
