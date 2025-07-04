// Firebase configuration and initialization
// Replace the placeholder values with your Firebase project config
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
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export auth and db for use in other scripts if needed
// (In vanilla JS, you can access these globals directly)
window.auth = auth;
window.db = db;
