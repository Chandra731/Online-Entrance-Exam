import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { COLLECTIONS } from '../utils/constants.js';

class ExamService {
  // Get questions by level
  async getQuestionsByLevel(level) {
    try {
      const q = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where('level', '==', level)
      );
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

  // Get user's assigned exam level
  async getUserExamLevel(userId) {
    try {
      const docRef = doc(db, COLLECTIONS.USER_EXAM_LEVEL, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, level: docSnap.data().level };
      } else {
        return { success: false, error: 'No exam level assigned' };
      }
    } catch (error) {
      console.error('Error getting exam level:', error);
      return { success: false, error: error.message };
    }
  }

  // Save exam result
  async saveExamResult(resultData) {
    try {
      await addDoc(collection(db, COLLECTIONS.RESULTS), {
        ...resultData,
        submittedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving exam result:', error);
      return { success: false, error: error.message };
    }
  }

  // Save exam state for auto-save
  async saveExamState(userId, examState) {
    try {
      await setDoc(doc(db, COLLECTIONS.EXAM_STATES, userId), {
        ...examState,
        lastSaved: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving exam state:', error);
      return { success: false, error: error.message };
    }
  }

  // Get exam state
  async getExamState(userId) {
    try {
      const docRef = doc(db, COLLECTIONS.EXAM_STATES, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, state: docSnap.data() };
      } else {
        return { success: false, error: 'No saved state found' };
      }
    } catch (error) {
      console.error('Error getting exam state:', error);
      return { success: false, error: error.message };
    }
  }

  // Save webcam snapshot
  async saveWebcamSnapshot(userId, base64Image) {
    try {
      await setDoc(doc(db, COLLECTIONS.PARTICIPANT_VIDEOS, userId), {
        latestSnapshotBase64: base64Image,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving webcam snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all exam results (for counselors)
  async getAllResults() {
    try {
      const q = query(
        collection(db, COLLECTIONS.RESULTS),
        orderBy('submittedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, results };
    } catch (error) {
      console.error('Error fetching results:', error);
      return { success: false, error: error.message };
    }
  }

  // Get participant videos (for counselors)
  async getParticipantVideos() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PARTICIPANT_VIDEOS));
      
      const videos = [];
      querySnapshot.forEach((doc) => {
        videos.push({ userId: doc.id, ...doc.data() });
      });
      
      return { success: true, videos };
    } catch (error) {
      console.error('Error fetching participant videos:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ExamService();