# Online Exam System

This is a web-based Online Exam System designed for Srinivas University Entrance Exams. The system allows students to register, login, and take exams online with role-based access for counselors and administrators. It integrates with Firebase for authentication, database, and security.

---

## Features

- **User Roles:** Admin, Counselor, Student
- **User Registration & Login:** Secure authentication using Firebase Authentication
- **Role-based Access:** Different dashboards and functionalities for each user role
- **Exam Assignment:** Counselors can assign exam levels (Easy, Medium, Hard) to students
- **Online Exam:** Students can take exams with question navigation, timers, and webcam monitoring for exam security
- **Real-time Database:** Firestore used for storing users, exam questions, assignments, and results
- **Responsive UI:** Built with Bootstrap and custom CSS for a clean, responsive design
- **Exam Security:** Webcam monitoring and exam guidelines to prevent cheating

---

## Project Structure

- `index.html` - Home page with welcome message and navigation
- `login.html` - User login page with role-based redirection
- `register.html` - User registration page with role and course selection
- `admin.html` - Admin dashboard for managing the system
- `dashboard.html` - Counselor dashboard for managing students and exam assignments
- `assign-level.html` - Page for counselors to assign exam levels to students
- `exam.html` - Exam interface for students with question navigation and timers

- `css/` - Stylesheets for different pages and components
- `js/` - JavaScript files handling authentication, exam logic, admin and counselor functionalities, and Firebase integration
- `public/` - Public assets like images (e.g., Srinivas University logo, hero background)

- Firebase configuration files:
  - `firebase.json`
  - `firestore.rules`
  - `firestore.indexes.json`
  - `.firebaserc`

---

## Setup and Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd online-exam
   ```

2. **Firebase Setup:**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create Firestore database in production mode
   - Download your Firebase service account JSON and place it as `firebase-service-account.json` in the project root
   - Update `js/firebase.js` with your Firebase project configuration

3. **Install Node.js dependencies (for import scripts):**

   ```bash
   npm install firebase-admin
   ```

4. **Import Exam Questions:**

   - Use the provided Node.js script `scripts/import-questions-medium.js` to import medium-level questions into Firestore
   - Run the script:

     ```bash
     node scripts/import-questions-medium.js
     ```

   - Similar scripts can be created for other exam levels (Easy, Hard)

5. **Serve the project:**

   - You can serve the static files using any HTTP server or open `index.html` directly in a browser
   - For full Firebase functionality, deploy to Firebase Hosting or a compatible environment

---

## Usage

- **Registration:** New users register with role selection (student, counselor, admin). Students must wait for counselor approval and exam assignment.
- **Login:** Users login and are redirected based on their role.
- **Counselor:** Assign exam levels to students via the Assign Level page.
- **Student:** Take assigned exams with real-time monitoring and navigation.
- **Admin:** Manage overall system settings and users.

---

## Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 for responsive UI
- Firebase Authentication and Firestore
- Node.js for backend scripts (question import)
- Webcam API for exam security

---

## Folder Structure

```
/css
/js
/public
index.html
login.html
register.html
admin.html
dashboard.html
assign-level.html
exam.html
firebase.json
firestore.rules
firestore.indexes.json
firebase-service-account.json
scripts/
```

---

## Contributing

Contributions are welcome. Please fork the repository and create a pull request with your changes.

---

## License

This project is licensed under the MIT License.

---

## Contact

For any queries or support, please contact the project maintainer.
