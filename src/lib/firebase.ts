// Firestore + Firebase Auth implementation of the sync Remote. Loaded only when the Sync card is used or a
// signed-in session exists, so the rest of the app never depends on it.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, type User } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore/lite';
import { firebaseConfig } from '../firebase-config';
import type { Remote, RemoteDoc } from './sync';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const fs = getFirestore(app);
export const onUser = (f: (u: User | null) => void) => onAuthStateChanged(auth, f);
export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signUp = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const signOutUser = () => signOut(auth);
export function authMessage(e: any): string {
  const c = String(e?.code || '');
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return 'Email or password is not right.';
  if (/email-already-in-use/.test(c)) return 'An account with this email already exists. Use Sign in.';
  if (/weak-password/.test(c)) return 'Choose a password of at least 6 characters.';
  if (/invalid-email/.test(c)) return 'That email address is not valid.';
  if (/network-request-failed/.test(c)) return 'No connection. Sync needs the internet; study does not.';
  if (/operation-not-allowed|admin-restricted/.test(c)) return 'New accounts are switched off for this app. Use Sign in.';
  if (/too-many-requests/.test(c)) return 'Too many attempts. Wait a few minutes and try again.';
  if (/permission-denied/.test(c)) return 'The cloud refused access. Sign out and in again.';
  return e?.message || 'Something went wrong.';
}
// Record keys contain "/" and Arabic letters; Firestore document ids cannot contain "/".
const idOf = (k: string) => encodeURIComponent(k).replace(/\./g, '%2E');
export function remoteFor(uid: string): Remote {
  const col = collection(fs, 'users', uid, 'items');
  return {
    async pull(since) {
      const docs: RemoteDoc[] = []; let cursor = since; let last: any = null;
      for (;;) {
        const q = last ? query(col, where('s', '>', Timestamp.fromMillis(since)), orderBy('s'), startAfter(last), limit(500)) : query(col, where('s', '>', Timestamp.fromMillis(since)), orderBy('s'), limit(500));
        const snap = await getDocs(q);
        snap.forEach((d) => { const x = d.data() as any; docs.push({ k: x.k, u: x.u, d: x.d ?? null }); cursor = Math.max(cursor, x.s?.toMillis?.() || 0); });
        if (snap.size < 500) break;
        last = snap.docs[snap.docs.length - 1];
      }
      return { docs, cursor };
    },
    async push(docs) {
      for (let i = 0; i < docs.length; i += 300) {
        const b = writeBatch(fs);
        for (const d of docs.slice(i, i + 300)) b.set(doc(col, idOf(d.k)), { k: d.k, u: d.u, d: d.d, s: serverTimestamp() });
        await b.commit();
      }
    },
  };
}
