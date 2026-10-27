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
var FB_PATH = "dalty_grades/main"; /* مسار افتراضي — يُستبدل بعد تسجيل الدخول */

/* تأخير الحفظ (مللي ثانية) — لتجنب الحفظ عند كل ضغطة */
var SYNC_DEBOUNCE = 2000;


/* Firebase SDK محمّل مباشرة من index.html */
window.addEventListener("load", function () { initFirebaseSync(); });


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
  /* لم يتحمّل Firebase (بدون إنترنت): التطبيق يعمل محلياً بدون مزامنة */
  if (typeof firebase === "undefined") {
    console.warn("[Dalty Sync] Firebase غير متاح — وضع محلي");
    showSyncStatus("warn", "📴 غير متصل — البيانات محلية");
    window.addEventListener("online", function () {
      showSyncStatus("ok", "🌐 عاد الاتصال — أعد فتح التطبيق لتفعيل المزامنة");
    });
    return;
  }
  try {
    _fbApp = (firebase.apps && firebase.apps.length > 0)
               ? firebase.apps[0]
               : firebase.initializeApp(FIREBASE_CONFIG);
    _fbDB  = firebase.database();
    _fbRef = _fbDB.ref(FB_PATH);

    console.log("[Dalty Sync] Firebase متصل ✅");
    showSyncStatus("ok", "☁️ Firebase متصل — في انتظار تسجيل الدخول");

    /* مراقبة حالة الإنترنت */
    window.addEventListener("online",  function () { _isOnline = true;  onComeOnline(); });
    window.addEventListener("offline", function () { _isOnline = false; showSyncStatus("warn", "📴 غير متصل — البيانات محلية"); });

    /* تعديل saveDB لترسل لـ Firebase أيضاً */
    hookSaveDB();

    /* عرض مؤشر التزامن في الشريط العلوي */
    injectSyncUI();

    /* ملاحظة: listenForRemoteChanges تُستدعى من setFirebaseUserPath بعد تسجيل الدخول */

  } catch (e) {
    console.error("[Dalty Sync] خطأ في التهيئة:", e);
    showSyncStatus("error", "❌ خطأ Firebase: " + e.message);
  }
}


/* ════════════════════════════════════════
   تعيين مسار المستخدم بعد تسجيل الدخول
   يُستدعى من auth.js عند معرفة الـ UID
   ════════════════════════════════════════ */
function setFirebaseUserPath(uid) {
  if (!uid || !_fbDB) return;
  var newPath = "dalty_grades/users/" + uid + "/data";
  if (FB_PATH === newPath) return; /* لا تغيير */

  FB_PATH = newPath;

  /* إلغاء الاستماع القديم */
  if (_fbRef) _fbRef.off();

  /* مسار جديد خاص بهذا المستخدم */
  _fbRef = _fbDB.ref(FB_PATH);
  console.log("[Dalty Sync] 🔑 مسار المستخدم:", FB_PATH);
  showSyncStatus("syncing", "⏳ جاري تحميل بياناتك...");

  /* ابدأ الاستماع من جديد */
  listenForRemoteChanges();
}

/* تصدير للاستخدام من auth.js */
window.setFirebaseUserPath = setFirebaseUserPath;


/* ⚠️ يضمن وجود كل الهياكل الجوهرية حتى لو كانت النسخة القادمة من
   السحابة ناقصة جزئياً (زي غياب absences أو schedule بس) بدل ما
   نرفض التحديث بالكامل أو نخلي صفحات زي الغياب/المرضي تنهار. */
function repairDB(clean) {
  if (!clean.classes) clean.classes = [];
  if (!clean.data) clean.data = {};
  if (!clean.schedule) clean.schedule = {};
  if (!clean.absences) clean.absences = {};
  clean.classes.forEach(function (c) {
    if (!clean.data[c]) clean.data[c] = [];
    if (!clean.schedule[c]) clean.schedule[c] = {};
    if (!clean.absences[c]) clean.absences[c] = {};
  });
  if (!clean.meta) clean.meta = {};
  if (!clean.curric) clean.curric = { units: [], weeks: [], holidays: [], exams: [] };
  return clean;
}

