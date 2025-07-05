import AuthService from '../services/auth.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';
import { validateEmail, validatePassword, showAlert, showLoader } from '../utils/helpers.js';

class LoginPage {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.messageContainer = document.getElementById('loginMessage');
    this.togglePasswordBtn = document.getElementById('togglePassword');
    this.loginBtn = document.getElementById('loginBtn');
    
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
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Password toggle
    this.togglePasswordBtn?.addEventListener('click', () => this.togglePassword());
    
    // Real-time validation
    this.emailInput.addEventListener('blur', () => this.validateEmailField());
    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
    
    // Clear validation on input
    this.emailInput.addEventListener('input', () => this.clearFieldValidation(this.emailInput));
    this.passwordInput.addEventListener('input', () => this.clearFieldValidation(this.passwordInput));
  }

  togglePassword() {
    const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    this.passwordInput.setAttribute('type', type);
    
    const icon = this.togglePasswordBtn.querySelector('i');
    icon.className = type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
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
    const feedbackElement = field.parentNode.parentNode.querySelector('.invalid-feedback') || 
                           this.createFeedbackElement(field.parentNode.parentNode);
    
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

  clearFieldValidation(field) {
    field.classList.remove('is-valid', 'is-invalid');
    const feedbackElement = field.parentNode.parentNode.querySelector('.invalid-feedback');
    if (feedbackElement) {
      feedbackElement.style.display = 'none';
    }
  }

  createFeedbackElement(parent) {
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    parent.appendChild(feedback);
    return feedback;
  }

  setButtonLoading(loading) {
    const btnText = this.loginBtn.querySelector('.btn-text');
    const spinner = this.loginBtn.querySelector('.spinner-border');
    
    if (loading) {
      btnText.textContent = 'Logging in...';
      spinner.classList.remove('d-none');
      this.loginBtn.disabled = true;
    } else {
      btnText.textContent = 'Login';
      spinner.classList.add('d-none');
      this.loginBtn.disabled = false;
    }
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
      this.setButtonLoading(true);
      this.clearMessage();
      
      // Attempt login
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        this.showMessage('Login successful! Redirecting...', 'success');
        await this.handleSuccessfulLogin(result.role);
      } else {
        this.showMessage(result.error, 'danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
      this.setButtonLoading(false);
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
    this.messageContainer.className = `alert alert-${type}`;
    this.messageContainer.classList.remove('d-none');
  }

  clearMessage() {
    if (this.messageContainer) {
      this.messageContainer.textContent = '';
      this.messageContainer.classList.add('d-none');
    }
  }
}

// Initialize login page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoginPage();
});