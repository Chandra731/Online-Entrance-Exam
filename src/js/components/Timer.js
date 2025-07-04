import { BaseComponent } from './BaseComponent.js';
import { formatTime } from '../utils/helpers.js';

export class Timer extends BaseComponent {
  constructor(containerId, options = {}) {
    super(containerId);
    this.initialTime = options.initialTime || 0;
    this.currentTime = this.initialTime;
    this.isRunning = false;
    this.interval = null;
    this.onTimeUp = options.onTimeUp || (() => {});
    this.onTick = options.onTick || (() => {});
    this.label = options.label || 'Time';
    this.warningThreshold = options.warningThreshold || 300; // 5 minutes
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.currentTime--;
      this.updateDisplay();
      this.onTick(this.currentTime);
      
      if (this.currentTime <= 0) {
        this.stop();
        this.onTimeUp();
      }
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset(newTime = this.initialTime) {
    this.stop();
    this.currentTime = newTime;
    this.initialTime = newTime;
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.container) return;
    
    const timeString = formatTime(this.currentTime);
    const isWarning = this.currentTime <= this.warningThreshold && this.currentTime > 60;
    const isDanger = this.currentTime <= 60;
    
    let badgeClass = 'bg-primary';
    if (isDanger) {
      badgeClass = 'bg-danger';
    } else if (isWarning) {
      badgeClass = 'bg-warning text-dark';
    }
    
    this.container.innerHTML = `
      <span class="badge ${badgeClass} timer-badge ${isDanger ? 'timer-danger' : ''}">
        <i class="bi bi-clock me-1"></i>${this.label}: ${timeString}
      </span>
    `;
  }

  getTime() {
    return this.currentTime;
  }

  setTime(time) {
    this.currentTime = time;
    this.updateDisplay();
  }

  init() {
    this.updateDisplay();
  }

  cleanup() {
    this.stop();
    super.cleanup();
  }
}