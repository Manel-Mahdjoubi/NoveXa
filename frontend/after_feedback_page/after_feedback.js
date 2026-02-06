document.addEventListener("DOMContentLoaded", () => {
  /* MOBILE MENU TOGGLE */
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuToggle && mobileMenu) {
    // Open / close the menu on click
    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation(); // don't immediately close from document click

      const isOpen = mobileMenu.style.display === "flex";
      mobileMenu.style.display = isOpen ? "none" : "flex";
    });

    // Close when clicking anywhere outside the menu
    document.addEventListener("click", (event) => {
      const clickedInsideMenu =
        mobileMenu.contains(event.target) || menuToggle.contains(event.target);

      if (!clickedInsideMenu) {
        mobileMenu.style.display = "none";
      }
    });

    // Close with Escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        mobileMenu.style.display = "none";
      }
    });
  }

  /*  HIGHLIGHT CURRENT NAV LINK*/
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");

  if (navLinks.length > 0) {
    // Current file name 
    const currentFile = window.location.pathname.split("/").pop();
    let hasActive = false;

    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";

      // If the href contains the current file name, consider it "active"
      if (currentFile && href.includes(currentFile)) {
        link.style.fontWeight = "700"; // bold
        hasActive = true;
      } else {
        link.style.fontWeight = "500"; // normal weight
      }
    });

    
    // If no link matched, default to highlighting "Home"
    if (!hasActive) {
      navLinks.forEach((link) => {
        if (link.textContent.trim().toLowerCase() === "home") {
          link.style.fontWeight = "700";
        }
      });
    }
  }
});
