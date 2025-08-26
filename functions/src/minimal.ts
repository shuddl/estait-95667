import * as functions from "firebase-functions/v1";

export const minimalFunction = functions.https.onRequest((req, res) => {
  res.send("Minimal function works!");
});