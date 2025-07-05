// Base component class for common functionality
export class BaseComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.eventListeners = [];
  }

  // Add event listener and track it for cleanup
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  // Remove all event listeners
  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  // Show loading state
  showLoading(show = true) {
    if (!this.container) return;
    
    if (show) {
      this.container.classList.add('loading');
      this.container.style.opacity = '0.6';
      this.container.style.pointerEvents = 'none';
    } else {
      this.container.classList.remove('loading');
      this.container.style.opacity = '1';
      this.container.style.pointerEvents = 'auto';
    }
  }

  // Create element with classes and attributes
  createElement(tag, classes = [], attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    if (classes.length > 0) {
      element.classList.add(...classes);
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  }

  // Render method to be implemented by subclasses
  render() {
    throw new Error('Render method must be implemented by subclass');
  }

  // Initialize method to be implemented by subclasses
  init() {
    throw new Error('Init method must be implemented by subclass');
  }
}