/* ══════════════════════════════════════════════════════════════════════
   app-12-ai.js — المساعد الذكي لدفتري (Dalty AI)
   ① 📋 قراءة صورة ورقة الغياب وتسجيلها
   ② 👥 قراءة صورة قائمة الفصل وإدراج الأسماء
   ③ 📝 قراءة صورة كشف درجات ورصدها
   ④ 💬 أوامر بالكتابة: نقل / نسخ / تبديل / رصد / تسجيل غياب
   ⑤ ↩ تراجع عن آخر عمليات الذكاء

   • الاتصال مباشر من الجهاز إلى Anthropic بمفتاح المستخدم نفسه.
   • المفتاح يُحفظ على الجهاز فقط (خارج قاعدة البيانات) فلا يُرفع للسحابة
     ولا يدخل النسخ الاحتياطية.
   • لا يُكتب شيء في بياناتك قبل أن تراجعه وتضغط «تطبيق».
   ══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var CFG_KEY = 'dalty_ai_cfg';
var CONSENT_KEY = 'dalty_ai_consent';

/* ─── مزوّدو الذكاء الاصطناعي ───
   gemini: مجاني بمفتاح Google AI Studio (حصة يومية محدودة)
   claude: مدفوع بمفتاح Anthropic                                       */
var MODELS = [   /* Claude */
  { id: 'claude-sonnet-5-5',         label: 'Claude Sonnet 5.5 — متوازن (موصى به)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — الأسرع والأرخص' },
  { id: 'claude-opus-5-5',           label: 'Claude Opus 5.5 — الأدق للخط الصعب' }
];
var GMODELS = [  /* Gemini — كلها لها طبقة مجانية */
  { id: 'gemini-3.8-flash',      label: 'Gemini 3.8 Flash — الأحدث والأدق (موصى به)' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — الأخف والأسرع' },
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash' }
];
/* عند نفاد حصة نموذج (429) أو عدم توفره (404/503) نجرّب التالي تلقائياً */
var GEMINI_FALLBACK = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];
var MAX_IMAGES = 4;

/* ═════════════ الإعدادات (على الجهاز فقط) ═════════════ */
function cfgGet() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { o = {}; }
  return {
    provider: (o.provider === 'claude' || o.provider === 'gemini') ? o.provider : (o.key ? 'claude' : 'gemini'),
    key: String(o.key || ''), model: String(o.model || MODELS[0].id),
    gkey: String(o.gkey || ''), gmodel: String(o.gmodel || GMODELS[0].id),
    sendRoster: o.sendRoster !== false
  };
}
function cfgSet(o) { try { localStorage.setItem(CFG_KEY, JSON.stringify(o)); } catch (e) {} }
function hasKey() { var c = cfgGet(); return !!(c.provider === 'gemini' ? c.gkey : c.key); }

/* ═════════════ الاتصال ═════════════ */
var _abort = null;
function guardNet() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('OFFLINE'));
  return null;
}
function mkErr(msg, status, code) { var e = new Error(msg); e.status = status; e.code = code; return e; }

function callAI(opts) {
  var cfg = cfgGet();
  if (!(cfg.provider === 'gemini' ? cfg.gkey : cfg.key)) return Promise.reject(new Error('NO_KEY'));
  var off = guardNet(); if (off) return off;
  return cfg.provider === 'gemini' ? callGemini(opts, cfg) : callClaude(opts, cfg);
}

/* ── Claude (Anthropic) ── */
function callClaude(opts, cfg) {
  var ctrl = new AbortController(); _abort = ctrl;
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 120000);
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: ctrl.signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: opts.model || cfg.model,
      max_tokens: opts.maxTokens || 6000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.content }]
    })
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      clearTimeout(timer);
      if (!r.ok) {
        throw mkErr((j && j.error && j.error.message) || ('HTTP ' + r.status), r.status,
          r.status === 401 ? 'BAD_KEY' : (r.status === 429 ? 'QUOTA' : ''));
      }
      return j;
    });
  }).then(function (j) {
    var t = (j.content || []).filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; }).join('\n');
    return { text: t, truncated: j.stop_reason === 'max_tokens' };
  }).catch(function (e) { clearTimeout(timer); throw e; });
}

/* ── Gemini (Google) — generateContent عبر REST ── */
function toGeminiParts(content) {
  /* الأفضل وضع النص قبل الصور */
  var texts = [], imgs = [];
  content.forEach(function (b) {
    if (b.type === 'image') imgs.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
    else texts.push({ text: b.text });
  });
  return texts.concat(imgs);
}
function geminiOnce(model, opts, cfg) {
  var ctrl = new AbortController(); _abort = ctrl;
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 120000);
  var gen = { maxOutputTokens: opts.ping ? 64 : 16000 };
  if (!opts.ping) gen.responseMimeType = 'application/json';
  var body = {
    contents: [{ role: 'user', parts: toGeminiParts(opts.content) }],
    generationConfig: gen
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    signal: ctrl.signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.gkey },
    body: JSON.stringify(body)
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      clearTimeout(timer);
      if (!r.ok) {
        var msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
        var code = '';
        if (/API key not valid|API_KEY_INVALID|API key expired/i.test(msg + JSON.stringify((j && j.error && j.error.details) || ''))) code = 'BAD_KEY';
        else if (r.status === 429) code = 'QUOTA';
        else if (r.status === 404) code = 'MODEL';
        else if (r.status === 503 || r.status === 500) code = 'BUSY';
        else if (r.status === 403) code = 'DENIED';
        throw mkErr(msg, r.status, code);
      }
      return j;
    });
  }).then(function (j) {
    var cand = (j.candidates || [])[0];
    if (!cand) {
      var why = j.promptFeedback && j.promptFeedback.blockReason;
      throw mkErr('blocked ' + (why || ''), 200, 'BLOCKED');
    }
    var parts = (cand.content && cand.content.parts) || [];
    var t = parts.filter(function (p) { return p && typeof p.text === 'string' && !p.thought; })
      .map(function (p) { return p.text; }).join('\n');
    var trunc = cand.finishReason === 'MAX_TOKENS';
    if (!t && !opts.ping && !trunc) throw mkErr('empty ' + (cand.finishReason || ''), 200, 'BLOCKED');
    return { text: t, truncated: trunc };
  }).catch(function (e) { clearTimeout(timer); throw e; });
}
function callGemini(opts, cfg) {
  var first = opts.model || cfg.gmodel;
  var chain = [first].concat(GEMINI_FALLBACK.filter(function (m) { return m !== first; }));
  function step(i) {
    return geminiOnce(chain[i], opts, cfg).catch(function (e) {
      var retry = (e && (e.code === 'QUOTA' || e.code === 'MODEL' || e.code === 'BUSY')) && i + 1 < chain.length;
      if (retry) return step(i + 1);
      throw e;
    });
  }
  return step(0);
}

function errMsg(e) {
  var m = String((e && e.message) || e || '');
  var gem = cfgGet().provider === 'gemini';
  if (m === 'NO_KEY') return 'أدخل مفتاح الذكاء الاصطناعي أولاً من ⚙️ الإعدادات.';
  if (m === 'OFFLINE') return 'لا يوجد اتصال بالإنترنت — المساعد يحتاج اتصالاً.';
  if (e && e.name === 'AbortError') return 'تم الإلغاء أو انتهت المهلة. جرّب مرة أخرى.';
  if (m === 'BAD_JSON') return 'لم أستطع فهم رد الذكاء الاصطناعي. جرّب صورة أوضح أو أقل عدداً من الصفوف.';
  if (m === 'TRUNCATED') return 'الجدول كبير والرد انقطع. صوّر جزءاً أصغر (مثلاً نصف الصفوف) وأعد المحاولة.';
  var st = e && e.status, code = e && e.code;
  if (code === 'BAD_KEY' || st === 401) return 'المفتاح غير صحيح أو ملغى. راجعه في ⚙️ الإعدادات.';
  if (code === 'BLOCKED') return 'رفض النموذج قراءة هذه الصورة (مرشّح الأمان). جرّب صورة أوضح أو بزاوية أخرى.';
  if (code === 'QUOTA' || st === 429) {
    return gem ? 'استُنفدت الحصة المجانية مؤقتاً (للدقيقة أو لليوم) في كل النماذج المجرَّبة. انتظر قليلاً، أو أعد المحاولة غداً (تتجدد الحصة اليومية منتصف الليل بتوقيت المحيط الهادئ)، أو استخدم Claude.'
               : 'تجاوزت حد الطلبات مؤقتاً. انتظر قليلاً ثم أعد المحاولة.';
  }
  if (code === 'DENIED' || st === 403) return gem ? 'تعذّر الوصول: قد يكون المفتاح مقيّداً، أو الحساب أقل من 18 سنة، أو الخدمة غير متاحة لحسابك.' : 'حسابك لا يملك صلاحية لهذا الطلب.';
  if (st === 404 || code === 'MODEL') return 'النموذج المختار غير متاح لحسابك. غيّره من ⚙️ الإعدادات.';
  if (st === 413) return 'الصور كبيرة جداً. قلّل عدد الصور.';
  if (st === 400 && /credit|balance/i.test(m)) return 'رصيد حسابك في Anthropic غير كافٍ. اشحنه من لوحة الحساب.';
  if (st >= 500 || code === 'BUSY') return 'خدمة الذكاء الاصطناعي مشغولة الآن. أعد المحاولة بعد لحظات.';
  if (e instanceof TypeError || /Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخدمة. تأكد من الإنترنت ثم أعد المحاولة.';
  return 'حدث خطأ: ' + m;
}
function parseJSON(text) {
  var t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  var a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('BAD_JSON');
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new Error('BAD_JSON'); }
}

/* ═════════════ تجهيز الصور (تصغير + JPEG) ═════════════ */
function prepImage(file) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 1800, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      var sc = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var d = c.toDataURL('image/jpeg', 0.85);
      res({ dataUrl: d, b64: d.split(',')[1], name: file.name || 'image' });
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('IMG')); };
    img.src = url;
  });
}

