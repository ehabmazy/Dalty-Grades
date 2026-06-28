(function(){
// ══════════════════════════════════════════════════════
// BACKUP SYSTEM v2 — نسخ احتياطي + مزامنة مجلد
// ══════════════════════════════════════════════════════
var BKP_KEY      = 'grades_v6_backups';
var BKP_FOLDER   = 'grades_v6_folder_handle'; // اسم المفتاح للإشارة فقط
var BKP_MAX      = 20;
var _bkpLastSnap = 0;
var _bkpLastSync = 0;
var _folderHandle= null; // FileSystemDirectoryHandle

// ── تهيئة: استعادة مقبض المجلد من IndexedDB ──────────
var _IDB_NAME = 'bkp_idb', _IDB_STORE = 'handles';
function _idbOpen(cb){
  var req = indexedDB.open(_IDB_NAME, 1);
  req.onupgradeneeded = function(e){ e.target.result.createObjectStore(_IDB_STORE); };
  req.onsuccess = function(e){ cb(null, e.target.result); };
  req.onerror   = function(e){ cb(e); };
}
function _idbGet(key, cb){
  _idbOpen(function(err, db){
    if(err) return cb(null);
    var tx = db.transaction(_IDB_STORE,'readonly');
    var req = tx.objectStore(_IDB_STORE).get(key);
    req.onsuccess = function(){ cb(req.result||null); };
    req.onerror   = function(){ cb(null); };
  });
}
function _idbSet(key, val){
  _idbOpen(function(err, db){
    if(err) return;
    var tx = db.transaction(_IDB_STORE,'readwrite');
    tx.objectStore(_IDB_STORE).put(val, key);
  });
}
function _idbDel(key){
  _idbOpen(function(err, db){
    if(err) return;
    var tx = db.transaction(_IDB_STORE,'readwrite');
    tx.objectStore(_IDB_STORE).delete(key);
  });
}

// ── تحميل مقبض المجلد المحفوظ ─────────────────────────
function _bkpLoadFolderHandle(cb){
  _idbGet('folderHandle', function(handle){
    if(handle && typeof handle.queryPermission === 'function'){
      _folderHandle = handle;
    }
    cb();
  });
}

// ── قائمة النسخ (localStorage) ───────────────────────
function bkpLoad(){
  try{ var s=localStorage.getItem(BKP_KEY); return s?JSON.parse(s):[]; }catch(e){ return []; }
}
function _bkpSaveList(list){
  try{ localStorage.setItem(BKP_KEY, JSON.stringify(list)); }catch(e){}
}

// ── عد الطلاب ────────────────────────────────────────
function _bkpCountStudents(){
  if(!window.DB||!window.DB.data) return 0;
  var t=0;
  (window.DB.classes||[]).forEach(function(c){ t+=(window.DB.data[c]||[]).filter(function(s){return s.name;}).length; });
  return t;
}

// ── إنشاء نسخة ───────────────────────────────────────
function _bkpCreate(label){
  if(!window.DB) return;
  var list = bkpLoad();
  var snap = {
    id: Date.now(), label: label||'يدوي',
    time: new Date().toLocaleString('ar-EG'),
    timestamp: Date.now(),
    classes: (window.DB.classes||[]).length,
    students: _bkpCountStudents(),
    data: JSON.stringify(window.DB)
  };
  list.unshift(snap);
  if(list.length > BKP_MAX) list = list.slice(0, BKP_MAX);
  _bkpSaveList(list);
}

// ── Auto snapshot (throttled 60s) ────────────────────
function _bkpAutoSnapshot(){
  var now = Date.now();
  if(now - _bkpLastSnap < 60000) return;
  _bkpLastSnap = now;
  _bkpCreate('تلقائي');
  _bkpAutoFolderSync();
}

// ══════════════════════════════════════════════════════
// FILE SYSTEM ACCESS API — مزامنة المجلد
// ══════════════════════════════════════════════════════
function _fsaSupported(){
  return typeof window.showDirectoryPicker === 'function';
}

// ── اختيار مجلد ──────────────────────────────────────
async function __bkpPickFolder(){
  if(!_fsaSupported()){
    alert('متصفحك لا يدعم هذه الميزة.\nاستخدم Chrome أو Edge.');
    return;
  }
  try{
    var handle = await window.showDirectoryPicker({ mode:'readwrite', id:'school-backup', startIn:'documents' });
    _folderHandle = handle;
    _idbSet('folderHandle', handle);
    showSnack('✅ تم تحديد المجلد: ' + handle.name);
    await _bkpWriteToFolder();
    __renderBackupPage();
  }catch(e){
    if(e.name !== 'AbortError') showSnack('❌ خطأ: ' + e.message);
  }
}

// ── طلب إذن المجلد عند الحاجة ────────────────────────
async function _bkpRequestPermission(){
  if(!_folderHandle) return false;
  try{
    var perm = await _folderHandle.queryPermission({mode:'readwrite'});
    if(perm === 'granted') return true;
    perm = await _folderHandle.requestPermission({mode:'readwrite'});
    return perm === 'granted';
  }catch(e){ return false; }
}

// ── الكتابة للمجلد ───────────────────────────────────
async function _bkpWriteToFolder(){
  if(!_folderHandle || !window.DB) return false;
  var ok = await _bkpRequestPermission();
  if(!ok){ showSnack('⚠️ لم يُمنح إذن الكتابة للمجلد'); return false; }
  try{
    // ملف واحد ثابت الاسم يُستبدل في كل مزامنة
    var mainFile = await _folderHandle.getFileHandle('نسخة_احتياطية.json', {create:true});
    var w1 = await mainFile.createWritable();
    await w1.write(JSON.stringify(window.DB, null, 2));
    await w1.close();
    _bkpLastSync = Date.now();
    return true;
  }catch(e){
    showSnack('❌ خطأ في الكتابة: ' + e.message);
    return false;
  }
}

// ── مزامنة تلقائية (throttled 5 دقائق) ──────────────
function _bkpAutoFolderSync(){
  if(!_folderHandle) return;
  var now = Date.now();
  if(now - _bkpLastSync < 300000) return; // 5 دقائق
  _bkpWriteToFolder().then(function(ok){
    if(ok && document.getElementById('bkpSyncStatus'))
      __renderBackupPage();
  });
}

// ── مزامنة يدوية ─────────────────────────────────────
async function __bkpSyncNow(){
  if(!_folderHandle){ showSnack('⚠️ لم يتم تحديد مجلد بعد'); return; }
  var ok = await _bkpWriteToFolder();
  if(ok){ showSnack('✅ تمت المزامنة بنجاح'); __renderBackupPage(); }
}

// ── إلغاء ربط المجلد ─────────────────────────────────
function __bkpClearFolder(){
  if(!confirm('هل تريد إلغاء ربط المجلد؟')) return;
  _folderHandle = null;
  _idbDel('folderHandle');
  showSnack('✅ تم إلغاء ربط المجلد');
  __renderBackupPage();
}

// ══════════════════════════════════════════════════════
// باقي دوال النسخ
// ══════════════════════════════════════════════════════
function __bkpCreateManual(){
  if(!window.DB){ showSnack('⚠️ لا توجد بيانات'); return; }
  var lbl = document.getElementById('bkpLabelInput');
  var label = (lbl&&lbl.value.trim()) ? lbl.value.trim() : 'يدوي — '+new Date().toLocaleString('ar-EG');
  _bkpCreate(label);
  if(lbl) lbl.value='';
  showSnack('✅ تم حفظ النسخة');
  __renderBackupPage();
}

function __bkpRestore(id){
  var list = bkpLoad();
  var snap = list.find(function(s){return s.id===id;});
  if(!snap){ showSnack('⚠️ النسخة غير موجودة'); return; }
  if(!confirm('⚠️ استعادة هذه النسخة؟\nسيتم استبدال جميع البيانات الحالية!\n\n'+snap.label+' — '+snap.time)) return;
  try{
    _bkpCreate('قبل الاستعادة — احتياطي');
    window.DB = JSON.parse(snap.data);
    if(typeof saveDB==='function') saveDB();
    showSnack('✅ تم الاستعادة بنجاح');
    __renderBackupPage();
  }catch(e){ showSnack('❌ خطأ: '+e.message); }
}

function __bkpDelete(id){
  var list = bkpLoad().filter(function(s){return s.id!==id;});
  _bkpSaveList(list);
  showSnack('✅ تم الحذف');
  __renderBackupPage();
}

function __bkpClearAll(){
  if(!confirm('حذف جميع النسخ؟')) return;
  _bkpSaveList([]);
  showSnack('✅ تم حذف الكل');
  __renderBackupPage();
}

function __bkpExportJSON(){
  if(!window.DB){ showSnack('⚠️ لا توجد بيانات'); return; }
  var blob = new Blob([JSON.stringify(window.DB,null,2)],{type:'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'نسخة_احتياطية_'+new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')+'.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showSnack('✅ تم التحميل');
}

function __bkpExportSnapshot(id){
  var snap = bkpLoad().find(function(s){return s.id===id;});
  if(!snap){ showSnack('⚠️ غير موجودة'); return; }
  var blob = new Blob([snap.data],{type:'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'نسخة_'+snap.label.replace(/[^أ-يa-z0-9]/gi,'_')+'.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showSnack('✅ تم التحميل');
}

function __bkpImportJSON(){
  var input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0]; if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var imp=JSON.parse(ev.target.result);
        if(!imp.classes||!imp.data){ showSnack('❌ ملف غير صالح'); return; }
        if(!confirm('استيراد هذا الملف؟\nالفصول: '+(imp.classes||[]).join('، ')+'\n\n⚠️ سيتم استبدال البيانات الحالية!')) return;
        _bkpCreate('قبل الاستيراد — احتياطي');
        window.DB=imp;
        if(typeof saveDB==='function') saveDB();
        showSnack('✅ تم الاستيراد');
        __renderBackupPage();
      }catch(err){ showSnack('❌ خطأ: '+err.message); }
    };
    reader.readAsText(file,'UTF-8');
  };
  document.body.appendChild(input); input.click(); document.body.removeChild(input);
}

// ── صفحة النسخ الاحتياطي ──────────────────────────────
function __renderBackupPage(){
  var root=document.getElementById('backupRoot');
  if(!root) return;

  var list=bkpLoad();
  var totalSize=0, bkpSize=0;
  try{ var s=localStorage.getItem(window.STORE_KEY||'grades_v6'); if(s) totalSize=Math.round(s.length/1024); }catch(e){}
  try{ var bs=localStorage.getItem(BKP_KEY); if(bs) bkpSize=Math.round(bs.length/1024); }catch(e){}

  var fsaOk = _fsaSupported();
  var hasFolderStr = _folderHandle ? _folderHandle.name : null;
  var lastSyncStr  = _bkpLastSync ? new Date(_bkpLastSync).toLocaleString('ar-EG') : 'لم تتم بعد';

  var html='<div style="padding:14px 14px 40px;direction:rtl;font-family:\'Cairo\',sans-serif;">';

  // ── Header ──
  html+='<div style="background:linear-gradient(135deg,#0a1628,#1e3a5f);border-radius:14px;padding:16px 18px;margin-bottom:12px;border:1px solid #1d4ed8;">';
  html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
  html+='<span style="font-size:32px;">💾</span>';
  html+='<div><div style="font-size:15px;font-weight:900;color:#f1f5f9;">النسخ الاحتياطي والمزامنة</div>';
  html+='<div style="font-size:9.5px;color:#64748b;margin-top:2px;">حماية بياناتك · مزامنة تلقائية مع مجلد على جهازك</div></div>';
  html+='</div>';
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  html+=_bkpBadge('📊',_bkpCountStudents()+' طالب','#60a5fa');
  html+=_bkpBadge('🗂️',(window.DB&&window.DB.classes?window.DB.classes.length:0)+' فصل','#34d399');
  html+=_bkpBadge('💽',totalSize+' كيلوبايت','#fbbf24');
  html+=_bkpBadge('📦',list.length+'/'+BKP_MAX+' نسخة','#c4b5fd');
  html+='</div></div>';

  // ══ مزامنة المجلد ══
  html+='<div style="background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid '+(hasFolderStr?'#10b981':'#334155')+';position:relative;">';
  html+='<div style="font-size:12px;font-weight:900;color:#f1f5f9;margin-bottom:10px;display:flex;align-items:center;gap:7px;">';
  html+='<span style="font-size:18px;">📁</span> مزامنة مع مجلد على الجهاز';
  if(hasFolderStr) html+='<span style="background:#10b981;color:white;font-size:8px;padding:2px 8px;border-radius:8px;font-weight:700;">مفعّل</span>';
  html+='</div>';

  if(!fsaOk){
    html+='<div style="background:#450a0a;border:1px solid #ef4444;border-radius:8px;padding:10px 12px;font-size:10px;color:#fca5a5;">❌ متصفحك لا يدعم هذه الميزة — استخدم Chrome أو Edge</div>';
  } else if(hasFolderStr){
    // المجلد مرتبط
    html+='<div style="background:#0d2a1a;border:1px solid #10b981;border-radius:8px;padding:10px 14px;margin-bottom:10px;">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">';
    html+='<span style="font-size:20px;">📂</span>';
    html+='<div><div style="font-size:11px;font-weight:700;color:#6ee7b7;">'+_esc(hasFolderStr)+'</div>';
    html+='<div style="font-size:9px;color:#64748b;">آخر مزامنة: '+lastSyncStr+'</div></div>';
    html+='</div>';
    html+='<div style="font-size:9px;color:#94a3b8;line-height:1.7;">';
    html+='✅ الملفات المحفوظة في المجلد:<br>';
    html+='• <strong style="color:#6ee7b7;">نسخة_احتياطية.json</strong> — يُحدَّث تلقائياً كل 5 دقائق (يُستبدل الملف في كل مزامنة)';
    html+='</div></div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html+='<button onclick="bkpSyncNow()" style="background:linear-gradient(135deg,#065f46,#10b981);border:none;color:white;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;">🔄 مزامنة الآن</button>';
    html+='<button onclick="bkpPickFolder()" style="background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:10.5px;font-weight:700;font-family:\'Cairo\',sans-serif;">📁 تغيير المجلد</button>';
    html+='<button onclick="bkpClearFolder()" style="background:#1a0a0a;border:1px solid #7f1d1d;color:#fca5a5;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:10px;font-family:\'Cairo\',sans-serif;">✕ إلغاء الربط</button>';
    html+='</div>';
    // نصيحة Google Drive
    html+='<div style="margin-top:10px;background:#0f1a2e;border:1px dashed #2d4a6e;border-radius:7px;padding:8px 12px;font-size:9px;color:#64748b;line-height:1.7;">';
    html+='💡 <strong style="color:#93c5fd;">نصيحة:</strong> اختر مجلداً داخل Google Drive أو OneDrive على جهازك وسيتزامن تلقائياً مع السحابة!';
    html+='</div>';
  } else {
    // لم يُحدد مجلد
    html+='<div style="margin-bottom:12px;">';
    html+='<div style="font-size:10px;color:#94a3b8;line-height:1.8;margin-bottom:10px;">';
    html+='اختر مجلداً على جهازك لحفظ النسخ الاحتياطية تلقائياً.<br>';
    html+='<strong style="color:#fbbf24;">💡 اختر مجلداً داخل Google Drive أو OneDrive</strong> لمزامنة تلقائية مع السحابة!';
    html+='</div>';
    html+='<button onclick="bkpPickFolder()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:10px 24px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;font-family:\'Cairo\',sans-serif;width:100%;">📁 اختر مجلد المزامنة</button>';
    html+='</div>';
    html+='<div style="background:#0f1a2e;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;">';
    html+='<div style="font-size:10px;font-weight:700;color:#60a5fa;margin-bottom:6px;">📋 كيف يعمل؟</div>';
    html+='<div style="font-size:9.5px;color:#64748b;line-height:1.9;">';
    html+='١. اضغط "اختر مجلد المزامنة"<br>';
    html+='٢. اختر أي مجلد على جهازك (أو داخل Google Drive)<br>';
    html+='٣. اقبل طلب الإذن من المتصفح<br>';
    html+='٤. سيتم الحفظ تلقائياً كل 5 دقائق بدون أي إجراء منك';
    html+='</div></div>';
  }
  html+='</div>';

  // ══ النسخ اليدوية والتصدير ══
  html+='<div style="background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid #334155;">';
  html+='<div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:10px;">⚡ نسخ يدوي وتصدير</div>';
  html+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">';
  html+='<input id="bkpLabelInput" type="text" placeholder="اسم النسخة (اختياري)..." style="background:#0f172a;border:1.5px solid #334155;color:#f1f5f9;border-radius:8px;padding:7px 12px;font-size:11px;outline:none;font-family:\'Cairo\',sans-serif;flex:1;min-width:140px;"/>';
  html+='<button onclick="bkpCreateManual()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;white-space:nowrap;">💾 حفظ نسخة</button>';
  html+='</div>';
  html+='<div style="display:flex;gap:7px;flex-wrap:wrap;">';
  html+='<button onclick="bkpExportJSON()" style="background:#065f46;border:1px solid #10b981;color:#6ee7b7;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;font-family:\'Cairo\',sans-serif;">⬇️ تصدير JSON</button>';
  html+='<button onclick="bkpImportJSON()" style="background:#4c1d95;border:1px solid #8b5cf6;color:#c4b5fd;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;font-family:\'Cairo\',sans-serif;">⬆️ استيراد ملف</button>';
  if(list.length>0) html+='<button onclick="bkpClearAll()" style="background:#450a0a;border:1px solid #ef4444;color:#fca5a5;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:10px;font-family:\'Cairo\',sans-serif;">🗑️ حذف الكل</button>';
  html+='</div></div>';

  // ══ قائمة النسخ ══
  html+='<div style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">';
  html+='<div style="padding:11px 14px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between;">';
  html+='<div style="font-size:11px;font-weight:700;color:#e2e8f0;">📋 النسخ المحفوظة ('+list.length+')</div>';
  html+='<div style="font-size:9px;color:#475569;">أحدث '+BKP_MAX+' نسخة</div>';
  html+='</div>';

  if(!list.length){
    html+='<div style="text-align:center;padding:30px;color:#475569;"><div style="font-size:28px;margin-bottom:6px;">📭</div><div style="font-size:11px;">لا توجد نسخ بعد</div></div>';
  } else {
    list.forEach(function(snap,i){
      var isAuto = snap.label==='تلقائي';
      var kb = Math.round(snap.data.length/1024);
      html+='<div style="padding:10px 14px;border-bottom:1px solid #0f172a;display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-right:3px solid '+(isAuto?'#1e3a5f':'#1d4ed8')+';">';
      html+='<div style="flex:1;min-width:160px;">';
      html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">';
      html+='<span>'+(isAuto?'🔄':'💾')+'</span>';
      html+='<span style="font-size:11px;font-weight:700;color:'+(isAuto?'#64748b':'#60a5fa')+';">'+_esc(snap.label)+'</span>';
      if(i===0) html+='<span style="background:#10b981;color:white;font-size:7.5px;padding:1px 6px;border-radius:7px;">الأحدث</span>';
      html+='</div>';
      html+='<div style="font-size:9px;color:#475569;">'+_esc(snap.time)+' · '+snap.students+' طالب · '+kb+' كيلوبايت</div>';
      html+='</div>';
      html+='<div style="display:flex;gap:5px;">';
      html+='<button onclick="bkpRestore('+snap.id+')" style="background:#0f2a5e;border:1px solid #1d4ed8;color:#93c5fd;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:9.5px;font-weight:700;font-family:\'Cairo\',sans-serif;">↩ استعادة</button>';
      html+='<button onclick="bkpExportSnapshot('+snap.id+')" style="background:#065f46;border:1px solid #10b981;color:#6ee7b7;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:9.5px;font-family:\'Cairo\',sans-serif;">⬇️</button>';
      html+='<button onclick="bkpDelete('+snap.id+')" style="background:#450a0a;border:1px solid #ef4444;color:#fca5a5;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:9.5px;font-family:\'Cairo\',sans-serif;">✕</button>';
      html+='</div></div>';
    });
  }
  html+='</div>';
  html+='</div>';
  root.innerHTML=html;
}

function _bkpBadge(icon,text,color){
  return '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:5px 10px;display:flex;align-items:center;gap:5px;">'
    +'<span>'+icon+'</span><span style="font-size:9.5px;font-weight:700;color:'+color+';">'+text+'</span></div>';
}
function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ══════════════════════════════════════════════════════
// تهيئة: ربط كل الدوال بـ window + استعادة المجلد
// ══════════════════════════════════════════════════════
window.bkpCreateManual   = __bkpCreateManual;
window.bkpRestore        = __bkpRestore;
window.bkpDelete         = __bkpDelete;
window.bkpClearAll       = __bkpClearAll;
window.bkpExportJSON     = __bkpExportJSON;
window.bkpExportSnapshot = __bkpExportSnapshot;
window.bkpImportJSON     = __bkpImportJSON;
window.bkpPickFolder     = __bkpPickFolder;
window.bkpSyncNow        = __bkpSyncNow;
window.bkpClearFolder    = __bkpClearFolder;
window.renderBackupPage  = __renderBackupPage;

// ── استعادة مقبض المجلد عند التحميل ─────────────────
_bkpLoadFolderHandle(function(){
  // override saveDB لإضافة auto-snapshot + auto-sync
  var _orig = window.saveDB;
  window.saveDB = function(){
    if(typeof _orig==='function') _orig();
    _bkpAutoSnapshot();
  };
  // أول نسخة عند الفتح
  setTimeout(function(){
    if(window.DB) _bkpCreate('عند فتح التطبيق');
  }, 1500);
});

})(); // end IIFE

