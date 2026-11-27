// Terms & Conditions — English, with the supervision clause also kept in Arabic
export const TERMS_UPDATED = '27 Nov 2026';

export const TERMS = [
  {
    title: '1. Supervision & Support 🤝',
    body: [
      'Rehla is a program where supervisors follow members’ journeys to encourage and support them.',
      'When you create an account, your assigned supervisor and the program manager can see all of your data in the app: your prayers, Quran reading and azkar; your habits; your health (water, sleep, exercise); your moods and their reasons; your full journal including photos; and your goals, challenges and achievements.',
      'The purpose of this follow-up is to have someone beside you — to cheer you on when you keep going, and to check on you if you go quiet or your days get hard.',
      'Supervisors may keep private notes about you to follow up better, and may send you messages inside the app.',
      'If you are not comfortable with someone seeing something, do not write it in the app. And if you want to use the app just for yourself, sign in as a “Guest”: your data stays on your phone and no one sees it.',
    ],
    ar: [
      'المشرف المسؤول عنك ومدير البرنامج بيقدروا يشوفوا كل بياناتك في التطبيق: عباداتك وعاداتك وصحتك ومشاعرك، و<b>يومياتك كاملة بالصور</b>، وأهدافك وإنجازاتك — عشان يتابعوك ويدعموك.',
      'لو مش مرتاح إن حد يشوف حاجة، متكتبهاش في التطبيق، أو ادخل كـ"ضيف" وبياناتك تفضل على موبايلك بس.',
    ],
  },
  {
    title: '2. Your account',
    body: [
      'This account is yours alone. Do not share your password; you are responsible for anything done from your account.',
      'If you are under 18, you must have a guardian’s consent to use the program.',
      'Use a real name, or a name your supervisor knows you by, so they can follow up with you.',
    ],
  },
  {
    title: '3. Religious content',
    body: [
      'The azkar are from well-known authentic hadith (Hisn al-Muslim). For Quran, we give the surah name and location so you read it from the Mushaf — no Quranic text is altered.',
      'Prayer times are calculated astronomically and may differ by a minute or two from your mosque; you can adjust each one in Worship.',
      'Nothing in the app is a fatwa. For any religious question, refer to people of knowledge.',
    ],
  },
  {
    title: '4. Your health & feelings',
    body: [
      'Rehla is not a medical or psychological app, and is not a substitute for a doctor or specialist.',
      'Health suggestions (water, sleep, exercise) are general. If you have any health condition, consult a doctor first.',
      'If you feel you are in danger or are thinking of harming yourself, talk to someone close to you right away, or call Emergency (123) or Egypt’s mental-health hotline (0800 888 0700).',
    ],
  },
  {
    title: '5. Respect & conduct',
    body: [
      'Use the app for good and with respect; do not add any offensive or unlawful content.',
      'Messages between you and the supervisors must be respectful on both sides.',
    ],
  },
  {
    title: '6. Your data',
    body: [
      'Your data is stored on your phone and on Firebase servers (by Google). We do not sell it or share it with anyone outside the program.',
      'You can export a copy of your data anytime from “My account → Export my data”.',
      'You can delete your account and all your data anytime from “My account → Delete account”. After that, it cannot be restored.',
    ],
  },
  {
    title: '7. Notifications',
    body: [
      'Reminders (prayer, azkar, habits) are turned on and off by you from Settings.',
      'Supervisor messages and program announcements appear in your in-app notifications.',
    ],
  },
  {
    title: '8. Account suspension',
    body: [
      'The program manager may temporarily suspend any account if it is misused or for reasons related to the program. You can contact them to find out why.',
    ],
  },
  {
    title: '9. Changes to these terms',
    body: [
      'We may update these terms. If there is an important change, we will let you know in the app beforehand.',
    ],
  },
  {
    title: '10. Contact',
    body: [
      'For any question, complaint, or request regarding your data, contact your supervisor or the program manager.',
    ],
  },
];

export function termsHtml() {
  return `<div class="terms" dir="ltr">
    <p class="muted small">Last updated: ${TERMS_UPDATED}</p>
    ${TERMS.map((s, i) => `<section class="${i === 0 ? 'terms-key' : ''}"><h3>${s.title}</h3>${s.body.map((p) => `<p>${p}</p>`).join('')}
      ${s.ar ? `<div class="terms-ar" dir="rtl"><p class="terms-ar-label">بالعربي:</p>${s.ar.map((p) => `<p>${p}</p>`).join('')}</div>` : ''}</section>`).join('')}
  </div>`;
}
