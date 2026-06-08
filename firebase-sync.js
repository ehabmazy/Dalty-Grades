/* ══════════════════════════════════════════════════════
   Dalty Grades — Firebase Realtime Sync
   ملف التزامن بين الموبايل واللاب
   ══════════════════════════════════════════════════════

   طريقة الإضافة:
   ضع هذا السكريبت في index.html بعد سطر:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/...">

   ثم أضف:
   <script src="firebase-sync.js"></script>

   ══════════════════════════════════════════════════════ */


/* ════════════════════════════════════════
   🔧 إعداداتك من Firebase Console
   ════════════════════════════════════════ */
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBS9rW0XqtFCrX0wjrn9NinsxaRLE4EFxE",
  authDomain:        "dalty-grades.firebaseapp.com",
  databaseURL:       "https://dalty-grades-default-rtdb.firebaseio.com",
  projectId:         "dalty-grades",
  storageBucket:     "dalty-grades.firebasestorage.app",
  messagingSenderId: "927174576910",
  appId:             "1:927174576910:web:70ca8e14568bb194bc655f",
  measurementId:     "G-LFLYSSWJET"
};

/* مفتاح البيانات في Firebase */
var FB_PATH = "dalty_grades/main";

/* تأخير الحفظ (مللي ثانية) — لتجنب الحفظ عند كل ضغطة */
var SYNC_DEBOUNCE = 2000;


/* ════════════════════════════════════════
   تحميل مكتبة Firebase تلقائياً
   ════════════════════════════════════════ */
(function loadFirebaseSDK() {
  var scripts = [
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"
  ];

  var loaded = 0;
  scripts.forEach(function (src) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () {
      loaded++;
      if (loaded === scripts.length) {
        initFirebaseSync();
      }
    };
    s.onerror = function () {
      showSyncStatus("error", "⚠️ فشل تحميل Firebase — تأكد من الاتصال بالإنترنت");
    };
    document.head.appendChild(s);
  });
})();


/* ════════════════════════════════════════
   المتغيرات الداخلية
   ════════════════════════════════════════ */
var _fbApp      = null;
var _fbDB       = null;
var _fbRef      = null;
var _syncTimer  = null;
var _isSyncing  = false;
var _lastSaveTS = 0;
var _isOnline   = navigator.onLine;
var _pendingSave = false;


/* ════════════════════════════════════════
   تهيئة Firebase
   ════════════════════════════════════════ */
function initFirebaseSync() {
  try {
    _fbApp = (firebase.apps && firebase.apps.length > 0)
               ? firebase.apps[0]
               : firebase.initializeApp(FIREBASE_CONFIG);
    _fbDB  = firebase.database();
    _fbRef = _fbDB.ref(FB_PATH);

    console.log("[Dalty Sync] Firebase متصل ✅");
    showSyncStatus("ok", "☁️ Firebase متصل");

    /* مراقبة حالة الإنترنت */
    window.addEventListener("online",  function () { _isOnline = true;  onComeOnline(); });
    window.addEventListener("offline", function () { _isOnline = false; showSyncStatus("warn", "📴 غير متصل — البيانات محلية"); });

    /* الاستماع للتغييرات من الأجهزة الأخرى */
    listenForRemoteChanges();

    /* تعديل saveDB لترسل لـ Firebase أيضاً */
    hookSaveDB();

    /* عرض مؤشر التزامن في الشريط العلوي */
    injectSyncUI();

  } catch (e) {
    console.error("[Dalty Sync] خطأ في التهيئة:", e);
    showSyncStatus("error", "❌ خطأ Firebase: " + e.message);
  }
}


/* ════════════════════════════════════════
   الاستماع للتغييرات من الأجهزة الأخرى
   ════════════════════════════════════════ */
