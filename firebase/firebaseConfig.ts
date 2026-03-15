import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let AsyncStorage: any = null;
try {
  const asyncStorageModule = require("@react-native-async-storage/async-storage");
  AsyncStorage = asyncStorageModule?.default ?? asyncStorageModule;
} catch {
  AsyncStorage = null;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const hasAsyncStorage =
  !!AsyncStorage &&
  typeof (AsyncStorage as any).getItem === "function" &&
  typeof (AsyncStorage as any).setItem === "function";

let authInstance;
try {
  const getReactNativePersistence = (FirebaseAuth as any)
    .getReactNativePersistence as ((storage: any) => unknown) | undefined;

  if (typeof getReactNativePersistence === "function" && hasAsyncStorage) {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as any,
    });
  } else {
    authInstance = FirebaseAuth.initializeAuth(app);
  }
} catch (err) {
  // If auth was already initialized (hot reload), reuse it
  authInstance = FirebaseAuth.getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
