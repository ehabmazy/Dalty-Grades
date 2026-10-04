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
   حالة "تعديلات لم تُرفع بعد" — تُحفظ على الجهاز
   (كانت تُحفظ في الذاكرة فقط، فتضيع عند إغلاق التطبيق
    وتحلّ نسخة السحابة القديمة محل تعديلاتك عند الفتح)
   ════════════════════════════════════════ */
function _fbStoreKey() { return window.STORE_KEY || "grades_v6"; }
function _dirtyKey()   { return "dalty_dirty_"  + _fbStoreKey(); }
function _syncedKey()  { return "dalty_synced_" + _fbStoreKey(); }
function _getDirty() {
  try { return Number(localStorage.getItem(_dirtyKey())) || 0; } catch (e) { return 0; }
}
function _markDirty() {
  try { localStorage.setItem(_dirtyKey(), String(Date.now())); } catch (e) {}
}
function _clearDirtyIfNotNewer(seen) {
  try { if ((Number(localStorage.getItem(_dirtyKey())) || 0) <= seen) localStorage.removeItem(_dirtyKey()); } catch (e) {}
}
function _setSynced(ts, sig) {
  try { localStorage.setItem(_syncedKey(), JSON.stringify({ ts: ts, at: Date.now(), sig: sig || "" })); } catch (e) {}
}
function _getSynced() {
  try { return JSON.parse(localStorage.getItem(_syncedKey())) || null; } catch (e) { return null; }
}
/* ════════════════════════════════════════
   حماية من فقدان البيانات
   ١) إحصاء ما في النسخة (طلاب + خانات درجات مرصودة)
   ٢) لا نرفع للسحابة قبل وصول أول نسخة منها في هذه الجلسة
   ٣) لا نستبدل نسخة غنية بنسخة أفقر بكثير (جهاز جديد/تخزين ممسوح)
   ٤) قبل أي استبدال نحفظ نسخة احتياطية من بيانات الجهاز
   ════════════════════════════════════════ */
var _firstSnapshotDone = false;
var _lastRemoteStats   = null;
var REGRESS_RATIO = 0.6;   /* أقل من ٦٠٪ مما في السحابة = نسخة ناقصة مشبوهة */
var REGRESS_MIN   = 15;    /* لا نطبّق الحماية إلا لو السحابة فيها ١٥ خانة فأكثر */

function _statsOf(db) {
  var st = { students: 0, cells: 0 };
  try {
    if (!db || !db.data) return st;
    Object.keys(db.data).forEach(function (cls) {
      (db.data[cls] || []).forEach(function (s) {
        if (!s || !String(s.name || "").trim()) return;
        st.students++;
        Object.keys(s).forEach(function (k) {
          if (!/^(a|h|bw)\d+$|^ex[12]$/.test(k)) return;
          var v = s[k];
          if (v !== "" && v !== undefined && v !== null) st.cells++;
        });
      });
    });
  } catch (e) {}
  return st;
}
function _isRegression(localSt, remoteSt) {
  if (!remoteSt || remoteSt.cells < REGRESS_MIN) return false;
  return localSt.cells < remoteSt.cells * REGRESS_RATIO;
}
function _bkKey() { return "dalty_backup_local_" + _fbStoreKey(); }
/* نسخة احتياطية من بيانات الجهاز قبل استبدالها (بدون الصور الكبيرة، ومحدودة الحجم حتى لا تزاحم الحفظ الأساسي) */
function _backupLocal(reason) {
  try {
    if (!window.DB || !window.DB.data) return false;
    var st = _statsOf(window.DB);
    if (!st.cells && !st.students) return false;
    var json = JSON.stringify({ at: Date.now(), reason: reason, stats: st, db: window.DB },
      function (k, v) { return (typeof v === "string" && v.length > 20000) ? "" : v; });
    if (json.length > 1500000) return false;
    localStorage.setItem(_bkKey(), json);
    return true;
  } catch (e) { return false; }
}
function _getBackup() {
  try { return JSON.parse(localStorage.getItem(_bkKey())); } catch (e) { return null; }
}
function restoreLocalBackup() {
  var b = _getBackup();
  if (!b || !b.db) { alert("لا توجد نسخة احتياطية محلية."); return; }
  var when = new Date(b.at).toLocaleString("ar-EG");
  if (!confirm("استرجاع نسخة الجهاز المحفوظة بتاريخ " + when + "؟\n(" + b.stats.students + " طالب، " + b.stats.cells + " خانة درجات)\n\nستحلّ محل البيانات الحالية ثم تُرفع للسحابة.")) return;
  try {
    localStorage.setItem(_fbStoreKey(), JSON.stringify(b.db));
    window.DB = b.db;
    _rememberStored();
    _markDirty();
    if (typeof window.renderGrades === "function") window.renderGrades();
    if (typeof window.renderWeekly === "function") window.renderWeekly();
    if (typeof window.renderAbsence === "function") window.renderAbsence();
    scheduleSyncToFirebase();
    if (typeof showSnack === "function") showSnack("✅ تم استرجاع النسخة الاحتياطية");
  } catch (e) { alert("تعذّر الاسترجاع: " + e.message); }
}
window.restoreLocalBackup = restoreLocalBackup;

