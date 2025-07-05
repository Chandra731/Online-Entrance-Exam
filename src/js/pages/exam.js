import { auth, db } from '../config/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AuthService from '../services/auth.service.js';
import ExamService from '../services/exam.service.js';
import { QuestionNavigator } from '../components/QuestionNavigator.js';
import { Timer } from '../components/Timer.js';
import { WebcamMonitor } from '../components/WebcamMonitor.js';
import { EXAM_CONFIG, USER_ROLES, ROUTES } from '../utils/constants.js';
import { showAlert, showLoader } from '../utils/helpers.js';

class ExamPage {
  constructor() {
    this.examState = {
      currentSection: 0,
      currentQuestion: 0,
      answers: {},
      markedQuestions: new Set(),
      timeRemaining: {
        section: EXAM_CONFIG.SECTION_TIME,
        total: EXAM_CONFIG.TOTAL_TIME
      },
      examLevel: null,
      questions: [],
      questionsBySection: {},
      sectionList: [],
      isActive: false,
      warningCount: 0,
      webcamReady: false
    };

    this.components = {
      questionNavigator: null,
      sectionTimer: null,
      totalTimer: null,
      webcamMonitor: null
    };

    this.elements = {};
    this.intervals = [];
    
    this.init();
  }

  async init() {
    try {
      showLoader(true);
      
      // Initialize auth service
      await AuthService.init();
      
      // Check authentication and role
      if (!AuthService.isAuthenticated()) {
        window.location.href = ROUTES.LOGIN;
        return;
      }

      if (!AuthService.hasRole(USER_ROLES.STUDENT)) {
        showAlert('Access denied. Student access only.', 'danger');
        setTimeout(() => window.location.href = ROUTES.LOGIN, 3000);
        return;
      }

      // Get DOM elements
      this.getDOMElements();
      
      // Load exam data
      await this.loadExamData();
      
      // Initialize components
      await this.initializeComponents();
      
      // Check webcam status and handle accordingly
      if (!this.examState.webcamReady) {
        this.handleWebcamFailure();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Show guidelines modal
      this.showGuidelinesModal();
      
      showLoader(false);
    } catch (error) {
      console.error('Error initializing exam:', error);
      showAlert('Failed to initialize exam. Please try again.', 'danger');
      showLoader(false);
    }
  }

  getDOMElements() {
    this.elements = {
      // Navbar elements
      examCode: document.getElementById('examCode'),
      sectionTimer: document.getElementById('sectionTimer'),
      totalTimer: document.getElementById('totalTimer'),
      networkStatus: document.getElementById('networkStatus'),
      logoutBtn: document.getElementById('logoutBtn'),

      // Question panel elements
      sectionTitle: document.getElementById('sectionTitle'),
      questionNumber: document.getElementById('questionNumber'),
      questionText: document.getElementById('questionText'),
      optionsForm: document.getElementById('optionsForm'),
      progressBar: document.querySelector('.exam-progress-bar'),

      // Navigation elements
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      clearResponseBtn: document.getElementById('clearResponseBtn'),
      markBtn: document.getElementById('markBtn'),
      submitBtn: document.getElementById('submitBtn'),

      // Sidebar elements
      questionNavigator: document.getElementById('questionNavigator'),
      webcamContainer: document.getElementById('webcamContainer'),

      // Modal elements
      guidelinesModal: document.getElementById('guidelinesModal'),
      agreeCheckbox: document.getElementById('agreeCheckbox'),
      startExamBtn: document.getElementById('startExamBtn')
    };
  }

  async loadExamData() {
    try {
      // Get user's assigned exam level
      const levelResult = await ExamService.getUserExamLevel(AuthService.currentUser.uid);
      if (!levelResult.success) {
        throw new Error(levelResult.error);
      }

      this.examState.examLevel = levelResult.level;
      this.elements.examCode.textContent = this.examState.examLevel;

      // Load questions for the assigned level
      const questionsResult = await ExamService.getQuestionsByLevel(this.examState.examLevel);
      if (!questionsResult.success) {
        throw new Error(questionsResult.error);
      }

      this.organizeQuestions(questionsResult.questions);
    } catch (error) {
      console.error('Error loading exam data:', error);
      throw error;
    }
  }

  organizeQuestions(questions) {
    // Group questions by section
    this.examState.questionsBySection = {};
    questions.forEach(question => {
      const section = question.section || 'General';
      if (!this.examState.questionsBySection[section]) {
        this.examState.questionsBySection[section] = [];
      }
      this.examState.questionsBySection[section].push(question);
    });

    // Create section list and flatten questions
    this.examState.sectionList = Object.keys(this.examState.questionsBySection).sort();
    this.examState.questions = [];
    
    this.examState.sectionList.forEach(section => {
      this.examState.questions.push(...this.examState.questionsBySection[section]);
    });

    // Initialize answers structure
    this.examState.sectionList.forEach((section, index) => {
      this.examState.answers[index] = {};
    });
  }

  async initializeComponents() {
    // Initialize Question Navigator
    const currentSectionQuestions = this.getCurrentSectionQuestions();
    this.components.questionNavigator = new QuestionNavigator('questionNavigator', {
      questions: currentSectionQuestions,
      currentQuestion: this.examState.currentQuestion,
      answers: this.examState.answers[this.examState.currentSection] || {},
      markedQuestions: this.examState.markedQuestions,
      onQuestionClick: (questionIndex) => this.navigateToQuestion(questionIndex)
    });

    // Initialize Timers
    this.components.sectionTimer = new Timer('sectionTimer', {
      initialTime: this.examState.timeRemaining.section,
      label: 'Section',
      onTimeUp: () => this.handleSectionTimeUp(),
      onTick: (time) => this.examState.timeRemaining.section = time,
      warningThreshold: 300 // 5 minutes
    });

    this.components.totalTimer = new Timer('totalTimer', {
      initialTime: this.examState.timeRemaining.total,
      label: 'Total',
      onTimeUp: () => this.handleTotalTimeUp(),
      onTick: (time) => this.examState.timeRemaining.total = time,
      warningThreshold: 600 // 10 minutes
    });

    // Initialize Webcam Monitor
    this.components.webcamMonitor = new WebcamMonitor('webcamContainer', {
      onSnapshotCapture: (base64Image) => this.handleSnapshotCapture(base64Image),
      snapshotInterval: EXAM_CONFIG.SNAPSHOT_INTERVAL
    });

    // Initialize components and check webcam status
    this.components.questionNavigator.init();
    this.components.sectionTimer.init();
    this.components.totalTimer.init();
    
    // Await webcam initialization and store the result
    this.examState.webcamReady = await this.components.webcamMonitor.init();
  }

  handleWebcamFailure() {
    // Disable the agree checkbox and start exam button
    if (this.elements.agreeCheckbox) {
      this.elements.agreeCheckbox.disabled = true;
      this.elements.agreeCheckbox.checked = false;
    }
    
    if (this.elements.startExamBtn) {
      this.elements.startExamBtn.disabled = true;
    }

    // Show prominent error message
    showAlert('Webcam access is required to start the exam. Please grant camera permissions and refresh the page.', 'danger');
  }

  setupEventListeners() {
    // Guidelines modal
    this.elements.agreeCheckbox?.addEventListener('change', (e) => {
      // Only enable start button if webcam is ready and checkbox is checked
      this.elements.startExamBtn.disabled = !e.target.checked || !this.examState.webcamReady;
    });

    this.elements.startExamBtn?.addEventListener('click', () => this.startExam());

    // Navigation buttons
    this.elements.prevBtn?.addEventListener('click', () => this.navigatePrevious());
    this.elements.nextBtn?.addEventListener('click', () => this.navigateNext());
    this.elements.clearResponseBtn?.addEventListener('click', () => this.clearResponse());
    this.elements.markBtn?.addEventListener('click', () => this.toggleMarkQuestion());
    this.elements.submitBtn?.addEventListener('click', () => this.submitExam());

    // Option selection
    this.elements.optionsForm?.addEventListener('change', (e) => this.handleOptionSelection(e));

    // Logout button
    this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());

    // Network status monitoring
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());

