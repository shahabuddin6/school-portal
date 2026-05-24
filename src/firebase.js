// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ye details aapko Firebase Console (Project Settings) se milengi
const firebaseConfig = {
  apiKey: "AIzaSy...",         // Apni wali yahan paste karein
  authDomain: "xyz.firebaseapp.com",
  projectId: "your-project-id", // Apni Project ID yahan paste karein
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

// Yahan se aapka code connect hota hai
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Ye aapke Database ke liye hai
export const auth = getAuth(app);    // Ye Sign In/Up ke liye hai