function listenForRemoteChanges() {
  _fbRef.on("value", function (snapshot) {
    var remote = snapshot.val();
    if (!remote) return;

    /* تجاهل التحديثات التي أرسلناها نحن */
    if (remote._ts && remote._ts === _lastSaveTS) return;

    /* تجاهل لو البيانات المحلية أحدث */
    var localDB = null;
    try { localDB = JSON.parse(localStorage.getItem("grades_v6")); } catch(e) {}
    if (localDB && localDB._ts && remote._ts && localDB._ts > remote._ts) return;

    console.log("[Dalty Sync] 📥 تحديث من جهاز آخر");

    /* حفظ البيانات الواردة محلياً */
    var clean = restoreKeys(Object.assign({}, remote));
    delete clean._ts;
    delete clean._device;

    try {
      localStorage.setItem("grades_v6", JSON.stringify(clean));
    } catch(e) {}

    /* تحديث DB في الذاكرة وإعادة الرسم */
    if (window.DB !== undefined) {
      window.DB = clean;
      if (typeof window.renderGrades  === "function") window.renderGrades();
      if (typeof window.renderAbsence === "function") window.renderAbsence();
      if (typeof window.renderWeekly  === "function") window.renderWeekly();
    }

    showSyncStatus("ok", "✅ تم التحديث من جهاز آخر");
    setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
  });
}


/* ════════════════════════════════════════
   اعتراض saveDB وإرسالها لـ Firebase
   ════════════════════════════════════════ */
function hookSaveDB() {
  /* انتظر حتى يتم تعريف saveDB في التطبيق */
  var attempts = 0;
  var interval = setInterval(function () {
    attempts++;
    if (typeof window.saveDB === "function" && window.saveDB.toString().indexOf("_fbHooked") === -1) {
      var _origSave = window.saveDB;

      window.saveDB = function () {
        /* _fbHooked — علامة لمنع التكرار */
        /* استدعاء الدالة الأصلية أولاً */
        _origSave.apply(this, arguments);
        /* ثم إرسال لـ Firebase بعد تأخير */
        scheduleSyncToFirebase();
      };

      /* علامة تمنع الـ hook مرة ثانية */
      window.saveDB._fbHooked = true;

      console.log("[Dalty Sync] saveDB مُعترَضة ✅");
      clearInterval(interval);
    }
    if (attempts > 100) clearInterval(interval);
  }, 100);
}


/* ════════════════════════════════════════
   جدولة الإرسال لـ Firebase (مع debounce)
   ════════════════════════════════════════ */
function scheduleSyncToFirebase() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function () {
    pushToFirebase();
  }, SYNC_DEBOUNCE);
}


/* ════════════════════════════════════════
   إرسال البيانات لـ Firebase
   ════════════════════════════════════════ */
/* تحويل المفاتيح — Firebase لا يقبل . # $ / [ ] */
function sanitizeKeys(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeKeys);
  var out = {};
  Object.keys(obj).forEach(function(k) {
    var safe = k
      .replace(/\./g,  "__DOT__")
      .replace(/#/g,   "__HASH__")
      .replace(/\$/g,  "__DOLLAR__")
      .replace(/\//g,  "__SLASH__")
      .replace(/\[/g,  "__LB__")
      .replace(/\]/g,  "__RB__");
    out[safe] = sanitizeKeys(obj[k]);
  });
  return out;
}

function restoreKeys(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(restoreKeys);
  var out = {};
  Object.keys(obj).forEach(function(k) {
    var orig = k
      .replace(/__DOT__/g,    ".")
      .replace(/__HASH__/g,   "#")
      .replace(/__DOLLAR__/g, "$")
      .replace(/__SLASH__/g,  "/")
      .replace(/__LB__/g,     "[")
      .replace(/__RB__/g,     "]");
    out[orig] = restoreKeys(obj[k]);
  });
  return out;
}

function pushToFirebase() {
  if (!_fbRef) return;
  if (!_isOnline) {
    _pendingSave = true;
    showSyncStatus("warn", "📴 محفوظ محلياً — سيُرسل عند الاتصال");
    return;
  }

  var db = window.DB;
  if (!db) return;

  _isSyncing = true;
  showSyncStatus("syncing", "⏫ جاري التزامن...");

  var ts = Date.now();
  _lastSaveTS = ts;

  var payload = sanitizeKeys(JSON.parse(JSON.stringify(db)));
  payload._ts     = ts;
  payload._device = getDeviceId();

  _fbRef.set(payload)
    .then(function () {
      _isSyncing = false;
      showSyncStatus("ok", "☁️ متزامن");
      console.log("[Dalty Sync] ✅ تم الحفظ على Firebase");
    })
    .catch(function (err) {
      _isSyncing = false;
      _pendingSave = true;
      showSyncStatus("error", "❌ فشل التزامن: " + err.message);
      console.error("[Dalty Sync]", err);
    });
}


/* ════════════════════════════════════════
   عند العودة للإنترنت — إرسال ما فات
   ════════════════════════════════════════ */
function onComeOnline() {
  showSyncStatus("ok", "🌐 عاد الاتصال");
  if (_pendingSave) {
    _pendingSave = false;
    setTimeout(pushToFirebase, 1000);
  }
}


/* ════════════════════════════════════════
   معرف الجهاز (للتمييز في السجلات)
   ════════════════════════════════════════ */
function getDeviceId() {
  var k = "dalty_device_id";
  var id = localStorage.getItem(k);
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(k, id);
  }
  return id;
}


