/* ══════════════════════════════════════════════════════
   Dalty Grades — Google Auth System
   ملف المصادقة بحسابات متعددة عبر Google

   طريقة الإضافة في index.html — أضف هذا بعد firebase-sync.js:
   <script src="auth.js"></script>

   ══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   إعدادات Firebase Auth
   ════════════════════════════════════════ */
var AUTH_CONFIG = {
  apiKey:            "AIzaSyBS9rW0XqtFCrX0wjrn9NinsxaRLE4EFxE",
  authDomain:        "dalty-grades.firebaseapp.com",
  databaseURL:       "https://dalty-grades-default-rtdb.firebaseio.com",
  projectId:         "dalty-grades",
  storageBucket:     "dalty-grades.firebasestorage.app",
  messagingSenderId: "927174576910",
  appId:             "1:927174576910:web:70ca8e14568bb194bc655f"
};

/* مفتاح Firebase لكل مستخدم:  users/{uid}/data */
var AUTH_DB_PATH = "users";

/* ════════════════════════════════════════
   إعدادات نظام الاشتراك
   ════════════════════════════════════════ */
var SUB_PHONE = "01004277320";       /* رقم إنستاباي وواتساب */
var SUB_PRICE = "20";                /* سعر الاشتراك بالجنيه لكل فصل */
/* الأشهر المجانية (بدون اشتراك): يونيو=6، يوليو=7، أغسطس=8 */
var SUB_FREE_MONTHS = [ 7, 8];

/* ════════════════════════════════════════
   المتغيرات الداخلية
   ════════════════════════════════════════ */
var _authApp  = null;
var _authInst = null;
var _authDB   = null;
var _authFS   = null;   /* Firestore — لتخزين الاشتراكات فقط */
var _currentUser = null;
var _userRef  = null;

/* Firebase SDK محمّل مباشرة من index.html */
window.addEventListener("load", function () { initAuth(); });

/* ════════════════════════════════════════
   تهيئة Firebase Auth
   ════════════════════════════════════════ */
function initAuth() {
  try {
    /* إذا كان firebase مُهيَّأ مسبقاً من firebase-sync.js استخدمه */
    if (firebase.apps && firebase.apps.length > 0) {
      _authApp = firebase.apps[0];
    } else {
      _authApp = firebase.initializeApp(AUTH_CONFIG);
    }

    _authInst = firebase.auth();
    _authDB   = firebase.database();

    try {
      _authFS = firebase.firestore();
    } catch (fsErr) {
      console.warn("[Subscription] Firestore SDK غير محمّل — لن يعمل نظام الاشتراك:", fsErr);
      _authFS = null;
    }

    /* احتفظ بالجلسة حتى بعد إغلاق المتصفح — تسجيل دخول مرة واحدة فقط */
    function _startListening() {
      interceptShowApp();
      _authInst.onAuthStateChanged(function(user) {
        if (user) {
          _currentUser = user;
          _userRef = _authDB.ref(AUTH_DB_PATH + "/" + sanitizeUID(user.uid));
          onUserLoggedIn(user);
        } else {
          _currentUser = null;
          _userRef = null;
          showAuthScreen();
        }
      });
    }

    _authInst.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(_startListening)
      .catch(function(e) {
        console.warn("[Auth] setPersistence فشل، استمر بالافتراضي:", e);
        _startListening();
      });

  } catch(e) {
    console.error("[Auth] خطأ في التهيئة:", e);
    /* في حالة الفشل افتح التطبيق عادياً */
    if (window._origShowApp) window._origShowApp();
  }
}

/* ════════════════════════════════════════
   اعتراض showApp — منع الفتح قبل الدخول
   ════════════════════════════════════════ */
function interceptShowApp() {
  if (typeof window.showApp === "function" && !window.showApp._authIntercepted) {
    window._origShowApp = window.showApp;
    window.showApp = function() {
      /* لا تفعل شيئاً — onAuthStateChanged يتحكم */
    };
    window.showApp._authIntercepted = true;
  }

  /* منع الفتح التلقائي عند التحميل */
  window.addEventListener("load", function() {
    /* أخفِ appShell حتى يتم التحقق */
    var shell = document.getElementById("appShell");
    if (shell) shell.classList.remove("visible");
  }, { once: true, capture: true });
}