// ══════════════════════════════════════════════════════
// ██╗    ██╗██╗████████╗███╗   ██╗███████╗███████╗███████╗
// ██║    ██║██║╚══██╔══╝████╗  ██║██╔════╝██╔════╝██╔════╝
// ██║ █╗ ██║██║   ██║   ██╔██╗ ██║█████╗  ███████╗███████╗
// ██║███╗██║██║   ██║   ██║╚██╗██║██╔══╝  ╚════██║╚════██║
// ╚███╔███╔╝██║   ██║   ██║ ╚████║███████╗███████║███████║
// SECTION: توقيع المتابع — WITNESS SIGNATURE PAGE
// ══════════════════════════════════════════════════════

/* ── Inject CSS ── */
(function(){
  var s=document.createElement('style');
  s.textContent='\
  #witnessRoot{font-family:\'Cairo\',sans-serif;direction:rtl;background:#0b1420;min-height:100%;color:#e2e8f0;}\
\
  /* ── HERO HEADER ── */\
  .wt-hero{\
    background:linear-gradient(160deg,#071428 0%,#0f2a5e 45%,#1a1a2e 100%);\
    padding:22px 18px 18px;\
    text-align:center;\
    position:relative;\
    overflow:hidden;\
    border-bottom:2px solid rgba(59,130,246,.25);\
  }\
  .wt-hero::before{\
    content:\'\';position:absolute;inset:0;\
    background:\
      radial-gradient(ellipse 80% 60% at 50% 0%,rgba(29,78,216,.25) 0%,transparent 70%),\
      radial-gradient(circle at 10% 80%,rgba(217,119,6,.08) 0%,transparent 50%);\
  }\
  .wt-hero-seal{\
    width:64px;height:64px;border-radius:50%;\
    background:linear-gradient(135deg,#1d4ed8,#0f2a5e);\
    border:3px solid rgba(255,255,255,.15);\
    display:flex;align-items:center;justify-content:center;\
    font-size:28px;margin:0 auto 10px;\
    box-shadow:0 8px 30px rgba(29,78,216,.5);\
    position:relative;z-index:1;\
  }\
  .wt-hero-title{font-size:17px;font-weight:900;color:#fff;margin-bottom:3px;position:relative;z-index:1;}\
  .wt-hero-sub{font-size:10.5px;color:#64748b;position:relative;z-index:1;}\
  .wt-hero-meta{\
    display:flex;gap:6px;justify-content:center;flex-wrap:wrap;\
    margin-top:12px;position:relative;z-index:1;\
  }\
  .wt-meta-chip{\
    background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);\
    border-radius:20px;padding:3px 12px;font-size:10px;color:#94a3b8;\
  }\
  .wt-meta-chip strong{color:#cbd5e1;}\
\
  /* ── BODY ── */\
  .wt-body{padding:14px;max-width:520px;margin:0 auto;}\
\
  /* ── CARD ── */\
  .wt-card{\
    background:#111f38;border:1px solid rgba(255,255,255,.08);\
    border-radius:14px;padding:16px;margin-bottom:14px;\
    box-shadow:0 4px 20px rgba(0,0,0,.4);\
  }\
  .wt-card-hdr{\
    display:flex;align-items:center;gap:8px;\
    margin-bottom:14px;padding-bottom:10px;\
    border-bottom:1px solid rgba(255,255,255,.07);\
  }\
  .wt-card-icon{\
    width:34px;height:34px;border-radius:9px;\
    display:flex;align-items:center;justify-content:center;\
    font-size:16px;flex-shrink:0;\
  }\
  .wt-card-title{font-size:12px;font-weight:900;color:#e2e8f0;}\
  .wt-card-sub{font-size:10px;color:#475569;margin-top:1px;}\
\
  /* ── CLASS SELECTOR ── */\
  .wt-cls-grid{display:flex;flex-wrap:wrap;gap:7px;}\
  .wt-cls-btn{\
    background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);\
    color:#94a3b8;border-radius:9px;padding:7px 14px;\
    font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;\
    cursor:pointer;transition:all .18s;\
  }\
  .wt-cls-btn:hover{background:rgba(59,130,246,.15);border-color:#3b82f6;color:#93c5fd;}\
  .wt-cls-btn.active{\
    background:linear-gradient(135deg,rgba(29,78,216,.4),rgba(59,130,246,.25));\
    border-color:#3b82f6;color:#93c5fd;\
    box-shadow:0 4px 14px rgba(29,78,216,.3);\
  }\
\
  /* ── GRADE SUMMARY TABLE ── */\
  .wt-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}\
  .wt-sum-cell{\
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);\
    border-radius:10px;padding:10px 6px;text-align:center;\
  }\
  .wt-sum-val{font-size:20px;font-weight:900;line-height:1;}\
  .wt-sum-lbl{font-size:8.5px;color:#475569;margin-top:4px;}\
  .wt-sum-max{font-size:8px;color:#334155;}\
\
  /* ── STUDENT TABLE ── */\
  .wt-tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid rgba(255,255,255,.08);}\
  .wt-tbl{border-collapse:collapse;width:100%;font-size:10.5px;}\
  .wt-tbl th{\
    background:#0a1e45;color:#93c5fd;\
    padding:7px 6px;text-align:center;\
    border-bottom:2px solid rgba(59,130,246,.3);\
    white-space:nowrap;font-size:9.5px;\
  }\
  .wt-tbl td{\
    border-bottom:1px solid rgba(255,255,255,.05);\
    padding:6px 5px;text-align:center;color:#cbd5e1;vertical-align:middle;\
  }\
  .wt-tbl tr:last-child td{border-bottom:none;}\
  .wt-tbl tr:hover td{background:rgba(59,130,246,.06);}\
  .wt-tbl .td-name{text-align:right;font-weight:700;color:#e2e8f0;min-width:130px;padding-right:10px;}\
  .wt-grade-chip{\
    display:inline-block;padding:2px 8px;border-radius:10px;\
    font-weight:800;font-size:10px;\
  }\
\
  /* ── INPUT ── */\
  .wt-input{\
    width:100%;background:rgba(255,255,255,.06);\
    border:1.5px solid rgba(255,255,255,.12);\
    color:#f1f5f9;padding:11px 14px;border-radius:10px;\
    font-size:13px;font-family:\'Cairo\',sans-serif;outline:none;\
    transition:border-color .2s;\
  }\
  .wt-input:focus{border-color:#3b82f6;background:rgba(59,130,246,.08);}\
  .wt-input::placeholder{color:#334155;}\
\
  /* ── SIGNATURE CANVAS ── */\
  .wt-sig-box{\
    background:#fff;border-radius:12px;overflow:hidden;\
    position:relative;\
    border:2px dashed rgba(59,130,246,.4);\
    box-shadow:inset 0 2px 12px rgba(0,0,0,.06);\
  }\
  .wt-sig-canvas{display:block;width:100%;cursor:crosshair;}\
  .wt-sig-ghost{\
    position:absolute;inset:0;display:flex;flex-direction:column;\
    align-items:center;justify-content:center;\
    pointer-events:none;transition:opacity .3s;\
  }\
  .wt-sig-ghost-icon{font-size:32px;opacity:.2;margin-bottom:6px;}\
  .wt-sig-ghost-text{font-size:11px;color:#94a3b8;font-weight:700;}\
  /* Three-line guide */\
  .wt-sig-box::after{\
    content:\'\';position:absolute;bottom:35%;left:8%;right:8%;\
    border-bottom:1px dashed rgba(0,0,0,.08);pointer-events:none;\
  }\
\
  /* ── BUTTONS ── */\
  .wt-btn{\
    border:none;border-radius:10px;padding:12px 18px;\
    font-size:13px;font-weight:900;font-family:\'Cairo\',sans-serif;\
    cursor:pointer;display:flex;align-items:center;justify-content:center;\
    gap:8px;transition:all .2s;width:100%;\
  }\
  .wt-btn-primary{\
    background:linear-gradient(135deg,#1d4ed8,#2563eb);\
    color:white;box-shadow:0 4px 18px rgba(29,78,216,.4);\
  }\
  .wt-btn-primary:hover{box-shadow:0 6px 24px rgba(29,78,216,.55);transform:translateY(-1px);}\
  .wt-btn-primary:disabled{background:#1e3a5f;color:#334155;box-shadow:none;transform:none;cursor:not-allowed;}\
  .wt-btn-ghost{background:rgba(255,255,255,.06);color:#94a3b8;border:1.5px solid rgba(255,255,255,.1);}\
  .wt-btn-ghost:hover{background:rgba(255,255,255,.1);color:#e2e8f0;}\
  .wt-btn-danger{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.25);}\
  .wt-btn-sm{padding:6px 14px;font-size:11px;width:auto;}\
  .wt-btn-gold{\
    background:linear-gradient(135deg,#92400e,#b45309,#d97706);\
    color:#fef3c7;box-shadow:0 4px 18px rgba(217,119,6,.35);\
  }\
  .wt-btn-gold:hover{box-shadow:0 6px 24px rgba(217,119,6,.5);transform:translateY(-1px);}\
\
  /* ── STEP BAR ── */\
  .wt-steps{\
    display:flex;align-items:center;justify-content:center;\
    gap:0;padding:12px 0 4px;\
  }\
  .wt-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;}\
  .wt-step-dot{\
    width:32px;height:32px;border-radius:50%;\
    display:flex;align-items:center;justify-content:center;\
    font-size:12px;font-weight:900;\
    border:2px solid rgba(255,255,255,.1);\
    background:rgba(255,255,255,.04);color:#334155;\
    transition:all .3s;\
  }\
  .wt-step-dot.active{\
    background:linear-gradient(135deg,#1d4ed8,#3b82f6);\
    border-color:#3b82f6;color:white;\
    box-shadow:0 4px 14px rgba(29,78,216,.5);\
  }\
  .wt-step-dot.done{background:linear-gradient(135deg,#059669,#10b981);border-color:#10b981;color:white;}\
  .wt-step-line{flex:1;height:2px;background:rgba(255,255,255,.08);transition:background .3s;}\
  .wt-step-line.done{background:#10b981;}\
  .wt-step-lbl{font-size:9px;color:#334155;font-weight:700;white-space:nowrap;}\
  .wt-step-lbl.active{color:#60a5fa;}\
  .wt-step-lbl.done{color:#34d399;}\
\
  /* ── RECEIPT ── */\
  .wt-receipt{\
    background:linear-gradient(160deg,#071428 0%,#0e2040 100%);\
    border:2px solid rgba(59,130,246,.3);\
    border-radius:16px;padding:22px 18px;\
    position:relative;overflow:hidden;\
  }\
  .wt-receipt::before{\
    content:\'\';position:absolute;top:-30px;right:-30px;\
    width:120px;height:120px;\
    background:radial-gradient(circle,rgba(29,78,216,.2) 0%,transparent 70%);\
    border-radius:50%;\
  }\
  .wt-receipt-seal{\
    width:70px;height:70px;border-radius:50%;\
    background:linear-gradient(135deg,#059669,#10b981);\
    display:flex;align-items:center;justify-content:center;\
    font-size:30px;margin:0 auto 14px;\
    box-shadow:0 6px 24px rgba(5,150,105,.4);\
    position:relative;z-index:1;\
  }\
  .wt-receipt-title{font-size:18px;font-weight:900;color:#34d399;text-align:center;margin-bottom:4px;position:relative;z-index:1;}\
  .wt-receipt-sub{font-size:11px;color:#475569;text-align:center;margin-bottom:18px;line-height:1.7;position:relative;z-index:1;}\
  .wt-receipt-table{\
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);\
    border-radius:10px;overflow:hidden;margin-bottom:16px;\
  }\
  .wt-receipt-row{\
    display:flex;justify-content:space-between;align-items:center;\
    padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.05);\
    font-size:11.5px;\
  }\
  .wt-receipt-row:last-child{border-bottom:none;}\
  .wt-rk{color:#475569;font-weight:700;}\
  .wt-rv{color:#e2e8f0;font-weight:900;}\
  .wt-sig-preview{\
    background:white;border-radius:10px;overflow:hidden;\
    border:2px solid rgba(255,255,255,.1);\
  }\
  .wt-sig-preview img{width:100%;display:block;}\
  .wt-sig-label{\
    background:#0a1628;font-size:9px;color:#475569;\
    text-align:center;padding:4px;font-weight:700;\
    border-top:1px solid rgba(255,255,255,.07);\
  }\
\
  /* ── HISTORY LIST ── */\
  .wt-hist-item{\
    display:flex;align-items:center;gap:10px;\
    padding:10px 12px;border-radius:10px;\
    background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);\
    margin-bottom:7px;transition:background .15s;\
  }\
  .wt-hist-item:hover{background:rgba(255,255,255,.06);}\
  .wt-hist-badge{\
    width:36px;height:36px;border-radius:50%;\
    background:rgba(5,150,105,.2);border:1.5px solid rgba(5,150,105,.3);\
    display:flex;align-items:center;justify-content:center;\
    font-size:16px;flex-shrink:0;\
  }\
\
  /* ── TOAST ── */\
  #wtToast{\
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);\
    background:#1e3a5f;color:#93c5fd;\
    padding:9px 20px;border-radius:24px;font-size:11.5px;font-weight:700;\
    white-space:nowrap;opacity:0;transition:opacity .3s;z-index:9999;\
    pointer-events:none;border:1px solid rgba(59,130,246,.3);\
    box-shadow:0 6px 24px rgba(0,0,0,.5);\
  }\
  #wtToast.wt-show{opacity:1;}\
  #wtToast.wt-err{background:#450a0a;color:#fca5a5;border-color:rgba(239,68,68,.3);}\
\
  /* ── FADE ANIM ── */\
  @keyframes wtFadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}\
  .wt-fade{animation:wtFadeUp .3s ease both;}\
\
  /* ── PRINT ── */\
  @media print{\
    #appShell>*:not(#page_witness),\
    .app-topbar,.app-sidebar,.app-bottomnav,\
    .wt-hero,.wt-steps,.wt-no-print{display:none!important;}\
    .wt-print-only{display:block!important;}\
    body,#witnessRoot{background:white!important;color:black!important;}\
    .wt-receipt{background:white!important;border:2px solid #e2e8f0!important;color:black!important;}\
    .wt-receipt-row{border-bottom:1px solid #e2e8f0!important;}\
    .wt-rk{color:#475569!important;}\
    .wt-rv{color:#0f172a!important;}\
    .wt-receipt-table{background:white!important;border:1px solid #e2e8f0!important;}\
  }\
  ';
  document.head.appendChild(s);
})();

