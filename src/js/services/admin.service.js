import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { COLLECTIONS } from '../utils/constants.js';

class AdminService {
  // Add new question
  async addQuestion(questionData) {
    try {
      await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
        ...questionData,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding question:', error);
      return { success: false, error: error.message };
    }
  }

  // Update existing question
  async updateQuestion(questionId, questionData) {
    try {
      const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
      await updateDoc(questionRef, {
        ...questionData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating question:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete question
  async deleteQuestion(questionId) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, questionId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting question:', error);
      return { success: false, error: error.message };
    }
  }

  // Get questions with filters
  async getQuestions(filters = {}) {
    try {
      let q = collection(db, COLLECTIONS.QUESTIONS);
      
      // Apply filters
      if (filters.level) {
        q = query(q, where('level', '==', filters.level));
      }
      if (filters.section) {
        q = query(q, where('section', '==', filters.section));
      }
      
      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const questions = [];
      
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, questions };
    } catch (error) {
      console.error('Error fetching questions:', error);
      return { success: false, error: error.message };
    }
  }

  // Get system statistics
  async getSystemStats() {
    try {
      const [usersSnapshot, questionsSnapshot, resultsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USERS)),
        getDocs(collection(db, COLLECTIONS.QUESTIONS)),
        getDocs(collection(db, COLLECTIONS.RESULTS))
      ]);

      return {
        success: true,
        stats: {
          totalUsers: usersSnapshot.size,
          totalQuestions: questionsSnapshot.size,
          totalExamsTaken: resultsSnapshot.size
        }
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AdminService();