/* ════════════════════════════════════════
   عند تسجيل الدخول بنجاح
   ════════════════════════════════════════ */
function onUserLoggedIn(user) {
  /* حدّث STORE_KEY لكل مستخدم */
  var uid = sanitizeUID(user.uid);
  window.STORE_KEY = "grades_v6_" + uid;

  /* أخفِ شاشة الدخول */
  removeAuthScreen();

  /* تحديث اسم المستخدم في الشريط */
  var nameEl = document.getElementById("topUserName");
  if (nameEl) nameEl.textContent = user.displayName || user.email || "";

  /* تحديث Firebase path في firebase-sync.js — مسار خاص بكل معلم */
  if (typeof window.setFirebaseUserPath === "function") {
    window.setFirebaseUserPath(user.uid);
  }

  window._currentAuthUser = user;
  if (typeof window._updateMergedBtn === "function") window._updateMergedBtn();
  var btn = document.getElementById("fbSyncBtn");
  if (btn) {
    btn.dataset.userName = (user.displayName || user.email || "").split(" ")[0];
    btn.oncontextmenu = function(e) { e.preventDefault(); if(typeof window.signOut==="function") window.signOut(); };
  }

  console.log("[Auth] ✅ مرحباً:", user.displayName || user.email);

  /* ✅ تحقق من الاشتراك قبل فتح التطبيق فعلياً */
  checkSubscriptionAndOpenApp(user);
}

/* ════════════════════════════════════════
   نظام الاشتراك — تحقق ثم افتح التطبيق
   ════════════════════════════════════════ */
function _subCurrentMonth() {
  return new Date().getMonth() + 1; /* 1-12 */
}

function _subIsFreeMonth() {
  return SUB_FREE_MONTHS.indexOf(_subCurrentMonth()) !== -1;
}

function _subCurrentTermLabel() {
  var m = _subCurrentMonth();
  if (m === 6 ||m === 9 || m === 10 || m === 11 || m === 12 || m === 1) return "الفصل الدراسي الأول";
  if (m === 2 || m === 3 || m === 4 || m === 5) return "الفصل الدراسي الثاني";
  return "الفترة المجانية";
}

function checkSubscriptionAndOpenApp(user) {
  /* الأشهر المجانية: افتح التطبيق مباشرة بدون أي تحقق */
  if (_subIsFreeMonth()) {
    openAppNow();
    return;
  }

  /* لو Firestore مش متاح لأي سبب، افتح التطبيق (فشل آمن) بدل ما يتعطل الموقع بالكامل */
  if (!_authFS) {
    console.warn("[Subscription] Firestore غير متاح، يتم فتح التطبيق بدون تحقق");
    openAppNow();
    return;
  }

  _authFS.collection("subscriptions").doc(user.uid).get()
    .then(function(snap) {
      if (!snap.exists) {
        showSubscriptionBlockedScreen("لا يوجد اشتراك مفعّل لهذا الحساب");
        return;
      }
      var data = snap.data();
      var endDate = (data.endDate && data.endDate.toDate) ? data.endDate.toDate() : new Date(data.endDate);
      var now = new Date();

      if (!data.active || now > endDate) {
        var endStr = endDate ? endDate.toLocaleDateString("ar-EG") : "";
        showSubscriptionBlockedScreen("انتهت مدة اشتراكك" + (endStr ? " بتاريخ " + endStr : ""));
        return;
      }

      /* الاشتراك فعّال */
      openAppNow();
    })
    .catch(function(err) {
      /* فشل في الاتصال (مثلاً بدون إنترنت) — افتح التطبيق بدل ما تحجب مستخدم مشترك بالفعل */
      console.warn("[Subscription] تعذر التحقق (سيتم فتح التطبيق):", err.message);
      openAppNow();
    });
}

function openAppNow() {
  if (window._origShowApp) {
    window._origShowApp();
  } else if (typeof initDB === "function") {
    if (!window._booted) { window._booted = true; initDB(); }
    if (typeof switchPage === "function") switchPage("home");
  }
}

/* ════════════════════════════════════════
   شاشة "الاشتراك مطلوب / منتهي"
   ════════════════════════════════════════ */
