const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with provided configuration
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'grid-map-69bbc',
	storageBucket: 'grid-map-69bbc.firebasestorage.app',
	messagingSenderId: '286589761644',
	appId: '1:286589761644:web:b7a393b4ac1d7369f14049',
    });
}

module.exports = admin; 