/* ═════════════ مطابقة الأسماء العربية ═════════════ */
function normAr(s) {
  return String(s == null ? '' : s)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A').replace(/\u0629/g, '\u0647')
    .replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A')
    .replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, ' ')
    .replace(/[^\u0621-\u064Aa-zA-Z\s]/g, ' ')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  if (a === b) return 0;
  var al = a.length, bl = b.length;
  if (!al) return bl; if (!bl) return al;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= bl; j++) prev[j] = j;
  for (i = 1; i <= al; i++) {
    cur[0] = i;
    for (j = 1; j <= bl; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    }
    var t = prev; prev = cur; cur = t;
  }
  return prev[bl];
}
function tokSim(a, b) {
  if (a === b) return 1;
  var L = Math.max(a.length, b.length);
  return L ? 1 - lev(a, b) / L : 0;
}
function nameSim(a, b) {
  var ta = normAr(a).split(' ').filter(Boolean), tb = normAr(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  var used = {}, matched = 0;
  ta.forEach(function (x) {
    var best = -1, bi = -1;
    tb.forEach(function (y, j) {
      if (used[j]) return;
      var s = tokSim(x, y);
      if (s > best) { best = s; bi = j; }
    });
    if (bi >= 0 && (best >= 0.75)) { matched += best >= 0.99 ? 1 : 0.85; used[bi] = true; }
  });
  return 2 * matched / (ta.length + tb.length);
}
/* يُرجع {idx, conf:'high'|'mid'|'none', score} — idx فهرس الطالب في مصفوفة الفصل */
function matchStudent(readName, rosterNo, arr) {
  var scores = [];
  arr.forEach(function (s, i) { if (s && (s.name || '').trim()) scores.push({ i: i, sc: nameSim(readName, s.name) }); });
  if (!scores.length) return { idx: -1, conf: 'none', score: 0 };
  scores.sort(function (x, y) { return y.sc - x.sc; });
  var best = scores[0], second = scores[1] || { sc: 0 };
  var n = parseInt(rosterNo, 10);
  if (n >= 1 && n <= arr.length && arr[n - 1] && (arr[n - 1].name || '').trim()) {
    var sr = nameSim(readName, arr[n - 1].name);
    if (sr >= 0.5 || (best.i === n - 1)) {
      return { idx: n - 1, conf: sr >= 0.75 ? 'high' : 'mid', score: sr };
    }
  }
  if (best.sc >= 0.6 && best.sc - second.sc >= 0.08) return { idx: best.i, conf: best.sc >= 0.8 ? 'high' : 'mid', score: best.sc };
  return { idx: -1, conf: 'none', score: best.sc };
}

/* ═════════════ معرفة الأعمدة والقيم ═════════════ */
function activeWeeks() {
  return Math.min(Math.max(1, Number(DB && DB.meta && DB.meta.activeWeeks) || 14), ALL_WEEKS.length);
}
function colByKey(key) {
  var c = null;
  allCols().forEach(function (x) { if (x.field === key || x.id === key) c = x; });
  return c;
}
function maxFor(key) {
  var c = colByKey(key);
  if (c && c.max) return Number(c.max);
  if (/^a\d+$/.test(key)) return 20;
  if (/^(h|bw)\d+$/.test(key)) return 10;
  if (key === 'ex1' || key === 'ex2') return 15;
  return 100;
}
function labelFor(key) {
  var c = colByKey(key);
  if (c && c.label) return c.label;
  var m;
  if ((m = /^a(\d+)$/.exec(key))) return 'تقييم أسبوع ' + m[1];
  if ((m = /^h(\d+)$/.exec(key))) return 'واجب أسبوع ' + m[1];
  if ((m = /^bw(\d+)$/.exec(key))) return 'سلوك أسبوع ' + m[1];
  if (key === 'ex1') return 'اختبار 1';
  if (key === 'ex2') return 'اختبار 2';
  return key;
}
/* field + week → مفتاح الحقل في بيانات الطالب (أو null) */
function keyOf(field, week) {
  var f = String(field || '').toLowerCase();
  if (f === 'ex1' || f === 'ex2') return f;
  var w = parseInt(week, 10);
  if (!(w >= 1 && w <= activeWeeks())) return null;
  if (f === 'assess' || f === 'a') return 'a' + w;
  if (f === 'hw' || f === 'h') return 'h' + w;
  if (f === 'beh' || f === 'bw') return 'bw' + w;
  return null;
}
function hasData(v) { return !(v === '' || v === undefined || v === null); }

function toLatinDigits(s) {
  return String(s)
    .replace(/[\u0660-\u0669]/g, function (d) { return '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(d); })
    .replace(/[\u06F0-\u06F9]/g, function (d) { return '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.indexOf(d); })
    .replace(/[\u066B,\u060C]/g, '.');
}
/* يحوّل نصاً مقروءاً إلى قيمة درجة: {skip} | {bad, why} | {val} */
function normVal(raw, max) {
  if (raw === null || raw === undefined) return { skip: true };
  var s = String(raw).trim();
  if (s === '' || s === '-' || s === '\u2014' || /^null$/i.test(s)) return { skip: true };
  if (/^(\u063A|\u063A\u0627\u0626\u0628|\u063A\u0627\u064A\u0628|absent)$/i.test(s)) return { val: '\u063A' };
  if (/^(\u0645|\u0645\u0639\u0641\u0649|\u0645\u0639\u0630\u0648\u0631|excused)$/i.test(s)) return { val: '\u0645' };
  var s2 = toLatinDigits(s).replace(/\s+/g, '');
  var m = s2.match(/^(\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)?$/);
  if (!m) return { bad: true, why: 'قيمة غير مفهومة' };
  var v = parseFloat(m[1]);
  if (isNaN(v)) return { bad: true, why: 'قيمة غير مفهومة' };
  if (v > max) return { bad: true, why: 'أكبر من ' + max };
  return { val: v };
}

/* ═════════════ الأسابيع/الفترات/الفصل ═════════════ */
function periodsFor(cls, week) {
  try { return buildAbsCols(cls, week) || []; } catch (e) { return []; }
}
function fmtVal(v) { return !hasData(v) ? 'فارغ' : (v === '\u063A' ? 'غائب' : (v === '\u0645' ? 'معفى' : String(v))); }

/* ═════════════ خطة التغييرات + التطبيق + التراجع ═════════════ */
var undoStack = [];
function emptyPlan() { return { cells: [], abs: [], add: [], warn: [], over: 0, skipped: 0 }; }

function snapshotJSON(o) { return JSON.parse(JSON.stringify(o)); }

function refreshPages() {
  try { if (typeof _refreshCurrentAndRelated === 'function') _refreshCurrentAndRelated(); } catch (e) {}
}

function applyPlan(cls, plan, label) {
  var arr = DB.data[cls] = DB.data[cls] || [];
  /* تحقق أن الفصل لم يتغير أثناء المراجعة (مثلاً وصل تحديث من جهاز آخر) */
  var bad = false;
  plan.cells.concat(plan.abs).forEach(function (c) {
    if (!arr[c.idx] || String(arr[c.idx].id) !== String(c.id)) bad = true;
  });
  if (bad) return { ok: false, msg: 'تغيّرت بيانات الفصل أثناء المراجعة. أعد التحليل.' };

  var snap = {}, addedIds = [];
  function snapStu(i) {
    var s = arr[i];
    if (!s || snap[s.id] !== undefined) return;
    snap[s.id] = { st: snapshotJSON(s), abs: snapshotJSON(getStudentAbsences(cls, s.id)) };
  }
  var seq = Date.now();
  (plan.add || []).forEach(function (name) {
    var ns = emptyStudent(seq++, name);
    arr.push(ns); addedIds.push(ns.id);
  });
  plan.cells.forEach(function (c) { snapStu(c.idx); arr[c.idx][c.key] = c.nu; });
  var touched = {};
  plan.abs.forEach(function (a) {
    snapStu(a.idx);
    var s = arr[a.idx], ab = getStudentAbsences(cls, s.id), k = 'w' + a.week + '_ci' + a.ci;
    if (a.nu) ab[k] = a.nu; else delete ab[k];
    touched[s.id + '|' + a.week] = { id: s.id, week: a.week };
  });
  Object.keys(touched).forEach(function (k) {
    try { applyAbsenceToGrades(cls, touched[k].id, touched[k].week); } catch (e) {}
  });
  saveDB();
  refreshPages();

  undoStack.push({
    label: label, t: Date.now(),
    fn: function () {
      var a = DB.data[cls] || [];
      Object.keys(snap).forEach(function (id) {
        for (var i = 0; i < a.length; i++) {
          if (String(a[i].id) === String(id)) {
            var o = a[i];
            Object.keys(o).forEach(function (k) { delete o[k]; });
            Object.assign(o, snap[id].st);
            break;
          }
        }
        if (!DB.absences) DB.absences = {};
        if (!DB.absences[cls]) DB.absences[cls] = {};
        DB.absences[cls][id] = snap[id].abs;
      });
      DB.data[cls] = (DB.data[cls] || []).filter(function (s) { return addedIds.indexOf(s.id) < 0; });
      saveDB(); refreshPages();
    }
  });
  if (undoStack.length > 20) undoStack.shift();
  return { ok: true };
}

function undoLast() {
  var u = undoStack.pop();
  if (!u) return null;
  try { u.fn(); } catch (e) { console.error('[AI undo]', e); }
  return u;
}

/* ═════════════ خطة من جدول مقروء من صورة ═════════════ */
/* tbl = {kind:'att'|'grades', cls, cols:[{label,map}], rows:[{idx,cells:[]}], skipExisting, clearPresent} */
function planFromTable(tbl) {
  var plan = emptyPlan(), arr = DB.data[tbl.cls] || [], seen = {};
  tbl.rows.forEach(function (r) {
    if (r.idx < 0 || !arr[r.idx]) return;
    if (seen[r.idx]) { plan.warn.push('الطالب «' + arr[r.idx].name + '» اختير في أكثر من صف — أُخذ الصف الأول فقط.'); return; }
    seen[r.idx] = true;
    var s = arr[r.idx];
    tbl.cols.forEach(function (c, j) {
      if (!c.map) return;
      var cell = r.cells[j];
      if (tbl.kind === 'att') {
        var ab = getStudentAbsences(tbl.cls, s.id), k = 'w' + c.map.week + '_ci' + c.map.ci, cur = ab[k];
        if (cell === 'absent') {
          if (cur === 'abs') return;
          if (cur === 'sick') { plan.skipped++; return; }
          plan.abs.push({ idx: r.idx, id: s.id, week: c.map.week, ci: c.map.ci, old: cur || '', nu: 'abs' });
        } else if (cell === 'present' && tbl.clearPresent && cur === 'abs') {
          plan.abs.push({ idx: r.idx, id: s.id, week: c.map.week, ci: c.map.ci, old: 'abs', nu: '' });
        }
      } else {
        var key = c.map.key, nv = normVal(cell, maxFor(key));
        if (nv.skip) return;
        if (nv.bad) { plan.skipped++; return; }
        var old = s[key];
        if (hasData(old) && String(old) === String(nv.val)) return;
        if (hasData(old)) {
          if (tbl.skipExisting) { plan.skipped++; return; }
          plan.over++;
        }
        plan.cells.push({ idx: r.idx, id: s.id, key: key, old: old, nu: nv.val });
      }
    });
  });
  return plan;
}

/* ═════════════ خطة من أوامر مكتوبة (ops) ═════════════ */
function planFromOps(cls, ops, opts) {
  opts = opts || {};
  var arr = DB.data[cls] || [], plan = emptyPlan();
  var virt = {}, absVirt = {};
  var defWeek = opts.week || 1;

  function resolveStu(ref) {
    if (ref === null || ref === undefined || ref === '') return -1;
    if (typeof ref === 'number' || /^\d+$/.test(String(ref).trim())) {
      var n = parseInt(ref, 10);
      if (n >= 1 && n <= arr.length && arr[n - 1] && (arr[n - 1].name || '').trim()) return n - 1;
    }
    var m = matchStudent(String(ref), null, arr);
    return m.idx;
  }
  function resolveList(sel) {
    var out = [];
    if (sel === 'all' || sel === undefined || sel === null) {
      arr.forEach(function (s, i) { if ((s.name || '').trim()) out.push(i); });
      return out;
    }
    (Array.isArray(sel) ? sel : [sel]).forEach(function (r) {
      var i = resolveStu(r);
      if (i < 0) plan.warn.push('تعذّر تحديد الطالب «' + r + '».');
      else if (out.indexOf(i) < 0) out.push(i);
    });
    return out;
  }
  function vget(i, k) { var kk = i + '|' + k; return (kk in virt) ? virt[kk] : arr[i][k]; }
  function vset(i, k, v) { virt[i + '|' + k] = v; }
  function keyFor(ref, op) {
    var w = (ref && ref.week != null) ? ref.week : (op.week != null ? op.week : defWeek);
    var key = keyOf(ref && ref.field != null ? ref.field : op.field, w);
    if (!key) plan.warn.push('عمود غير صالح (' + ((ref && ref.field) || op.field) + ' – أسبوع ' + w + ').');
    return key;
  }
  function checkVal(v, key) {
    if (v === '' || v === null || v === undefined) return { val: '' };
    if (v === '\u063A' || v === '\u0645') return { val: v };
    var nv = normVal(v, maxFor(key));
    if (nv.skip) return { val: '' };
    if (nv.bad) { plan.warn.push('قيمة «' + v + '» غير مقبولة في ' + labelFor(key) + ' (' + nv.why + ').'); return null; }
    return { val: nv.val };
  }

  (ops || []).forEach(function (op) {
    if (!op || !op.type) return;
    var t = String(op.type), i, key, c;
    if (t === 'set_grade') {
      i = resolveStu(op.student); key = keyFor(null, op);
      if (i < 0) { plan.warn.push('تعذّر تحديد الطالب «' + op.student + '».'); return; }
      if (!key) return;
      c = checkVal(op.value, key); if (!c) return;
      vset(i, key, c.val);
    } else if (t === 'fill_column' || t === 'clear_cells') {
      key = keyFor(null, op); if (!key) return;
      c = checkVal(t === 'clear_cells' ? '' : op.value, key); if (!c) return;
      resolveList(op.students).forEach(function (k) { vset(k, key, c.val); });
    } else if (t === 'set_absence') {
      i = resolveStu(op.student);
      if (i < 0) { plan.warn.push('تعذّر تحديد الطالب «' + op.student + '».'); return; }
      var w = parseInt(op.week != null ? op.week : defWeek, 10);
      if (!(w >= 1 && w <= activeWeeks())) { plan.warn.push('أسبوع غير صالح (' + op.week + ').'); return; }
      var ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3);
      var p = parseInt(op.period, 10);
      if (!(p >= 1 && p <= ppw)) { plan.warn.push('رقم الحصة غير صالح (' + op.period + ') — الحصص من 1 إلى ' + ppw + '.'); return; }
      var st = String(op.status || 'abs');
      if (st !== 'abs' && st !== 'sick' && st !== 'none') st = 'abs';
      absVirt[i + '|' + w + '|' + (p - 1)] = (st === 'none') ? '' : st;
    } else if (t === 'transfer') {
      var mode = String(op.mode || 'move');
      var from = op.from || {}, to = op.to || {};
      var kf = keyFor(from, op), kt = keyFor(to, op);
      if (!kf || !kt) return;
      var pairs = [];
      if (from.student != null || to.student != null) {
        var fi = resolveStu(from.student != null ? from.student : to.student);
        var ti = resolveStu(to.student != null ? to.student : from.student);
        if (fi < 0 || ti < 0) { plan.warn.push('تعذّر تحديد طالب في عملية النقل.'); return; }
        pairs.push([fi, ti]);
      } else {
        resolveList(op.students).forEach(function (k) { pairs.push([k, k]); });
      }
      pairs.forEach(function (pr) {
        var a = vget(pr[0], kf), b = vget(pr[1], kt);
        var nm = arr[pr[0]].name;
        if (mode === 'swap') {
          var okA = !hasData(b) || checkVal(b, kf), okB = !hasData(a) || checkVal(a, kt);
          if (okA && okB) { vset(pr[0], kf, hasData(b) ? b : ''); vset(pr[1], kt, hasData(a) ? a : ''); }
        } else {
          if (!hasData(a)) return;
          var cv = checkVal(a, kt); if (!cv) return;
          vset(pr[1], kt, cv.val);
          if (mode === 'move' && !(pr[0] === pr[1] && kf === kt)) vset(pr[0], kf, '');
        }
      });
    } else if (t === 'add_students') {
      (op.names || []).forEach(function (n) {
        n = String(n || '').replace(/\s+/g, ' ').trim();
        if (!n) return;
        var dup = arr.some(function (s) { return normAr(s.name) === normAr(n); }) ||
                  plan.add.some(function (x) { return normAr(x) === normAr(n); });
        if (dup) plan.warn.push('الاسم «' + n + '» موجود بالفعل — تُجوهل.'); else plan.add.push(n);
      });
    } else {
      plan.warn.push('أمر غير مدعوم: ' + t);
    }
  });

  Object.keys(virt).forEach(function (kk) {
    var p = kk.split('|'), i = parseInt(p[0], 10), key = p.slice(1).join('|');
    var s = arr[i], old = s[key], nu = virt[kk];
    if (String(hasData(old) ? old : '') === String(hasData(nu) ? nu : '')) return;
    if (opts.skipExisting && hasData(old)) { plan.skipped++; return; }
    if (hasData(old) && hasData(nu)) plan.over++;
    plan.cells.push({ idx: i, id: s.id, key: key, old: old, nu: nu });
  });
  Object.keys(absVirt).forEach(function (kk) {
    var p = kk.split('|'), i = parseInt(p[0], 10), w = parseInt(p[1], 10), ci = parseInt(p[2], 10);
    var s = arr[i], cur = getStudentAbsences(cls, s.id)['w' + w + '_ci' + ci] || '';
    var nu = absVirt[kk];
    if (cur === nu) return;
    plan.abs.push({ idx: i, id: s.id, week: w, ci: ci, old: cur, nu: nu });
  });
  return plan;
}

/* ═════════════ كتالوج السياق لأوامر الكتابة ═════════════ */
function buildCatalog(cls, week) {
  var arr = DB.data[cls] || [];
  var roster = arr.map(function (s, i) { return (s.name || '').trim() ? (i + 1) + '. ' + s.name : null; }).filter(Boolean).join('\n');
  var aw = activeWeeks();
  var ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3);
  var pl = periodsFor(cls, week).map(function (p, i) { return (i + 1) + '=' + (p.label || ('ف' + (i + 1))); }).join(', ');
  return 'Class: ' + cls + '\nCurrent week: ' + week + ' (weeks 1..' + aw + ' are active)\n' +
    'Periods per week: ' + ppw + ' (period numbers 1..' + ppw + (pl ? '; labels: ' + pl : '') + ')\n' +
    'Grade fields (value limits): assess=التقييم (max ' + maxFor('a1') + ') per week, hw=الواجب (max ' + maxFor('h1') +
    ') per week, beh=السلوك والمواظبة (max ' + maxFor('bw1') + ') per week, ex1=الاختبار 1 (max ' + maxFor('ex1') +
    '), ex2=الاختبار 2 (max ' + maxFor('ex2') + ') (ex1/ex2 have no week).\n' +
    'Special values: "غ" = absent, "م" = excused, "" = empty.\nRoster (student number. name):\n' + roster;
}

var SYS_TABLE = 'You are an expert at reading handwritten and printed Arabic school sheets (Egyptian preparatory school). ' +
  'Read tables precisely. Never invent rows, names or values. If something is unreadable use "unknown" (attendance) or null (grades). ' +
  'Output ONE JSON object only — no explanation, no markdown fences.';

var SYS_CMD = 'You convert a teacher\'s Arabic instruction into structured edit operations for a school gradebook app. ' +
  'Output ONE JSON object only (no markdown): {"summary":"short Arabic description of what will be done","ops":[...],"clarification":"Arabic question if the request is ambiguous, else empty string"}.\n' +
  'Allowed ops (use roster NUMBERS for students; week is an integer):\n' +
  '1) {"type":"set_grade","student":12,"field":"assess|hw|beh|ex1|ex2","week":3,"value":8}  (value may be a number, "غ", "م" or "" to clear)\n' +
  '2) {"type":"fill_column","field":"beh","week":5,"value":10,"students":"all"|[3,7]}\n' +
  '3) {"type":"clear_cells","field":"hw","week":2,"students":"all"|[3,7]}\n' +
  '4) {"type":"set_absence","student":5,"week":4,"period":2,"status":"abs|sick|none"}  (period is 1-based)\n' +
  '5) {"type":"transfer","mode":"move|copy|swap","from":{"field":"hw","week":3},"to":{"field":"hw","week":4},"students":"all"|[..]}  ' +
  '— to transfer between two different students\' cells give "student" inside from/to: {"from":{"student":4,"field":"hw","week":3},"to":{"student":9,"field":"hw","week":3}}\n' +
  '6) {"type":"add_students","names":["..."]}\n' +
  'Rules: use only the fields/weeks/periods listed in the context. If the instruction needs something unsupported (deleting classes, changing settings) return ops [] with a clarification. ' +
  'If a student reference is ambiguous, ask in "clarification" instead of guessing. Never output students that are not in the roster unless using add_students.';

/* ═════════════ كشف الجدول من صورة ═════════════ */
function rosterText(cls) {
  var arr = DB.data[cls] || [];
  return arr.map(function (s, i) { return (s.name || '').trim() ? (i + 1) + '. ' + s.name : null; }).filter(Boolean).join('\n');
}
function imageBlocks(imgs) {
  return imgs.map(function (im) {
    return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: im.b64 } };
  });
}

window.__DAI_CORE = {
  normAr: normAr, nameSim: nameSim, matchStudent: matchStudent, normVal: normVal, keyOf: keyOf,
  planFromTable: planFromTable, planFromOps: planFromOps, applyPlan: applyPlan, undoLast: undoLast,
  undoCount: function () { return undoStack.length; }, parseJSON: parseJSON, errMsg: errMsg,
  maxFor: maxFor, labelFor: labelFor, MODELS: MODELS, GMODELS: GMODELS
};

/* ══════════════════════════════════════════════════════════════════════
   الواجهة
   ══════════════════════════════════════════════════════════════════════ */
var ST = null;
var SYM = { absent: 'غ', present: '✓', unknown: '؟' };
var TYPE_OPTS = [
  ['hw', 'واجب'], ['assess', 'تقييم'], ['beh', 'سلوك'], ['ex1', 'اختبار 1'], ['ex2', 'اختبار 2']
];

function freshState() {
  var cls = '', wk = 1;
  try {
    var pg = (typeof _currentPage !== 'undefined') ? _currentPage : '';
    if (pg === 'weekly' && WKS.activeClass) { cls = WKS.activeClass; wk = WKS.activeWeek; }
    else if (pg === 'absence' && AS.activeClass) { cls = AS.activeClass; wk = AS.activeWeek; }
    else { cls = GS.activeClass; wk = (typeof _calcCurrentWeek === 'function') ? _calcCurrentWeek() : 1; }
  } catch (e) {}
  if (!cls || (DB.classes || []).indexOf(cls) < 0) cls = (DB.classes || [])[0] || '';
  wk = Math.min(Math.max(1, parseInt(wk, 10) || 1), activeWeeks());
  return {
    view: 'home', mode: null, cls: cls, week: wk, imgs: [], note: '', err: '',
    tbl: null, opts: { skipExisting: true, clearPresent: false },
    names: { text: '', mode: 'empty', start: 1, skipDup: true },
    cmd: { text: '', clar: '', summary: '', plan: null },
    gdef: { type: 'hw' }, done: null, busy: false
  };
}

function ov() { return document.getElementById('daiOverlay'); }
function box() { return document.getElementById('daiBody'); }

var BTN = 'border:none;border-radius:10px;font-family:inherit;font-weight:800;cursor:pointer;touch-action:manipulation;';
function btn(label, onclick, style, extra) {
  return '<button onclick="' + onclick + '" ' + (extra || '') + ' style="' + BTN + (style || '') + '">' + label + '</button>';
}
var PRIMARY = 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:11px 14px;font-size:13px;';
var GHOST = 'background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 12px;font-size:11px;';
var SEL = 'background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:12px;max-width:100%;';

function classOptions() {
  return (DB.classes || []).map(function (c) {
    return '<option value="' + esc(c) + '"' + (c === ST.cls ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
}
function weekOptions(sel) {
  var h = '';
  for (var w = 1; w <= activeWeeks(); w++) h += '<option value="' + w + '"' + (w === sel ? ' selected' : '') + '>أسبوع ' + w + '</option>';
  return h;
}
function stuOptions(sel) {
  var arr = DB.data[ST.cls] || [];
  var h = '<option value="-1"' + (sel < 0 ? ' selected' : '') + '>— تجاهل هذا الصف —</option>';
  arr.forEach(function (s, i) {
    if (!(s.name || '').trim()) return;
    h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(s.name) + '</option>';
  });
  return h;
}

function open(mode) {
  if (!window.DB || !DB.classes || !DB.classes.length) {
    if (typeof showSnack === 'function') showSnack('⚠️ أضف فصلاً أولاً ثم استخدم المساعد الذكي');
    return;
  }
  ST = freshState();
  var o = ov();
  if (o) o.remove();
  o = document.createElement('div');
  o.id = 'daiOverlay';
  o.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(2,6,23,.78);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:inherit;';
  o.onclick = function (e) { if (e.target === o) closeAI(); };
  o.innerHTML = '<div style="background:#0f172a;border:1px solid #334155;border-radius:18px 18px 0 0;width:min(620px,100%);height:min(94vh,900px);display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,.5);">' +
    '<div id="daiHead" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1e293b;flex-shrink:0;"></div>' +
    '<div id="daiBody" style="flex:1;overflow-y:auto;padding:12px 14px 18px;-webkit-overflow-scrolling:touch;"></div></div>';
  document.body.appendChild(o);
  if (!hasKey()) { ST.view = 'settings'; }
  render();
  if (mode && hasKey()) pickMode(mode);
}
function closeAI() {
  if (_abort) { try { _abort.abort(); } catch (e) {} }
  var o = ov(); if (o) o.remove();
  ST = null;
}

function head(title, back) {
  var h = document.getElementById('daiHead'); if (!h) return;
  h.innerHTML = (back ? '<button onclick="DAI.go(\'home\')" style="' + BTN + 'background:#1e293b;color:#93c5fd;padding:6px 10px;font-size:13px;">→</button>' : '<span style="font-size:20px;">🤖</span>') +
    '<span style="flex:1;font-weight:900;color:#e2e8f0;font-size:14px;">' + title + '</span>' +
    (ST.view === 'home' ? '<button onclick="DAI.go(\'settings\')" style="' + BTN + 'background:none;color:#94a3b8;font-size:16px;padding:4px 8px;" title="الإعدادات">⚙️</button>' : '') +
    '<button onclick="DAI.close()" style="' + BTN + 'background:none;color:#f87171;font-size:18px;padding:4px 8px;">✕</button>';
}

function render() {
  if (!ST || !box()) return;
  var v = ST.view;
  if (v === 'home') viewHome();
  else if (v === 'settings') viewSettings();
  else if (v === 'input') viewInput();
  else if (v === 'loading') viewLoading();
  else if (v === 'reviewTable') viewReviewTable();
  else if (v === 'reviewNames') viewReviewNames();
  else if (v === 'cmd') viewCmd();
  else if (v === 'reviewPlan') viewReviewPlan();
  else if (v === 'done') viewDone();
  box().scrollTop = 0;
}

/* ───────── الرئيسية ───────── */
function viewHome() {
  head('المساعد الذكي', false);
  var u = undoStack[undoStack.length - 1];
  var card = function (ic, t, d, m) {
    return '<button onclick="DAI.mode(\'' + m + '\')" style="' + BTN + 'background:#111c33;border:1px solid #1e3a5f;color:#e2e8f0;padding:12px;text-align:right;display:flex;gap:10px;align-items:center;width:100%;margin-bottom:8px;">' +
      '<span style="font-size:26px;">' + ic + '</span><span><div style="font-size:13px;">' + t + '</div><div style="font-size:10px;color:#94a3b8;font-weight:600;margin-top:2px;">' + d + '</div></span></button>';
  };
  box().innerHTML =
    '<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px;flex-wrap:wrap;font-size:11px;color:#94a3b8;">الفصل:' +
    '<select style="' + SEL + '" onchange="DAI.setCls(this.value)">' + classOptions() + '</select>' +
    'الأسبوع:<select style="' + SEL + '" onchange="DAI.setWeek(this.value)">' + weekOptions(ST.week) + '</select></div>' +
    card('📋', 'تسجيل الغياب من صورة', 'صوّر ورقة الغياب وسأسجّل الغائبين', 'att') +
    card('👥', 'إدراج الأسماء من صورة', 'صوّر قائمة الفصل وتُضاف الأسماء للفصل', 'names') +
    card('📝', 'رصد الدرجات من صورة', 'صوّر كشف درجات (واجب/تقييم/سلوك/اختبار)', 'grades') +
    card('💬', 'أمر بالكتابة', 'انقل/انسخ/بدّل درجات، سجّل غياباً، املأ عموداً…', 'cmd') +
    (u ? '<div style="margin-top:6px;">' + btn('↩ تراجع عن آخر عملية: ' + esc(u.label) + ' (' + undoStack.length + ')', 'DAI.undo()', 'background:rgba(251,191,36,.12);border:1px solid #d97706;color:#fcd34d;padding:9px 12px;font-size:11px;width:100%;') + '</div>' : '') +
    '<div style="margin-top:10px;font-size:10px;color:#94a3b8;">الوضع الحالي: <b style="color:#a5b4fc;">' + (cfgGet().provider === 'gemini' ? '🆓 مجاني — Gemini' : '💳 Claude') + '</b> (يُغيَّر من ⚙️)</div>' +
    '<div style="margin-top:8px;font-size:10px;color:#64748b;line-height:1.8;">لا يتغيّر شيء في بياناتك قبل أن تراجع النتيجة وتضغط «تطبيق». الذكاء الاصطناعي قد يخطئ في الخط الصعب، فراجع الأسماء والعلامات قبل التطبيق.</div>';
}

/* ───────── الإعدادات ───────── */
function viewSettings() {
  head('إعدادات المساعد', hasKey() ? true : false);
  if (!ST.sets) ST.sets = cfgGet();
  var c = ST.sets, gem = c.provider === 'gemini';
  var opt = function (list, sel) {
    return list.map(function (m) { return '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + m.label + '</option>'; }).join('');
  };
  var tab = function (p, label) {
    var on = c.provider === p;
    return '<button onclick="DAI.setProv(\'' + p + '\')" style="' + BTN + 'flex:1;padding:9px 6px;font-size:12px;' +
      (on ? 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;' : 'background:#1e293b;color:#94a3b8;border:1px solid #334155;') + '">' + label + '</button>';
  };
  var pasteBtn = '<div style="margin-bottom:8px;">' + btn('📋 لصق المفتاح من الحافظة', 'DAI.pasteKey()', 'background:#0f766e;color:#fff;padding:9px 12px;font-size:12px;width:100%;') +
    '<div style="font-size:10px;color:#64748b;margin-top:3px;line-height:1.7;">انسخ المفتاح أولاً ثم اضغط هذا الزر. إن لم ينجح ستظهر نافذة تلصق فيها المفتاح.</div></div>';
  var h = '<div style="display:flex;gap:6px;margin-bottom:12px;">' + tab('gemini', '🆓 مجاني — Gemini') + tab('claude', '💳 Claude (مدفوع)') + '</div>';
  if (gem) {
    h += '<div style="font-size:12px;color:#cbd5e1;line-height:2;margin-bottom:10px;">للحصول على مفتاح <b>مجاني</b> (بدون بطاقة دفع):<br>' +
      '١) افتح <b style="color:#93c5fd;">aistudio.google.com/apikey</b> بحساب Google (عمر 18 سنة فأكثر).<br>' +
      '٢) اضغط <b>Create API key</b> وانسخ المفتاح.<br>٣) الصقه هنا ثم اضغط «اختبار الاتصال».</div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">مفتاح Gemini</div>' +
      '<input id="daiKey" type="text" dir="ltr" placeholder="AIza..." value="' + esc(c.gkey) + '" oninput="DAI.setSet(\'gkey\',this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;margin-bottom:6px;-webkit-text-security:disc;" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">' + pasteBtn;
  } else {
    h += '<div style="font-size:12px;color:#cbd5e1;line-height:1.9;margin-bottom:10px;">يعمل بمفتاح Claude الخاص بك: أنشئ حساباً في <b style="color:#93c5fd;">console.anthropic.com</b> ثم <b>API Keys</b> ← <b>Create Key</b>، واشحن رصيداً صغيراً. تُخصم تكلفة كل عملية من رصيدك مباشرة.</div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">مفتاح Claude</div>' +
      '<input id="daiKey" type="text" dir="ltr" placeholder="sk-ant-..." value="' + esc(c.key) + '" oninput="DAI.setSet(\'key\',this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;margin-bottom:6px;-webkit-text-security:disc;" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">' + pasteBtn;
  }
  h += '<label style="font-size:10px;color:#94a3b8;display:block;margin-bottom:10px;"><input type="checkbox" onchange="document.getElementById(\'daiKey\').style.webkitTextSecurity=this.checked?\'none\':\'disc\'"> إظهار المفتاح</label>' +
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">النموذج</div>' +
    '<select style="' + SEL + 'width:100%;margin-bottom:10px;" onchange="DAI.setSet(\'' + (gem ? 'gmodel' : 'model') + '\',this.value)">' + opt(gem ? GMODELS : MODELS, gem ? c.gmodel : c.model) + '</select>' +
    '<label style="font-size:11px;color:#cbd5e1;display:block;line-height:1.8;margin-bottom:12px;"><input type="checkbox" ' + (c.sendRoster ? 'checked' : '') + ' onchange="DAI.setSet(\'sendRoster\',this.checked)"> أرسل أسماء الفصل مع الصورة (تُحسّن قراءة الخط الصعب؛ الأسماء الظاهرة في الصورة تُرسل في كل الأحوال)</label>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + btn('💾 حفظ', 'DAI.saveCfg()', PRIMARY) + btn('🔌 اختبار الاتصال', 'DAI.testCfg()', GHOST) +
    ((gem ? c.gkey : c.key) ? btn('🗑 حذف المفتاح', 'DAI.delKey()', 'background:#450a0a;color:#fca5a5;border:1px solid #7f1d1d;padding:8px 12px;font-size:11px;') : '') + '</div>' +
    '<div id="daiTestRes" style="margin-top:10px;font-size:11px;line-height:1.8;"></div>' +
    '<div style="margin-top:14px;padding:10px;background:#0b1220;border:1px solid #1e293b;border-radius:10px;font-size:10px;color:#94a3b8;line-height:1.9;">' +
    (gem ? '⚠️ <b style="color:#fcd34d;">عن الوضع المجاني:</b> للخطة المجانية حدّ للطلبات في الدقيقة واليوم (يظهر في aistudio.google.com/rate-limit) وقد يتغيّر، وإذا نفد نموذج جرّب التطبيق نماذج أخرى تلقائياً. وتذكر Google أن المحتوى المرسَل في الخطة المجانية يُستخدم لتحسين منتجاتها (وفي المدفوعة لا). لذلك تجنّب تصوير بيانات حساسة غير لازمة.<br><br>' : '') +
    '🔒 المفتاح يُحفظ على هذا الجهاز فقط ولا يُرفع للسحابة ولا يدخل النسخ الاحتياطية، لذلك أدخله على كل جهاز تستخدمه. لا تستخدم المساعد على جهاز مشترك.</div>';
  box().innerHTML = h;
}
function saveCfg(silent) {
  var c = ST.sets || cfgGet();
  var o = { provider: c.provider, key: String(c.key || '').trim(), model: c.model, gkey: String(c.gkey || '').trim(), gmodel: c.gmodel, sendRoster: c.sendRoster !== false };
  cfgSet(o);
  ST.sets = null;
  if (!silent) {
    if (typeof showSnack === 'function') showSnack('✅ تم حفظ الإعدادات');
    ST.view = hasKey() ? 'home' : 'settings';
    render();
  }
}
function testCfg() {
  var r = document.getElementById('daiTestRes');
  var keep = ST.sets;
  saveCfg(true);
  ST.sets = keep;            /* أبقِ الحقول كما هي في الشاشة */
  if (!hasKey()) { if (r) r.innerHTML = '<span style="color:#fca5a5;">❌ أدخل المفتاح أولاً.</span>'; return; }
  if (r) r.innerHTML = '<span style="color:#fcd34d;">⏳ جاري الاختبار…</span>';
  callAI({ system: 'Reply with the single word OK.', content: [{ type: 'text', text: 'ping' }], maxTokens: 10, ping: true })
    .then(function () { if (r) r.innerHTML = '<span style="color:#6ee7b7;">✅ الاتصال سليم والمفتاح صحيح.</span>'; })
    .catch(function (e) { if (r) r.innerHTML = '<span style="color:#fca5a5;">❌ ' + esc(errMsg(e)) + '</span>'; });
}
function delKey() {
  if (!confirm('حذف المفتاح من هذا الجهاز؟')) return;
  var c = cfgGet();
  if (c.provider === 'gemini') c.gkey = ''; else c.key = '';
  cfgSet(c); ST.sets = null; render();
}

function pasteKey() {
  if (!ST.sets) ST.sets = cfgGet();
  var fld = ST.sets.provider === 'gemini' ? 'gkey' : 'key';
  var put = function (v) {
    v = String(v || '').trim();
    if (!v) { if (typeof showSnack === 'function') showSnack('⚠️ الحافظة فارغة — انسخ المفتاح أولاً'); return; }
    ST.sets[fld] = v;
    var el = document.getElementById('daiKey'); if (el) el.value = v;
    if (typeof showSnack === 'function') showSnack('✅ تم لصق المفتاح — اضغط «حفظ» ثم «اختبار الاتصال»');
  };
  var manual = function () { var v = prompt('الصق المفتاح هنا (اضغط مطولاً داخل الخانة ← لصق):', ''); if (v !== null) put(v); };
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(put).catch(manual);
      return;
    }
  } catch (e) {}
  manual();
}

/* ───────── اختيار الوضع ───────── */
function pickMode(m) {
  if (!hasKey()) { ST.view = 'settings'; render(); return; }
  ST.mode = m; ST.imgs = []; ST.err = ''; ST.tbl = null;
  ST.view = (m === 'cmd') ? 'cmd' : 'input';
  render();
}

/* ───────── إدخال الصور ───────── */
var MODE_INFO = {
  att: { t: 'ورقة الغياب', d: 'صوّر الورقة كاملة بوضوح وبإضاءة جيدة (يمكن أكثر من صورة إن كانت الورقة على أجزاء).' },
  names: { t: 'قائمة الأسماء', d: 'صوّر قائمة الفصل. ستراجع الأسماء وتعدّلها قبل إدراجها.' },
  grades: { t: 'كشف الدرجات', d: 'صوّر الكشف بحيث تظهر الأسماء وأعمدة الدرجات.' }
};
function viewInput() {
  var mi = MODE_INFO[ST.mode];
  head(mi.t, true);
  var thumbs = ST.imgs.map(function (im, i) {
    return '<div style="position:relative;width:78px;height:78px;border-radius:8px;overflow:hidden;border:1px solid #334155;">' +
      '<img src="' + im.dataUrl + '" style="width:100%;height:100%;object-fit:cover;">' +
      '<button onclick="DAI.rmImg(' + i + ')" style="position:absolute;top:2px;left:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;">✕</button></div>';
  }).join('');
  var gradeOpts = '';
  if (ST.mode === 'grades') {
    gradeOpts = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px;font-size:11px;color:#94a3b8;">نوع الدرجة في الصورة:' +
      '<select style="' + SEL + '" onchange="DAI.setGType(this.value)">' + TYPE_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === ST.gdef.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      (/^ex/.test(ST.gdef.type) ? '' : '<select style="' + SEL + '" onchange="DAI.setWeek(this.value)">' + weekOptions(ST.week) + '</select>') + '</div>';
  }
  box().innerHTML =
    '<div style="font-size:11px;color:#cbd5e1;line-height:1.9;margin-bottom:10px;">' + mi.d + '</div>' +
    '<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;font-size:11px;color:#94a3b8;flex-wrap:wrap;">الفصل:<select style="' + SEL + '" onchange="DAI.setCls(this.value)">' + classOptions() + '</select></div>' +
    gradeOpts +
    '<input id="daiCam" type="file" accept="image/*" capture="environment" style="display:none" onchange="DAI.files(this)">' +
    '<input id="daiGal" type="file" accept="image/*" multiple style="display:none" onchange="DAI.files(this)">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
    btn('📷 التقاط صورة', "document.getElementById('daiCam').click()", 'flex:1;background:#1d4ed8;color:#fff;padding:12px;font-size:12px;') +
    btn('🖼 من المعرض', "document.getElementById('daiGal').click()", 'flex:1;background:#0f766e;color:#fff;padding:12px;font-size:12px;') + '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;min-height:10px;">' + thumbs + '</div>' +
    '<div style="font-size:10px;color:#64748b;margin-bottom:4px;">ملاحظة للذكاء الاصطناعي (اختياري) — مثال: «الغياب مكتوب بعلامة ✗» أو «الدرجات من 10»</div>' +
    '<textarea id="daiNote" rows="2" style="' + SEL + 'width:100%;box-sizing:border-box;margin-bottom:12px;resize:vertical;" oninput="DAI.note(this.value)">' + esc(ST.note) + '</textarea>' +
    (ST.err ? '<div style="color:#fca5a5;font-size:11px;line-height:1.8;margin-bottom:8px;">❌ ' + esc(ST.err) + '</div>' : '') +
    btn('🔍 حلّل الصورة' + (ST.imgs.length ? ' (' + ST.imgs.length + ')' : ''), 'DAI.analyze()', PRIMARY + 'width:100%;' + (ST.imgs.length ? '' : 'opacity:.45;'), ST.imgs.length ? '' : 'disabled');
}
function addFiles(input) {
  var files = Array.prototype.slice.call(input.files || []);
  input.value = '';
  var room = MAX_IMAGES - ST.imgs.length;
  if (files.length > room) { if (typeof showSnack === 'function') showSnack('⚠️ الحد الأقصى ' + MAX_IMAGES + ' صور'); files = files.slice(0, Math.max(0, room)); }
  Promise.all(files.map(prepImage)).then(function (arr) {
    arr.forEach(function (a) { ST.imgs.push(a); });
    ST.err = ''; render();
  }).catch(function () { ST.err = 'تعذّر قراءة الصورة. جرّب صورة أخرى.'; render(); });
}

function viewLoading() {
  head('جاري التحليل…', false);
  box().innerHTML = '<div style="text-align:center;padding:50px 10px;color:#cbd5e1;"><div style="font-size:40px;margin-bottom:12px;">🤖</div>' +
    '<div style="font-size:13px;font-weight:800;margin-bottom:6px;">أقرأ الصورة…</div>' +
    '<div style="font-size:11px;color:#94a3b8;line-height:1.9;">قد يستغرق ذلك من 10 إلى 40 ثانية حسب حجم الجدول.</div>' +
    '<div style="margin-top:16px;">' + btn('إلغاء', 'DAI.cancel()', GHOST) + '</div></div>';
}
function cancel() { if (_abort) { try { _abort.abort(); } catch (e) {} } }

function ensureConsent() {
  var prov = cfgGet().provider, k = CONSENT_KEY + '_' + prov, ok = false;
  try { ok = localStorage.getItem(k) === '1'; } catch (e) {}
  if (ok) return true;
  var msg = prov === 'gemini'
    ? 'سيتم إرسال الصورة إلى Google (Gemini) لتحليلها' + (cfgGet().sendRoster ? '، مع أسماء طلاب الفصل المختار' : '') + '.\n\nتنبيه: تذكر Google أن المحتوى المرسَل في الخطة المجانية يُستخدم لتحسين منتجاتها.\nتجنّب تصوير بيانات حساسة غير لازمة (أرقام قومية، هواتف).\n\nهل توافق؟'
    : 'سيتم إرسال الصورة إلى شركة Anthropic (مزوّد Claude) لتحليلها' + (cfgGet().sendRoster ? '، مع أسماء طلاب الفصل المختار' : '') + '.\n\nتجنّب تصوير بيانات حساسة غير لازمة (أرقام قومية، هواتف).\n\nهل توافق؟';
  var yes = confirm(msg);
  if (yes) { try { localStorage.setItem(k, '1'); } catch (e) {} }
  return yes;
}

/* ───────── التحليل ───────── */
function analyze() {
  if (!ST.imgs.length) return;
  if (!ensureConsent()) return;
  var mode = ST.mode, cls = ST.cls, ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3);
  var base = 'Images are parts/pages of the same sheet; merge rows in reading order and never duplicate a student.\n' +
    (ST.note ? 'Teacher note: ' + ST.note + '\n' : '') +
    (cfgGet().sendRoster
      ? 'Class roster (hint only, to help read unclear handwriting — transcribe what is written; do NOT add roster students who are absent from the sheet):\n' + rosterText(cls) + '\n\n'
      : '\n');
  var prompt;
  if (mode === 'att') {
    prompt = base + 'This is an ATTENDANCE sheet. Return exactly: {"columns":[{"label":"column header text, e.g. date/day/period; use \\"عمود N\\" if none"}],' +
      '"students":[{"no":<serial number printed on sheet or null>,"name":"name as written","marks":["absent"|"present"|"unknown",...]}]}.\n' +
      '"marks" must have exactly one entry per column, in the same order as "columns". Absent is usually marked by غ / غائب / ✗ / a filled circle or colored cell; present by ✓ or the sheet legend\'s symbol; ' +
      'if the sheet has a legend follow it. If a cell is empty: treat as "present" only when other students have explicit absence marks in that column; otherwise "unknown".';
  } else if (mode === 'grades') {
    prompt = base + 'This is a GRADES sheet. Return exactly: {"columns":[{"label":"column header"}],"students":[{"no":<serial or null>,"name":"name as written","values":["17"|"غ"|"م"|null,...]}]}.\n' +
      'Include only columns that hold grades (skip serial/name/total/signature columns). "values" must have one entry per column; copy each value exactly as written (digits may be Arabic-Indic), use null if empty or unreadable. Do not compute anything.';
  } else {
    prompt = 'This is a student NAME LIST. Return exactly: {"names":["full name 1","full name 2",...]} — one string per student, in the order shown, without numbering or bullets. ' +
      'Skip titles, class names, dates, headers and footers.' + (ST.note ? '\nTeacher note: ' + ST.note : '');
  }
  var content = imageBlocks(ST.imgs).concat([{ type: 'text', text: prompt }]);
  ST.view = 'loading'; ST.err = ''; render();
  callAI({ system: SYS_TABLE, content: content, maxTokens: 8000 })
    .then(function (r) {
      if (!ST) return;
      var j;
      try { j = parseJSON(r.text); } catch (e) { throw new Error(r.truncated ? 'TRUNCATED' : 'BAD_JSON'); }
      if (r.truncated) throw new Error('TRUNCATED');
      if (mode === 'names') buildNames(j); else buildTable(j, mode);
    })
    .catch(function (e) {
      if (!ST) return;
      ST.view = 'input'; ST.err = errMsg(e); render();
    });
}

function buildNames(j) {
  var names = (j && j.names) || [];
  if (!Array.isArray(names) || !names.length) throw new Error('BAD_JSON');
  ST.names.text = names.map(function (n) { return String(n || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).join('\n');
  ST.view = 'reviewNames'; render();
}

function buildTable(j, mode) {
  var cols = (j && j.columns) || [], studs = (j && j.students) || [];
  if (!Array.isArray(studs) || !studs.length) throw new Error('BAD_JSON');
  if (!Array.isArray(cols)) cols = [];
  var n = cols.length;
  studs.forEach(function (s) {
    var arr = (mode === 'att') ? s.marks : s.values;
    if (Array.isArray(arr) && arr.length > n) n = arr.length;
  });
  n = Math.max(1, Math.min(n, 12));
  var ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3);
  var arrS = DB.data[ST.cls] || [];
  var tcols = [];
  for (var c = 0; c < n; c++) {
    var lbl = (cols[c] && cols[c].label) ? String(cols[c].label) : ('عمود ' + (c + 1));
    if (mode === 'att') tcols.push({ label: lbl, ci: c < ppw ? c : null });
    else tcols.push(c === 0 ? { label: lbl, type: ST.gdef.type, week: ST.week } : { label: lbl, type: 'ignore', week: ST.week });
  }
  var rows = [];
  studs.forEach(function (s) {
    var nm = String((s && s.name) || '').trim();
    if (!nm) return;
    var raw = (mode === 'att') ? (s.marks || []) : (s.values || []);
    var cells = [];
    for (var k = 0; k < n; k++) {
      var v = raw[k];
      if (mode === 'att') cells.push(v === 'absent' || v === 'present' ? v : 'unknown');
      else cells.push(v === null || v === undefined ? '' : String(v));
    }
    var m = matchStudent(nm, s.no, arrS);
    rows.push({ name: nm, no: s.no, idx: m.idx, conf: m.conf, cells: cells });
  });
  if (!rows.length) throw new Error('BAD_JSON');
  ST.tbl = { cols: tcols, rows: rows };
  ST.view = 'reviewTable'; render();
}

/* ───────── مراجعة الجدول (غياب / درجات) ───────── */
function curTable() {
  var mode = ST.mode;
  var cols = ST.tbl.cols.map(function (c) {
    if (mode === 'att') return { label: c.label, map: (c.ci === null || c.ci === undefined) ? null : { week: ST.week, ci: c.ci } };
    var k = (c.type === 'ignore') ? null : keyOf(c.type, c.week);
    return { label: c.label, map: k ? { key: k } : null };
  });
  return {
    kind: mode === 'att' ? 'att' : 'grades', cls: ST.cls, cols: cols,
    rows: ST.tbl.rows.map(function (r) { return { idx: r.idx, cells: r.cells }; }),
    skipExisting: ST.opts.skipExisting, clearPresent: ST.opts.clearPresent
  };
}
function periodOptions(sel) {
  var ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3), ps = periodsFor(ST.cls, ST.week);
  var h = '<option value="x"' + (sel === null || sel === undefined ? ' selected' : '') + '>تجاهل هذا العمود</option>';
  for (var i = 0; i < ppw; i++) h += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>حصة ' + (i + 1) + (ps[i] && ps[i].label ? ' (' + esc(ps[i].label) + ')' : '') + '</option>';
  return h;
}
function viewReviewTable() {
  var mode = ST.mode, att = mode === 'att';
  head(att ? 'مراجعة الغياب' : 'مراجعة الدرجات', true);
  var h = '';
  var unm = ST.tbl.rows.filter(function (r) { return r.idx < 0; }).length;
  h += '<div style="font-size:11px;color:#94a3b8;line-height:1.9;margin-bottom:8px;">قرأتُ <b style="color:#e2e8f0;">' + ST.tbl.rows.length + '</b> صفاً' + (unm ? ' — <span style="color:#fbbf24;">' + unm + ' لم يُطابَق مع طالب (اختره يدوياً أو اتركه)</span>' : '') + '.</div>';
  if (att) h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;font-size:11px;color:#94a3b8;">الأسبوع:<select style="' + SEL + '" onchange="DAI.setWeekRev(this.value)">' + weekOptions(ST.week) + '</select></div>';
  /* ربط الأعمدة */
  h += '<div style="background:#0b1220;border:1px solid #1e293b;border-radius:10px;padding:8px;margin-bottom:10px;"><div style="font-size:10px;color:#64748b;margin-bottom:6px;">ربط أعمدة الصورة بالتطبيق:</div>';
  ST.tbl.cols.forEach(function (c, j) {
    h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:wrap;"><span style="font-size:11px;color:#e2e8f0;min-width:78px;"><b>' + (j + 1) + '</b> · ' + esc(c.label) + '</span>';
    if (att) h += '<select style="' + SEL + '" onchange="DAI.setColCi(' + j + ',this.value)">' + periodOptions(c.ci) + '</select>';
    else {
      h += '<select style="' + SEL + '" onchange="DAI.setColType(' + j + ',this.value)"><option value="ignore"' + (c.type === 'ignore' ? ' selected' : '') + '>تجاهل</option>' +
        TYPE_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === c.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
      if (c.type !== 'ignore' && !/^ex/.test(c.type)) h += '<select style="' + SEL + '" onchange="DAI.setColWeek(' + j + ',this.value)">' + weekOptions(c.week) + '</select>';
    }
    h += '</div>';
  });
  h += '</div>';
  /* خيارات */
  if (att) h += '<label style="display:block;font-size:11px;color:#cbd5e1;margin-bottom:8px;"><input type="checkbox" ' + (ST.opts.clearPresent ? 'checked' : '') + ' onchange="DAI.opt(\'clearPresent\',this.checked)"> إلغاء الغياب المسجَّل سابقاً لمن عُلِّم «حاضراً» في الصورة</label>';
  else h += '<label style="display:block;font-size:11px;color:#cbd5e1;margin-bottom:8px;"><input type="checkbox" ' + (ST.opts.skipExisting ? 'checked' : '') + ' onchange="DAI.opt(\'skipExisting\',this.checked)"> لا تستبدل الدرجات الموجودة (تعبئة الخانات الفارغة فقط)</label>';
  /* الصفوف */
  var arrS = DB.data[ST.cls] || [];
  ST.tbl.rows.forEach(function (r, i) {
    var cc = r.idx < 0 ? '#7f1d1d' : (r.conf === 'mid' ? '#78350f' : '#1e293b');
    h += '<div style="border:1px solid ' + cc + ';border-radius:10px;padding:7px 8px;margin-bottom:6px;background:#0b1220;">' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;"><span style="font-size:10px;color:#64748b;min-width:70px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
      '<select style="' + SEL + 'flex:1;min-width:0;" onchange="DAI.setRowStu(' + i + ',this.value)">' + stuOptions(r.idx) + '</select></div><div style="display:flex;gap:5px;flex-wrap:wrap;">';
    r.cells.forEach(function (cell, j) {
      var col = ST.tbl.cols[j];
      if (att) {
        var ign = (col.ci === null || col.ci === undefined);
        var clr = cell === 'absent' ? 'background:#7f1d1d;color:#fecaca;border:1px solid #dc2626;' : (cell === 'present' ? 'background:#064e3b;color:#a7f3d0;border:1px solid #059669;' : 'background:#422006;color:#fde68a;border:1px solid #d97706;');
        h += '<button onclick="DAI.mark(' + i + ',' + j + ')" style="' + BTN + clr + 'padding:4px 9px;font-size:11px;' + (ign ? 'opacity:.35;' : '') + '">' + (j + 1) + ' ' + SYM[cell] + '</button>';
      } else {
        var ign2 = col.type === 'ignore';
        var key = ign2 ? null : keyOf(col.type, col.week);
        var nv = key ? normVal(cell, maxFor(key)) : { skip: true };
        var bad = nv.bad ? 'border-color:#dc2626;' : '';
        var old = (r.idx >= 0 && key && arrS[r.idx]) ? arrS[r.idx][key] : '';
        h += '<div style="display:flex;flex-direction:column;align-items:center;' + (ign2 ? 'opacity:.35;' : '') + '"><span style="font-size:9px;color:#64748b;">' + (j + 1) + (key ? '/' + maxFor(key) : '') + '</span>' +
          '<input value="' + esc(cell) + '" oninput="DAI.cell(' + i + ',' + j + ',this.value)" inputmode="decimal" style="' + SEL + 'width:52px;text-align:center;' + bad + '">' +
          (hasData(old) ? '<span style="font-size:9px;color:#fbbf24;">الحالي: ' + esc(fmtVal(old)) + '</span>' : '') + '</div>';
      }
    });
    h += '</div></div>';
  });
  h += '<div id="daiSum" style="position:sticky;bottom:-18px;background:#0f172a;padding:10px 0 4px;border-top:1px solid #1e293b;"></div>';
  box().innerHTML = h;
  updateSummary();
}
function updateSummary() {
  var el = document.getElementById('daiSum'); if (!el || !ST || !ST.tbl) return;
  var plan = planFromTable(curTable());
  var n = plan.cells.length + plan.abs.length;
  var h = '<div style="font-size:11px;color:#cbd5e1;line-height:1.9;margin-bottom:6px;">';
  if (ST.mode === 'att') {
    var add = plan.abs.filter(function (a) { return a.nu === 'abs'; }).length, del = plan.abs.length - add;
    h += 'سيُسجَّل <b style="color:#fca5a5;">' + add + '</b> غياب' + (del ? ' ويُلغى <b>' + del + '</b>' : '') + (plan.skipped ? ' · تُجوهل ' + plan.skipped + ' (مرض مسجَّل)' : '');
  } else {
    h += 'سيُرصد <b style="color:#a5b4fc;">' + plan.cells.length + '</b> درجة' + (plan.over ? ' <span style="color:#fbbf24;">(منها ' + plan.over + ' استبدال)</span>' : '') + (plan.skipped ? ' · تُجوهل ' + plan.skipped + ' (موجودة/غير صالحة)' : '');
  }
  h += '</div>';
  if (plan.warn.length) h += '<div style="font-size:10px;color:#fbbf24;margin-bottom:6px;">' + plan.warn.map(esc).join('<br>') + '</div>';
  h += btn(n ? '✅ تطبيق (' + n + ')' : 'لا يوجد ما يُطبَّق', 'DAI.applyTable()', PRIMARY + 'width:100%;' + (n ? '' : 'opacity:.45;'), n ? '' : 'disabled');
  el.innerHTML = h;
}
function applyTable() {
  var plan = planFromTable(curTable());
  if (!plan.cells.length && !plan.abs.length) return;
  var lbl = ST.mode === 'att' ? ('تسجيل غياب (' + plan.abs.length + ')') : ('رصد درجات (' + plan.cells.length + ')');
  var r = applyPlan(ST.cls, plan, lbl);
  if (!r.ok) { ST.err = r.msg; alert(r.msg); return; }
  finish('✅ تم: ' + lbl + (plan.skipped ? ' — وتُجوهل ' + plan.skipped : ''));
}

/* ───────── مراجعة الأسماء ───────── */
function viewReviewNames() {
  head('مراجعة الأسماء', true);
  var arr = DB.data[ST.cls] || [];
  var locked = !!(DB.meta && DB.meta.namesLocked);
  var h = '<div style="font-size:11px;color:#94a3b8;line-height:1.9;margin-bottom:6px;">عدّل الأسماء مباشرة (اسم في كل سطر). الفصل: <b style="color:#e2e8f0;">' + esc(ST.cls) + '</b> — فيه الآن ' + arr.filter(function (s) { return (s.name || '').trim(); }).length + ' اسماً.</div>' +
    (locked ? '<div style="color:#fca5a5;font-size:11px;margin-bottom:8px;">🔒 الأسماء مقفلة في هذا التطبيق. افتح القفل من صفحة الدرجات أولاً.</div>' : '') +
    '<textarea id="daiNames" rows="10" oninput="DAI.namesText(this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;resize:vertical;line-height:1.8;">' + esc(ST.names.text) + '</textarea>' +
    '<div style="margin:8px 0;font-size:11px;color:#cbd5e1;line-height:2;">' +
    '<label style="display:block;"><input type="radio" name="dnm" ' + (ST.names.mode === 'empty' ? 'checked' : '') + ' onchange="DAI.namesMode(\'empty\')"> املأ الصفوف الفارغة أولاً ثم أضف الباقي كطلاب جدد</label>' +
    '<label style="display:block;"><input type="radio" name="dnm" ' + (ST.names.mode === 'append' ? 'checked' : '') + ' onchange="DAI.namesMode(\'append\')"> أضفها كلها كطلاب جدد في آخر القائمة</label>' +
    '<label style="display:block;"><input type="radio" name="dnm" ' + (ST.names.mode === 'fill' ? 'checked' : '') + ' onchange="DAI.namesMode(\'fill\')"> اكتبها فوق الصفوف ابتداءً من الصف رقم <input type="number" min="1" value="' + ST.names.start + '" oninput="DAI.namesStart(this.value)" style="' + SEL + 'width:56px;"> (تُستبدل الأسماء فقط والدرجات تبقى مع الصف)</label>' +
    '<label style="display:block;"><input type="checkbox" ' + (ST.names.skipDup ? 'checked' : '') + ' onchange="DAI.namesDup(this.checked)"> تجاهل الأسماء المكررة (في وضع الإضافة)</label></div>' +
    '<div id="daiNamesSum" style="font-size:11px;color:#a5b4fc;margin-bottom:8px;line-height:1.9;"></div>' +
    btn('✅ إدراج الأسماء', 'DAI.applyNames()', PRIMARY + 'width:100%;' + (locked ? 'opacity:.45;' : ''), locked ? 'disabled' : '');
  box().innerHTML = h;
  namesSummary();
}
function namesList() { return parseNamesText(ST.names.text); }
function namesSummary() {
  var el = document.getElementById('daiNamesSum'); if (!el) return;
  var names = namesList(), arr = DB.data[ST.cls] || [];
  if (!names.length) { el.textContent = 'لا توجد أسماء.'; return; }
  var plan = _namesPlan(arr, names, ST.names.mode, { start: ST.names.start, skipDup: ST.names.skipDup });
  var fill = 0, rep = 0, nw = 0, skip = 0;
  plan.forEach(function (it) {
    if (it.skip) { skip++; return; }
    if (it.idx < 0) { nw++; return; }
    var old = (arr[it.idx].name || '').trim();
    if (!old) fill++; else if (old !== it.name) rep++;
  });
  var p = ['<b>' + names.length + '</b> اسم'];
  if (fill) p.push(fill + ' في صفوف فارغة');
  if (rep) p.push('<span style="color:#fbbf24;">' + rep + ' استبدال</span>');
  if (nw) p.push(nw + ' طالب جديد');
  if (skip) p.push(skip + ' مكرر متجاهَل');
  el.innerHTML = p.join(' · ');
}
function applyNames() {
  if (DB.meta && DB.meta.namesLocked) return;
  var names = namesList();
  if (!names.length) { if (typeof showSnack === 'function') showSnack('⚠️ لا توجد أسماء'); return; }
  var cls = ST.cls;
  var res = _namesApply(cls, names, ST.names.mode, { start: ST.names.start, skipDup: ST.names.skipDup });
  undoStack.push({
    label: 'إدراج أسماء (' + names.length + ')', t: Date.now(),
    fn: function () { res.undo(); refreshPages(); }
  });
  if (undoStack.length > 20) undoStack.shift();
  refreshPages();
  finish(_namesSnackMsg(res));
}

/* ───────── أمر بالكتابة ───────── */
var EXAMPLES = [
  'انقل درجات واجب الأسبوع 3 إلى الأسبوع 4 لكل الفصل',
  'انسخ تقييم الأسبوع 2 إلى الأسبوع 3 للجميع',
  'اجعل سلوك الأسبوع الحالي 10 لكل الطلاب',
  'سجّل غياب الطالب رقم 5 في الأسبوع 3 الحصة 2',
  'بدّل بين درجة واجب الطالب 4 والطالب 9 في الأسبوع 2'
];
function viewCmd() {
  head('أمر بالكتابة', true);
  box().innerHTML =
    '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;font-size:11px;color:#94a3b8;flex-wrap:wrap;">الفصل:<select style="' + SEL + '" onchange="DAI.setCls(this.value)">' + classOptions() + '</select>الأسبوع الحالي:<select style="' + SEL + '" onchange="DAI.setWeek(this.value)">' + weekOptions(ST.week) + '</select></div>' +
    '<textarea id="daiCmd" rows="4" placeholder="اكتب ما تريده بالعربية…" oninput="DAI.cmdText(this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;resize:vertical;line-height:1.8;font-size:13px;">' + esc(ST.cmd.text) + '</textarea>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 12px;">' + EXAMPLES.map(function (e, i) {
      return '<button onclick="DAI.example(' + i + ')" style="' + BTN + 'background:#111c33;border:1px solid #1e3a5f;color:#93c5fd;font-size:10px;padding:5px 9px;font-weight:600;text-align:right;">' + esc(e) + '</button>';
    }).join('') + '</div>' +
    (ST.cmd.clar ? '<div style="background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:10px;padding:9px;font-size:12px;line-height:1.9;margin-bottom:10px;">❓ ' + esc(ST.cmd.clar) + '</div>' : '') +
    (ST.err ? '<div style="color:#fca5a5;font-size:11px;line-height:1.8;margin-bottom:8px;">❌ ' + esc(ST.err) + '</div>' : '') +
    btn('🔍 حلّل الأمر', 'DAI.runCmd()', PRIMARY + 'width:100%;');
}
function runCmd() {
  var txt = (ST.cmd.text || '').trim();
  if (!txt) return;
  if (!ensureConsent()) return;
  var cls = ST.cls, week = ST.week;
  ST.view = 'loading'; ST.err = ''; ST.cmd.clar = ''; render();
  callAI({
    system: SYS_CMD, maxTokens: 4000,
    content: [{ type: 'text', text: buildCatalog(cls, week) + '\n\nInstruction (Arabic): ' + txt }]
  }).then(function (r) {
    if (!ST) return;
    var j;
    try { j = parseJSON(r.text); } catch (e) { throw new Error('BAD_JSON'); }
    var ops = Array.isArray(j.ops) ? j.ops : [];
    ST.cmd.clar = String(j.clarification || '').trim();
    ST.cmd.summary = String(j.summary || '').trim();
    if (!ops.length) { ST.view = 'cmd'; if (!ST.cmd.clar) ST.err = 'لم أفهم المطلوب كعمليات قابلة للتنفيذ. أعد الصياغة بتحديد العمود والأسبوع.'; render(); return; }
    ST.cmd.plan = planFromOps(cls, ops, { week: week });
    ST.view = 'reviewPlan'; render();
  }).catch(function (e) {
    if (!ST) return;
    ST.view = 'cmd'; ST.err = errMsg(e); render();
  });
}
function planTable(plan, cls) {
  var arr = DB.data[cls] || [], h = '', n = 0;
  var row = function (a, b, c) {
    return '<div style="display:flex;gap:6px;padding:5px 8px;border-bottom:1px solid #1e293b;font-size:11px;align-items:center;"><span style="flex:1.2;color:#e2e8f0;">' + a + '</span><span style="flex:1;color:#94a3b8;">' + b + '</span><span style="flex:1;text-align:left;color:#a5b4fc;">' + c + '</span></div>';
  };
  plan.add.forEach(function (nm) { if (n++ < 150) h += row('➕ ' + esc(nm), 'طالب جديد', ''); });
  plan.cells.forEach(function (c) {
    if (n++ >= 150) return;
    h += row(esc(arr[c.idx] ? arr[c.idx].name : '?'), esc(labelFor(c.key)), '<span style="color:#64748b;text-decoration:line-through;">' + esc(fmtVal(c.old)) + '</span> ← <b>' + esc(fmtVal(c.nu)) + '</b>');
  });
  var ST_AR = { abs: 'غائب', sick: 'مريض', '': 'بدون' };
  plan.abs.forEach(function (a) {
    if (n++ >= 150) return;
    h += row(esc(arr[a.idx] ? arr[a.idx].name : '?'), 'غياب أسبوع ' + a.week + ' حصة ' + (a.ci + 1), '<span style="color:#64748b;">' + ST_AR[a.old || ''] + '</span> ← <b>' + ST_AR[a.nu || ''] + '</b>');
  });
  var total = plan.add.length + plan.cells.length + plan.abs.length;
  if (total > 150) h += '<div style="padding:6px 8px;font-size:10px;color:#64748b;">… و' + (total - 150) + ' تغييراً آخر</div>';
  return '<div style="border:1px solid #1e293b;border-radius:10px;background:#0b1220;max-height:46vh;overflow-y:auto;">' + (h || '<div style="padding:10px;font-size:11px;color:#94a3b8;">لا تغييرات.</div>') + '</div>';
}
function viewReviewPlan() {
  head('مراجعة التغييرات', true);
  var p = ST.cmd.plan, n = p.cells.length + p.abs.length + p.add.length;
  box().innerHTML =
    (ST.cmd.summary ? '<div style="font-size:12px;color:#e2e8f0;line-height:1.9;margin-bottom:6px;">🧾 ' + esc(ST.cmd.summary) + '</div>' : '') +
    (ST.cmd.clar ? '<div style="background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:10px;padding:9px;font-size:12px;line-height:1.9;margin-bottom:8px;">❓ ' + esc(ST.cmd.clar) + '</div>' : '') +
    (p.warn.length ? '<div style="font-size:10px;color:#fbbf24;line-height:1.8;margin-bottom:8px;">' + p.warn.map(esc).join('<br>') + '</div>' : '') +
    planTable(p, ST.cls) +
    (p.over ? '<div style="font-size:11px;color:#fbbf24;margin-top:6px;">⚠️ سيُستبدل ' + p.over + ' درجة موجودة.</div>' : '') +
    '<div style="display:flex;gap:6px;margin-top:10px;">' + btn(n ? '✅ تطبيق (' + n + ')' : 'لا يوجد ما يُطبَّق', 'DAI.applyCmd()', PRIMARY + 'flex:1;' + (n ? '' : 'opacity:.45;'), n ? '' : 'disabled') + btn('تعديل الأمر', "DAI.go('cmd')", GHOST) + '</div>';
}
function applyCmd() {
  var p = ST.cmd.plan; if (!p) return;
  var r = applyPlan(ST.cls, p, ST.cmd.summary || 'أمر بالكتابة');
  if (!r.ok) { alert(r.msg); return; }
  finish('✅ تم تنفيذ الأمر');
}

/* ───────── النهاية ───────── */
function finish(msg) {
  ST.done = msg; ST.view = 'done'; render();
}
function viewDone() {
  head('تم', false);
  box().innerHTML = '<div style="text-align:center;padding:26px 8px;"><div style="font-size:42px;margin-bottom:8px;">✅</div>' +
    '<div style="font-size:13px;color:#e2e8f0;font-weight:800;line-height:1.9;margin-bottom:16px;">' + esc(ST.done || '') + '</div>' +
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
    btn('↩ تراجع', 'DAI.undo(true)', 'background:rgba(251,191,36,.12);border:1px solid #d97706;color:#fcd34d;padding:10px 16px;font-size:12px;') +
    btn('عملية أخرى', "DAI.go('home')", GHOST) + btn('إغلاق', 'DAI.close()', PRIMARY) + '</div></div>';
}
function doUndo(fromDone) {
  var u = undoLast();
  if (!u) return;
  if (typeof showSnack === 'function') showSnack('↩ تم التراجع عن: ' + u.label);
  if (fromDone) { ST.view = 'home'; }
  render();
}

/* ═════════════ واجهة عامة ═════════════ */
window.DAI = {
  open: open, close: closeAI, mode: pickMode, cancel: cancel,
  go: function (v) { if (!ST) return; ST.err = ''; ST.view = v; render(); },
  setCls: function (v) { ST.cls = v; if (ST.tbl) ST.tbl = null; render(); },
  setWeek: function (v) { ST.week = parseInt(v, 10) || 1; render(); },
  setWeekRev: function (v) { ST.week = parseInt(v, 10) || 1; render(); },
  setGType: function (v) { ST.gdef.type = v; render(); },
  files: addFiles,
  rmImg: function (i) { ST.imgs.splice(i, 1); render(); },
  note: function (v) { ST.note = v; },
  analyze: analyze,
  setRowStu: function (i, v) { ST.tbl.rows[i].idx = parseInt(v, 10); ST.tbl.rows[i].conf = 'high'; render(); },
  setColCi: function (j, v) { ST.tbl.cols[j].ci = (v === 'x') ? null : parseInt(v, 10); render(); },
  setColType: function (j, v) { ST.tbl.cols[j].type = v; render(); },
  setColWeek: function (j, v) { ST.tbl.cols[j].week = parseInt(v, 10) || 1; render(); },
  mark: function (i, j) {
    var c = ST.tbl.rows[i].cells, o = { absent: 'present', present: 'unknown', unknown: 'absent' };
    c[j] = o[c[j]] || 'absent'; render();
  },
  cell: function (i, j, v) { ST.tbl.rows[i].cells[j] = v; updateSummary(); },
  opt: function (k, v) { ST.opts[k] = !!v; updateSummary(); },
  applyTable: applyTable,
  namesText: function (v) { ST.names.text = v; namesSummary(); },
  namesMode: function (m) { ST.names.mode = m; namesSummary(); },
  namesStart: function (v) { ST.names.start = Math.max(1, parseInt(v, 10) || 1); namesSummary(); },
  namesDup: function (b) { ST.names.skipDup = !!b; namesSummary(); },
  applyNames: applyNames,
  cmdText: function (v) { ST.cmd.text = v; },
  example: function (i) { ST.cmd.text = EXAMPLES[i]; render(); },
  runCmd: runCmd, applyCmd: applyCmd,
  saveCfg: function () { saveCfg(false); }, testCfg: testCfg, delKey: delKey,
  pasteKey: pasteKey,
  setProv: function (p) { if (!ST.sets) ST.sets = cfgGet(); ST.sets.provider = p; render(); },
  setSet: function (k, v) { if (!ST.sets) ST.sets = cfgGet(); ST.sets[k] = v; },
  undo: function (fromDone) { doUndo(fromDone === true); }
};

/* ═════════════ زر 🤖 في الشريط العلوي ═════════════ */
function mountButton() {
  if (document.getElementById('daiTopBtn')) return true;
  var area = document.querySelector('.top-user-area');
  if (!area) return false;
  var b = document.createElement('button');
  b.id = 'daiTopBtn';
  b.title = 'المساعد الذكي';
  b.textContent = '🤖';
  b.style.cssText = 'background:none;border:none;font-size:17px;cursor:pointer;padding:0 2px;line-height:1;';
  b.onclick = function () { open(); };
  area.insertBefore(b, area.firstChild);
  return true;
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && ov()) closeAI();
});
var tries = 0;
(function tryMount() { if (!mountButton() && tries++ < 40) setTimeout(tryMount, 500); })();

})();
