import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { COLLECTIONS, USER_ROLES } from '../utils/constants.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
  }

  // Initialize auth state listener
  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          await this.loadUserRole();
        } else {
          this.currentUser = null;
          this.userRole = null;
        }
        resolve(user);
      });
    });
  }

  // Load user role from Firestore
  async loadUserRole() {
    if (!this.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid));
      if (userDoc.exists()) {
        this.userRole = userDoc.data().role;
        return this.userRole;
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
    return null;
  }

  // Register new user
  async register(userData) {
    try {
      const { email, password, name, role, course } = userData;
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        userId: user.uid,
        name,
        email,
        role,
        course: role === USER_ROLES.STUDENT ? course : '',
        createdAt: new Date(),
        isActive: true
      });

      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // Login user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Load user role
      await this.loadUserRole();
      
      return { success: true, user, role: this.userRole };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Logout user
  async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userRole = null;
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user has required role
  hasRole(requiredRole) {
    return this.userRole === requiredRole;
  }

  // Get current user data
  async getCurrentUserData() {
    if (!this.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Check authentication status
  isAuthenticated() {
    return !!this.currentUser;
  }
}

export default new AuthService();