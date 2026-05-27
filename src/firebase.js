import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** Secondary app so admin can create staff logins without signing out. */
export const SECONDARY_APP_NAME = 'DriverProvisioner';

export const getSecondaryApp = () => {
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  return existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
};

export const getSecondaryAuth = () => getAuth(getSecondaryApp());

/** Firestore tied to secondary auth — used while the new staff user is signed in there. */
export const getSecondaryDb = () => getFirestore(getSecondaryApp());