function showSubscriptionBlockedScreen(reasonMsg) {
  removeSubscriptionBlockedScreen();

  var shell = document.getElementById("appShell");
  if (shell) shell.classList.remove("visible");

  var term = _subCurrentTermLabel();
  var waText = encodeURIComponent("السلام عليكم، أنا حولت " + SUB_PRICE + " جنيه اشتراك " + term + " — اسمي: ");
  var waLink = "https://wa.me/2" + SUB_PHONE + "?text=" + waText;

  var overlay = document.createElement("div");
  overlay.id = "subBlockOverlay";
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:99999",
    "background:linear-gradient(135deg,#0a0f1e 0%,#0f1e35 60%,#0a0f1e 100%)",
    "display:flex", "align-items:center", "justify-content:center",
    "font-family:Cairo,sans-serif", "direction:rtl", "padding:16px", "box-sizing:border-box"
  ].join(";");

  overlay.innerHTML = [
    '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:16px;',
    'padding:30px 26px;text-align:center;max-width:380px;width:100%;',
    'box-shadow:0 20px 60px rgba(0,0,0,.6);">',

      '<div style="font-size:42px;margin-bottom:8px;">🔒</div>',
      '<div style="font-size:19px;font-weight:900;color:#fbbf24;margin-bottom:6px;">' + reasonMsg + '</div>',
      '<div style="font-size:13px;color:#94a3b8;margin-bottom:20px;line-height:1.7;">',
        'لتفعيل/تجديد اشتراك <b style="color:#60a5fa;">' + term + '</b> بسعر ',
        '<b style="color:#6ee7b7;">' + SUB_PRICE + ' جنيه</b>، حوّل عبر إنستاباي على الرقم:',
      '</div>',

      '<div style="background:#0a1628;border:1.5px dashed #1e3a5f;border-radius:10px;',
      'padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:10px;">',
        '<span style="font-size:18px;font-weight:900;color:#fff;letter-spacing:1px;" dir="ltr">' + SUB_PHONE + '</span>',
        '<button onclick="navigator.clipboard.writeText(\'' + SUB_PHONE + '\');this.textContent=\'✅\';setTimeout(()=>this.textContent=\'📋\',1500);" ',
          'style="background:#1e3a5f;border:none;color:#60a5fa;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:14px;">📋</button>',
      '</div>',

      '<a href="' + waLink + '" target="_blank" style="display:block;text-decoration:none;',
      'background:#25D366;color:#fff;border-radius:10px;padding:13px;font-size:14px;font-weight:800;',
      'margin-bottom:10px;">📲 إرسال إثبات التحويل عبر واتساب</a>',

      '<button onclick="checkSubscriptionAndOpenApp(window._currentAuthUser)" style="',
      'width:100%;background:transparent;color:#60a5fa;border:1px solid #1e3a5f;',
      'border-radius:10px;padding:11px;font-size:13px;cursor:pointer;font-family:Cairo,sans-serif;margin-bottom:8px;">',
      '🔄 تم الدفع، تحقق الآن</button>',

      '<button onclick="if(typeof window.signOut===\'function\')window.signOut();" style="',
      'width:100%;background:transparent;color:#64748b;border:none;',
      'padding:8px;font-size:12px;cursor:pointer;font-family:Cairo,sans-serif;">تسجيل الخروج / حساب آخر</button>',

    '</div>'
  ].join("");

  document.body.appendChild(overlay);
}

function removeSubscriptionBlockedScreen() {
  var el = document.getElementById("subBlockOverlay");
  if (el) el.remove();
}

/* ════════════════════════════════════════
   كشف حالة الإنترنت
   ════════════════════════════════════════ */
var _isOnline = navigator.onLine;
window.addEventListener("online",  function() { _isOnline = true;  _updateOnlineUI(); });
window.addEventListener("offline", function() { _isOnline = false; _updateOnlineUI(); });

function _updateOnlineUI() {
  var gBtn   = document.getElementById("googleSignInBtn");
  var badge  = document.getElementById("offlineBadge");
  var gWrap  = document.getElementById("googleBtnWrap");
  if (!gBtn) return;
  if (_isOnline) {
    if (gWrap)  gWrap.style.display  = "block";
    if (badge)  badge.style.display  = "none";
  } else {
    if (gWrap)  gWrap.style.display  = "none";
    if (badge)  badge.style.display  = "flex";
  }
}