/* توقيع لمحتوى الدرجات والغياب والأسماء فقط (الحقول الفارغة تُهمل) */
function _sigOf(db) {
  var h = 2166136261;
  function mix(str) {
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  }
  try {
    if (!db) return "0";
    (db.classes || []).slice().sort().forEach(function (cls) {
      mix("|C" + cls);
      ((db.data && db.data[cls]) || []).forEach(function (s) {
        if (!s) return;
        mix("|S" + s.id + "~" + (s.name || ""));
        Object.keys(s).sort().forEach(function (k) {
          if (!/^(a|h|bw|im)\d+$|^ex[12]$/.test(k)) return;
          var v = s[k];
          if (v === "" || v === undefined || v === null) return;
          mix(";" + k + "=" + v);
        });
      });
      var ab = (db.absences && db.absences[cls]) || {};
      Object.keys(ab).sort().forEach(function (id) {
        var o = ab[id] || {};
        Object.keys(o).sort().forEach(function (k) { if (o[k]) mix("|A" + id + k + "=" + o[k]); });
      });
    });
  } catch (e) { return "err"; }
  return String(h);
}


/* ════════════════════════════════════════════════════════════════
   حماية من «نسخة قديمة مفتوحة في الخلفية»
   لو كان التطبيق مفتوحاً في نافذتين (تبويب + تطبيق مثبّت) فكل منهما يحمل نسخة في ذاكرته؛
   كان الحفظ من القديمة يمسح ما كتبته الأحدث. الآن نكتشف أن التخزين تغيّر بيد نسخة أخرى
   فندمج بدل أن نكتب فوقها.
   ════════════════════════════════════════════════════════════════ */
var _lastRaw = null;     /* آخر نص رأيناه في التخزين (قرأناه أو كتبناه) */
var _lastSnap = null;    /* لقطة بياناتنا وقتها (أساس الدمج بين النسخ) */