/* ── Witness State ── */
var WT={
  step:1,
  cls:null,
  sigCanvas:null,
  sigCtx:null,
  sigDrawing:false,
  sigHas:false,
  witnessName:'',
  witnessTitle:'',
};
var WT_SIG_KEY='wt_sigs_v1';

function renderWitnessPage(){
  var root=document.getElementById('witnessRoot');
  if(!root) return;
  root.innerHTML='';
  root.appendChild(_wtBuildHero());
  var body=document.createElement('div');
  body.className='wt-body';
  body.id='wtBody';
  root.appendChild(body);
  var toast=document.createElement('div');
  toast.id='wtToast';
  root.appendChild(toast);
  _wtRenderStep(WT.step);
}

function _wtRenderStep(n){
  WT.step=n;
  var body=document.getElementById('wtBody');
  if(!body) return;
  body.innerHTML='';
  // steps bar
  body.appendChild(_wtBuildStepBar(n));
  var content=document.createElement('div');
  content.className='wt-fade';
  body.appendChild(content);
  if(n===1) _wtStep1(content);
  else if(n===2) _wtStep2(content);
  else if(n===3) _wtStep3(content);
  else if(n===4) _wtStep4(content);
}

/* ── HERO ── */
function _wtBuildHero(){
  var now=new Date();
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var subject=(DB&&DB.meta)?DB.meta.subject||'المادة':'المادة';
  var school=(DB&&DB.meta)?DB.meta.schoolName||'المدرسة':'المدرسة';
  var year=(DB&&DB.meta)?DB.meta.schoolYear||'':'';
  var teacher=(DB&&DB.meta)?DB.meta.teacherName||'':'';
  var div=document.createElement('div');
  div.className='wt-hero';
  div.innerHTML=
    '<div class="wt-hero-seal">📋</div>'+
    '<div class="wt-hero-title">إثبات الاطلاع على درجات المادة</div>'+
    '<div class="wt-hero-sub">محضر رسمي — يُعتمد بالتوقيع</div>'+
    '<div class="wt-hero-meta">'+
    '<div class="wt-meta-chip">🏫 <strong>'+_esc(school)+'</strong></div>'+
    '<div class="wt-meta-chip">📚 <strong>'+_esc(subject)+'</strong></div>'+
    (teacher?'<div class="wt-meta-chip">👤 <strong>'+_esc(teacher)+'</strong></div>':'')+
    (year?'<div class="wt-meta-chip">📅 <strong>'+_esc(year)+'</strong></div>':'')+
    '<div class="wt-meta-chip" id="wtDateChip">🗓 <strong>'+_esc(dateStr)+'</strong></div>'+
    '</div>';
  return div;
}

