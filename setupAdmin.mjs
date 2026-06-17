import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUuPaXjT9f5g0ij0qUOsWXjbS2_Ha_e9U",
  authDomain: "venue-finder-911.firebaseapp.com",
  projectId: "venue-finder-911",
  storageBucket: "venue-finder-911.firebasestorage.app",
  messagingSenderId: "650042021424",
  appId: "1:650042021424:web:738a59140febe95500fff5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_UID = "h1KEovcXQggQPBx907u8UGdANaD2";
const ADMIN_EMAIL = "venuefinder911@gmail.com";

async function setupAdmin() {
  const ref = doc(db, "admins", ADMIN_UID);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    console.log("Admin document already exists — nothing to do.");
    process.exit(0);
  }

  await setDoc(ref, {
    uid: ADMIN_UID,
    email: ADMIN_EMAIL,
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  console.log("Admin document created successfully in Firestore!");
  console.log(`   Collection: admins`);
  console.log(`   Document ID: ${ADMIN_UID}`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  process.exit(0);
}

setupAdmin().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
