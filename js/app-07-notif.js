

// ══════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// NOTIFICATION SYSTEM v3
// ══════════════════════════════════════════════════════
var _notifTimer=null, _notifClockTimer=null, _notifLog=[], _lastFiredKeys={};
var _notifSettings={
  enabled:true, sound:true, showToast:true,
  soundTone:'chime_short',
  // global defaults
  globalBefore:5, globalOnStart:true, globalOnEnd:false,
  notifyDays:[0,1,2,3,4,5,6],
  // per-period: { "cls||periodId": { enabled:true, beforeMins:5, onStart:true, onEnd:false } }
  perPeriod:{}
};
// Common school period times for dropdown
var _PERIOD_PRESETS=[
  '7:30-8:15','8:15-9:00','9:00-9:45','9:45-10:00',
  '10:00-10:45','10:45-11:30','11:30-12:15','12:15-13:00',
  '13:00-13:45','13:45-14:30','14:30-15:15'
];

function _notifLoad(){
  try{
    var s=localStorage.getItem('grades_notif_cfg');
    if(s) _notifSettings=Object.assign(_notifSettings,JSON.parse(s));
    if(!_notifSettings.perPeriod) _notifSettings.perPeriod={};
    var l=localStorage.getItem('grades_notif_log');
    if(l) _notifLog=JSON.parse(l).slice(-60);
  }catch(e){}
}
function _notifSave(){
  try{
    localStorage.setItem('grades_notif_cfg',JSON.stringify(_notifSettings));
    localStorage.setItem('grades_notif_log',JSON.stringify(_notifLog));
  }catch(e){}
}
function _notifUpdateBadge(){
  var u=_notifLog.filter(function(n){return!n.read;}).length;
  var sb=document.getElementById('sbNotifBadge');
  if(sb){sb.textContent=u>9?'9+':u; sb.style.display=u>0?'inline':'none';}
  // Update home bell dot
  var dot=document.getElementById('homeBellDot');
  if(dot){
    if(u>0){
      dot.style.display='flex';
      dot.style.alignItems='center';
      dot.style.justifyContent='center';
      dot.style.animation='bellDotPulse 1.8s ease-in-out infinite';
      if(u>1){
        dot.textContent=u>9?'9+':String(u);
        dot.style.minWidth='16px';
        dot.style.height='16px';
        dot.style.fontSize='7px';
        dot.style.padding='0 3px';
        dot.style.top='1px';
        dot.style.right='1px';
        dot.style.borderRadius='8px';
      } else {
        dot.textContent='';
        dot.style.minWidth='9px';
        dot.style.height='9px';
        dot.style.fontSize='0';
        dot.style.padding='0';
        dot.style.top='3px';
        dot.style.right='3px';
        dot.style.borderRadius='50%';
      }
    } else {
      dot.style.display='none';
      dot.style.animation='none';
    }
  }
}
// ── Multi-tone notification sounds ────────────────────
// مسار مجلد الأصوات المدمجة
var _SOUNDS_PATH = 'sounds/';

// نغمات مدمجة — [label, durationLabel, file|null, fallback_fn|null]
// file: اسم ملف WAV في مجلد sounds/
// fallback_fn: دالة WebAudio احتياطية إذا فشل تحميل الملف
var _NOTIF_TONES={
  'chime_short':      ['🎵 جرس قصير',    '0.8 ث', 'chime_short.wav',      function(ctx){ [523,659,784].forEach(function(hz,i){ var o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz; var t=ctx.currentTime+i*.2; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.05); g.gain.exponentialRampToValueAtTime(.001,t+.4); o.start(t);o.stop(t+.45); }); }],
  'chime_long':       ['🔔 جرس طويل',    '2.5 ث', 'chime_long.wav',       function(ctx){ [[523,.0],[659,.5],[784,1.0],[1046,1.5],[784,2.0]].forEach(function(item){ var hz=item[0],delay=item[1]; var o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz; var t=ctx.currentTime+delay; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.06); g.gain.exponentialRampToValueAtTime(.001,t+.55); o.start(t);o.stop(t+.6); }); }],
  'ding':             ['✨ دنق نظيف',     '0.5 ث', 'ding.wav',             function(ctx){ var o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=1318; g.gain.setValueAtTime(.2,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.6); o.start(ctx.currentTime);o.stop(ctx.currentTime+.65); }],
  'alert_double':     ['⚡ تنبيه مزدوج', '0.7 ث', 'alert_double.wav',     function(ctx){ [0,.32].forEach(function(delay){ var o=ctx.createOscillator(),g=ctx.createGain(); o.type='square';o.connect(g);g.connect(ctx.destination);o.frequency.value=880; var t=ctx.currentTime+delay; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.02); g.gain.linearRampToValueAtTime(.0,t+.22); o.start(t);o.stop(t+.25); }); }],
  'school_bell':      ['🏫 جرس المدرسة', '3 ث',   'school_bell.wav',      function(ctx){ for(var i=0;i<10;i++){ var o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';o.connect(g);g.connect(ctx.destination); o.frequency.value=880+(i%2)*220; var t=ctx.currentTime+i*.28; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.02); g.gain.linearRampToValueAtTime(.0,t+.24); o.start(t);o.stop(t+.28); } }],
  'melody':           ['🎶 لحن قصير',    '2 ث',   'melody.wav',           function(ctx){ [[523,0],[587,.25],[659,.5],[698,.75],[784,1.0],[698,1.3],[784,1.6]].forEach(function(item){ var hz=item[0],delay=item[1]; var o=ctx.createOscillator(),g=ctx.createGain(); o.type='triangle';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz; var t=ctx.currentTime+delay; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.14,t+.04); g.gain.exponentialRampToValueAtTime(.001,t+.28); o.start(t);o.stop(t+.3); }); }],
  // ── نغمات جديدة من مجلد sounds ──
  'notification_ping':['🔔 نبضة إشعار',  '0.4 ث', 'notification_ping.wav',null],
  'alert_important':  ['🚨 تنبيه هام',   '2.2 ث', 'alert_important.wav',  null],
  'phone_ring':       ['📱 رنين هاتف',   '2.8 ث', 'phone_ring.wav',       null],
  'alarm_beep':       ['⏰ منبه إنذار',  '3 ث',   'alarm_beep.wav',       null],
  'success':          ['✅ نجاح / إتمام','1.2 ث', 'success.wav',          null],
  'gentle_alert':     ['🌸 تنبيه لطيف', '0.9 ث', 'gentle_alert.wav',     null]
};

// كاش الأصوات المحمّلة
var _audioCache = {};
function _playNotifSound(toneId){
  try{
    // 1. نغمة مخصصة (رُفعت من المستخدم)
    if(toneId && toneId.startsWith('custom_')){
      var ct=_customTones.find(function(t){return t.id===toneId;});
      if(ct && ct.dataUrl){
        var audio=new Audio(ct.dataUrl);
        audio.volume=0.8;
        audio.play().catch(function(){});
        return;
      }
    }
    var id=toneId||_notifSettings.soundTone||'chime_short';
    var toneEntry=_NOTIF_TONES[id]||_NOTIF_TONES['chime_short'];
    var fileName=toneEntry[2]||null;
    var fallbackFn=toneEntry[3]||toneEntry[2]||null;
    // إذا كان toneEntry[2] دالة (النغمات القديمة) → شغّلها مباشرة
    if(typeof toneEntry[2]==='function'){
      var ctx2=new(window.AudioContext||window.webkitAudioContext)();
      toneEntry[2](ctx2);
      return;
    }
    // 2. حاول تشغيل ملف WAV من مجلد sounds
    if(fileName){
      var src=_SOUNDS_PATH+fileName;
      if(_audioCache[src]){
        var aud=_audioCache[src].cloneNode();
        aud.volume=0.75;
        aud.play().catch(function(){ _playFallback(id,fallbackFn); });
      } else {
        var a=new Audio(src);
        a.preload='auto';
        a.oncanplaythrough=function(){
          _audioCache[src]=a;
          var aud2=a.cloneNode();
          aud2.volume=0.75;
          aud2.play().catch(function(){ _playFallback(id,fallbackFn); });
        };
        a.onerror=function(){ _playFallback(id,fallbackFn); };
        a.load();
      }
      return;
    }
    // 3. احتياطي: WebAudio
    _playFallback(id,fallbackFn);
  }catch(e){}
}

function _playFallback(id,fn){
  try{
    if(typeof fn==='function'){
      var ctx=new(window.AudioContext||window.webkitAudioContext)();
      fn(ctx);
    } else {
      // أبسط fallback: chime_short بـ WebAudio
      var ctx=new(window.AudioContext||window.webkitAudioContext)();
      _NOTIF_TONES['chime_short'][3](ctx);
    }
  }catch(e){}
}

// تحميل مسبق لأصوات المجلد عند بدء التطبيق
function _preloadSounds(){
  Object.keys(_NOTIF_TONES).forEach(function(id){
    var entry=_NOTIF_TONES[id];
    if(typeof entry[2]==='string' && entry[2]){
      var src=_SOUNDS_PATH+entry[2];
      if(!_audioCache[src]){
        var a=new Audio(src);
        a.preload='auto';
        a.oncanplaythrough=function(){ _audioCache[src]=a; };
        a.load();
      }
    }
  });
}
// تشغيل التحميل المسبق بعد لحظة من تحميل الصفحة
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(_preloadSounds,1500); });
} else {
  setTimeout(_preloadSounds,1500);
}

// ── Custom Tones (My Tones) ───────────────────────────
var _customTones=[];
function _customTonesLoad(){
  try{
    var s=localStorage.getItem('school_custom_tones');
    if(s) _customTones=JSON.parse(s);
  }catch(e){_customTones=[];}
}
function _customTonesSave(){
  try{ localStorage.setItem('school_custom_tones',JSON.stringify(_customTones)); }catch(e){}
}
_customTonesLoad();

// Inject custom tones into _NOTIF_TONES dynamically
function _syncCustomTonesToNotif(){
  // Remove old custom entries
  Object.keys(_NOTIF_TONES).forEach(function(k){if(k.startsWith('custom_')) delete _NOTIF_TONES[k];});
  // Add current custom tones as entries (label only, playback handled separately)
  _customTones.forEach(function(ct){
    _NOTIF_TONES[ct.id]=[ct.name,'مخصص',null];
  });
}
_syncCustomTonesToNotif();

function customTonesUpload(event){
  var files=Array.from(event.target.files);
  var maxSize=5*1024*1024;
  var loaded=0;
  if(!files.length) return;
  files.forEach(function(file){
    if(file.size>maxSize){showSnack('⚠️ الملف "'+file.name+'" أكبر من 5 ميجا — تم تخطيه','warn');loaded++;if(loaded===files.length){_refreshCustomTonesUI();}return;}
    var existingIdx=_customTones.findIndex(function(t){return t.name===file.name.replace(/\.[^.]+$/,'');});
    var reader=new FileReader();
    reader.onload=function(e2){
      var dataUrl=e2.target.result;
      var toneObj={
        id:'custom_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
        name:file.name.replace(/\.[^.]+$/,''),
        dataUrl:dataUrl,
        size:file.size
      };
      if(existingIdx>=0){
        toneObj.id=_customTones[existingIdx].id; // keep same ID so existing alarms still work
        _customTones[existingIdx]=toneObj;
        showSnack('🔄 تم تحديث: '+toneObj.name);
      } else {
        _customTones.push(toneObj);
        showSnack('✅ تمت إضافة: '+toneObj.name);
      }
      loaded++;
      if(loaded===files.length){
        _customTonesSave();
        _syncCustomTonesToNotif();
        _refreshCustomTonesUI();
      }
    };
    reader.readAsDataURL(file);
  });
  event.target.value='';
}

function customToneDelete(id){
  if(!confirm('حذف هذه النغمة؟')) return;
  _customTones=_customTones.filter(function(t){return t.id!==id;});
  _customTonesSave();
  _syncCustomTonesToNotif();
  // If this tone was default, reset to chime_short
  if(_notifSettings.soundTone===id){_notifSettings.soundTone='chime_short';_notifSave();}
  _refreshCustomTonesUI();
  showSnack('🗑 تم الحذف');
}

function customTonePreview(id){
  _playNotifSound(id);
}

/* ══════════════════════════════════════════
   دوال تحميل نموذج Whisper من صفحة الإعدادات
   ══════════════════════════════════════════ */

function _whisperSettingsUI(state, pct, label) {
  /* تحديث حالة الزر وشريط التقدم */
  var btn  = document.getElementById('whisperDownloadBtn');
  var wrap = document.getElementById('whisperProgressWrap');
  var bar  = document.getElementById('whisperProgressBar');
  var pctEl= document.getElementById('whisperProgressPct');
  var lblEl= document.getElementById('whisperProgressLabel');
  var sts  = document.getElementById('whisperSettingsStatus');

  if(state === 'loading') {
    if(wrap)  { wrap.style.display = 'flex'; }
    if(bar)   { bar.style.width = (pct||0) + '%'; }
    if(pctEl) { pctEl.textContent = (pct||0) + '%'; }
    if(lblEl) { lblEl.textContent = label || 'جارٍ التحميل...'; }
    if(btn)   { btn.disabled = true; btn.textContent = '⏳ جارٍ التحميل...'; btn.style.background = '#1e3a5f'; }
    if(sts)   { sts.innerHTML = '<span style="background:#1e3a5f;color:#93c5fd;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">⏳ جارٍ التحميل...</span>'; }
  } else if(state === 'ready') {
    if(wrap)  { wrap.style.display = 'none'; }
    if(btn)   { btn.disabled = true; btn.textContent = '✅ محمّل بالفعل'; btn.style.background = '#14532d'; }
    if(sts)   { sts.innerHTML = '<span style="background:#14532d;color:#86efac;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">✅ محمّل وجاهز</span>'; }
  } else if(state === 'error') {
    if(wrap)  { wrap.style.display = 'none'; }
    if(btn)   { btn.disabled = false; btn.textContent = '↺ إعادة المحاولة'; btn.style.background = '#7f1d1d'; }
    if(sts)   { sts.innerHTML = '<span style="background:#7f1d1d;color:#fca5a5;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">❌ فشل التحميل</span>'; }
  } else {
    if(wrap)  { wrap.style.display = 'none'; }
    if(btn)   { btn.disabled = false; btn.textContent = '⬇ تحميل النموذج الآن'; btn.style.background = '#059669'; }
  }
}

async function settingsDownloadWhisper() {
  /* لو محمّل مسبقاً */
  if(typeof _npWhisperReady !== 'undefined' && _npWhisperReady) {
    _whisperSettingsUI('ready');
    showSnack('✅ النموذج محمّل بالفعل وجاهز للاستخدام');
    return;
  }

  /* لو مفيش نت */
  if(!navigator.onLine) {
    showSnack('📶 شغّل النت لتحميل النموذج (مرة واحدة فقط ~40MB)');
    _whisperSettingsUI('error');
    return;
  }

  _whisperSettingsUI('loading', 0, 'تحميل مكتبة الذكاء الاصطناعي...');

  /* ── منع إطفاء الشاشة أثناء التحميل (Android) ── */
  var _wakeLock = null;
  try {
    if(navigator.wakeLock) _wakeLock = await navigator.wakeLock.request('screen');
  } catch(e) { /* غير مدعوم */ }
  var _releaseWakeLock = function() {
    if(_wakeLock) { try { _wakeLock.release(); } catch(e){} _wakeLock = null; }
  };

  try {
    /* الخطوة 1: تحميل transformers.js — timeout مطوّل للموبايل */
    if(!window._transformersReady) {
      await new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.type = 'module';
        s.textContent = [
          'import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";',
          'env.allowLocalModels = false;',
          'env.useBrowserCache = true;',
          'window._transformersPipeline = pipeline;',
          'window._transformersReady = true;',
          'window.dispatchEvent(new Event("transformers-ready"));'
        ].join('\n');
        document.head.appendChild(s);
        /* 90 ثانية للموبايل بدل 20 */
        var t = setTimeout(function(){ reject(new Error('timeout — النت بطيء، حاول على واي فاي')); }, 90000);
        window.addEventListener('transformers-ready', function() {
          clearTimeout(t); resolve();
        }, { once: true });
      });
    }

    /* ── اختيار النموذج: يراعي إعداد المستخدم أولاً ── */
    var isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    var savedModel = (typeof DB !== 'undefined' && DB.meta && DB.meta.whisperModel) ? DB.meta.whisperModel : null;
    /* الافتراضي: tiny.en أسرع على الموبايل (quantized)، base.en على الكمبيوتر */
    var modelId = savedModel || (isMobile ? 'Xenova/whisper-tiny' : 'Xenova/whisper-base');
    /* نستخدم النسخة المضغوطة quantized دائماً لأنها أسرع بـ 2-4x */
    var modelLabel = modelId.split('/')[1] || modelId;
    _whisperSettingsUI('loading', 3, 'تحميل نموذج Whisper (' + modelLabel + ')...');

    /* الخطوة 2: تحميل النموذج مع تتبع التقدم */
    _npWhisperPipe = await window._transformersPipeline(
      'automatic-speech-recognition',
      modelId,
      {
        dtype: 'q8',          /* quantized 8-bit — أسرع بـ 3x وأخف في الذاكرة */
        device: 'wasm',       /* WebAssembly — مدعوم على جميع الأجهزة */
        progress_callback: function(p) {
          if(p.status === 'progress' && p.total) {
            var pct = Math.round((p.loaded / p.total) * 100);
            _whisperSettingsUI('loading', pct, 'تحميل النموذج: ' + pct + '%');
            if(typeof WKS !== 'undefined') {
              WKS.npStatus = 'تحميل النموذج: ' + pct + '%';
              WKS.npStatusType = 'info';
              if(typeof _npRenderStatus === 'function') _npRenderStatus();
            }
          } else if(p.status === 'done') {
            _whisperSettingsUI('loading', 100, 'اكتمل التحميل ✅');
          }
        }
      }
    );

    /* نجح التحميل */
    _releaseWakeLock();
    if(typeof _npWhisperReady !== 'undefined') _npWhisperReady = true;
    if(typeof _npWhisperLoading !== 'undefined') _npWhisperLoading = false;
    _whisperSettingsUI('ready');
    showSnack('✅ تم تحميل نموذج الإملاء! يعمل الآن بدون إنترنت');

    if(typeof WKS !== 'undefined') {
      WKS.npStatus = '✅ النموذج جاهز — اضغط 🎤 للإملاء';
      WKS.npStatusType = 'ok';
      if(typeof _npRenderStatus === 'function') _npRenderStatus();
    }

  } catch(err) {
    _releaseWakeLock();
    if(typeof _npWhisperLoading !== 'undefined') _npWhisperLoading = false;
    _whisperSettingsUI('error');
    var errMsg = err.message || '';
    var msg;
    if(!navigator.onLine) {
      msg = '📶 انقطع النت — أعد المحاولة';
    } else if(errMsg.indexOf('timeout') >= 0) {
      msg = '⏱ انتهت المهلة — جرّب على واي فاي أو أعد المحاولة';
    } else if(errMsg.indexOf('memory') >= 0 || errMsg.indexOf('OOM') >= 0) {
      msg = '💾 ذاكرة الجهاز غير كافية — أغلق تطبيقات وأعد المحاولة';
    } else {
      msg = '❌ فشل: ' + errMsg;
    }
    showSnack(msg, 5000);
  }
}

async function settingsCheckWhisperCache() {
  /* فحص هل النموذج موجود في الكاش */
  if(typeof _npWhisperReady !== 'undefined' && _npWhisperReady) {
    showSnack('✅ النموذج محمّل في الذاكرة وجاهز');
    _whisperSettingsUI('ready');
    return;
  }
  try {
    var found = false;
    var keys = await caches.keys();
    for(var k of keys) {
      var c = await caches.open(k);
      var reqs = await c.keys();
      if(reqs.some(function(r){ return r.url && r.url.indexOf('whisper') >= 0; })) {
        found = true; break;
      }
    }
    if(found) {
      showSnack('📦 النموذج موجود في كاش المتصفح — سيعمل بدون نت');
      var sts = document.getElementById('whisperSettingsStatus');
      if(sts) sts.innerHTML = '<span style="background:#1a3a6e;color:#93c5fd;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">📦 في الكاش (يحتاج تهيئة)</span>';
    } else {
      showSnack('⬇ النموذج غير موجود — اضغط "تحميل" لتحميله');
    }
  } catch(e) {
    showSnack('⚠️ تعذّر فحص الكاش: ' + (e.message||''));
  }
}

function customToneSetDefault(id){
  _notifSettings.soundTone=id;
  _notifSave();
  _refreshCustomTonesUI();
  showSnack('✅ تم تعيين النغمة الافتراضية للإشعارات');
}

function _renderCustomTonesList(){
  if(!_customTones.length){
    return '<div style="text-align:center;color:#475569;font-size:11px;padding:14px 0;">لا توجد نغمات مخصصة — ارفع ملفاً صوتياً للبدء</div>';
  }
  var h='';
  _customTones.forEach(function(ct){
    var isDefault=(_notifSettings.soundTone===ct.id);
    var sizeLbl=(ct.size>1024*1024?(ct.size/1024/1024).toFixed(1)+' م':(ct.size/1024).toFixed(0)+' ك')+'ب';
    h+='<div style="background:#0f172a;border:1px solid '+(isDefault?'#2563eb':'#1e293b')+';border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
    h+='<span style="font-size:18px;">🎵</span>';
    h+='<div style="flex:1;min-width:0;">';
    h+='<div style="font-size:11px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(ct.name)+'</div>';
    h+='<div style="font-size:9px;color:#475569;margin-top:1px;">'+sizeLbl+(isDefault?' · <span style="color:#60a5fa;font-weight:700;">✓ الافتراضية</span>':'')+'</div>';
    h+='</div>';
    h+='<div style="display:flex;gap:5px;flex-shrink:0;">';
    h+='<button onclick="customTonePreview(\''+ct.id+'\')" title="معاينة" style="background:#1e293b;border:1px solid #334155;color:#60a5fa;border-radius:7px;padding:4px 9px;font-size:10px;cursor:pointer;font-family:inherit;">▶ معاينة</button>';
    if(!isDefault){
      h+='<button onclick="customToneSetDefault(\''+ct.id+'\')" title="تعيين كافتراضي" style="background:#1e3a5f;border:1px solid #2563eb;color:#93c5fd;border-radius:7px;padding:4px 9px;font-size:10px;cursor:pointer;font-family:inherit;">⭐ افتراضي</button>';
    }
    h+='<button onclick="customToneDelete(\''+ct.id+'\')" title="حذف" style="background:#1e293b;border:1px solid #7f1d1d;color:#ef4444;border-radius:7px;width:28px;font-size:13px;cursor:pointer;">🗑</button>';
    h+='</div>';
    h+='</div>';
  });
  return h;
}

