import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const createUserProfile = (uid, data) => {
  return setDoc(doc(db, 'users', uid), data);
};
