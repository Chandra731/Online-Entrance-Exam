// Client-side form validation for register form
const registerForm = document.getElementById('registerForm');
const courseDiv = document.getElementById('courseDiv');
const courseSelect = document.getElementById('course');
const roleSelect = document.getElementById('role');

// Show/hide course selection based on role
roleSelect.addEventListener('change', () => {
  if (roleSelect.value === 'student') {
    courseDiv.style.display = 'block';
    courseSelect.required = true;
  } else {
    courseDiv.style.display = 'none';
    courseSelect.required = false;
    courseSelect.value = '';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const course = courseSelect.value;
  const role = roleSelect.value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!username || !email || !role || !password || !confirmPassword || (role === 'student' && !course)) {
    alert('Please fill in all required fields.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  // Implement Firebase Auth user creation and Firestore user document creation
  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user document in Firestore with selected role
    await firebase.firestore().collection('users').doc(user.uid).set({
      userId: user.uid,
      name: username,
      email: email,
      course: role === 'student' ? course : '',
      role: role
    });

    alert('Registration successful! You can now login.');
    registerForm.reset();
    window.location.href = 'login.html';
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
});
