// @/utils/firebase.ts
import admin from 'firebase-admin';

let db: FirebaseFirestore.Firestore;

const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      // In production, use environment variable
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        : require('../../serviceAccountKey.json');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase admin initialization error', error);
      throw error;
    }
  }
  
  if (!db) {
    db = admin.firestore();
  }
  
  return db;
};

export { initializeFirebase };
export const getDb = () => {
  if (!db) {
    return initializeFirebase();
  }
  return db;
};