import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC55w60pKTEtyus0KWTL5-MDTNi-r_RW3o",
  authDomain: "pickle-champs.firebaseapp.com",
  projectId: "pickle-champs",
  storageBucket: "pickle-champs.firebasestorage.app",
  messagingSenderId: "1016117381910",
  appId: "1:1016117381910:web:35b7eb3cbdd640868c1e37"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
