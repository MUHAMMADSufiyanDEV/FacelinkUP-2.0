import { 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, CareerTask, JobMatchResult } from '../types';

/**
 * User Profile Services
 */
export const updateCareerProfile = async (uid: string, data: Partial<UserProfile>) => {
  const profileRef = doc(db, 'users', uid);
  await updateDoc(profileRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Job Matching Services
 */
export const saveJobMatch = async (uid: string, data: Partial<JobMatchResult>) => {
  const matchesRef = collection(db, 'users', uid, 'jobMatches');
  await addDoc(matchesRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
};

/**
 * Career Tasks / Daily Planner Services
 */
export const saveCareerTask = async (uid: string, data: any) => {
  const tasksRef = collection(db, 'users', uid, 'tasks');
  return await addDoc(tasksRef, {
    ...data,
    createdAt: serverTimestamp()
  });
};

export const completeTask = async (uid: string, taskId: string) => {
  const taskRef = doc(db, 'users', uid, 'tasks', taskId);
  const snap = await getDoc(taskRef);
  if (snap.exists()) {
    await updateDoc(taskRef, {
      status: snap.data().status === 'completed' ? 'pending' : 'completed',
      completed: !snap.data().completed
    });
  }
};

export const deleteTask = async (uid: string, taskId: string) => {
  const taskRef = doc(db, 'users', uid, 'tasks', taskId);
  await deleteDoc(taskRef);
};

export const getActiveTasks = (uid: string, callback: (tasks: any[]) => void, errorCallback?: (error: any) => void) => {
  const tasksRef = collection(db, 'users', uid, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  }, errorCallback);
};
