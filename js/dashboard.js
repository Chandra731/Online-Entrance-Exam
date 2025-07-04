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

// Participant video monitoring
const participantVideosContainer = document.getElementById('participantVideos');

async function loadParticipantVideos() {
  try {
    const snapshot = await window.db.collection('participant_videos').get();

    participantVideosContainer.innerHTML = '';

    snapshot.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      const base64Image = data.latestSnapshotBase64; // Assuming base64 string stored here

      if (base64Image) {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'participant-video';
        videoDiv.style.width = '160px';
        videoDiv.style.border = '1px solid #ccc';
        videoDiv.style.borderRadius = '8px';
        videoDiv.style.padding = '4px';
        videoDiv.style.textAlign = 'center';

        const img = document.createElement('img');
        img.src = base64Image;
        img.alt = `Participant ${userId} video snapshot`;
        img.style.width = '100%';
        img.style.borderRadius = '6px';

        const label = document.createElement('div');
        label.textContent = userId;
        label.style.fontSize = '0.8rem';
        label.style.marginTop = '4px';
        label.style.wordBreak = 'break-word';

        videoDiv.appendChild(img);
        videoDiv.appendChild(label);

        participantVideosContainer.appendChild(videoDiv);
      }
    });
  } catch (error) {
    console.error('Error loading participant videos from Firestore:', error);
    participantVideosContainer.innerHTML = '<p>Failed to load participant videos.</p>';
  }
}

// Refresh participant videos every 15 seconds
setInterval(loadParticipantVideos, 15000);
loadParticipantVideos();

const assignLevelBtn = document.getElementById('assignLevelBtn');
assignLevelBtn.addEventListener('click', () => {
  window.location.href = 'assign-level.html';
});

auth.onAuthStateChanged(async (user) => {
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

  loadResults();
});

const levelFilter = document.getElementById('levelFilter');
const sectionFilter = document.getElementById('sectionFilter');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');

let allResults = [];

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleString();
}

function renderTable(results) {
  resultsTableBody.innerHTML = '';
  results.forEach(result => {
    const tr = document.createElement('tr');

    // Safely extract score and total if they are objects
    let score = '';
    let total = '';
    if (result.score !== undefined && result.score !== null) {
      if (typeof result.score === 'object' && result.score !== null) {
        score = result.score.correct || '';
      } else {
        score = result.score;
      }
    }
    if (result.total !== undefined && result.total !== null) {
      if (typeof result.total === 'object' && result.total !== null) {
        total = result.total.total || '';
      } else {
        total = result.total;
      }
    }

    // Safely extract percentage
    let percentage = '';
    if (result.percentage !== undefined && result.percentage !== null) {
      if (typeof result.percentage === 'object' && result.percentage !== null) {
        percentage = result.percentage.percentage || '';
      } else {
        percentage = result.percentage;
      }
    }

    tr.innerHTML = `
      <td>${result.name || ''}</td>
      <td>${result.email || ''}</td>
      <td>${result.level || ''}</td>
      <td>${result.section || ''}</td>
      <td>${score} / ${total}</td>
      <td>${percentage !== '' ? Number(percentage).toFixed(2) : ''}%</td>
      <td>${formatTimestamp(result.submittedAt)}</td>
    `;
    resultsTableBody.appendChild(tr);
  });
}

function filterResults() {
  const level = levelFilter.value;
  const section = sectionFilter.value;

  let filtered = allResults;

  if (level !== 'All') {
    filtered = filtered.filter(r => r.level === level);
  }
  if (section !== 'All') {
    filtered = filtered.filter(r => r.section === section);
  }

  renderTable(filtered);
}

async function loadResults() {
  try {
    const snapshot = await window.db.collection('results').orderBy('submittedAt', 'desc').get();
    allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterResults();
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

function downloadCSV() {
  const rows = [['Name', 'Email', 'Level', 'Section', 'Score / Total', 'Percentage', 'Submitted At']];
  const trs = resultsTableBody.querySelectorAll('tr');
  trs.forEach(tr => {
    const row = [];
    tr.querySelectorAll('td').forEach(td => {
      row.push(td.textContent);
    });
    rows.push(row);
  });

  let csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "exam_results.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

levelFilter.addEventListener('change', filterResults);
sectionFilter.addEventListener('change', filterResults);
downloadCsvBtn.addEventListener('click', downloadCSV);
