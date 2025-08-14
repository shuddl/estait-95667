
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const createUserProfile = (uid: string, data: { email: string | null }): Promise<void> => {
  return setDoc(doc(db, 'users', uid), data);
};