/* ── STEP BAR ── */
function _wtBuildStepBar(current){
  var labels=['اختيار الفصل','الدرجات','التوقيع','تم'];
  var wrap=document.createElement('div');
  wrap.className='wt-steps';
  for(var i=1;i<=4;i++){
    var step=document.createElement('div');
    step.className='wt-step';
    var dot=document.createElement('div');
    var lbl=document.createElement('div');
    if(i<current){dot.className='wt-step-dot done';dot.textContent='✓';lbl.className='wt-step-lbl done';}
    else if(i===current){dot.className='wt-step-dot active';dot.textContent=['١','٢','٣','٤'][i-1];lbl.className='wt-step-lbl active';}
    else{dot.className='wt-step-dot';dot.textContent=['١','٢','٣','٤'][i-1];lbl.className='wt-step-lbl';}
    lbl.textContent=labels[i-1];
    step.appendChild(dot);
    step.appendChild(lbl);
    wrap.appendChild(step);
    if(i<4){var line=document.createElement('div');line.className='wt-step-line'+(i<current?' done':'');wrap.appendChild(line);}
  }
  return wrap;
}

/* ══ STEP 1: اختيار الفصل ══ */
function _wtStep1(container){
  if(!DB){
    container.innerHTML='<div class="wt-card" style="text-align:center;padding:30px;"><div style="font-size:48px;">📂</div><div style="font-size:14px;color:#64748b;margin-top:12px;">لا توجد بيانات محفوظة بعد.</div></div>';
    return;
  }
  // Witness info
  var card1=document.createElement('div');card1.className='wt-card';
  card1.innerHTML=
    '<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(29,78,216,.2);">👤</div>'+
    '<div><div class="wt-card-title">بيانات المتابع</div><div class="wt-card-sub">يُملأ من المتابع أو المفتش</div></div></div>'+
    '<div style="display:flex;flex-direction:column;gap:10px;">'+
    '<div><label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:5px;">اسم المتابع / المفتش</label>'+
    '<input class="wt-input" id="wtWitnessName" placeholder="أ/ أحمد محمد..." value="'+_esc(WT.witnessName||'')+'"/></div>'+
    '<div><label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:5px;">الصفة الوظيفية</label>'+
    '<input class="wt-input" id="wtWitnessTitle" placeholder="مشرف / موجّه / مدير..." value="'+_esc(WT.witnessTitle||'')+'"/></div>'+
    '</div>';
  container.appendChild(card1);

  // Class selector
  var card2=document.createElement('div');card2.className='wt-card';
  var clsHtml='<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(124,58,237,.2);">🏫</div>'+
    '<div><div class="wt-card-title">اختر الفصل الدراسي</div><div class="wt-card-sub">سيتم عرض درجات الفصل كاملاً</div></div></div>'+
    '<div class="wt-cls-grid">';
  (DB.classes||[]).forEach(function(c){
    clsHtml+='<button class="wt-cls-btn'+(c===WT.cls?' active':'')+'" onclick="WT.cls=\''+_esc(c)+'\';_wtRenderStep(1)">'+_esc(c)+'</button>';
  });
  clsHtml+='</div>';
  card2.innerHTML=clsHtml;
  container.appendChild(card2);

  var btn=document.createElement('button');
  btn.className='wt-btn wt-btn-primary';
  btn.innerHTML='<span>عرض الدرجات</span><span>←</span>';
  btn.onclick=function(){
    WT.witnessName=(document.getElementById('wtWitnessName')||{}).value||'';
    WT.witnessTitle=(document.getElementById('wtWitnessTitle')||{}).value||'';
    if(!WT.witnessName.trim()){_wtToast('⚠ أدخل اسم المتابع أولاً',true);return;}
    if(!WT.cls){_wtToast('⚠ اختر الفصل الدراسي أولاً',true);return;}
    _wtRenderStep(2);
  };
  container.appendChild(btn);
}

