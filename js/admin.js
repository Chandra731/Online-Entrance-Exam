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
  if (role !== 'admin') {
    alert('Access denied. Admins only.');
    window.auth.signOut();
    window.location.href = 'login.html';
    return;
  }
});

// Handle question form submission
const questionForm = document.getElementById('questionForm');
const formMessage = document.getElementById('formMessage');

const filterLevel = document.getElementById('filterLevel');
const filterSection = document.getElementById('filterSection');
const questionsPreview = document.getElementById('questionsPreview');

let questions = [];
let editingQuestionId = null;

questionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMessage.textContent = '';
  formMessage.className = '';

  // Get form values
  const question = document.getElementById('question').value.trim();
  const optionA = document.getElementById('optionA').value.trim();
  const optionB = document.getElementById('optionB').value.trim();
  const optionC = document.getElementById('optionC').value.trim();
  const optionD = document.getElementById('optionD').value.trim();
  const correctAnswer = document.getElementById('correctAnswer').value;
  const level = document.getElementById('level').value;
  const section = document.getElementById('section').value;

  if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !level || !section) {
    formMessage.textContent = 'Please fill in all fields.';
    formMessage.className = 'text-danger';
    return;
  }

  // Prepare question data
  const questionData = {
    question: question,
    options: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD
    },
    correct_answer: correctAnswer,
    level: level,
    section: section,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editingQuestionId) {
      // Update existing question
      await db.collection('questions').doc(editingQuestionId).update(questionData);
      formMessage.textContent = 'Question updated successfully!';
      editingQuestionId = null;
    } else {
      // Add new question
      await db.collection('questions').add(questionData);
      formMessage.textContent = 'Question submitted successfully!';
    }
    formMessage.className = 'text-success';

    // Reset form
    questionForm.reset();
    loadQuestions();
  } catch (error) {
    console.error('Error adding/updating question: ', error);
    formMessage.textContent = 'Error submitting question. Please try again.';
    formMessage.className = 'text-danger';
  }
});

filterLevel.addEventListener('change', loadQuestions);
filterSection.addEventListener('change', loadQuestions);

function createQuestionElement(question) {
  const div = document.createElement('div');
  div.className = 'list-group-item';

  const questionText = document.createElement('h5');
  questionText.textContent = question.question;
  div.appendChild(questionText);

  const details = document.createElement('p');
  details.innerHTML = `
    <strong>Options:</strong><br/>
    A: ${question.options.A}<br/>
    B: ${question.options.B}<br/>
    C: ${question.options.C}<br/>
    D: ${question.options.D}<br/>
    <strong>Correct Answer:</strong> ${question.correct_answer}<br/>
    <strong>Level:</strong> ${question.level}<br/>
    <strong>Section:</strong> ${question.section}
  `;
  div.appendChild(details);

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-sm btn-warning';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => {
    editingQuestionId = question.id;
    document.getElementById('question').value = question.question;
    document.getElementById('optionA').value = question.options.A;
    document.getElementById('optionB').value = question.options.B;
    document.getElementById('optionC').value = question.options.C;
    document.getElementById('optionD').value = question.options.D;
    document.getElementById('correctAnswer').value = question.correct_answer;
    document.getElementById('level').value = question.level;
    document.getElementById('section').value = question.section;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  div.appendChild(editBtn);

  return div;
}

async function loadQuestions() {
  try {
    const levelFilterValue = filterLevel.value;
    const sectionFilterValue = filterSection.value;

    let query = db.collection('questions');
    if (levelFilterValue !== '') {
      query = query.where('level', '==', levelFilterValue);
    }
    if (sectionFilterValue !== '') {
      query = query.where('section', '==', sectionFilterValue);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    questionsPreview.innerHTML = '';
    if (questions.length === 0) {
      questionsPreview.textContent = 'No questions found for the selected filters.';
      return;
    }

    questions.forEach(question => {
      const questionEl = createQuestionElement(question);
      questionsPreview.appendChild(questionEl);
    });
  } catch (error) {
    console.error('Error loading questions:', error);
    questionsPreview.textContent = 'Error loading questions. Please try again later.';
  }
}

// Initial load
loadQuestions();
