import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const makeCrmApiCall = (crmName, endpoint, method, data) => {
  const callable = httpsCallable(functions, 'makeCrmApiCall');
  return callable({ crmName, endpoint, method, data });
};
