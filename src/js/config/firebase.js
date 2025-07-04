// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB98_tiax7cKO-o8hPmXS_ogPJ6e54Bt1Y",
  authDomain: "online-exam-b6af8.firebaseapp.com",
  projectId: "online-exam-b6af8",
  storageBucket: "online-exam-b6af8.firebasestorage.app",
  messagingSenderId: "827742253267",
  appId: "1:827742253267:web:809e4e4d0178ec01b4e426",
  measurementId: "G-LBK2PL78VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export app for other uses
export default app;