function _rawNow() { try { return localStorage.getItem(_fbStoreKey()); } catch (e) { return null; } }
function _rememberStored() {
  _lastRaw = _rawNow();
  try { _lastSnap = window.DB ? _stripBig(window.DB) : null; } catch (e) { _lastSnap = null; }
}
/* يعيد true إذا اندمجت بيانات نسخة أخرى في ذاكرتنا */
function _absorbForeign() {
  var cur = _rawNow();
  if (cur === null || _lastRaw === null || cur === _lastRaw) return false;
  var foreign;
  try { foreign = JSON.parse(cur); } catch (e) { return false; }
  if (!foreign || !foreign.data || !foreign.classes || !window.DB) { _lastRaw = cur; return false; }
  var merged;
  try { merged = repairDB(_m3(_lastSnap || {}, window.DB, repairDB(foreign))); }
  catch (e) { console.error("[Dalty Sync] فشل دمج نسخة أخرى", e); return false; }
  _backupLocal("before-foreign-merge");
  window.DB = merged;
  _lastRaw = cur;
  _lastSnap = _stripBig(foreign);
  return true;
}
function _refreshUI() {
  try {
    if (typeof window._refreshCurrentAndRelated === "function") { window._refreshCurrentAndRelated(); return; }
    ["renderGrades", "renderAbsence", "renderWeekly", "renderSick"].forEach(function (f) { if (typeof window[f] === "function") window[f](); });
  } catch (e) {}
}
/* عند عودة النافذة للمقدمة: التقط ما كتبته نسخة أخرى فوراً */
function _watchForeignWrites() {
  var check = function () {
    try {
      if (_absorbForeign()) {
        if (window.saveDB) window.saveDB();     /* ثبّت النسخة المدموجة */
        _refreshUI();
      }
    } catch (e) {}
  };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) check(); });
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
}

function _hhmm(t) {
  if (!t) return "—";
  var d = new Date(t);
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
}
/* مؤشر دائم: هل آخر تعديل محفوظ ومرفوع؟ */
function _refreshSaveBadge() {
  if (_getDirty()) {
    showSyncStatus("warn", _isOnline ? "⏳ جاري الرفع" : "📴 محفوظ بالجهاز");
  }
}


/* ════════════════════════════════════════
   تهيئة Firebase
   ════════════════════════════════════════ */
function initFirebaseSync() {
  /* اطلب من المتصفح تثبيت التخزين حتى لا يمسحه النظام عند امتلاء مساحة الهاتف */
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(function (p) { if (!p) navigator.storage.persist(); }).catch(function () {});
    }
  } catch (e) {}
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

  /* اتصال فعلي بالخادم (أدق من حدث online عند واي فاي بدون إنترنت): ارفع أي تعديلات معلّقة */
  if (!window._fbConnWatch) {
    window._fbConnWatch = true;
    _fbDB.ref(".info/connected").on("value", function (s) {
      if (s.val() === true) {
        _isOnline = true;
        if (_getDirty()) scheduleSyncToFirebase();
      }
    });
  }
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


/* ════════════════════════════════════════════════════════════════
   دمج ذكي بدل «الفائز يأخذ كل شيء»
   • الأساس (base) = آخر نسخة كان الجهاز والسحابة متفقين عليها.
   • لكل خانة: إن تغيّرت عندي فقط ← أحتفظ بتعديلي، وإن تغيّرت في السحابة فقط ← آخذها،
     وإن تغيّرت عند الطرفين بقيمتين مختلفتين ← تفوز قيمة هذا الجهاز.
   • بهذا لا يضيع أي تعديل في الحالتين: جهازان معاً، أو تعديل بلا إنترنت.
   ════════════════════════════════════════════════════════════════ */
function _isEmptyV(v) {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}
function _isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function _deepEq(a, b) {
  if (_isEmptyV(a) && _isEmptyV(b)) return true;
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== "object" || typeof b !== "object") return typeof a !== "object" && typeof b !== "object" && String(a) === String(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!_deepEq(a[i], b[i])) return false;
    return true;
  }
  var seen = {}, k;
  for (k in a) { seen[k] = 1; if (!_deepEq(a[k], b[k])) return false; }
  for (k in b) { if (!seen[k] && !_deepEq(a[k], b[k])) return false; }
  return true;
}
function _idList(a) {
  if (!a.length) return false;
  for (var i = 0; i < a.length; i++) { if (!_isObj(a[i]) || a[i].id === undefined || a[i].id === null) return false; }
  return true;
}
function _allPrim(a) {
  for (var i = 0; i < a.length; i++) if (a[i] !== null && typeof a[i] === "object") return false;
  return true;
}
function _has(arr, x) { for (var i = 0; i < arr.length; i++) if (_deepEq(arr[i], x)) return true; return false; }

