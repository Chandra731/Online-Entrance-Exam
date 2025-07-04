import AuthService from '../services/auth.service.js';
import CounselorService from '../services/counselor.service.js';
import ExamService from '../services/exam.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';
import { showAlert, showLoader, formatTimestamp, downloadCSV } from '../utils/helpers.js';

class DashboardPage {
  constructor() {
    this.currentFilter = 'all';
    this.examResults = [];
    this.students = [];
    
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

      if (!AuthService.hasRole(USER_ROLES.COUNSELOR)) {
        showAlert('Access denied. Counselor access only.', 'danger');
        setTimeout(() => window.location.href = ROUTES.LOGIN, 3000);
        return;
      }

      // Setup event listeners
      this.setupEventListeners();
      
      // Load dashboard data
      await this.loadDashboardData();
      
      showLoader(false);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      showAlert('Failed to initialize dashboard. Please try again.', 'danger');
      showLoader(false);
    }
  }

  setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportResults());
    
    // Filter dropdown
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentFilter = e.target.dataset.filter;
        this.filterResults();
      });
    });
  }

  async loadDashboardData() {
    try {
      // Load students and exam results in parallel
      const [studentsResult, resultsResult] = await Promise.all([
        CounselorService.getStudents(),
        ExamService.getAllResults()
      ]);

      if (studentsResult.success) {
        this.students = studentsResult.students;
      } else {
        console.error('Error loading students:', studentsResult.error);
      }

      if (resultsResult.success) {
        this.examResults = resultsResult.results;
      } else {
        console.error('Error loading results:', resultsResult.error);
      }

      // Update UI
      this.updateStats();
      this.renderResults();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showAlert('Error loading dashboard data', 'danger');
    }
  }

  updateStats() {
    // Calculate stats
    const totalStudents = this.students.length;
    const assignedStudents = this.students.filter(student => 
      this.examResults.some(result => result.studentId === student.id)
    ).length;
    const pendingStudents = totalStudents - assignedStudents;
    const completedExams = this.examResults.length;

    // Update DOM
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('assignedStudents').textContent = assignedStudents;
    document.getElementById('pendingStudents').textContent = pendingStudents;
    document.getElementById('completedExams').textContent = completedExams;
  }

  renderResults() {
    const tbody = document.getElementById('resultsTableBody');
    if (!tbody) return;

    if (this.examResults.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="text-muted">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <p class="mb-0">No exam results found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const filteredResults = this.getFilteredResults();
    
    tbody.innerHTML = filteredResults.map(result => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
              <i class="bi bi-person text-primary"></i>
            </div>
            <div>
              <div class="fw-medium">${result.name || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="text-muted">${result.email || 'N/A'}</span>
        </td>
        <td>
          <span class="badge bg-${this.getLevelBadgeColor(result.level)}">${result.level}</span>
        </td>
        <td>
          <span class="fw-medium">${result.score}/${result.total}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="progress me-2" style="width: 60px; height: 8px;">
              <div class="progress-bar bg-${this.getScoreBadgeColor(result.percentage)}" 
                   style="width: ${result.percentage}%"></div>
            </div>
            <span class="fw-medium">${result.percentage.toFixed(1)}%</span>
          </div>
        </td>
        <td>
          <small class="text-muted">${formatTimestamp(result.submittedAt)}</small>
        </td>
        <td>
          <button class="btn btn-outline-primary btn-sm" onclick="window.dashboardPage.viewResult('${result.id}')">
            <i class="bi bi-eye me-1"></i>View
          </button>
        </td>
      </tr>
    `).join('');
  }

  getFilteredResults() {
    if (this.currentFilter === 'all') {
      return this.examResults;
    }
    return this.examResults.filter(result => result.level === this.currentFilter);
  }

  getLevelBadgeColor(level) {
    switch (level) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Hard': return 'danger';
      default: return 'secondary';
    }
  }

  getScoreBadgeColor(percentage) {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  }

  filterResults() {
    this.renderResults();
    
    // Update filter button text
    const filterBtn = document.querySelector('.dropdown-toggle');
    if (filterBtn) {
      const filterText = this.currentFilter === 'all' ? 'All Results' : `${this.currentFilter} Level`;
      filterBtn.innerHTML = `<i class="bi bi-funnel me-1"></i>${filterText}`;
    }
  }

  viewResult(resultId) {
    const result = this.examResults.find(r => r.id === resultId);
    if (!result) return;

    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    const modalBody = document.getElementById('resultModalBody');
    
    modalBody.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card border-0 bg-light">
            <div class="card-body">
              <h6 class="fw-bold text-primary mb-3">Student Information</h6>
              <div class="mb-2">
                <strong>Name:</strong> ${result.name || 'N/A'}
              </div>
              <div class="mb-2">
                <strong>Email:</strong> ${result.email || 'N/A'}
              </div>
              <div class="mb-2">
                <strong>Exam Level:</strong> 
                <span class="badge bg-${this.getLevelBadgeColor(result.level)}">${result.level}</span>
              </div>
              <div class="mb-2">
                <strong>Submitted:</strong> ${formatTimestamp(result.submittedAt)}
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card border-0 bg-light">
            <div class="card-body">
              <h6 class="fw-bold text-primary mb-3">Exam Results</h6>
              <div class="mb-2">
                <strong>Score:</strong> ${result.score}/${result.total}
              </div>
              <div class="mb-2">
                <strong>Percentage:</strong> 
                <span class="badge bg-${this.getScoreBadgeColor(result.percentage)}">${result.percentage.toFixed(1)}%</span>
              </div>
              <div class="mb-2">
                <strong>Time Spent:</strong> ${Math.floor((result.timeSpent?.total || 0) / 60)} minutes
              </div>
              <div class="mb-2">
                <strong>Marked Questions:</strong> ${result.markedQuestions?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-4">
        <h6 class="fw-bold text-primary mb-3">Performance Analysis</h6>
        <div class="progress mb-2" style="height: 20px;">
          <div class="progress-bar bg-${this.getScoreBadgeColor(result.percentage)}" 
               style="width: ${result.percentage}%">
            ${result.percentage.toFixed(1)}%
          </div>
        </div>
        <div class="row text-center">
          <div class="col-4">
            <div class="text-success fw-bold">${result.score}</div>
            <small class="text-muted">Correct</small>
          </div>
          <div class="col-4">
            <div class="text-danger fw-bold">${result.total - result.score}</div>
            <small class="text-muted">Incorrect</small>
          </div>
          <div class="col-4">
            <div class="text-warning fw-bold">${result.markedQuestions?.length || 0}</div>
            <small class="text-muted">Marked</small>
          </div>
        </div>
      </div>
    `;
    
    modal.show();
  }

  exportResults() {
    if (this.examResults.length === 0) {
      showAlert('No results to export', 'warning');
      return;
    }

    const filteredResults = this.getFilteredResults();
    const csvData = [
      ['Name', 'Email', 'Level', 'Score', 'Total', 'Percentage', 'Submitted Date']
    ];

    filteredResults.forEach(result => {
      csvData.push([
        result.name || 'N/A',
        result.email || 'N/A',
        result.level,
        result.score,
        result.total,
        result.percentage.toFixed(1) + '%',
        formatTimestamp(result.submittedAt)
      ]);
    });

    const filename = `exam_results_${this.currentFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvData, filename);
    
    showAlert('Results exported successfully!', 'success');
  }

  async refreshData() {
    try {
      showLoader(true);
      await this.loadDashboardData();
      showAlert('Dashboard refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showAlert('Error refreshing dashboard', 'danger');
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

// Initialize dashboard page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardPage = new DashboardPage();
});