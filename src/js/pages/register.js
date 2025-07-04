import AuthService from '../services/auth.service.js';
import { USER_ROLES, COURSES, ROUTES } from '../utils/constants.js';
import { validateEmail, validatePassword, showAlert, showLoader } from '../utils/helpers.js';

class RegisterPage {
  constructor() {
    this.form = document.getElementById('registerForm');
    this.nameInput = document.getElementById('username');
    this.emailInput = document.getElementById('email');
    this.roleSelect = document.getElementById('role');
    this.courseSelect = document.getElementById('course');
    this.courseDiv = document.getElementById('courseDiv');
    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');
    this.togglePasswordBtn = document.getElementById('togglePassword');
    this.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    this.registerBtn = document.getElementById('registerBtn');
    this.messageContainer = document.getElementById('registerMessage');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthState();
    this.initializeCourseVisibility();
  }

  async checkAuthState() {
    await AuthService.init();
    
    // If user is already logged in, redirect to appropriate page
    if (AuthService.isAuthenticated()) {
      this.redirectBasedOnRole();
    }
  }

  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Role change handler
    this.roleSelect.addEventListener('change', () => this.handleRoleChange());
    
    // Password toggles
    this.togglePasswordBtn?.addEventListener('click', () => this.togglePassword('password'));
    this.toggleConfirmPasswordBtn?.addEventListener('click', () => this.togglePassword('confirmPassword'));
    
    // Real-time validation
    this.nameInput.addEventListener('blur', () => this.validateNameField());
    this.emailInput.addEventListener('blur', () => this.validateEmailField());
    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
    this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPasswordField());
    
    // Clear validation on input
    [this.nameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput].forEach(input => {
      input.addEventListener('input', () => this.clearFieldValidation(input));
    });
  }

  initializeCourseVisibility() {
    // Initially hide course selection
    this.courseDiv.style.display = 'none';
    this.courseSelect.required = false;
  }

  handleRoleChange() {
    const selectedRole = this.roleSelect.value;
    
    if (selectedRole === USER_ROLES.STUDENT) {
      this.courseDiv.style.display = 'block';
      this.courseSelect.required = true;
    } else {
      this.courseDiv.style.display = 'none';
      this.courseSelect.required = false;
      this.courseSelect.value = '';
    }
  }

  togglePassword(type) {
    const input = type === 'password' ? this.passwordInput : this.confirmPasswordInput;
    const btn = type === 'password' ? this.togglePasswordBtn : this.toggleConfirmPasswordBtn;
    
    const currentType = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', currentType);
    
    const icon = btn.querySelector('i');
    icon.className = currentType === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
  }

  validateNameField() {
    const name = this.nameInput.value.trim();
    const isValid = name.length >= 2;
    
    this.toggleFieldValidation(this.nameInput, isValid, 'Name must be at least 2 characters long');
    return isValid;
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
    
    // Re-validate confirm password if it has a value
    if (this.confirmPasswordInput.value) {
      this.validateConfirmPasswordField();
    }
    
    return isValid;
  }

  validateConfirmPasswordField() {
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;
    const isValid = password === confirmPassword && password.length > 0;
    
    this.toggleFieldValidation(this.confirmPasswordInput, isValid, 'Passwords do not match');
    return isValid;
  }

  validateRoleField() {
    const role = this.roleSelect.value;
    const isValid = Object.values(USER_ROLES).includes(role);
    
    this.toggleFieldValidation(this.roleSelect, isValid, 'Please select a valid role');
    return isValid;
  }

  validateCourseField() {
    const role = this.roleSelect.value;
    const course = this.courseSelect.value;
    
    if (role === USER_ROLES.STUDENT) {
      const isValid = Object.values(COURSES).includes(course);
      this.toggleFieldValidation(this.courseSelect, isValid, 'Please select a course');
      return isValid;
    }
    
    return true; // Course not required for non-students
  }

  toggleFieldValidation(field, isValid, errorMessage) {
    const container = field.closest('.col-md-6') || field.parentNode.parentNode;
    const feedbackElement = container.querySelector('.invalid-feedback') || 
                           this.createFeedbackElement(container);
    
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
    const container = field.closest('.col-md-6') || field.parentNode.parentNode;
    const feedbackElement = container.querySelector('.invalid-feedback');
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
    const btnText = this.registerBtn.querySelector('.btn-text');
    const spinner = this.registerBtn.querySelector('.spinner-border');
    
    if (loading) {
      btnText.textContent = 'Creating Account...';
      spinner.classList.remove('d-none');
      this.registerBtn.disabled = true;
    } else {
      btnText.textContent = 'Create Account';
      spinner.classList.add('d-none');
      this.registerBtn.disabled = false;
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
      name: this.nameInput.value.trim(),
      email: this.emailInput.value.trim(),
      role: this.roleSelect.value,
      course: this.courseSelect.value,
      password: this.passwordInput.value,
      confirmPassword: this.confirmPasswordInput.value
    };
    
    // Validate all fields
    const validations = [
      this.validateNameField(),
      this.validateEmailField(),
      this.validatePasswordField(),
      this.validateConfirmPasswordField(),
      this.validateRoleField(),
      this.validateCourseField()
    ];
    
    if (!validations.every(Boolean)) {
      this.showMessage('Please fix the errors in the form', 'danger');
      return;
    }

    try {
      this.setButtonLoading(true);
      this.clearMessage();
      
      // Attempt registration
      const result = await AuthService.register(formData);
      
      if (result.success) {
        this.showMessage('Registration successful! You can now login.', 'success');
        
        // Reset form
        this.form.reset();
        this.initializeCourseVisibility();
        
        // Clear all validations
        [this.nameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput, this.roleSelect, this.courseSelect].forEach(field => {
          this.clearFieldValidation(field);
        });
        
        // Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = ROUTES.LOGIN;
        }, 2000);
      } else {
        this.showMessage(result.error, 'danger');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
      this.setButtonLoading(false);
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

// Initialize register page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RegisterPage();
});