function _refreshCustomTonesUI(){
  var el=document.getElementById('customTonesList');
  if(el) el.innerHTML=_renderCustomTonesList();
  // also refresh tone selects in alarms and notif panel
  renderNotifsPage&&renderNotifsPage();
}
function _showToast(title,desc,icon){
  var old=document.getElementById('_notifToast'); if(old) old.remove();
  var d=document.createElement('div'); d.id='_notifToast'; d.className='notif-toast';
  var ic=document.createElement('div'); ic.className='notif-toast-icon'; ic.textContent=icon;
  var bd=document.createElement('div'); bd.className='notif-toast-body';
  bd.innerHTML='<div class="notif-toast-title">'+title+'</div><div class="notif-toast-desc">'+desc+'</div>';
  var cl=document.createElement('button');
  cl.textContent='✕'; cl.style.cssText='background:none;border:none;color:#64748b;cursor:pointer;font-size:14px;';
  cl.onclick=function(){d.remove();};
  d.appendChild(ic); d.appendChild(bd); d.appendChild(cl);
  document.body.appendChild(d);
  setTimeout(function(){if(d.parentNode)d.remove();},6000);
}
function _notifSend(title,desc,icon){
  icon=icon||'🔔';
  var item={id:Date.now(),title:title,desc:desc,icon:icon,
    time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),read:false};
  _notifLog.unshift(item); if(_notifLog.length>60)_notifLog.pop();
  _notifSave(); _notifUpdateBadge();
  // Toast داخلي — يعمل دائماً بدون إذن
  if(_notifSettings.showToast) _showToast(title,desc,icon);
  // صوت — يعمل بدون إذن (يكفي أي تفاعل سابق مع الصفحة)
  if(_notifSettings.sound) _playNotifSound(_notifSettings.soundTone);
  // إشعار المتصفح — يحتاج إذناً
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    try{ new Notification(title,{body:desc,icon:'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>'+encodeURIComponent(icon)+'</text></svg>'}); }catch(e){}
  } else if(typeof Notification!=='undefined'&&Notification.permission==='default'&&!window._notifPermAsked){
    // فرصة أخيرة لطلب الإذن إذا لم يُطلب بعد
    _tryRequestNotifPermission&&_tryRequestNotifPermission();
  }
  if(typeof _currentPage!=='undefined'&&_currentPage==='notifs') _notifRefreshLog();
}

// ── Per-period settings helpers ───────────────────────
function _pKey(cls,pid){ return cls+'||'+pid; }
function _pOpt(cls,pid){
  var k=_pKey(cls,pid);
  if(!_notifSettings.perPeriod[k]){
    _notifSettings.perPeriod[k]={
      enabled:true,
      beforeMins:_notifSettings.globalBefore,
      onStart:_notifSettings.globalOnStart,
      onEnd:_notifSettings.globalOnEnd
    };
  }
  return _notifSettings.perPeriod[k];
}

// ── Get all scheduled periods (unified model) ──────────
function _getAllScheduledPeriods(){
  var result=[];
  if(!DB||!DB.schedule||!DB.schedule._shared) return result;
  var shared=DB.schedule._shared;
  var slots=shared.slots||{};
  (shared.periods||[]).forEach(function(per){
    // For each period, find which days have a class assigned
    var days=[];
    for(var di=0;di<7;di++){
      if(slots[per.id+'_d'+di]) days.push(di);
    }
    // For home page: create one item per unique class in this period's days
    var clsForDays={};
    for(var di2=0;di2<7;di2++){
      var cls=slots[per.id+'_d'+di2]||"";
      if(cls){
        if(!clsForDays[cls])clsForDays[cls]=[];
        clsForDays[cls].push(di2);
      }
    }
    Object.keys(clsForDays).forEach(function(cls){
      result.push({cls:cls,per:per,days:clsForDays[cls]});
    });
  });
  result.sort(function(a,b){
    var ta=a.per.time?a.per.time.split('-')[0].trim():'99:99';
    var tb=b.per.time?b.per.time.split('-')[0].trim():'99:99';
    return ta.localeCompare(tb);
  });
  // Merge special periods (طابور / فسحة)
  _getSpecialPeriodItems().forEach(function(sp){result.push(sp);});
  result.sort(function(a,b){
    var ta=a.per.time?a.per.time.split('-')[0].trim():'99:99';
    var tb=b.per.time?b.per.time.split('-')[0].trim():'99:99';
    return ta.localeCompare(tb);
  });
  return result;
}

// ── Parse "8:30" → minutes since midnight ────────────
function _parseTimeStr(str){
  if(!str) return null;
  var p=str.trim().split(':');
  return parseInt(p[0]||0)*60+parseInt(p[1]||0);
}

// ── Schedule checker (every minute) ──────────────────
function _notifCheckSchedule(){
  if(!_notifSettings.enabled) return;
  var now=new Date();
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
  var ourDay=jsToOur[now.getDay()];
  if(ourDay===undefined||_notifSettings.notifyDays.indexOf(ourDay)<0) return;
  var nowM=now.getHours()*60+now.getMinutes();
  var today=now.toDateString();
  _getAllScheduledPeriods().forEach(function(item){
    if(item.days.indexOf(ourDay)<0) return;
    var per=item.per; if(!per.time) return;
    var opt=_pOpt(item.cls,per.id);
    if(!opt.enabled) return;
    var parts=per.time.split('-');
    var startM=_parseTimeStr(parts[0]);
    var endM=parts[1]?_parseTimeStr(parts[1]):null;
    var spLabel=item.isSpecial?per.label+' ':''
    var lbl=(per.label||per.id)+' | '+(item.isSpecial?per.label:item.cls)+' ('+parts[0].trim()+')';
    if(opt.beforeMins>0){
      var fk='b_'+item.cls+'_'+per.id+'_'+today;
      var diff=startM-nowM;
      // نافذة 4 دقائق لاستيعاب فاصل الفحص (10 ثوانٍ) وتجنب الفوات
      var window_size=Math.min(4, opt.beforeMins);
      if(diff>=0&&diff<=opt.beforeMins&&diff>opt.beforeMins-window_size&&!_lastFiredKeys[fk]){
        _lastFiredKeys[fk]=1; _firedKeysSave();
        _notifSend('⏰ بعد '+opt.beforeMins+' دقيقة',lbl,item.isSpecial&&item.specialType==='assembly'?'🟢':item.isSpecial?'☕':'⏰');
      }
    }
    if(opt.onStart){
      var fk='s_'+item.cls+'_'+per.id+'_'+today;
      // نافذة 4 دقائق بدلاً من 2 لتجنب الفوات
      if(nowM>=startM&&nowM<=startM+4&&!_lastFiredKeys[fk]){
        _lastFiredKeys[fk]=1; _firedKeysSave(); _notifSend('🔔 بدأت الفترة',lbl,item.isSpecial&&item.specialType==='assembly'?'🟢':item.isSpecial?'☕':'🔔');
      }
    }
    if(opt.onEnd&&endM!==null){
      var fk='e_'+item.cls+'_'+per.id+'_'+today;
      // نافذة 4 دقائق بدلاً من 2 لتجنب الفوات
      if(nowM>=endM&&nowM<=endM+4&&!_lastFiredKeys[fk]){
        _lastFiredKeys[fk]=1; _firedKeysSave(); _notifSend('✅ انتهت الفترة',lbl,'✅');
      }
    }
  });
}

function initNotifications(){
  _notifLoad(); _notifUpdateBadge();
  _alarmLoad();
  _firedKeysLoad(); // استرداد المفاتيح المحفوظة
  // فحص كل 5 ثوانٍ لضمان عدم فوات أي تنبيه
  _notifTimer=setInterval(function(){ _notifCheckSchedule(); _alarmCheck(); },5000);
  _notifCheckSchedule();
  _alarmCheck();
  // لا نطلب الإذن هنا — سيُطلب عند أول تفاعل حقيقي من المستخدم
  // عند عودة الصفحة من الخلفية أو وضع السكون
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden){ _firedKeysLoad(); _notifCheckSchedule(); _alarmCheck(); }
  });
  // عند استعادة نشاط النافذة
  window.addEventListener('focus',function(){
    _firedKeysLoad(); _notifCheckSchedule(); _alarmCheck();
  });
  // كشف عودة الجهاز من وضع النوم عبر مراقبة الانحراف الزمني
  var _lastTickTime=Date.now();
  setInterval(function(){
    var now=Date.now(); var drift=now-_lastTickTime; _lastTickTime=now;
    if(drift>30000){ _firedKeysLoad(); _notifCheckSchedule(); _alarmCheck(); }
  },15000);
}

// حفظ/تحميل مفاتيح التنبيهات المُطلقة بشكل دائم لليوم الحالي
function _firedKeysSave(){
  try{
    var today=new Date().toDateString();
    var filtered={};
    Object.keys(_lastFiredKeys).forEach(function(k){ if(k.indexOf(today)>=0) filtered[k]=1; });
    Object.keys(_alarmFiredKeys).forEach(function(k){ if(k.indexOf(today)>=0) filtered['alm_'+k]=1; });
    localStorage.setItem('school_fired_keys_'+today,JSON.stringify(filtered));
    for(var i=localStorage.length-1;i>=0;i--){
      var lk=localStorage.key(i);
      if(lk&&lk.startsWith('school_fired_keys_')&&lk!=='school_fired_keys_'+today) localStorage.removeItem(lk);
    }
  }catch(e){}
}
function _firedKeysLoad(){
  try{
    var today=new Date().toDateString();
    var s=localStorage.getItem('school_fired_keys_'+today);
    if(!s) return;
    var data=JSON.parse(s);
    Object.keys(data).forEach(function(k){
      if(k.startsWith('alm_')) _alarmFiredKeys[k.slice(4)]=1;
      else _lastFiredKeys[k]=1;
    });
  }catch(e){}
}
function toggleNotifPanel(){
  var p=document.getElementById('notifPanel');
  if(!p) return;
  var isOpen=p.classList.contains('open');
  if(isOpen){ p.classList.remove('open'); }
  else {
    p.classList.add('open');
    // Render list — mark as read when user sees them
    _renderNotifPanelList();
  }
}
function _renderNotifPanelList(){
  var list=document.getElementById('notifTabNotifs');
  if(!list) return;
  // Mark all unread as read
  var changed=false;
  _notifLog.forEach(function(n){if(!n.read){n.read=true;changed=true;}});
  if(changed){_notifSave();_notifUpdateBadge();}
  list.innerHTML='';
  if(!_notifLog.length){
    list.innerHTML='<div class="notif-empty">لا توجد إشعارات</div>';
  } else {
    _notifLog.slice(0,20).forEach(function(n){
      var el=document.createElement('div');
      el.className='notif-item';
      el.innerHTML='<div class="notif-item-icon">'+n.icon+'</div>'
        +'<div class="notif-item-body">'
        +'<div class="notif-item-title">'+n.title+'</div>'
        +'<div class="notif-item-desc">'+n.desc+'</div>'
        +'<div class="notif-item-time">'+n.time+'</div>'
        +'</div>';
      list.appendChild(el);
    });
  }
}
// Close panel when clicking outside
document.addEventListener('click',function(e){
  var p=document.getElementById('notifPanel');
  var b=document.getElementById('notifBell');
  var b2=document.getElementById('subNotifBell');
  var b3=document.getElementById('bni_notifs');
  var b4=e.target.closest && e.target.closest('.home-bell');
  var clickedBell=(b&&(e.target===b||b.contains(e.target)))||(b2&&(e.target===b2||b2.contains(e.target)))||(b3&&(e.target===b3||b3.contains(e.target)))||b4;
  if(p&&p.classList.contains('open')&&!p.contains(e.target)&&!clickedBell){
    p.classList.remove('open');
  }
});
function notifSwitchTab(tab){
  var tNotifs=document.getElementById('notifTabNotifs');
  var tSettings=document.getElementById('notifTabSettings');
  var btnN=document.getElementById('ntab-notifs');
  var btnS=document.getElementById('ntab-settings');
  if(tab==='notifs'){
    if(tNotifs) tNotifs.style.display='';
    if(tSettings) tSettings.style.display='none';
    if(btnN){btnN.classList.add('active');}
    if(btnS){btnS.classList.remove('active');}
  } else {
    if(tNotifs) tNotifs.style.display='none';
    if(tSettings){
      tSettings.style.display='';
      // Render mini settings inside panel
      tSettings.innerHTML='<div style="padding:12px 14px;font-size:12px;color:#94a3b8;">للإعدادات التفصيلية افتح صفحة الإشعارات من القائمة</div>'
        +'<div style="padding:0 14px 14px;">'
        +'<button class="btn btn-success" style="font-size:12px;padding:8px 16px;border-radius:8px;font-weight:700;width:100%;" onclick="switchPage(\'notifs\');bnSetActive(\'notifs\');toggleNotifPanel();">⚙️ فتح صفحة الإشعارات</button>'
        +'</div>';
    }
    if(btnN){btnN.classList.remove('active');}
    if(btnS){btnS.classList.add('active');}
  }
}
function notifReqPerm(){
  if(typeof Notification==='undefined'){showSnack('المتصفح لا يدعم الإشعارات');return;}
  Notification.requestPermission().then(function(){renderNotifsPage();showSnack('تصريح: '+Notification.permission);});
}
function notifSetOpt(k,v){ _notifSettings[k]=v; _notifSave(); renderNotifsPage(); }
function notifToggleDay(i,on){
  var idx=_notifSettings.notifyDays.indexOf(i);
  if(on&&idx<0)_notifSettings.notifyDays.push(i);
  else if(!on&&idx>=0)_notifSettings.notifyDays.splice(idx,1);
  _notifSave(); renderNotifsPage();
}
function notifSetPeriodOpt(cls,pid,k,v){
  _pOpt(cls,pid)[k]=v; _notifSave(); renderNotifsPage();
}
function notifTestSend(){_notifSend('🔔 اختبار','هذا إشعار تجريبي من نظام المنبّه','🔔');showSnack('تم إرسال إشعار تجريبي');}
function notifClearLog(){_notifLog=[];_notifSave();_notifUpdateBadge();renderNotifsPage();}

// ── Find next upcoming period (today or future days) ─
function _getNextPeriod(){
  if(!DB||!DB.schedule) return null;
  var now=new Date();
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
  var ourDay=jsToOur[now.getDay()];
  if(ourDay===undefined) return null;
  var nowM=now.getHours()*60+now.getMinutes();
  var DAYS_FULL=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  var best=null, bestTotalMin=Infinity;
  // Check currently running first
  _getAllScheduledPeriods().forEach(function(item){
    if(item.days.indexOf(ourDay)<0||!item.per.time) return;
    var startM=_parseTimeStr(item.per.time.split('-')[0]);
    var endM=item.per.time.indexOf('-')>-1?_parseTimeStr(item.per.time.split('-')[1]):null;
    if(startM===null) return;
    if(startM<=nowM&&endM!==null&&nowM<endM){
      best={item:item,startM:startM,endM:endM,running:true,daysAhead:0,dayName:'اليوم',date:now};
    }
  });
  if(best) return best;
  // Search upcoming: today first, then next 7 days
  for(var ahead=0;ahead<=7;ahead++){
    var checkDay=(ourDay+ahead)%7;
    var checkDate=new Date(now);
    checkDate.setDate(now.getDate()+ahead);
    _getAllScheduledPeriods().forEach(function(item){
      if(item.days.indexOf(checkDay)<0||!item.per.time) return;
      var startM=_parseTimeStr(item.per.time.split('-')[0]);
      if(startM===null) return;
      // For today, must be in the future
      if(ahead===0&&startM<=nowM) return;
      var totalMin=ahead*1440+startM; // total minutes from now (approx)
      if(totalMin<bestTotalMin){
        bestTotalMin=totalMin;
        var dayName=ahead===0?'اليوم':ahead===1?'غداً':DAYS_FULL[checkDay];
        best={item:item,startM:startM,endM:null,running:false,daysAhead:ahead,dayName:dayName,date:checkDate};
        var endStr=item.per.time.indexOf('-')>-1?item.per.time.split('-')[1]:null;
        best.endM=endStr?_parseTimeStr(endStr):null;
      }
    });
    if(best&&ahead===0) break; // found something today, no need to look further
    if(best&&ahead>0) break;   // found next occurrence
  }
  return best;
}

// ── Countdown clock ───────────────────────────────────
function _startClock(){
  if(_notifClockTimer) clearInterval(_notifClockTimer);
  _notifTickClock();
  _notifClockTimer=setInterval(_notifTickClock,1000);
}
function _stopClock(){ if(_notifClockTimer){clearInterval(_notifClockTimer);_notifClockTimer=null;} }
function _notifTickClock(){
  var el=document.getElementById('notifClockEl');
  var countEl=document.getElementById('notifCountdownEl');
  var nextLblEl=document.getElementById('notifNextLblEl');
  if(!el) return;
  var now=new Date();
  el.textContent=now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var next=_getNextPeriod();
  if(!next){
    if(countEl) countEl.textContent='لا توجد فترات قادمة';
    if(nextLblEl) nextLblEl.textContent='';
    return;
  }
  var perName=(next.item.per.label||next.item.per.id)+' | '+next.item.cls;
  var timeRange=next.item.per.time||'';
  if(next.running){
    var nowSec=now.getHours()*3600+now.getMinutes()*60+now.getSeconds();
    var remSec=next.endM*60-nowSec; if(remSec<0) remSec=0;
    var mm=Math.floor(remSec/60), ss=remSec%60;
    if(countEl){
      countEl.style.color='#4ade80';
      countEl.textContent='🟢 جارية — تنتهي بعد '+mm+'د '+(ss<10?'0':'')+ss+'ث';
    }
    if(nextLblEl) nextLblEl.textContent=perName+' ('+timeRange+')';
  } else {
    // Calculate exact seconds until next period
    var targetDate=new Date(next.date);
    targetDate.setHours(Math.floor(next.startM/60), next.startM%60, 0, 0);
    var remSec2=Math.floor((targetDate-now)/1000); if(remSec2<0) remSec2=0;
    var hh=Math.floor(remSec2/3600), mm2=Math.floor((remSec2%3600)/60), ss2=remSec2%60;
    var txt='';
    if(next.daysAhead>0){
      var d3=next.date.getDate(), m3=next.date.getMonth()+1;
      txt=next.dayName+' '+(d3<10?'0'+d3:d3)+'/'+(m3<10?'0'+m3:m3)+' — ';
    }
    txt+='بعد '+(hh>0?hh+'س ':'')+mm2+'د '+(ss2<10?'0':'')+ss2+'ث';
    if(countEl){
      countEl.style.color='#f59e0b';
      countEl.textContent='⏰ '+txt;
    }
    if(nextLblEl) nextLblEl.textContent=perName+' الساعة '+timeRange.split('-')[0].trim();
  }
}

// ── Partial re-render: log only ───────────────────────
function _notifRefreshLog(){
  var logBody=document.getElementById('notifLogBody');
  if(!logBody) return;
  var logCount=document.getElementById('notifLogCount');
  if(logCount) logCount.textContent=_notifLog.length+' إشعار';
  if(!_notifLog.length){
    logBody.innerHTML='<div style="color:#475569;text-align:center;padding:24px;font-size:13px;">لا توجد إشعارات بعد</div>';
    return;
  }
  logBody.innerHTML='';
  _notifLog.forEach(function(n){
    var item=document.createElement('div');
    item.className='notif-log-item '+(n.read?'read':'unread');
    item.innerHTML='<div style="font-size:24px;line-height:1;padding-top:2px;flex-shrink:0;">'+n.icon+'</div>'
      +'<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#f1f5f9;">'+n.title+'</div>'
      +'<div style="font-size:12px;color:#64748b;margin-top:3px;">'+n.desc+'</div>'
      +'<div style="font-size:11px;color:#475569;margin-top:4px;">'+n.time+'</div></div>';
    logBody.appendChild(item);
  });
}

// ── Toggle helper ─────────────────────────────────────
function _mkToggle(checked,onchg){
  var lbl=document.createElement('label'); lbl.className='ns-toggle';
  lbl.style.cssText='width:46px;height:26px;';
  var inp=document.createElement('input'); inp.type='checkbox'; inp.checked=!!checked;
  inp.onchange=onchg;
  var sl=document.createElement('span'); sl.className='ns-toggle-slider';
  lbl.appendChild(inp); lbl.appendChild(sl);
  return lbl;
}
function _mkRow(labelTxt, right){
  var row=document.createElement('div'); row.className='notif-row';
  row.style.cssText='padding:14px 16px;';
  var sp=document.createElement('span'); sp.className='notif-row-lbl';
  sp.style.cssText='font-size:14px;color:#e2e8f0;';
  sp.textContent=labelTxt;
  row.appendChild(sp); row.appendChild(right); return row;
}

// ── Time preset dropdown ──────────────────────────────
function _mkTimeDropdown(currentVal, onSelect){
  var wrap=document.createElement('div'); wrap.style.cssText='position:relative;display:inline-block;';
  var inp=document.createElement('input');
  inp.type='text'; inp.value=currentVal||'';
  inp.placeholder='8:00-8:45';
  inp.style.cssText='background:#0f172a;border:1px solid #334155;color:#f1f5f9;border-radius:5px;'
    +'padding:3px 8px;font-size:9px;width:90px;outline:none;font-family:inherit;';
  var ddList=document.createElement('div');
  ddList.style.cssText='display:none;position:absolute;top:calc(100% + 2px);right:0;background:#1a2540;'
    +'border:1px solid #2d4a6e;border-radius:8px;z-index:999;min-width:130px;'
    +'max-height:200px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,.4);';
  _PERIOD_PRESETS.forEach(function(preset){
    var opt=document.createElement('div');
    opt.style.cssText='padding:6px 12px;font-size:9.5px;color:#94a3b8;cursor:pointer;';
    opt.textContent=preset;
    opt.onmouseover=function(){this.style.background='#1e3a5f';this.style.color='#f1f5f9';};
    opt.onmouseout=function(){this.style.background='';this.style.color='#94a3b8';};
    opt.onclick=function(){
      inp.value=preset; ddList.style.display='none'; onSelect(preset);
    };
    ddList.appendChild(opt);
  });
  inp.onfocus=function(){ddList.style.display='block';};
  inp.onblur=function(){setTimeout(function(){ddList.style.display='none';},200);};
  inp.onchange=function(){onSelect(this.value);};
  wrap.appendChild(inp); wrap.appendChild(ddList);
  return wrap;
}

