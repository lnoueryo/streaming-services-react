// auth/auth.service.ts
import type { AuthProvider, AuthUser } from "./types";
import firebaseProvider from "./provider/firebase";

// 今の環境で選択
const provider: AuthProvider = firebaseProvider;

const AuthService = {
  signInWithGoogle: () => provider.signInWithGoogle(),
  signInWithEmail: (email: string, password: string) =>
    provider.signInWithEmail(email, password),

  signUpWithEmail: (email: string, password: string) =>
    provider.signUpWithEmail(email, password),

  signOut: () => provider.signOut(),
  getIdToken: () => provider.getIdToken(),
  onAuthStateChanged(cb: (user: AuthUser | null) => void) {
    return provider.onAuthStateChanged(cb);
  }
};

export default AuthService;