/* ══ STEP 2: عرض الدرجات ══ */
function _wtStep2(container){
  var cls=WT.cls;
  var students=(DB.data[cls]||[]);
  var tmax=70;
  var totals=[];
  students.forEach(function(s){if(!s._totalAbsent){var c=calcStudent(s);totals.push(c.total);}});
  var classAvg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
  var passCount=totals.filter(function(t){return t>=42;}).length;

  // class summary card
  var card=document.createElement('div');card.className='wt-card';
  card.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(5,150,105,.2);">📊</div>'+
    '<div><div class="wt-card-title">ملخص الفصل: '+_esc(cls)+'</div>'+
    '<div class="wt-card-sub">'+students.length+' طالب — العام الدراسي '+(DB.meta.schoolYear||'')+'</div></div></div>'+
    '<div class="wt-summary-grid">'+
    _wtSumCell(students.length,'عدد الطلاب','','#60a5fa')+
    _wtSumCell(classAvg,'المتوسط العام','/70',_wtGradeColor(classAvg,70).text)+
    _wtSumCell(passCount,'ناجح','طالب','#34d399')+
    _wtSumCell(students.length-passCount,'راسب','طالب','#f87171')+
    '</div>';
  container.appendChild(card);

  // grades table card
  var card2=document.createElement('div');card2.className='wt-card';
  var tblHtml=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(29,78,216,.2);">📝</div>'+
    '<div><div class="wt-card-title">كشف الدرجات الكاملة</div>'+
    '<div class="wt-card-sub">مادة '+_esc(DB.meta.subject||'')+'</div></div></div>'+
    '<div class="wt-tbl-wrap"><table class="wt-tbl">'+
    '<thead><tr>'+
    '<th>م</th><th style="text-align:right;padding-right:10px;">اسم الطالب</th>'+
    '<th>تقييم<br><small style="opacity:.6">/20</small></th>'+
    '<th>واجب<br><small style="opacity:.6">/10</small></th>'+
    '<th title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br><small style="opacity:.6">/10</small></th>'+
    '<th>اختبار<br><small style="opacity:.6">/30</small></th>'+
    '<th>المجموع<br><small style="opacity:.6">/70</small></th>'+
    '</tr></thead><tbody>';
  students.forEach(function(s,i){
    var c=calcStudent(s);
    var gc=_wtGradeColor(c.total,70);
    var absent=s._totalAbsent;
    tblHtml+='<tr>'+
      '<td style="color:#334155;font-size:9px;">'+(i+1)+'</td>'+
      '<td class="td-name">'+_esc(s.name||'—')+'</td>'+
      (absent?'<td colspan="5" style="color:#b45309;font-weight:700;">غائب كلياً</td>':
        '<td>'+_wtChip(c.avgAssess,20)+'</td>'+
        '<td>'+_wtChip(c.avgHw,10)+'</td>'+
        '<td>'+_wtChip(c.avgBeh,10)+'</td>'+
        '<td>'+_wtChip(c.exTotal,30)+'</td>'+
        '<td><span class="wt-grade-chip" style="background:'+gc.bg+';color:'+gc.text+';font-size:11px;">'+c.total+'</span></td>')+
      '</tr>';
  });
  tblHtml+='</tbody></table></div>';
  card2.innerHTML=tblHtml;
  container.appendChild(card2);

  var row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin-top:4px;';
  var back=document.createElement('button');back.className='wt-btn wt-btn-ghost';back.innerHTML='← رجوع';back.onclick=function(){_wtRenderStep(1);};
  var next=document.createElement('button');next.className='wt-btn wt-btn-gold';next.innerHTML='✍️ التوقيع على الاطلاع';next.onclick=function(){_wtRenderStep(3);};
  row.appendChild(back);row.appendChild(next);
  container.appendChild(row);
}

/* ══ STEP 3: التوقيع ══ */
function _wtStep3(container){
  // confirm card
  var card=document.createElement('div');card.className='wt-card';
  card.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(217,119,6,.2);">📜</div>'+
    '<div><div class="wt-card-title">نص المحضر الرسمي</div></div></div>'+
    '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px;font-size:11.5px;color:#94a3b8;line-height:2;direction:rtl;">'+
    'أنا الموقّع أدناه <strong style="color:#fcd34d;">'+_esc(WT.witnessName)+'</strong>'+
    ' بصفة <strong style="color:#fcd34d;">'+_esc(WT.witnessTitle||'متابع')+'</strong>،'+
    ' أُشهد بأنني اطّلعتُ على درجات مادة <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.subject||'':'')+'</strong>'+
    ' للفصل <strong style="color:#93c5fd;">'+_esc(WT.cls||'')+'</strong>'+
    ' بمدرسة <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.schoolName||'':'')+'</strong>'+
    ' للعام الدراسي <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.schoolYear||'':'')+'</strong>،'+
    ' وذلك بتاريخ <strong style="color:#fcd34d;" id="wtNowDate"></strong>.'+
    '</div>';
  container.appendChild(card);

  // Signature card
  var card2=document.createElement('div');card2.className='wt-card';
  card2.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(29,78,216,.2);">✍️</div>'+
    '<div><div class="wt-card-title">توقيع المتابع</div>'+
    '<div class="wt-card-sub">وقِّع بإصبعك في المربع أدناه</div></div></div>';

  var sigBox=document.createElement('div');
  sigBox.className='wt-sig-box';
  sigBox.style.height='180px';
  sigBox.id='wtSigBox';

  var sigCanvas=document.createElement('canvas');
  sigCanvas.id='wtSigCanvas';
  sigCanvas.className='wt-sig-canvas';
  sigBox.appendChild(sigCanvas);

  var ghost=document.createElement('div');
  ghost.className='wt-sig-ghost';ghost.id='wtSigGhost';
  ghost.innerHTML='<div class="wt-sig-ghost-icon">✍️</div><div class="wt-sig-ghost-text">المتابع يوقّع هنا بإصبعه</div>';
  sigBox.appendChild(ghost);
  card2.appendChild(sigBox);

  var actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:8px;margin-top:10px;align-items:center;';
  var clearBtn=document.createElement('button');
  clearBtn.className='wt-btn wt-btn-danger wt-btn-sm';
  clearBtn.innerHTML='🗑 مسح التوقيع';
  clearBtn.onclick=_wtClearSig;
  var hint=document.createElement('div');
  hint.style.cssText='flex:1;font-size:9.5px;color:#334155;padding-right:8px;';
  hint.textContent='التوقيع يُستخدم للإثبات الرسمي فقط';
  actions.appendChild(clearBtn);actions.appendChild(hint);
  card2.appendChild(actions);
  container.appendChild(card2);

  var row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin-top:4px;';
  var back=document.createElement('button');back.className='wt-btn wt-btn-ghost';back.innerHTML='← رجوع';back.onclick=function(){_wtRenderStep(2);};
  var confirm=document.createElement('button');confirm.className='wt-btn wt-btn-primary';confirm.id='wtConfirmBtn';
  confirm.innerHTML='✅ تأكيد الاطلاع والتوقيع';
  confirm.onclick=_wtConfirm;
  row.appendChild(back);row.appendChild(confirm);
  container.appendChild(row);

  // Set date text
  var dn=document.getElementById('wtNowDate');
  if(dn){var now=new Date();dn.textContent=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}

  // Init canvas
  setTimeout(_wtInitCanvas,80);
}

