import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from './firebase-applet-config.json';

// Detect quota error early to silence logs before first request
const lastQuotaError = typeof window !== 'undefined' ? localStorage.getItem('firestore_quota_error') : null;
let recentlyExceeded = false;
if (lastQuotaError) {
  try {
    const { timestamp } = JSON.parse(lastQuotaError);
    if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
      recentlyExceeded = true;
      setLogLevel('silent');
    }
  } catch (e) {}
}

let auth: Auth;
let db: Firestore;

const app: FirebaseApp = initializeApp(firebaseConfig);
auth = getAuth(app);

// Stop SDK logging immediately to prevent console spam
setLogLevel('silent');

// Initialize Firestore
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
if (databaseId && databaseId !== '(default)') {
  db = getFirestore(app, databaseId);
} else {
  db = getFirestore(app);
}

// 2. Validate Connection to Firestore (Per Mandatory Security Guidelines)
async function validateConnection() {
  try {
    const testDoc = doc(db, 'debug_test', 'connectivity');
    await getDocFromServer(testDoc);
    console.log('Firebase connection validated.');
  } catch (error: any) {
    // Standard connection test
    const msg = (error.message || "").toLowerCase();
    const code = error.code || "";
    if (msg.includes("quota") || msg.includes("resource-exhausted") || code === "resource-exhausted") {
      setLogLevel('silent');
      if (typeof window !== 'undefined') {
        localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
      }
    }
  }
}

validateConnection();

export { auth, db };