/* ════════════════════════════════════════
   شاشة تسجيل الدخول
   ════════════════════════════════════════ */
var _GOOGLE_LOGO_SVG = [
  '<svg width="20" height="20" viewBox="0 0 48 48">',
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>',
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>',
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>',
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>',
  '</svg>'
].join("");

function showAuthScreen() {
  removeSubscriptionBlockedScreen();
  if (document.getElementById("authOverlay")) return;

  /* أخفِ التطبيق */
  var shell = document.getElementById("appShell");
  if (shell) shell.classList.remove("visible");

  var overlay = document.createElement("div");
  overlay.id = "authOverlay";
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:99999",
    "background:linear-gradient(135deg,#0a0f1e 0%,#0f1e35 60%,#0a0f1e 100%)",
    "display:flex", "align-items:center", "justify-content:center",
    "font-family:Cairo,sans-serif", "direction:rtl"
  ].join(";");

  var tabStyle = [
    "flex:1", "padding:9px", "background:transparent", "border:none",
    "font-family:Cairo,sans-serif", "font-size:13px", "cursor:pointer",
    "transition:all .2s", "border-radius:8px"
  ].join(";");

  var inputStyle = [
    "width:100%", "background:rgba(255,255,255,.07)",
    "border:1px solid #1e3a5f", "border-radius:10px",
    "padding:11px 14px", "color:#e2e8f0", "font-size:14px",
    "font-family:Cairo,sans-serif", "outline:none", "margin-bottom:10px",
    "box-sizing:border-box"
  ].join(";");

  var btnPrimaryStyle = [
    "width:100%", "background:#3b82f6", "color:white",
    "border:none", "border-radius:10px", "padding:12px",
    "font-size:14px", "font-weight:700", "cursor:pointer",
    "font-family:Cairo,sans-serif", "margin-bottom:10px",
    "transition:opacity .2s"
  ].join(";");

  var btnGoogleStyle = [
    "width:100%", "background:white", "color:#1f2937",
    "border:none", "border-radius:10px", "padding:12px 20px",
    "font-size:14px", "font-weight:700", "cursor:pointer",
    "display:flex", "align-items:center", "justify-content:center", "gap:10px",
    "font-family:Cairo,sans-serif", "box-shadow:0 2px 8px rgba(0,0,0,.3)",
    "transition:all .2s", "margin-bottom:10px"
  ].join(";");

  overlay.innerHTML = [
    '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:16px;',
    'padding:32px 28px;text-align:center;max-width:360px;width:90%;',
    'box-shadow:0 20px 60px rgba(0,0,0,.6);">',

      /* شعار */
      '<div style="font-size:44px;margin-bottom:6px;">📊</div>',
      '<div style="font-size:22px;font-weight:900;color:#60a5fa;margin-bottom:4px;">Dalty Grades</div>',
      '<div style="font-size:12px;color:#475569;margin-bottom:22px;">نظام إدارة درجات الطلاب</div>',

      /* تابات */
      '<div style="display:flex;background:rgba(255,255,255,.05);border:1px solid #1e3a5f;',
      'border-radius:10px;padding:4px;gap:4px;margin-bottom:20px;">',
        '<button id="tabLocal" style="' + tabStyle + ';background:rgba(59,130,246,.2);color:#60a5fa;" ',
          'onclick="_switchAuthTab(\'local\')">دخول محلي</button>',
        '<button id="tabGoogle" style="' + tabStyle + ';color:#475569;" ',
          'onclick="_switchAuthTab(\'google\')">حساب Google</button>',
      '</div>',

      /* ── لوحة الدخول المحلي ── */
      '<div id="panelLocal">',

        /* شارة offline */
        '<div id="offlineBadge" style="display:' + (_isOnline ? "none" : "flex") + ';',
        'align-items:center;gap:8px;background:rgba(34,197,94,.08);',
        'border:1px solid rgba(34,197,94,.2);border-radius:8px;',
        'padding:8px 12px;color:#4ade80;font-size:12px;margin-bottom:12px;">',
          '<span style="width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;display:inline-block;"></span>',
          'وضع بدون إنترنت — بيانات محلية فقط',
        '</div>',

        '<input id="localEmail" type="email" placeholder="البريد الإلكتروني" style="' + inputStyle + '" dir="ltr">',
        '<input id="localPass"  type="password" placeholder="كلمة المرور" style="' + inputStyle + '">',
        '<button onclick="signInLocal()" style="' + btnPrimaryStyle + '">دخول ←</button>',

        /* فاصل */
        '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 10px;',
        'color:#334155;font-size:12px;">',
          '<div style="flex:1;height:1px;background:#1e3a5f;"></div>أو<div style="flex:1;height:1px;background:#1e3a5f;"></div>',
        '</div>',

        /* زر Google داخل اللوحة المحلية */
        '<div id="googleBtnWrap" style="display:' + (_isOnline ? "block" : "none") + ';">',
          '<button onclick="signInWithGoogle()" id="googleSignInBtn" style="' + btnGoogleStyle + '">',
            _GOOGLE_LOGO_SVG,
            'تسجيل الدخول بـ Google',
          '</button>',
        '</div>',

      '</div>',

      /* ── لوحة Google ── */
      '<div id="panelGoogle" style="display:none;">',
        '<p style="color:#64748b;font-size:13px;margin-bottom:16px;line-height:1.7;">',
          'ستُفتح نافذة Google لاختيار الحساب.<br>',
          '<span style="color:#475569;font-size:11px;">إذا لم تعمل جرّب الدخول المحلي</span>',
        '</p>',
        '<button onclick="signInWithGoogle()" id="googleSignInBtnAlt" style="' + btnGoogleStyle + '">',
          _GOOGLE_LOGO_SVG,
          'اختر حساب Google',
        '</button>',
        '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 10px;',
        'color:#334155;font-size:12px;">',
          '<div style="flex:1;height:1px;background:#1e3a5f;"></div>أو<div style="flex:1;height:1px;background:#1e3a5f;"></div>',
        '</div>',
        '<button onclick="_switchAuthTab(\'local\')" style="',
          'width:100%;background:transparent;color:#60a5fa;border:1px solid #1e3a5f;',
          'border-radius:10px;padding:11px;font-size:13px;cursor:pointer;',
          'font-family:Cairo,sans-serif;">دخول محلي بديل</button>',
      '</div>',

      /* رسالة خطأ مشتركة */
      '<div id="authError" style="color:#fca5a5;font-size:12px;min-height:18px;margin-top:4px;"></div>',

      /* ملاحظة */
      '<div style="font-size:10px;color:#334155;margin-top:14px;line-height:1.6;">',
        'بياناتك محفوظة بشكل منفصل وآمن لكل حساب<br>',
        'متزامنة تلقائياً بين جميع أجهزتك',
      '</div>',

    '</div>'
  ].join("");

  document.body.appendChild(overlay);
}

