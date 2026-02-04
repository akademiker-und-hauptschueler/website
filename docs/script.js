/** Copyright (C) 2026 Der Akademiker und der Hauptschüler
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*
* Author: Der Akademiker und der Hauptschüler
*/

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling to all navigation links
    const navLinks = document.querySelectorAll('.nav a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add scroll effect to header
    const header = document.querySelector('.header');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });

    // Add fade-in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    const elementsToAnimate = document.querySelectorAll('.topic-card, .host-card, .episode-card, .platform-card');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Update platform links when they become available
    function updatePlatformLinks() {
        // This function can be called to update platform links dynamically
        // For now, it's just a placeholder
        console.log('Platform links can be updated here when available');
    }

    // Add click tracking for external links
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Analytics tracking can be added here
            console.log('External link clicked:', this.href);
        });
    });

    // Add loading state for episode links that are "Coming Soon"
    const comingSoonLinks = document.querySelectorAll('.coming-soon');
    comingSoonLinks.forEach(link => {
        if (link.tagName === 'A') {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // Show a nice message instead of navigating
                alert('Diese Episode ist noch nicht verfügbar. Bleib dran! 🎧');
            });
        }
    });

    // Mobile menu toggle (if needed in the future)
    function createMobileMenu() {
        const nav = document.querySelector('.nav');
        const headerContent = document.querySelector('.header-content');
        
        // This can be expanded for a mobile hamburger menu
        if (window.innerWidth <= 768) {
            // Mobile menu logic can be added here
        }
    }

    // Call mobile menu function on resize
    window.addEventListener('resize', createMobileMenu);
    createMobileMenu();
});

// Toggle function for Impressum section
function toggleImpressum() {
    const content = document.getElementById('impressum-content');
    const button = document.querySelector('.impressum-button');
    const icon = document.querySelector('.toggle-icon');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.textContent = '▼';
        button.setAttribute('aria-expanded', 'false');
    } else {
        content.classList.add('expanded');
        icon.textContent = '▲';
        button.setAttribute('aria-expanded', 'true');
    }
}
