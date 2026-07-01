import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config del proyecto de Firebase. Escrita aquí directamente para que el
// deploy funcione sin configurar variables de entorno (uso interno / pruebas).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBxnKK6dy3BZgEKNXFmtoDKwWFzqWltUoI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "legendar-ia-crm.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "legendar-ia-crm",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "legendar-ia-crm.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "936455957299",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:936455957299:web:508a0d623d78aef3c36c46",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
