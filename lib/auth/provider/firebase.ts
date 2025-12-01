// auth/provider/firebase.ts
import { initializeApp, FirebaseError } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

import type { AuthProvider, AuthUser } from '../types';
import { AuthError, AuthErrorInfo } from '../auth-error';

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

export const firebaseAuthErrorMap: Record<string, AuthErrorInfo> = {
  'auth/invalid-email': {
    statusCode: 400,
    message: 'メールアドレスの形式が正しくありません',
  },
  'auth/wrong-password': {
    statusCode: 401,
    message: 'メールアドレスまたはパスワードが正しくありません',
  },
  'auth/user-not-found': {
    statusCode: 404,
    message: 'ユーザーが見つかりません',
  },
  'auth/id-token-expired': {
    statusCode: 401,
    message: '認証の有効期限が切れています。再度ログインしてください',
  },
  'auth/too-many-requests': {
    statusCode: 429,
    message: '試行回数が多すぎます。しばらく経ってから再試行してください',
  },
  'auth/internal-error': {
    statusCode: 500,
    message: 'サーバーでエラーが発生しました。時間をおいて再度お試しください',
  },
  'auth/email-already-in-use': {
    statusCode: 409,
    message: 'このメールアドレスは既に使用されています',
  },
  'auth/weak-password': {
    statusCode: 400,
    message: 'パスワードはもっと強固にしてください（6文字以上など）',
  },
};

const unknownError = {
  statusCode: 500,
  message: 'サーバーでエラーが発生しました。時間をおいて再度お試しください',
}

const firebaseProvider: AuthProvider = {
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const res = await signInWithPopup(auth, google);
      const token = await res.user.getIdToken();
      return { uid: res.user.uid, email: res.user.email, displayName: res.user.displayName, photoURL: res.user.photoURL, idToken: token };
    } catch (err) {
      if (err instanceof FirebaseError) {
        const error = firebaseAuthErrorMap[err.code]
        if (!error) {
          throw new AuthError(unknownError)
        }
        throw new AuthError(error);
      }
      throw err
    }
  },

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      return { uid: res.user.uid, email: res.user.email, idToken: token };
    } catch (err) {
      if (err instanceof FirebaseError) {
        const error = firebaseAuthErrorMap[err.code]
        if (!error) {
          throw new AuthError(unknownError)
        }
        throw new AuthError(error);
      }
      throw err
    }
  },

  async signUpWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      return { uid: res.user.uid, email: res.user.email, idToken: token };
    } catch (err) {
      if (err instanceof FirebaseError) {
        const error = firebaseAuthErrorMap[err.code]
        if (!error) {
          throw new AuthError(unknownError)
        }
        throw new AuthError(error);
      }
      throw err
    }
  },

  async signOut(): Promise<void> {
    try {
      await auth.signOut();
    } catch (err) {
      if (err instanceof FirebaseError) {
        const error = firebaseAuthErrorMap[err.code]
        if (!error) {
          throw new AuthError(unknownError)
        }
        throw new AuthError(error);
      }
      throw err
    }
  },

  async getIdToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new AuthError({ statusCode: 401, message: "ユーザーが認証されていません。ログインしてください。" })
      }
      return await user.getIdToken();
    } catch (err) {
      if (err instanceof FirebaseError) {
        const error = firebaseAuthErrorMap[err.code]
        if (!error) {
          throw new AuthError(unknownError)
        }
        throw new AuthError(error);
      }
      throw err
    }
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
};

export default firebaseProvider;