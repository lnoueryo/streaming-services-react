// auth/provider/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

import type { AuthProvider, AuthUser } from '../types';

// ------------ Initialize Firebase --------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const google = new GoogleAuthProvider();

// ------------ Implementation -------------------
const firebaseProvider: AuthProvider = {
  async signInWithGoogle() {
    const res = await signInWithPopup(auth, google);
    const token = await res.user.getIdToken();

    return {
      uid: res.user.uid,
      email: res.user.email,
      displayName: res.user.displayName,
      photoURL: res.user.photoURL,
      idToken: token,
    };
  },

  async signInWithEmail(email, password) {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const token = await res.user.getIdToken();

    return {
      uid: res.user.uid,
      email: res.user.email,
      idToken: token,
    };
  },

  async signUpWithEmail(email, password) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const token = await res.user.getIdToken();

    return {
      uid: res.user.uid,
      email: res.user.email,
      idToken: token,
    };
  },

  async signOut() {
    await auth.signOut();
  },

  async getIdToken() {
    const user = auth.currentUser;
    return user ? user.getIdToken() : null;
  },
  onAuthStateChanged(cb) {
    return onAuthStateChanged(auth, (user) => {
      if (!user) return cb(null);
      cb({ id: user.uid, email: user.email });
    });
  },

  getCurrentUser() {
    const user = auth.currentUser;
    if (!user) return null;
    return { id: user.uid, email: user.email };
  },
  waitAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged(() => {
        unsub();
        resolve();
      });
    });
  }
};

export default firebaseProvider;