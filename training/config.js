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
  siteName: "AMEA AFRE – Solar PV & BESS",

  firebase: null,

  // مدة صلاحية الاندكشن بالأيام (0 = مالوش انتهاء)
  inductionValidDays: 0,

  // دقة مطابقة الوش: كل ما الرقم يصغر المطابقة تبقى أدق وأصعب (0.45 – 0.55)
  faceThreshold: 0.5
};
