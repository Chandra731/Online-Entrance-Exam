import AuthService from '../services/auth.service.js';
import CounselorService from '../services/counselor.service.js';
import { USER_ROLES, ROUTES } from '../utils/constants.js';
import { showAlert, showLoader, debounce } from '../utils/helpers.js';

class AssignLevelPage {
  constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.currentFilters = {
      course: '',
      status: '',
      search: ''
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

      if (!AuthService.hasRole(USER_ROLES.COUNSELOR)) {
        showAlert('Access denied. Counselor access only.', 'danger');
        setTimeout(() => window.location.href = ROUTES.LOGIN, 3000);
        return;
      }

      // Setup event listeners
      this.setupEventListeners();
      
      // Load students data
      await this.loadStudents();
      
      showLoader(false);
    } catch (error) {
      console.error('Error initializing assign level page:', error);
      showAlert('Failed to initialize page. Please try again.', 'danger');
      showLoader(false);
    }
  }

  setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    
    // Filter controls
    document.getElementById('courseFilter')?.addEventListener('change', (e) => {
      this.currentFilters.course = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.applyFilters();
    });
    
    // Search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.currentFilters.search = e.target.value.toLowerCase();
        this.applyFilters();
      }, 300));
    }
    
    // Assign level modal
    document.getElementById('confirmAssignBtn')?.addEventListener('click', () => this.confirmAssignment());
  }

  async loadStudents() {
    try {
      const result = await CounselorService.getStudents();
      
      if (result.success) {
        this.students = result.students;
        
        // Load assignment status for each student
        await this.loadAssignmentStatuses();
        
        this.filteredStudents = [...this.students];
        this.renderStudents();
      } else {
        console.error('Error loading students:', result.error);
        showAlert('Error loading students', 'danger');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      showAlert('Error loading students', 'danger');
    }
  }

  async loadAssignmentStatuses() {
    // Load assignment status for each student
    const assignmentPromises = this.students.map(async (student) => {
      try {
        const result = await CounselorService.getStudentExamLevel(student.id);
        student.assignedLevel = result.success ? result.assignment.level : null;
        student.assignedBy = result.success ? result.assignment.assignedBy : null;
        student.assignedAt = result.success ? result.assignment.assignedAt : null;
      } catch (error) {
        console.error(`Error loading assignment for student ${student.id}:`, error);
        student.assignedLevel = null;
      }
    });
    
    await Promise.all(assignmentPromises);
  }

  applyFilters() {
    this.filteredStudents = this.students.filter(student => {
      // Course filter
      if (this.currentFilters.course && student.course !== this.currentFilters.course) {
        return false;
      }
      
      // Status filter
      if (this.currentFilters.status) {
        const hasAssignment = !!student.assignedLevel;
        if (this.currentFilters.status === 'assigned' && !hasAssignment) {
          return false;
        }
        if (this.currentFilters.status === 'pending' && hasAssignment) {
          return false;
        }
      }
      
      // Search filter
      if (this.currentFilters.search) {
        const searchTerm = this.currentFilters.search;
        const nameMatch = student.name?.toLowerCase().includes(searchTerm);
        const emailMatch = student.email?.toLowerCase().includes(searchTerm);
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }
      
      return true;
    });
    
    this.renderStudents();
  }

  renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (this.filteredStudents.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <div class="text-muted">
              <i class="bi bi-people fs-1 d-block mb-2"></i>
              <p class="mb-0">No students found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredStudents.map(student => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
              <i class="bi bi-person text-primary"></i>
            </div>
            <div>
              <div class="fw-medium">${student.name || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="text-muted">${student.email || 'N/A'}</span>
        </td>
        <td>
          <span class="badge bg-info">${student.course || 'N/A'}</span>
        </td>
        <td>
          ${student.assignedLevel ? 
            `<span class="badge bg-${this.getLevelBadgeColor(student.assignedLevel)}">${student.assignedLevel}</span>` :
            '<span class="text-muted">Not assigned</span>'
          }
        </td>
        <td>
          <select class="form-select form-select-sm" id="level-${student.id}">
            <option value="">Select level</option>
            <option value="Easy" ${student.assignedLevel === 'Easy' ? 'selected' : ''}>Easy</option>
            <option value="Medium" ${student.assignedLevel === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Hard" ${student.assignedLevel === 'Hard' ? 'selected' : ''}>Hard</option>
          </select>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="window.assignLevelPage.openAssignModal('${student.id}')">
            <i class="bi bi-check-circle me-1"></i>Assign
          </button>
        </td>
      </tr>
    `).join('');
  }

  getLevelBadgeColor(level) {
    switch (level) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Hard': return 'danger';
      default: return 'secondary';
    }
  }

  openAssignModal(studentId) {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return;

    const levelSelect = document.getElementById(`level-${studentId}`);
    const selectedLevel = levelSelect?.value;
    
    if (!selectedLevel) {
      showAlert('Please select an exam level first', 'warning');
      return;
    }

    // Populate modal
    document.getElementById('studentId').value = studentId;
    document.getElementById('studentName').textContent = student.name || 'N/A';
    document.getElementById('studentEmail').textContent = student.email || 'N/A';
    document.getElementById('studentCourse').textContent = student.course || 'N/A';
    document.getElementById('examLevel').value = selectedLevel;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('assignLevelModal'));
    modal.show();
  }

  async confirmAssignment() {
    try {
      const studentId = document.getElementById('studentId').value;
      const examLevel = document.getElementById('examLevel').value;
      
      if (!studentId || !examLevel) {
        showAlert('Missing required information', 'danger');
        return;
      }

      showLoader(true);
      
      const counselorData = await AuthService.getCurrentUserData();
      const result = await CounselorService.assignExamLevel(
        studentId, 
        examLevel, 
        counselorData?.email || 'Unknown'
      );
      
      if (result.success) {
        showAlert('Exam level assigned successfully!', 'success');
        
        // Update local data
        const student = this.students.find(s => s.id === studentId);
        if (student) {
          student.assignedLevel = examLevel;
          student.assignedBy = counselorData?.email || 'Unknown';
          student.assignedAt = new Date();
        }
        
        // Re-render
        this.applyFilters();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('assignLevelModal'));
        modal.hide();
      } else {
        showAlert(result.error || 'Failed to assign exam level', 'danger');
      }
    } catch (error) {
      console.error('Error assigning exam level:', error);
      showAlert('Error assigning exam level', 'danger');
    } finally {
      showLoader(false);
    }
  }

  async refreshData() {
    try {
      showLoader(true);
      await this.loadStudents();
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

// Initialize assign level page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.assignLevelPage = new AssignLevelPage();
});