/* ── Canvas ── */
function _wtInitCanvas(){
  var box=document.getElementById('wtSigBox');
  var canvas=document.getElementById('wtSigCanvas');
  if(!box||!canvas) return;
  var W=box.clientWidth; var H=180;
  var dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  var ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.strokeStyle='#0f172a'; ctx.lineWidth=2.8;
  ctx.lineCap='round'; ctx.lineJoin='round';
  WT.sigCanvas=canvas; WT.sigCtx=ctx; WT.sigDrawing=false; WT.sigHas=false;

  function getPos(e){
    var r=canvas.getBoundingClientRect();
    var src=e.touches?e.touches[0]:e;
    return{x:(src.clientX-r.left),y:(src.clientY-r.top)};
  }
  function startDraw(e){e.preventDefault();var p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);WT.sigDrawing=true;}
  function moveDraw(e){e.preventDefault();if(!WT.sigDrawing)return;var p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);_wtMarkSig();}
  function endDraw(e){if(e)e.preventDefault();WT.sigDrawing=false;ctx.beginPath();}

  canvas.addEventListener('touchstart',startDraw,{passive:false});
  canvas.addEventListener('touchmove',moveDraw,{passive:false});
  canvas.addEventListener('touchend',endDraw,{passive:false});
  canvas.addEventListener('mousedown',startDraw);
  canvas.addEventListener('mousemove',moveDraw);
  canvas.addEventListener('mouseup',endDraw);
  canvas.addEventListener('mouseleave',endDraw);
}

function _wtMarkSig(){
  WT.sigHas=true;
  var g=document.getElementById('wtSigGhost');
  if(g)g.style.opacity='0';
}

function _wtClearSig(){
  if(!WT.sigCtx||!WT.sigCanvas) return;
  WT.sigCtx.clearRect(0,0,WT.sigCanvas.width,WT.sigCanvas.height);
  WT.sigHas=false;
  var g=document.getElementById('wtSigGhost');
  if(g)g.style.opacity='1';
}

/* ── Confirm ── */
function _wtConfirm(){
  if(!WT.witnessName.trim()){_wtToast('⚠ اسم المتابع مطلوب',true);return;}
  if(!WT.sigHas){_wtToast('⚠ التوقيع مطلوب',true);return;}
  var sigData=WT.sigCanvas.toDataURL('image/png');
  var now=new Date();
  var students=(DB.data[WT.cls]||[]);
  var totals=[];
  students.forEach(function(s){if(!s._totalAbsent){var c=calcStudent(s);totals.push(c.total);}});
  var classAvg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
  var entry={
    ts:now.toISOString(),
    cls:WT.cls,
    subject:(DB&&DB.meta)?DB.meta.subject||'':'',
    school:(DB&&DB.meta)?DB.meta.schoolName||'':'',
    year:(DB&&DB.meta)?DB.meta.schoolYear||'':'',
    teacher:(DB&&DB.meta)?DB.meta.teacherName||'':'',
    witnessName:WT.witnessName,
    witnessTitle:WT.witnessTitle||'متابع',
    studentCount:students.length,
    classAvg:classAvg,
    sig:sigData
  };
  // save
  var sigs=[];
  try{var s=localStorage.getItem(WT_SIG_KEY);if(s)sigs=JSON.parse(s);}catch(e){}
  sigs.push(entry);
  try{localStorage.setItem(WT_SIG_KEY,JSON.stringify(sigs));}catch(e){}
  WT._lastEntry=entry;
  _wtRenderStep(4);
}

/* ══ STEP 4: تم ══ */
function _wtStep4(container){
  var e=WT._lastEntry;
  if(!e) return;
  var now=new Date(e.ts);
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var timeStr=now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});

  var receipt=document.createElement('div');
  receipt.className='wt-receipt wt-fade';
  receipt.innerHTML=
    '<div class="wt-receipt-seal">✅</div>'+
    '<div class="wt-receipt-title">تمّ الاطلاع والتوقيع</div>'+
    '<div class="wt-receipt-sub">تمّ تسجيل الاطلاع الرسمي بنجاح<br>'+_esc(dateStr)+'</div>'+
    '<div class="wt-receipt-table">'+
    _wtRRow('المدرسة',e.school)+
    _wtRRow('المادة',e.subject)+
    _wtRRow('الفصل الدراسي',e.cls)+
    _wtRRow('العام الدراسي',e.year)+
    _wtRRow('المعلم',e.teacher)+
    _wtRRow('المتابع / المفتش',e.witnessName)+
    _wtRRow('الصفة',e.witnessTitle)+
    _wtRRow('عدد الطلاب',e.studentCount+' طالب')+
    _wtRRow('متوسط الفصل',e.classAvg+' / 70')+
    _wtRRow('التاريخ',dateStr)+
    _wtRRow('الوقت',timeStr)+
    '</div>'+
    '<div style="margin-bottom:8px;font-size:10px;color:#475569;font-weight:700;">توقيع المتابع</div>'+
    '<div class="wt-sig-preview">'+
    '<img src="'+e.sig+'" style="width:100%;display:block;" alt="التوقيع"/>'+
    '<div class="wt-sig-label">✍️ '+_esc(e.witnessName)+' — '+_esc(e.witnessTitle)+'</div>'+
    '</div>';
  container.appendChild(receipt);

  var row=document.createElement('div');
  row.style.cssText='display:flex;gap:8px;margin-top:14px;';
  var printBtn=document.createElement('button');
  printBtn.className='wt-btn wt-btn-ghost';printBtn.innerHTML='🖨 طباعة المحضر';
  printBtn.onclick=_wtPrint;
  var newBtn=document.createElement('button');
  newBtn.className='wt-btn wt-btn-primary';newBtn.innerHTML='↩ توقيع جديد';
  newBtn.onclick=function(){WT.cls=null;WT.witnessName='';WT.witnessTitle='';WT.sigHas=false;WT._lastEntry=null;_wtRenderStep(1);};
  row.appendChild(printBtn);row.appendChild(newBtn);
  container.appendChild(row);

  // History
  var sigs=[];
  try{var s=localStorage.getItem(WT_SIG_KEY);if(s)sigs=JSON.parse(s);}catch(e2){}
  if(sigs.length>1){
    var histCard=document.createElement('div');histCard.className='wt-card';histCard.style.marginTop='14px';
    histCard.innerHTML='<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(217,119,6,.2);">📜</div><div><div class="wt-card-title">سجل التوقيعات السابقة</div></div></div>';
    sigs.slice().reverse().slice(0,8).forEach(function(sig){
      var d=new Date(sig.ts);
      var ds=d.toLocaleDateString('ar-EG',{month:'short',day:'numeric'});
      var ts2=d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
      var item=document.createElement('div');item.className='wt-hist-item';
      item.innerHTML='<div class="wt-hist-badge">✅</div>'+
        '<div style="flex:1;">'+
        '<div style="font-size:11.5px;font-weight:700;color:#e2e8f0;">'+_esc(sig.cls)+' — '+_esc(sig.witnessName)+'</div>'+
        '<div style="font-size:9.5px;color:#475569;">'+_esc(sig.subject)+' | '+_esc(sig.witnessTitle)+'</div>'+
        '</div>'+
        '<div style="text-align:left;font-size:9px;color:#334155;">'+_esc(ds)+'<br>'+_esc(ts2)+'</div>';
      histCard.appendChild(item);
    });
    container.appendChild(histCard);
  }
}