    // Exam security events
    this.setupSecurityListeners();
  }

  setupSecurityListeners() {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => {
      if (this.examState.isActive) {
        e.preventDefault();
        this.handleSecurityViolation('Right-click disabled during exam');
      }
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.examState.isActive && (e.ctrlKey || e.metaKey)) {
        const blockedKeys = ['c', 'v', 'a', 'p', 's', 'u', 'i'];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          this.handleSecurityViolation('Keyboard shortcuts disabled during exam');
        }
      }
    });

    // Tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.examState.isActive) {
        this.handleSecurityViolation('Tab switching detected');
      }
    });

    // Window focus/blur
    window.addEventListener('blur', () => {
      if (this.examState.isActive) {
        this.handleSecurityViolation('Window focus lost');
      }
    });
  }

  showGuidelinesModal() {
    const modal = new bootstrap.Modal(this.elements.guidelinesModal);
    modal.show();
  }

  async startExam() {
    try {
      // Explicitly check webcam readiness before starting
      if (!this.examState.webcamReady) {
        showAlert('Cannot start exam: Webcam access is required.', 'danger');
        return;
      }

      this.examState.isActive = true;
      
      // Hide guidelines modal
      const modal = bootstrap.Modal.getInstance(this.elements.guidelinesModal);
      modal.hide();

      // Start timers
      this.components.sectionTimer.start();
      this.components.totalTimer.start();

      // Start auto-save
      this.startAutoSave();

      // Show first question
      this.showCurrentQuestion();

      // Update network status
      this.updateNetworkStatus();

      showAlert('Exam started successfully!', 'success');
    } catch (error) {
      console.error('Error starting exam:', error);
      showAlert('Failed to start exam. Please try again.', 'danger');
    }
  }

  showCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (!question) return;

    // Update question display
    this.elements.questionNumber.textContent = `Question ${this.examState.currentQuestion + 1}`;
    this.elements.questionText.textContent = question.question;
    this.elements.sectionTitle.textContent = this.examState.sectionList[this.examState.currentSection];

    // Update options
    const options = ['A', 'B', 'C', 'D'];
    options.forEach(option => {
      const input = document.getElementById(`option${option}`);
      const label = document.getElementById(`label${option}`);
      
      if (input && label) {
        label.textContent = question.options[option];
        input.checked = this.getCurrentAnswer() === option;
      }
    });

    // Update navigation buttons
    this.updateNavigationButtons();

    // Update mark button
    this.updateMarkButton();

    // Update progress bar
    this.updateProgressBar();

    // Update question navigator
    this.updateQuestionNavigator();
  }

  getCurrentQuestion() {
    const sectionQuestions = this.getCurrentSectionQuestions();
    return sectionQuestions[this.examState.currentQuestion] || null;
  }

  getCurrentSectionQuestions() {
    const sectionName = this.examState.sectionList[this.examState.currentSection];
    return this.examState.questionsBySection[sectionName] || [];
  }

  getCurrentAnswer() {
    const sectionAnswers = this.examState.answers[this.examState.currentSection] || {};
    return sectionAnswers[this.examState.currentQuestion];
  }

  updateNavigationButtons() {
    // Previous button
    this.elements.prevBtn.disabled = this.examState.currentQuestion === 0;

    // Next button
    const sectionQuestions = this.getCurrentSectionQuestions();
    const isLastQuestionInSection = this.examState.currentQuestion === sectionQuestions.length - 1;
    const isLastSection = this.examState.currentSection === this.examState.sectionList.length - 1;

    if (isLastQuestionInSection) {
      if (isLastSection) {
        this.elements.nextBtn.textContent = 'Submit Exam';
        this.elements.submitBtn.classList.remove('d-none');
      } else {
        this.elements.nextBtn.textContent = 'Next Section';
      }
    } else {
      this.elements.nextBtn.textContent = 'Next';
      this.elements.submitBtn.classList.add('d-none');
    }
  }

  updateMarkButton() {
    const isMarked = this.examState.markedQuestions.has(this.getGlobalQuestionIndex());
    this.elements.markBtn.textContent = isMarked ? 'Unmark' : 'Mark for Review';
  }

  updateProgressBar() {
    const totalQuestions = this.examState.questions.length;
    const answeredQuestions = this.getAnsweredQuestionsCount();
    const progress = (answeredQuestions / totalQuestions) * 100;
    this.elements.progressBar.style.width = `${progress}%`;
  }

  updateQuestionNavigator() {
    if (this.components.questionNavigator) {
      this.components.questionNavigator.update({
        currentQuestion: this.examState.currentQuestion,
        answers: this.examState.answers[this.examState.currentSection] || {},
        markedQuestions: this.examState.markedQuestions
      });
    }
  }

  getGlobalQuestionIndex() {
    let globalIndex = 0;
    for (let i = 0; i < this.examState.currentSection; i++) {
      const sectionName = this.examState.sectionList[i];
      globalIndex += this.examState.questionsBySection[sectionName].length;
    }
    return globalIndex + this.examState.currentQuestion;
  }

  getAnsweredQuestionsCount() {
    let count = 0;
    Object.values(this.examState.answers).forEach(sectionAnswers => {
      count += Object.keys(sectionAnswers).length;
    });
    return count;
  }

  handleOptionSelection(event) {
    const selectedOption = event.target.value;
    if (!this.examState.answers[this.examState.currentSection]) {
      this.examState.answers[this.examState.currentSection] = {};
    }
    this.examState.answers[this.examState.currentSection][this.examState.currentQuestion] = selectedOption;
    
    this.updateQuestionNavigator();
    this.updateProgressBar();
    this.saveExamState();
  }

  clearResponse() {
    // Clear from answers
    if (this.examState.answers[this.examState.currentSection]) {
      delete this.examState.answers[this.examState.currentSection][this.examState.currentQuestion];
    }
    
    // Clear form
    this.elements.optionsForm.reset();
    
    this.updateQuestionNavigator();
    this.updateProgressBar();
    this.saveExamState();
  }

  toggleMarkQuestion() {
    const globalIndex = this.getGlobalQuestionIndex();
    if (this.examState.markedQuestions.has(globalIndex)) {
      this.examState.markedQuestions.delete(globalIndex);
    } else {
      this.examState.markedQuestions.add(globalIndex);
    }
    
    this.updateMarkButton();
    this.updateQuestionNavigator();
    this.saveExamState();
  }

  navigateToQuestion(questionIndex) {
    this.examState.currentQuestion = questionIndex;
    this.showCurrentQuestion();
  }

  navigatePrevious() {
    if (this.examState.currentQuestion > 0) {
      this.examState.currentQuestion--;
      this.showCurrentQuestion();
    }
  }

  navigateNext() {
    const sectionQuestions = this.getCurrentSectionQuestions();
    
    if (this.examState.currentQuestion < sectionQuestions.length - 1) {
      // Move to next question in current section
      this.examState.currentQuestion++;
      this.showCurrentQuestion();
    } else {
      // Last question in section
      if (this.examState.currentSection < this.examState.sectionList.length - 1) {
        // Move to next section
        this.moveToNextSection();
      } else {
        // Last question in last section - submit exam
        this.submitExam();
      }
    }
  }

  moveToNextSection() {
    // Check if section time is up
    if (this.examState.timeRemaining.section > 0) {
      if (!confirm('Time is still remaining for this section. Do you want to move to the next section?')) {
        return;
      }
    }

    this.examState.currentSection++;
    this.examState.currentQuestion = 0;
    this.examState.timeRemaining.section = EXAM_CONFIG.SECTION_TIME;

    // Reset section timer
    this.components.sectionTimer.reset(EXAM_CONFIG.SECTION_TIME);
    this.components.sectionTimer.start();

    // Update question navigator for new section
    const newSectionQuestions = this.getCurrentSectionQuestions();
    this.components.questionNavigator = new QuestionNavigator('questionNavigator', {
      questions: newSectionQuestions,
      currentQuestion: 0,
      answers: this.examState.answers[this.examState.currentSection] || {},
      markedQuestions: this.examState.markedQuestions,
      onQuestionClick: (questionIndex) => this.navigateToQuestion(questionIndex)
    });
    this.components.questionNavigator.init();

    this.showCurrentQuestion();
    showAlert(`Moved to ${this.examState.sectionList[this.examState.currentSection]} section`, 'info');
  }

  handleSectionTimeUp() {
    showAlert('Section time is up! Moving to next section.', 'warning');
    
    if (this.examState.currentSection < this.examState.sectionList.length - 1) {
      this.moveToNextSection();
    } else {
      this.submitExam();
    }
  }

  handleTotalTimeUp() {
    showAlert('Total exam time is up! Submitting exam automatically.', 'danger');
    this.submitExam();
  }

  async submitExam() {
    try {
      if (!confirm('Are you sure you want to submit the exam? This action cannot be undone.')) {
        return;
      }

      showLoader(true);
      this.examState.isActive = false;

      // Stop all timers
      Object.values(this.components).forEach(component => {
        if (component && typeof component.cleanup === 'function') {
          component.cleanup();
        }
      });

      // Calculate score
      const score = this.calculateScore();

      // Get user data
      const userData = await AuthService.getCurrentUserData();

      // Prepare result data
      const resultData = {
        examCode: this.examState.examLevel,
        studentId: AuthService.currentUser.uid,
        name: userData?.name || '',
        email: userData?.email || '',
        level: this.examState.examLevel,
        section: this.examState.sectionList.join(', '),
        score: score.correct,
        total: score.total,
        percentage: score.percentage,
        answers: this.examState.answers,
        markedQuestions: Array.from(this.examState.markedQuestions),
        timeSpent: {
          total: EXAM_CONFIG.TOTAL_TIME - this.examState.timeRemaining.total,
          section: EXAM_CONFIG.SECTION_TIME - this.examState.timeRemaining.section
        }
      };

      // Save result
      const saveResult = await ExamService.saveExamResult(resultData);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      showLoader(false);
      showAlert('Exam submitted successfully! Results will be available to your counselor.', 'success');

      // Redirect to login page after a delay
      setTimeout(() => {
        window.location.href = ROUTES.LOGIN;
      }, 3000);

    } catch (error) {
      console.error('Error submitting exam:', error);
      showLoader(false);
      showAlert('Failed to submit exam. Please try again.', 'danger');
    }
  }

  calculateScore() {
    let correct = 0;
    let total = 0;

    this.examState.sectionList.forEach((sectionName, sectionIndex) => {
      const sectionQuestions = this.examState.questionsBySection[sectionName];
      const sectionAnswers = this.examState.answers[sectionIndex] || {};

      sectionQuestions.forEach((question, questionIndex) => {
        total++;
        const userAnswer = sectionAnswers[questionIndex];
        if (userAnswer === question.correct_answer) {
          correct++;
        }
      });
    });

    return {
      correct,
      total,
      percentage: total > 0 ? (correct / total) * 100 : 0
    };
  }

  startAutoSave() {
    const autoSaveInterval = setInterval(() => {
      if (this.examState.isActive) {
        this.saveExamState();
      } else {
        clearInterval(autoSaveInterval);
      }
    }, EXAM_CONFIG.AUTO_SAVE_INTERVAL);

    this.intervals.push(autoSaveInterval);
  }

  async saveExamState() {
    try {
      const examStateData = {
        currentSection: this.examState.currentSection,
        currentQuestion: this.examState.currentQuestion,
        answers: this.examState.answers,
        markedQuestions: Array.from(this.examState.markedQuestions),
        timeRemaining: this.examState.timeRemaining,
        examLevel: this.examState.examLevel
      };

      await ExamService.saveExamState(AuthService.currentUser.uid, examStateData);
    } catch (error) {
      console.error('Error saving exam state:', error);
    }
  }

  async handleSnapshotCapture(base64Image) {
    try {
      await ExamService.saveWebcamSnapshot(AuthService.currentUser.uid, base64Image);
    } catch (error) {
      console.error('Error saving webcam snapshot:', error);
    }
  }

  handleSecurityViolation(reason) {
    this.examState.warningCount++;
    showAlert(`Warning ${this.examState.warningCount}/${EXAM_CONFIG.MAX_WARNINGS}: ${reason}`, 'warning');

    if (this.examState.warningCount >= EXAM_CONFIG.MAX_WARNINGS) {
      showAlert('Maximum warnings exceeded. Exam will be submitted automatically.', 'danger');
      setTimeout(() => this.submitExam(), 2000);
    }
  }

  updateNetworkStatus() {
    const isOnline = navigator.onLine;
    this.elements.networkStatus.textContent = isOnline ? 'Online' : 'Offline';
    this.elements.networkStatus.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
  }

  async handleLogout() {
    try {
      if (this.examState.isActive) {
        if (!confirm('Are you sure you want to logout? Your exam progress will be saved.')) {
          return;
        }
        await this.saveExamState();
      }

      await AuthService.logout();
      window.location.href = ROUTES.LOGIN;
    } catch (error) {
      console.error('Error during logout:', error);
      showAlert('Error during logout. Please try again.', 'danger');
    }
  }

  cleanup() {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Cleanup components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.cleanup === 'function') {
        component.cleanup();
      }
    });
  }
}

// Initialize exam page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ExamPage();
});

// Cleanup on page unload
window.addEventListener('beforeunload', (e) => {
  if (window.examPage && window.examPage.examState.isActive) {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your exam progress will be lost.';
    return e.returnValue;
  }
});