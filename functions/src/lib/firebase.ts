import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK with default credentials
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error) {
  console.log("Firebase Admin already initialized");
}

export const db = admin.firestore();
export const auth = admin.auth();