import "dotenv/config";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Storage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";

function getServiceAccount() {
  // Opción 1: Archivo JSON completo como string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error("Error al parsear FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  // Opción 2: Variables individuales
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

let adminApp: App;
let adminDb: Firestore;
let adminStorage: Storage;
let adminAuth: Auth;

function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = getServiceAccount();
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    });
  }

  // Fallback para inicialización en desarrollo o con Google Application Default Credentials
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return initializeApp({
    projectId: projectId || "alegra-inv-ag",
    storageBucket,
  });
}

try {
  adminApp = initFirebaseAdmin();
  adminDb = getFirestore(adminApp);
  adminDb.settings({ ignoreUndefinedProperties: true });
  adminStorage = getStorage(adminApp);
  adminAuth = getAuth(adminApp);
} catch (error: any) {
  // Manejo seguro en tiempo de build estático
  console.warn("Aviso: Firebase Admin no inicializado en este contexto:", error?.message || error);
  adminApp = {} as App;
  adminDb = {} as Firestore;
  adminStorage = {} as Storage;
  adminAuth = {} as Auth;
}

export { adminApp, adminDb, adminStorage, adminAuth };