function _mArr(b, l, r, three) {
  if ((_idList(l) || !l.length) && (_idList(r) || !r.length) && (l.length || r.length) && _idList(l.length ? l : r)) {
    var bm = {}, rm = {}, seen = {}, out = [];
    b.forEach(function (x) { if (_isObj(x) && x.id !== undefined) bm[String(x.id)] = x; });
    r.forEach(function (x) { rm[String(x.id)] = x; });
    l.forEach(function (x) {
      var id = String(x.id), bi = bm[id], ri = rm[id];
      seen[id] = 1;
      if (ri !== undefined) out.push(three ? _m3(bi, x, ri) : _m2(x, ri));
      else if (bi !== undefined) { if (!_deepEq(x, bi)) out.push(x); }      /* حُذف في السحابة: نُبقيه فقط لو عدّلته */
      else out.push(x);                                                      /* أضفته أنا */
    });
    r.forEach(function (x) {
      var id = String(x.id); if (seen[id]) return;
      var bi = bm[id];
      if (bi !== undefined) { if (!_deepEq(x, bi)) out.push(x); }            /* حذفته أنا: نُبقيه فقط لو عُدّل هناك */
      else out.push(x);                                                      /* أُضيف في السحابة */
    });
    return out;
  }
  if (_allPrim(l) && _allPrim(r) && _allPrim(b)) {
    var res = l.filter(function (x) { return _has(r, x) || !(three && _has(b, x)); });
    r.forEach(function (x) { if (!_has(res, x) && !(three && _has(b, x))) res.push(x); });
    return res;
  }
  if (three) {
    if (_deepEq(l, b)) return r;
    if (_deepEq(r, b)) return l;
  }
  return _isEmptyV(l) ? r : l;                                                /* مصفوفة كائنات بلا id: تفوز نسخة الجهاز */
}
function _m3(b, l, r) {
  if (_deepEq(l, r)) return l === undefined ? r : l;
  if (_deepEq(l, b)) return r;
  if (_deepEq(r, b)) return l;
  if (_isObj(l) && _isObj(r)) {
    var bo = _isObj(b) ? b : {}, out = {}, keys = {}, k;
    for (k in l) keys[k] = 1; for (k in r) keys[k] = 1;
    for (k in keys) { var v = _m3(bo[k], l[k], r[k]); if (v !== undefined) out[k] = v; }
    return out;
  }
  if (Array.isArray(l) && Array.isArray(r)) return _mArr(Array.isArray(b) ? b : [], l, r, true);
  return _isEmptyV(l) ? r : l;
}
/* بدون أساس (أول مرة بعد التحديث): اتحاد بأولوية نسخة الجهاز، لا يُفقد شيء */
function _m2(l, r) {
  if (_deepEq(l, r)) return l === undefined ? r : l;
  if (_isEmptyV(l)) return r;
  if (_isEmptyV(r)) return l;
  if (_isObj(l) && _isObj(r)) {
    var out = {}, keys = {}, k;
    for (k in l) keys[k] = 1; for (k in r) keys[k] = 1;
    for (k in keys) { var v = _m2(l[k], r[k]); if (v !== undefined) out[k] = v; }
    return out;
  }
  if (Array.isArray(l) && Array.isArray(r)) return _mArr([], l, r, false);
  return l;
}
/* جهاز جديد/لم يُستعمل: لا درجات ولا غياب، وأسماؤه إما فارغة أو الأسماء التجريبية الافتراضية */
function _noAbsences(db) {
  var ab = (db && db.absences) || {}, none = true;
  Object.keys(ab).forEach(function (c) {
    var m = ab[c] || {};
    Object.keys(m).forEach(function (id) { if (!_isEmptyV(m[id])) none = false; });
  });
  return none;
}
function _isPristine(db) {
  try {
    var st = _statsOf(db);
    if (st.cells || !_noAbsences(db)) return false;
    if (typeof window.freshDB !== "function") return !st.students;
    var f = window.freshDB(), def = {};
    Object.keys(f.data || {}).forEach(function (c) { (f.data[c] || []).forEach(function (s) { if (s && s.name) def[s.name] = 1; }); });
    var ok = true;
    Object.keys(db.data || {}).forEach(function (c) {
      (db.data[c] || []).forEach(function (s) { if (s && String(s.name || "").trim() && !def[s.name]) ok = false; });
    });
    return ok;
  } catch (e) { return false; }
}
function _mergeDB(base, local, remote) {
  if (_isPristine(local)) return remote;                        /* جهاز جديد: خذ السحابة كاملة */
  return base ? _m3(base, local, remote) : _m2(local, remote);
}

