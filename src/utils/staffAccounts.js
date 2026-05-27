import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, getSecondaryAuth, getSecondaryDb } from '../firebase';
import { generateDriverPassword } from './driverPassword';
import { loadBusinessName } from './createDriverAccount';
import { STAFF_TYPES } from './roles';

const STAFF_AUTH_COLLECTION = 'staffAuth';

export const saveStaffAuthCredentials = async (staffKey, { email, password, uid, staffType }) => {
  await setDoc(doc(db, STAFF_AUTH_COLLECTION, staffKey), {
    email: email.trim().toLowerCase(),
    password,
    uid: uid || null,
    staffType,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Creates Firebase Auth + users/{uid} for internal staff (support / maintenance).
 */
export const provisionStaffLogin = async ({ email, name, phone, staffType }) => {
  if (staffType === STAFF_TYPES.DRIVER) {
    throw new Error('Use provisionDriverLogin for driver staff.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const businessName = await loadBusinessName();
  const password = generateDriverPassword(businessName);
  const secondaryAuth = getSecondaryAuth();

  let credential;
  const staffKey = `STF-${staffType}-${Date.now().toString().slice(-6)}`;
  const secondaryDb = getSecondaryDb();

  try {
    credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);

    // New user is signed in on secondary auth — write profile + credentials with their token.
    await setDoc(doc(secondaryDb, 'users', credential.user.uid), {
      email: normalizedEmail,
      name: name.trim(),
      phone: (phone || '').trim(),
      role: 'staff',
      staffType,
      staffKey,
      verified: true,
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(secondaryDb, STAFF_AUTH_COLLECTION, staffKey), {
      email: normalizedEmail,
      password,
      uid: credential.user.uid,
      staffType,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      /* ignore */
    }
  }

  return { uid: credential.user.uid, password, email: normalizedEmail, staffKey };
};

export const resetStaffPortalPassword = async ({ staffKey, email, staffType }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const businessName = await loadBusinessName();
  const password = generateDriverPassword(businessName);
  const secondaryAuth = getSecondaryAuth();

  const existingSnap = await getDoc(doc(db, STAFF_AUTH_COLLECTION, staffKey));
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  try {
    if (existing?.password) {
      await signInWithEmailAndPassword(secondaryAuth, normalizedEmail, existing.password);
      await updatePassword(secondaryAuth.currentUser, password);
    } else {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedEmail,
        password
      );
      await setDoc(
        doc(db, 'users', credential.user.uid),
        { email: normalizedEmail, role: 'staff', staffType, createdAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      /* ignore */
    }
  }

  await saveStaffAuthCredentials(staffKey, {
    email: normalizedEmail,
    password,
    uid: existing?.uid,
    staffType,
  });

  return { email: normalizedEmail, password };
};

export const fetchStaffAuthCredentials = async ({ uid, staffKey } = {}) => {
  if (staffKey) {
    const snap = await getDoc(doc(db, STAFF_AUTH_COLLECTION, staffKey));
    if (snap.exists()) return { ...snap.data(), staffKey: snap.id };
  }
  if (uid) {
    const snapshot = await getDocs(collection(db, STAFF_AUTH_COLLECTION));
    const match = snapshot.docs.find((d) => d.data().uid === uid);
    if (match) return { ...match.data(), staffKey: match.id };
  }
  return null;
};
