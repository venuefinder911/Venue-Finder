import { auth, db } from "../../services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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

// ✅ GOOGLE SIGN-IN — opens Google popup.
// Returns { user, role, isNew:false } if the account is already registered,
// or { user, isNew:true } if there is no profile yet (caller must ask for a role).
export const googleSignIn = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;

  // Admins skip the users collection (same as email login)
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (adminDoc.exists()) {
    return { user: serializeUser(user), role: "admin", isNew: false };
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return {
      user: { ...serializeUser(user), name: userData.name || user.displayName || null },
      role: userData.role,
      isNew: false,
    };
  }

  // Google user with no profile yet — role must be chosen before completing signup
  return { user: serializeUser(user), isNew: true };
};

// ✅ COMPLETE GOOGLE SIGNUP — creates the Firestore profile with the chosen role.
// Google emails are already verified, so no verification email is needed.
export const completeGoogleSignup = async (role) => {
  const user = auth.currentUser;
  if (!user) throw new Error("NO_GOOGLE_SESSION");

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    name: user.displayName || "",
    role,
    createdAt: new Date(),
  });

  return { user: serializeUser(user), role };
};

// ✅ CANCEL GOOGLE SIGNUP — signs out a Google user who abandoned role selection,
// so no half-registered session is left behind.
export const cancelGoogleSignup = async () => {
  await auth.signOut();
};
