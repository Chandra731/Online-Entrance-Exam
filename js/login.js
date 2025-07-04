if (!window.auth) {
  window.auth = firebase.auth();
}
if (!window.db) {
  window.db = firebase.firestore();
}

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginMessage = document.getElementById('loginMessage');
  loginMessage.textContent = '';

  try {
    const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // After login, get user role from Firestore users collection
    const userDoc = await window.db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      loginMessage.textContent = 'User data not found. Please contact support.';
      await window.auth.signOut();
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;

    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else if (role === 'counselor') {
      window.location.href = 'dashboard.html';
    } else if (role === 'student') {
      // For students, get assigned exam level
      const assignmentDoc = await window.db.collection('user_exam_level').doc(user.uid).get();
      if (assignmentDoc.exists) {
        const assignedLevel = assignmentDoc.data().level;
        if (assignedLevel === 'Easy') {
          window.location.href = `exam.html?level=Easy`;
        } else if (assignedLevel === 'Medium') {
          window.location.href = `exam.html?level=Medium`;
        } else if (assignedLevel === 'Hard') {
          window.location.href = `exam.html?level=Hard`;
        } else {
          loginMessage.textContent = 'No valid exam level assigned. Please contact your counselor.';
          await window.auth.signOut();
          return;
        }
      } else {
        loginMessage.textContent = 'Your exam is not yet assigned, waiting for the counselor approval.';
        await window.auth.signOut();
        return;
      }
    } else {
      loginMessage.textContent = 'Unrecognized user role. Please contact support.';
      await window.auth.signOut();
      return;
    }
  } catch (error) {
    loginMessage.textContent = 'Login failed: ' + error.message;
  }
});
