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
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Role change handler
    this.roleSelect.addEventListener('change', () => this.handleRoleChange());
    
    // Real-time validation
    this.nameInput.addEventListener('blur', () => this.validateNameField());
    this.emailInput.addEventListener('blur', () => this.validateEmailField());
    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
    this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPasswordField());
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
      showAlert('Please fix the errors in the form', 'danger');
      return;
    }

    try {
      showLoader(true);
      
      // Attempt registration
      const result = await AuthService.register(formData);
      
      if (result.success) {
        showAlert('Registration successful! You can now login.', 'success');
        
        // Reset form
        this.form.reset();
        this.initializeCourseVisibility();
        
        // Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = ROUTES.LOGIN;
        }, 2000);
      } else {
        showAlert(result.error, 'danger');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('An unexpected error occurred. Please try again.', 'danger');
    } finally {
      showLoader(false);
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
}

// Initialize register page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RegisterPage();
});