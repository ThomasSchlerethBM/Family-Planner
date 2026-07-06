import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// ------------------------------------------------------------------
// Trage hier die Config deines eigenen Firebase-Projekts ein.
// Firebase Console -> Projekteinstellungen -> "Meine Apps" -> Web-App
// (genau wie bei deiner Tennis-App)
// Wichtig: Realtime Database muss im Projekt aktiviert sein
// (nicht Firestore) - Modus "Testmodus" reicht zum Start.
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyA1uuS14MuUvD3Jr6ViH4M0vgjBPI2JwJc",
  authDomain: "family-planner-175f3.firebaseapp.com",
  databaseURL: "https://family-planner-175f3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "family-planner-175f3",
  storageBucket: "family-planner-175f3.firebasestorage.app",
  messagingSenderId: "974930295127",
  appId: "1:974930295127:web:9526bccc059f97e0e7a612",
  measurementId: "G-HSJBEY58TC",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
