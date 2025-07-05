// Home page functionality
import AuthService from '../services/auth.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';

class HomePage {
  constructor() {
    this.init();
  }

  async init() {
    // Initialize auth service
    await AuthService.init();
    
    // If user is already logged in, update navigation
    if (AuthService.isAuthenticated()) {
      this.updateNavigationForLoggedInUser();
    }
    
    // Setup event listeners
    this.setupEventListeners();
  }

  updateNavigationForLoggedInUser() {
    const navList = document.querySelector('.navbar-nav');
    if (!navList) return;

    // Clear existing nav items
    navList.innerHTML = '';

    // Add role-specific navigation
    const role = AuthService.userRole;
    
    if (role === USER_ROLES.ADMIN) {
      navList.innerHTML = `
        <li><a href="${ROUTES.ADMIN}" class="nav-link">Admin Dashboard</a></li>
        <li><button id="logoutBtn" class="btn btn-outline-danger btn-sm">Logout</button></li>
      `;
    } else if (role === USER_ROLES.COUNSELOR) {
      navList.innerHTML = `
        <li><a href="${ROUTES.DASHBOARD}" class="nav-link">Dashboard</a></li>
        <li><a href="${ROUTES.ASSIGN_LEVEL}" class="nav-link">Assign Levels</a></li>
        <li><button id="logoutBtn" class="btn btn-outline-danger btn-sm">Logout</button></li>
      `;
    } else if (role === USER_ROLES.STUDENT) {
      navList.innerHTML = `
        <li><a href="${ROUTES.EXAM}" class="nav-link">Take Exam</a></li>
        <li><button id="logoutBtn" class="btn btn-outline-danger btn-sm">Logout</button></li>
      `;
    }

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  setupEventListeners() {
    // Smooth scrolling for anchor links
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

    // Add loading states to CTA buttons
    document.querySelectorAll('.btn').forEach(btn => {
      if (btn.href && (btn.href.includes('login') || btn.href.includes('register'))) {
        btn.addEventListener('click', function() {
          this.classList.add('btn-loading');
        });
      }
    });
  }

  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

// Initialize home page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HomePage();
});

// Add intersection observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
    }
  });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card, .section').forEach(el => {
    observer.observe(el);
  });
});