// ── Main render ───────────────────────────────────────
function renderNotifsPage(){
  var root=document.getElementById('notifsPageRoot'); if(!root) return;
  _stopClock();
  _notifLog.forEach(function(n){n.read=true;}); _notifSave(); _notifUpdateBadge();
  root.innerHTML='';

  // ── شريط تحذير الإذن (يظهر فقط إذا لم يُمنح) ──────────
  if(typeof Notification!=='undefined'&&Notification.permission!=='granted'){
    var permBanner=document.createElement('div');
    var isDenied=Notification.permission==='denied';
    permBanner.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
      +'padding:10px 14px;border-radius:10px;margin-bottom:2px;'
      +(isDenied
        ?'background:#450a0a;border:1px solid #ef4444;color:#fca5a5;'
        :'background:#1c1007;border:1px solid #f59e0b;color:#fcd34d;');
    permBanner.innerHTML='<span style="font-size:18px;">'+(isDenied?'🚫':'⚠️')+'</span>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:11px;font-weight:700;">'
      +(isDenied?'إشعارات المتصفح مرفوضة':'إشعارات المتصفح غير مفعّلة')+'</div>'
      +'<div style="font-size:9px;opacity:.8;margin-top:2px;">'
      +(isDenied
        ?'لتفعيلها: اضغط على 🔒 في شريط العنوان ← الإشعارات ← سماح'
        :'الإشعارات الداخلية والصوت يعملان بدون إذن — اضغط للسماح بإشعارات المتصفح أيضاً')
      +'</div></div>'
      +(isDenied?'':'<button onclick="_tryRequestNotifPermission&&_tryRequestNotifPermission();renderNotifsPage();" '
        +'style="background:#f59e0b;color:#0f172a;border:none;border-radius:7px;padding:5px 12px;'
        +'font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;">السماح ✓</button>');
    root.appendChild(permBanner);
  }

  // Outer wrapper: full height, scrollable
  var wrap=document.createElement('div');
  wrap.style.cssText='padding:14px 14px 30px;display:flex;flex-direction:column;gap:14px;width:100%;box-sizing:border-box;';

  // ══ CLOCK CARD ═══════════════════════════════════
  var clockCard=document.createElement('div');
  clockCard.className='notif-card';
  clockCard.style.cssText='background:linear-gradient(135deg,#0c1829,#1e3a5f);';
  var clockBody=document.createElement('div');
  clockBody.style.cssText='padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;';
  var clockEl=document.createElement('div');
  clockEl.id='notifClockEl';
  clockEl.style.cssText='font-size:42px;font-weight:900;color:#60a5fa;letter-spacing:3px;font-variant-numeric:tabular-nums;';
  clockEl.textContent='--:--:--';
  var nextLblEl=document.createElement('div');
  nextLblEl.id='notifNextLblEl';
  nextLblEl.style.cssText='font-size:13px;color:#94a3b8;margin-top:2px;text-align:center;';
  var countEl=document.createElement('div');
  countEl.id='notifCountdownEl';
  countEl.style.cssText='font-size:16px;font-weight:700;color:#f59e0b;margin-top:4px;text-align:center;';
  clockBody.appendChild(clockEl); clockBody.appendChild(nextLblEl); clockBody.appendChild(countEl);
  clockCard.appendChild(clockBody);
  wrap.appendChild(clockCard);
  _startClock();

  // ══ GLOBAL SETTINGS CARD ═════════════════════════
  var card=document.createElement('div'); card.className='notif-card';
  var hdr=document.createElement('div'); hdr.className='notif-card-hdr';
  var htitle=document.createElement('span'); htitle.textContent='⚙️ الإعدادات العامة';
  htitle.style.cssText='font-size:14px;font-weight:800;';
  var permTxt=typeof Notification==='undefined'?'غير مدعوم':
    Notification.permission==='granted'?'✅ ممنوح':
    Notification.permission==='denied'?'❌ مرفوض':'⚠️ لم يُطلب';
  var hperm=document.createElement('span');
  hperm.style.cssText='font-size:11px;color:#64748b;background:#0f172a;padding:3px 9px;border-radius:8px;';
  hperm.textContent='تصريح: '+permTxt;
  hdr.appendChild(htitle); hdr.appendChild(hperm); card.appendChild(hdr);

  // ── صف الاختبار ──
  var testRow=document.createElement('div'); testRow.className='notif-row';
  testRow.style.cssText='padding:12px 16px;gap:8px;flex-wrap:wrap;background:rgba(37,99,235,.08);border-radius:10px;margin:6px 0;';
  var testLbl=document.createElement('span'); testLbl.style.cssText='font-size:12px;color:#94a3b8;flex:1;';
  testLbl.textContent='🧪 اختبار الإشعارات';
  var testSndBtn=document.createElement('button');
  testSndBtn.textContent='▶ اختبار الصوت';
  testSndBtn.style.cssText='background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;border-radius:8px;padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;';
  testSndBtn.onclick=function(){ _playNotifSound(_notifSettings.soundTone||'chime_short'); };
  var testNotifBtn=document.createElement('button');
  testNotifBtn.textContent='🔔 اختبار إشعار';
  testNotifBtn.style.cssText='background:#064e3b;border:1px solid #10b981;color:#6ee7b7;border-radius:8px;padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;';
  testNotifBtn.onclick=function(){ _notifSend('🔔 اختبار','هذا اختبار للتأكد من عمل الإشعارات','🔔'); };
  var reqPermBtn=document.createElement('button');
  reqPermBtn.textContent='📋 طلب إذن';
  reqPermBtn.style.cssText='background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:8px;padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;';
  reqPermBtn.onclick=function(){
    if(typeof Notification!=='undefined'&&Notification.permission!=='granted'){
      Notification.requestPermission().then(function(){ renderNotifsPage(); });
    } else { showSnack('✅ الإذن ممنوح مسبقاً'); }
  };
  testRow.appendChild(testLbl); testRow.appendChild(testSndBtn); testRow.appendChild(testNotifBtn); testRow.appendChild(reqPermBtn);
  card.appendChild(testRow);

  // Global toggles — bigger rows
  var s=_notifSettings;
  [['enabled','تفعيل الإشعارات'],['sound','صوت التنبيه'],['showToast','إشعار منبثق']
  ].forEach(function(t){
    card.appendChild(_mkRow(t[1],_mkToggle(s[t[0]],function(k){return function(){notifSetOpt(k,this.checked);};}(t[0]))));
  });

  // Days
  var dayRow=document.createElement('div'); dayRow.className='notif-row';
  dayRow.style.cssText='flex-direction:column;align-items:flex-start;gap:10px;padding:14px 16px;';
  var dayLbl=document.createElement('span'); dayLbl.className='notif-row-lbl'; dayLbl.textContent='أيام التنبيه';
  var dayWrap=document.createElement('div'); dayWrap.style.cssText='display:flex;flex-wrap:wrap;gap:7px;';
  DAYS_AR.forEach(function(d,i){
    var on=s.notifyDays.indexOf(i)>=0;
    var lbl=document.createElement('label');
    lbl.style.cssText='display:inline-flex;align-items:center;gap:6px;font-size:13px;color:'+(on?'#bfdbfe':'#94a3b8')+';'
      +'cursor:pointer;background:'+(on?'#1e3a5f':'#1e293b')+';border:1.5px solid '+(on?'#3b82f6':'#334155')
      +';border-radius:8px;padding:7px 13px;transition:all .15s;';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=on;
    cb.style.cssText='accent-color:#3b82f6;width:16px;height:16px;cursor:pointer;';
    cb.onchange=(function(idx,el){return function(){
      el.style.background=this.checked?'#1e3a5f':'#1e293b';
      el.style.borderColor=this.checked?'#3b82f6':'#334155';
      el.style.color=this.checked?'#bfdbfe':'#94a3b8';
      notifToggleDay(idx,this.checked);
    };})(i,lbl);
    lbl.appendChild(cb); lbl.appendChild(document.createTextNode(d));
    dayWrap.appendChild(lbl);
  });
  dayRow.appendChild(dayLbl); dayRow.appendChild(dayWrap); card.appendChild(dayRow);

  // Buttons row
  var btnRow=document.createElement('div'); btnRow.className='notif-row';
  btnRow.style.cssText='gap:10px;justify-content:flex-start;flex-wrap:wrap;padding:14px 16px;';
  function mkBtn(txt,cls,fn){
    var b=document.createElement('button'); b.className='btn '+cls;
    b.style.cssText='font-size:12px;padding:8px 16px;border-radius:8px;font-weight:700;';
    b.textContent=txt; b.onclick=fn; return b;
  }

  // ── Tone selector row ──────────────────────────────
  var toneRow=document.createElement('div'); toneRow.className='notif-row';
  toneRow.style.cssText='flex-direction:column;align-items:flex-start;gap:10px;padding:14px 16px;';
  var toneLbl=document.createElement('span'); toneLbl.className='notif-row-lbl';
  toneLbl.style.cssText='font-size:14px;color:#e2e8f0;font-weight:700;';
  toneLbl.textContent='🎵 نغمة التنبيه';
  var toneGrid=document.createElement('div');
  toneGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;';
  Object.keys(_NOTIF_TONES).forEach(function(id){
    var info=_NOTIF_TONES[id];
    var isActive=(_notifSettings.soundTone||'chime_short')===id;
    var tileWrap=document.createElement('div');
    tileWrap.style.cssText='display:flex;align-items:center;gap:6px;';
    var tile=document.createElement('button');
    tile.dataset.toneId=id;
    tile.style.cssText='flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:3px;'
      +'padding:10px 12px;border-radius:10px;cursor:pointer;transition:all .15s;font-family:inherit;text-align:right;'
      +'background:'+(isActive?'#1e3a5f':'#0f172a')+';'
      +'border:1.5px solid '+(isActive?'#3b82f6':'#1e293b')+';';
    tile.innerHTML='<span style="font-size:12px;font-weight:700;color:'+(isActive?'#93c5fd':'#cbd5e1')+';">'
      +info[0]+'</span>'
      +'<span style="font-size:9px;color:#64748b;">⏱ '+info[1]+'</span>';
    tile.onclick=(function(tid,btn){return function(){
      _notifSettings.soundTone=tid; _notifSave();
      // Update all tiles style
      toneGrid.querySelectorAll('button[data-tone-id]').forEach(function(b){
        var active=b.dataset.toneId===tid;
        b.style.background=active?'#1e3a5f':'#0f172a';
        b.style.borderColor=active?'#3b82f6':'#1e293b';
        b.querySelector('span').style.color=active?'#93c5fd':'#cbd5e1';
      });
      // Play preview
      _playNotifSound(tid);
    };})(id,tile);
    // Preview play button
    var prev=document.createElement('button');
    prev.title='معاينة';
    prev.style.cssText='width:28px;height:28px;border-radius:8px;border:1px solid #1e293b;'
      +'background:#0f172a;color:#60a5fa;font-size:13px;cursor:pointer;flex-shrink:0;'
      +'display:flex;align-items:center;justify-content:center;';
    prev.textContent='▶';
    prev.onclick=(function(tid){return function(e){e.stopPropagation();_playNotifSound(tid);};})(id);
    tileWrap.appendChild(tile); tileWrap.appendChild(prev);
    toneGrid.appendChild(tileWrap);
  });
  toneRow.appendChild(toneLbl); toneRow.appendChild(toneGrid);
  card.appendChild(toneRow);

  btnRow.appendChild(mkBtn('🔑 طلب تصريح','btn-primary',notifReqPerm));
  btnRow.appendChild(mkBtn('🔔 اختبار','btn-success',notifTestSend));
  btnRow.appendChild(mkBtn('🗑 مسح السجل','btn-danger',notifClearLog));
  card.appendChild(btnRow);
  wrap.appendChild(card);

  // ══ PER-PERIOD CARD ══════════════════════════════
  var allPeriods=_getAllScheduledPeriods();
  // Sort by real minutes until next occurrence across all days
  var now=new Date();
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
  var ourDay=jsToOur[now.getDay()];
  var nowM=now.getHours()*60+now.getMinutes();
  function _periodSortKey(item){
    var startM=item.per.time?_parseTimeStr(item.per.time.split('-')[0]):null;
    if(startM===null) return 999999;
    var endStr=(item.per.time&&item.per.time.indexOf('-')>-1)?item.per.time.split('-')[1]:null;
    var endM=endStr?_parseTimeStr(endStr):startM+45;
    // Currently running → absolute top
    if(ourDay!==undefined&&item.days.indexOf(ourDay)>=0&&startM<=nowM&&endM>nowM) return -1;
    // Find minimum minutes until next occurrence
    var minMin=999998;
    item.days.forEach(function(d){
      if(ourDay===undefined){minMin=Math.min(minMin,startM);return;}
      // days ahead until this weekday
      var ahead=(d-ourDay+7)%7;
      if(ahead===0&&startM<=nowM) ahead=7; // same day but passed → next week
      var minsUntil=ahead*1440+(startM-nowM);
      if(minsUntil<minMin) minMin=minsUntil;
    });
    return minMin;
  }
  allPeriods.sort(function(a,b){ return _periodSortKey(a)-_periodSortKey(b); });
  var perCard=document.createElement('div'); perCard.className='notif-card';
  var perHdr=document.createElement('div'); perHdr.className='notif-card-hdr';
  perHdr.innerHTML='<span style="font-size:14px;font-weight:800;">📅 إعدادات الفترات</span><span style="font-size:11px;color:#64748b;">تخصيص لكل فترة</span>';
  perCard.appendChild(perHdr);

  if(!allPeriods.length){
    var noSched=document.createElement('div');
    noSched.style.cssText='padding:20px;text-align:center;color:#475569;font-size:13px;';
    noSched.textContent='لا توجد فترات — أضف فترات من صفحة الجدول أولاً';
    perCard.appendChild(noSched);
  } else {
    var DAYS_NAMES=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
    var jsToOurP={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
    var nowP=new Date();
    var ourDayP=jsToOurP[nowP.getDay()];
    var nowMP=nowP.getHours()*60+nowP.getMinutes();

    function getNextOccurrence(item){
      var startM=item.per.time?_parseTimeStr(item.per.time.split('-')[0]):null;
      if(startM===null) return null;
      var endStr=(item.per.time&&item.per.time.indexOf('-')>-1)?item.per.time.split('-')[1]:null;
      var endM=endStr?_parseTimeStr(endStr):null;
      if(ourDayP!==undefined&&item.days.indexOf(ourDayP)>=0&&startM<=nowMP&&endM!==null&&nowMP<endM)
        return {running:true,startM:startM,endM:endM,minsUntil:-1,daysAhead:0,dayName:'اليوم',date:new Date(nowP)};
      for(var ahead=0;ahead<=7;ahead++){
        var checkDay=(ourDayP!==undefined)?(ourDayP+ahead)%7:ahead%7;
        if(item.days.indexOf(checkDay)<0) continue;
        var minsUntil=ahead*1440+(startM-nowMP);
        if(minsUntil<=0) continue;
        var d=new Date(nowP); d.setDate(nowP.getDate()+ahead);
        var dayName=ahead===0?'اليوم':ahead===1?'غداً':DAYS_NAMES[checkDay];
        return {running:false,startM:startM,endM:endM,minsUntil:minsUntil,daysAhead:ahead,dayName:dayName,date:d};
      }
      return null;
    }

    allPeriods.forEach(function(item){ item._occ=getNextOccurrence(item); });
    allPeriods.sort(function(a,b){
      var ma=a._occ?a._occ.minsUntil:999999;
      var mb=b._occ?b._occ.minsUntil:999999;
      return ma-mb;
    });

    allPeriods.forEach(function(item,idx){
      var per=item.per, cls=item.cls;
      var opt=_pOpt(cls,per.id);
      var occ=item._occ;
      var isAssembly=item.isSpecial&&item.specialType==='assembly';
      var isBreak=item.isSpecial&&item.specialType==='break';
      var spColor=isAssembly?'#34d399':isBreak?'#fbbf24':null;
      var spBg=isAssembly?'rgba(16,185,129,.08)':isBreak?'rgba(251,191,36,.06)':null;

      var pBlock=document.createElement('div');
      pBlock.style.cssText='border-bottom:1px solid #1e293b;padding:14px 16px;'+(spBg?'background:'+spBg+';':'');

      // Row 1: rank + name + countdown
      var row1=document.createElement('div');
      row1.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;';

      var rankBadge=document.createElement('div');
      rankBadge.style.cssText='font-size:13px;font-weight:900;color:#475569;background:#0f172a;border-radius:6px;padding:3px 9px;flex-shrink:0;';
      rankBadge.textContent='#'+(idx+1);

      var nameLbl=document.createElement('div');
      nameLbl.style.cssText='flex:1;font-size:13px;font-weight:800;color:'+(spColor||'#f1f5f9')+';';
      nameLbl.textContent=(per.label||per.id)+(item.isSpecial?'':' — '+cls);

      var cdBadge=document.createElement('div');
      var cdColor,cdBg,cdText;
      if(!occ){
        cdColor='#f87171'; cdBg='#1f0707'; cdText='⚠️ لا يوجد وقت';
      } else if(occ.running){
        var nowPSec=nowP.getHours()*3600+nowP.getMinutes()*60+nowP.getSeconds();
        var remSec=occ.endM*60-nowPSec; if(remSec<0)remSec=0;
        var rm=Math.floor(remSec/60),rs=remSec%60;
        cdColor='#4ade80'; cdBg='#052e16';
        cdText='🟢 جارية — تنتهي بعد '+rm+'د '+(rs<10?'0':'')+rs+'ث';
      } else {
        var tot=occ.minsUntil;
        var hh=Math.floor(tot/60),mm=tot%60;
        var timeStr=hh>0?hh+'س '+mm+'د':mm+' دقيقة';
        var d2=occ.date.getDate(),m2=occ.date.getMonth()+1;
        var dateStr=(d2<10?'0'+d2:d2)+'/'+(m2<10?'0'+m2:m2);
        cdColor='#fbbf24'; cdBg='#1c1007';
        cdText='⏰ '+occ.dayName+' '+dateStr+' — بعد '+timeStr;
      }
      cdBadge.style.cssText='font-size:11px;font-weight:700;color:'+cdColor+';background:'+cdBg+';border:1px solid '+cdColor+'44;border-radius:8px;padding:5px 12px;white-space:nowrap;';
      cdBadge.textContent=cdText;
      row1.appendChild(rankBadge); row1.appendChild(nameLbl); row1.appendChild(cdBadge);
      pBlock.appendChild(row1);

      // Row 2: time tag + day chips
      var row2=document.createElement('div');
      row2.style.cssText='display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
      var timeTag=document.createElement('span');
      timeTag.style.cssText='font-size:12px;font-weight:700;color:#60a5fa;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:4px 10px;';
      timeTag.textContent='🕐 '+(per.time||'—');
      row2.appendChild(timeTag);
      for(var di=0;di<7;di++){
        var isActive=item.days.indexOf(di)>=0;
        var isToday=(di===ourDayP);
        var isNext=(occ&&!occ.running&&ourDayP!==undefined&&((ourDayP+occ.daysAhead)%7)===di&&occ.daysAhead>0);
        var chip=document.createElement('span');
        var cs='font-size:11px;border-radius:6px;padding:3px 8px;font-weight:700;';
        if(isActive&&isToday)      cs+='background:#1e3a5f;color:#f1f5f9;border:2px solid #60a5fa;';
        else if(isActive&&isNext)  cs+='background:#1c1007;color:#fbbf24;border:2px solid #f59e0b;';
        else if(isActive)          cs+='background:#1e3a5f;color:#93c5fd;border:1px solid #2d5fa6;';
        else                       cs+='background:#0f172a;color:#334155;border:1px solid #1e293b;';
        chip.style.cssText=cs;
        chip.textContent=DAYS_NAMES[di];
        row2.appendChild(chip);
      }
      pBlock.appendChild(row2);

      // Row 3: notification controls
      var row3=document.createElement('div');
      row3.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#0f172a;border-radius:8px;padding:10px 12px;';
      function mkChk(label,checked,color,onChange){
        var lbl=document.createElement('label');
        lbl.style.cssText='display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;cursor:pointer;';
        var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=checked;
        cb.style.cssText='accent-color:'+color+';width:15px;height:15px;cursor:pointer;';
        cb.onchange=onChange; lbl.appendChild(cb); lbl.appendChild(document.createTextNode(label)); return lbl;
      }
      row3.appendChild(mkChk('تفعيل',opt.enabled,'#2563eb',(function(c,p){return function(){notifSetPeriodOpt(c,p,'enabled',this.checked);};})(cls,per.id)));
      var selWrap=document.createElement('div'); selWrap.style.cssText='display:flex;align-items:center;gap:5px;';
      var selLbl=document.createElement('span'); selLbl.style.cssText='font-size:12px;color:#64748b;'; selLbl.textContent='قبل:';
      var sel=document.createElement('select');
      sel.style.cssText='background:#1e293b;border:1px solid #334155;color:#f1f5f9;border-radius:5px;padding:4px 8px;font-size:11px;font-family:inherit;outline:none;';
      [0,2,3,5,10,15].forEach(function(v){
        var o=document.createElement('option'); o.value=v;
        o.textContent=v===0?'بدون':'قبل '+v+'د';
        if(opt.beforeMins===v)o.selected=true; sel.appendChild(o);
      });
      sel.onchange=(function(c,p){return function(){notifSetPeriodOpt(c,p,'beforeMins',Number(this.value));};})(cls,per.id);
      selWrap.appendChild(selLbl); selWrap.appendChild(sel); row3.appendChild(selWrap);
      row3.appendChild(mkChk('عند البدء',opt.onStart,'#22c55e',(function(c,p){return function(){notifSetPeriodOpt(c,p,'onStart',this.checked);};})(cls,per.id)));
      row3.appendChild(mkChk('عند الانتهاء',opt.onEnd,'#f59e0b',(function(c,p){return function(){notifSetPeriodOpt(c,p,'onEnd',this.checked);};})(cls,per.id)));
      pBlock.appendChild(row3);
      perCard.appendChild(pBlock);
    });
  }
  wrap.appendChild(perCard);


  // ══ LOG CARD ═════════════════════════════════════
  var logCard=document.createElement('div'); logCard.className='notif-card';
  var logHdr=document.createElement('div'); logHdr.className='notif-card-hdr';
  logHdr.innerHTML='<span style="font-size:14px;font-weight:800;">🔔 سجل الإشعارات</span><span id="notifLogCount" style="font-size:11px;color:#64748b;background:#0f172a;padding:3px 9px;border-radius:8px;">'+_notifLog.length+' إشعار</span>';
  logCard.appendChild(logHdr);
  var logBody=document.createElement('div');
  logBody.id='notifLogBody';
  logBody.style.cssText='display:flex;flex-direction:column;padding:10px;gap:7px;';
  logCard.appendChild(logBody);

  // ══ ALARMS CARD ══════════════════════════════════
  var alarmCard=document.createElement('div'); alarmCard.className='notif-card';
  alarmCard.id='alarmManagerCard';
  var alarmHdr=document.createElement('div'); alarmHdr.className='notif-card-hdr';
  alarmHdr.innerHTML='<span style="font-size:14px;font-weight:800;">⏰ المنبهات</span>'
    +'<button onclick="_alarmOpenForm(null)" style="background:#2563eb;border:none;color:#fff;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">+ إضافة منبه</button>';
  alarmCard.appendChild(alarmHdr);
  var alarmBody=document.createElement('div');
  alarmBody.id='alarmListBody';
  alarmBody.style.cssText='display:flex;flex-direction:column;padding:10px;gap:8px;';
  alarmCard.appendChild(alarmBody);
  wrap.appendChild(alarmCard);

  wrap.appendChild(logCard);
  root.appendChild(wrap);
  _notifRefreshLog();
  _alarmRenderList();
}

// ══════════════════════════════════════════════════════
// ALARM SYSTEM
// ══════════════════════════════════════════════════════
var _alarms=[];
var _alarmFiredKeys={};

function _alarmLoad(){
  try{
    var s=localStorage.getItem('school_alarms');
    if(s) _alarms=JSON.parse(s);
  }catch(e){_alarms=[];}
}
function _alarmSave(){
  try{ localStorage.setItem('school_alarms',JSON.stringify(_alarms)); }catch(e){}
}
function _alarmNextId(){
  return 'alm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
}

// ── Check alarms every 30s ────────────────────────────
function _alarmCheck(){
  var now=new Date();
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
  var ourDay=jsToOur[now.getDay()];
  var nowM=now.getHours()*60+now.getMinutes();
  var today=now.toDateString();
  _alarms.forEach(function(alm){
    if(!alm.enabled) return;
    var almM=alm.hour*60+alm.minute;
    // days check
    var dayMatch=false;
    if(alm.days&&alm.days.length>0){
      dayMatch=alm.days.indexOf(ourDay)>=0;
    } else {
      dayMatch=true; // every day
    }
    if(!dayMatch) return;
    var fk=alm.id+'_'+today;
    if(nowM>=almM&&nowM<=almM+4&&!_alarmFiredKeys[fk]){
      _alarmFiredKeys[fk]=1; _firedKeysSave();
      var title='⏰ '+(alm.label||'منبه');
      var desc=alm.message||('حان وقت '+_alarmTimeStr(alm));
      _notifSend(title,desc,'⏰');
      _playNotifSound(alm.tone||_notifSettings.soundTone||'chime_short');
      // Show prominent alarm modal
      _alarmShowModal(alm);
    }
  });
}
function _alarmTimeStr(alm){
  var h=String(alm.hour).padStart(2,'0');
  var m=String(alm.minute).padStart(2,'0');
  return h+':'+m;
}
function _alarmDaysLabel(alm){
  if(!alm.days||alm.days.length===0) return 'يومياً';
  if(alm.days.length===7) return 'يومياً';
  return alm.days.map(function(d){return DAYS_AR[d];}).join(' - ');
}

// ── Modal shown when alarm fires ─────────────────────
function _alarmShowModal(alm){
  var old=document.getElementById('_alarmModal'); if(old) old.remove();
  var overlay=document.createElement('div');
  overlay.id='_alarmModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;';
  var box=document.createElement('div');
  box.style.cssText='background:#0f172a;border:2px solid #2563eb;border-radius:18px;padding:28px 24px;min-width:270px;max-width:320px;text-align:center;box-shadow:0 0 40px rgba(37,99,235,.4);';
  box.innerHTML='<div style="font-size:48px;margin-bottom:10px;">⏰</div>'
    +'<div style="font-size:18px;font-weight:900;color:#f1f5f9;margin-bottom:6px;">'+(alm.label||'منبه')+'</div>'
    +'<div style="font-size:32px;font-weight:900;color:#60a5fa;letter-spacing:3px;margin-bottom:8px;">'+_alarmTimeStr(alm)+'</div>'
    +(alm.message?'<div style="font-size:13px;color:#94a3b8;margin-bottom:16px;line-height:1.5;">'+alm.message+'</div>':'<div style="margin-bottom:16px;"></div>')
    +'<div style="font-size:10px;color:#475569;margin-bottom:16px;">'+_alarmDaysLabel(alm)+'</div>'
    +'<button onclick="document.getElementById(\'_alarmModal\').remove();_playNotifSound(\'chime_short\');" style="background:#2563eb;border:none;color:#fff;border-radius:10px;padding:12px 32px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;width:100%;">إيقاف ✓</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // Auto close after 60s
  setTimeout(function(){var m=document.getElementById('_alarmModal');if(m)m.remove();},60000);
}

// ── Render alarm list in notifs page ─────────────────
function _alarmRenderList(){
  var body=document.getElementById('alarmListBody'); if(!body) return;
  body.innerHTML='';
  if(!_alarms.length){
    body.innerHTML='<div style="text-align:center;color:#475569;font-size:12px;padding:16px;">لا توجد منبهات — اضغط «+ إضافة منبه»</div>';
    return;
  }
  _alarms.slice().sort(function(a,b){return (a.hour*60+a.minute)-(b.hour*60+b.minute);}).forEach(function(alm){
    var row=document.createElement('div');
    row.style.cssText='background:#0f172a;border:1px solid '+(alm.enabled?'#1e3a5f':'#1e293b')+';border-radius:12px;padding:12px 14px;'
      +'display:flex;align-items:center;gap:10px;transition:border-color .2s;';
    // toggle
    var tog=document.createElement('label');
    tog.style.cssText='position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=alm.enabled;
    cb.style.cssText='opacity:0;width:0;height:0;';
    cb.onchange=(function(id){return function(){
      var a=_alarms.find(function(x){return x.id===id;});
      if(a){a.enabled=this.checked;_alarmSave();_alarmRenderList();_alarmUpdateHomeCard();}
    };})(alm.id);
    var slider=document.createElement('span');
    slider.style.cssText='position:absolute;cursor:pointer;inset:0;border-radius:20px;transition:.3s;'
      +'background:'+(alm.enabled?'#2563eb':'#334155')+';';
    var knob=document.createElement('span');
    knob.style.cssText='position:absolute;content:"";height:14px;width:14px;right:'+(alm.enabled?'3px':'19px')+';bottom:3px;'
      +'background:#fff;border-radius:50%;transition:.3s;';
    slider.appendChild(knob); tog.appendChild(cb); tog.appendChild(slider);
    // info
    var info=document.createElement('div'); info.style.cssText='flex:1;min-width:0;';
    info.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      +'<span style="font-size:20px;font-weight:900;color:'+(alm.enabled?'#60a5fa':'#475569')+';">'+_alarmTimeStr(alm)+'</span>'
      +'<span style="font-size:11px;font-weight:700;color:'+(alm.enabled?'#f1f5f9':'#64748b')+';">'+(alm.label||'منبه')+'</span>'
      +'</div>'
      +'<div style="font-size:9px;color:#475569;margin-top:3px;">'+_alarmDaysLabel(alm)
      +(alm.tone?'  ·  '+(_NOTIF_TONES[alm.tone]?_NOTIF_TONES[alm.tone][0]:''):'')
      +(alm.message?'  ·  '+alm.message.slice(0,30):'')
      +'</div>';
    // buttons
    var acts=document.createElement('div'); acts.style.cssText='display:flex;gap:5px;flex-shrink:0;';
    var editBtn=document.createElement('button');
    editBtn.textContent='✏️';
    editBtn.title='تعديل';
    editBtn.style.cssText='background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:13px;';
    editBtn.onclick=(function(id){return function(){_alarmOpenForm(id);};})(alm.id);
    var delBtn=document.createElement('button');
    delBtn.textContent='🗑';
    delBtn.title='حذف';
    delBtn.style.cssText='background:#1e293b;border:1px solid #334155;color:#ef4444;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:13px;';
    delBtn.onclick=(function(id){return function(){
      if(confirm('حذف هذا المنبه؟')){
        _alarms=_alarms.filter(function(x){return x.id!==id;});
        _alarmSave();_alarmRenderList();_alarmUpdateHomeCard();
      }
    };})(alm.id);
    acts.appendChild(editBtn); acts.appendChild(delBtn);
    row.appendChild(tog); row.appendChild(info); row.appendChild(acts);
    body.appendChild(row);
  });
}

// ── Add / Edit form modal ─────────────────────────────
function _alarmOpenForm(editId){
  var existing=editId?_alarms.find(function(a){return a.id===editId;}):null;
  var old=document.getElementById('_alarmFormModal'); if(old) old.remove();
  var overlay=document.createElement('div');
  overlay.id='_alarmFormModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99990;display:flex;align-items:flex-end;justify-content:center;';

  var sheet=document.createElement('div');
  sheet.style.cssText='background:#0f172a;border-top:2px solid #2563eb;border-radius:20px 20px 0 0;'
    +'padding:20px 18px 32px;width:100%;max-width:480px;box-sizing:border-box;';

  var title=document.createElement('div');
  title.style.cssText='font-size:15px;font-weight:900;color:#f1f5f9;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;';
  title.innerHTML=(editId?'✏️ تعديل منبه':'➕ منبه جديد')
    +'<button onclick="document.getElementById(\'_alarmFormModal\').remove()" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;">✕</button>';

  // Time picker
  var timeRow=document.createElement('div');
  timeRow.style.cssText='display:flex;gap:10px;align-items:center;margin-bottom:14px;';
  var timeLabel=document.createElement('div');
  timeLabel.style.cssText='font-size:12px;color:#94a3b8;width:60px;flex-shrink:0;';
  timeLabel.textContent='⏰ الوقت';
  var hourSel=document.createElement('select');
  var minSel=document.createElement('select');
  [hourSel,minSel].forEach(function(s){
    s.style.cssText='background:#1e293b;border:1px solid #334155;color:#f1f5f9;border-radius:8px;padding:8px 10px;font-size:16px;font-weight:700;flex:1;font-family:inherit;';
  });
  for(var h=0;h<24;h++){var o=document.createElement('option');o.value=h;o.textContent=String(h).padStart(2,'0');if(existing&&existing.hour===h)o.selected=true;hourSel.appendChild(o);}
  for(var m=0;m<60;m+=5){var o2=document.createElement('option');o2.value=m;o2.textContent=String(m).padStart(2,'0');if(existing&&existing.minute===m)o2.selected=true;minSel.appendChild(o2);}
  var timeSep=document.createElement('span'); timeSep.textContent=':'; timeSep.style.cssText='font-size:20px;font-weight:900;color:#60a5fa;';
  timeRow.appendChild(timeLabel); timeRow.appendChild(hourSel); timeRow.appendChild(timeSep); timeRow.appendChild(minSel);

  // Label
  var labelRow=_alarmFormField('🏷 الاسم','text',existing?existing.label:'','مثال: الطابور الصباحي');
  var labelInp=labelRow.querySelector('input');

  // Message
  var msgRow=_alarmFormField('💬 رسالة','text',existing?existing.message:'','رسالة تظهر عند التنبيه (اختياري)');
  var msgInp=msgRow.querySelector('input');

  // Tone selector
  var toneRow=document.createElement('div');
  toneRow.style.cssText='margin-bottom:14px;';
  var toneLbl=document.createElement('div');
  toneLbl.style.cssText='font-size:12px;color:#94a3b8;margin-bottom:8px;';
  toneLbl.textContent='🎵 النغمة';
  var toneSel=document.createElement('select');
  toneSel.style.cssText='background:#1e293b;border:1px solid #334155;color:#f1f5f9;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;width:100%;';
  Object.keys(_NOTIF_TONES).forEach(function(id){
    var opt=document.createElement('option');
    opt.value=id;
    opt.textContent=_NOTIF_TONES[id][0]+' ('+_NOTIF_TONES[id][1]+')';
    if(existing&&existing.tone===id) opt.selected=true;
    else if(!existing&&id===(_notifSettings.soundTone||'chime_short')) opt.selected=true;
    toneSel.appendChild(opt);
  });
  var prevToneBtn=document.createElement('button');
  prevToneBtn.textContent='▶ معاينة';
  prevToneBtn.style.cssText='margin-top:6px;background:#1e293b;border:1px solid #334155;color:#60a5fa;border-radius:8px;padding:6px 14px;font-size:11px;cursor:pointer;font-family:inherit;';
  prevToneBtn.onclick=function(){_playNotifSound(toneSel.value);};
  toneRow.appendChild(toneLbl); toneRow.appendChild(toneSel); toneRow.appendChild(prevToneBtn);

  // Days
  var daysRow=document.createElement('div');
  daysRow.style.cssText='margin-bottom:16px;';
  var daysLbl=document.createElement('div');
  daysLbl.style.cssText='font-size:12px;color:#94a3b8;margin-bottom:8px;';
  daysLbl.textContent='📅 الأيام';
  var daysWrap=document.createElement('div');
  daysWrap.style.cssText='display:flex;flex-wrap:wrap;gap:6px;';
  var dayCbs=[];
  DAYS_AR.forEach(function(d,i){
    var on=existing?existing.days.indexOf(i)>=0:true;
    var lbl=document.createElement('label');
    lbl.style.cssText='display:inline-flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;'
      +'background:'+(on?'#1e3a5f':'#1e293b')+';border:1.5px solid '+(on?'#3b82f6':'#334155')
      +';border-radius:8px;padding:6px 10px;color:'+(on?'#bfdbfe':'#94a3b8')+';transition:all .15s;';
    var cb2=document.createElement('input'); cb2.type='checkbox'; cb2.checked=on; cb2.value=i;
    cb2.style.cssText='accent-color:#3b82f6;width:13px;height:13px;';
    cb2.onchange=(function(el){return function(){
      el.style.background=this.checked?'#1e3a5f':'#1e293b';
      el.style.borderColor=this.checked?'#3b82f6':'#334155';
      el.style.color=this.checked?'#bfdbfe':'#94a3b8';
    };})(lbl);
    lbl.appendChild(cb2); lbl.appendChild(document.createTextNode(d));
    dayCbs.push(cb2); daysWrap.appendChild(lbl);
  });
  daysRow.appendChild(daysLbl); daysRow.appendChild(daysWrap);

  // Save button
  var saveBtn=document.createElement('button');
  saveBtn.textContent=editId?'💾 حفظ التعديل':'✅ إضافة المنبه';
  saveBtn.style.cssText='width:100%;background:#2563eb;border:none;color:#fff;border-radius:12px;'
    +'padding:14px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:4px;';
  saveBtn.onclick=function(){
    var h=parseInt(hourSel.value);
    var mn=parseInt(minSel.value);
    var days=dayCbs.filter(function(c){return c.checked;}).map(function(c){return parseInt(c.value);});
    if(days.length===0){alert('اختر يوماً واحداً على الأقل');return;}
    var alm={
      id:editId||_alarmNextId(),
      hour:h, minute:mn,
      label:labelInp.value.trim()||'منبه',
      message:msgInp.value.trim(),
      tone:toneSel.value,
      days:days,
      enabled:true
    };
    if(editId){
      var idx=_alarms.findIndex(function(a){return a.id===editId;});
      if(idx>=0) _alarms[idx]=alm; else _alarms.push(alm);
    } else {
      _alarms.push(alm);
    }
    _alarmSave(); _alarmRenderList(); _alarmUpdateHomeCard();
    document.getElementById('_alarmFormModal').remove();
    showSnack((editId?'تم تعديل':'تمت إضافة')+' المنبه ✓');
  };

  sheet.appendChild(title);
  sheet.appendChild(timeRow);
  sheet.appendChild(labelRow);
  sheet.appendChild(msgRow);
  sheet.appendChild(toneRow);
  sheet.appendChild(daysRow);
  sheet.appendChild(saveBtn);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

function _alarmFormField(lbl,type,val,ph){
  var row=document.createElement('div');
  row.style.cssText='margin-bottom:14px;';
  var l=document.createElement('div');
  l.style.cssText='font-size:12px;color:#94a3b8;margin-bottom:6px;';
  l.textContent=lbl;
  var inp=document.createElement('input');
  inp.type=type; inp.value=val||''; inp.placeholder=ph||'';
  inp.style.cssText='width:100%;box-sizing:border-box;background:#1e293b;border:1px solid #334155;'
    +'color:#f1f5f9;border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;';
  row.appendChild(l); row.appendChild(inp);
  return row;
}

// ── Home card: next alarm ─────────────────────────────
function _alarmUpdateHomeCard(){
  var card=document.getElementById('homeAlarmCard');
  if(!card) return;
  var next=_alarmNextUpcoming();
  if(!next){ card.style.display='none'; return; }
  card.style.display='';
  var timeEl=card.querySelector('.alm-time');
  var lblEl=card.querySelector('.alm-lbl');
  var daysEl=card.querySelector('.alm-days');
  var cntEl=card.querySelector('.alm-count');
  if(timeEl) timeEl.textContent=_alarmTimeStr(next.alm);
  if(lblEl) lblEl.textContent=next.alm.label||'منبه';
  if(daysEl) daysEl.textContent=_alarmDaysLabel(next.alm);
  if(cntEl){
    var mins=next.minsUntil;
    var txt=mins<60?'بعد '+mins+' د'
      :mins<1440?'بعد '+(Math.floor(mins/60))+'س '+(mins%60?mins%60+'د':'')
      :'بعد '+(Math.floor(mins/1440))+' يوم';
    cntEl.textContent=txt;
  }
}
function _alarmNextUpcoming(){
  var now=new Date();
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5,5:6};
  var ourDay=jsToOur[now.getDay()];
  var nowM=now.getHours()*60+now.getMinutes();
  var best=null, bestMins=999999;
  _alarms.forEach(function(alm){
    if(!alm.enabled) return;
    var almM=alm.hour*60+alm.minute;
    var days=alm.days&&alm.days.length?alm.days:[0,1,2,3,4,5];
    days.forEach(function(d){
      var ahead=(d-ourDay+7)%7;
      if(ahead===0&&almM<=nowM) ahead=7;
      var minsUntil=ahead*1440+(almM-nowM);
      if(minsUntil<bestMins){bestMins=minsUntil;best={alm:alm,minsUntil:minsUntil};}
    });
  });
  return best;
}

// ══════════════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════════════
var _homeTimer=null;

function bnSetActive(page){
  // أزل النشاط من كل أزرار الدوك
  var allDockIds = ['home','grades','sched','weekly','cards','notifs','absence','stats',
    'curric','report','tafrigh','sick','dict','witness','backup','settings'];
  allDockIds.forEach(function(p){
    var b=document.getElementById('bni_'+p);
    if(b){
      b.classList.remove('hbn-active');
      b.classList.remove('dock-btn--active');
    }
  });
  var active=document.getElementById('bni_'+page);
  if(active){
    active.classList.add('hbn-active');
  }
  // also sync sidebar nav
  _ALL_PAGES.forEach(function(x){
    var nb=document.getElementById('nb_'+x);
    if(nb)nb.classList.remove('active');
  });
  var snb=document.getElementById('nb_'+page);
  if(snb)snb.classList.add('active');
}

function _homeGetAllPeriods(){
  var res=[];
  if(!DB||!DB.schedule||!DB.schedule._shared)return res;
  var shared=DB.schedule._shared;
  var slots=shared.slots||{};
  (shared.periods||[]).forEach(function(per){
    var clsForDays={};
    for(var d=0;d<7;d++){
      var cls=slots[per.id+'_d'+d]||"";
      if(cls){if(!clsForDays[cls])clsForDays[cls]=[];clsForDays[cls].push(d);}
    }
    Object.keys(clsForDays).forEach(function(cls){
      res.push({cls:cls,per:per,days:clsForDays[cls]});
    });
  });
  // Merge special periods
  _getSpecialPeriodItems().forEach(function(sp){res.push(sp);});
  return res;
}

function _homeParseMins(s){
  if(!s)return null;
  var p=s.trim().split(':');
  var h=parseInt(p[0]);var m=parseInt(p[1]||0);
  return isNaN(h)?null:h*60+m;
}

function _homeJsToOurDay(d){return({6:0,0:1,1:2,2:3,3:4,4:5,5:6})[d];}

function _homeGetCurrent(all){
  var now=new Date(),ourDay=_homeJsToOurDay(now.getDay());
  var nowM=now.getHours()*60+now.getMinutes();
  for(var i=0;i<all.length;i++){
    var item=all[i];
    if(item.days.indexOf(ourDay)<0||!item.per.time)continue;
    var parts=item.per.time.split('-');
    var sM=_homeParseMins(parts[0]);
    var eM=parts[1]?_homeParseMins(parts[1]):null;
    if(sM===null)continue;
    var effEnd=eM!==null?eM:sM+45;
    if(nowM>=sM&&nowM<effEnd){
      var nowSec=now.getHours()*3600+now.getMinutes()*60+now.getSeconds();
      var remSec=effEnd*60-nowSec;if(remSec<0)remSec=0;
      var dur=(effEnd-sM)*60;
      var prog=Math.round(Math.max(0,Math.min(100,(dur-remSec)/dur*100)));
      return{item:item,sM:sM,eM:effEnd,remSec:remSec,prog:prog};
    }
  }
  return null;
}

function _homeGetUpcoming(all,curItem){
  var now=new Date(),ourDay=_homeJsToOurDay(now.getDay());
  var nowM=now.getHours()*60+now.getMinutes();
  var DAYS_AR_H=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  var res=[];
  all.forEach(function(item){
    if(curItem&&item===curItem.item)return;
    if(!item.per.time)return;
    var sM=_homeParseMins(item.per.time.split('-')[0]);
    if(sM===null)return;
    var bestTotal=999999,bestAhead=-1;
    for(var ahead=0;ahead<=7;ahead++){
      var checkDay=(ourDay+ahead)%7;
      if(item.days.indexOf(checkDay)<0)continue;
      if(ahead===0&&sM<=nowM)continue;
      var total=ahead*1440+(sM-nowM);
      if(total<bestTotal){bestTotal=total;bestAhead=ahead;}
      break;
    }
    if(bestAhead>=0){
      var dayName=bestAhead===0?'اليوم':bestAhead===1?'غداً':DAYS_AR_H[(ourDay+bestAhead)%7];
      res.push({item:item,totalMins:bestTotal,daysAhead:bestAhead,dayName:dayName,startM:_homeParseMins(item.per.time.split('-')[0])});
    }
  });
  res.sort(function(a,b){return a.totalMins-b.totalMins;});
  return res;
}

function _homeGetPastToday(all,curItem){
  var now=new Date(),ourDay=_homeJsToOurDay(now.getDay());
  var nowM=now.getHours()*60+now.getMinutes();
  var res=[];
  all.forEach(function(item){
    if(curItem&&item===curItem.item)return;
    if(!item.per.time)return;
    if(item.days.indexOf(ourDay)<0)return;
    var parts=item.per.time.split('-');
    var eM=_homeParseMins(parts[parts.length-1]);
    if(eM===null||eM>nowM)return;
    res.push({item:item,eM:eM});
  });
  res.sort(function(a,b){return b.eM-a.eM;});
  return res;
}

function _homeGreet(){var h=new Date().getHours();if(h<12)return'☀️ صباح الخير،';if(h<17)return'🌤️ مساء الخير،';return'🌙 مساء النور،';}
var _wishMessages=[
  'أتمنى لك يوماً دراسياً ملهماً ورائعاً ✨',
  'العلم نور يُضيء طريق أجيال المستقبل 📚',
  'كل درس تُعطيه هو بذرة خير في قلب طالب 🌱',
  'معلم اليوم يصنع قادة الغد 🌟',
  'التعليم أشرف رسالة وأنت من يحملها 💙',
  'إلهام طالب واحد يُغيّر العالم 🎯',
  'بارك الله في جهدك وعطائك 🤲',
];
var _wishIdx=0;
function _homeRotateWish(){
  var el=document.getElementById('h-greet-wish');
  if(!el)return;
  el.style.opacity='0';
  setTimeout(function(){
    _wishIdx=(_wishIdx+1)%_wishMessages.length;
    el.textContent=_wishMessages[_wishIdx];
    el.style.opacity='1';
  },400);
}

function _homeFmtMins(m){var h=Math.floor(m/60),mn=m%60;return h>0?(h+'س '+mn+'د'):(mn+' دقيقة');}

function _homeRingHTML(r,prog,color,strokeW){
  var circ=2*Math.PI*r;
  var dash=circ*(prog/100);
  return '<svg width="'+(r*2+strokeW*2)+'" height="'+(r*2+strokeW*2)+'" viewBox="0 0 '+(r*2+strokeW*2)+' '+(r*2+strokeW*2)+'">'
    +'<circle cx="'+(r+strokeW)+'" cy="'+(r+strokeW)+'" r="'+r+'" fill="none" stroke="#1a2540" stroke-width="'+strokeW+'"/>'
    +'<circle cx="'+(r+strokeW)+'" cy="'+(r+strokeW)+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+strokeW+'"'
    +' stroke-dasharray="'+dash.toFixed(1)+' '+circ.toFixed(1)+'"'
    +' stroke-linecap="round" transform="rotate(-90 '+(r+strokeW)+' '+(r+strokeW)+')">'
    +'</circle></svg>';
}

var _homeTickCount=0;

function _homeTick(){
  _homeTickCount++;
  var root=document.getElementById('homeRoot');
  if(!root||root.offsetParent===null){return;}

  var now=new Date();
  var ourDay=_homeJsToOurDay(now.getDay());
  var DAYS_AR_H=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  var MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  var hh=now.getHours(),mm=now.getMinutes(),ss=now.getSeconds();
  var timeStr=(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss;
  var dateStr=DAYS_AR_H[ourDay]+' '+now.getDate()+' '+MONTHS[now.getMonth()]+' '+now.getFullYear();

  var el=function(id){return document.getElementById(id);};
  if(el('h-clock'))el('h-clock').textContent=timeStr;

  var all=_homeGetAllPeriods();
  var cur=_homeGetCurrent(all);
  var upcoming=_homeGetUpcoming(all,cur);
  var next=upcoming[0]||null;

  var clsCount=DB&&DB.classes?DB.classes.length:0;
  var todayCount=all.filter(function(i){return i.days.indexOf(ourDay)>=0;}).length;
  if(el('h-stat-today'))el('h-stat-today').textContent=todayCount;
  if(el('h-stat-cls'))el('h-stat-cls').textContent=clsCount;

  // Ring card
  var badge=el('h-ring-badge');
  var ringBody=el('h-ring-body');
  var ringNextRow=el('h-ring-next-row');

  // ── ألوان الحلقة لكل حالة ──────────────────────────────────
  // فترة عادية جارية   : أزرق سماوي  #38bdf8
  // طابور جارٍ         : أخضر زمردي  #10b981  + glow أخضر
  // فسحة جارية         : برتقالي      #f97316  + glow برتقالي
  // التالية عادية      : بنفسجي فاتح  #a78bfa
  // الطابور التالي     : أخضر فاتح   #6ee7b7
  // الفسحة التالية     : أصفر ذهبي   #fcd34d
  function _ringGlow(col){ return '0 0 18px '+col+'88,0 0 6px '+col+'44'; }
  if(cur){
    var isAssemblyCur=cur.item.isSpecial&&cur.item.specialType==='assembly';
    var isBreakCur=cur.item.isSpecial&&cur.item.specialType==='break';
    var ringColor=isAssemblyCur?'#10b981':isBreakCur?'#f97316':'#38bdf8';
    var ringBg=isAssemblyCur?'rgba(16,185,129,.08)':isBreakCur?'rgba(249,115,22,.08)':'rgba(56,189,248,.06)';
    var badgeTxt=isAssemblyCur?'🟢 طابور جارٍ':isBreakCur?'☕ فسحة جارية':'🔵 فترة جارية';
    var badgeCss=isAssemblyCur?'background:#052e16;color:#6ee7b7;border:1.5px solid #10b981;':
                 isBreakCur?'background:#431407;color:#fdba74;border:1.5px solid #f97316;':
                 'background:#0c2340;color:#7dd3fc;border:1.5px solid #38bdf8;';
    if(badge){badge.textContent=badgeTxt;badge.style.cssText=badgeCss;}
    var mm2=Math.floor(cur.remSec/60),ss2=cur.remSec%60;
    var endH=Math.floor(cur.eM/60),endMn=cur.eM%60;
    var curClassEl=el('h-cur-class');
    if(curClassEl){
      curClassEl.textContent=cur.item.cls||'—';
      curClassEl.style.color=ringColor;
    }
    var periodTimeEl=el('h-period-time');
    if(periodTimeEl)periodTimeEl.textContent=cur.item.per.time?('⏱ '+cur.item.per.time+(endH>=0?' — تنتهي '+(endH<10?'0':'')+endH+':'+(endMn<10?'0':'')+endMn:'')):'—';
    if(ringBody)ringBody.innerHTML=''
      +'<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
      +'<div class="home-ring-wrap" style="filter:drop-shadow('+_ringGlow(ringColor)+');">'
      +_homeRingHTML(88,cur.prog,ringColor,10)
      +'<div class="home-ring-inner" style="background:'+ringBg+';border-radius:50%;">'
      +'<div class="home-ring-countdown" style="font-size:30px;font-weight:900;color:'+ringColor+';letter-spacing:3px;font-variant-numeric:tabular-nums;line-height:1;">'+(mm2<10?'0':'')+mm2+':'+(ss2<10?'0':'')+ss2+'</div>'
      +'<div class="home-ring-countdown-lbl" style="font-size:9px;color:#94a3b8;margin-top:2px;">متبقي</div>'
      +'<div style="font-size:10px;color:'+ringColor+';margin-top:2px;">'+esc(cur.item.per.label)+'</div>'
      +'</div></div>'
      +'</div>';
    if(next&&ringNextRow){
      ringNextRow.style.display='flex';
      var nn=el('h-ring-next-name'),nw=el('h-ring-next-when');
      if(nn)nn.textContent=next.item.per.label+' — '+next.item.cls;
      if(nw)nw.textContent='بعد '+_homeFmtMins(next.totalMins);
    } else if(ringNextRow){ringNextRow.style.display='none';}
  } else if(next){
    var isAssemblyNxt=next.item.isSpecial&&next.item.specialType==='assembly';
    var isBreakNxt=next.item.isSpecial&&next.item.specialType==='break';
    var nextRingColor=isAssemblyNxt?'#6ee7b7':isBreakNxt?'#fcd34d':'#a78bfa';
    var nextRingBg=isAssemblyNxt?'rgba(110,231,183,.06)':isBreakNxt?'rgba(252,211,77,.06)':'rgba(167,139,250,.06)';
    var nextBadgeTxt=isAssemblyNxt?'🟢 الطابور التالي':isBreakNxt?'☕ الفسحة التالية':'⏰ الفترة التالية';
    var nextBadgeCss=isAssemblyNxt?'background:#052e16;color:#6ee7b7;border:1.5px solid #6ee7b7;':
                     isBreakNxt?'background:#431407;color:#fcd34d;border:1.5px solid #fcd34d;':
                     'background:#2e1065;color:#c4b5fd;border:1.5px solid #a78bfa;';
    if(badge){badge.textContent=nextBadgeTxt;badge.style.cssText=nextBadgeCss;}
    var nowSec2=now.getHours()*3600+mm*60+ss;
    var tgtSec=next.startM*60+(next.daysAhead||0)*86400;
    var diff=Math.max(0,tgtSec-nowSec2);
    var hRem=Math.floor(diff/3600),mRem=Math.floor((diff%3600)/60),sRem=diff%60;
    var prog2=Math.max(3,100-Math.min(100,Math.round(diff/1800)));
    var curClassEl2=el('h-cur-class');
    if(curClassEl2){
      curClassEl2.textContent=next.item.cls||'—';
      curClassEl2.style.color=nextRingColor;
    }
    var periodTimeEl2=el('h-period-time');
    if(periodTimeEl2)periodTimeEl2.textContent=next.item.per.time?('⏱ '+next.item.per.time):'—';
    if(ringBody)ringBody.innerHTML=''
      +'<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
      +'<div class="home-ring-wrap" style="filter:drop-shadow('+_ringGlow(nextRingColor)+');">'
      +_homeRingHTML(88,prog2,nextRingColor,10)
      +'<div class="home-ring-inner" style="background:'+nextRingBg+';border-radius:50%;">'
      +'<div class="home-ring-countdown" style="color:'+nextRingColor+';font-size:'+(hRem>0?'22':'30')+'px;font-weight:900;letter-spacing:3px;font-variant-numeric:tabular-nums;line-height:1;">'
      +(hRem>0?(hRem<10?'0':'')+hRem+':':'')
      +(mRem<10?'0':'')+mRem+':'
      +(sRem<10?'0':'')+sRem
      +'</div>'
      +'<div class="home-ring-countdown-lbl" style="font-size:9px;color:#94a3b8;margin-top:2px;">للبدء</div>'
      +'<div style="font-size:10px;color:'+nextRingColor+';margin-top:2px;">'+esc(next.item.per.label)+'</div>'
      +'</div></div>'
      +'</div>';
    if(ringNextRow)ringNextRow.style.display='none';
  } else {
    if(badge){badge.textContent='⬜ لا توجد فترة';badge.style.cssText='background:#111d33;color:#475569;border:1px solid #1e3a5f;';}
    var curClassEl3=el('h-cur-class');if(curClassEl3)curClassEl3.textContent='لا توجد فترة';
    var periodTimeEl3=el('h-period-time');if(periodTimeEl3)periodTimeEl3.textContent='';
    if(ringBody)ringBody.innerHTML='<div class="home-ring-status-free" style="color:#475569;font-size:13px;">لا توجد فترات جارية أو قادمة</div>';
    if(ringNextRow)ringNextRow.style.display='none';
  }

  // ── حقن CSS الكروت مرة واحدة ───────────────────────────
  if(!document.getElementById('_hpcCSS')){
    var _hpcSt=document.createElement('style');
    _hpcSt.id='_hpcCSS';
    _hpcSt.textContent=
      // أنيميشن الإطار المضيء
      '@keyframes hpcGlow{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,0),0 0 8px rgba(56,189,248,.25);}50%{box-shadow:0 0 0 3px rgba(56,189,248,.3),0 0 20px rgba(56,189,248,.5);}}'
      +'@keyframes hpcBorder{0%,100%{border-color:#38bdf8;}50%{border-color:#93c5fd;}}'
      +'@keyframes hpcDot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(.65);}}'
      // البطاقة الأساسية
      +'.home-period-card{flex-shrink:0;border-radius:14px;padding:10px 12px;border:1.5px solid #1e3a5f;background:#0d1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-width:80px;cursor:pointer;transition:opacity .3s;}'
      // الفترة الجارية — إطار مضيء + خط أكبر
      +'.hpc-active{border:2px solid #38bdf8!important;background:rgba(56,189,248,.1)!important;animation:hpcGlow 2s ease-in-out infinite,hpcBorder 2s ease-in-out infinite;min-width:120px!important;padding:12px 16px!important;}'
      // الفترة المنتظرة (التالية)
      +'.hpc-next{border-color:#fbbf24!important;background:rgba(251,191,36,.07)!important;}'
      // رقم الفترة (ف 6) — ثانوي أصغر
      +'.hpc-name{font-weight:600;color:#64748b;line-height:1.1;font-size:10px;}'
      +'.hpc-active .hpc-name{font-size:12px!important;color:#7dd3fc!important;}'
      +'.hpc-next .hpc-name{font-size:10px;color:#fbbf2499;}'
      +'.home-period-card:not(.hpc-active):not(.hpc-next) .hpc-name{font-size:9px;color:#475569;}'
      // اسم الفصل — رئيسي وأبرز
      +'.hpc-class{font-size:15px;font-weight:900;color:#f1f5f9;margin-top:2px;line-height:1.2;}'
      +'.hpc-active .hpc-class{font-size:22px!important;color:#e0f2fe!important;margin-top:3px;}'
      +'.hpc-next .hpc-class{font-size:16px!important;color:#fde68a!important;}'
      +'.hpc-upcoming{border-color:#1e3a5f!important;opacity:.82;}'
      +'.hpc-badge-upcoming{background:rgba(100,116,139,.15);color:#64748b;border:1px solid #33415540;}'
      // badge الحالة
      +'.hpc-badge{font-size:8px;font-weight:800;border-radius:7px;padding:2px 7px;margin-bottom:5px;}'
      +'.hpc-badge-now{background:rgba(56,189,248,.2);color:#38bdf8;border:1px solid #38bdf844;}'
      +'.hpc-badge-next{background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid #fbbf2440;}'
      // النقطة الوامضة
      +'.hpc-dot{width:7px;height:7px;border-radius:50%;margin:0 auto 4px;}'
      +'.hpc-dot-now{background:#38bdf8;animation:hpcDot 1.2s ease-in-out infinite;box-shadow:0 0 5px #38bdf8;}'
      +'.hpc-dot-next{background:#fbbf24;}'
      +'.hpc-past{opacity:.32;filter:grayscale(55%);border-color:#1e293b!important;background:#0a111e!important;cursor:default;}'
      +'.hpc-past .hpc-name,.hpc-past .hpc-class{color:#2d3f55!important;}'
      +'.hpc-badge-past{background:rgba(30,41,59,.4);color:#2d3f55;border:1px solid #1e293b;}';
    document.head.appendChild(_hpcSt);
  }

  // Period cards
  var cardsEl=el('h-cards-scroll');
  if(cardsEl){
    var cardsHtml='';
    if(!all.length){
      cardsHtml='<div style="color:#334155;padding:16px;font-size:11px;white-space:nowrap;">أضف فترات من الجدول</div>';
    } else {
      var past=_homeGetPastToday(all,cur);
      var shown=[];
      // الترتيب المنطقي: جارية أولاً، ثم التالية، ثم الباقي، ثم المنتهية
      if(cur)shown.push({type:'cur',data:cur,item:cur.item});
      var _ndh=DB.meta&&DB.meta.nextDayHour!=null?DB.meta.nextDayHour:12;
      var _nowH=now.getHours();
      var _showNext=_nowH>=_ndh;
      var _todayUp=upcoming.filter(function(u){
        if(!u.item.cls||!u.item.cls.trim())return false;
        if(u.daysAhead===0)return true;
        if(u.daysAhead===1&&_showNext)return true;
        return false;
      });
      _todayUp.slice(0,4).forEach(function(u,ui){shown.push({type:ui===0?'next':'up',data:u,item:u.item});});
      past.slice(0,3).forEach(function(p){shown.push({type:'past',data:p,item:p.item});});
      shown.forEach(function(s,idx){
        var isCur=s.type==='cur';
        var isNext=s.type==='next';
        var isAssembly=s.item.isSpecial&&s.item.specialType==='assembly';
        var isBreak=s.item.isSpecial&&s.item.specialType==='break';

        // إخفاء أي فترة بدون فصل مخصص تمامًا
        if(!isCur&&(!s.item.cls||!s.item.cls.trim()))return;

        var isPast=s.type==='past';
        var cardCls='home-period-card'+(isCur?' hpc-active':isNext?' hpc-next':isPast?' hpc-past':' hpc-upcoming');
        var assemblyStyle=isAssembly?'border-color:#059669!important;background:rgba(16,185,129,.1)!important;':'';
        var breakStyle=isBreak?'border-color:#d97706!important;background:rgba(251,191,36,.07)!important;':'';
        var extraStyle=assemblyStyle||breakStyle;

        var whenTxt=esc(s.item.per.label||s.item.per.id||'');
        var clsTxt=s.item.cls||'';
        var nameColor=isAssembly?'#34d399':isBreak?'#fbbf24':'';

        var badgeHtml='';
        var dotHtml='';
        if(isCur){
          badgeHtml='<div class="hpc-badge hpc-badge-now">🟢 جارية الآن</div>';
          dotHtml='<div class="hpc-dot hpc-dot-now"></div>';
        } else if(isNext){
          badgeHtml='<div class="hpc-badge hpc-badge-next">⏰ التالية</div>';
          dotHtml='<div class="hpc-dot hpc-dot-next"></div>';
        } else if(isPast){
          badgeHtml='<div class="hpc-badge hpc-badge-past">✓ منتهية</div>';
        } else {
          badgeHtml='<div class="hpc-badge hpc-badge-upcoming">📋 قادمة</div>';
        }

        cardsHtml+='<div class="'+cardCls+'" style="'+extraStyle+'" onclick="switchPage(\'sched\')">'
          +badgeHtml
          +dotHtml
          +'<div class="hpc-name" style="'+(nameColor?'color:'+nameColor+';':'')+'">'+whenTxt+'</div>'
          +'<div class="hpc-class" style="'+(nameColor?'color:'+nameColor+'88;':'')+'">'+esc(clsTxt)+'</div>'
          +'</div>';
      });
    }
    cardsEl.innerHTML=cardsHtml;
    cardsEl.style.display='flex'; // مرئي الآن
  }
  // Update upcoming strip (only once per minute to avoid flicker)
  if(_homeTickCount%60===0||_homeTickCount===1){
    var stripEl=document.getElementById('homeUpcomingStrip');
    if(stripEl){
      var newStrip=document.createElement('div');
      newStrip.innerHTML=_buildUpcomingStrip();
      var built=newStrip.firstChild;
      if(built)stripEl.parentNode.replaceChild(built,stripEl);
    }
  }
}

// ── CURRIC WEEK WIDGET HELPERS ─────────────────────────

function _curricCurrentWeek(){
  // Compute current week number from startDate
  if(!DB||!DB.meta||!DB.meta.startDate)return null;
  try{
    var start=new Date(DB.meta.startDate);
    var now=new Date();
    var diffMs=now-start;
    if(diffMs<0)return null;
    var weekNum=Math.floor(diffMs/(7*24*3600*1000))+1;
    var max=Number(DB.meta.activeWeeks)||14;
    if(weekNum<1||weekNum>max)return null;
    return weekNum;
  }catch(e){return null;}
}

function _curricWeekInfo(w){
  if(!DB||!DB.curric)return null;
  var c=DB.curric;
  var wd=(c.weeks||[]).find(function(x){return x.w===w;})||{w:w,unitId:'',lessons:'',notes:''};
  var unit=wd.unitId?(c.units||[]).find(function(u){return u.id===wd.unitId;})||null:null;
  var exam=(c.exams||[]).find(function(x){return x.w===w;})||null;
  var holiday=(c.holidays||[]).find(function(x){return x.w===w;})||null;
  var dateRange='';
  if(DB.meta.startDate){try{dateRange=curricWeekDateRange(w);}catch(e){}}
  return{w:w,wd:wd,unit:unit,exam:exam,holiday:holiday,dateRange:dateRange};
}

function _buildCurricStrip(){
  var autoWeek=_curricCurrentWeek();
  var w=window._curricPopupWeek||(autoWeek||1);
  window._curricPopupWeek=w;
  var info=_curricWeekInfo(w);
  if(!info)return '';

  var unitName=info.unit?esc(info.unit.name):'<span style="color:#6d28d9;font-size:9px;">لم تُحدد وحدة</span>';
  var lessonText=info.wd.lessons?esc(info.wd.lessons):'<span style="color:#6d28d9;font-size:12px;">لم يُضف درس</span>';
  var tagHtml='';
  if(info.exam)tagHtml+='<span class="home-curric-tag exam">📋 '+esc(info.exam.label||'اختبار')+'</span> ';
  if(info.holiday)tagHtml+='<span class="home-curric-tag holiday">🏖️ '+esc(info.holiday.label||'إجازة')+'</span>';

  var unitColor=info.unit?info.unit.color:'#5b21b6';
  var isCurrentWeek=autoWeek===w;

  // Build today's day + date string — same mapping as schedule (Sat=0)
  var DAYS_AR_SCHED=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  var MONTHS_AR=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var now=new Date();
  var _todayOurDay=_homeJsToOurDay(now.getDay());
  var todayDay=(_todayOurDay!==undefined)?DAYS_AR_SCHED[_todayOurDay]:'—';
  var todayDate=now.getDate()+' '+MONTHS_AR[now.getMonth()]+' '+now.getFullYear();

  // Week label — current or just "أسبوع N"
  var weekLabel=isCurrentWeek?'الأسبوع الحالي':'الأسبوع '+w;

  return '<div class="home-curric-strip" onclick="showCurricPopup()" title="توزيع المنهج — انقر للتفاصيل">'
    +'<div class="home-curric-strip-inner">'
    // Left badge — week number + colored by unit
    +'<div class="home-curric-week-badge" style="background:linear-gradient(160deg,'+unitColor+'dd,'+unitColor+');">'
    +'<div class="wcb-num">'+w+'</div>'
    +'<div class="wcb-lbl">'+esc(weekLabel)+'</div>'
    +'</div>'
    // Center info
    +'<div class="home-curric-info">'
    // Day + date in one line
    +'<div class="home-curric-daydate-row">'
    +'<span class="home-curric-day">'+todayDay+'</span>'
    +'<span style="color:#4c1d95;font-size:12px;margin:0 4px;">|</span>'
    +'<span class="home-curric-datestr">'+todayDate+'</span>'
    +'</div>'
    +(tagHtml?'<div style="margin-top:4px;">'+tagHtml+'</div>':'')
    +'<div style="font-size:9px;color:#7c3aed;margin-top:4px;font-weight:600;">انقر لعرض الوحدة والدرس ›</div>'
    +'</div>'
    +'<div class="home-curric-arrow">›</div>'
    +'</div>'
    +'</div>';
}

function showCurricPopup(){
  closeCurricPopup();
  var autoWeek=_curricCurrentWeek();
  if(!window._curricPopupWeek)window._curricPopupWeek=autoWeek||1;
  var ov=document.createElement('div');
  ov.className='curric-popup-overlay';
  ov.id='curricPopupOverlay';
  ov.onclick=function(e){if(e.target===ov)closeCurricPopup();};
  ov.innerHTML='<div class="curric-popup" id="curricPopupBox">'
    +'<div class="curric-popup-handle"></div>'
    +'<div class="curric-popup-hdr">'
    +'<span class="curric-popup-title">📖 توزيع المنهج</span>'
    +'<button class="curric-popup-close" onclick="closeCurricPopup()">✕</button>'
    +'</div>'
    +'<div class="curric-popup-body">'
    +'<div class="curric-wk-selector">'
    +'<button class="curric-wk-btn" onclick="curricPopupChangeWeek(-1)">‹</button>'
    +'<div class="curric-wk-display">'
    +'<div class="curric-wk-num" id="cwNum">'+window._curricPopupWeek+'</div>'
    +'<div class="curric-wk-sub" id="cwSub">الأسبوع</div>'
    +'</div>'
    +'<button class="curric-wk-btn" onclick="curricPopupChangeWeek(+1)">›</button>'
    +'</div>'
    +'<div class="curric-popup-cards" id="cwCards"></div>'
    +'</div>'
    +'<button class="curric-popup-goto" onclick="closeCurricPopup();switchPage(\'curric\');">فتح صفحة توزيع المنهج ←</button>'
    +'</div>';
  document.body.appendChild(ov);
  _renderCurricPopupCards();
}

function _renderCurricPopupCards(){
  var w=window._curricPopupWeek||1;
  var autoWeek=_curricCurrentWeek();
  var info=_curricWeekInfo(w);
  var numEl=document.getElementById('cwNum');
  var subEl=document.getElementById('cwSub');
  var cardsEl=document.getElementById('cwCards');
  if(numEl)numEl.textContent=w;
  if(subEl)subEl.textContent=(autoWeek===w?'الأسبوع الحالي ✓':'الأسبوع');
  if(!info||!cardsEl)return;

  var html='';

  // Dates card
  if(info.dateRange){
    html+='<div class="curric-info-card">'
      +'<div class="curric-info-card-label">📅 التواريخ</div>'
      +'<div class="curric-info-card-value">'+esc(info.dateRange)+'</div>'
      +'</div>';
  }

  // Unit card
  var unitColor=info.unit?info.unit.color:'#334155';
  html+='<div class="curric-info-card">'
    +'<div class="curric-info-card-label">📚 الوحدة الدراسية</div>'
    +'<div class="curric-info-card-value">'+(info.unit?esc(info.unit.name):'<span style="color:#334155;">لم تُحدد وحدة لهذا الأسبوع</span>')+'</div>'
    +(info.unit?'<div class="curric-unit-bar" style="background:'+unitColor+';width:100%;"></div>':'')
    +'</div>';

  // Lessons card
  html+='<div class="curric-info-card">'
    +'<div class="curric-info-card-label">📖 الدروس والمحتوى</div>'
    +'<div class="curric-info-card-value" style="white-space:pre-wrap;font-size:15px;">'+(info.wd.lessons?esc(info.wd.lessons):'<span style="color:#475569;font-size:12px;">لم يُضف محتوى لهذا الأسبوع</span>')+'</div>'
    +(info.wd.notes?'<div class="curric-info-card-sub">💬 '+esc(info.wd.notes)+'</div>':'')
    +'</div>';

  // Exam card
  if(info.exam){
    html+='<div class="curric-info-card accent-exam">'
      +'<div class="curric-info-card-label">📋 اختبار مقرر هذا الأسبوع</div>'
      +'<div class="curric-info-card-value" style="color:#c4b5fd;">'+esc(info.exam.label||'اختبار')+'</div>'
      +'</div>';
  }

  // Holiday card
  if(info.holiday){
    html+='<div class="curric-info-card accent-holiday">'
      +'<div class="curric-info-card-label">🏖️ إجازة رسمية</div>'
      +'<div class="curric-info-card-value" style="color:#fbbf24;">'+esc(info.holiday.label||'إجازة')+'</div>'
      +'</div>';
  }

  cardsEl.innerHTML=html;
}

function curricPopupChangeWeek(delta){
  var max=Number((DB&&DB.meta&&DB.meta.activeWeeks)||14);
  var w=(window._curricPopupWeek||1)+delta;
  if(w<1)w=max;
  if(w>max)w=1;
  window._curricPopupWeek=w;
  _renderCurricPopupCards();
  // Also refresh the strip
  var stripEl=document.querySelector('.home-curric-strip');
  if(stripEl)stripEl.outerHTML=_buildCurricStrip();
}

function closeCurricPopup(){
  var ov=document.getElementById('curricPopupOverlay');
  if(ov)ov.remove();
}

function _buildUpcomingStrip(){ return ""; // مُعطَّل — الكروت تظهر في h-cards-scroll
  // ── حقن CSS الأنيميشن مرة واحدة ──────────────────────
  if(!document.getElementById('_upcomingStripCSS')){
    var st=document.createElement('style');
    st.id='_upcomingStripCSS';
    st.textContent=
      '@keyframes chipGlow{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.0),0 0 10px rgba(56,189,248,.3);}50%{box-shadow:0 0 0 3px rgba(56,189,248,.35),0 0 22px rgba(56,189,248,.55);}}'
      +'@keyframes chipBorderPulse{0%,100%{border-color:#38bdf8;}50%{border-color:#7dd3fc;}}'
      +'@keyframes dotBlink{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.7);}}'
      +'.home-upcoming-strip{position:fixed;bottom:60px;right:0;left:0;z-index:120;background:linear-gradient(to top,rgba(10,15,30,.98) 80%,rgba(10,15,30,0));padding:10px 14px 8px;direction:rtl;}'
      +'.home-upcoming-inner{display:flex;align-items:stretch;gap:7px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px;}'
      +'.home-upcoming-inner::-webkit-scrollbar{display:none;}'
      +'.home-upcoming-lbl{font-size:10px;font-weight:800;color:#475569;white-space:nowrap;align-self:center;flex-shrink:0;padding-left:4px;}'
      /* بطاقة عادية (منتهية) — مخفية */
      +'.home-cls-chip{display:none!important;}'
      /* الفترة الجارية */
      +'.home-cls-chip.chip-now{display:flex!important;flex-direction:column;align-items:center;justify-content:center;min-width:130px;padding:10px 14px;background:rgba(56,189,248,.13);border:2px solid #38bdf8;border-radius:16px;cursor:pointer;text-align:center;animation:chipGlow 2s ease-in-out infinite,chipBorderPulse 2s ease-in-out infinite;position:relative;overflow:hidden;}'
      +'.home-cls-chip.chip-now::before{content:"";position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,rgba(56,189,248,.08),rgba(99,102,241,.05));pointer-events:none;}'
      /* الفترة التالية / المنتظرة */
      +'.home-cls-chip.chip-next{display:flex!important;flex-direction:column;align-items:center;justify-content:center;min-width:100px;padding:8px 12px;background:rgba(251,191,36,.08);border:1.5px solid rgba(251,191,36,.4);border-radius:14px;cursor:pointer;text-align:center;}'
      /* نقطة الحالة */
      +'.chip-dot{width:8px;height:8px;border-radius:50%;margin-bottom:5px;flex-shrink:0;}'
      +'.chip-dot-now{background:#38bdf8;animation:dotBlink 1.2s ease-in-out infinite;box-shadow:0 0 6px #38bdf8;}'
      +'.chip-dot-next{background:#fbbf24;}'
      /* اسم الفصل */
      +'.chip-cls-name-now{font-size:20px!important;font-weight:900;color:#f1f5f9;letter-spacing:.5px;line-height:1.1;}'
      +'.chip-cls-name-next{font-size:15px;font-weight:700;color:#e2e8f0;}'
      /* التوقيت */
      +'.chip-time-now{font-size:11px;color:#7dd3fc;font-weight:700;margin-top:3px;}'
      +'.chip-time-next{font-size:10px;color:#fbbf2488;margin-top:3px;}'
      /* badge حالة */
      +'.chip-badge{font-size:9px;border-radius:8px;padding:2px 8px;font-weight:800;margin-bottom:4px;}'
      +'.chip-badge-now{background:rgba(56,189,248,.2);color:#38bdf8;border:1px solid #38bdf844;}'
      +'.chip-badge-next{background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid #fbbf2433;}';
    document.head.appendChild(st);
  }

  var all=_homeGetAllPeriods();
  var now=new Date();
  var ourDay=_homeJsToOurDay(now.getDay());

  // فلترة فترات اليوم التي لها وقت وفصل مخصص (إزالة الفارغة)
  var todayAll=all.filter(function(item){
    return item.days.indexOf(ourDay)>=0 && item.per.time && item.cls && item.cls.trim();
  });
  if(!todayAll.length)return '<div id="homeUpcomingStrip"></div>';

  var nowM=now.getHours()*60+now.getMinutes();

  // ترتيب حسب وقت البداية
  todayAll.sort(function(a,b){
    var sA=_homeParseMins(a.per.time.split('-')[0]);
    var sB=_homeParseMins(b.per.time.split('-')[0]);
    return (sA||0)-(sB||0);
  });

  // تحديد أول فترة تالية فقط
  var foundNext=false;
  var chips='';

  todayAll.forEach(function(item){
    var sM=_homeParseMins(item.per.time.split('-')[0]);
    var eM=item.per.time.indexOf('-')>-1?_homeParseMins(item.per.time.split('-')[1]):null;
    if(sM===null)return;

    var isNow=(eM!==null)?sM<=nowM&&nowM<eM:sM===Math.floor(nowM);
    var isPast=(eM!==null)?nowM>=eM:sM<nowM;

    // إخفاء الفترات المنتهية
    if(isPast&&!isNow)return;

    var isNext=false;
    if(!isNow&&sM>nowM&&!foundNext){
      isNext=true;
      foundNext=true;
    } else if(!isNow&&sM>nowM){
      // فترات لاحقة — عرضها عادية صغيرة
    }

    var perIdx=all.indexOf(item);
    var perNum=perIdx>=0?perIdx+1:(parseInt((item.per.id||'').replace(/\D/g,''))||0);
    var perLabel=perNum?('ف '+perNum):esc(item.per.label||'');

    if(isNow){
      chips+='<div class="home-cls-chip chip-now" onclick="switchPage(\'sched\')">'
        +'<div class="chip-badge chip-badge-now">🟢 جارية الآن</div>'
        +'<div class="chip-dot chip-dot-now"></div>'
        +'<div class="chip-cls-name-now">'+esc(item.cls)+'</div>'
        +'<div style="font-size:11px;color:#94a3b8;margin-top:2px;">'+perLabel+'</div>'
        +'<div class="chip-time-now">'+esc(item.per.time)+'</div>'
        +'</div>';
    } else if(isNext){
      chips+='<div class="home-cls-chip chip-next" onclick="switchPage(\'sched\')">'
        +'<div class="chip-badge chip-badge-next">⏰ التالية</div>'
        +'<div class="chip-dot chip-dot-next"></div>'
        +'<div class="chip-cls-name-next">'+esc(item.cls)+'</div>'
        +'<div style="font-size:9px;color:#94a3b8;margin-top:1px;">'+perLabel+'</div>'
        +'<div class="chip-time-next">'+esc(item.per.time)+'</div>'
        +'</div>';
    }
    // الفترات اللاحقة لا تُعرض (تقليل الفوضى)
  });

  if(!chips)return '<div id="homeUpcomingStrip"></div>';

  return '<div id="homeUpcomingStrip" class="home-upcoming-strip">'
    +'<div class="home-upcoming-inner">'
    +'<span class="home-upcoming-lbl">📅 اليوم</span>'
    +chips
    +'</div>'
    +'</div>';
}

function renderHomePage(){
  var root=document.getElementById('homeRoot');
  if(!root)return;
  if(_homeTimer)clearInterval(_homeTimer);

  /* ── تصحيح CSS الشريط السفلي وأيقوناته ── */
  if(!document.getElementById('_bnFixStyle')){
    var _bnSt=document.createElement('style');
    _bnSt.id='_bnFixStyle';
    _bnSt.textContent='.home-bottom-nav,.hbn,#homeBottomNav{height:56px!important;padding-bottom:env(safe-area-inset-bottom,0)!important;}'+'  .hbn button,.home-bottom-nav button,#homeBottomNav button{font-size:11px!important;gap:2px!important;padding:4px 0!important;min-width:48px!important;}'+'  .hbn button span:first-child,.hbn-icon,.bn-icon{font-size:20px!important;line-height:1.1!important;}'+'  .hbn button span:last-child,.hbn-label,.bn-label{font-size:9px!important;}'+'  #h-cards-scroll{display:flex!important;flex-direction:row!important;direction:rtl!important;gap:8px;overflow-x:auto;padding:0 16px 8px;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}'+'  #h-cards-scroll::-webkit-scrollbar{display:none;}'+'  .home-body{padding-bottom:72px!important;}';
    document.head.appendChild(_bnSt);
  }

  var teacherName = (DB&&DB.meta&&DB.meta.teacherName) ? DB.meta.teacherName : (sessionStorage.getItem('ln')||'المعلم').replace(/^أ(ستاذة?)?\/\s*/,'');
  var schoolName  = (DB&&DB.meta&&DB.meta.schoolName)  ? DB.meta.schoolName  : 'Dalty Grades';
  var gender      = (DB&&DB.meta&&DB.meta.teacherGender)? DB.meta.teacherGender : 'male';
  var photo       = (DB&&DB.meta&&DB.meta.teacherPhoto) ? DB.meta.teacherPhoto  : '';
  var firstName   = teacherName.split(' ')[0];
  var initLetter  = firstName.charAt(0);
  var titlePrefix = gender==='female' ? 'أستاذة' : 'أستاذ';
  var shortTitle  = gender==='female' ? 'أ/ ' : 'أ/ ';
  var greetWord   = gender==='female' ? 'أهلاً بك أستاذة' : 'أهلاً بك أستاذ';
  var wishLine    = gender==='female' ? 'أتمنى لك يوماً دراسياً ملهماً ورائعاً ✨' : 'أتمنى لك يوماً دراسياً ملهماً ورائعاً ✨';

  // Avatar HTML
  var avatarHtml = photo
    ? '<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>'
    : '<span style="font-size:15px;font-weight:900;color:white;">'+esc(initLetter)+'</span>';

  root.innerHTML='<div class="home-page">'
    +'<div class="home-leaves-canvas" id="h-leaves-canvas"></div>'
    +'<div class="home-body" id="h-body">'
    // Header
    +'<div class="home-top-hdr">'
    +'<div style="display:flex;align-items:center;gap:9px;">'
    +'<div class="home-avatar" style="'+(photo?'padding:0;border:2px solid #3b82f6;overflow:hidden;':'')+'">'+avatarHtml+'</div>'
    +'<div><div class="home-school-lbl">'+esc(schoolName)+'</div>'
    +'<div class="home-teacher-lbl">'+esc(shortTitle+firstName)+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="home-bell" onclick="toggleNotifPanel()">🔔<span id="homeBellDot" style="position:absolute;top:3px;right:3px;background:#ef4444;color:#fff;border-radius:50%;min-width:8px;height:8px;font-size:0;font-weight:800;display:none;line-height:1;padding:0;border:1.5px solid #0a0f1e;box-shadow:0 0 6px rgba(239,68,68,.7);"></span></div>'
    +'</div>'
    // Greeting + رسالة دوارة في نفس السطر
    +'<div class="home-greeting-block">'
    +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;">'
    +'<div class="home-greet-main" style="white-space:nowrap;">'+greetWord+' <em>'+esc(firstName)+'</em>،</div>'
    +'<div class="home-greet-wish" id="h-greet-wish" style="flex:1;text-align:right;">'+wishLine+'</div>'
    +'</div>'
    +'</div>'
    // الساعة الكبيرة في مكانها
    +'<div class="home-clock-hero">'
    +'<div class="home-greet-sub" id="h-greet-sub" style="font-size:13px;color:#94a3b8;margin-bottom:6px;">'+_homeGreet()+'</div>'
    +'<div class="home-clock" id="h-clock">00:00:00</div>'
    +'<div class="home-clock-divider"></div>'
    +'</div>'
    // Curric week strip
    +_buildCurricStrip()
    // Ring card
    +'<div class="home-ring-section">'
    +'<div class="home-ring-card">'
    // اسم الفصل الحقيقي من الجدول (يُحدَّث في _homeTick)
    +'<div style="text-align:center;margin-bottom:10px;">'
    +'<div id="h-cur-class" style="font-size:22px;font-weight:900;color:#f1f5f9;letter-spacing:1px;">—</div>'
    +'</div>'
    // badge الحصة الجارية
    +'<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">'
    +'<span style="font-size:10px;color:#94a3b8;font-weight:700;">🔔 الحصة الجارية الآن</span>'
    +'<span class="home-ring-status-badge" id="h-ring-badge" style="background:#0d1a33;color:#475569;border:1px solid #1e3a5f;">...</span>'
    +'</div>'
    // الحلقة الكبيرة في المنتصف
    +'<div id="h-ring-body" style="display:flex;justify-content:center;align-items:center;">'
    +'<div class="home-ring-status-free">جاري التحميل...</div>'
    +'</div>'
    // توقيت الفترة أسفل الحلقة
    +'<div style="text-align:center;margin-top:10px;">'
    +'<div id="h-period-time" style="font-size:14px;font-weight:700;color:#60a5fa;">—</div>'
    +'</div>'
    // الحصة التالية
    +'<div class="home-ring-next-row" id="h-ring-next-row" style="display:none;">'
    +'<div><div class="home-ring-next-lbl">الحصة التالية:</div>'
    +'<div class="home-ring-next-name" id="h-ring-next-name">—</div></div>'
    +'<div class="home-ring-next-when" id="h-ring-next-when">—</div>'
    +'</div>'
    +'</div></div>'
    +'<div id="h-cards-scroll" style="display:none;gap:8px;overflow-x:auto;padding:0 16px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch;flex-shrink:0;"></div>'
    // Alarm card
    +'<div id="homeAlarmCard" style="display:none;margin:0 16px 12px;background:#0f172a;border:1px solid #1e3a5f;border-radius:14px;padding:12px 16px;cursor:pointer;" onclick="switchPage(\'notifs\');bnSetActive(\'notifs\');">'
    +'<div style="display:flex;align-items:center;gap:12px;">'
    +'<div style="width:36px;height:36px;background:#1e293b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">⏰</div>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="display:flex;align-items:baseline;gap:8px;">'
    +'<span class="alm-time" style="font-size:22px;font-weight:900;color:#60a5fa;font-variant-numeric:tabular-nums;letter-spacing:1px;">--:--</span>'
    +'<span class="alm-lbl" style="font-size:12px;font-weight:700;color:#e2e8f0;"></span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-top:2px;">'
    +'<span class="alm-days" style="font-size:9px;color:#475569;"></span>'
    +'<span style="font-size:9px;color:#334155;">·</span>'
    +'<span class="alm-count" style="font-size:10px;font-weight:700;color:#fbbf24;background:#451a03;border-radius:6px;padding:1px 7px;"></span>'
    +'</div>'
    +'</div>'
    +'<div style="font-size:10px;color:#334155;">‹</div>'
    +'</div>'
    +'</div>'
    +'<div style="height:16px;"></div>'
    // ── شبكة التنقل الكاملة — تظهر دائماً أسفل المنبه ──
    +'<div id="h-nav-grid-wrap" style="flex-shrink:0;padding:0 12px 12px;direction:rtl;">'
    +'<div style="font-size:9px;color:#334155;font-weight:800;letter-spacing:.6px;margin-bottom:8px;padding-right:2px;">⚡ التنقل السريع</div>'
    +'<div id="h-nav-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;"></div>'
    +'</div>'
    +'</div>'// end home-body
    +_buildUpcomingStrip()
    +'</div>';// end home-page

  _homeTick();
  _homeTimer=setInterval(_homeTick,1000);
  // Wish rotator every 6s
  if(window._wishTimer)clearInterval(window._wishTimer);
  window._wishTimer=setInterval(_homeRotateWish,6000);
  // Spawn leaves
  _homeSpawnLeaves();
  // Update bell dot after DOM is ready
  setTimeout(_notifUpdateBadge,0);
  // Update alarm card
  setTimeout(_alarmUpdateHomeCard,0);
  // بناء كروت التنقل السريع
  setTimeout(_buildHomeNavCards, 0);
}

// ══ كروت التنقل السريع — نفس نمط كروت الفترات ══
// ══ شبكة التنقل الكاملة في الصفحة الرئيسية ══
var _HNG_ALL = [
  { id:'grades',   icon:'📝', lbl:'الدرجات',         fn:function(){ switchPage('grades');  bnSetActive('grades');  } },
  { id:'weekly',   icon:'🎯', lbl:'الراصد',           fn:function(){ switchPage('weekly');  setTimeout(function(){ WKS.viewMode='numpad'; WKS.numpadStudent=null; WKS.numpadInput=''; renderWeekly(); renderViewBar(); },80); bnSetActive('weekly'); } },
  { id:'sched',    icon:'🗓', lbl:'الجدول',           fn:function(){ switchPage('sched');   bnSetActive('sched');   } },
  { id:'absence',  icon:'📋', lbl:'الغياب',           fn:function(){ switchPage('absence'); bnSetActive('absence'); } },
  { id:'cards',    icon:'📅', lbl:'الأسبوعي',         fn:function(){ switchPage('weekly');  setTimeout(function(){ if(typeof WKS!=='undefined'){ WKS.viewMode='table'; renderWeekly(); renderViewBar(); } },80); bnSetActive('weekly'); } },
  { id:'stats',    icon:'📊', lbl:'إحصائيات',         fn:function(){ switchPage('stats');   bnSetActive('stats');   } },
  { id:'notifs',   icon:'🔔', lbl:'الإشعارات',        fn:function(){ switchPage('notifs');  bnSetActive('notifs');  }, badge:true },
  { id:'sick',     icon:'🤒', lbl:'المرضى',            fn:function(){ switchPage('sick');    bnSetActive('sick');    } },
  { id:'curric',   icon:'📖', lbl:'توزيع المنهج',     fn:function(){ switchPage('curric');  bnSetActive('curric');  } },
  { id:'report',   icon:'📄', lbl:'كشف الدرجات',      fn:function(){ switchPage('report');  bnSetActive('report');  } },
  { id:'tafrigh',  icon:'🗃', lbl:'كشف التفريغ',      fn:function(){ switchPage('tafrigh'); bnSetActive('tafrigh'); } },
  { id:'dict',     icon:'🎤', lbl:'الإملاء',           fn:function(){ switchPage('dict');    bnSetActive('dict');    } },
  { id:'witness',  icon:'✍️', lbl:'توقيع المتابع',    fn:function(){ switchPage('witness'); bnSetActive('witness'); } },
  { id:'backup',   icon:'💾', lbl:'النسخ الاحتياطي',  fn:function(){ switchPage('backup');  bnSetActive('backup');  } },
  { id:'settings', icon:'⚙️', lbl:'الإعدادات',        fn:function(){ switchPage('settings');bnSetActive('settings');} },
  { id:'share',    icon:'🔗', lbl:'مشاركة',            fn:function(){ copyViewerLink();                              } }
];

function _buildHomeNavCards(){
  var grid = document.getElementById('h-nav-grid');
  if(!grid) return;
  grid.innerHTML = '';

  // CSS مرة واحدة
  if(!document.getElementById('_hncCSS')){
    var st = document.createElement('style');
    st.id = '_hncCSS';
    st.textContent =
      '.hnc-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;'+
        'background:transparent;border:none;'+
        'border-radius:13px;padding:11px 4px 9px;cursor:pointer;font-family:inherit;'+
        'transition:background .15s,transform .1s;}'+
      '.hnc-btn:active{transform:scale(.93);background:rgba(29,78,216,.2);}'+
      '.hnc-btn.hnc-active{background:rgba(29,78,216,.2);border-color:rgba(96,165,250,.4);}'+
      '.hnc-icon{font-size:22px;line-height:1;position:relative;display:block;}'+
      '.hnc-lbl{font-size:9px;font-weight:700;color:#64748b;text-align:center;'+
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block;}'+
      '.hnc-btn.hnc-active .hnc-lbl{color:#60a5fa;}';
    document.head.appendChild(st);
  }

  _HNG_ALL.forEach(function(item){
    var btn = document.createElement('button');
    btn.className = 'hnc-btn';
    btn.id = 'hnc_' + item.id;
    btn.addEventListener('click', item.fn);

    var iconEl = document.createElement('span');
    iconEl.className = 'hnc-icon';
    iconEl.textContent = item.icon;

    if(item.badge){
      var bdg = document.createElement('span');
      bdg.id = 'hncNotifBadge';
      bdg.style.cssText = 'display:none;position:absolute;top:-3px;right:-5px;background:#ef4444;'+
        'color:#fff;font-size:7px;font-weight:900;border-radius:8px;padding:0 3px;min-width:12px;text-align:center;';
      iconEl.style.position = 'relative';
      iconEl.appendChild(bdg);
      var orig = document.getElementById('notifBadge');
      if(orig){
        new MutationObserver(function(){
          bdg.textContent = orig.textContent;
          bdg.style.display = orig.textContent ? 'inline-block' : 'none';
        }).observe(orig, {childList:true, subtree:true, characterData:true});
      }
    }

    var lblEl = document.createElement('span');
    lblEl.className = 'hnc-lbl';
    lblEl.textContent = item.lbl;

    btn.appendChild(iconEl);
    btn.appendChild(lblEl);
    grid.appendChild(btn);
  });
}

function _homeSpawnLeaves(){
  var canvas=document.getElementById('h-leaves-canvas');
  if(!canvas)return;
  canvas.innerHTML='';
  var icons=['🍃','🍂','🌸','🌺','🍀','🌼','🌷','🌿'];
  var count=12;
  for(var i=0;i<count;i++){
    (function(idx){
      var leaf=document.createElement('div');
      leaf.className='home-leaf';
      leaf.textContent=icons[Math.floor(Math.random()*icons.length)];
      var left=Math.random()*95;
      var dur=7+Math.random()*9;
      var sway=3+Math.random()*5;
      var delay=Math.random()*12;
      var size=11+Math.floor(Math.random()*10);
      leaf.style.cssText='right:'+left+'%;font-size:'+size+'px;'
        +'animation:leaf-fall '+dur+'s '+delay+'s linear infinite,'
        +'leaf-sway '+sway+'s '+delay+'s ease-in-out infinite;'
        +'opacity:0;';
      canvas.appendChild(leaf);
    })(i);
  }
}




// ══════════════════════════════



// ── Colors for classes ────────────────────────────────
var CLS_COLORS=['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#14b8a6','#f97316','#ec4899'];
var DB=null;
var ALL_WEEKS=[1,2,3,4,5,6,7,8,9,10,11,12,13,14];
var currentView='general';
var currentCls=null;
var currentStudent=null;

// ── Load DB ───────────────────────────────────────────
function loadDB(){
  try{
    var s=localStorage.getItem('grades_v6');
    if(s)return JSON.parse(s);
  }catch(e){}
  return null;
}

function repInit(){
  DB=loadDB();
  document.getElementById('loadingOverlay').style.display='none';
  if(!DB||!DB.classes||!DB.classes.length){
    // استخدام البيانات المدمجة عند غياب localStorage
    DB=repGetDemoData();
  }
  var _tmSem=(DB.meta&&DB.meta.semester)?((Number(DB.meta.semester)===2)?'ف٢':'ف١'):'ف١';var _tmYr=(DB.meta&&DB.meta.schoolYear)?DB.meta.schoolYear:'2025 / 2026';  document.getElementById('topMeta').textContent=((DB.meta&&DB.meta.schoolName)||'Dalty Grades')+' | '+_tmSem+' '+_tmYr;
  renderClsList();
  selectClass(DB.classes[0]);
}

function repGetDemoData(){
  return {
    meta:{schoolName:'Dalty Grades',subject:'مادة العلوم',grade:'الصف الثاني الإعدادي',year:'2025 - 2026',teacherName:'ا/ إيهاب مازي عبده',activeWeeks:14,periodsPerWeek:3,periodsPerDay:4,periodTimes:[]},
    classes:['فصل 2-4','فصل 2-5','فصل 2-6','فصل 2-7'],
    colPages:[{id:'p1',label:'الأعمدة',cols:[
      {id:'a9',field:'a9',label:'تقييم 9',max:20,visible:true},{id:'h9',field:'h9',label:'واجب 9',max:10,visible:true},
      {id:'a10',field:'a10',label:'تقييم 10',max:20,visible:true},{id:'h10',field:'h10',label:'واجب 10',max:10,visible:true},
      {id:'a11',field:'a11',label:'تقييم 11',max:20,visible:true},{id:'h11',field:'h11',label:'واجب 11',max:10,visible:true},
      {id:'a12',field:'a12',label:'تقييم 12',max:20,visible:true},{id:'h12',field:'h12',label:'واجب 12',max:10,visible:true},
      {id:'a13',field:'a13',label:'تقييم 13',max:20,visible:true},{id:'h13',field:'h13',label:'واجب 13',max:10,visible:true},
      {id:'beh1',field:'beh1',label:'السلوك',max:5,visible:true},{id:'beh2',field:'beh2',label:'المواظبة',max:5,visible:true},
      {id:'ex1',field:'ex1',label:'اختبار 1',max:15,visible:true},{id:'ex2',field:'ex2',label:'اختبار 2',max:15,visible:true}
    ]}],
    schedule:{},absences:{},
    data:{
      'فصل 2-4':[
        {id:1,name:'عبد الله محمد احمد عبد الله محمد',a9:'غ',h9:10,a10:19,h10:4,a11:'غ',h11:5,a12:14,h12:7,a13:6,h13:9,beh1:7,beh2:4,ex1:11,ex2:10},
        {id:2,name:'عبد الله محمد فاروق ياقوت تقي الدين',a9:19,h9:10,a10:5,h10:2,a11:17,h11:10,a12:'غ',h12:8,a13:20,h13:10,beh1:7,beh2:5,ex1:12,ex2:12},
        {id:3,name:'عبد الله محمد محمود احمد محمود',a9:14,h9:10,a10:'غ',h10:4,a11:'غ',h11:2,a12:3,h12:8,a13:19,h13:6,beh1:5,beh2:4,ex1:9,ex2:8},
        {id:4,name:'عبد الله محمود محمد ابراهيم عبد العال',a9:17,h9:7,a10:10,h10:10,a11:'غ',h11:5,a12:19,h12:0,a13:18,h13:8,beh1:5,beh2:5,ex1:10,ex2:9},
        {id:5,name:'عبد الله وليد مصطفى كمال عبد الحميد',a9:18,h9:5,a10:3,h10:3,a11:20,h11:4,a12:19,h12:8,a13:5,h13:10,beh1:6,beh2:4,ex1:10,ex2:9},
        {id:6,name:'عدي محمد سليمان محمد محمد الجنه',a9:20,h9:8,a10:19,h10:6,a11:'غ',h11:6,a12:19,h12:'غ',a13:5,h13:8,beh1:6,beh2:5,ex1:11,ex2:10},
        {id:7,name:'علاء الدين ابراهيم سعد محمد السيد سيد',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:9,beh2:6,ex1:15,ex2:15},
        {id:8,name:'علاء السيد عبد السيد منصور',a9:14,h9:6,a10:13,h10:7,a11:11,h11:8,a12:8,h12:2,a13:19,h13:7,beh1:6,beh2:4,ex1:10,ex2:9},
        {id:9,name:'علاء خالد سلامه خالد عبده جمعه',a9:19,h9:7,a10:12,h10:5,a11:'غ',h11:8,a12:14,h12:0,a13:'غ',h13:10,beh1:7,beh2:3,ex1:10,ex2:9},
        {id:10,name:'علاء عماد حمدي محمد جاهين',a9:8,h9:5,a10:18,h10:0,a11:9,h11:10,a12:20,h12:10,a13:15,h13:10,beh1:8,beh2:5,ex1:11,ex2:10},
        {id:11,name:'علي محمد ابو الحسن مصطفى',a9:6,h9:6,a10:14,h10:10,a11:'غ',h11:8,a12:13,h12:'غ',a13:18,h13:10,beh1:7,beh2:5,ex1:10,ex2:10},
        {id:12,name:'علي محمد علي ابراهيم احمد داوود',a9:20,h9:10,a10:20,h10:10,a11:17,h11:10,a12:20,h12:10,a13:18,h13:10,beh1:10,beh2:6,ex1:15,ex2:14},
        {id:13,name:'علي محمد علي محمد السيد',a9:20,h9:10,a10:18,h10:10,a11:20,h11:10,a12:20,h12:10,a13:17,h13:10,beh1:10,beh2:6,ex1:15,ex2:14},
        {id:14,name:'علي محمد محمود محمد سليمان العدل',a9:20,h9:'غ',a10:2,h10:'غ',a11:20,h11:10,a12:5,h12:7,a13:18,h13:7,beh1:7,beh2:3,ex1:10,ex2:9},
        {id:15,name:'علي محمود علي محمد عبد العال صالح',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:9,beh2:6,ex1:15,ex2:15},
        {id:16,name:'عماد محمد صبري احمد محمد',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:10,beh2:6,ex1:15,ex2:15},
        {id:17,name:'عمار احمد الاحمدي صالح محمد',a9:20,h9:10,a10:18,h10:6,a11:20,h11:10,a12:20,h12:9,a13:12,h13:10,beh1:8,beh2:6,ex1:14,ex2:13},
        {id:18,name:'عمار علي عبد العظيم علي السيد',_totalAbsent:true,a9:'غ',h9:'غ',a10:'غ',h10:'غ',a11:'غ',h11:'غ',a12:'غ',h12:'غ',a13:'غ',h13:'غ',beh1:'غ',beh2:'غ',ex1:'غ',ex2:'غ'},
        {id:19,name:'عمر احمد احمد عبد الله نافع',a9:12,h9:'غ',a10:'غ',h10:3,a11:20,h11:6,a12:9,h12:10,a13:19,h13:10,beh1:6,beh2:3,ex1:10,ex2:9},
        {id:20,name:'عمر اسلام السيد فريد ابو المعاطي',a9:18,h9:10,a10:13,h10:6,a11:18,h11:9,a12:20,h12:10,a13:16,h13:10,beh1:9,beh2:5,ex1:13,ex2:13},
        {id:21,name:'عمر محمد علي اسماعيل عبد الله',a9:18,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:17,h13:10,beh1:10,beh2:6,ex1:15,ex2:14},
        {id:22,name:'عمران وائل محمد جمال زكي مصطفى',a9:19,h9:10,a10:20,h10:10,a11:20,h11:10,a12:18,h12:10,a13:18,h13:10,beh1:9,beh2:6,ex1:15,ex2:14},
        {id:23,name:'عمرو عبد السلام محمد محمد نعمه الله',a9:4,h9:8,a10:19,h10:10,a11:20,h11:10,a12:17,h12:2,a13:20,h13:10,beh1:8,beh2:5,ex1:12,ex2:12},
        {id:24,name:'عنتر سمير عبد الرحمن محمود سلامه',a9:20,h9:10,a10:'غ',h10:3,a11:13,h11:10,a12:9,h12:10,a13:19,h13:7,beh1:7,beh2:5,ex1:12,ex2:12},
        {id:25,name:'فارس عبد الله ممدوح راشد السعيد',_totalAbsent:true,a9:'غ',h9:'غ',a10:'غ',h10:'غ',a11:'غ',h11:'غ',a12:'غ',h12:'غ',a13:'غ',h13:'غ',beh1:'غ',beh2:'غ',ex1:'غ',ex2:'غ'},
        {id:26,name:'كريم حمدي حامد احمد عماره',a9:5,h9:10,a10:20,h10:3,a11:20,h11:3,a12:8,h12:8,a13:12,h13:6,beh1:6,beh2:4,ex1:10,ex2:9},
        {id:27,name:'كريم عماد حمدي محمد الهجرسي',a9:16,h9:7,a10:17,h10:10,a11:17,h11:10,a12:20,h12:10,a13:15,h13:8,beh1:8,beh2:5,ex1:13,ex2:13},
        {id:28,name:'كريم فتحي عبد العظيم السعيد عوض',a9:18,h9:8,a10:14,h10:10,a11:20,h11:10,a12:19,h12:'غ',a13:14,h13:8,beh1:7,beh2:6,ex1:13,ex2:12},
        {id:29,name:'كريم محمد ابراهيم عوض يوسف شبانه',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:18,h12:9,a13:12,h13:6,beh1:9,beh2:5,ex1:14,ex2:13},
        {id:30,name:'كريم محمد السيد محمد عبد النبي',a9:20,h9:5,a10:15,h10:10,a11:16,h11:10,a12:19,h12:10,a13:20,h13:10,beh1:9,beh2:5,ex1:14,ex2:13},
        {id:31,name:'كريم محمد عبد الجواد السيد عجور',a9:20,h9:10,a10:18,h10:6,a11:20,h11:9,a12:17,h12:10,a13:20,h13:10,beh1:8,beh2:6,ex1:14,ex2:14},
        {id:32,name:'كريم محمد فتحي محمد عبد الواحد',_totalAbsent:true,a9:'غ',h9:'غ',a10:'غ',h10:'غ',a11:'غ',h11:'غ',a12:'غ',h12:'غ',a13:'غ',h13:'غ',beh1:'غ',beh2:'غ',ex1:'غ',ex2:'غ'},
        {id:33,name:'كريم محمد مصباح محمد المهدي',a9:13,h9:10,a10:16,h10:'غ',a11:14,h11:9,a12:17,h12:10,a13:20,h13:10,beh1:9,beh2:4,ex1:12,ex2:12},
        {id:34,name:'مازن احمد شكري عبد المطلب حسن',a9:17,h9:7,a10:14,h10:5,a11:14,h11:10,a12:17,h12:'غ',a13:3,h13:7,beh1:7,beh2:3,ex1:10,ex2:9},
        {id:35,name:'مازن المتولي السيد محمد جمعه',a9:14,h9:5,a10:10,h10:10,a11:20,h11:3,a12:'غ',h12:7,a13:17,h13:5,beh1:5,beh2:5,ex1:10,ex2:9},
        {id:36,name:'ماهر سمير احمد ابراهيم علي',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:9,beh2:6,ex1:15,ex2:15},
        {id:37,name:'محمد ابراهيم احمد هاشم رخا',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:10,beh2:6,ex1:15,ex2:15},
        {id:38,name:'محمد ابراهيم السيد ابو تقي الدين',a9:20,h9:10,a10:17,h10:10,a11:20,h11:10,a12:18,h12:10,a13:20,h13:10,beh1:10,beh2:6,ex1:15,ex2:14},
        {id:39,name:'محمد ابراهيم عزمي عبد المنعم السيد',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:10,beh2:6,ex1:15,ex2:15},
        {id:40,name:'محمد ابراهيم محمد السيد علي',a9:19,h9:10,a10:19,h10:10,a11:17,h11:10,a12:20,h12:10,a13:20,h13:10,beh1:10,beh2:6,ex1:15,ex2:14},
        {id:41,name:'محمد احمد ابراهيم عبد العال عطيه',a9:17,h9:10,a10:8,h10:9,a11:20,h11:2,a12:15,h12:'غ',a13:'غ',h13:9,beh1:7,beh2:4,ex1:9,ex2:9},
        {id:42,name:'محمد احمد احمد السعيد محمد نافع',a9:12,h9:5,a10:17,h10:5,a11:15,h11:9,a12:16,h12:2,a13:5,h13:'غ',beh1:7,beh2:3,ex1:10,ex2:9},
        {id:43,name:'محمد احمد حمدي علي الشاعر',a9:10,h9:10,a10:16,h10:'غ',a11:16,h11:9,a12:20,h12:10,a13:18,h13:10,beh1:7,beh2:5,ex1:12,ex2:12},
        {id:44,name:'محمد احمد عبد العزيز محمد حسين',a9:10,h9:9,a10:20,h10:10,a11:15,h11:9,a12:20,h12:7,a13:20,h13:10,beh1:8,beh2:5,ex1:13,ex2:13},
        {id:45,name:'محمد احمد عبد المنعم علي احمد',a9:20,h9:10,a10:7,h10:10,a11:19,h11:9,a12:20,h12:6,a13:19,h13:10,beh1:9,beh2:5,ex1:13,ex2:13},
        {id:46,name:'محمد احمد عوض احمد حسن',a9:15,h9:10,a10:20,h10:9,a11:20,h11:9,a12:20,h12:10,a13:20,h13:7,beh1:8,beh2:6,ex1:14,ex2:14},
        {id:47,name:'محمد احمد محمد احمد شملول',a9:15,h9:'غ',a10:15,h10:10,a11:13,h11:2,a12:20,h12:7,a13:'غ',h13:9,beh1:7,beh2:3,ex1:10,ex2:9},
        {id:48,name:'محمد احمد محمد توكل علي البغدادي',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:19,h12:10,a13:16,h13:10,beh1:9,beh2:6,ex1:15,ex2:14}
      ],
      'فصل 2-5':[],'فصل 2-6':[],'فصل 2-7':[]
    }
  };
}

// ── Sidebar class list ────────────────────────────────
function renderClsList(){
  var el=document.getElementById('clsList');
  if(!el)return;
  el.innerHTML=DB.classes.map(function(c,i){
    var count=(DB.data[c]||[]).filter(function(s){return s.name;}).length;
    var color=CLS_COLORS[i%CLS_COLORS.length];
    return '<div class="cls-item" id="ci_'+esc(c)+'" onclick="selectClass(\''+esc(c)+'\')">'
      +'<div class="cls-dot" style="background:'+color+'"></div>'
      +esc(c)
      +'<span class="cls-badge">'+count+'</span>'
      +'</div>';
  }).join('');
}

function selectClass(cls){
  currentCls=cls;
  currentStudent=null;
  DB.classes.forEach(function(c){
    var el=document.getElementById('ci_'+esc(c));
    if(el)el.classList.toggle('active',c===cls);
  });
  var _bb=document.getElementById('backBtn');if(_bb)_bb.classList.remove('show');
  if(currentView==='general') renderGeneralReport(cls);
  else if(currentView==='follower') renderFollowerReport(cls);
  else renderStudentList(cls);
}

function setView(v){
  currentView=v;
  var _vg=document.getElementById('vt-general');if(_vg)_vg.classList.toggle('active',v==='general');
  var _vs=document.getElementById('vt-student');if(_vs)_vs.classList.toggle('active',v==='student');
  var _vf=document.getElementById('vt-follower');if(_vf)_vf.classList.toggle('active',v==='follower');
  if(!currentCls)return;
  currentStudent=null;
  var _bb=document.getElementById('backBtn');if(_bb)_bb.classList.remove('show');
  if(v==='general') renderGeneralReport(currentCls);
  else if(v==='follower') renderFollowerReport(currentCls);
  else renderStudentList(currentCls);
}

function goBack(){
  currentStudent=null;
  var _bb=document.getElementById('backBtn');if(_bb)_bb.classList.remove('show');
  if(currentView==='follower') renderFollowerReport(currentCls);
  else renderStudentList(currentCls);
}

// ── Helpers ───────────────────────────────────────────
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function allCols(){
  var r=[];
  if(!DB||!DB.colPages)return r;
  DB.colPages.forEach(function(pg){(pg.cols||[]).forEach(function(c){r.push(c);});});
  return r;
}

function calcStudent(s){
  if(!DB)return{total:0,avgAssess:0,avgHw:0,avgBeh:'—',exTotal:0};
  if(s._totalAbsent)return{total:0,avgAssess:0,avgHw:0,avgBeh:'—',exTotal:0};
  var aSum=0,aC=0,hSum=0,hC=0,bSum=0,bC=0,exSum=0;
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var awList=ALL_WEEKS.slice(0,aw);
  // حساب متوسط السلوك من حقول bw الأسبوعية
  awList.forEach(function(w){
    var bwv=s['bw'+w];
    if(bwv===''||bwv===undefined||bwv===null)return;
    if(bwv==='م')return;
    var bwn=bwv==='غ'?0:Math.min(Number(bwv)||0,10);
    bSum+=bwn;bC++;
  });
  allCols().forEach(function(c){
    if(c.id.match(/^a\d+$/)){var wn=parseInt(c.id.slice(1));if(awList.indexOf(wn)<0)return;}
    if(c.id.match(/^h\d+$/)){var wn=parseInt(c.id.slice(1));if(awList.indexOf(wn)<0)return;}
    if(c.id.match(/^bw\d+$/))return;
    if(c.id==='beh1'||c.id==='beh2')return;
    if(!c.visible&&c.id!=='ex1'&&c.id!=='ex2')return;
    var raw=s[c.field];
    if(raw===''||raw===undefined||raw===null)return;
    if(raw==='م')return;
    var v=raw==='غ'?0:Math.min(Number(raw)||0,c.max);
    if(c.id.charAt(0)==='a'&&c.id!=='abs'){aSum+=v;aC++;}
    else if(c.id.charAt(0)==='h'){hSum+=v;hC++;}
    else if(c.id==='ex1'||c.id==='ex2')exSum+=Math.min(v,c.max);
  });
  var avgA=aC?Math.round(aSum/aC):0;
  var avgH=hC?Math.round(hSum/hC):0;
  var beh=bC>0?Math.round(bSum/bC):0;
  var avgBehDisp=bC>0?beh:'—';
  var ex=Math.min(exSum,30);
  return{total:avgA+avgH+beh+ex,avgAssess:avgA,avgHw:avgH,avgBeh:avgBehDisp,exTotal:ex};
}

function gradeColor(pct){
  if(pct>=85)return'#10b981';
  if(pct>=70)return'#3b82f6';
  if(pct>=55)return'#f59e0b';
  if(pct>=40)return'#f97316';
  return'#ef4444';
}

function gradeLetter(pct){
  if(pct>=90)return'A+';
  if(pct>=85)return'A';
  if(pct>=80)return'B+';
  if(pct>=75)return'B';
  if(pct>=70)return'C+';
  if(pct>=65)return'C';
  if(pct>=60)return'D+';
  if(pct>=50)return'D';
  return'F';
}

function gradeAr(pct){
  if(pct>=85)return'ممتاز';
  if(pct>=70)return'جيد جداً';
  if(pct>=55)return'جيد';
  if(pct>=40)return'مقبول';
  return'راسب';
}

function countAbsences(cls,sid){
  if(!DB.absences||!DB.absences[cls]||!DB.absences[cls][sid])return 0;
  var abs=DB.absences[cls][sid];
  return Object.keys(abs).filter(function(k){return abs[k]==='abs';}).length;
}

function countSick(cls,sid){
  if(!DB.absences||!DB.absences[cls]||!DB.absences[cls][sid])return 0;
  var abs=DB.absences[cls][sid];
  return Object.keys(abs).filter(function(k){return abs[k]==='sick';}).length;
}

function svgRing(val,max,color,size){
  size=size||64;
  var r=size/2-5;
  var circ=2*Math.PI*r;
  var pct=max>0?val/max:0;
  var dash=circ*Math.min(1,pct);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" class="ring-svg">'
    +'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="#1e2d47" stroke-width="5"/>'
    +'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round"'
    +' stroke-dasharray="'+dash+' '+circ+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>'
    +'</svg>';
}

// ═══════════════════════════════════════════════════════
// GENERAL REPORT
// ═══════════════════════════════════════════════════════
function renderGeneralReport(cls){
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var tmax=70;
  var totalStudents=students.length;
  var clsIdx=DB.classes.indexOf(cls);
  var color=CLS_COLORS[clsIdx%CLS_COLORS.length];

  // Compute stats
  var scores=students.map(function(s){return calcStudent(s).total;});
  var avg=totalStudents?Math.round(scores.reduce(function(a,b){return a+b;},0)/totalStudents):0;
  var maxScore=totalStudents?Math.max.apply(null,scores):0;
  var minScore=totalStudents?Math.min.apply(null,scores):0;
  var passCount=scores.filter(function(x){return x/tmax>=0.4;}).length;
  var excellentCount=scores.filter(function(x){return x/tmax>=0.85;}).length;

  // Distribution buckets
  var buckets=[0,0,0,0,0]; // <40, 40-55, 55-70, 70-85, 85+
  scores.forEach(function(s){
    var p=s/tmax*100;
    if(p<40)buckets[0]++;
    else if(p<55)buckets[1]++;
    else if(p<70)buckets[2]++;
    else if(p<85)buckets[3]++;
    else buckets[4]++;
  });
  var bucketColors=['#ef4444','#f97316','#f59e0b','#3b82f6','#10b981'];
  var bucketLabels=['راسب','مقبول','جيد','جيد جداً','ممتاز'];

  // Ranked students
  var ranked=students.map(function(s){
    var c=calcStudent(s);
    return{s:s,total:c.total,avgAssess:c.avgAssess,avgHw:c.avgHw,avgBeh:c.avgBeh,exTotal:c.exTotal,abs:countAbsences(cls,s.id),sick:countSick(cls,s.id)};
  }).sort(function(a,b){return b.total-a.total;});

  // Weekly avgs (for line mini-chart)
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var weeklyAssessAvgs=ALL_WEEKS.slice(0,aw).map(function(w){
    var vals=students.map(function(s){var v=s['a'+w];return(v===''||v===undefined||v===null||v==='م')?null:(v==='غ'?0:Number(v)||0);}).filter(function(v){return v!==null;});
    return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):null;
  });
  var weeklyHwAvgs=ALL_WEEKS.slice(0,aw).map(function(w){
    var vals=students.map(function(s){var v=s['h'+w];return(v===''||v===undefined||v===null||v==='م')?null:(v==='غ'?0:Number(v)||0);}).filter(function(v){return v!==null;});
    return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):null;
  });

  // --- HTML ---
  var html='';

  // Header title bar
  html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">';
  html+='<div style="width:14px;height:14px;border-radius:50%;background:'+color+';flex-shrink:0;"></div>';
  html+='<div style="font-size:16px;font-weight:900;color:var(--text);">'+esc(cls)+'</div>';
  html+='<div style="margin-right:auto;display:flex;gap:5px;">';
  html+='<span style="background:rgba(59,130,246,.15);color:var(--blue3);border:1px solid rgba(59,130,246,.3);padding:2px 9px;border-radius:8px;font-size:9px;font-weight:700;">'+totalStudents+' طالب</span>';
  html+='<span style="background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.3);padding:2px 9px;border-radius:8px;font-size:9px;font-weight:700;">'+passCount+' ناجح</span>';
  html+='</div></div>';

  // Stat cards row
  html+='<div class="report-header">';
  html+=statCard(avg+'/'+tmax,'متوسط الفصل',gradeAr(avg/tmax*100),gradeColor(avg/tmax*100));
  html+=statCard(maxScore+'/'+tmax,'أعلى درجة','درجة القمة','#10b981');
  html+=statCard(minScore+'/'+tmax,'أدنى درجة','تحتاج متابعة','#ef4444');
  html+=statCard(excellentCount+' / '+totalStudents,'الممتازون','فوق 85%','#f59e0b');
  html+='</div>';

  // Distribution bar
  html+='<div class="section-title">📊 توزيع الدرجات</div>';
  html+='<div class="dist-bar-wrap">';
  html+='<div class="dist-bar">';
  var total100=buckets.reduce(function(a,b){return a+b;},0)||1;
  buckets.forEach(function(cnt,i){
    var pct=Math.round(cnt/total100*100);
    if(pct===0)return;
    html+='<div class="dist-seg" style="width:'+pct+'%;background:'+bucketColors[i]+';min-width:'+(cnt>0?24:0)+'px;" title="'+bucketLabels[i]+': '+cnt+' طالب">'+cnt+'</div>';
  });
  html+='</div>';
  html+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:7px;">';
  buckets.forEach(function(cnt,i){
    html+='<span style="font-size:9px;color:'+bucketColors[i]+';display:flex;align-items:center;gap:3px;">';
    html+='<span style="width:8px;height:8px;border-radius:2px;background:'+bucketColors[i]+';display:inline-block;"></span>';
    html+=bucketLabels[i]+' ('+cnt+')</span>';
  });
  html+='</div></div>';

  // Weekly averages chart
  html+='<div class="section-title">📈 متوسط التقييم الأسبوعي</div>';
  html+='<div class="weekly-chart">';
  html+='<div class="wk-bars" id="wchart_'+esc(cls)+'">';
  var maxA=Math.max.apply(null,weeklyAssessAvgs.filter(function(v){return v!==null;}).concat([1]));
  ALL_WEEKS.slice(0,aw).forEach(function(w,i){
    var val=weeklyAssessAvgs[i];
    var hwVal=weeklyHwAvgs[i];
    var pct=val!==null?(val/20*100):0;
    var hpct=hwVal!==null?(hwVal/10*100):0;
    html+='<div class="wk-col">';
    html+='<div class="wk-bar-wrap">';
    if(val!==null){
      html+='<div class="wk-bar" style="height:'+pct+'%;background:linear-gradient(180deg,#3b82f6,#1d4ed8);" data-val="تقييم: '+val+'/20"></div>';
    } else {
      html+='<div style="width:100%;height:4px;background:var(--border);border-radius:3px;margin-bottom:2px;"></div>';
    }
    html+='</div>';
    html+='<div class="wk-lbl">'+w+'</div>';
    html+='</div>';
  });
  html+='</div>';
  html+='<div style="font-size:9px;color:var(--text3);margin-top:7px;">📊 متوسط التقييم الأسبوعي من 20 — اضغط على الأعمدة لرؤية القيم</div>';
  html+='</div>';

  // Grade table
  html+='<div class="section-title">🏆 قائمة الدرجات والترتيب</div>';
  html+='<div class="search-bar">';
  html+='<input class="search-inp" placeholder="🔍 بحث باسم الطالب..." oninput="filterGeneralTable(this.value)" id="searchGeneral"/>';
  html+='<button class="filter-btn active" id="gf_all" onclick="filterGeneralBy(\'all\')">الكل</button>';
  html+='<button class="filter-btn" id="gf_exc" onclick="filterGeneralBy(\'exc\')">ممتاز</button>';
  html+='<button class="filter-btn" id="gf_fail" onclick="filterGeneralBy(\'fail\')">راسب</button>';
  html+='<button class="filter-btn" id="gf_abs" onclick="filterGeneralBy(\'abs\')">غياب</button>';
  html+='</div>';

  html+='<div class="grade-table-wrap"><table class="grade-table" id="generalTable">';
  html+='<thead><tr>';
  html+='<th>م</th><th class="td-name">الاسم</th>';
  html+='<th>التقييم<br><span style="font-size:8px;opacity:.7;">/20</span></th>';
  html+='<th>الواجب<br><span style="font-size:8px;opacity:.7;">/10</span></th>';
  html+='<th>السلوك<br><span style="font-size:8px;opacity:.7;">/10</span></th>';
  html+='<th>الاختبارات<br><span style="font-size:8px;opacity:.7;">/30</span></th>';
  html+='<th>المجموع<br><span style="font-size:8px;opacity:.7;">/70</span></th>';
  html+='<th>%</th><th>التقدير</th><th>غياب</th><th>تقرير</th>';
  html+='</tr></thead><tbody>';

  ranked.forEach(function(r,i){
    var pct=Math.round(r.total/tmax*100);
    var color=gradeColor(pct);
    var rankClass=i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'';
    html+='<tr data-name="'+esc(r.s.name)+'" data-pct="'+pct+'" data-abs="'+r.abs+'">';
    html+='<td class="td-rank"><span class="'+rankClass+'">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1))+'</span></td>';
    html+='<td class="td-name">'+esc(r.s.name)+'</td>';
    html+='<td>'+r.avgAssess+'</td>';
    html+='<td>'+r.avgHw+'</td>';
    html+='<td>'+r.avgBeh+'</td>';
    html+='<td>'+r.exTotal+'</td>';
    html+='<td><span class="grade-pill" style="background:'+color+'22;color:'+color+';border:1px solid '+color+'44;">'+r.total+'</span></td>';
    html+='<td style="color:'+color+';font-weight:700;">'+pct+'%</td>';
    html+='<td><span class="grade-pill" style="background:'+color+'22;color:'+color+';border:1px solid '+color+'44;">'+gradeAr(pct)+'</span></td>';
    html+='<td style="color:'+(r.abs>5?'#ef4444':r.abs>0?'#f59e0b':'#475569')+'">'+(r.abs||'—')+(r.sick?' / 🤒'+r.sick:'')+'</td>';
    html+='<td><button onclick="openStudentReport(\''+esc(cls)+'\','+r.s.id+')" style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);color:var(--blue3);border-radius:6px;padding:2px 7px;font-size:9px;cursor:pointer;font-family:inherit;">تفصيل</button></td>';
    html+='</tr>';
  });

  if(!ranked.length){
    html+='<tr><td colspan="11" style="color:var(--text3);padding:20px;text-align:center;">لا يوجد طلاب في هذا الفصل</td></tr>';
  }

  html+='</tbody></table></div>';

  // class summary component breakdown
  var avgBreakdown={assess:0,hw:0,beh:0,ex:0};
  ranked.forEach(function(r){avgBreakdown.assess+=r.avgAssess;avgBreakdown.hw+=r.avgHw;avgBreakdown.beh+=(r.avgBeh==='—'?0:Number(r.avgBeh)||0);avgBreakdown.ex+=r.exTotal;});
  if(ranked.length){avgBreakdown.assess=Math.round(avgBreakdown.assess/ranked.length);avgBreakdown.hw=Math.round(avgBreakdown.hw/ranked.length);avgBreakdown.beh=Math.round(avgBreakdown.beh/ranked.length);avgBreakdown.ex=Math.round(avgBreakdown.ex/ranked.length);}

  html+='<div class="section-title" style="margin-top:14px;">📋 متوسطات مكونات الدرجة</div>';
  html+='<div class="breakdown-grid">';
  html+=breakdownCard('📊 التقييمات',avgBreakdown.assess,20,'#3b82f6');
  html+=breakdownCard('📝 الواجبات',avgBreakdown.hw,10,'#8b5cf6');
  html+=breakdownCard('🌟 السلوك',avgBreakdown.beh,10,'#10b981');
  html+=breakdownCard('📋 الاختبارات',avgBreakdown.ex,30,'#f59e0b');
  html+='</div>';

  document.getElementById('mainContent').innerHTML=html;

  // Store ranked for filtering
  window._generalRanked=ranked;
  window._generalCls=cls;
  window._generalFilter='all';
}

