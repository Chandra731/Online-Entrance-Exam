import { BaseComponent } from './BaseComponent.js';

export class QuestionNavigator extends BaseComponent {
  constructor(containerId, options = {}) {
    super(containerId);
    this.questions = options.questions || [];
    this.currentQuestion = options.currentQuestion || 0;
    this.answers = options.answers || {};
    this.markedQuestions = options.markedQuestions || new Set();
    this.onQuestionClick = options.onQuestionClick || (() => {});
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    
    // Create grid container
    const grid = this.createElement('div', ['question-navigator-grid']);
    
    this.questions.forEach((question, index) => {
      const button = this.createElement('button', ['question-nav-btn'], {
        'data-question': index,
        'type': 'button'
      }, (index + 1).toString());
      
      // Add status classes
      this.updateButtonStatus(button, index);
      
      // Add click handler
      this.addEventListener(button, 'click', () => {
        this.onQuestionClick(index);
      });
      
      grid.appendChild(button);
    });
    
    this.container.appendChild(grid);
    
    // Add legend
    this.renderLegend();
  }

  renderLegend() {
    const legend = this.createElement('div', ['question-navigator-legend', 'mt-3']);
    legend.innerHTML = `
      <h6 class="mb-2">Legend:</h6>
      <div class="d-flex flex-wrap gap-2">
        <span class="badge bg-primary">Current</span>
        <span class="badge bg-success">Answered</span>
        <span class="badge bg-warning">Marked</span>
        <span class="badge bg-secondary">Not Visited</span>
      </div>
    `;
    this.container.appendChild(legend);
  }

  updateButtonStatus(button, index) {
    // Remove all status classes
    button.classList.remove('current', 'answered', 'marked', 'not-visited');
    
    // Add appropriate status class
    if (index === this.currentQuestion) {
      button.classList.add('current');
    } else if (this.answers[index] !== undefined) {
      button.classList.add('answered');
    } else if (this.markedQuestions.has(index)) {
      button.classList.add('marked');
    } else {
      button.classList.add('not-visited');
    }
  }

  update(options = {}) {
    if (options.currentQuestion !== undefined) {
      this.currentQuestion = options.currentQuestion;
    }
    if (options.answers !== undefined) {
      this.answers = options.answers;
    }
    if (options.markedQuestions !== undefined) {
      this.markedQuestions = options.markedQuestions;
    }
    
    // Update all button statuses
    const buttons = this.container.querySelectorAll('.question-nav-btn');
    buttons.forEach((button, index) => {
      this.updateButtonStatus(button, index);
    });
  }

  init() {
    this.render();
  }
}