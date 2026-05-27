import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { buildUserFromFirestore } from '../utils/userProfile';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (firebaseUser) => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      return buildUserFromFirestore(firebaseUser, userDoc.data());
    }
    return buildUserFromFirestore(firebaseUser, { role: 'customer' });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await firebaseUser.getIdToken(true);
          const profile = await loadUserProfile(firebaseUser);
          setCurrentUser(profile);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(buildUserFromFirestore(firebaseUser, { role: 'customer' }));
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [loadUserProfile]);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await credential.user.getIdToken(true);
    const profile = await loadUserProfile(credential.user);
    setCurrentUser(profile);
    return { credential, role: profile.role, profile };
  };

  const register = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name,
      role: 'customer',
      isBetaTester: true,
      verified: false,
      createdAt: new Date().toISOString(),
    });

    const profile = buildUserFromFirestore(user, { name, role: 'customer', isBetaTester: true, verified: false });
    setCurrentUser(profile);
    return { credential: userCredential, role: 'customer' };
  };

  const logout = async () => signOut(auth);

  const resetPassword = async (email) => sendPasswordResetEmail(auth, email);

  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    const profile = await loadUserProfile(auth.currentUser);
    setCurrentUser(profile);
    return profile;
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
