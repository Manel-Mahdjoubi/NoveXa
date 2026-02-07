//header script for background on scroll
window.addEventListener("scroll", function () {
  const header = document.getElementById("mainHeader");
  
  if (window.scrollY > 50) { 
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

// ===============================
//  MOBILE MENU ANIMATIONS

// ===============================

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navItems = document.querySelectorAll('.nav-item');
  const navLinks = document.querySelectorAll('.nav-link');

  if (toggle && navMenu) {
    // Toggle menu with enhanced animations
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('show');
      
      // Add haptic feedback (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Animate toggle button
      toggle.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)';
    });

    // Close menu when clicking on a link (mobile only)
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          navMenu.classList.remove('show');
          toggle.style.transform = 'rotate(0deg) scale(1)';
          
          // Add exit animation to items
          navItems.forEach((item, index) => {
            setTimeout(() => {
              item.style.transform = 'translateX(50px) rotateY(20deg)';
              item.style.opacity = '0';
            }, index * 50);
          });

          // Reset items after menu closes
          setTimeout(() => {
            navItems.forEach(item => {
              item.style.transform = '';
              item.style.opacity = '';
            });
          }, 500);
        }
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && 
          navMenu.classList.contains('show') &&
          !navMenu.contains(e.target) && 
          !toggle.contains(e.target)) {
        
        navMenu.classList.remove('show');
        toggle.style.transform = 'rotate(0deg) scale(1)';
        
        // Smooth exit animation
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
    });

    // Add touch swipe to close (mobile enhancement)
    let touchStartY = 0;
    navMenu.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });

    navMenu.addEventListener('touchmove', (e) => {
      if (window.innerWidth <= 900 && navMenu.classList.contains('show')) {
        const touchY = e.touches[0].clientY;
        const diff = touchStartY - touchY;
        
        // Swipe up to close
        if (diff > 100) {
          navMenu.classList.remove('show');
          toggle.style.transform = 'rotate(0deg) scale(1)';
        }
      }
    });
  }

  // ===============================
  // ðŸ“Œ SMOOTH SCROLLING FOR NAV LINKS
  // ===============================
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

  // ===============================
  // ðŸ“Œ CARDS AUTO-SCROLL
  // ===============================
  const cards = document.querySelector('.cards-scroll-container');

  function handleResize() {
    if (!cards) return;
    cards.style.animation = 'scroll 40s linear infinite';
  }

  window.addEventListener('resize', handleResize);
  handleResize();
});



 

//header background changing in small screens

const logo = document.getElementById("logo");
const header = document.getElementsByClassName("hero-content");
const body = document.body;

function changeLogo() {
  if (!logo) return;
  
  if (window.innerWidth <= 800) {
    logo.src = "../asset/homepage/mobile.svg";
    logo.style.borderRadius = "0%";
    logo.style.height = "300px";
    logo.style.width = "0px";
    body.style.background = "linear-gradient(to bottom, #216890 0%, #0e84c8 -20%, #ffffff 10%)";

  } else {
    logo.src = "../asset/homepage/Union.svg";
    
  }
   
  
  
  // Smooth transition effect
  logo.style.transition = 'opacity 0.3s ease';
  logo.style.opacity = '0';
  
  setTimeout(() => {
    logo.style.opacity = '1';
  }, 150);
}
// Run when page loads and when window resizes
changeLogo();
window.addEventListener("resize", changeLogo);

//nav-bar blur effect
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.pageYOffset > 50) {
    navbar.style.backdropFilter = 'blur(10px)';
  } else {
    navbar.style.backdropFilter = 'none';
  }
  navbar.style.transition = 'all 0.5s ease';
});



// Linking the homepage buttons



      const loginbtn = document.querySelector('.btn-login');

if (loginbtn) {
    loginbtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../login_page/login.html';
        }, 300);
      })};

       const regestirationbtn = document.querySelector('.btn-register');

if (regestirationbtn) {
    regestirationbtn.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../registration_page/registration_page.html';
        }, 300);
      })};

       const getstarted = document.querySelector('.cta-button');

if (getstarted) {
    getstarted.addEventListener('click', () => {
        

        setTimeout(() => ripple.remove(), 600);
        
        setTimeout(() => {
            window.location.href = '../login_page/login.html';
        }, 300);
      })};