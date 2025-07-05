import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { COLLECTIONS, USER_ROLES } from '../utils/constants.js';

class CounselorService {
  // Get all students
  async getStudents() {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', USER_ROLES.STUDENT)
      );
      const querySnapshot = await getDocs(q);
      
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, students };
    } catch (error) {
      console.error('Error fetching students:', error);
      return { success: false, error: error.message };
    }
  }

  // Assign exam level to student
  async assignExamLevel(studentId, level, counselorEmail) {
    try {
      await setDoc(doc(db, COLLECTIONS.USER_EXAM_LEVEL, studentId), {
        userId: studentId,
        level,
        assignedBy: counselorEmail,
        assignedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error assigning exam level:', error);
      return { success: false, error: error.message };
    }
  }

  // Get student's assigned level
  async getStudentExamLevel(studentId) {
    try {
      const docRef = doc(db, COLLECTIONS.USER_EXAM_LEVEL, studentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, assignment: docSnap.data() };
      } else {
        return { success: false, error: 'No assignment found' };
      }
    } catch (error) {
      console.error('Error getting student exam level:', error);
      return { success: false, error: error.message };
    }
  }

  // Get exam results with filters
  async getExamResults(filters = {}) {
    try {
      let q = collection(db, COLLECTIONS.RESULTS);
      
      if (filters.level) {
        q = query(q, where('level', '==', filters.level));
      }
      if (filters.section) {
        q = query(q, where('section', '==', filters.section));
      }
      
      const querySnapshot = await getDocs(q);
      const results = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, results };
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return { success: false, error: error.message };
    }
  }

  // Get participant webcam snapshots
  async getParticipantSnapshots() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PARTICIPANT_VIDEOS));
      const snapshots = [];
      querySnapshot.forEach((doc) => {
        snapshots.push({ userId: doc.id, ...doc.data() });
      });
      return { success: true, snapshots };
    } catch (error) {
      console.error('Error fetching participant snapshots:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CounselorService();