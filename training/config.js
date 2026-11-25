/*
 * إعدادات تطبيق متابعة التدريب
 * --------------------------------
 * لو "firebase" فاضية (null) التطبيق بيشتغل في "وضع التجربة":
 * البيانات بتتحفظ على الجهاز ده بس، والدخول بـ admin / admin.
 *
 * بعد ما تعمل مشروع Firebase (الخطوات في ملف SETUP.md) حط الإعدادات هنا، مثال:
 *
 *   firebase: {
 *     apiKey: "AIza....",
 *     authDomain: "my-project.firebaseapp.com",
 *     projectId: "my-project",
 *     appId: "1:123:web:abc"
 *   },
 */
window.HSE_CONFIG = {
  appName: "HSE Training Tracker",
  siteName: "",

  firebase: {
    apiKey: "AIzaSyCSC6ff47GCIGu54WoBU34_oqhGsPtfrjw",
    authDomain: "hse-training-51df2.firebaseapp.com",
    projectId: "hse-training-51df2",
    storageBucket: "hse-training-51df2.firebasestorage.app",
    messagingSenderId: "867206873930",
    appId: "1:867206873930:web:f3aa336152e53d182f37b3"
  },

  // مدة صلاحية الاندكشن بالأيام (0 = مالوش انتهاء)
  inductionValidDays: 0,

  // دقة مطابقة الوش: كل ما الرقم يصغر المطابقة تبقى أدق وأصعب (0.45 – 0.55)
  faceThreshold: 0.5
};