/* ── Print ── */
function _wtPrint(){
  var e=WT._lastEntry;
  if(!e) return;
  var now=new Date(e.ts);
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var timeStr=now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  var win=window.open('','_blank','width=700,height=900');
  var students=(DB.data[e.cls]||[]);
  var rows='';
  students.forEach(function(s,i){
    var c=calcStudent(s);
    var color=c.total>=42?'#065f46':c.total>=28?'#92400e':'#b91c1c';
    rows+='<tr>'+
      '<td style="text-align:center;color:#94a3b8;font-size:9px;">'+(i+1)+'</td>'+
      '<td style="text-align:right;font-weight:700;padding-right:8px;">'+_esc(s.name||'—')+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgAssess||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgHw||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgBeh||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.exTotal||0))+'</td>'+
      '<td style="text-align:center;font-weight:900;color:'+color+';">'+_esc(s._totalAbsent?'غائب':c.total)+'</td>'+
      '</tr>';
  });
  win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head>'+
    '<meta charset="UTF-8"/><title>محضر الاطلاع</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0;}'+
    'body{font-family:Cairo,sans-serif;direction:rtl;padding:24px;color:#0f172a;background:white;font-size:11px;}'+
    'h1{font-size:17px;font-weight:900;color:#0f2a5e;text-align:center;margin-bottom:3px;}'+
    'h2{font-size:12px;font-weight:700;color:#1d4ed8;text-align:center;margin-bottom:14px;}'+
    '.meta{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px;}'+
    '.chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:3px 12px;font-size:10px;color:#475569;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px;}'+
    'th{background:#0f2a5e;color:white;padding:6px 5px;text-align:center;font-weight:700;border:1px solid #1d4ed8;}'+
    'td{border:1px solid #e2e8f0;padding:5px;vertical-align:middle;}'+
    'tr:nth-child(even) td{background:#f8fafc;}'+
    '.section{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;}'+
    '.section h3{font-size:11px;font-weight:900;color:#0f2a5e;margin-bottom:10px;}'+
    '.info-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:10.5px;}'+
    '.info-row:last-child{border-bottom:none;}'+
    '.info-key{color:#64748b;font-weight:700;}'+
    '.info-val{font-weight:900;color:#0f172a;}'+
    '.sig-area{text-align:center;margin-top:8px;}'+
    '.sig-area img{max-width:220px;border:1px dashed #94a3b8;border-radius:6px;padding:4px;}'+
    '.sig-line{border-top:1.5px dashed #94a3b8;margin:20px 40px 6px;color:#94a3b8;}'+
    '.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px;}'+
    '.badge-ok{color:#065f46;} .badge-fail{color:#b91c1c;}'+
    '@media print{body{padding:14px;}@page{margin:1cm;}}'+
    '</style></head><body>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="images/logo.jpg" style="width:60px;height:60px;object-fit:contain;border-radius:50%;background:#000;"/><h1 style="margin:0;">'+_esc(e.school)+'</h1></div>'+
    '<h2>محضر اطلاع رسمي على درجات مادة '+_esc(e.subject)+'</h2>'+
    '<div class="meta">'+
    '<span class="chip">📚 '+_esc(e.subject)+'</span>'+
    '<span class="chip">🏫 '+_esc(e.cls)+'</span>'+
    '<span class="chip">👤 '+_esc(e.teacher)+'</span>'+
    '<span class="chip">📅 '+_esc(e.year)+'</span>'+
    '<span class="chip">🗓 '+_esc(dateStr)+'</span>'+
    '</div>'+

    '<table>'+
    '<thead><tr><th>م</th><th style="text-align:right;padding-right:8px;">اسم الطالب</th><th>تقييم<br>/20</th><th>واجب<br>/10</th><th title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br>/10</th><th>اختبار<br>/30</th><th>المجموع<br>/70</th></tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '</table>'+

    '<div class="section">'+
    '<h3>بيانات الاطلاع</h3>'+
    '<div class="info-row"><span class="info-key">المتابع / المفتش</span><span class="info-val">'+_esc(e.witnessName)+'</span></div>'+
    '<div class="info-row"><span class="info-key">الصفة الوظيفية</span><span class="info-val">'+_esc(e.witnessTitle)+'</span></div>'+
    '<div class="info-row"><span class="info-key">عدد الطلاب</span><span class="info-val">'+e.studentCount+' طالب</span></div>'+
    '<div class="info-row"><span class="info-key">متوسط الفصل</span><span class="info-val">'+e.classAvg+' / 70</span></div>'+
    '<div class="info-row"><span class="info-key">تاريخ الاطلاع</span><span class="info-val">'+_esc(dateStr)+'</span></div>'+
    '<div class="info-row"><span class="info-key">الوقت</span><span class="info-val">'+_esc(timeStr)+'</span></div>'+
    '</div>'+

    '<div class="section">'+
    '<h3>توقيع المتابع</h3>'+
    '<div class="sig-area">'+
    '<img src="'+e.sig+'" alt="توقيع"/>'+
    '<div style="font-size:10px;font-weight:700;margin-top:6px;">'+_esc(e.witnessName)+' — '+_esc(e.witnessTitle)+'</div>'+
    '</div>'+
    '<div style="margin-top:18px;display:flex;justify-content:space-around;text-align:center;font-size:10px;color:#475569;">'+
    '<div><div class="sig-line"></div><div>معلم المادة / '+_esc(e.teacher)+'</div></div>'+
    '<div><div class="sig-line"></div><div>مدير المدرسة</div></div>'+
    '</div>'+
    '</div>'+

    '<div class="footer">نظام إدارة الدرجات المدرسي — تم التوقيع الإلكتروني بتاريخ '+_esc(dateStr)+' الساعة '+_esc(timeStr)+'</div>'+
    '<\/body><\/html>');
  win.document.close();
  setTimeout(function(){win.print();},600);
}

/* ── Helpers ── */
function _wtSumCell(val,lbl,sub,color){
  return '<div class="wt-sum-cell">'+
    '<div class="wt-sum-val" style="color:'+color+';">'+val+'</div>'+
    '<div class="wt-sum-lbl">'+lbl+'</div>'+
    (sub?'<div class="wt-sum-max">'+sub+'</div>':'')+
    '</div>';
}
function _wtRRow(key,val){
  return '<div class="wt-receipt-row"><span class="wt-rk">'+_esc(key)+'</span><span class="wt-rv">'+_esc(String(val||'—'))+'</span></div>';
}
function _wtChip(val,max){
  var c=_wtGradeColor(Number(val)||0,max);
  return '<span style="background:'+c.bg+';color:'+c.text+';padding:1px 8px;border-radius:8px;font-weight:700;font-size:10px;">'+val+'</span>';
}
function _wtGradeColor(val,max){
  if(max<=0) return{bg:'rgba(255,255,255,.06)',text:'#94a3b8'};
  var p=val/max;
  if(p>=0.85) return{bg:'rgba(5,150,105,.2)',text:'#34d399'};
  if(p>=0.60) return{bg:'rgba(217,119,6,.2)',text:'#fbbf24'};
  return{bg:'rgba(239,68,68,.18)',text:'#f87171'};
}
function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _wtToast(msg,err){
  var t=document.getElementById('wtToast');
  if(!t) return;
  t.textContent=msg;
  t.className='wt-show'+(err?' wt-err':'');
  clearTimeout(_wtToast._t);
  _wtToast._t=setTimeout(function(){t.className='';},2600);
}


// ══════════════════════════════


