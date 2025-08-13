import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const storeCrmTokens = (userId, crmType, tokens) => {
  const tokenRef = doc(db, 'crm_tokens', `${userId}_${crmType}`);
  return setDoc(tokenRef, { userId, crmType, ...tokens });
};

export const getCrmTokens = async (userId, crmType) => {
  const tokenRef = doc(db, 'crm_tokens', `${userId}_${crmType}`);
  const tokenSnap = await getDoc(tokenRef);
  return tokenSnap.exists() ? tokenSnap.data() : null;
};
