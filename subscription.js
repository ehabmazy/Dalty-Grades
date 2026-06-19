/**
 * subscription.js
 * نظام التحقق من الاشتراك — يُضاف لمشروع Dalty Grades
 *
 * المتطلبات:
 * - Firebase Auth شغال بالفعل (موجود عندك)
 * - Firestore مفعّل في نفس مشروع Firebase
 *
 * طريقة الاستخدام:
 * 1. استورد الملف ده بعد ما يتأكد تسجيل الدخول بنجاح (onAuthStateChanged)
 * 2. نادِ على checkSubscription(user) وهي هترجع true/false
 * 3. لو false، اعرض شاشة "انتهى الاشتراك" واقفل باقي الموقع
 */

import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore();

/**
 * تتحقق من حالة اشتراك المعلم الحالي
 * @param {object} user - كائن المستخدم من Firebase Auth (بعد تسجيل الدخول)
 * @returns {Promise<{active: boolean, endDate: Date|null, message: string}>}
 */
export async function checkSubscription(user) {
  if (!user) {
    return { active: false, endDate: null, message: "غير مسجل دخول" };
  }

  const subRef = doc(db, "subscriptions", user.uid);
  const subSnap = await getDoc(subRef);

  if (!subSnap.exists()) {
    return {
      active: false,
      endDate: null,
      message: "لا يوجد اشتراك مفعّل لهذا الحساب — يرجى التواصل لتفعيل الاشتراك",
    };
  }

  const data = subSnap.data();
  const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
  const now = new Date();

  if (!data.active || now > endDate) {
    return {
      active: false,
      endDate,
      message: `انتهت مدة اشتراكك بتاريخ ${endDate.toLocaleDateString("ar-EG")} — يرجى تجديد الاشتراك (20 جنيه عبر إنستاباي)`,
    };
  }

  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  return {
    active: true,
    endDate,
    daysLeft,
    message: daysLeft <= 7
      ? `تنبيه: اشتراكك سينتهي خلال ${daysLeft} يوم/أيام`
      : "الاشتراك فعّال",
  };
}

/**
 * دالة جاهزة تستخدمها في صفحة الموقع الرئيسية لقفل/فتح الواجهة
 * استدعِها بعد تسجيل الدخول مباشرة
 */
export async function enforceSubscriptionGate(user, onBlocked, onAllowed) {
  const result = await checkSubscription(user);

  if (!result.active) {
    onBlocked(result.message); // مثال: اعرض شاشة الدفع/التجديد
  } else {
    onAllowed(result); // اسمح بدخول الموقع، ممكن تعرض تنبيه لو قرب الانتهاء
  }
}
