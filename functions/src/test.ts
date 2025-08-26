import * as functions from "firebase-functions/v1";

export const testFunction = functions.https.onRequest(async (req, res) => {
  res.send("Test function is working!");
});