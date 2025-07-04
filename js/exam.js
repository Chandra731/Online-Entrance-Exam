(function() {
    // Initialize Firebase if not already initialized
    if (!window.examAuth) {
        window.examAuth = firebase.auth();
        // Set persistence to SESSION to maintain login state
        window.examAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
            .catch((error) => {
                console.error("Auth persistence error:", error);
            });
    }
    if (!window.examDb) {
        window.examDb = firebase.firestore();
    }

    // Use the global instances
    const auth = window.examAuth;
    const db = window.examDb;

    // Exam state management
    let examState = {
        currentSection: 0,
        currentQuestion: 0,
        answers: {}, // Changed to nested object: { sectionIdx: { questionIdx: answer } }
        markedQuestions: new Set(),
        timeRemaining: {
            section: 15 * 60, // 15 minutes per section
            total: 60 * 60    // 60 minutes total
        },
        examCode: null,
        examData: null,
        sectionList: [],
        questionIndexMap: []
    };

    // Initialize exam security
    const examSecurity = new ExamSecurity();

    // DOM Elements
    const elements = {
        examCode: document.getElementById('examCode'),
        sectionTimer: document.getElementById('sectionTimer'),
        totalTimer: document.getElementById('totalTimer'),
        networkStatus: document.getElementById('networkStatus'),
        sectionTitle: document.getElementById('sectionTitle'),
        questionNumber: document.getElementById('questionNumber'),
        questionText: document.getElementById('questionText'),
        optionsForm: document.getElementById('optionsForm'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        clearResponseBtn: document.getElementById('clearResponseBtn'),
        markBtn: document.getElementById('markBtn'),
        submitBtn: document.getElementById('submitBtn'),
        questionNavigator: document.getElementById('questionNavigator'),
        guidelinesModal: new bootstrap.Modal(document.getElementById('guidelinesModal')),
        agreeCheckbox: document.getElementById('agreeCheckbox'),
        startExamBtn: document.getElementById('startExamBtn'),
        webcamVideo: document.getElementById('webcamVideo'),
        resultMessage: document.getElementById('resultMessage') || document.createElement('div')
    };

    // If resultMessage doesn't exist in the DOM, create and append it
    if (!document.getElementById('resultMessage')) {
        elements.resultMessage.id = 'resultMessage';
        elements.resultMessage.className = 'mt-3';
        document.querySelector('.container').appendChild(elements.resultMessage);
    }

    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        // console.log('Auth state changed, user:', user);
        if (user) {
            try {
                // Get user role from Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    throw new Error('User data not found');
                }

                const userData = userDoc.data();
        // console.log('User data:', userData);
                if (userData.role !== 'student') {
                    throw new Error('Access denied. Student access only.');
                }

                // Initialize exam if user is authenticated and is a student
                await initializeExam();
            } catch (error) {
                console.error('Authentication error:', error);
                showError(error.message);
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
        } else {
            // No user is signed in, redirect to login
            window.location.href = 'login.html';
        }
    });

    // Initialize exam
    async function initializeExam() {
        try {
            // Get current user
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Fetch assigned exam level from Firestore
            const userLevelDoc = await db.collection('user_exam_level').doc(user.uid).get();
            if (!userLevelDoc.exists) {
                throw new Error('No exam level assigned to this user');
            }
            examState.examCode = userLevelDoc.data().level;
            if (!examState.examCode) {
                throw new Error('No exam level assigned to this user');
            }

            // Load questions from Firestore filtered by assigned level
            await loadQuestionsByLevel();

            // Initialize webcam
            await initializeWebcam();

            // Show guidelines modal
            elements.guidelinesModal.show();

            // Setup event listeners
            setupEventListeners();

            // Initialize security
            await examSecurity.initialize();

        } catch (error) {
            console.error('Error initializing exam:', error);
            showError('Failed to initialize exam. Please try again.');
        }
    }

    // Load questions from Firestore filtered by level
    async function loadQuestionsByLevel() {
        try {
            const querySnapshot = await db.collection('questions')
                .where('level', '==', examState.examCode)
                .get();

            if (querySnapshot.empty) {
                throw new Error('No questions found for this level');
            }

            // Organize questions by sections and flatten questions array
            examState.examData = {};
            examState.examData.questionsBySection = {};
            examState.examData.questions = [];

            querySnapshot.docs.forEach(doc => {
                const question = doc.data();
        // console.log('Question loaded:', question);
                const section = question.section || 'General';
                if (!examState.examData.questionsBySection[section]) {
                    examState.examData.questionsBySection[section] = [];
                }
                examState.examData.questionsBySection[section].push(question);
                examState.examData.questions.push(question);
            });
        // console.log('All questions loaded:', examState.examData.questions);

            elements.examCode.textContent = examState.examCode;

            // Initialize question navigator
            initializeQuestionNavigator();

        } catch (error) {
            console.error('Error loading questions:', error);
            throw error;
        }
    }

    // Initialize question navigator UI - now shows only current section questions
function initializeQuestionNavigator() {
    const navigator = elements.questionNavigator;
    navigator.innerHTML = '';

    examState.sectionList = Object.keys(examState.examData.questionsBySection);
    // Sort sectionList alphabetically to ensure consistent order
    examState.sectionList.sort();

    // Remove resetting currentSection and currentQuestion here to preserve navigation state
    // examState.currentSection = 0;
    // examState.currentQuestion = 0;

    examState.questionIndexMap = []; // Map global question index to section and question index

    // Only show current section questions
    const currentSection = examState.sectionList[examState.currentSection];
    const questions = examState.examData.questionsBySection[currentSection];

    questions.forEach((question, questionIdx) => {
        const questionBtn = document.createElement('button');
        questionBtn.className = 'question-btn not-visited';
        questionBtn.textContent = (questionIdx + 1).toString();
        questionBtn.addEventListener('click', () => {
            examState.currentQuestion = questionIdx;
            showCurrentQuestion();
        });
        navigator.appendChild(questionBtn);

        // Map global index
        examState.questionIndexMap.push({ sectionIdx: examState.currentSection, questionIdx });
    });

    updateQuestionNavigator();
}

    // Update question navigator UI status
    function updateQuestionNavigator() {
        const navigator = elements.questionNavigator;
        if (!navigator) return;

        const buttons = navigator.children;
        for (let i = 0; i < buttons.length; i++) {
            let statusClass = 'not-visited';
            if (examState.answers[examState.currentSection] && examState.answers[examState.currentSection][i]) {
                statusClass = 'answered';
            }
            if (examState.markedQuestions.has(i)) {
                statusClass = 'marked';
            }
            if (examState.currentQuestion === i) {
                statusClass += ' current';
            }
            buttons[i].className = 'question-btn ' + statusClass;
        }
    }

    // Show current question
    function showCurrentQuestion() {
        const question = getCurrentQuestion();
        // console.log('Showing question:', question);
        if (!question) {
        // console.log('No question to show');
            return;
        }

        elements.questionNumber.textContent = `Question ${examState.currentQuestion + 1}`;
        elements.questionText.textContent = question.question;
        elements.sectionTitle.textContent = examState.sectionList[examState.currentSection];

        // Update options
        ['A', 'B', 'C', 'D'].forEach(option => {
            const label = document.getElementById(`label${option}`);
            const input = document.getElementById(`option${option}`);
            if (label && input) {
                label.textContent = question.options[option];
                input.checked = examState.answers[examState.currentSection] && examState.answers[examState.currentSection][examState.currentQuestion] === option;
            } else {
        // console.log(`Missing label or input for option ${option}`);
            }
        });

        // Update navigation buttons
        elements.prevBtn.disabled = examState.currentQuestion === 0;
        const totalQuestions = examState.examData.questionsBySection[examState.sectionList[examState.currentSection]].length;
        // Change next button text to 'Next Section' if last question in section but not last section
        if (examState.currentQuestion === totalQuestions - 1) {
            if (examState.currentSection < examState.sectionList.length - 1) {
                elements.nextBtn.textContent = 'Next Section';
            } else {
                elements.nextBtn.textContent = 'Submit';
            }
        } else {
            elements.nextBtn.textContent = 'Next';
        }
        
        // Update mark button
        elements.markBtn.textContent = 
            examState.markedQuestions.has(examState.currentQuestion) ? 'Unmark' : 'Mark for Revisit';
        
        // Update question navigator
        updateQuestionNavigator();
    }

    // Get current question object
    function getCurrentQuestion() {
        if (!examState.examData || !examState.examData.questionsBySection) return null;
        const sectionName = examState.sectionList[examState.currentSection];
        const sectionQuestions = examState.examData.questionsBySection[sectionName];
        if (!sectionQuestions) {
            return null;
        }
        return sectionQuestions[examState.currentQuestion] || null;
    }

    // Handle option selection
    function handleOptionSelection(event) {
        const selectedOption = event.target.value;
        if (!examState.answers[examState.currentSection]) {
            examState.answers[examState.currentSection] = {};
        }
        examState.answers[examState.currentSection][examState.currentQuestion] = selectedOption;
        updateQuestionNavigator();
        saveExamState();
    }

    // Clear current response
    function clearResponse() {
        if (examState.answers[examState.currentSection]) {
            delete examState.answers[examState.currentSection][examState.currentQuestion];
        }
        elements.optionsForm.reset();
        updateQuestionNavigator();
        saveExamState();
    }

    // Toggle mark question
    function toggleMarkQuestion() {
        if (examState.markedQuestions.has(examState.currentQuestion)) {
            examState.markedQuestions.delete(examState.currentQuestion);
        } else {
            examState.markedQuestions.add(examState.currentQuestion);
        }
        elements.markBtn.textContent = 
            examState.markedQuestions.has(examState.currentQuestion) ? 'Unmark' : 'Mark for Revisit';
        updateQuestionNavigator();
    }

    // Show previous question
    function showPreviousQuestion() {
        if (examState.currentQuestion > 0) {
            examState.currentQuestion--;
            showCurrentQuestion();
        }
    }

    // Show next question
function showNextQuestion() {
    const totalQuestions = examState.examData.questionsBySection[examState.sectionList[examState.currentSection]].length;
    if (examState.currentQuestion < totalQuestions - 1) {
        examState.currentQuestion++;
        showCurrentQuestion();
    } else {
        // If last question in section, check if section time is over before moving to next section or submit
        if (examState.currentSection < examState.sectionList.length - 1) {
            if (examState.timeRemaining.section > 0) {
                alert('Time is still remaining for this section. You cannot move to the next section yet.');
                return;
            }
            examState.currentSection++;
            examState.currentQuestion = 0;
            examState.timeRemaining.section = 15 * 60; // reset section timer
            // Reduce total time by 15 minutes for each section completed
            examState.timeRemaining.total = Math.max(0, examState.timeRemaining.total - 15 * 60);
            // Re-initialize question navigator for new section
            initializeQuestionNavigator();
            // Show first question of the new section
            showCurrentQuestion();
        } else {
            submitExam();
        }
    }
}

    // Submit exam
    async function submitExam() {
        try {
            if (!confirm('Are you sure you want to submit the exam?')) {
                return;
            }

            // Calculate score
            const score = calculateScore();
            
            // Save result
            await saveExamResult(score);
            
            // Cleanup
            examSecurity.cleanup();

            // Show submission success popup without score details
            alert('Exam Submitted Successfully! Results will be available to your counselor.');

            // Redirect to login page immediately after alert
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Error submitting exam:', error);
            showError('Failed to submit exam. Please try again.');
        }
    }

    // Calculate score
    function calculateScore() {
        let score = 0;
        const questions = [];
        examState.sectionList.forEach(section => {
            questions.push(...examState.examData.questionsBySection[section]);
        });
        
        for (let i = 0; i < questions.length; i++) {
            const sectionIdx = examState.sectionList.findIndex(section => questions[i].section === section);
            const questionIdx = i % 15; // assuming 15 questions per section
            if (examState.answers[sectionIdx] && examState.answers[sectionIdx][questionIdx] === questions[i].correct_answer) {
                score++;
            }
        }
        
        return {
            total: questions.length,
            correct: score,
            percentage: (score / questions.length) * 100
        };
    }
    
    // Save exam result
    async function saveExamResult(score) {
        try {
            // Get current user data from Firestore
            const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            await db.collection('results').add({
                examCode: examState.examCode,
                studentId: auth.currentUser.uid,
                name: userData.name || '',
                email: userData.email || '',
                level: examState.examCode || '',
                section: '', // Section can be added if available
                score: score.correct || 0,
                total: score.total || 0,
                percentage: score.percentage || 0,
                answers: examState.answers,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving exam result:', error);
            throw error;
        }
    }

    // Show error message
    function showError(message) {
        if (!elements.resultMessage) {
            console.error('Error container not found:', message);
            return;
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger fade-in';
        errorDiv.textContent = message;
        
        // Clear previous errors
        elements.resultMessage.innerHTML = '';
        elements.resultMessage.appendChild(errorDiv);
        
        // Log to console for debugging
        console.error('Exam error:', message);
    }

    // Initialize webcam
    async function initializeWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            elements.webcamVideo.srcObject = stream;

            // Start periodic snapshot capture every 30 seconds
            startSnapshotCapture();

        } catch (error) {
            console.error('Error accessing webcam:', error);
            showError('Webcam access is required for the exam.');
        }
    }

    // Capture webcam snapshot and upload to Firestore
    async function captureAndUploadSnapshot() {
        try {
            const video = elements.webcamVideo;
            if (!video || video.readyState !== 4) {
                console.warn('Webcam video not ready for snapshot');
                return;
            }

            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get base64 image data
            const base64Image = canvas.toDataURL('image/jpeg');

            // Upload to Firestore under participant_videos collection
            const userId = auth.currentUser.uid;
            await db.collection('participant_videos').doc(userId).set({
                latestSnapshotBase64: base64Image,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

        // console.log('Snapshot uploaded for user:', userId);
        } catch (error) {
            console.error('Error capturing/uploading snapshot:', error);
        }
    }

    // Start periodic snapshot capture every 30 seconds
    function startSnapshotCapture() {
        captureAndUploadSnapshot(); // initial capture
        setInterval(captureAndUploadSnapshot, 30000);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Guidelines checkbox
        elements.agreeCheckbox.addEventListener('change', () => {
            elements.startExamBtn.disabled = !elements.agreeCheckbox.checked;
        });

        // Start exam button
        elements.startExamBtn.addEventListener('click', startExam);

        // Navigation buttons
        elements.prevBtn.addEventListener('click', showPreviousQuestion);
        elements.nextBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showNextQuestion();
        });
        elements.clearResponseBtn.addEventListener('click', clearResponse);
        elements.markBtn.addEventListener('click', toggleMarkQuestion);
        elements.submitBtn.addEventListener('click', submitExam);

        // Option selection
        elements.optionsForm.addEventListener('change', handleOptionSelection);

        // Network status
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
    }

    // Start exam
    function startExam() {
        examState.isActive = true;
        examSecurity.isExamActive = true;
        elements.guidelinesModal.hide();
        startTimers();
        showCurrentQuestion();
    }

    // Update network status
    function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        elements.networkStatus.textContent = isOnline ? 'Online' : 'Offline';
        elements.networkStatus.className = `badge ${isOnline ? 'bg-success' : 'bg-danger'}`;
    }

        // Start timers
        function startTimers() {
            // Clear any existing intervals to avoid multiple timers running
            if (examState.sectionTimerInterval) {
                clearInterval(examState.sectionTimerInterval);
            }
            if (examState.totalTimerInterval) {
                clearInterval(examState.totalTimerInterval);
            }

            // Section timer
examState.sectionTimerInterval = setInterval(async () => {
    examState.timeRemaining.section--;
    updateTimers();
    
    if (examState.timeRemaining.section <= 0) {
        // Auto-save answers before moving to next section or submitting
        await saveExamState();

        // Move to next section or submit exam
        if (examState.currentSection < examState.sectionList.length - 1) {
            examState.currentSection++;
            examState.currentQuestion = 0;
            examState.timeRemaining.section = 15 * 60; // reset section timer
            initializeQuestionNavigator();
            showCurrentQuestion();
        } else {
            submitExam();
        }
    }
}, 1000);

        // Total timer
        examState.totalTimerInterval = setInterval(() => {
            examState.timeRemaining.total--;
            updateTimers();
            
            if (examState.timeRemaining.total <= 0) {
                submitExam();
            }
        }, 1000);
    }

    // Update timers display
    function updateTimers() {
        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        elements.sectionTimer.textContent = `Section: ${formatTime(examState.timeRemaining.section)}`;
        elements.totalTimer.textContent = `Total: ${formatTime(examState.timeRemaining.total)}`;
    }

    // Save exam state
    async function saveExamState() {
        // Implementation of saveExamState function
        // This function should save the current exam state to Firestore or local storage
        // For now, just log to console
        // console.log('Saving exam state...');
    }

    // Initialize exam when page loads
    document.addEventListener('DOMContentLoaded', initializeExam);

    // Update logout button handler
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showError('Error signing out. Please try again.');
        }
    });
})();
