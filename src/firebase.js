import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDKsgDX5Sat3SwJX-g7NoXYLYxDNKenHII",
  authDomain: "picks-league-a6695.firebaseapp.com",
  projectId: "picks-league-a6695",
  storageBucket: "picks-league-a6695.firebasestorage.app",
  messagingSenderId: "962348671122",
  appId: "1:962348671122:web:d505e725fdeba33945c64b",
  measurementId: "G-782K1DM967"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export what we'll need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;