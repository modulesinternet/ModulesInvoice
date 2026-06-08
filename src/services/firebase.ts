import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize the central Firebase Applet client instance using cloud coordinates
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust local disk cache to secure seamless offline operation and instant fallback reloading
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({})
  }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Initialize client-side Authentication
export const auth = getAuth(app);

// Initialize client-side Cloud Storage bucket access
export const storage = getStorage(app);

// Pre-flight connection validation
async function validateFirebaseConnection() {
  try {
    // Attempt high-speed validation read from network server directly
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase client-side connection: authenticated and verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client reports network offline. Local cache operations are active.");
    }
  }
}

validateFirebaseConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.warn('Firestore Async Notification: ', JSON.stringify(errInfo));
  // Relaxed notification in console to ensure the client runtime stays fully responsive and crash-free during network drops.
}
