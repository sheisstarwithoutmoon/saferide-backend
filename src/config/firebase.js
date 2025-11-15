const admin = require('firebase-admin');
const config = require('./index');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    let credential;

    // Check if using environment variables (for production/Render)
    if (config.FIREBASE.clientEmail && config.FIREBASE.privateKey) {
      console.log('Using Firebase credentials from environment variables');
      
      credential = admin.credential.cert({
        projectId: config.FIREBASE.projectId,
        clientEmail: config.FIREBASE.clientEmail,
        privateKey: config.FIREBASE.privateKey.replace(/\\n/g, '\n'),
      });
    } 
    // Check if service account file exists (for local development)
    else if (config.FIREBASE.privateKeyPath && fs.existsSync(path.resolve(config.FIREBASE.privateKeyPath))) {
      console.log('Using Firebase credentials from file');
      const serviceAccount = require(path.resolve(config.FIREBASE.privateKeyPath));
      credential = admin.credential.cert(serviceAccount);
    } 
    else {
      throw new Error('Firebase credentials not found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables, or provide a service account file.');
    }

    firebaseApp = admin.initializeApp({
      credential: credential,
      projectId: config.FIREBASE.projectId,
    });

    console.log('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
    throw error;
  }
};

const getFirebaseApp = () => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

module.exports = {
  initializeFirebase,
  getFirebaseApp,
  admin,
};