/* ════════════════════════════════════════
   علامة "تعديلات لم تُرفع بعد"
   تُحفظ على الجهاز، فتبقى حتى لو أُغلق التطبيق بدون إنترنت،
   وبها لا تُستبدل الدرجات المرصودة أوفلاين بنسخة السحابة عند عودة الاتصال
   ════════════════════════════════════════ */
var UNSYNCED_KEY = "dalty_unsynced_ts";
function _markUnsynced() {
  try { localStorage.setItem(UNSYNCED_KEY, String(Date.now())); } catch (e) {}
}
function _getUnsyncedTs() {
  try { return parseInt(localStorage.getItem(UNSYNCED_KEY) || "0", 10) || 0; } catch (e) { return 0; }
}
function _isUnsynced() { return _getUnsyncedTs() > 0; }
/* لا تمسح العلامة إن حدث تعديل جديد أثناء الرفع */
function _clearUnsyncedIfOlder(pushStartTs) {
  try {
    if (_getUnsyncedTs() <= pushStartTs) localStorage.removeItem(UNSYNCED_KEY);
  } catch (e) {}
}
function _localStoreKey() { return window.STORE_KEY || "grades_v6"; }

/* آخر نسخة سحابية طُبّقت/رُفعت من هذا الجهاز — لتجنّب إعادة تطبيق نفس النسخة في كل فتح */
function _getKnownRemoteTs() {
  try { return parseInt(localStorage.getItem(_localStoreKey() + "_rts") || "0", 10) || 0; } catch (e) { return 0; }
}
function _setKnownRemoteTs(ts) {
  try { if (ts) localStorage.setItem(_localStoreKey() + "_rts", String(ts)); } catch (e) {}
}

/* لو المستخدم داخل صفحة (غير الرئيسية) لا نستبدل بياناتها ونعيد رسمها أمامه — نؤجّل التطبيق */
function _remoteShouldWait() {
  try {
    return !!(window._booted && window.DB && window.DB.data &&
              typeof _currentPage !== "undefined" && _currentPage !== "home");
  } catch (e) { return false; }
}
function _flushPendingRemote() {
  var fn = window._pendingRemoteApply;
  window._pendingRemoteApply = null;
  var b = document.getElementById("remoteUpdateBanner");
  if (b) b.remove();
  if (fn) { try { fn(); } catch (e) { console.warn("[Dalty Sync] flush", e); } }
}
function _notifyRemotePending() {
  /* طبّق المؤجَّل تلقائياً عند العودة للرئيسية */
  if (!window._spWrapped && typeof window.switchPage === "function") {
    window._spWrapped = true;
    var _sp = window.switchPage;
    window.switchPage = function (p) {
      var r = _sp.apply(this, arguments);
      if (p === "home" && window._pendingRemoteApply) _flushPendingRemote();
      return r;
    };
  }
  if (document.getElementById("remoteUpdateBanner")) return;
  var d = document.createElement("div");
  d.id = "remoteUpdateBanner";
  d.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:76px;z-index:9998;" +
    "background:#0f1e35;color:#e2e8f0;border:1px solid #1e3a5f;border-radius:12px;padding:9px 14px;" +
    "font-family:Cairo,sans-serif;font-size:13px;direction:rtl;display:flex;gap:10px;align-items:center;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.4)";
  d.innerHTML = '<span>🔄 توجد نسخة أحدث على السحابة</span>' +
    '<button style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:5px 10px;' +
    'font-family:Cairo,sans-serif;cursor:pointer">تحديث الآن</button>' +
    '<button style="background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:15px">✕</button>';
  d.children[1].onclick = _flushPendingRemote;
  d.children[2].onclick = function () { d.remove(); };
  document.body.appendChild(d);
}