function statCard(val,lbl,sub,color){
  return '<div class="stat-card"><div class="sc-val" style="color:'+color+'">'+val+'</div>'
    +'<div class="sc-lbl">'+lbl+'</div>'
    +(sub?'<div class="sc-sub">'+sub+'</div>':'')+'</div>';
}

function breakdownCard(label,val,max,color){
  var pct=max>0?Math.round(val/max*100):0;
  return '<div class="breakdown-card">'
    +'<div class="bc-label">'+label+'</div>'
    +'<div class="bc-bar-bg"><div class="bc-bar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>'
    +'<div class="bc-vals"><span class="bc-val" style="color:'+color+'">'+val+'</span><span class="bc-max">/'+max+'</span></div>'
    +'</div>';
}

function filterGeneralTable(q){
  q=q.trim().toLowerCase();
  var rows=document.querySelectorAll('#generalTable tbody tr');
  rows.forEach(function(r){
    var name=(r.getAttribute('data-name')||'').toLowerCase();
    var matchQ=!q||name.indexOf(q)>=0;
    var filter=window._generalFilter||'all';
    var pct=parseInt(r.getAttribute('data-pct')||0);
    var abs=parseInt(r.getAttribute('data-abs')||0);
    var matchF=filter==='all'||(filter==='exc'&&pct>=85)||(filter==='fail'&&pct<40)||(filter==='abs'&&abs>0);
    r.style.display=(matchQ&&matchF)?'':'none';
  });
}

