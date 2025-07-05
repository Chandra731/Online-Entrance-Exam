// Application constants
export const USER_ROLES = {
  ADMIN: 'admin',
  COUNSELOR: 'counselor',
  STUDENT: 'student'
};

export const EXAM_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard'
};

export const EXAM_SECTIONS = {
  REASONING: 'Reasoning',
  GENERAL_KNOWLEDGE: 'General Knowledge',
  BUSINESS_APTITUDE: 'Business Aptitude',
  ENGLISH: 'English'
};

export const COURSES = {
  MBA: 'MBA',
  MCA: 'MCA',
  BCA: 'BCA',
  BBA: 'BBA',
  BCOM: 'B.com'
};

export const EXAM_CONFIG = {
  SECTION_TIME: 15 * 60, // 15 minutes in seconds
  TOTAL_TIME: 60 * 60,   // 60 minutes in seconds
  MAX_WARNINGS: 3,
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  SNAPSHOT_INTERVAL: 30000,  // 30 seconds
  INACTIVITY_TIMEOUT: 5 * 60 * 1000 // 5 minutes
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login.html',
  REGISTER: '/register.html',
  ADMIN: '/admin.html',
  DASHBOARD: '/dashboard.html',
  ASSIGN_LEVEL: '/assign-level.html',
  EXAM: '/exam.html'
};

export const COLLECTIONS = {
  USERS: 'users',
  QUESTIONS: 'questions',
  USER_EXAM_LEVEL: 'user_exam_level',
  RESULTS: 'results',
  EXAM_STATES: 'exam_states',
  PARTICIPANT_VIDEOS: 'participant_videos'
};