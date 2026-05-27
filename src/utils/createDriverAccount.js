import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, getSecondaryAuth, getSecondaryDb } from '../firebase';
import { generateDriverPassword } from './driverPassword';

const DRIVER_AUTH_COLLECTION = 'driverAuth';

const DEFAULT_BUSINESS_NAME = 'Drive PH Car Rentals';

export const loadBusinessName = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    return snap.data()?.businessName || DEFAULT_BUSINESS_NAME;
  } catch {
    return DEFAULT_BUSINESS_NAME;
  }
};

/**
 * Creates Firebase Auth + users/{uid} for a new chauffeur (admin stays signed in).
 * @returns {{ uid: string, password: string }}
 */
export const provisionDriverLogin = async ({ email, name, phone, driverId }) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required to create a driver login.');
  }

  const businessName = await loadBusinessName();
  const password = generateDriverPassword(businessName);
  const secondaryAuth = getSecondaryAuth();

  let credential;
  const secondaryDb = getSecondaryDb();

  try {
    credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);

    await setDoc(doc(secondaryDb, 'users', credential.user.uid), {
      email: normalizedEmail,
      name: name.trim(),
      phone: (phone || '').trim(),
      role: 'staff',
      staffType: 'driver',
      driverId,
      verified: false,
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(secondaryDb, DRIVER_AUTH_COLLECTION, driverId), {
      email: normalizedEmail,
      password,
      uid: credential.user.uid,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      /* ignore */
    }
  }

  return { uid: credential.user.uid, password, email: normalizedEmail };
};

/** Staff-only store — chauffeurs cannot read this collection. */
export const saveDriverAuthCredentials = async (driverId, { email, password, uid }) => {
  await setDoc(doc(db, DRIVER_AUTH_COLLECTION, driverId), {
    email: email.trim().toLowerCase(),
    password,
    uid: uid || null,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchDriverAuthCredentials = async (driverId) => {
  if (!driverId) return null;
  const snap = await getDoc(doc(db, DRIVER_AUTH_COLLECTION, driverId));
  if (!snap.exists()) return null;
  return snap.data();
};

/** New password (company prefix + random) and sync Firebase Auth + driverAuth doc. */
export const resetDriverPortalPassword = async ({ driverId, email }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await fetchDriverAuthCredentials(driverId);
  const businessName = await loadBusinessName();
  const password = generateDriverPassword(businessName);
  const secondaryAuth = getSecondaryAuth();

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
        {
          email: normalizedEmail,
          role: 'staff',
          staffType: 'driver',
          driverId,
          createdAt: new Date().toISOString(),
        },
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

  await saveDriverAuthCredentials(driverId, {
    email: normalizedEmail,
    password,
    uid: existing?.uid || null,
  });

  return { email: normalizedEmail, password };
};

export const getDriverAuthErrorMessage = (err) => {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'This email already has an account. Use a different email or link the existing user manually in Firestore (role: driver, driverId).';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Generated password was rejected. Try again or contact support.';
  }
  if (code === 'permission-denied') {
    return 'Permission denied creating staff login. Deploy the latest firestore.rules, then confirm your account has role "admin" in Firestore users/{yourUid}.';
  }
  return err?.message || 'Could not create staff login.';
};

export const getStaffAuthErrorMessage = getDriverAuthErrorMessage;