/* الأساس: آخر نسخة متفق عليها (بدون الصور الكبيرة حتى لا يمتلئ التخزين) */
function _baseKey() { return "dalty_base_" + _fbStoreKey(); }
function _stripBig(db) {
  try { return JSON.parse(JSON.stringify(db, function (k, v) { return (typeof v === "string" && v.length > 20000) ? undefined : v; })); }
  catch (e) { return null; }
}
function _getBase() {
  try { return JSON.parse(localStorage.getItem(_baseKey())); } catch (e) { return null; }
}
function _setBase(db) {
  try {
    var js = JSON.stringify(_stripBig(db));
    if (js && js.length < 2500000) localStorage.setItem(_baseKey(), js);
    else localStorage.removeItem(_baseKey());
  } catch (e) { try { localStorage.removeItem(_baseKey()); } catch (e2) {} }
}

function listenForRemoteChanges() {
  _fbRef.on("value", function (snapshot) {
    var remote = snapshot.val();
    _firstSnapshotDone = true;

    /* السحابة فارغة ولدينا بيانات محلية: ارفعها */
    if (!remote) {
      _lastRemoteStats = { students: 0, cells: 0 };
      if (window.DB && window.DB.data && window.DB.classes) setTimeout(pushToFirebase, 1500);
      return;
    }

    /* تجاهل التحديثات التي أرسلناها نحن */
    if (remote._ts && remote._ts === _lastSaveTS) return;

    var clean = restoreKeys(Object.assign({}, remote));
    delete clean._ts;
    delete clean._device;

    /* نسخة سحابية تالفة/ناقصة جداً: لا نلمس بيانات الجهاز، ونرفع نسخة الجهاز السليمة */
    if (!clean || typeof clean !== "object" || !clean.data || !clean.classes) {
      console.warn("[Dalty Sync] ⚠️ تجاهل تحديث سحابي غير مكتمل");
      showSyncStatus("warn", "⚠️ تم تجاهل نسخة سحابية غير مكتملة");
      if (window.DB && window.DB.data && window.DB.classes) setTimeout(pushToFirebase, 1500);
      setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
      return;
    }
    clean = repairDB(clean);
    try { _lastRemoteStats = _statsOf(clean); } catch (e) { _lastRemoteStats = null; }

    if (window.DB === undefined || !window.DB) { window.DB = clean; return; }

    /* ✅ دمج ذكي: تعديلاتي المحلية + تعديلات السحابة، دون أن يضيع أي منهما */
    var local = window.DB, merged;
    try { merged = repairDB(_mergeDB(_getBase(), local, clean)); }
    catch (e) { console.error("[Dalty Sync] فشل الدمج — نُبقي بيانات الجهاز", e); merged = local; }

    var changesLocal = !_deepEq(merged, local);   /* السحابة أضافت/غيّرت شيئاً عندي */
    var needPush     = !_deepEq(merged, clean);   /* عندي ما ليس في السحابة */

    if (changesLocal) {
      _backupLocal("before-merge");
      try { localStorage.setItem(_fbStoreKey(), JSON.stringify(merged)); } catch (e) {}
      window.DB = merged;
      try { _rememberStored(); } catch (e) {}
      if (typeof window.renderGrades  === "function") window.renderGrades();
      if (typeof window.renderAbsence === "function") window.renderAbsence();
      if (typeof window.renderWeekly  === "function") window.renderWeekly();
      if (typeof window.renderSick    === "function") window.renderSick();
    }
    _setBase(clean);
    _setSynced(remote._ts || Date.now(), "");

    if (needPush) {
      _markDirty();
      showSyncStatus("syncing", "⏫ دمجنا تعديلاتك مع السحابة…");
      setTimeout(pushToFirebase, 500);
    } else {
      try { localStorage.removeItem(_dirtyKey()); } catch (e) {}
      showSyncStatus("ok", changesLocal ? "✅ تم التحديث من السحابة" : "☁️ متزامن");
      setTimeout(function () { if (!_getDirty()) showSyncStatus("ok", "☁️ متزامن"); }, 3000);
    }
  }, function (err) {
    console.error("[Dalty Sync] تعذّر قراءة السحابة", err);
    showSyncStatus("error", "❌ تعذّر قراءة السحابة: " + ((err && err.message) || ""));
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
        /* لو كتبت نسخة أخرى من التطبيق في التخزين منذ آخر مرة: ادمجها أولاً بدل أن نمسحها */
        try { _absorbForeign(); } catch (e) {}
        var _r = _origSave.apply(this, arguments);
        try { _rememberStored(); } catch (e) {}
        /* علّم أن هناك تعديلاً لم يُرفع بعد (يبقى حتى بعد إغلاق التطبيق)، ثم ارفع بعد مهلة قصيرة.
           الرفع نفسه يتجاهل الحالات التي لا تغيير فيها فعلاً. */
        try { _markDirty(); _refreshSaveBadge(); } catch (e) {}
        scheduleSyncToFirebase();
        return _r;
      };

      /* علامة تمنع الـ hook مرة ثانية */
      window.saveDB._fbHooked = true;

      try { _rememberStored(); _watchForeignWrites(); } catch (e) {}
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

  /* لا نكتب فوق السحابة قبل أن نرى ما فيها في هذه الجلسة (حتى ندمج بدل أن نستبدل) */
  if (!_firstSnapshotDone) {
    _pendingSave = true;
    showSyncStatus("warn", "⏳ بانتظار نسخة السحابة قبل الرفع");
    return;
  }
  if (_isSyncing) { _pendingSave = true; return; }

  /* لا تغيير فعلي عن آخر نسخة متفق عليها؟ لا داعي للرفع */
  var snap = JSON.parse(JSON.stringify(db));
  var base = _getBase();
  if (base && _deepEq(base, _stripBig(snap))) {
    try { localStorage.removeItem(_dirtyKey()); } catch (e) {}
    showSyncStatus("ok", "☁️ متزامن");
    return;
  }

  _isSyncing = true;
  showSyncStatus("syncing", "⏫ جاري التزامن...");

  var ts = Date.now();
  _lastSaveTS = ts;
  var dirtyAtPush = _getDirty();
  var _ls = _statsOf(snap);

  var payload = sanitizeKeys(snap);
  payload._ts     = ts;
  payload._device = getDeviceId();

  /* شبكة "واي فاي بدون إنترنت": الرفع يتأخر — أخبر المستخدم أن التعديل محفوظ بالجهاز */
  var slowT = setTimeout(function () {
    if (_isSyncing) showSyncStatus("warn", "📴 محفوظ بالجهاز — بانتظار الاتصال");
  }, 8000);

  _fbRef.set(payload)
    .then(function () {
      clearTimeout(slowT);
      _isSyncing = false;
      _pendingSave = false;
      _setSynced(ts, "");
      _setBase(JSON.parse(JSON.stringify(snap)));
      _lastRemoteStats = _ls;
      _clearDirtyIfNotNewer(dirtyAtPush);
      if (_getDirty()) { scheduleSyncToFirebase(); }   /* حدث تعديل أثناء الرفع */
      else { showSyncStatus("ok", "✅ تم الحفظ والمزامنة"); setTimeout(function () { if (!_getDirty()) showSyncStatus("ok", "☁️ متزامن"); }, 2500); }
      console.log("[Dalty Sync] ✅ تم الحفظ على Firebase");
    })
    .catch(function (err) {
      clearTimeout(slowT);
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
  if (_pendingSave || _getDirty()) {
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
    '<div id="fbPanelStatus" style="font-size:11px;color:#6ee7b7;margin-bottom:10px;">',
      _isOnline ? "🟢 متصل" : "🔴 غير متصل",
    '</div>',
    '<div style="font-size:11px;line-height:1.9;background:#0a1628;border-radius:8px;padding:8px 10px;margin-bottom:12px;color:#cbd5e1;">',
      '💾 آخر حفظ على الجهاز: <b>' + _hhmm(window._lastLocalSaveAt) + '</b><br>',
      (window._lastSaveOk === false ? '<span style="color:#fca5a5;">⚠️ فشل آخر حفظ على الجهاز!</span><br>' : ''),
      '☁️ آخر رفع للسحابة: <b>' + _hhmm((_getSynced() || {}).at) + '</b><br>',
      '🔢 درجات على الجهاز: <b>' + _statsOf(window.DB).cells + '</b>' + (_lastRemoteStats ? ' — في السحابة: <b>' + _lastRemoteStats.cells + '</b>' : '') + '<br>',
      (_getBackup() ? '<button onclick="restoreLocalBackup();document.getElementById(\'fbSyncPanel\')&&document.getElementById(\'fbSyncPanel\').remove();" style="margin:4px 0;padding:6px 10px;border-radius:8px;border:1px solid #d97706;background:rgba(251,191,36,.12);color:#fcd34d;font-family:inherit;font-size:11px;cursor:pointer;">↩ استرجاع نسخة الجهاز الاحتياطية (' + _getBackup().stats.cells + ' درجة)</button><br>' : ''),
      (_getDirty()
        ? '<span style="color:#fcd34d;">⏳ توجد تعديلات لم تُرفع بعد (محفوظة على جهازك)</span>'
        : '<span style="color:#6ee7b7;">✅ كل التعديلات مرفوعة</span>'),
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

      if (!clean || typeof clean !== "object" || !clean.data || !clean.classes) {
        alert("⚠️ النسخة الموجودة في السحابة تالفة أو غير مكتملة — تم إلغاء الجلب حفاظاً على بياناتك المحلية.");
        showSyncStatus("warn", "⚠️ نسخة سحابية تالفة — تم الإلغاء");
        return;
      }

      clean = repairDB(clean);

      if (!confirm("⚠️ سيتم استبدال بياناتك الحالية ببيانات السحابة. متأكد؟")) return;

      try { localStorage.setItem(_fbStoreKey(), JSON.stringify(clean)); } catch (e) {}
      try { localStorage.removeItem(_dirtyKey()); } catch (e) {}
      try { window.DB = clean; _rememberStored(); } catch (e) {}
      _setSynced(remote._ts || Date.now(), _sigOf(clean));
      window.DB = clean;

      if (typeof window.renderGrades  === "function") window.renderGrades();
      if (typeof window.renderAbsence === "function") window.renderAbsence();
      if (typeof window.renderWeekly  === "function") window.renderWeekly();
      if (typeof window.renderSick    === "function") window.renderSick();

      showSyncStatus("ok", "✅ تم الجلب");
      setTimeout(function () { showSyncStatus("ok", "☁️ متزامن"); }, 3000);
    })
    .catch(function (err) {
      showSyncStatus("error", "❌ " + err.message);
    });
}