(function(){

// ── محتوى المساعدة لكل صفحة ──────────────────────────
var HELP = {

  home: {
    title: 'الرئيسية',
    icon: '🏠',
    color: '#3b82f6',
    intro: 'الصفحة الرئيسية تعرض ملخصاً سريعاً لأهم المعلومات والوقت الحالي.',
    sections: [
      { icon: '🕐', title: 'الساعة والتاريخ', items: ['تعرض الوقت الحالي والتاريخ بالتقويم الميلادي والهجري.'] },
      { icon: '📊', title: 'الملخص السريع', items: ['تعرض عدد الفصول والطلاب والدرجات المسجلة.', 'اضغط على أي بطاقة للانتقال مباشرة للصفحة المرتبطة بها.'] },
    ]
  },

  grades: {
    title: 'الدرجات',
    icon: '📝',
    color: '#10b981',
    intro: 'صفحة تسجيل درجات الطلاب في جميع المواد والأنشطة.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل الدراسي من القائمة في الأعلى.', 'يمكنك إضافة فصول جديدة من صفحة الإعدادات.'] },
      { icon: '✏️', title: 'تسجيل الدرجات', items: ['اضغط على خلية الدرجة مباشرة لتعديلها.', 'اضغط Enter أو انتقل للخلية التالية لحفظ التغيير تلقائياً.', 'تظهر الخلية باللون الأحمر إذا كانت الدرجة أقل من النصف.'] },
      { icon: '➕', title: 'إضافة طالب', items: ['اضغط زر "إضافة طالب" في أسفل القائمة.', 'أدخل اسم الطالب واضغط حفظ.'] },
      { icon: '📤', title: 'التصدير', items: ['اضغط زر التصدير لحفظ الدرجات كملف Excel.'] },
    ]
  },

  weekly: {
    title: 'الأسبوعي',
    icon: '📅',
    color: '#8b5cf6',
    intro: 'سجّل أداء الطلاب الأسبوعي وتابع تطورهم عبر الزمن.',
    sections: [
      { icon: '📆', title: 'اختيار الأسبوع', items: ['استخدم الأسهم للتنقل بين الأسابيع.', 'كل أسبوع يُحفظ بشكل مستقل.'] },
      { icon: '✍️', title: 'التقييم', items: ['أدخل تقييم كل طالب في خانته.', 'يمكنك إضافة ملاحظة لكل طالب.'] },
    ]
  },

  sched: {
    title: 'الجدول',
    icon: '🗓',
    color: '#f59e0b',
    intro: 'عرض وتعديل جدول الحصص الأسبوعي لكل فصل.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل من القائمة لعرض جدوله.'] },
      { icon: '✏️', title: 'تعديل الجدول', items: ['اضغط على أي خانة في الجدول لتعديل المادة أو المعلم.', 'يُحفظ الجدول تلقائياً بعد كل تعديل.'] },
    ]
  },

  absence: {
    title: 'الغياب',
    icon: '📋',
    color: '#ef4444',
    intro: 'تسجيل ومتابعة غياب الطلاب يومياً.',
    sections: [
      { icon: '📅', title: 'اختيار التاريخ', items: ['اختر التاريخ من الأعلى لعرض غياب ذلك اليوم.'] },
      { icon: '✅', title: 'تسجيل الغياب', items: ['اضغط على اسم الطالب لتسجيله غائباً أو حاضراً.', 'الأحمر = غائب، الأخضر = حاضر.'] },
      { icon: '📊', title: 'الإحصائيات', items: ['تظهر في الأسفل إجمالي أيام الغياب لكل طالب.'] },
    ]
  },

  sick: {
    title: 'المرضى',
    icon: '🤒',
    color: '#f97316',
    intro: 'تتبع الطلاب الغائبين بسبب المرض وإدارة الإجازات المرضية.',
    sections: [
      { icon: '➕', title: 'إضافة حالة', items: ['اضغط "إضافة" وأدخل اسم الطالب وتاريخ المرض وعدد الأيام.'] },
      { icon: '📋', title: 'متابعة الحالات', items: ['تظهر جميع الحالات مرتبة حسب التاريخ.', 'يمكنك حذف أي حالة بالضغط على زر الحذف.'] },
    ]
  },

  dict: {
    title: 'الإملاء',
    icon: '🎤',
    color: '#06b6d4',
    intro: 'تسجيل درجات الإملاء والاختبارات الكتابية للطلاب.',
    sections: [
      { icon: '📝', title: 'تسجيل الدرجات', items: ['أدخل درجة الإملاء لكل طالب في الخانة المخصصة.', 'الدرجة القصوى محددة من الإعدادات.'] },
      { icon: '📊', title: 'المتوسط', items: ['يظهر متوسط الدرجات تلقائياً أسفل الجدول.'] },
    ]
  },

  stats: {
    title: 'الإحصائيات',
    icon: '📊',
    color: '#a78bfa',
    intro: 'عرض تحليل شامل لأداء الطلاب والفصول.',
    sections: [
      { icon: '📈', title: 'الرسوم البيانية', items: ['تعرض توزيع الدرجات والمتوسطات بشكل مرئي.'] },
      { icon: '🏆', title: 'الترتيب', items: ['يمكنك عرض ترتيب الطلاب حسب الدرجات الكلية.'] },
      { icon: '🔍', title: 'التصفية', items: ['اختر فصلاً أو مادة محددة لعرض إحصائياتها.'] },
    ]
  },

  curric: {
    title: 'توزيع المنهج',
    icon: '📖',
    color: '#34d399',
    intro: 'تخطيط وتوزيع محتوى المنهج الدراسي على أسابيع الفصل.',
    sections: [
      { icon: '📅', title: 'التخطيط', items: ['أدخل المحتوى المخطط لكل أسبوع.', 'يمكن تحديد الوحدة والدروس والأهداف لكل أسبوع.'] },
      { icon: '✅', title: 'المتابعة', items: ['ضع علامة على الأسابيع المنجزة فعلاً للمتابعة.'] },
    ]
  },

  settings: {
    title: 'الإعدادات',
    icon: '⚙️',
    color: '#94a3b8',
    intro: 'ضبط إعدادات التطبيق وتخصيصه حسب احتياجاتك.',
    sections: [
      { icon: '🏫', title: 'إدارة الفصول', items: ['أضف فصولاً جديدة أو احذف فصولاً موجودة.', 'يمكنك تسمية الفصل بأي اسم تريده.'] },
      { icon: '📝', title: 'إعدادات الدرجات', items: ['حدد الدرجة القصوى لكل نشاط أو مادة.', 'يمكن إضافة أعمدة مخصصة.'] },
      { icon: '👤', title: 'بيانات المعلم', items: ['أدخل اسمك والمدرسة لتظهر في التقارير.'] },
    ]
  },

  backup: {
    title: 'النسخ الاحتياطي',
    icon: '💾',
    color: '#3b82f6',
    intro: 'حماية بياناتك من الفقدان عبر نظام نسخ احتياطي متكامل.',
    sections: [
      { icon: '📁', title: 'مزامنة مجلد (الأفضل)', items: [
        'اضغط "اختر مجلد المزامنة" واختر مجلداً على جهازك.',
        'اقبل طلب الإذن — يعمل على Chrome وEdge فقط.',
        'سيُحفظ ملف نسخة_احتياطية.json تلقائياً كل 5 دقائق.',
        'اختر مجلداً داخل Google Drive أو OneDrive للمزامنة مع السحابة!',
      ]},
      { icon: '💾', title: 'نسخ يدوي', items: [
        'اكتب اسماً للنسخة واضغط "حفظ نسخة" — تُحفظ في المتصفح.',
        'يُحتفظ بأحدث 20 نسخة تلقائياً.',
      ]},
      { icon: '⬇️', title: 'تصدير واستيراد', items: [
        'اضغط "تصدير JSON" لتحميل ملف كامل على جهازك.',
        'أرسله لنفسك بالبريد أو احفظه على Drive يدوياً.',
        'عند تغيير الجهاز: استخدم "استيراد ملف" لاستعادة كل البيانات.',
      ]},
      { icon: '↩️', title: 'استعادة نسخة', items: [
        'من قائمة النسخ اضغط "↩ استعادة" بجانب أي نسخة.',
        'النظام يحفظ نسخة احتياطية تلقائية قبل الاستعادة.',
      ]},
      { icon: '⚠️', title: 'تنبيه مهم', items: [
        'المزامنة تعمل فقط عندما يكون التطبيق مفتوحاً في المتصفح.',
        'صدِّر ملف JSON بانتظام لضمان الحماية من مسح بيانات المتصفح.',
      ]},
    ]
  },

  sig: {
    title: 'توقيع المتابع',
    icon: '✍️',
    color: '#fcd34d',
    intro: 'إضافة توقيع المعلم أو ولي الأمر على التقارير.',
    sections: [
      { icon: '✍️', title: 'رسم التوقيع', items: ['استخدم الإصبع أو الماوس لرسم توقيعك في المربع.', 'اضغط "مسح" لإعادة الرسم من البداية.'] },
      { icon: '💾', title: 'الحفظ', items: ['اضغط "حفظ التوقيع" ليُستخدم تلقائياً في التقارير.'] },
    ]
  },

  notifs: {
    title: 'الإشعارات',
    icon: '🔔',
    color: '#f59e0b',
    intro: 'تتبع أهم الأحداث والتنبيهات في التطبيق.',
    sections: [
      { icon: '🔔', title: 'أنواع الإشعارات', items: ['تظهر تنبيهات عند حدوث تغييرات مهمة كتسجيل غياب مرتفع أو اقتراب موعد.'] },
      { icon: '✅', title: 'إدارة الإشعارات', items: ['اضغط على الإشعار لتحديده كمقروء.', 'يمكن حذف جميع الإشعارات دفعة واحدة.'] },
    ]
  },

  kashef: {
    title: 'كشف الدرجات',
    icon: '📋',
    color: '#e2e8f0',
    intro: 'عرض وطباعة كشف الدرجات الرسمي للفصل.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل المطلوب من القائمة لعرض كشفه.'] },
      { icon: '🖨️', title: 'الطباعة', items: ['اضغط "طباعة" لطباعة الكشف مباشرة.', 'يمكن تصديره كـ PDF من إعدادات الطباعة.'] },
    ]
  },
};

// ── عرض المساعدة حسب الصفحة الحالية ─────────────────
window.showPageHelp = function(){
  var page = window._currentPage || 'home';
  var data = HELP[page] || HELP['home'];
  _showHelpModal(data);
};

// ── عرض مودال المساعدة ───────────────────────────────
function _showHelpModal(data){
  // إزالة مودال سابق إن وجد
  var existing = document.getElementById('helpModalOverlay');
  if(existing) existing.remove();

  var mo = document.createElement('div');
  mo.id = 'helpModalOverlay';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .15s ease;';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };

  var sections = (data.sections||[]).map(function(sec){
    var items = (sec.items||[]).map(function(item){
      return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:5px;">'
        +'<span style="color:'+data.color+';flex-shrink:0;margin-top:2px;">•</span>'
        +'<span style="font-size:11px;color:#94a3b8;line-height:1.65;">'+item+'</span>'
        +'</div>';
    }).join('');
    return '<div style="background:#1e293b;border-radius:10px;padding:12px 14px;border-right:3px solid '+data.color+';margin-bottom:8px;">'
      +'<div style="font-size:11px;font-weight:800;color:'+data.color+';margin-bottom:7px;">'+sec.icon+' '+sec.title+'</div>'
      +items
      +'</div>';
  }).join('');

  mo.innerHTML =
    '<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:16px;width:100%;max-width:460px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;direction:rtl;font-family:Cairo,sans-serif;">'
      // رأس
      +'<div style="background:linear-gradient(135deg,#0a1628,#1e3a5f);padding:15px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
        +'<span style="font-size:28px;">'+data.icon+'</span>'
        +'<div style="flex:1;">'
          +'<div style="font-size:14px;font-weight:900;color:#f1f5f9;">مساعدة: '+data.title+'</div>'
          +'<div style="font-size:9.5px;color:#64748b;margin-top:2px;">'+data.intro+'</div>'
        +'</div>'
        +'<button onclick="document.getElementById(\'helpModalOverlay\').remove()" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#94a3b8;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:15px;font-family:Cairo,sans-serif;flex-shrink:0;">✕</button>'
      +'</div>'
      // محتوى
      +'<div style="overflow-y:auto;padding:14px 16px;flex:1;">'
        +sections
        // نصيحة عامة
        +'<div style="background:#0a1628;border:1px dashed #1e3a5f;border-radius:8px;padding:10px 12px;margin-top:4px;">'
          +'<div style="font-size:9.5px;color:#475569;line-height:1.7;">💡 <strong style="color:#64748b;">نصيحة:</strong> جميع التغييرات تُحفظ تلقائياً في المتصفح. للحماية من الفقدان استخدم صفحة <strong style="color:#3b82f6;">النسخ الاحتياطي</strong>.</div>'
        +'</div>'
      +'</div>'
      // زر إغلاق
      +'<div style="padding:12px 16px;border-top:1px solid #1e293b;text-align:center;flex-shrink:0;">'
        +'<button onclick="document.getElementById(\'helpModalOverlay\').remove()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:9px 40px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;font-family:Cairo,sans-serif;">فهمت ✓</button>'
      +'</div>'
    +'</div>';

  document.body.appendChild(mo);
}

// ── تتبع الصفحة الحالية لعرض مساعدة صحيحة ───────────
var _origSwitch = window.switchPage;
window.switchPage = function(p){
  window._currentPage = p;
  if(typeof _origSwitch === 'function') _origSwitch(p);
};

// ── animation ────────────────────────────────────────
var st = document.createElement('style');
st.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}';
document.head.appendChild(st);

window.HELP = HELP;
window._showHelpModal = _showHelpModal;

})();
