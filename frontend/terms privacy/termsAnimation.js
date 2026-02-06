const observerOptions = {
    threshold: 0.15, 
    rootMargin: '0px 0px -50px 0px' 
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            
        }
    });
}, observerOptions);

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.scroll-animate, .slide-left, .slide-right, .scale-up, .fade-in'
    );
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

document.addEventListener('DOMContentLoaded', initScrollAnimations);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});