function filterGeneralBy(f){
  window._generalFilter=f;
  ['all','exc','fail','abs'].forEach(function(x){
    var el=document.getElementById('gf_'+x);
    if(el)el.classList.toggle('active',x===f);
  });
  var q=(document.getElementById('searchGeneral')||{}).value||'';
  filterGeneralTable(q);
}

// ═══════════════════════════════════════════════════════
// STUDENT LIST VIEW
// ═══════════════════════════════════════════════════════
function renderStudentList(cls){
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var tmax=70;
  var clsIdx=DB.classes.indexOf(cls);
  var color=CLS_COLORS[clsIdx%CLS_COLORS.length];

  var ranked=students.map(function(s){
    var c=calcStudent(s);
    return{s:s,total:c.total,abs:countAbsences(cls,s.id)};
  }).sort(function(a,b){return b.total-a.total;});

  var html='';
  html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
  html+='<div style="width:14px;height:14px;border-radius:50%;background:'+color+';flex-shrink:0;"></div>';
  html+='<div style="font-size:16px;font-weight:900;">'+esc(cls)+'</div>';
  html+='<span style="margin-right:auto;font-size:10px;color:var(--text3);">اختر طالباً لعرض تقريره</span>';
  html+='</div>';

  html+='<div class="search-bar">';
  html+='<input class="search-inp" placeholder="🔍 بحث..." oninput="filterStudentList(this.value)"/>';
  html+='</div>';

  html+='<div id="studentListGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">';

  ranked.forEach(function(r,i){
    var pct=Math.round(r.total/tmax*100);
    var color2=gradeColor(pct);
    var initials=r.s.name.split(' ').slice(0,2).map(function(x){return x.charAt(0);}).join('');
    html+='<div onclick="openStudentReport(\''+esc(cls)+'\','+r.s.id+')" data-name="'+esc(r.s.name)+'" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;transition:all .15s;position:relative;" onmouseover="this.style.borderColor=\''+color2+'\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
    html+='<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;">';
    if(r.s.photo||DB.meta.defaultStudentPhoto){
      html+='<div class="stu-avatar"><img src="'+(r.s.photo||DB.meta.defaultStudentPhoto)+'" alt=""/></div>';
    } else {
      html+='<div class="stu-avatar" style="font-size:14px;">'+esc(initials)+'</div>';
    }
    html+='<div style="flex:1;overflow:hidden;">';
    html+='<div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(r.s.name)+'</div>';
    html+='<div style="font-size:9px;color:var(--text3);">ترتيب: #'+(i+1)+'</div>';
    html+='</div></div>';
    // Mini progress bar
    html+='<div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden;margin-bottom:5px;">';
    html+='<div style="width:'+pct+'%;background:'+color2+';height:100%;border-radius:4px;"></div>';
    html+='</div>';
    html+='<div style="display:flex;justify-content:space-between;font-size:10px;">';
    html+='<span style="font-weight:700;color:'+color2+'">'+r.total+'/'+tmax+'</span>';
    html+='<span style="color:'+color2+'">'+gradeAr(pct)+'</span>';
    html+='</div>';
    if(r.abs>0)html+='<div style="position:absolute;top:8px;left:8px;background:rgba(239,68,68,.2);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:6px;font-size:8px;padding:1px 5px;">'+r.abs+' غياب</div>';
    html+='</div>';
  });

  if(!ranked.length) html+='<div class="empty-state" style="grid-column:1/-1;"><div class="es-icon">👥</div><div class="es-msg">لا يوجد طلاب</div></div>';

  html+='</div>';
  document.getElementById('mainContent').innerHTML=html;
  window._studentListCls=cls;
}

