// إعدادات Firebase لمشروع رحلة (دي بيانات عامة بتتحط في التطبيق، والحماية من قواعد Firestore)
export const firebaseConfig = {
  apiKey: 'AIzaSyDF2-UPlpWGZCZmZqXDrcVSA7E5W3Up5W8',
  authDomain: 'rehla-dd869.firebaseapp.com',
  projectId: 'rehla-dd869',
  storageBucket: 'rehla-dd869.firebasestorage.app',
  messagingSenderId: '138151826044',
  appId: '1:138151826044:web:a8695735925efaa200aff9',
};

// إيميلات المدير — لازم تبقى نفس اللي في firestore.rules
export const OWNER_EMAILS = ['OWNER_EMAIL_HERE'];
