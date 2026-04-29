import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    let unsubscribeAdmin: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        // Initial setup/check
        const profileRef = doc(db, 'users', authUser.uid);
        const profileDoc = await getDoc(profileRef);
        
        if (!profileDoc.exists()) {
          const newProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || '',
            photoURL: authUser.photoURL || '',
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          await setDoc(profileRef, newProfile);
        }

        // Listen for real-time changes
        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });

        const adminRef = doc(db, 'admins', authUser.uid);
        unsubscribeAdmin = onSnapshot(adminRef, (snap) => {
           setIsAdmin(snap.exists() || authUser.email === 'm.sufiyan1581@gmail.com');
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        unsubscribeProfile();
        unsubscribeAdmin();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
      unsubscribeAdmin();
    };
  }, []);

  const signOut = () => auth.signOut();

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signOut, resendVerification, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
