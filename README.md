# Estait

Estait is a mobile-first conversational AI layer designed to streamline the workflows of real estate agents. It integrates with existing CRM and MLS systems through natural language, providing a unified and efficient platform for managing contacts, properties, and tasks.

## 1. Project Setup

To get started with the Estait project, you'll need to have the following prerequisites installed:

- Node.js
- npm
- Firebase CLI

Once you have the prerequisites, you can follow these steps to set up the project:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/estait.git
    ```
2.  **Install the dependencies:**
    ```bash
    npm install
    ```
3.  **Set up your Firebase project:**
    - Create a new project in the [Firebase console](https://console.firebase.google.com/).
    - Add a web app to your project and copy the Firebase configuration object.
    - Create a `.env.local` file in the root of the project and add your Firebase configuration to it:
      ```
      NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
      NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
      ```
4.  **Set up your CRM and RealEstateAPI.com integrations:**
    - In the Firebase console, go to the Functions section and add the following environment variables:
      ```
      FOLLOWUPBOSS_CLIENT_ID=your-client-id
      FOLLOWUPBOSS_CLIENT_SECRET=your-client-secret
      FOLLOWUPBOSS_REDIRECT_URI=your-redirect-uri
      WISEAGENT_CLIENT_ID=your-client-id
      WISEAGENT_CLIENT_SECRET=your-client-secret
      WISEAGENT_REDIRECT_URI=your-redirect-uri
      REALESTATEAPI_KEY=your-api-key
      DIALOGFLOW_PROJECT_ID=your-project-id
      ENCRYPTION_KEY=your-encryption-key
      ```
5.  **Run the development server:**
    ```bash
    npm run dev
    ```

## 2. Deployment

To deploy the Estait application to Firebase Hosting, you can use the following command:

```bash
firebase deploy
```

This will build the application for production and deploy it to Firebase Hosting.
