import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { setUser, logout } from "../features/auth/authSlice";

// Serialize Firebase User → plain object safe for Redux & localStorage
const serializeUser = (fbUser, name) => ({
  uid: fbUser.uid,
  email: fbUser.email,
  name: name ?? fbUser.displayName ?? null,
  emailVerified: fbUser.emailVerified,
  photoURL: fbUser.photoURL || null,
});

/**
 * Keeps Redux (and localStorage) auth state in sync with the REAL Firebase Auth
 * session at all times.
 *
 * Why this matters: previously, Redux's `user`/`role` were only ever written on
 * login/signup and then persisted to localStorage forever. If the actual Firebase
 * session later became invalid (token expired/revoked, user signed out in another
 * tab, cleared site data, disabled account, etc.), Redux still *thought* the user
 * was logged in — the UI would happily show the booking form, but every write to
 * Firestore would fail with "Missing or insufficient permissions" because
 * `request.auth` was actually null/mismatched server-side.
 *
 * Mounting this once near the root re-derives Redux state from `onAuthStateChanged`
 * on every load and on every auth change, so the UI can never drift out of sync
 * with what Firestore will actually allow.
 */
const AuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        dispatch(logout());
        return;
      }

      try {
        // Admins are tracked in a separate collection (skip role lookup for them)
        const adminDoc = await getDoc(doc(db, "admins", fbUser.uid));
        if (adminDoc.exists()) {
          dispatch(setUser({ user: serializeUser(fbUser), role: "admin" }));
          return;
        }

        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          dispatch(setUser({
            user: serializeUser(fbUser, data.name),
            role: data.role,
          }));
        } else {
          // Valid Firebase session but no Firestore profile yet (e.g. mid Google
          // signup role-selection) — don't fabricate a role.
          dispatch(logout());
        }
      } catch (err) {
        console.error("AuthListener: failed to sync auth state:", err);
      }
    });

    return () => unsub();
  }, [dispatch]);

  return null;
};

export default AuthListener;