/* ════════════════════════════════════════
   واجهة مؤشر التزامن في الشريط العلوي
   ════════════════════════════════════════ */
function injectSyncUI() {
  /* زر مدمج: صورة المستخدم + اسمه + حالة المزامنة */
  var btn = document.createElement("button");
  btn.id = "fbSyncBtn";
  btn.title = "حالة التزامن";
  btn.onclick = function () { openSyncPanel(); };
  btn.style.cssText = [
    "background:#0a1e45",
    "border:1px solid #1e3a5f",
    "color:#60a5fa",
    "border-radius:20px",
    "padding:2px 8px 2px 4px",
    "font-size:9.5px",
    "font-weight:700",
    "cursor:pointer",
    "font-family:inherit",
    "white-space:nowrap",
    "height:26px",
    "display:inline-flex",
    "align-items:center",
    "gap:5px",
    "max-width:150px",
    "overflow:hidden"
  ].join(";");
  btn.innerHTML = "☁️ جاري الاتصال...";

  /* إضافته في الـ topbar */
  var waitForTopbar = setInterval(function () {
    var topbar = document.querySelector(".app-topbar") || document.querySelector(".top-user-area");
    if (topbar) {
      topbar.appendChild(btn);
      clearInterval(waitForTopbar);
      /* لو المستخدم مسجل دخول، حدّث الزر بصورته واسمه */
      _updateMergedBtn();
    }
  }, 300);
}

/* تحديث الزر المدمج بمعلومات المستخدم */
function _updateMergedBtn() {
  var btn = document.getElementById("fbSyncBtn");
  if (!btn) return;
  var user = window._currentAuthUser;
  if (!user) return;

  var avatar = user.photoURL
    ? '<img src="' + user.photoURL + '" style="width:18px;height:18px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
    : '<span style="font-size:13px;">👤</span>';
  var name = (user.displayName || user.email || "").split(" ")[0];

  btn.dataset.userHtml = avatar + '<span style="color:#94a3b8;max-width:70px;overflow:hidden;text-overflow:ellipsis;">' + name + '</span>';
  btn.dataset.hasUser = "1";
  /* أضف تسجيل خروج بالضغط المطول */
  btn.title = name + " — اضغط لمزامنة | اضغط مطولاً لتسجيل الخروج";
  btn.oncontextmenu = function(e) { e.preventDefault(); if(typeof window.signOut==="function") window.signOut(); };
}

/* تصدير للاستخدام من auth.js */
window._updateMergedBtn = _updateMergedBtn;

function showSyncStatus(type, msg) {
  var btn = document.getElementById("fbSyncBtn");
  if (!btn) return;
  /* لو في مستخدم، اعرض صورته + اسمه + حالة المزامنة */
  if (btn.dataset.hasUser) {
    /* على الموبايل: صورة + أيقونة المزامنة فقط */
    var avatar = btn.dataset.userHtml;
    var icon = msg.split(' ')[0]; /* أخذ الأيقونة فقط */
    btn.innerHTML = avatar + '<span style="border-right:1px solid #1e3a5f;height:14px;margin:0 2px;"></span>' + '<span>' + icon + '</span>';
    btn.title = (btn.dataset.userName || '') + ' — ' + msg;
  } else {
    btn.innerHTML = msg;
  }
  btn.style.background = {
    ok:      "#0a2a1a",
    syncing: "#0a1e45",
    warn:    "#2a1a00",
    error:   "#2a0a0a"
  }[type] || "#0a1628";
  btn.style.borderColor = {
    ok:      "#10b981",
    syncing: "#3b82f6",
    warn:    "#f59e0b",
    error:   "#ef4444"
  }[type] || "#1e3a5f";
  btn.style.color = {
    ok:      "#6ee7b7",
    syncing: "#93c5fd",
    warn:    "#fcd34d",
    error:   "#fca5a5"
  }[type] || "#60a5fa";
}


