import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore at boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  if (user) {
    const userPath = `users/${user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: (user.displayName || 'MatchIQ Analyst').slice(0, 100),
          defaultSport: 'all',
          minEvThreshold: 0.025,
          minModelReliability: 0.75,
          stakingStrategy: 'kelly_fractional',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      // Ignore if profile already exists with immutable createdAt
      console.debug('User profile sync info:', userPath, error);
    }
  }
  return user;
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

export async function saveLockedPredictionToFirestore(params: {
  id: string;
  matchId: string;
  sport: 'football' | 'tennis' | 'basketball' | 'volleyball';
  marketKey: string;
  selection: string;
  modelProbability: number;
  decimalOdds: number;
  expectedValue: number;
  modelVersion: string;
}) {
  if (!auth.currentUser) return null;
  const cleanId = params.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  const path = `locked_predictions/${cleanId}`;
  try {
    await setDoc(doc(db, 'locked_predictions', cleanId), {
      userId: auth.currentUser.uid,
      matchId: params.matchId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120),
      sport: params.sport,
      marketKey: params.marketKey.slice(0, 64),
      selection: params.selection.slice(0, 120),
      modelProbability: Number(params.modelProbability.toFixed(4)),
      decimalOdds: Number(params.decimalOdds.toFixed(3)),
      expectedValue: Number(params.expectedValue.toFixed(4)),
      modelVersion: params.modelVersion.slice(0, 64),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserLockedPredictionsFromFirestore() {
  if (!auth.currentUser) return [];
  const path = 'locked_predictions';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveSimulatedBetToFirestore(params: {
  id: string;
  matchId: string;
  matchLabel: string;
  sport: 'football' | 'tennis' | 'basketball' | 'volleyball';
  marketName: string;
  selection: string;
  stake: number;
  decimalOdds: number;
  modelProbability: number;
  expectedValue: number;
  stakingStrategy: 'flat' | 'kelly_fractional' | 'percentage';
}) {
  if (!auth.currentUser) return null;
  const cleanId = params.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  const path = `simulated_bets/${cleanId}`;
  try {
    await setDoc(doc(db, 'simulated_bets', cleanId), {
      userId: auth.currentUser.uid,
      matchId: params.matchId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120),
      matchLabel: params.matchLabel.slice(0, 160),
      sport: params.sport,
      marketName: params.marketName.slice(0, 80),
      selection: params.selection.slice(0, 120),
      stake: Number(params.stake.toFixed(2)),
      decimalOdds: Number(params.decimalOdds.toFixed(3)),
      modelProbability: Number(params.modelProbability.toFixed(4)),
      expectedValue: Number(params.expectedValue.toFixed(4)),
      stakingStrategy: params.stakingStrategy,
      status: 'open',
      profitLoss: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function settleSimulatedBetInFirestore(params: {
  id: string;
  status: 'won' | 'lost' | 'push';
  profitLoss: number;
}) {
  if (!auth.currentUser) return null;
  const cleanId = params.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  const path = `simulated_bets/${cleanId}`;
  try {
    await updateDoc(doc(db, 'simulated_bets', cleanId), {
      status: params.status,
      profitLoss: Number(params.profitLoss.toFixed(2)),
      updatedAt: serverTimestamp(),
    });
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
