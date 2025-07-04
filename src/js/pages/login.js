import AuthService from '../services/auth.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';
import { validateEmail, validatePassword, showAlert, showLoader } from '../utils/helpers.js';

class LoginPage {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.messageContainer = document.getElementById('loginMessage');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthState();
  }

  async checkAuthState() {
    await AuthService.init();
    
    // If user is already logged in, redirect based on role
    if (AuthService.isAuthenticated()) {
      this.redirectBasedOnRole();
    }
  }

  setupEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Real-time validation
    this.emailInput.addEventListener('blur', () => this.validateEmailField());
    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
  }

  validateEmailField() {
    const email = this.emailInput.value.trim();
    const isValid = validateEmail(email);
    
    this.toggleFieldValidation(this.emailInput, isValid, 'Please enter a valid email address');
    return isValid;
  }

  validatePasswordField() {
    const password = this.passwordInput.value;
    const isValid = validatePassword(password);
    
    this.toggleFieldValidation(this.passwordInput, isValid, 'Password must be at least 6 characters long');
    return isValid;
  }

  toggleFieldValidation(field, isValid, errorMessage) {
    const feedbackElement = field.parentNode.querySelector('.invalid-feedback') || 
                           this.createFeedbackElement(field.parentNode);
    
    if (isValid) {
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
      feedbackElement.textContent = '';
      feedbackElement.style.display = 'none';
    } else {
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
      feedbackElement.textContent = errorMessage;
      feedbackElement.style.display = 'block';
    }
  }

  createFeedbackElement(parent) {
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    parent.appendChild(feedback);
    return feedback;
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    
    // Validate inputs
    const isEmailValid = this.validateEmailField();
    const isPasswordValid = this.validatePasswordField();
    
    if (!isEmailValid || !isPasswordValid) {
      this.showMessage('Please fix the errors above', 'danger');
      return;
    }

    try {
      showLoader(true);
      this.clearMessage();
      
      // Attempt login
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        showAlert('Login successful! Redirecting...', 'success');
        await this.handleSuccessfulLogin(result.role);
      } else {
        this.showMessage(result.error, 'danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
      showLoader(false);
    }
  }

  async handleSuccessfulLogin(role) {
    try {
      if (role === USER_ROLES.ADMIN) {
        window.location.href = ROUTES.ADMIN;
      } else if (role === USER_ROLES.COUNSELOR) {
        window.location.href = ROUTES.DASHBOARD;
      } else if (role === USER_ROLES.STUDENT) {
        // Check if student has assigned exam level
        const userData = await AuthService.getCurrentUserData();
        const examLevelResult = await import('../services/exam.service.js')
          .then(module => module.default.getUserExamLevel(AuthService.currentUser.uid));
        
        if (examLevelResult.success) {
          window.location.href = ROUTES.EXAM;
        } else {
          this.showMessage('Your exam is not yet assigned. Please wait for counselor approval.', 'warning');
          await AuthService.logout();
        }
      } else {
        this.showMessage('Unrecognized user role. Please contact support.', 'danger');
        await AuthService.logout();
      }
    } catch (error) {
      console.error('Error handling successful login:', error);
      this.showMessage('Error processing login. Please try again.', 'danger');
    }
  }

  redirectBasedOnRole() {
    const role = AuthService.userRole;
    
    if (role === USER_ROLES.ADMIN) {
      window.location.href = ROUTES.ADMIN;
    } else if (role === USER_ROLES.COUNSELOR) {
      window.location.href = ROUTES.DASHBOARD;
    } else if (role === USER_ROLES.STUDENT) {
      window.location.href = ROUTES.EXAM;
    }
  }

  showMessage(message, type = 'info') {
    if (!this.messageContainer) return;
    
    this.messageContainer.textContent = message;
    this.messageContainer.className = `alert alert-${type} mt-3`;
    this.messageContainer.style.display = 'block';
  }

  clearMessage() {
    if (this.messageContainer) {
      this.messageContainer.textContent = '';
      this.messageContainer.style.display = 'none';
    }
  }
}

// Initialize login page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoginPage();
});