if (!window.auth) {
  window.auth = firebase.auth();
}
if (!window.db) {
  window.db = firebase.firestore();
}

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', async () => {
  try {
    await window.auth.signOut();
    window.location.href = 'login.html';
  } catch (error) {
    alert('Error logging out: ' + error.message);
  }
});

window.auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Check user role
  const userDoc = await window.db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) {
    alert('User data not found. Access denied.');
    window.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  const role = userDoc.data().role;
  if (role !== 'counselor') {
    alert('Access denied. Counselors only.');
    window.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  loadUsers();
});

const usersTableBody = document.getElementById('usersTableBody');

function createUserRow(userDoc) {
  const user = userDoc.data();
  const tr = document.createElement('tr');

  const nameTd = document.createElement('td');
  nameTd.textContent = user.name || '';

  const emailTd = document.createElement('td');
  emailTd.textContent = user.email || '';

  const statusTd = document.createElement('td');
  statusTd.textContent = 'Loading...';

  const levelTd = document.createElement('td');
  const select = document.createElement('select');
  select.className = 'form-select';
  ['Easy', 'Medium', 'Hard'].forEach(level => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level;
    select.appendChild(option);
  });
  levelTd.appendChild(select);

  const actionTd = document.createElement('td');
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Assign';
  saveBtn.addEventListener('click', async () => {
    const selectedLevel = select.value;
    const counselorEmail = window.auth.currentUser.email;
    try {
      await window.db.collection('user_exam_level').doc(userDoc.id).set({
        userId: userDoc.id,
        email: user.email,
        level: selectedLevel,
        assignedBy: counselorEmail,
        assignedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(`Assigned level ${selectedLevel} to ${user.email}`);
      statusTd.textContent = `${selectedLevel} level assigned`;
    } catch (error) {
      console.error('Error assigning level:', error);
      alert('Error assigning level. Please try again.');
    }
  });
  actionTd.appendChild(saveBtn);

  tr.appendChild(nameTd);
  tr.appendChild(emailTd);
  tr.appendChild(statusTd);
  tr.appendChild(levelTd);
  tr.appendChild(actionTd);

  // Fetch assigned level and update status
  window.db.collection('user_exam_level').doc(userDoc.id).get().then(doc => {
    if (doc.exists) {
      const assignedLevel = doc.data().level;
      statusTd.textContent = `${assignedLevel} level assigned`;
    } else {
      statusTd.textContent = 'Level not assigned';
    }
  }).catch(() => {
    statusTd.textContent = 'Error loading status';
  });

  return tr;
}

async function loadUsers() {
  try {
    // Fetch only users with role 'student' to assign exam levels
    const snapshot = await window.db.collection('users').where('role', '==', 'student').get();
    usersTableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const tr = createUserRow(doc);
      usersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}
