const admin = require('firebase-admin');
const config = require('./index');

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    // Initialize Firebase Admin SDK
    const serviceAccount = require(`../../${config.FIREBASE.privateKeyPath}`);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.FIREBASE.projectId,
    });

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
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
