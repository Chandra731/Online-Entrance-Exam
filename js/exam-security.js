class ExamSecurity {
    constructor() {
        this.warningCount = 0;
        this.maxWarnings = 3;
        this.isExamActive = false;
        this.autoSaveInterval = null;
        this.networkMonitorInterval = null;
        this.lastActivity = Date.now();
        this.inactivityTimeout = 5 * 60 * 1000; // 5 minutes
    }

    getTimeRemaining() {
        // TODO: Integrate with exam.js to get actual time remaining
        // For now, return default values to avoid errors
        return {
            section: 0,
            total: 0
        };
    }

    getCurrentQuestion() {
        // TODO: Integrate with exam.js to get current question
        // For now, return null to avoid errors
        return null;
    }

    getCurrentAnswers() {
        // TODO: Integrate with exam.js to get current answers
        // For now, return empty object to avoid errors
        return {};
    }

    async initialize() {
        await this.setupBrowserLockdown();
        this.setupNetworkMonitoring();
        this.setupActivityMonitoring();
        this.setupAutoSave();
        this.setupTabMonitoring();
    }

    async setupBrowserLockdown() {
        // Disable right-click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleViolation('Right-click disabled during exam');
        });

        // Disable keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (
                e.key === 'c' || // Copy
                e.key === 'v' || // Paste
                e.key === 'a' || // Select all
                e.key === 'p' || // Print
                e.key === 's' || // Save
                e.key === 'u'    // View source
            )) {
                e.preventDefault();
                this.handleViolation('Keyboard shortcuts disabled during exam');
            }
        });

        // Disable developer tools
        this.disableDevTools();
    }

    disableDevTools() {
        // Check for dev tools periodically
        setInterval(() => {
            const devtools = /./;
            devtools.toString = function() {
                this.handleViolation('Developer tools detected');
                return '';
            }
        }, 1000);
    }

    setupNetworkMonitoring() {
        this.networkMonitorInterval = setInterval(() => {
            if (!navigator.onLine) {
                this.handleNetworkDisconnection();
            }
        }, 1000);

        window.addEventListener('online', () => {
            this.handleNetworkReconnection();
        });

        window.addEventListener('offline', () => {
            this.handleNetworkDisconnection();
        });
    }

    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            });
        });

        setInterval(() => {
            if (this.isExamActive && Date.now() - this.lastActivity > this.inactivityTimeout) {
                this.handleInactivity();
            }
        }, 1000);
    }

    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.isExamActive) {
                this.saveExamState();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    setupTabMonitoring() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isExamActive) {
                this.handleTabSwitch();
            }
        });
    }

    async saveExamState() {
        try {
            const examState = {
                answers: this.getCurrentAnswers(),
                timestamp: Date.now(),
                lastQuestion: this.getCurrentQuestion(),
                timeRemaining: this.getTimeRemaining()
            };

            await firebase.firestore()
                .collection('exam_states')
                .doc(firebase.auth().currentUser.uid)
                .set(examState);

            console.log('Exam state saved successfully');
        } catch (error) {
            console.error('Error saving exam state:', error);
        }
    }

    handleViolation(reason) {
        this.warningCount++;
        this.showWarning(reason);

        if (this.warningCount >= this.maxWarnings) {
            this.forceExamSubmission('Maximum warnings exceeded');
        }
    }

    handleNetworkDisconnection() {
        this.showWarning('Network connection lost. Please check your internet connection.');
        // Store current state
        this.saveExamState();
    }

    handleNetworkReconnection() {
        this.showWarning('Network connection restored.');
        // Attempt to sync state
        this.syncExamState();
    }

    handleInactivity() {
        this.showWarning('Inactivity detected. Please continue with your exam.');
        this.handleViolation('Inactivity detected');
    }

    handleTabSwitch() {
        this.handleViolation('Tab switching detected');
    }

    showWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning alert-dismissible fade show';
        warningDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.insertBefore(warningDiv, document.body.firstChild);
    }

    async forceExamSubmission(reason) {
        this.isExamActive = false;
        await this.saveExamState();
        alert(`Exam will be submitted automatically. Reason: ${reason}`);
        // Trigger exam submission
        document.getElementById('submitBtn').click();
    }

    cleanup() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        if (this.networkMonitorInterval) clearInterval(this.networkMonitorInterval);
        this.isExamActive = false;
    }
}

// Export the ExamSecurity class
window.ExamSecurity = ExamSecurity; 