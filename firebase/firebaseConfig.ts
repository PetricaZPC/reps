import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjLDvoXjYT6f1TPRo_YQB4op3x09C8Xeo",
  authDomain: "reps-7a88c.firebaseapp.com",
  projectId: "reps-7a88c",
  storageBucket: "reps-7a88c.firebasestorage.app",
  messagingSenderId: "718670365739",
  appId: "1:718670365739:web:7788087f13eb6654ca566e",
  measurementId: "G-R6FGP03N7E",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);