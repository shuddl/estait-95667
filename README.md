# Estait

Estait is a mobile-first conversational AI layer designed to streamline the workflows of real estate agents. It integrates with existing CRM and MLS systems through natural language, providing a unified and efficient platform for managing contacts, properties, and tasks.

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/estait.git
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Firebase:**
   - Create a new Firebase project.
   - Add a web app to your project.
   - Copy the Firebase config object and paste it into a `.env.local` file in the root of the project.
   - Enable Firebase Authentication, Firestore, and Cloud Functions.
   - Set up the required environment variables for the cloud functions.
4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Deployment

To deploy the application to Firebase Hosting, run the following command:

```bash
firebase deploy --only hosting
```