/* تبديل التاب */
window._switchAuthTab = function(tab) {
  var isLocal = tab === "local";
  document.getElementById("panelLocal").style.display  = isLocal ? "block" : "none";
  document.getElementById("panelGoogle").style.display = isLocal ? "none"  : "block";
  var tL = document.getElementById("tabLocal");
  var tG = document.getElementById("tabGoogle");
  if (tL) { tL.style.background = isLocal ? "rgba(59,130,246,.2)" : "transparent"; tL.style.color = isLocal ? "#60a5fa" : "#475569"; }
  if (tG) { tG.style.background = isLocal ? "transparent" : "rgba(59,130,246,.2)"; tG.style.color = isLocal ? "#475569" : "#60a5fa"; }
};

function removeAuthScreen() {
  var overlay = document.getElementById("authOverlay");
  if (overlay) overlay.remove();
}

/* ════════════════════════════════════════
   تسجيل الدخول بـ Google
   ════════════════════════════════════════ */
window.signInWithGoogle = function() {
  var btn    = document.getElementById("googleSignInBtn");
  var btnAlt = document.getElementById("googleSignInBtnAlt");
  var errEl  = document.getElementById("authError");

  [btn, btnAlt].forEach(function(b) {
    if (b) { b.disabled = true; b.textContent = "⏳ جاري الدخول..."; }
  });

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  _authInst.signInWithPopup(provider)
    .then(function(result) {
      console.log("[Auth] دخول Google ناجح:", result.user.email);
    })
    .catch(function(err) {
      console.error("[Auth] خطأ:", err.message);
      if (errEl) errEl.textContent = "❌ " + getAuthErrorMsg(err.code);
      [btn, btnAlt].forEach(function(b) {
        if (!b) return;
        b.disabled = false;
        b.innerHTML = _GOOGLE_LOGO_SVG + " تسجيل الدخول بـ Google";
      });
    });
};

