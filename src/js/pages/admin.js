import AuthService from '../services/auth.service.js';
import AdminService from '../services/admin.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';
import { showAlert, showLoader } from '../utils/helpers.js';

class AdminPage {
  constructor() {
    this.questions = [];
    this.currentFilter = 'all';
    this.stats = {
      totalUsers: 0,
      totalQuestions: 0,
      totalExams: 0,
      avgScore: 0
    };
    
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

      if (!AuthService.hasRole(USER_ROLES.ADMIN)) {
        showAlert('Access denied. Admin access only.', 'danger');
        setTimeout(() => window.location.href = ROUTES.LOGIN, 3000);
        return;
      }

      // Setup event listeners
      this.setupEventListeners();
      
      // Load admin data
      await this.loadAdminData();
      
      showLoader(false);
    } catch (error) {
      console.error('Error initializing admin page:', error);
      showAlert('Failed to initialize admin panel. Please try again.', 'danger');
      showLoader(false);
    }
  }

  setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    
    // Save question button
    document.getElementById('saveQuestionBtn')?.addEventListener('click', () => this.saveQuestion());
    
    // Filter dropdown
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentFilter = e.target.dataset.filter;
        this.filterQuestions();
      });
    });
  }

  async loadAdminData() {
    try {
      // Load stats and questions in parallel
      const [statsResult, questionsResult] = await Promise.all([
        AdminService.getSystemStats(),
        AdminService.getQuestions()
      ]);

      if (statsResult.success) {
        this.stats = statsResult.stats;
        this.updateStats();
      } else {
        console.error('Error loading stats:', statsResult.error);
      }

      if (questionsResult.success) {
        this.questions = questionsResult.questions;
        this.renderQuestions();
      } else {
        console.error('Error loading questions:', questionsResult.error);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      showAlert('Error loading admin data', 'danger');
    }
  }

  updateStats() {
    document.getElementById('totalUsers').textContent = this.stats.totalUsers;
    document.getElementById('totalQuestions').textContent = this.stats.totalQuestions;
    document.getElementById('totalExams').textContent = this.stats.totalExams;
    document.getElementById('avgScore').textContent = this.stats.avgScore + '%';
  }

  renderQuestions() {
    const tbody = document.getElementById('questionsTableBody');
    if (!tbody) return;

    if (this.questions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <div class="text-muted">
              <i class="bi bi-question-circle fs-1 d-block mb-2"></i>
              <p class="mb-0">No questions found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const filteredQuestions = this.getFilteredQuestions();
    
    tbody.innerHTML = filteredQuestions.map(question => `
      <tr>
        <td>
          <div class="text-truncate" style="max-width: 300px;" title="${question.question}">
            ${question.question}
          </div>
        </td>
        <td>
          <span class="badge bg-${this.getLevelBadgeColor(question.level)}">${question.level}</span>
        </td>
        <td>
          <span class="badge bg-info">${question.section}</span>
        </td>
        <td>
          <span class="badge bg-success">${question.correct_answer}</span>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="window.adminPage.editQuestion('${question.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="window.adminPage.deleteQuestion('${question.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  getFilteredQuestions() {
    if (this.currentFilter === 'all') {
      return this.questions;
    }
    return this.questions.filter(question => question.level === this.currentFilter);
  }

  getLevelBadgeColor(level) {
    switch (level) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Hard': return 'danger';
      default: return 'secondary';
    }
  }

  filterQuestions() {
    this.renderQuestions();
    
    // Update filter button text
    const filterBtn = document.querySelector('.dropdown-toggle');
    if (filterBtn) {
      const filterText = this.currentFilter === 'all' ? 'All Questions' : `${this.currentFilter} Level`;
      filterBtn.innerHTML = `<i class="bi bi-funnel me-1"></i>${filterText}`;
    }
  }

  async saveQuestion() {
    try {
      const form = document.getElementById('addQuestionForm');
      const formData = new FormData(form);
      
      const questionData = {
        question: document.getElementById('questionText').value.trim(),
        level: document.getElementById('questionLevel').value,
        section: document.getElementById('questionSection').value,
        options: {
          A: document.getElementById('optionA').value.trim(),
          B: document.getElementById('optionB').value.trim(),
          C: document.getElementById('optionC').value.trim(),
          D: document.getElementById('optionD').value.trim()
        },
        correct_answer: document.getElementById('correctAnswer').value
      };
      
      // Validate form
      if (!questionData.question || !questionData.level || !questionData.section || 
          !questionData.options.A || !questionData.options.B || 
          !questionData.options.C || !questionData.options.D || 
          !questionData.correct_answer) {
        showAlert('Please fill in all fields', 'warning');
        return;
      }

      showLoader(true);
      
      const result = await AdminService.addQuestion(questionData);
      
      if (result.success) {
        showAlert('Question added successfully!', 'success');
        
        // Reset form
        form.reset();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addQuestionModal'));
        modal.hide();
        
        // Refresh questions
        await this.loadAdminData();
      } else {
        showAlert(result.error || 'Failed to add question', 'danger');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      showAlert('Error saving question', 'danger');
    } finally {
      showLoader(false);
    }
  }

  editQuestion(questionId) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;

    // Populate form with existing data
    document.getElementById('questionText').value = question.question;
    document.getElementById('questionLevel').value = question.level;
    document.getElementById('questionSection').value = question.section;
    document.getElementById('optionA').value = question.options.A;
    document.getElementById('optionB').value = question.options.B;
    document.getElementById('optionC').value = question.options.C;
    document.getElementById('optionD').value = question.options.D;
    document.getElementById('correctAnswer').value = question.correct_answer;

    // Change modal title and button text
    document.querySelector('#addQuestionModal .modal-title').innerHTML = 
      '<i class="bi bi-pencil me-2"></i>Edit Question';
    document.getElementById('saveQuestionBtn').innerHTML = 
      '<i class="bi bi-check-circle me-1"></i>Update Question';

    // Store question ID for update
    document.getElementById('addQuestionForm').dataset.questionId = questionId;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addQuestionModal'));
    modal.show();
  }

  async deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      showLoader(true);
      
      const result = await AdminService.deleteQuestion(questionId);
      
      if (result.success) {
        showAlert('Question deleted successfully!', 'success');
        await this.loadAdminData();
      } else {
        showAlert(result.error || 'Failed to delete question', 'danger');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      showAlert('Error deleting question', 'danger');
    } finally {
      showLoader(false);
    }
  }

  async refreshData() {
    try {
      showLoader(true);
      await this.loadAdminData();
      showAlert('Data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showAlert('Error refreshing data', 'danger');
    } finally {
      showLoader(false);
    }
  }

  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = ROUTES.LOGIN;
    } catch (error) {
      console.error('Error during logout:', error);
      showAlert('Error during logout. Please try again.', 'danger');
    }
  }
}

// Initialize admin page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminPage = new AdminPage();
});