function listenForRemoteChanges() {
  _fbRef.on("value", function (snapshot) {
    var remote = snapshot.val();
    if (!remote) {
      /* لا بيانات على السحابة بعد: ارفع ما لدينا إن كان فيه تعديلات لم تُرفع */
      if (_isUnsynced()) setTimeout(pushToFirebase, 1000);
      return;
    }

    /* تجاهل التحديثات التي أرسلناها نحن */
    if (remote._ts && remote._ts === _lastSaveTS) return;

    /* ⚠️ لدينا درجات/تعديلات على الجهاز لم تُرفع بعد (غالباً رُصدت بدون إنترنت):
       لا تستبدلها بنسخة السحابة — ارفعها هي أولاً */
    if (_isUnsynced()) {
      console.warn("[Dalty Sync] تعديلات محلية لم تُرفع — تم تجاهل نسخة السحابة ورفع المحلية");
      if (_isOnline) {
        showSyncStatus("syncing", "⏫ رفع الدرجات المرصودة بدون إنترنت...");
        if (_syncTimer) clearTimeout(_syncTimer);
        _syncTimer = setTimeout(pushToFirebase, 1000);
      } else {
        _pendingSave = true;
      }
      return;
    }

    /* حفظ البيانات الواردة محلياً */
    var clean = restoreKeys(Object.assign({}, remote));
    delete clean._ts;
    delete clean._device;

    /* ⚠️ تحقق من سلامة البيانات القادمة قبل استبدال أي شيء محلي بها.
       لو البيانات القادمة من السحابة ناقصة تمامًا (زي غياب data/classes) فده
       يعني نسخة تالفة بالكامل — تجاهلها ولا تكسر التطبيق أو تفقد بيانات المستخدم. */
    if (!clean || typeof clean !== "object" || !clean.data || !clean.classes) {
      console.warn("[Dalty Sync] ⚠️ تجاهل تحديث سحابي غير مكتمل (بيانات ناقصة)");
      showSyncStatus("warn", "⚠️ تم تجاهل نسخة سحابية غير مكتملة");
      /* لو عندنا نسخة محلية سليمة، ارفعها فوق لتصحيح النسخة التالفة في السحابة */
      if (window.DB && window.DB.data && window.DB.classes && typeof pushToFirebase === "function") {
        setTimeout(pushToFirebase, 1500);
      }
      setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
      return;
    }

    /* إصلاح أي نقص جزئي (زي absences أو schedule) بدل رفض التحديث بالكامل */
    clean = repairDB(clean);

    /* نفس النسخة المطبّقة سابقاً: لا شيء يتغير — لا إعادة رسم ولا تحميل زائد */
    var _rts = remote._ts || 0;
    if (_rts && _rts === _getKnownRemoteTs()) {
      showSyncStatus("ok", "☁️ متزامن");
      return;
    }

    var _applyIt = function () {
      /* إن رُصدت تعديلات محلية أثناء الانتظار فهي الأحدث: لا تستبدلها */
      if (_isUnsynced()) return;
      console.log("[Dalty Sync] 📥 تحديث من جهاز آخر");

      try {
        localStorage.setItem(_localStoreKey(), JSON.stringify(clean));
      } catch(e) {}

      /* تحديث DB في الذاكرة وإعادة الرسم */
      if (window.DB !== undefined) {
        window.DB = clean;
        if (typeof window._photosHydrate === "function") window._photosHydrate();
        if (typeof window.renderGrades  === "function") window.renderGrades();
        if (typeof window.renderAbsence === "function") window.renderAbsence();
        if (typeof window.renderWeekly  === "function") window.renderWeekly();
        if (typeof window.renderSick    === "function") window.renderSick();
      }
      _setKnownRemoteTs(_rts);
      showSyncStatus("ok", "✅ تم التحديث من جهاز آخر");
      setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
    };

    if (_remoteShouldWait()) {
      window._pendingRemoteApply = _applyIt;   /* آخر نسخة فقط */
      _notifyRemotePending();
      showSyncStatus("ok", "☁️ نسخة أحدث بانتظار التحديث");
      return;
    }
    _applyIt();
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
        var _saveRes = _origSave.apply(this, arguments);
        /* سجّل أن هناك تعديلاً لم يُرفع بعد (تُمسح عند نجاح الرفع) */
        _markUnsynced();
        /* ثم إرسال لـ Firebase بعد تأخير */
        scheduleSyncToFirebase();
        return _saveRes;
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

  var payload = sanitizeKeys(JSON.parse(JSON.stringify(db, window._photoReplacerStrict || null)));
  payload._ts     = ts;
  payload._device = getDeviceId();

  _fbRef.set(payload)
    .then(function () {
      _isSyncing = false;
      _clearUnsyncedIfOlder(ts);
      _setKnownRemoteTs(ts);
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
  if (_pendingSave || _isUnsynced()) {
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
  if (!_fbRef) { alert("Firebase غير جاهز"); return; }

  /* تأكد أن المسار هو مسار المستخدم المسجّل (قد يتأخر الضبط بعد تسجيل الدخول) */
  try {
    var _u = (firebase.auth && firebase.auth().currentUser) || window._currentAuthUser || null;
    if (_u && _u.uid && typeof setFirebaseUserPath === "function") {
      var _want = "dalty_grades/users/" + String(_u.uid).replace(/[.#$\/\[\]]/g, "_") + "/data";
      if (FB_PATH !== _want) { setFirebaseUserPath(_u.uid); }
    } else if (!_u && FB_PATH.indexOf("/users/") === -1) {
      showSyncStatus("error", "❌ سجّل الدخول أولاً ثم أعد المحاولة");
      return;
    }
  } catch (e) {}

  if (!navigator.onLine) { showSyncStatus("error", "❌ لا يوجد اتصال بالإنترنت"); return; }
  showSyncStatus("syncing", "⏳ جاري الجلب...");

  /* مهلة 20 ثانية حتى لا يبقى الزر معلّقاً */
  var _done = false;
  var _timeout = setTimeout(function () {
    if (_done) return;
    _done = true;
    showSyncStatus("error", "❌ انتهت المهلة — تحقق من الشبكة وأعد المحاولة");
  }, 20000);

  _fbRef.once("value")
    .then(function (snapshot) {
      if (_done) return;
      _done = true; clearTimeout(_timeout);

      var remote = snapshot.val();
      if (!remote) {
        showSyncStatus("warn", "⚠️ لا توجد بيانات على السحابة");
        return;
      }

      var clean = restoreKeys(Object.assign({}, remote));
      var remoteTs = clean._ts || Date.now();
      delete clean._ts;
      delete clean._device;

      if (!clean || typeof clean !== "object" || !clean.data || !clean.classes) {
        alert("⚠️ البيانات على السحابة غير مكتملة أو غير صالحة، لم يتم استبدال بياناتك المحلية.");
        showSyncStatus("warn", "⚠️ نسخة السحابة غير صالحة — لم تُستبدل");
        return;
      }

      clean = repairDB(clean);

      if (!confirm("هل تريد استبدال بياناتك الحالية بآخر نسخة من السحابة؟")) {
        showSyncStatus("ok", "تم الإلغاء");
        return;
      }

      /* حدّث الذاكرة أولاً: فشل الحفظ المحلي (امتلاء التخزين) لا يجب أن يمنع التحديث */
      window.DB = clean;
      _lastSaveTS = remoteTs;
      _setKnownRemoteTs(remoteTs);
      var _stored = true;
      try { localStorage.setItem(_localStoreKey(), JSON.stringify(clean)); }
      catch (e) { _stored = false; console.warn("[Dalty Sync] تعذر الحفظ المحلي:", e); }
      try { localStorage.removeItem(UNSYNCED_KEY); } catch (e) {}
      try { if (typeof window._photosHydrate === "function") window._photosHydrate(); } catch (e) {}

      ["renderGrades", "renderAbsence", "renderWeekly", "renderSick", "renderHomePage"].forEach(function (fn) {
        try { if (typeof window[fn] === "function") window[fn](); } catch (e) { console.warn(fn, e); }
      });

      if (_stored) {
        showSyncStatus("ok", "✅ تم الجلب");
        setTimeout(function () { showSyncStatus("ok", "تم الحفظ"); }, 3000);
      } else {
        showSyncStatus("warn", "⚠️ تم الجلب لكن مساحة التخزين ممتلئة — اعمل نسخة احتياطية");
      }
    })
    .catch(function (err) {
      if (_done) return;
      _done = true; clearTimeout(_timeout);
      var code = (err && err.code) || "";
      var msg = (err && err.message) || String(err);
      if (/permission/i.test(code + msg)) msg = "لا توجد صلاحية قراءة (permission denied) — سجّل الخروج ثم الدخول من جديد";
      else if (/network|unavailable|offline/i.test(code + msg)) msg = "تعذر الاتصال بالسحابة";
      console.error("[Dalty Sync] pull error:", err);
      showSyncStatus("error", "❌ " + msg);
    });
}