/* ════════════════════════════════════════
   تسجيل الدخول المحلي (Email / Password)
   ════════════════════════════════════════ */
window.signInLocal = function() {
  var email = (document.getElementById("localEmail") || {}).value || "";
  var pass  = (document.getElementById("localPass")  || {}).value || "";
  var errEl = document.getElementById("authError");

  email = email.trim();
  if (!email || !pass) {
    if (errEl) errEl.textContent = "❌ أدخل البريد الإلكتروني وكلمة المرور";
    return;
  }

  if (errEl) errEl.textContent = "⏳ جاري الدخول...";

  _authInst.signInWithEmailAndPassword(email, pass)
    .catch(function(err) {
      /* إذا المستخدم غير موجود، أنشئ حساباً جديداً */
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials") {
        return _authInst.createUserWithEmailAndPassword(email, pass);
      }
      throw err;
    })
    .then(function(result) {
      console.log("[Auth] دخول محلي ناجح:", result && result.user ? result.user.email : email);
    })
    .catch(function(err) {
      console.error("[Auth] خطأ محلي:", err.message);
      if (errEl) errEl.textContent = "❌ " + getAuthErrorMsg(err.code);
    });
};


window.signOut = function() {
  if (!confirm("تسجيل الخروج؟")) return;
  removeSubscriptionBlockedScreen();
  _authInst.signOut().then(function() {
    window._booted = false;
    window.DB = null;
    location.reload();
  });
};

/* زر تسجيل الخروج مدمج الآن في fbSyncBtn — firebase-sync.js */

/* ════════════════════════════════════════
   رسائل الخطأ بالعربية
   ════════════════════════════════════════ */
function getAuthErrorMsg(code) {
  var msgs = {
    "auth/popup-closed-by-user":    "أُغلقت نافذة الدخول",
    "auth/popup-blocked":           "المتصفح حجب النافذة المنبثقة — اسمح بها",
    "auth/network-request-failed":  "فشل الاتصال بالإنترنت",
    "auth/too-many-requests":       "محاولات كثيرة — انتظر قليلاً",
    "auth/user-disabled":           "هذا الحساب معطّل",
    "auth/wrong-password":          "كلمة المرور غير صحيحة",
    "auth/invalid-email":           "البريد الإلكتروني غير صالح",
    "auth/email-already-in-use":    "البريد مستخدم مسبقاً",
    "auth/weak-password":           "كلمة المرور ضعيفة — 6 أحرف على الأقل",
    "auth/invalid-credential":      "البريد أو كلمة المرور غير صحيحة",
    "auth/invalid-login-credentials": "البريد أو كلمة المرور غير صحيحة"
  };
  return msgs[code] || "خطأ في تسجيل الدخول";
}

/* ════════════════════════════════════════
   تنظيف UID لاستخدامه كـ key في Firebase
   ════════════════════════════════════════ */
function sanitizeUID(uid) {
  return uid.replace(/[.#$\/\[\]]/g, "_");
}


/* ════════════════════════════════════════
   توليد رابط مشاركة grades-viewer للمعلم
   ════════════════════════════════════════ */
function getViewerLink() {
  if (!_currentUser) { alert("يجب تسجيل الدخول أولاً"); return null; }
  var base = location.href.replace(/\/[^\/]*$/, '/grades-viewer.html');
  return base + '?uid=' + encodeURIComponent(_currentUser.uid);
}

function copyViewerLink() {
  var url = getViewerLink();
  if (!url) return;
  navigator.clipboard.writeText(url).then(function() {
    alert("✅ تم نسخ رابط المشاركة!\n\n" + url);
  }).catch(function() {
    prompt("انسخ الرابط:", url);
  });
}

window.getViewerLink  = getViewerLink;
window.copyViewerLink = copyViewerLink;