/* ════════════════════════════════════════
   لوحة معلومات التزامن
   ════════════════════════════════════════ */
function openSyncPanel() {
  var existing = document.getElementById("fbSyncPanel");
  if (existing) { existing.remove(); return; }

  var panel = document.createElement("div");
  panel.id = "fbSyncPanel";
  panel.style.cssText = [
    "position:fixed",
    "top:44px",
    "left:12px",
    "background:#0f1e35",
    "border:1.5px solid #1d4ed8",
    "border-radius:12px",
    "padding:16px",
    "z-index:9999",
    "min-width:260px",
    "box-shadow:0 8px 32px rgba(0,0,0,.7)",
    "font-family:inherit",
    "direction:rtl"
  ].join(";");

  panel.innerHTML = [
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
      '<span style="color:#60a5fa;font-size:13px;font-weight:900;">☁️ إعدادات التزامن</span>',
      '<button onclick="document.getElementById(\'fbSyncPanel\').remove()" ',
        'style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:6px;',
        'padding:2px 8px;cursor:pointer;font-size:12px;">✕</button>',
    '</div>',

    '<div style="font-size:10px;color:#475569;margin-bottom:8px;">معرف الجهاز:</div>',
    '<div style="font-size:10px;color:#60a5fa;background:#0a1628;padding:4px 8px;border-radius:6px;',
      'margin-bottom:12px;font-family:monospace;">' + getDeviceId() + '</div>',

    '<div style="font-size:10px;color:#475569;margin-bottom:8px;">الحالة:</div>',
    '<div id="fbPanelStatus" style="font-size:11px;color:#6ee7b7;margin-bottom:14px;">',
      _isOnline ? "🟢 متصل" : "🔴 غير متصل",
    '</div>',

    '<div style="display:flex;flex-direction:column;gap:7px;">',

      /* زر مزامنة يدوية */
      '<button onclick="pushToFirebase();document.getElementById(\'fbSyncPanel\').remove();" ',
        'style="background:#1d4ed8;color:white;border:none;border-radius:8px;padding:8px;',
        'font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">',
        '⬆️ رفع بياناتي الآن',
      '</button>',

      /* زر جلب من Firebase */
      '<button onclick="pullFromFirebase();document.getElementById(\'fbSyncPanel\').remove();" ',
        'style="background:#0369a1;color:white;border:none;border-radius:8px;padding:8px;',
        'font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">',
        '⬇️ جلب آخر نسخة من السحابة',
      '</button>',

    '</div>'
  ].join("");

  document.body.appendChild(panel);
}


/* ════════════════════════════════════════
   جلب يدوي من Firebase
   ════════════════════════════════════════ */
function pullFromFirebase() {
  if (!_fbRef) { alert("Firebase غير متصل"); return; }
  showSyncStatus("syncing", "⬇️ جاري الجلب...");

  _fbRef.once("value")
    .then(function (snapshot) {
      var remote = snapshot.val();
      if (!remote) {
        showSyncStatus("warn", "⚠️ لا توجد بيانات في السحابة");
        return;
      }

      var clean = restoreKeys(Object.assign({}, remote));
      delete clean._ts;
      delete clean._device;

      if (!confirm("⚠️ سيتم استبدال بياناتك الحالية ببيانات السحابة. متأكد؟")) return;

      localStorage.setItem("grades_v6", JSON.stringify(clean));
      window.DB = clean;

      if (typeof window.renderGrades  === "function") window.renderGrades();
      if (typeof window.renderAbsence === "function") window.renderAbsence();
      if (typeof window.renderWeekly  === "function") window.renderWeekly();

      showSyncStatus("ok", "✅ تم الجلب");
      setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
    })
    .catch(function (err) {
      showSyncStatus("error", "❌ " + err.message);
    });
}