function filterStudentList(q){
  q=q.trim();
  var items=document.querySelectorAll('#studentListGrid > div[data-name]');
  items.forEach(function(el){
    el.style.display=(!q||el.getAttribute('data-name').indexOf(q)>=0)?'':'none';
  });
}

// ═══════════════════════════════════════════════════════
// INDIVIDUAL STUDENT REPORT
// ═══════════════════════════════════════════════════════
function openStudentReport(cls,sid){
  currentStudent=sid;
  currentCls=cls;
  // Update sidebar active
  DB.classes.forEach(function(c){
    var el=document.getElementById('ci_'+esc(c));
    if(el)el.classList.toggle('active',c===cls);
  });
  var _bb2=document.getElementById('backBtn');if(_bb2)_bb2.classList.add('show');
  renderStudentReport(cls,sid);
}

function renderStudentReport(cls,sid){
  var students=DB.data[cls]||[];
  var s=null;
  students.forEach(function(x){if(x.id===sid)s=x;});
  if(!s){document.getElementById('mainContent').innerHTML='<div class="empty-state"><div class="es-icon">❓</div><div class="es-msg">لم يُعثر على الطالب</div></div>';return;}

  var tmax=70;
  var calc=calcStudent(s);
  var pct=Math.round(calc.total/tmax*100);
  var color=gradeColor(pct);
  var absCount=countAbsences(cls,s.id);
  var sickCount=countSick(cls,s.id);

  // Rank
  var ranked=(DB.data[cls]||[]).filter(function(x){return x.name;}).map(function(x){return{id:x.id,total:calcStudent(x).total};}).sort(function(a,b){return b.total-a.total;});
  var rank=1;
  ranked.forEach(function(r,i){if(r.id===sid)rank=i+1;});
  var totalInCls=ranked.length;

  var initials=s.name.split(' ').slice(0,2).map(function(x){return x.charAt(0);}).join('');

  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var awList=ALL_WEEKS.slice(0,aw);

  var html='';

  // Student header card
  html+='<div class="stu-report-header">';
  if(s.photo||DB.meta.defaultStudentPhoto){
    html+='<div class="stu-avatar" style="width:56px;height:56px;"><img src="'+(s.photo||DB.meta.defaultStudentPhoto)+'" alt=""/></div>';
  } else {
    html+='<div class="stu-avatar">'+esc(initials)+'</div>';
  }
  html+='<div class="stu-info">';
  html+='<div class="stu-name">'+esc(s.name)+'</div>';
  html+='<div class="stu-cls">'+esc(cls)+' — '+(DB.meta&&DB.meta.subject?esc(DB.meta.subject):'')+'</div>';
  html+='<div class="stu-badges">';
  html+='<span class="stu-badge" style="background:'+color+'22;color:'+color+';border-color:'+color+'44;">'+gradeAr(pct)+'</span>';
  html+='<span class="stu-badge" style="background:rgba(59,130,246,.15);color:var(--blue3);border-color:rgba(59,130,246,.3);">ترتيب #'+rank+' / '+totalInCls+'</span>';
  if(absCount>0) html+='<span class="stu-badge" style="background:rgba(239,68,68,.15);color:#f87171;border-color:rgba(239,68,68,.3);">'+absCount+' غياب</span>';
  if(sickCount>0) html+='<span class="stu-badge" style="background:rgba(245,158,11,.15);color:var(--yellow2);border-color:rgba(245,158,11,.3);">🤒 '+sickCount+' مرض</span>';
  html+='</div></div>';
  html+='<div class="stu-score-big">';
  html+='<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;">';
  html+=svgRing(calc.total,tmax,color,80);
  html+='<div style="position:absolute;text-align:center;">';
  html+='<div class="stu-score-num" style="color:'+color+';font-size:18px;">'+calc.total+'</div>';
  html+='<div style="font-size:8px;color:var(--text3);">/'+tmax+'</div>';
  html+='</div></div>';
  html+='<div class="stu-score-rank" style="text-align:center;">'+pct+'%</div>';
  html+='</div>';
  html+='</div>';

  // Breakdown cards
  html+='<div class="section-title">📋 تفاصيل مكونات الدرجة</div>';
  html+='<div class="breakdown-grid">';
  html+=breakdownCard('📊 التقييمات (متوسط)',calc.avgAssess,20,'#3b82f6');
  html+=breakdownCard('📝 الواجبات (متوسط)',calc.avgHw,10,'#8b5cf6');
  html+=breakdownCard('🌟 السلوك',calc.avgBeh,10,'#10b981');
  html+=breakdownCard('📋 الاختبارات',calc.exTotal,30,'#f59e0b');
  html+='</div>';

  // Weekly assessment chart
  html+='<div class="section-title">📈 أداء التقييم الأسبوعي</div>';
  html+='<div class="weekly-chart">';
  html+='<div class="wk-bars">';
  awList.forEach(function(w){
    var av=s['a'+w];
    var hv=s['h'+w];
    var aVal=(av===''||av===undefined||av===null)?null:(av==='غ'?0:(av==='م'?null:Number(av)||0));
    var hVal=(hv===''||hv===undefined||hv===null)?null:(hv==='غ'?0:(hv==='م'?null:Number(hv)||0));
    var aPct=aVal!==null?(aVal/20*100):0;
    var aColor=aVal!==null?gradeColor(aVal/20*100):'#334155';
    html+='<div class="wk-col">';
    html+='<div class="wk-bar-wrap" title="أسبوع '+w+'">';
    if(av==='غ'){
      html+='<div class="wk-bar" style="height:6px;background:#ef4444;min-height:6px;" data-val="أسبوع '+w+': غائب"></div>';
    } else if(av==='م'){
      html+='<div class="wk-bar" style="height:6px;background:#3b82f6;min-height:6px;" data-val="أسبوع '+w+': معذور"></div>';
    } else if(aVal!==null){
      html+='<div class="wk-bar" style="height:'+Math.max(5,aPct)+'%;background:'+aColor+';" data-val="أسبوع '+w+': '+aVal+'/20"></div>';
    } else {
      html+='<div style="width:100%;height:3px;background:var(--border);border-radius:2px;margin-bottom:2px;"></div>';
    }
    html+='</div>';
    html+='<div class="wk-lbl">'+w+'</div>';
    html+='</div>';
  });
  html+='</div>';
  // Legend
  html+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:9px;">';
  html+='<span style="color:#ef4444;display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#ef4444;display:inline-block;"></span>غائب</span>';
  html+='<span style="color:#3b82f6;display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#3b82f6;display:inline-block;"></span>معذور</span>';
  html+='<span style="color:#10b981;display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#10b981;display:inline-block;"></span>أداء جيد</span>';
  html+='</div>';
  html+='</div>';

  // Weekly grades table
  html+='<div class="section-title">📅 جدول الدرجات الأسبوعية</div>';
  html+='<div class="grade-table-wrap"><table class="grade-table">';
  html+='<thead><tr>';
  html+='<th>الأسبوع</th>';
  html+='<th>التقييم<br><span style="font-size:8px;opacity:.7;">/20</span></th>';
  html+='<th>الواجب<br><span style="font-size:8px;opacity:.7;">/10</span></th>';
  html+='<th>حالة التقييم</th>';
  html+='</tr></thead><tbody>';

  awList.forEach(function(w){
    var av=s['a'+w];
    var hv=s['h'+w];
    var aDisp=(av===''||av===undefined||av===null)?'—':(av==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':av==='م'?'<span style="color:#3b82f6;">م</span>':av);
    var hDisp=(hv===''||hv===undefined||hv===null)?'—':(hv==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':hv==='م'?'<span style="color:#3b82f6;">م</span>':hv);
    var aNum=(av===''||av===undefined||av===null||av==='م')?null:(av==='غ'?0:Number(av)||0);
    var status='';
    if(av==='غ') status='<span style="background:rgba(239,68,68,.2);color:#f87171;padding:1px 7px;border-radius:6px;font-size:9px;">غياب</span>';
    else if(av==='م') status='<span style="background:rgba(59,130,246,.15);color:var(--blue3);padding:1px 7px;border-radius:6px;font-size:9px;">معذور</span>';
    else if(aNum===null) status='<span style="color:var(--text3);font-size:9px;">لم يُرصد</span>';
    else {
      var p=aNum/20*100;
      status='<span class="grade-pill" style="background:'+gradeColor(p)+'22;color:'+gradeColor(p)+';border:1px solid '+gradeColor(p)+'44;font-size:9px;">'+gradeAr(p)+'</span>';
    }
    html+='<tr><td style="font-weight:700;color:var(--text2);">'+w+'</td><td>'+aDisp+'</td><td>'+hDisp+'</td><td>'+status+'</td></tr>';
  });

  html+='</tbody></table></div>';

  // Other grades
  html+='<div class="section-title">📋 اختبارات وسلوك</div>';
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">';
  [['beh1','سلوك 1','5'],['beh2','سلوك 2','5'],['ex1','اختبار 1','15'],['ex2','اختبار 2','15']].forEach(function(f){
    var val=s[f[0]];
    var disp=(val===''||val===undefined||val===null)?'—':val;
    var num=(val===''||val===undefined||val===null||val==='م')?null:(val==='غ'?0:Number(val)||0);
    var c2=num!==null?gradeColor(num/Number(f[2])*100):'#475569';
    html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;flex:1;min-width:120px;text-align:center;">';
    html+='<div style="font-size:9px;color:var(--text3);margin-bottom:4px;">'+f[1]+'</div>';
    html+='<div style="font-size:20px;font-weight:900;color:'+c2+'">'+disp+'</div>';
    html+='<div style="font-size:9px;color:var(--text3);">/'+f[2]+'</div>';
    html+='</div>';
  });
  html+='</div>';

  // Absence timeline
  if(absCount>0||sickCount>0){
    html+='<div class="section-title">📋 ملخص الغياب</div>';
    html+='<div class="abs-summary">';
    html+='<span class="abs-badge" style="background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);">غياب: '+absCount+' حصة</span>';
    html+='<span class="abs-badge" style="background:rgba(245,158,11,.15);color:var(--yellow2);border:1px solid rgba(245,158,11,.3);">مرض: '+sickCount+' حصة</span>';
    html+='<span class="abs-badge" style="background:rgba(100,116,139,.15);color:var(--text2);border:1px solid var(--border);">الإجمالي: '+(absCount+sickCount)+' حصة</span>';
    html+='</div>';
  }

  // Compare with class average
  html+='<div class="section-title" style="margin-top:4px;">📊 المقارنة مع متوسط الفصل</div>';
  var clsStudents=(DB.data[cls]||[]).filter(function(x){return x.name;});
  var clsAvg=clsStudents.length?Math.round(clsStudents.map(function(x){return calcStudent(x).total;}).reduce(function(a,b){return a+b;},0)/clsStudents.length):0;
  var diff=calc.total-clsAvg;
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;">';
  html+='<div style="flex:1;text-align:center;">';
  html+='<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">درجة الطالب</div>';
  html+='<div style="font-size:26px;font-weight:900;color:'+color+'">'+calc.total+'</div>';
  html+='<div style="font-size:9px;color:var(--text3);">/'+tmax+'</div>';
  html+='</div>';
  html+='<div style="display:flex;align-items:center;font-size:18px;color:var(--border2);">—</div>';
  html+='<div style="flex:1;text-align:center;">';
  html+='<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">متوسط الفصل</div>';
  html+='<div style="font-size:26px;font-weight:900;color:var(--blue3)">'+clsAvg+'</div>';
  html+='<div style="font-size:9px;color:var(--text3);">/'+tmax+'</div>';
  html+='</div>';
  html+='<div style="display:flex;align-items:center;font-size:18px;color:var(--border2);">=</div>';
  html+='<div style="flex:1;text-align:center;">';
  html+='<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">الفرق</div>';
  html+='<div style="font-size:26px;font-weight:900;color:'+(diff>=0?'#10b981':'#ef4444')+'">'+(diff>=0?'+':'')+diff+'</div>';
  html+='<div style="font-size:9px;color:'+(diff>=0?'#10b981':'#ef4444')+'">'+(diff>=0?'فوق المتوسط':'تحت المتوسط')+'</div>';
  html+='</div>';
  html+='</div>';

  document.getElementById('mainContent').innerHTML=html;
}

// ═══════════════════════════════════════════════════════
// FOLLOWER REPORT — تقرير المتابعين
// ═══════════════════════════════════════════════════════
var FR = { search:'', selectedStudents:[], showAll:true, printMode:false };

function weekStartDate(week){
  // Returns Date for start of that week (Saturday) based on DB startDate
  if(!DB.meta||!DB.meta.startDate) return null;
  var d=new Date(DB.meta.startDate);
  d.setDate(d.getDate()+(week-1)*7);
  return d;
}

