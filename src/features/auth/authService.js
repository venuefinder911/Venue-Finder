import { auth, db } from "../../services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Serialize Firebase User → plain object safe for Redux & localStorage
const serializeUser = (user) => ({
  uid: user.uid,
  email: user.email,
  name: user.displayName || null,
  emailVerified: user.emailVerified,
  photoURL: user.photoURL || null,
});

// ✅ SIGNUP — creates account, saves user to Firestore, and sends verification email
export const signupUser = async (email, password, role, name) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  const user = userCredential.user;

  // Send verification email immediately after account creation
  await sendEmailVerification(user);

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    name,
    role,
    createdAt: new Date(),
  });

  return { user: { ...serializeUser(user), name }, role };
};

// ✅ LOGIN — checks admins collection first; then checks email verification for regular users
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  const user = userCredential.user;

  // Check if this user is a registered admin (skip email verification for admins)
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (adminDoc.exists()) {
    return { user: serializeUser(user), role: "admin" };
  }

  // Block unverified regular users from logging in
  if (!user.emailVerified) {
    await auth.signOut(); // sign them out immediately
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();

  return {
    user: { ...serializeUser(user), name: userData.name || null },
    role: userData.role,
  };
};
