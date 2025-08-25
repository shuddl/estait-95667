import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

export function getAdmin() {
  if (app) return app;
  
  const { 
    FIREBASE_PROJECT_ID, 
    FIREBASE_CLIENT_EMAIL, 
    FIREBASE_PRIVATE_KEY 
  } = process.env;
  
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin SDK not configured - using demo mode");
    // Return a mock for development
    return {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null }),
            set: async () => {},
            update: async () => {},
            delete: async () => {}
          })
        })
      }),
      auth: () => ({
        verifyIdToken: async () => ({ uid: "demo" }),
        createUser: async () => ({ uid: "demo" }),
        getUser: async () => ({ uid: "demo" })
      })
    } as any;
  }
  
  try {
    app = admin.apps[0] ?? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

export function db() { 
  return getAdmin().firestore(); 
}

export function adminAuth() {
  return getAdmin().auth();
}