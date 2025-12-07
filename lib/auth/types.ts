// auth/types.ts

// まず AuthUser を定義（これがないとエラーになる）
export type AuthUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  idToken: string;
};

// 認証プロバイダのインターフェース
export interface AuthProvider {
  signInWithGoogle(): Promise<AuthUser>;
  signInWithEmail(email: string, password: string): Promise<AuthUser>;
  signUpWithEmail(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getIdToken(): Promise<string | null>;
  onAuthStateChanged(
    cb: (user: { id: string; email: string | null } | null) => void
  ): () => void;
  getCurrentUser(): { id: string; email: string | null } | null;
}