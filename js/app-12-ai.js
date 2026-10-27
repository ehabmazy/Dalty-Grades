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
var MAX_IMAGES = 6;

/* ═════════════ الإعدادات (على الجهاز فقط) ═════════════ */
function cfgGet() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { o = {}; }
  return {
    provider: (o.provider === 'claude' || o.provider === 'gemini') ? o.provider : (o.key ? 'claude' : 'gemini'),
    key: String(o.key || ''), model: String(o.model || MODELS[0].id),
    gkey: String(o.gkey || ''), gmodel: String(o.gmodel || GMODELS[0].id),
    sendRoster: o.sendRoster !== false,
    route: o.route !== false
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

/* ═════ الإخراج المنظّم: يُجبَر النموذج على JSON مطابق للمخطط (Claude عبر أداة إلزامية، Gemini عبر responseSchema) ═════ */
var S_STR = { type: 'string' }, S_NSTR = { type: ['string', 'null'] }, S_NNUM = { type: ['number', 'null'] };
function sObj(props, req) { return { type: 'object', properties: props, required: req || [] }; }
function sArr(items) { return { type: 'array', items: items }; }
var SCH_COL = sObj({ label: S_STR, date: S_STR, day: S_STR, type: { type: 'string', enum: ['hw', 'assess', 'beh', 'ex1', 'ex2', 'unknown'] } }, ['label']);
var SCH_COL_ATT = sObj({ label: S_STR, date: S_STR, day: S_STR }, ['label']);
var SCH_ATT = sObj({
  columns: sArr(SCH_COL_ATT),
  students: sArr(sObj({ no: S_NNUM, name: S_STR, marks: sArr({ type: 'string', enum: ['absent', 'present', 'unknown'] }), doubt: sArr({ type: 'integer' }), name_unsure: { type: 'boolean' }, y: S_NNUM, img: { type: ['integer', 'null'] } }, ['name', 'marks']))
}, ['columns', 'students']);
var SCH_GR = sObj({
  columns: sArr(SCH_COL),
  students: sArr(sObj({ no: S_NNUM, name: S_STR, values: sArr(S_NSTR), doubt: sArr({ type: 'integer' }), name_unsure: { type: 'boolean' }, y: S_NNUM, img: { type: ['integer', 'null'] } }, ['name', 'values']))
}, ['columns', 'students']);
var SCH_NM = sObj({ names: sArr(S_STR) }, ['names']);
var SCH_AUTO = sObj({
  kind: { type: 'string', enum: ['att', 'grades', 'names'] },
  columns: sArr(SCH_COL),
  students: sArr(sObj({ no: S_NNUM, name: S_STR, marks: sArr(S_STR), values: sArr(S_NSTR), doubt: sArr({ type: 'integer' }), name_unsure: { type: 'boolean' }, y: S_NNUM, img: { type: ['integer', 'null'] } }, ['name'])),
  names: sArr(S_STR)
}, ['kind']);
/* تعليمات حرّة البنية (ops متعددة الأشكال): مخطط الحقول العليا فقط */
var SCH_AGENT = { type: 'object', properties: {
  reply: S_STR, summary: S_STR, ops: sArr({ type: 'object' }), clarification: S_STR,
  lookup: {}, navigate: S_STR, tool: { type: 'object' }, remember: sArr(S_STR), forget: sArr(S_STR)
}, required: ['reply'] };
var SCH_CMD = { type: 'object', properties: { summary: S_STR, ops: sArr({ type: 'object' }), clarification: S_STR }, required: ['ops'] };
var SCH_TEXT = sObj({ text: S_STR }, ['text']);
var SCH_ANY = { type: 'object' };

/* مخطط JSON القياسي → مخطط Gemini (أحرف كبيرة + nullable). يرجع undefined إذا كان فيه جزء حرّ غير مدعوم عند Gemini */
function toGeminiSchema(sc) {
  if (!sc || typeof sc !== 'object' || !sc.type) return undefined;
  var t = sc.type, nullable = false;
  if (Array.isArray(t)) { nullable = t.indexOf('null') >= 0; t = t.filter(function (x) { return x !== 'null'; })[0]; }
  if (!t) return undefined;
  var o = { type: String(t).toUpperCase() };
  if (nullable) o.nullable = true;
  if (sc.enum) o.enum = sc.enum.slice();
  if (t === 'object') {
    var keys = Object.keys(sc.properties || {}); if (!keys.length) return undefined;
    o.properties = {};
    for (var i = 0; i < keys.length; i++) { var c = toGeminiSchema(sc.properties[keys[i]]); if (!c) return undefined; o.properties[keys[i]] = c; }
    if (sc.required && sc.required.length) o.required = sc.required.slice();
  } else if (t === 'array') {
    var it = toGeminiSchema(sc.items); if (!it) return undefined; o.items = it;
  }
  return o;
}
function schemaFor(mode) { return mode === 'att' ? SCH_ATT : mode === 'grades' ? SCH_GR : mode === 'names' ? SCH_NM : SCH_AUTO; }

/* ═════ التوجيه الذكي للنماذج: الصور بنموذجك الأدق، والأسئلة البسيطة بنموذج سريع وأرخص ═════ */
var LIGHT_MODEL = { claude: 'claude-haiku-4-5-20251001', gemini: 'gemini-3.5-flash-lite' };
var MID_MODEL = { claude: 'claude-sonnet-5-5', gemini: 'gemini-3.8-flash' };
/* tier: 'light' = أسئلة بسيطة، 'vision' = قراءة صور (لا تقل عن النموذج المتوسط)، 'strong' أو بلا tier = نموذجك المختار */
function resolveModel(cfg, tier) {
  var gem = cfg.provider === 'gemini', sel = gem ? cfg.gmodel : cfg.model, p = gem ? 'gemini' : 'claude';
  if (!cfg.route || !tier) return sel;
  if (tier === 'light') return LIGHT_MODEL[p];
  if (tier === 'vision' && sel === LIGHT_MODEL[p]) return MID_MODEL[p];
  return sel;
}
/* أسئلة «كيف أستخدم…» العامة والتحيات فقط تذهب للنموذج السريع؛ أي سؤال عن بياناتك أو تعديل يبقى على نموذجك الأدق */
function chatTier(txt) {
  var t = String(txt || '').replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').trim();
  if (!t || t.length > 140) return 'strong';
  if (/^(شكرا|مرحبا|اهلا|السلام|تمام|ممتاز|جزاك|الله يعطيك)/.test(t) && t.length <= 40) return 'light';
  var howto = /^(كيف|ازاي|اين|فين|اشرح|شرح|طريقه|هل يمكن|هل ينفع|هل استطيع|ما معني|ما وظيفه|ما فائده|ما هي طريقه|ما هو الفرق)/.test(t);
  var personal = /\d|فصلي|طلابي|عندي|لدي|عندنا|الطالب رقم|هذا الفصل|ثانيه|الاسبوع الحالي|متوسط|نسبه|عدد|كم |كام|الاعلي|الاقل|ترتيب|الاضعف|المتعثر/.test(t);
  return howto && !personal ? 'light' : 'strong';
}
function callAI(opts) {
  var cfg = cfgGet();
  if (!(cfg.provider === 'gemini' ? cfg.gkey : cfg.key)) return Promise.reject(new Error('NO_KEY'));
  var off = guardNet(); if (off) return off;
  var sel = cfg.provider === 'gemini' ? cfg.gmodel : cfg.model;
  var rm = opts.model ? opts.model : resolveModel(cfg, opts.tier);
  var go = function (o) { return cfg.provider === 'gemini' ? callGemini(o, cfg) : callClaude(o, cfg); };
  var withModel = function (o, m) { var c = {}; Object.keys(o).forEach(function (k) { c[k] = o[k]; }); c.model = m; return c; };
  var p = go(withModel(opts, rm));
  if (rm !== sel) p = p.catch(function (e) {
    /* النموذج الموجَّه إليه غير متاح/حصته نفدت → نرجع لنموذجك المختار بدل الفشل */
    if (e && (e.status === 404 || e.status === 400 || e.code === 'MODEL' || e.code === 'QUOTA' || e.code === 'BUSY')) return go(withModel(opts, sel));
    throw e;
  });
  if (!opts.schema || opts.ping) return p;
  /* إن لم يكن الرد JSON صالحاً (نادر مع المخطط) نعيد المحاولة مرة واحدة بتنبيه صريح */
  return p.then(function (r) {
    if (r.truncated) return r;
    try { parseJSON(r.text); return r; } catch (e) {}
    var o2 = {}; Object.keys(opts).forEach(function (k) { o2[k] = opts[k]; });
    o2.content = (opts.content || []).concat([{ type: 'text', text: 'IMPORTANT: your previous reply was not valid JSON. Reply again with ONLY one valid JSON object that follows the required structure.' }]);
    return go(withModel(o2, rm)).catch(function () { return r; });
  });
}

/* سجل المحادثة (للمحادثة الذكية): [{role:'user'|'assistant', text}] */
function histMsgsClaude(h) {
  return (h || []).filter(function (m) { return m && m.text; }).map(function (m) {
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text) };
  });
}
function histMsgsGemini(h) {
  return (h || []).filter(function (m) { return m && m.text; }).map(function (m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.text) }] };
  });
}

/* ── Claude (Anthropic) ── */
function claudeBody(opts, cfg) {
  var body = {
    model: opts.model || cfg.model,
    max_tokens: opts.maxTokens || 6000,
    system: opts.system,
    messages: histMsgsClaude(opts.history).concat([{ role: 'user', content: opts.content }])
  };
  if (opts.schema && !opts.ping) {
    body.tools = [{ name: 'respond', description: 'Return the final answer as one structured JSON object.', input_schema: opts.schema }];
    body.tool_choice = { type: 'tool', name: 'respond' };
  }
  return body;
}
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
    body: JSON.stringify(claudeBody(opts, cfg))
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
    var tu = (j.content || []).filter(function (b) { return b.type === 'tool_use' && b.name === 'respond'; })[0];
    var t = tu ? JSON.stringify(tu.input || {}) : (j.content || []).filter(function (b) { return b.type === 'text'; })
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
  if (opts.schema && !opts.noSchema && !opts.ping) { var gs = toGeminiSchema(opts.schema); if (gs) gen.responseSchema = gs; }
  var body = {
    contents: histMsgsGemini(opts.history).concat([{ role: 'user', parts: toGeminiParts(opts.content) }]),
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
      if (opts.schema && !opts.noSchema && e && e.status === 400) {
        var o3 = {}; Object.keys(opts).forEach(function (k) { o3[k] = opts[k]; }); o3.noSchema = true;
        return geminiOnce(chain[i], o3, cfg);
      }
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
      var max = 2600, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      var sc = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var d = c.toDataURL('image/jpeg', 0.9);
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
function emptyPlan() { return { cells: [], abs: [], add: [], extra: [], warn: [], over: 0, skipped: 0, capped: 0, floored: 0 }; }

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
  /* نسخة احتياطية محلية قبل تعديلات الذكاء الاصطناعي (مرة كل 30 دقيقة) — تبقى متاحة من صفحة النسخ الاحتياطي حتى بعد إعادة فتح التطبيق */
  try {
    var lb = parseInt(localStorage.getItem('dalty_ai_lastbkp') || '0', 10) || 0;
    if (typeof _bkpCreate === 'function' && Date.now() - lb > 30 * 60 * 1000) { _bkpCreate('قبل تعديلات المساعد الذكي'); localStorage.setItem('dalty_ai_lastbkp', String(Date.now())); }
  } catch (e) {}

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
  /* العمليات البنيوية (تعديل اسم/حذف/نقل طالب/أعمدة/أسابيع/فصول) بعد تعديل الخانات */
  var exU = (plan.extra && plan.extra.length) ? applyExtras(cls, plan.extra) : null;
  saveDB();
  refreshPages();

  var entryT = Date.now();
  if (undoStack.length && undoStack[undoStack.length - 1].t >= entryT) entryT = undoStack[undoStack.length - 1].t + 1;
  undoStack.push({
    label: label, t: entryT,
    fn: function () {
      if (exU) { try { exU(); } catch (e) { console.error('[AI undo extra]', e); } }
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
  return { ok: true, t: entryT };
}

/* ═════════════ عمليات بنيوية قابلة للتراجع ═════════════ */
function findStuById(cls, id) {
  var a = DB.data[cls] || [];
  for (var i = 0; i < a.length; i++) if (String(a[i].id) === String(id)) return i;
  return -1;
}
function colPagesFor(field) {
  var id = /^a$|^assess$/.test(field) ? 'pg_assess' : (/^h$|^hw$/.test(field) ? 'pg_hw' : (/^bw$|^beh$/.test(field) ? 'pg_beh' : 'pg_other'));
  var out = null;
  (DB.colPages || []).forEach(function (pg) { if (pg.id === id) out = pg; });
  return out;
}
/* يُنفّذ العمليات ويُرجع دالة تراجع تعيدها كما كانت */
function applyExtras(cls, extras) {
  var undos = [];
  try { if (typeof _ensureWeekCols === 'function') _ensureWeekCols(); } catch (e) {}
  extras.forEach(function (e) {
    var i, a, abs, st;
    if (e.kind === 'rename') {
      i = findStuById(cls, e.id); if (i < 0) return;
      st = DB.data[cls][i]; var oldN = st.name; st.name = e.name;
      undos.push(function () { st.name = oldN; });
    } else if (e.kind === 'delete') {
      i = findStuById(cls, e.id); if (i < 0) return;
      st = DB.data[cls][i];
      if (!DB.absences) DB.absences = {}; if (!DB.absences[cls]) DB.absences[cls] = {};
      var keptAbs = DB.absences[cls][st.id];
      DB.data[cls].splice(i, 1); delete DB.absences[cls][st.id];
      undos.push(function () {
        var pos = Math.min(i, DB.data[cls].length);
        DB.data[cls].splice(pos, 0, st);
        if (keptAbs !== undefined) DB.absences[cls][st.id] = keptAbs;
      });
    } else if (e.kind === 'moveStu') {
      i = findStuById(cls, e.id); if (i < 0 || !DB.data[e.to]) return;
      st = DB.data[cls][i];
      if (!DB.absences) DB.absences = {}; if (!DB.absences[cls]) DB.absences[cls] = {}; if (!DB.absences[e.to]) DB.absences[e.to] = {};
      var mvAbs = DB.absences[cls][st.id];
      DB.data[cls].splice(i, 1); delete DB.absences[cls][st.id];
      DB.data[e.to].push(st); if (mvAbs !== undefined) DB.absences[e.to][st.id] = mvAbs;
      undos.push(function () {
        var j = DB.data[e.to].indexOf(st); if (j >= 0) DB.data[e.to].splice(j, 1);
        delete DB.absences[e.to][st.id];
        DB.data[cls].splice(Math.min(i, DB.data[cls].length), 0, st);
        if (mvAbs !== undefined) DB.absences[cls][st.id] = mvAbs;
      });
    } else if (e.kind === 'colmax') {
      var pgm = colPagesFor(e.field); if (!pgm) return;
      var oldM = [];
      pgm.cols.forEach(function (c) {
        if (/^ex/.test(e.field) && c.id !== e.field) return;
        oldM.push([c, c.max]); c.max = e.max;
      });
      undos.push(function () { oldM.forEach(function (x) { x[0].max = x[1]; }); });
    } else if (e.kind === 'wkvis') {
      var oldV = [];
      ['pg_assess:a', 'pg_hw:h', 'pg_beh:bw'].forEach(function (pp) {
        var q = pp.split(':'), pg = null;
        (DB.colPages || []).forEach(function (x) { if (x.id === q[0]) pg = x; });
        if (!pg) return;
        for (var w = e.from; w <= e.to; w++) {
          pg.cols.forEach(function (c) { if (c.id === q[1] + w) { oldV.push([c, c.visible]); c.visible = !!e.vis; } });
        }
      });
      undos.push(function () { oldV.forEach(function (x) { x[0].visible = x[1]; }); });
    } else if (e.kind === 'activeWeeks') {
      var oldW = DB.meta.activeWeeks; DB.meta.activeWeeks = e.count;
      undos.push(function () { DB.meta.activeWeeks = oldW; });
    } else if (e.kind === 'addClass') {
      if (DB.classes.indexOf(e.name) >= 0) return;
      DB.classes.push(e.name); DB.data[e.name] = []; 
      if (!DB.schedule) DB.schedule = {}; DB.schedule[e.name] = defaultSchedule();
      if (!DB.absences) DB.absences = {}; DB.absences[e.name] = {};
      undos.push(function () {
        DB.classes = DB.classes.filter(function (c) { return c !== e.name; });
        delete DB.data[e.name]; delete DB.schedule[e.name]; delete DB.absences[e.name];
      });
    } else if (e.kind === 'renameClass') {
      var ix = DB.classes.indexOf(e.from); if (ix < 0 || DB.classes.indexOf(e.to) >= 0) return;
      function mv(a2, b2) {
        DB.classes[DB.classes.indexOf(a2)] = b2;
        ['data', 'schedule', 'absences'].forEach(function (k) {
          if (DB[k] && DB[k][a2] !== undefined) { DB[k][b2] = DB[k][a2]; delete DB[k][a2]; }
        });
        try { if (GS.activeClass === a2) GS.activeClass = b2; if (WKS.activeClass === a2) WKS.activeClass = b2; } catch (er) {}
        try { if (ST && ST.cls === a2) ST.cls = b2; } catch (er) {}
      }
      mv(e.from, e.to);
      undos.push(function () { mv(e.to, e.from); });
    }
  });
  return function () { for (var k = undos.length - 1; k >= 0; k--) { try { undos[k](); } catch (er) {} } };
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

/* ═════════════ حساب آمن للدرجات: لا تتجاوز الحد الأقصى ولا تقل عن صفر ═════════════ */
function isNumVal(v) { return hasData(v) && v !== '\u063A' && v !== '\u0645' && !isNaN(Number(v)); }
function round2(x) { return Math.round(x * 100) / 100; }
/* يُرجع {val, flag}: flag='max' إن رُدّت للحد الأقصى، 'min' إن رُدّت للصفر */
function clampGrade(x, mx) {
  x = round2(x);
  if (x > mx) return { val: mx, flag: 'max' };
  if (x < 0) return { val: 0, flag: 'min' };
  return { val: x, flag: '' };
}
function whereOK(cur, w, mx) {
  if (!w || !w.op) return true;
  var x = Number(cur), a = parseFloat(w.value), b = parseFloat(w.value2);
  if (w.unit === 'percent') x = mx ? x / mx * 100 : 0;
  switch (String(w.op)) {
    case 'lt': return x < a;
    case 'lte': return x <= a;
    case 'gt': return x > a;
    case 'gte': return x >= a;
    case 'eq': return x === a;
    case 'between': return x >= Math.min(a, b) && x <= Math.max(a, b);
  }
  return true;
}

/* ═════════════ خطة من أوامر مكتوبة (ops) ═════════════ */
function planFromOps(cls, ops, opts) {
  opts = opts || {};
  var arr = DB.data[cls] || [], plan = emptyPlan();
  var virt = {}, absVirt = {}, flagV = {};
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
  function vset(i, k, v, flag) { virt[i + '|' + k] = v; flagV[i + '|' + k] = flag || ''; }
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
      var delta = (op.delta !== undefined && op.delta !== null && op.delta !== '') ? parseFloat(op.delta) : 0;
      if (!isFinite(delta)) delta = 0;
      if (mode === 'swap' && delta) { plan.warn.push('الإضافة/الطرح غير مدعومة مع «تبديل» — تُجوهلت.'); delta = 0; }
      var scale = op.scale === true && maxFor(kf) !== maxFor(kt);
      var pairs = [];
      if (from.student != null || to.student != null) {
        var fi = resolveStu(from.student != null ? from.student : to.student);
        var ti = resolveStu(to.student != null ? to.student : from.student);
        if (fi < 0 || ti < 0) { plan.warn.push('تعذّر تحديد طالب في عملية النقل.'); return; }
        pairs.push([fi, ti]);
      } else {
        resolveList(op.students).forEach(function (k) { pairs.push([k, k]); });
      }
      /* يحوّل قيمة مصدر إلى قيمة هدف: غ/م كما هي، والأرقام تُحوَّل/تُجمع وتُقيَّد بحدّ الهدف */
      var conv = function (v, fromKey, toKey) {
        if (!hasData(v)) return null;
        if (v === '\u063A' || v === '\u0645') return { val: v, flag: '' };
        var n = Number(v); if (isNaN(n)) { plan.warn.push('قيمة غير رقمية «' + v + '» تُجوهلت.'); return null; }
        if (scale) n = n / maxFor(fromKey) * maxFor(toKey);
        return clampGrade(n + delta, maxFor(toKey));
      };
      pairs.forEach(function (pr) {
        var a = vget(pr[0], kf), b = vget(pr[1], kt);
        if (mode === 'swap') {
          var ca = conv(a, kf, kt), cb = conv(b, kt, kf);
          if (!hasData(a) && !hasData(b)) return;
          vset(pr[1], kt, ca ? ca.val : '', ca ? ca.flag : '');
          vset(pr[0], kf, cb ? cb.val : '', cb ? cb.flag : '');
        } else {
          var cv = conv(a, kf, kt); if (!cv) return;
          vset(pr[1], kt, cv.val, cv.flag);
          if (mode === 'move' && !(pr[0] === pr[1] && kf === kt)) vset(pr[0], kf, '');
        }
      });
    } else if (t === 'adjust') {
      var dlt = parseFloat(op.delta);
      if (!isFinite(dlt) || dlt === 0) { plan.warn.push('قيمة الإضافة/الطرح غير صالحة.'); return; }
      var wf = parseInt(op.week_from != null ? op.week_from : (op.week != null ? op.week : defWeek), 10);
      var wt = parseInt(op.week_to != null ? op.week_to : wf, 10);
      var isEx = (String(op.field) === 'ex1' || String(op.field) === 'ex2');
      if (isEx) { wf = 1; wt = 1; }
      if (wt < wf) { var tmpw = wf; wf = wt; wt = tmpw; }
      var targets = resolveList(op.students), emptySkipped = 0, any = false;
      for (var wv = wf; wv <= wt; wv++) {
        var ak = keyOf(op.field, wv);
        if (!ak) { plan.warn.push('عمود غير صالح (' + op.field + ' – أسبوع ' + wv + ').'); continue; }
        var amx = maxFor(ak);
        targets.forEach(function (k) {
          var cur = vget(k, ak);
          if (!isNumVal(cur)) { emptySkipped++; return; }
          if (!whereOK(cur, op.where, amx)) return;
          var r = clampGrade(Number(cur) + dlt, amx);
          vset(k, ak, r.val, r.flag); any = true;
        });
      }
      if (emptySkipped) plan.warn.push('تخطّيتُ ' + emptySkipped + ' خانة فارغة/غائب/معفى (لا تُعدَّل بالجمع والطرح).');
      if (!any && !emptySkipped) plan.warn.push('لا توجد خانات مطابقة للشرط.');
    } else if (t === 'add_students') {
      (op.names || []).forEach(function (n) {
        n = String(n || '').replace(/\s+/g, ' ').trim();
        if (!n) return;
        var dup = arr.some(function (s) { return normAr(s.name) === normAr(n); }) ||
                  plan.add.some(function (x) { return normAr(x) === normAr(n); });
        if (dup) plan.warn.push('الاسم «' + n + '» موجود بالفعل — تُجوهل.'); else plan.add.push(n);
      });
    } else if (t === 'rename_student') {
      i = resolveStu(op.student);
      var nn = String(op.name || '').replace(/\s+/g, ' ').trim();
      if (i < 0 || !nn) { plan.warn.push('تعديل الاسم: طالب أو اسم غير واضح.'); return; }
      plan.extra.push({ kind: 'rename', id: arr[i].id, name: nn, desc: '✏️ تعديل الاسم: «' + arr[i].name + '» ← «' + nn + '»' });
    } else if (t === 'delete_students') {
      if (op.students === 'all') { plan.warn.push('رفضتُ حذف كل الطلاب دفعة واحدة. حدّد أسماء أو أرقاماً.'); return; }
      resolveList(op.students).forEach(function (k) {
        plan.extra.push({ kind: 'delete', id: arr[k].id, desc: '🗑 حذف الطالب «' + arr[k].name + '» (مع غيابه وكل درجاته)' });
      });
    } else if (t === 'move_student') {
      i = resolveStu(op.student); var tc = String(op.to_class || '').trim();
      if (i < 0) { plan.warn.push('نقل طالب: تعذّر تحديد الطالب.'); return; }
      if (!DB.data[tc] || tc === cls) { plan.warn.push('نقل طالب: الفصل «' + tc + '» غير موجود أو هو نفس الفصل.'); return; }
      plan.extra.push({ kind: 'moveStu', id: arr[i].id, to: tc, desc: '🔀 نقل «' + arr[i].name + '» من ' + cls + ' إلى ' + tc });
    } else if (t === 'set_column_max') {
      var cf = String(op.field || '').toLowerCase(), cm = parseFloat(op.max);
      if (['assess', 'hw', 'beh', 'ex1', 'ex2'].indexOf(cf) < 0 || !(cm >= 1 && cm <= 100)) { plan.warn.push('تعديل الدرجة العظمى: عمود أو قيمة غير صالحة.'); return; }
      plan.extra.push({ kind: 'colmax', field: cf, max: cm, desc: '📐 الدرجة العظمى لـ «' + fieldLbl(cf) + '» ← ' + cm + (/^ex/.test(cf) ? '' : ' (لكل الأسابيع — الدرجات الموجودة لا تتغير)') });
    } else if (t === 'set_weeks_visibility') {
      var wf2 = parseInt(op.from, 10), wt2 = parseInt(op.to != null ? op.to : op.from, 10);
      if (!(wf2 >= 1 && wt2 >= wf2 && wt2 <= ALL_WEEKS.length)) { plan.warn.push('إظهار/إخفاء الأسابيع: نطاق غير صالح.'); return; }
      var vis = !(op.visible === false || op.visible === 'false');
      plan.extra.push({ kind: 'wkvis', from: wf2, to: wt2, vis: vis, desc: (vis ? '👁 إظهار' : '🙈 إخفاء') + ' الأسابيع ' + wf2 + (wt2 > wf2 ? ' إلى ' + wt2 : '') + ' من صفحة الدرجات' });
    } else if (t === 'set_active_weeks') {
      var ac = parseInt(op.count, 10);
      if (!(ac >= 1 && ac <= ALL_WEEKS.length)) { plan.warn.push('عدد الأسابيع غير صالح (1–' + ALL_WEEKS.length + ').'); return; }
      plan.extra.push({ kind: 'activeWeeks', count: ac, desc: '📅 عدد الأسابيع الفعّالة ← ' + ac });
    } else if (t === 'add_class') {
      var an = String(op.name || '').trim();
      if (!an || DB.classes.indexOf(an) >= 0) { plan.warn.push('إضافة فصل: الاسم فارغ أو موجود.'); return; }
      plan.extra.push({ kind: 'addClass', name: an, desc: '➕ إضافة فصل «' + an + '»' });
    } else if (t === 'rename_class') {
      var rf = String(op.from || cls).trim(), rt = String(op.to || '').trim();
      if (DB.classes.indexOf(rf) < 0 || !rt || DB.classes.indexOf(rt) >= 0) { plan.warn.push('تغيير اسم فصل: غير ممكن (الفصل غير موجود أو الاسم الجديد مستخدم).'); return; }
      plan.extra.push({ kind: 'renameClass', from: rf, to: rt, desc: '✏️ تغيير اسم الفصل «' + rf + '» ← «' + rt + '»' });
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
    var fl = flagV[kk] || '';
    if (fl === 'max') plan.capped++; else if (fl === 'min') plan.floored++;
    plan.cells.push({ idx: i, id: s.id, key: key, old: old, nu: nu, cap: fl });
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

var NEW_OPS_DOC =
  '8) {"type":"rename_student","student":5,"name":"corrected full name"}\n' +
  '9) {"type":"delete_students","students":[3,7]}  (never "all"; only when the teacher clearly asks to delete)\n' +
  '10) {"type":"move_student","student":4,"to_class":"exact class name from the class list"}\n' +
  '11) {"type":"set_column_max","field":"assess|hw|beh|ex1|ex2","max":20}  (maximum score of that column; for assess/hw/beh it applies to all weeks)\n' +
  '12) {"type":"set_weeks_visibility","from":15,"to":18,"visible":false}  (show/hide weeks in the grades page)\n' +
  '13) {"type":"set_active_weeks","count":16}\n' +
  '14) {"type":"add_class","name":"new class name"}\n' +
  '15) {"type":"rename_class","from":"old name","to":"new name"}\n';
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
  '7) {"type":"adjust","field":"hw","week":3,"delta":2,"students":"all"|[..],"where":{"op":"lt|lte|gt|gte|eq|between","value":5,"value2":8,"unit":"raw|percent"}}  — ADD (positive delta) or SUBTRACT (negative delta) points in place; ' +
  'optional "where" limits it to students whose CURRENT value matches; for several weeks use "week_from" and "week_to" instead of "week". ' +
  'The app itself caps results at the column maximum and floors them at 0 and skips empty/absent cells — NEVER do that arithmetic yourself, just give the delta.\n' +
  'Transfer (op 5) also accepts an optional "delta" (points added to/subtracted from each moved value, e.g. "انقل … وأضف عليها درجتين") and "scale":true (convert proportionally when the two columns have different maximums). ' +
  'Values that would exceed the target maximum are capped by the app automatically.\n' +
  NEW_OPS_DOC +
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
  maxFor: maxFor, labelFor: labelFor, MODELS: MODELS, GMODELS: GMODELS,
  _chat: function () { return { chatCatalog: chatCatalog, schoolContext: schoolContext, classDigest: classDigest, SYS_AGENT: SYS_AGENT }; }
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
    view: hasKey() ? 'chat' : 'home', mode: null, cls: cls, week: wk, imgs: [], note: '', err: '',
    tbl: null, opts: { skipExisting: true, clearPresent: false },
    names: { text: '', mode: 'empty', start: 1, skipDup: true },
    cmd: { text: '', clar: '', summary: '', plan: null },
    gdef: { type: 'hw' }, done: null, busy: false, repAll: false, repTxt: '', repClar: '', rep: null, presets: null
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
  var dk = document.getElementById('mobileDock'), dh = (dk && dk.offsetHeight) ? dk.offsetHeight : 0;
  o.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:' + dh + 'px;z-index:100050;background:rgba(2,6,23,.78);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:inherit;';
  o.onclick = function (e) { if (e.target === o) minimizeAI(); };
  o.innerHTML = '<div style="background:#0f172a;border:1px solid #334155;border-radius:18px 18px 0 0;width:min(620px,100%);height:min(94%,900px);display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,.5);">' +
    '<div id="daiHead" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1e293b;flex-shrink:0;"></div>' +
    '<div id="daiBody" style="flex:1;overflow-y:auto;padding:12px 14px 18px;-webkit-overflow-scrolling:touch;"></div></div>';
  document.body.appendChild(o);
  ST.presets = buildPresets();
  hideMini(); AI_OPEN = true; chatSave();
  render();
  if (mode) pickMode(mode);
}
function closeAI() {
  if (_abort) { try { _abort.abort(); } catch (e) {} }
  var o = ov(); if (o) o.remove();
  ST = null; reviewClear();
  hideMini(); AI_OPEN = false; chatSave(); try { updateBadge(); } catch (e) {}
}

function head(title, back) {
  var h = document.getElementById('daiHead'); if (!h) return;
  var bt = (typeof back === 'string') ? back : 'home';
  h.innerHTML = (back ? '<button onclick="DAI.go(\'' + bt + '\')" style="' + BTN + 'background:#1e293b;color:#93c5fd;padding:6px 10px;font-size:13px;">→</button>' : '<span style="font-size:20px;">🤖</span>') +
    '<span style="flex:1;font-weight:900;color:#e2e8f0;font-size:14px;">' + title + '</span>' +
    ((ST.view === 'home' || ST.view === 'chat') ? '<button onclick="DAI.go(\'settings\')" style="' + BTN + 'background:none;color:#94a3b8;font-size:16px;padding:4px 8px;" title="الإعدادات">⚙️</button>' : '') +
    (undoStack.length ? '<button onclick="DAI.undoBar()" title="تراجع عن آخر تعديل" style="' + BTN + 'background:rgba(251,191,36,.15);color:#fcd34d;font-size:13px;padding:5px 9px;">↩</button>' : '') +
    '<button onclick="DAI.minimize()" title="تصغير لمتابعة التطبيق" style="' + BTN + 'background:none;color:#93c5fd;font-size:18px;padding:4px 8px;">➖</button>' +
    '<button onclick="DAI.close()" style="' + BTN + 'background:none;color:#f87171;font-size:18px;padding:4px 8px;">✕</button>';
}

function render() {
  if (!ST || !box()) return;
  var v = ST.view, isRev = (v === 'reviewTable' || v === 'reviewNames'), keepTop = (isRev && ST._lv === v) ? box().scrollTop : 0;
  if (v === 'home') viewHome();
  else if (v === 'settings') viewSettings();
  else if (v === 'input') viewInput();
  else if (v === 'loading') viewLoading();
  else if (v === 'reviewTable') viewReviewTable();
  else if (v === 'reviewNames') viewReviewNames();
  else if (v === 'cmd') viewCmd();
  else if (v === 'chat') viewChat();
  else if (v === 'prefs') viewPrefs();
  else if (v === 'reviewPlan') viewReviewPlan();
  else if (v === 'rep') viewRep();
  else if (v === 'repOut') viewRepOut();
  else if (v === 'done') viewDone();
  box().scrollTop = keepTop; ST._lv = v;
  if (isRev) reviewSave(); else if (v !== 'loading') reviewClear();
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
    card('🧠', 'المحادثة الذكية', 'اسأل عن أي شيء في التطبيق أو فصولك: شرح الاستخدام، تحليل ومقارنة، رسائل وخطط، وتعديلات بأمر عادي أو صوتي', 'chat') +
    card('📝', 'رصد الدرجات من صورة', 'صوّر كشف درجات (واجب/تقييم/سلوك/اختبار)', 'grades') +
    card('💬', 'أمر بالكتابة', 'انقل/انسخ/بدّل درجات، سجّل غياباً، املأ عموداً…', 'cmd') +
    card('📊', 'التقارير الذكية', 'الضعاف، المتفوقون، من لم تُرصد درجاتهم، الأكثر غياباً…', 'rep') +
    (hasKey() ? '' : '<div style="background:#1e1b4b;border:1px solid #4338ca;color:#c7d2fe;border-radius:10px;padding:9px;font-size:11px;line-height:1.9;margin-bottom:8px;">ℹ️ الأدوات التي تقرأ الصور وتفهم الأوامر تحتاج مفتاحاً من ⚙️ (مجاني). <b>التقارير الجاهزة تعمل الآن بدونه.</b></div>') +
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
    '<label style="font-size:11px;color:#cbd5e1;display:block;line-height:1.8;margin-bottom:10px;"><input type="checkbox" ' + (c.route !== false ? 'checked' : '') + ' onchange="DAI.setSet(\'route\',this.checked)"> التوجيه الذكي: قراءة الصور والتعديلات بنموذجك المختار، والأسئلة العامة البسيطة («كيف أستخدم…؟») بنموذج أسرع وأرخص (' + (gem ? 'Flash-Lite' : 'Haiku') + ')</label>' +
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
  var o = { provider: c.provider, key: String(c.key || '').trim(), model: c.model, gkey: String(c.gkey || '').trim(), gmodel: c.gmodel, sendRoster: c.sendRoster !== false, route: c.route !== false };
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
  if (m === 'rep') { ST.err = ''; ST.repClar = ''; ST.view = 'rep'; render(); return; }
  if (!hasKey()) { ST.view = 'settings'; render(); return; }
  if (m === 'chat') { ST.err = ''; ST.view = 'chat'; render(); return; }
  ST.mode = m; ST.imgs = []; ST.err = ''; ST.tbl = null;
  ST.view = (m === 'cmd') ? 'cmd' : 'input';
  render();
}

/* ───────── إدخال الصور ───────── */
var MODE_INFO = {
  auto: { t: 'تحليل تلقائي', d: 'صوّر الورقة وسأعرف نوعها (غياب / أسماء / درجات) وأقرأ التاريخ واليوم من رأس العمود.' },
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
      '<button onclick="DAI.rotImg(' + i + ')" title="تدوير 90°" style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;">⟳</button>' +
      '<button onclick="DAI.enhImg(' + i + ')" title="تحسين الوضوح (للخط الباهت)" style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;">✨</button>' +
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
  var DATEF = 'Each column header may show a DATE and a DAY NAME (e.g. "الأحد 12/10" or "١٢/١٠"). Copy them per column: "date" as ASCII digits "D/M" or "D/M/YYYY" exactly as written (convert Arabic-Indic digits; never guess a missing year or day), "day" as the weekday name as written; use "" when absent.';
  var DOUBTF = ' Honesty about uncertainty: in each student\'s "doubt" list the 0-based column indexes whose mark/value you could NOT read with confidence (blurry, overwritten, ambiguous digit such as 1/7 or 3/8), and set "name_unsure" to true when the name is hard to read. Never guess silently; an empty list means you are confident. Also give each student "y" = the vertical centre of that student\'s row as a fraction of the image height (0 = top edge, 1 = bottom edge, e.g. 0.42) and "img" = the 0-based index of the image that row appears in (0 for a single image); use null when unsure. Read every digit literally: never normalise a value to look plausible, keep decimals such as 7.5 exactly, and when two handwritten digits are confusable (1/7, 3/8, 0/6) list that column in "doubt".';
  var pAtt = base + 'This is an ATTENDANCE sheet. Return exactly: {"columns":[{"label":"column header text; use \"عمود N\" if none","date":"","day":""}],' +
    '"students":[{"no":<serial number printed on sheet or null>,"name":"name as written","marks":["absent"|"present"|"unknown",...],"doubt":[],"name_unsure":false,"y":0.42,"img":0}]}.\n' +
    '"marks" must have exactly one entry per column, in the same order as "columns". Absent is usually marked by غ / غائب / ✗ / a filled circle or colored cell; present by ✓ or the sheet legend\'s symbol; ' +
    'if the sheet has a legend follow it. If a cell is empty: treat as "present" only when other students have explicit absence marks in that column; otherwise "unknown". ' + DATEF + DOUBTF;
  var pGr = base + 'This is a GRADES sheet. Return exactly: {"columns":[{"label":"column header","date":"","day":"","type":"hw|assess|beh|ex1|ex2|unknown"}],"students":[{"no":<serial or null>,"name":"name as written","values":["17"|"غ"|"م"|null,...],"doubt":[],"name_unsure":false,"y":0.42,"img":0}]}.\n' +
    'Include only columns that hold grades (skip serial/name/total/signature columns). "values" must have one entry per column; copy each value exactly as written (digits may be Arabic-Indic), use null if empty or unreadable. Do not compute anything. ' +
    '"type" from the header words: واجب=hw, تقييم=assess, سلوك=beh, اختبار أول/١=ex1, اختبار ثاني/٢=ex2; use "unknown" when the header does not say. ' + DATEF + DOUBTF;
  var pNm = base + 'This is a student NAME LIST. Return exactly: {"names":["full name 1","full name 2",...]} — one string per student, in the order shown, without numbering or bullets. ' +
    'Skip titles, class names, dates, headers and footers.';
  var prompt;
  if (mode === 'att') prompt = pAtt;
  else if (mode === 'grades') prompt = pGr;
  else if (mode === 'names') prompt = pNm;
  else prompt = base + 'FIRST decide what kind of sheet the image shows and return it in "kind": "att" = attendance (marks like ✓ ✗ غ per date/period), "grades" = numeric scores per column, "names" = a plain list of student names with no marks or scores. ' +
    'Then return ONE JSON object containing "kind" plus the fields of that kind:\n' +
    '[att] ' + pAtt.slice(base.length) + '\n[grades] ' + pGr.slice(base.length) + '\n[names] ' + pNm.slice(base.length);
  var content = imageBlocks(ST.imgs).concat([{ type: 'text', text: prompt }]);
  ST.view = 'loading'; ST.err = ''; render();
  callAI({ system: SYS_TABLE, content: content, maxTokens: 8000, schema: schemaFor(mode), tier: 'vision' })
    .then(function (r) {
      if (!ST) return;
      var j;
      try { j = parseJSON(r.text); } catch (e) { throw new Error(r.truncated ? 'TRUNCATED' : 'BAD_JSON'); }
      if (r.truncated) throw new Error('TRUNCATED');
      if (mode === 'auto') {
        var kd = String((j && j.kind) || '');
        if (!/^(att|grades|names)$/.test(kd)) throw new Error('BAD_JSON');
        mode = kd; ST.mode = kd;
        try { if (typeof showSnack === 'function') showSnack('🔎 النوع: ' + ({ att: 'غياب', grades: 'درجات', names: 'أسماء' })[kd]); } catch (e) {}
      }
      if (mode === 'names') buildNames(j); else buildTable(j, mode);
    })
    .catch(function (e) {
      if (!ST) return;
      ST.view = 'input'; ST.err = errMsg(e); render();
    });
}

/* ───────── قراءة التاريخ/اليوم من رأس العمود وربطهما بالأسبوع ───────── */
function digitsEn(s) {
  return String(s == null ? '' : s).replace(/[\u0660-\u0669]/g, function (c) { return c.charCodeAt(0) - 1632; })
    .replace(/[\u06F0-\u06F9]/g, function (c) { return c.charCodeAt(0) - 1776; });
}
function parseSheetDate(str) {
  var t = digitsEn(str).trim(); if (!t) return null;
  var m = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(t);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/.exec(t);
  if (!m) return null;
  var y = m[3] ? +m[3] : null; if (y !== null && y < 100) y += 2000;
  var d = +m[1], mo = +m[2];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y: y, m: mo, d: d };
}
/* 0=السبت … 6=الجمعة (نفس ترتيب التطبيق) */
function dayIdxOf(str) {
  var t = String(str || '').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا');
  if (/سبت/.test(t)) return 0; if (/احد/.test(t)) return 1; if (/اثنين|ثنين/.test(t)) return 2;
  if (/ثلاث/.test(t)) return 3; if (/اربع/.test(t)) return 4; if (/خميس/.test(t)) return 5; if (/جمع/.test(t)) return 6;
  return -1;
}
/* startDate = سبت الأسبوع 1 — نفس منطق التطبيق */
function resolveColDate(dateStr, dayStr) {
  var out = { week: null, dIdx: dayIdxOf(dayStr), warn: '', label: '' };
  var day = String(dayStr || '').trim();
  var pd = parseSheetDate(dateStr);
  if (!pd) { out.label = day; return out; }
  out.label = pd.d + '/' + pd.m + (day ? ' ' + day : '');
  var sd = DB && DB.meta && DB.meta.startDate, start = sd ? new Date(sd) : null;
  if (!start || isNaN(start.getTime())) { out.warn = 'حدّد «تاريخ بداية الفصل» من الإعدادات ليُربط التاريخ بالأسبوع تلقائياً'; return out; }
  start.setHours(0, 0, 0, 0);
  var aw = activeWeeks(), best = null, y0 = start.getFullYear();
  (pd.y ? [pd.y] : [y0, y0 + 1, y0 - 1]).forEach(function (y) {
    var dt = new Date(y, pd.m - 1, pd.d); dt.setHours(0, 0, 0, 0);
    if (dt.getMonth() !== pd.m - 1) return;
    var diff = Math.round((dt - start) / 86400000), inR = diff >= 0 && diff < aw * 7, sc = inR ? 0 : Math.abs(diff);
    if (!best || sc < best.sc) best = { dt: dt, diff: diff, inR: inR, sc: sc };
  });
  if (!best) return out;
  if (!best.inR) { out.warn = 'التاريخ ' + pd.d + '/' + pd.m + ' خارج أسابيع الفصل — راجع الأسبوع'; return out; }
  out.week = Math.floor(best.diff / 7) + 1;
  var actual = (best.dt.getDay() + 1) % 7;
  if (out.dIdx >= 0 && out.dIdx !== actual) out.warn = 'اليوم المكتوب لا يطابق التاريخ — راجع';
  if (out.dIdx < 0) out.dIdx = actual;
  return out;
}
function colNote(info, extra) {
  var p = [];
  if (info.label) p.push(info.label + (info.week ? ' ← أسبوع ' + info.week : ''));
  if (extra) p.push(extra);
  if (info.warn) p.push(info.warn);
  return p.join(' — ');
}

function rowY(s) { var v = typeof s.y === 'number' ? s.y : parseFloat(s.y); return (isFinite(v) && v >= 0 && v <= 1) ? v : null; }
function rowImg(s) { var v = parseInt(s.img, 10); return v >= 0 ? v : 0; }
/* أقرب اقتراحين من أسماء الفصل (لتصحيح المطابقة بنقرة) */
function topCands(nm, arr, skipIdx) {
  var sc = [];
  arr.forEach(function (s, i) { if (i !== skipIdx && s && (s.name || '').trim()) sc.push({ i: i, sc: nameSim(nm, s.name) }); });
  sc.sort(function (a, b) { return b.sc - a.sc; });
  return sc.filter(function (x) { return x.sc >= 0.3; }).slice(0, 2);
}
function rowNote(r, i) {
  var arr = DB.data[ST.cls] || [], out = [], ch = '';
  var loc = typeof r.y === 'number' ? '<button onclick="DAI.locate(' + i + ')" title="أرِني هذا الصف في الصورة (تقريبي)" style="' + BTN + 'background:#14532d;color:#bbf7d0;font-size:10px;padding:3px 9px;">🎯 في الصورة</button>' : '';
  if (r.idx < 0) out.push('<span style="color:#fca5a5;">لم يُطابَق مع أي طالب</span>');
  else if (r._dup) out.push('<span style="color:#c4b5fd;">⚠️ نفس الطالب في صف آخر</span>');
  else if (r.conf === 'mid') out.push('<span style="color:#fbbf24;">مطابقة تقريبية — تأكد</span>');
  if (r.nameUnsure) out.push('<span style="color:#fbbf24;">الاسم غير واضح في الصورة</span>');
  if (r.idx < 0 || r.conf === 'mid' || r.nameUnsure || r._dup) (r.cands || []).forEach(function (c) {
    if (c.i !== r.idx && arr[c.i]) ch += '<button onclick="DAI.setRowStu(' + i + ',' + c.i + ')" style="' + BTN + 'background:#172554;color:#bfdbfe;border:1px solid #1e40af;font-size:10px;padding:3px 8px;">هل تقصد: ' + (c.i + 1) + '. ' + esc(arr[c.i].name) + '؟</button>';
  });
  if (!out.length && !ch && !loc) return '';
  return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:10px;margin-bottom:5px;">' + loc + out.join(' · ') + ch + '</div>';
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
  var infos = [];
  for (var c0 = 0; c0 < n; c0++) infos.push(resolveColDate(cols[c0] && cols[c0].date, cols[c0] && cols[c0].day));
  var lblOf = function (c) { return (cols[c] && cols[c].label) ? String(cols[c].label) : ('عمود ' + (c + 1)); };
  if (mode === 'att') {
    /* الأسبوع الأكثر تكراراً بين التواريخ المقروءة */
    var cnt = {}, bestW = null;
    infos.forEach(function (f) { if (f.week) { cnt[f.week] = (cnt[f.week] || 0) + 1; if (bestW === null || cnt[f.week] > cnt[bestW]) bestW = f.week; } });
    if (bestW) ST.week = bestW;
    var per = periodsFor(ST.cls, ST.week), real = per.some(function (p) { return p.period && !/^g\d+$/.test(String(p.period.id)); });
    var usedCi = {};
    for (var c = 0; c < n; c++) {
      var f = infos[c], ci = null, ex = '';
      if (f.week && f.week !== ST.week) ex = 'أسبوع آخر — تم تجاهله';
      else if (real && f.dIdx >= 0) {
        for (var q = 0; q < per.length; q++) { if (per[q].dayIdx === f.dIdx && !usedCi[q]) { ci = q; break; } }
        if (ci === null) ex = 'لا توجد حصة لهذا الفصل في ذلك اليوم بالجدول';
      } else ci = c < ppw ? c : null;
      if (ci !== null) usedCi[ci] = true;
      tcols.push({ label: lblOf(c), ci: ci, note: colNote(f, ex) });
    }
  } else {
    var VT = /^(hw|assess|beh|ex1|ex2)$/, anyTyped = false, anyDated = false;
    for (var c1 = 0; c1 < n; c1++) {
      if (cols[c1] && VT.test(String(cols[c1].type || ''))) anyTyped = true;
      if (infos[c1].week) anyDated = true;
    }
    var seen = {};
    for (var c2 = 0; c2 < n; c2++) {
      var f2 = infos[c2], ty = cols[c2] && VT.test(String(cols[c2].type || '')) ? cols[c2].type : '';
      var tp, wk = f2.week || ST.week, ex2 = '';
      if (anyTyped) tp = ty || 'ignore';
      else if (anyDated) tp = ST.gdef.type;
      else tp = c2 === 0 ? ST.gdef.type : 'ignore';
      if (tp !== 'ignore') {
        var sk = /^ex/.test(tp) ? tp : tp + wk;
        if (seen[sk]) { tp = 'ignore'; ex2 = 'مكرر (نفس النوع والأسبوع)'; } else seen[sk] = true;
      }
      tcols.push({ label: lblOf(c2), type: tp, week: wk, note: colNote(f2, ex2) });
    }
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
    var dset = {};
    (Array.isArray(s.doubt) ? s.doubt : []).forEach(function (x) { var k = parseInt(x, 10); if (k >= 0 && k < n) dset[k] = true; });
    rows.push({ name: nm, no: s.no, idx: m.idx, conf: m.conf, cells: cells, doubt: dset, nameUnsure: s.name_unsure === true, cands: topCands(nm, arrS, m.idx), y: rowY(s), img: rowImg(s) });
  });
  if (!rows.length) throw new Error('BAD_JSON');
  ST.tbl = { cols: tcols, rows: rows };
  ST.rvf = (mode === 'att') ? 'abs' : 'all'; ST.rvKeep = {}; ST.colsOpen = undefined;
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
/* تصفية صفوف المراجعة: الغائبون فقط / تحتاج مراجعة / الكل */
function rowAbs(r) {
  return r.cells.some(function (c, j) { var col = ST.tbl.cols[j]; return c === 'absent' && col && col.ci !== null && col.ci !== undefined; });
}
function rowFlag(r) {
  if (r.idx < 0 || r.conf === 'mid' || r.nameUnsure || r._dup) return true;
  if (r.doubt && Object.keys(r.doubt).length) return true;
  var att = ST.mode === 'att';
  return r.cells.some(function (c, j) {
    var col = ST.tbl.cols[j]; if (!col) return false;
    if (att) return c === 'unknown' && col.ci !== null && col.ci !== undefined;
    if (col.type === 'ignore') return false;
    var key = keyOf(col.type, col.week); return !!(key && normVal(c, maxFor(key)).bad);
  });
}
function viewReviewTable() {
  var mode = ST.mode, att = mode === 'att';
  head(att ? 'مراجعة الغياب' : 'مراجعة الدرجات', true);
  var h = paneHtml();
  var unm = ST.tbl.rows.filter(function (r) { return r.idx < 0; }).length;
  h += '<div style="font-size:11px;color:#94a3b8;line-height:1.9;margin-bottom:8px;">قرأتُ <b style="color:#e2e8f0;">' + ST.tbl.rows.length + '</b> صفاً' + (unm ? ' — <span style="color:#fbbf24;">' + unm + ' لم يُطابَق مع طالب (اختره يدوياً أو اتركه)</span>' : '') + '.</div>';
  var arrR = DB.data[ST.cls] || [], cntIdx = {}, dupN = 0, doubtN = 0, unsureN = 0;
  ST.tbl.rows.forEach(function (r) { if (r.idx >= 0) cntIdx[r.idx] = (cntIdx[r.idx] || 0) + 1; });
  ST.tbl.rows.forEach(function (r) {
    r._dup = r.idx >= 0 && cntIdx[r.idx] > 1; if (r._dup) dupN++;
    if (r.nameUnsure) unsureN++;
    doubtN += Object.keys(r.doubt || {}).length;
  });
  var missingR = []; arrR.forEach(function (st, i) { if ((st.name || '').trim() && !cntIdx[i]) missingR.push((i + 1) + '. ' + String(st.name).trim()); });
  var notes = [];
  if (doubtN) notes.push('<span style="color:#fbbf24;">🟨 ' + doubtN + ' خانة غير مؤكدة القراءة (عليها إطار أصفر وعلامة ؟) — راجعها</span>');
  if (unsureN) notes.push('<span style="color:#fbbf24;">✍️ ' + unsureN + ' اسم غير واضح في الصورة</span>');
  if (dupN) notes.push('<span style="color:#c4b5fd;">🟪 ' + dupN + ' صف يشير لطالب مكرر — تأكد من الاختيار</span>');
  if (missingR.length) notes.push('<span style="color:#93c5fd;">👥 ' + missingR.length + ' طالباً من الفصل لم يظهروا في الصورة' + (missingR.length <= 6 ? ': ' + esc(missingR.join('، ')) : '') + '</span>');
  if (notes.length) h += '<div style="font-size:10px;line-height:1.9;margin-bottom:8px;background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:6px 8px;">' + notes.join('<br>') + '</div>';
  if (att) h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;font-size:11px;color:#94a3b8;">الأسبوع:<select style="' + SEL + '" onchange="DAI.setWeekRev(this.value)">' + weekOptions(ST.week) + '</select></div>';
  /* ربط الأعمدة */
  var colWarn = ST.tbl.cols.some(function (c) { return /راجع|خارج|لا توجد|مكرر|حدّد|تجاهل/.test(c.note || '') || (att && (c.ci === null || c.ci === undefined)); });
  var colsOpen = ST.colsOpen === undefined ? colWarn : ST.colsOpen;
  h += '<details ' + (colsOpen ? 'open ' : '') + 'ontoggle="DAI.colsOpen(this.open)" style="background:#0b1220;border:1px solid #1e293b;border-radius:10px;padding:8px;margin-bottom:10px;"><summary style="font-size:11px;color:#94a3b8;cursor:pointer;">ربط أعمدة الصورة بالتطبيق (' + ST.tbl.cols.length + ')' + (colWarn ? ' <span style="color:#fbbf24;">⚠️ تحتاج مراجعة</span>' : '') + '</summary><div style="margin-top:8px;">';
  ST.tbl.cols.forEach(function (c, j) {
    h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:wrap;"><span style="font-size:11px;color:#e2e8f0;min-width:78px;"><b>' + (j + 1) + '</b> · ' + esc(c.label) + '</span>' +
      (c.note ? '<span style="font-size:10px;line-height:1.7;width:100%;color:' + (/راجع|خارج|لا توجد|مكرر|حدّد|تجاهل/.test(c.note) ? '#fbbf24' : '#6ee7b7') + ';">📅 ' + esc(c.note) + '</span>' : '');
    if (att) h += '<select style="' + SEL + '" onchange="DAI.setColCi(' + j + ',this.value)">' + periodOptions(c.ci) + '</select>';
    else {
      h += '<select style="' + SEL + '" onchange="DAI.setColType(' + j + ',this.value)"><option value="ignore"' + (c.type === 'ignore' ? ' selected' : '') + '>تجاهل</option>' +
        TYPE_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === c.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
      if (c.type !== 'ignore' && !/^ex/.test(c.type)) h += '<select style="' + SEL + '" onchange="DAI.setColWeek(' + j + ',this.value)">' + weekOptions(c.week) + '</select>';
    }
    h += '</div>';
  });
  h += '</div></details>';
  /* خيارات */
  if (att) h += '<label style="display:block;font-size:11px;color:#cbd5e1;margin-bottom:8px;"><input type="checkbox" ' + (ST.opts.clearPresent ? 'checked' : '') + ' onchange="DAI.opt(\'clearPresent\',this.checked)"> إلغاء الغياب المسجَّل سابقاً لمن عُلِّم «حاضراً» في الصورة</label>';
  else h += '<label style="display:block;font-size:11px;color:#cbd5e1;margin-bottom:8px;"><input type="checkbox" ' + (ST.opts.skipExisting ? 'checked' : '') + ' onchange="DAI.opt(\'skipExisting\',this.checked)"> لا تستبدل الدرجات الموجودة (تعبئة الخانات الفارغة فقط)</label>';
  /* تبويبات التصفية */
  var nAbs = 0, nFlag = 0;
  ST.tbl.rows.forEach(function (r) { if (rowAbs(r)) nAbs++; if (rowFlag(r)) nFlag++; });
  var rvf = ST.rvf || (att ? 'abs' : 'all'); if (rvf === 'abs' && !nAbs) rvf = 'all';
  var tabBtn = function (k, label, n) {
    var on = rvf === k;
    return '<button onclick="DAI.rvFilter(\'' + k + '\')" style="' + BTN + 'flex:1;font-size:11px;padding:8px 6px;white-space:nowrap;border:1px solid ' + (on ? '#6366f1' : '#1e3a5f') + ';background:' + (on ? '#312e81' : '#111c33') + ';color:' + (on ? '#e0e7ff' : '#93c5fd') + ';">' + label + ' (' + n + ')</button>';
  };
  h += '<div style="display:flex;gap:6px;margin-bottom:8px;">' + (att ? tabBtn('abs', '🔴 الغائبون', nAbs) : '') + tabBtn('flag', '⚠️ تحتاج مراجعة', nFlag) + tabBtn('all', '📋 الكل', ST.tbl.rows.length) + '</div>' +
    '<div id="daiWarn"></div>';
  /* الصفوف */
  var arrS = DB.data[ST.cls] || [], shown = 0;
  ST.tbl.rows.forEach(function (r, i) {
    if (!(ST.rvKeep && ST.rvKeep[i]) && ((rvf === 'abs' && !rowAbs(r)) || (rvf === 'flag' && !rowFlag(r)))) return;
    shown++;
    var cc = r.idx < 0 ? '#7f1d1d' : (r._dup ? '#6d28d9' : (r.conf === 'mid' || r.nameUnsure ? '#b45309' : '#1e293b'));
    h += '<div style="border:1px solid ' + cc + ';border-radius:10px;padding:7px 8px;margin-bottom:6px;background:#0b1220;">' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;"><span style="font-size:10px;color:#64748b;min-width:70px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
      '<select style="' + SEL + 'flex:1;min-width:0;" onchange="DAI.setRowStu(' + i + ',this.value)">' + stuOptions(r.idx) + '</select></div>' + rowNote(r, i) + '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
    r.cells.forEach(function (cell, j) {
      var col = ST.tbl.cols[j];
      if (att) {
        var ign = (col.ci === null || col.ci === undefined);
        var clr = cell === 'absent' ? 'background:#7f1d1d;color:#fecaca;border:1px solid #dc2626;' : (cell === 'present' ? 'background:#064e3b;color:#a7f3d0;border:1px solid #059669;' : 'background:#422006;color:#fde68a;border:1px solid #d97706;');
        h += '<button onclick="DAI.mark(' + i + ',' + j + ')" style="' + BTN + clr + 'padding:4px 9px;font-size:11px;' + (ign ? 'opacity:.35;' : '') + (r.doubt && r.doubt[j] ? 'outline:2px solid #facc15;outline-offset:1px;' : '') + '">' + (j + 1) + ' ' + SYM[cell] + (r.doubt && r.doubt[j] ? ' ؟' : '') + '</button>';
      } else {
        var ign2 = col.type === 'ignore';
        var key = ign2 ? null : keyOf(col.type, col.week);
        var nv = key ? normVal(cell, maxFor(key)) : { skip: true };
        var bad = nv.bad ? 'border-color:#dc2626;' : '';
        if (!nv.bad && r.doubt && r.doubt[j]) bad = 'border-color:#facc15;box-shadow:0 0 0 2px rgba(250,204,21,.35);';
        var old = (r.idx >= 0 && key && arrS[r.idx]) ? arrS[r.idx][key] : '';
        h += '<div style="display:flex;flex-direction:column;align-items:center;' + (ign2 ? 'opacity:.35;' : '') + '"><span style="font-size:9px;color:#64748b;">' + (j + 1) + (key ? '/' + maxFor(key) : '') + (r.doubt && r.doubt[j] ? ' ؟' : '') + '</span>' +
          '<input value="' + esc(cell) + '" oninput="DAI.cell(' + i + ',' + j + ',this.value)" inputmode="decimal" style="' + SEL + 'width:52px;text-align:center;' + bad + '">' +
          (hasData(old) ? '<span style="font-size:9px;color:#fbbf24;">الحالي: ' + esc(fmtVal(old)) + '</span>' : '') + '</div>';
      }
    });
    h += '</div></div>';
  });
  if (!shown) h += '<div style="text-align:center;font-size:12px;color:#94a3b8;padding:18px 0;">' + (rvf === 'flag' ? '✅ لا توجد صفوف تحتاج مراجعة' : 'لا توجد صفوف هنا') + '</div>';
  h += '<div id="daiSum" style="position:sticky;bottom:-18px;background:#0f172a;padding:8px 0 4px;border-top:1px solid #1e293b;"></div>';
  box().innerHTML = h;
  paneBind();
  updateSummary();
}
function updateSummary() {
  var el = document.getElementById('daiSum'); if (!el || !ST || !ST.tbl) return;
  reviewSave();
  var plan = planFromTable(curTable());
  var n = plan.cells.length + plan.abs.length, t = '';
  if (ST.mode === 'att') {
    var add = plan.abs.filter(function (a) { return a.nu === 'abs'; }).length, del = plan.abs.length - add;
    t = 'سيُسجَّل <b style="color:#fca5a5;">' + add + '</b> غياب' + (del ? ' ويُلغى <b>' + del + '</b>' : '') + (plan.skipped ? ' · تُجوهل ' + plan.skipped + ' (مرض مسجَّل)' : '');
  } else {
    t = 'سيُرصد <b style="color:#a5b4fc;">' + plan.cells.length + '</b> درجة' + (plan.over ? ' <span style="color:#fbbf24;">(منها ' + plan.over + ' استبدال)</span>' : '') + (plan.skipped ? ' · تُجوهل ' + plan.skipped + ' (موجودة/غير صالحة)' : '');
  }
  /* الشريط الثابت: سطر واحد فقط (الملخص + زر التطبيق) ليبقى معظم الشاشة قابلاً للتمرير */
  el.innerHTML = '<div style="display:flex;gap:8px;align-items:center;"><div style="flex:1;min-width:0;font-size:11px;color:#cbd5e1;line-height:1.7;">' + t + '</div>' +
    btn(n ? '✅ تطبيق (' + n + ')' : 'لا يوجد ما يُطبَّق', 'DAI.applyTable()', PRIMARY + 'padding:11px 16px;white-space:nowrap;flex-shrink:0;' + (n ? '' : 'opacity:.45;'), n ? '' : 'disabled') + '</div>';
  /* التنبيهات تذهب لمنطقة عادية داخل الصفحة (قابلة للتمرير) */
  var wEl = document.getElementById('daiWarn');
  if (wEl) {
    var dd = {}, dn = 0, items = [];
    ST.tbl.rows.forEach(function (r) { if (r.idx >= 0) { if (dd[r.idx]) dn++; dd[r.idx] = 1; } });
    if (dn) items.push('🟪 ' + dn + ' صف يشير لطالب سبق اختياره — راجع الصفوف ذات الإطار البنفسجي');
    plan.warn.forEach(function (w) { items.push(esc(w)); });
    wEl.innerHTML = !items.length ? '' : (items.length <= 2
      ? '<div style="font-size:10px;color:#fbbf24;line-height:1.8;margin-bottom:8px;">' + items.join('<br>') + '</div>'
      : '<details style="margin-bottom:8px;font-size:10px;color:#fbbf24;"><summary style="cursor:pointer;">⚠️ ' + items.length + ' تنبيهات</summary><div style="line-height:1.8;margin-top:4px;">' + items.join('<br>') + '</div></details>');
  }
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
  var h = paneHtml() + '<div style="font-size:11px;color:#94a3b8;line-height:1.9;margin-bottom:6px;">عدّل الأسماء مباشرة (اسم في كل سطر). الفصل: <b style="color:#e2e8f0;">' + esc(ST.cls) + '</b> — فيه الآن ' + arr.filter(function (s) { return (s.name || '').trim(); }).length + ' اسماً.</div>' +
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
  paneBind();
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
  'انقل واجب الأسبوع 3 إلى الأسبوع 4 وأضف عليها درجتين',
  'أضف درجة لتقييم الأسبوع 3 لكل الطلاب',
  'اطرح درجة من سلوك الأسبوع 2 لكل الطلاب',
  'أضف 3 درجات لمن حصل على أقل من 5 في واجب الأسبوع 3',
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
    system: SYS_CMD, maxTokens: 4000, schema: SCH_CMD, tier: 'strong',
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
    var cap = c.cap === 'max' ? ' <span style="color:#fbbf24;font-size:9px;">⬆ الحد الأقصى</span>' : (c.cap === 'min' ? ' <span style="color:#fbbf24;font-size:9px;">⬇ صفر</span>' : '');
    h += row(esc(arr[c.idx] ? arr[c.idx].name : '?'), esc(labelFor(c.key)), '<span style="color:#64748b;text-decoration:line-through;">' + esc(fmtVal(c.old)) + '</span> ← <b>' + esc(fmtVal(c.nu)) + '</b>' + cap);
  });
  var ST_AR = { abs: 'غائب', sick: 'مريض', '': 'بدون' };
  plan.abs.forEach(function (a) {
    if (n++ >= 150) return;
    h += row(esc(arr[a.idx] ? arr[a.idx].name : '?'), 'غياب أسبوع ' + a.week + ' حصة ' + (a.ci + 1), '<span style="color:#64748b;">' + ST_AR[a.old || ''] + '</span> ← <b>' + ST_AR[a.nu || ''] + '</b>');
  });
  (plan.extra || []).forEach(function (e) { if (n++ < 150) h += row(esc(e.desc), '', ''); });
  var total = plan.add.length + plan.cells.length + plan.abs.length + (plan.extra || []).length;
  if (total > 150) h += '<div style="padding:6px 8px;font-size:10px;color:#64748b;">… و' + (total - 150) + ' تغييراً آخر</div>';
  return '<div style="border:1px solid #1e293b;border-radius:10px;background:#0b1220;max-height:46vh;overflow-y:auto;">' + (h || '<div style="padding:10px;font-size:11px;color:#94a3b8;">لا تغييرات.</div>') + '</div>';
}
function viewReviewPlan() {
  head('مراجعة التغييرات', true);
  var p = ST.cmd.plan, n = p.cells.length + p.abs.length + p.add.length + (p.extra || []).length;
  box().innerHTML =
    (ST.cmd.summary ? '<div style="font-size:12px;color:#e2e8f0;line-height:1.9;margin-bottom:6px;">🧾 ' + esc(ST.cmd.summary) + '</div>' : '') +
    (ST.cmd.clar ? '<div style="background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:10px;padding:9px;font-size:12px;line-height:1.9;margin-bottom:8px;">❓ ' + esc(ST.cmd.clar) + '</div>' : '') +
    (p.warn.length ? '<div style="font-size:10px;color:#fbbf24;line-height:1.8;margin-bottom:8px;">' + p.warn.map(esc).join('<br>') + '</div>' : '') +
    planTable(p, ST.cls) +
    (p.over ? '<div style="font-size:11px;color:#fbbf24;margin-top:6px;">⚠️ سيُستبدل ' + p.over + ' درجة موجودة.</div>' : '') +
    ((p.capped || p.floored) ? '<div style="font-size:11px;color:#fbbf24;margin-top:4px;line-height:1.8;">ℹ️ ' + (p.capped ? p.capped + ' درجة تجاوزت الحد فرُدّت إلى الدرجة القصوى' : '') + (p.capped && p.floored ? ' · ' : '') + (p.floored ? p.floored + ' درجة نزلت تحت الصفر فرُدّت إلى صفر' : '') + '.</div>' : '') +
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
    btn('عملية أخرى', "DAI.go('chat')", GHOST) + btn('إغلاق', 'DAI.close()', PRIMARY) + '</div></div>';
}
function doUndo(fromDone) {
  var u = undoLast();
  if (!u) return;
  if (typeof showSnack === 'function') showSnack('↩ تم التراجع عن: ' + u.label);
  if (fromDone) { ST.view = hasKey() ? 'chat' : 'home'; }
  render();
}


/* ══════════════════════════════════════════════════════════════════════
   📊 التقارير الذكية
   • الحساب كله محلي ودقيق (لا يخمّن الذكاء الاصطناعي أرقاماً ولا أسماء).
   • الذكاء الاصطناعي يحوّل «طلبك المكتوب» إلى معايير فقط (بدون أي بيانات طلاب).
   • الأزرار الجاهزة تعمل بدون مفتاح وبدون إنترنت.
   • صياغة التقرير الرسمي تُرسل إحصاءات مجمّعة فقط (بلا أسماء).
   ══════════════════════════════════════════════════════════════════════ */
var REP_FIELDS = [['hw', 'واجب'], ['assess', 'تقييم'], ['beh', 'سلوك'], ['ex1', 'اختبار 1'], ['ex2', 'اختبار 2']];
var REP_METRICS = [['total', 'المجموع الكلي'], ['avg_assess', 'متوسط التقييم'], ['avg_hw', 'متوسط الواجب'], ['avg_beh', 'متوسط السلوك'],
  ['exams', 'درجة الاختبارات'], ['cell', 'خانة محددة'], ['avg_range', 'متوسط خانات (نسبة)']];
var REP_OPS = [['lt', 'أقل من'], ['lte', 'أقل من أو يساوي'], ['gt', 'أكبر من'], ['gte', 'أكبر من أو يساوي'], ['between', 'بين'], ['none', 'بدون شرط (ترتيب فقط)']];
var OP_SYM = { lt: '<', lte: '≤', gt: '>', gte: '≥' };
var PASS_RAW = 60;   /* نفس معيار «ناجحون» في صفحة الإحصائيات */

function levelOf(p) { return p >= 90 ? 'ممتاز' : p >= 75 ? 'جيد جداً' : p >= 60 ? 'جيد' : p >= 50 ? 'مقبول' : 'ضعيف'; }
function r1(x) { return Math.round(x * 10) / 10; }
function fieldLbl(f) { var l = ''; REP_FIELDS.forEach(function (x) { if (x[0] === f) l = x[1]; }); return l || f; }
function namedStudents(cls) {
  var out = [];
  (DB.data[cls] || []).forEach(function (s, i) { if (s && (s.name || '').trim()) out.push({ s: s, i: i }); });
  return out;
}
function recorded(v) { return hasData(v) && v !== 'م'; }
function hasAnyGrade(s) {
  var aw = activeWeeks(), w, p;
  for (w = 1; w <= aw; w++) { if (recorded(s['a' + w]) || recorded(s['h' + w]) || recorded(s['bw' + w])) return true; }
  return recorded(s.ex1) || recorded(s.ex2);
}
function hasPrefix(s, pre) {
  var aw = activeWeeks();
  for (var w = 1; w <= aw; w++) if (recorded(s[pre + w])) return true;
  return false;
}

/* قيمة مقياس لطالب: {v,max,absent} أو null إن لا توجد بيانات */
function metricOf(s, cls, m) {
  var t = m.type, key, raw, n, w;
  if (s._totalAbsent) return null;
  if (t === 'cell') {
    key = keyOf(m.field, m.week); if (!key) return null;
    raw = s[key]; if (!recorded(raw)) return null;
    if (raw === 'غ') return { v: 0, max: maxFor(key), absent: true };
    n = Number(raw); return isNaN(n) ? null : { v: n, max: maxFor(key) };
  }
  if (t === 'avg_range') {
    var fr = Math.max(1, m.from || 1), to = Math.min(activeWeeks(), m.to || activeWeeks()), sum = 0, c = 0;
    for (w = fr; w <= to; w++) {
      key = keyOf(m.field, w); if (!key) continue;
      raw = s[key]; if (!recorded(raw)) continue;
      n = raw === 'غ' ? 0 : Number(raw); if (isNaN(n)) continue;
      sum += n / maxFor(key) * 100; c++;
    }
    return c ? { v: sum / c, max: 100 } : null;
  }
  if (!hasAnyGrade(s)) return null;
  var cs = calcStudent(s, cls);
  if (t === 'total') return { v: cs.total, max: recordedMax(cls) };
  if (t === 'avg_assess') return hasPrefix(s, 'a') ? { v: cs.avgAssess, max: maxFor('a1') } : null;
  if (t === 'avg_hw') return hasPrefix(s, 'h') ? { v: cs.avgHw, max: maxFor('h1') } : null;
  if (t === 'avg_beh') return (cs.avgBeh === '—' || !hasPrefix(s, 'bw')) ? null : { v: Number(cs.avgBeh), max: maxFor('bw1') };
  if (t === 'exams') return (recorded(s.ex1) || recorded(s.ex2)) ? { v: cs.exTotal, max: 30 } : null;
  return null;
}
function cmpOp(op, x, a, b) {
  if (op === 'lt') return x < a;
  if (op === 'lte') return x <= a;
  if (op === 'gt') return x > a;
  if (op === 'gte') return x >= a;
  if (op === 'between') return x >= Math.min(a, b) && x <= Math.max(a, b);
  return true;
}

/* ═════ تنظيف/اعتماد المعايير (من الذكاء أو من النماذج) ═════ */
function normSpec(r) {
  r = r || {};
  var kinds = ['missing', 'score', 'absences', 'summary', 'student'], aw = activeWeeks(), all = DB.classes || [];
  var sp = { kind: kinds.indexOf(r.kind) >= 0 ? r.kind : 'score', title: String(r.title || '').slice(0, 100) };
  if (r.classes === 'all') sp.classes = all.slice();
  else if (Array.isArray(r.classes)) sp.classes = r.classes.filter(function (c) { return all.indexOf(c) >= 0; });
  if (!sp.classes || !sp.classes.length) sp.classes = ST && ST.repAll ? all.slice() : [ST ? ST.cls : all[0]];
  var wk = function (v, d) { v = parseInt(v, 10); return v >= 1 ? Math.min(v, aw) : d; };
  var dw = ST ? ST.week : 1;
  sp.from = wk(r.from, sp.kind === 'absences' ? 1 : dw);
  sp.to = wk(r.to, sp.kind === 'absences' ? aw : sp.from);
  if (sp.to < sp.from) { var t = sp.from; sp.from = sp.to; sp.to = t; }
  if (sp.kind === 'missing') {
    var okF = REP_FIELDS.map(function (x) { return x[0]; });
    sp.fields = (Array.isArray(r.fields) ? r.fields : []).filter(function (f) { return okF.indexOf(f) >= 0; });
    if (!sp.fields.length) sp.fields = ['hw', 'assess', 'beh'];
    sp.match = r.match === 'all' ? 'all' : 'any';
  } else if (sp.kind === 'score') {
    var mt = REP_METRICS.map(function (x) { return x[0]; });
    var metric = (r.metric && typeof r.metric === 'object') ? r.metric.type : r.metric;
    sp.metric = { type: mt.indexOf(metric) >= 0 ? metric : 'total', field: 'hw', week: wk(r.week, dw), from: sp.from, to: sp.to };
    var mf = (r.metric && r.metric.field) || r.field;
    if (['hw', 'assess', 'beh', 'ex1', 'ex2'].indexOf(mf) >= 0) sp.metric.field = mf;
    sp.op = REP_OPS.some(function (o) { return o[0] === r.op; }) ? r.op : 'lt';
    sp.value = isFinite(parseFloat(r.value)) ? parseFloat(r.value) : 50;
    sp.value2 = isFinite(parseFloat(r.value2)) ? parseFloat(r.value2) : 100;
    sp.unit = r.unit === 'raw' ? 'raw' : 'percent';
    if (sp.metric.type === 'avg_range') sp.unit = 'percent';
    sp.order = r.order === 'asc' || r.order === 'desc' ? r.order : ((sp.op === 'lt' || sp.op === 'lte') ? 'asc' : 'desc');
    sp.n = Math.max(0, Math.min(500, parseInt(r.n, 10) || 0));
  } else if (sp.kind === 'absences') {
    sp.min = Math.max(0, parseInt(r.min, 10)); if (isNaN(sp.min)) sp.min = 3;
  } else if (sp.kind === 'student') {
    sp.student = String(r.student || r.name || '').slice(0, 60);
  }
  return sp;
}

function criteriaText(sp) {
  var cl = sp.classes.length === (DB.classes || []).length && sp.classes.length > 1 ? 'كل الفصول' : sp.classes.join('، ');
  var wk = sp.from === sp.to ? 'الأسبوع ' + sp.from : 'الأسابيع ' + sp.from + ' إلى ' + sp.to;
  if (sp.kind === 'missing') return 'الفصول: ' + cl + ' — الخانات: ' + sp.fields.map(fieldLbl).join('، ') + ' — ' + wk + ' — الشرط: ناقص في ' + (sp.match === 'all' ? 'كل الخانات' : 'أي خانة');
  if (sp.kind === 'absences') return 'الفصول: ' + cl + ' — ' + wk + ' — الشرط: غياب ≥ ' + sp.min;
  if (sp.kind === 'summary') return 'الفصول: ' + cl;
  if (sp.kind === 'student') return 'الفصول: ' + cl + ' — الطالب: ' + (sp.student || '—');
  var mname = ''; REP_METRICS.forEach(function (x) { if (x[0] === sp.metric.type) mname = x[1]; });
  if (sp.metric.type === 'cell') mname += ' (' + fieldLbl(sp.metric.field) + (/^ex/.test(sp.metric.field) ? '' : ' أسبوع ' + sp.metric.week) + ')';
  if (sp.metric.type === 'avg_range') mname += ' (' + fieldLbl(sp.metric.field) + ' — ' + wk + ')';
  var u = sp.unit === 'raw' ? ' درجة' : '٪';
  var cond = sp.op === 'none' ? 'ترتيب فقط' : (sp.op === 'between' ? 'بين ' + sp.value + ' و' + sp.value2 + u : OP_SYM[sp.op] + ' ' + sp.value + u);
  return 'الفصول: ' + cl + ' — المقياس: ' + mname + ' — الشرط: ' + cond + (sp.n ? ' — أول ' + sp.n : '');
}


/* ═════ مستوى طالب معيّن ═════ */
function studentNameScore(q, name) {
  var qn = normAr(q), nn = normAr(name);
  if (!qn || !nn) return 0;
  var qt = qn.split(' ').filter(Boolean), nt = nn.split(' ').filter(Boolean);
  var all = qt.every(function (x) { return nt.some(function (y) { return y === x || (x.length >= 2 && y.indexOf(x) === 0); }); });
  if (all) return nn === qn ? 1 : 0.95;
  return nameSim(q, name);
}
function absCountOf(cls, s) {
  var ab = (DB.absences && DB.absences[cls] && DB.absences[cls][s.id]) || {}, a = 0, sk = 0, aw = activeWeeks();
  Object.keys(ab).forEach(function (k) {
    var m = /^w(\d+)_ci\d+$/.exec(k); if (!m) return;
    var w = parseInt(m[1], 10); if (w < 1 || w > aw) return;
    if (ab[k] === 'abs') a++; else if (ab[k] === 'sick') sk++;
  });
  return { a: a, sk: sk };
}
function weekPctOf(s, w) {
  var sum = 0, c = 0;
  ['assess', 'hw', 'beh'].forEach(function (f) {
    var key = keyOf(f, w); if (!key) return;
    var raw = s[key]; if (!recorded(raw)) return;
    var n = raw === 'غ' ? 0 : Number(raw); if (isNaN(n)) return;
    sum += n / maxFor(key) * 100; c++;
  });
  return c ? sum / c : null;
}
function studentTrend(s) {
  var pts = [], aw = activeWeeks(), w, p;
  for (w = 1; w <= aw; w++) { p = weekPctOf(s, w); if (p !== null) pts.push(p); }
  if (pts.length < 4) return { txt: pts.length ? 'بيانات قليلة (' + pts.length + ' أسبوع مرصود)' : '—', dir: 0, n: pts.length };
  var h = Math.floor(pts.length / 2);
  var avg = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
  var d = avg(pts.slice(pts.length - h)) - avg(pts.slice(0, h));
  return { txt: d >= 5 ? 'تحسّن (+' + r1(d) + '٪)' : d <= -5 ? 'تراجع (' + r1(d) + '٪)' : 'مستقر', dir: d >= 5 ? 1 : d <= -5 ? -1 : 0, n: pts.length };
}
function relTxt(p, avgP) {
  if (avgP === null || avgP === undefined) return '';
  var d = p - avgP;
  return d >= 5 ? 'أعلى من متوسط الفصل' : d <= -5 ? 'أقل من متوسط الفصل' : 'قريب من متوسط الفصل';
}
function runStudentReport(sp, res) {
  var comps = [['total', 'المجموع الكلي', { type: 'total' }], ['avg_assess', 'متوسط التقييم', { type: 'avg_assess' }],
    ['avg_hw', 'متوسط الواجب', { type: 'avg_hw' }], ['avg_beh', 'متوسط السلوك', { type: 'avg_beh' }], ['exams', 'الاختبارات', { type: 'exams' }]];
  res.title = res.title || 'مستوى الطالب';
  res.head = ['الطالب', 'البند', 'درجته', 'متوسط الفصل', 'التقدير'];
  var found = [];
  sp.classes.forEach(function (cls) {
    namedStudents(cls).forEach(function (e) {
      var sc = studentNameScore(sp.student, e.s.name);
      if (sc >= 0.6) found.push({ cls: cls, e: e, sc: sc });
    });
  });
  found.sort(function (a, b) { return b.sc - a.sc; });
  var total = found.length;
  if (total) { var top = found[0].sc; found = found.filter(function (f) { return f.sc >= Math.max(0.6, top - 0.15); }); }
  var shown = found.slice(0, 4);
  res.agg.matches = total;
  if (!shown.length) {
    res.foot.push('لم يُعثر على طالب بهذا الاسم. تأكد من كتابة الاسم أو اختر الفصل الصحيح.');
    res.agg.found = false; res.agg.considered = 0; return 0;
  }
  var multi = sp.classes.length > 1;
  shown.forEach(function (f, fi) {
    var s = f.e.s, cls = f.cls, label = s.name + (multi ? ' (' + cls + ')' : '');
    var list = namedStudents(cls);
    if (!hasAnyGrade(s) || s._totalAbsent) {
      res.data.push([label, 'لا توجد درجات مرصودة لهذا الطالب بعد', '—', '—', '—']);
      return;
    }
    var stats = {};
    comps.forEach(function (c) {
      var mine = metricOf(s, cls, c[2]), pcts = [];
      list.forEach(function (o) { var m = metricOf(o.s, cls, c[2]); if (m && m.max) pcts.push(m.v / m.max * 100); });
      var avgP = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : null;
      stats[c[0]] = { m: mine, avgP: avgP, pcts: pcts, pct: mine && mine.max ? mine.v / mine.max * 100 : null };
    });
    comps.forEach(function (c) {
      var st = stats[c[0]];
      if (!st.m) { res.data.push([label, c[1], 'لم يُرصد', st.avgP === null ? '—' : r1(st.avgP) + '٪', '—']); return; }
      var note = levelOf(st.pct) + (st.avgP === null ? '' : ' — ' + relTxt(st.pct, st.avgP));
      if (c[0] === 'total') {
        var rank = 1 + st.pcts.filter(function (x) { return x > st.pct + 1e-9; }).length;
        note += ' — الترتيب ' + rank + ' من ' + st.pcts.length;
        stats.rank = rank; stats.of = st.pcts.length;
      }
      res.data.push([label, c[1], r1(st.m.v) + '/' + r1(st.m.max) + ' (' + r1(st.pct) + '٪)', st.avgP === null ? '—' : r1(st.avgP) + '٪', note]);
    });
    var ab = absCountOf(cls, s), abAll = list.map(function (o) { var x = absCountOf(cls, o.s); return x.a; });
    var abAvg = abAll.length ? abAll.reduce(function (a, b) { return a + b; }, 0) / abAll.length : 0;
    res.data.push([label, 'الغياب', ab.a + ' فترة' + (ab.sk ? ' (+ مرض ' + ab.sk + ')' : ''), r1(abAvg) + ' فترة', ab.a > abAvg + 2 ? 'غيابه أكثر من المعتاد' : 'عادي']);
    var tr = studentTrend(s);
    res.data.push([label, 'الاتجاه خلال الأسابيع', tr.txt, '—', tr.dir > 0 ? 'يتحسن' : tr.dir < 0 ? 'يحتاج متابعة' : '—']);
    /* درجات كل أسبوع: تقييم / واجب / سلوك */
    var aw2 = activeWeeks(), wl = [['assess', 'تقييم'], ['hw', 'واجب'], ['beh', 'سلوك']];
    for (var wk = 1; wk <= aw2; wk++) {
      var any = false, cellsTxt = wl.map(function (f) {
        var key = keyOf(f[0], wk), raw = key ? s[key] : undefined;
        if (!recorded(raw)) return f[1] + ' —';
        any = true;
        return f[1] + ' ' + (raw === 'غ' ? 'غائب' : raw + '/' + maxFor(key));
      });
      if (!any) continue;
      var wp = weekPctOf(s, wk), cps = [];
      list.forEach(function (o) { var x = weekPctOf(o.s, wk); if (x !== null) cps.push(x); });
      var cAvg = cps.length ? cps.reduce(function (a, b) { return a + b; }, 0) / cps.length : null;
      res.data.push([label, 'أسبوع ' + wk, cellsTxt.join(' • '), cAvg === null ? '—' : r1(cAvg) + '٪', wp === null ? '—' : levelOf(wp) + ' (' + r1(wp) + '٪)']);
    }
    if (fi === 0) {
      var parts = ['avg_assess', 'avg_hw', 'avg_beh'].filter(function (k) { return stats[k].pct !== null; });
      var strong = null, weak = null;
      parts.forEach(function (k) {
        if (!strong || stats[k].pct > stats[strong].pct) strong = k;
        if (!weak || stats[k].pct < stats[weak].pct) weak = k;
      });
      var nm = { avg_assess: 'التقييم', avg_hw: 'الواجب', avg_beh: 'السلوك' };
      var t = stats.total;
      res.agg.found = true; res.agg.recordedMax = recordedMax(cls);
      if (t && t.m) { res.agg.totalPct = r1(t.pct); res.agg.level = levelOf(t.pct); res.agg.classAvgPct = t.avgP === null ? null : r1(t.avgP); res.agg.rank = stats.rank; res.agg.of = stats.of; }
      if (parts.length > 1 && strong !== weak) { res.agg.strongest = nm[strong]; res.agg.weakest = nm[weak]; res.foot.push('أقوى بند: ' + nm[strong] + ' (' + r1(stats[strong].pct) + '٪) — أضعف بند: ' + nm[weak] + ' (' + r1(stats[weak].pct) + '٪).'); }
      res.agg.absences = ab.a; res.agg.trend = tr.txt;
      res.foot.push('المستوى محسوب على ما رُصد حتى الآن (الدرجة العظمى المرصودة ' + recordedMax(cls) + ').');
    }
  });
  if (total > shown.length || found.length > 1) res.foot.push('تطابق أكثر من طالب مع هذا الاسم — اكتب الاسم كاملاً لتحديد الطالب.');
  return shown.length;
}

/* ═════ المحرك ═════ */
function runReport(sp) {
  var multi = sp.classes.length > 1, res = { kind: sp.kind, title: sp.title || '', criteria: criteriaText(sp), head: [], data: [], foot: [], agg: { kind: sp.kind, classes: sp.classes.slice() } };
  var considered = 0;
  if (sp.kind === 'student') {
    considered = runStudentReport(sp, res);
  } else if (sp.kind === 'missing') {
    var cells = [];
    sp.fields.forEach(function (f) {
      if (f === 'ex1' || f === 'ex2') cells.push({ key: f, lbl: fieldLbl(f) });
      else for (var w = sp.from; w <= sp.to; w++) { var k = keyOf(f, w); if (k) cells.push({ key: k, lbl: fieldLbl(f) + ' ' + w }); }
    });
    cells = cells.slice(0, 300);
    res.title = res.title || 'الطلاب الذين لم تُرصد درجاتهم';
    res.head = ['م', 'الاسم'].concat(multi ? ['الفصل'] : []).concat(['عدد الخانات الناقصة', 'الخانات الناقصة']);
    var rows = [];
    sp.classes.forEach(function (cls) {
      namedStudents(cls).forEach(function (e) {
        considered++;
        var miss = cells.filter(function (c) { return !hasData(e.s[c.key]); });
        if (!miss.length || (sp.match === 'all' && miss.length !== cells.length)) return;
        var txt = miss.slice(0, 8).map(function (c) { return c.lbl; }).join('، ') + (miss.length > 8 ? ' …' : '');
        rows.push({ cls: cls, no: e.i + 1, name: e.s.name, n: miss.length, txt: txt });
      });
    });
    rows.sort(function (a, b) { return b.n - a.n; });
    rows.forEach(function (r, i) { res.data.push([i + 1, r.name].concat(multi ? [r.cls] : []).concat([r.n, r.txt])); });
    res.foot.push('عدد الخانات المفحوصة لكل طالب: ' + cells.length);
    res.agg.cellsChecked = cells.length;
  } else if (sp.kind === 'absences') {
    res.title = res.title || 'تقرير الغياب';
    res.head = ['م', 'الاسم'].concat(multi ? ['الفصل'] : []).concat(['فترات الغياب', 'فترات المرض']);
    var arows = [];
    sp.classes.forEach(function (cls) {
      namedStudents(cls).forEach(function (e) {
        considered++;
        var ab = (DB.absences && DB.absences[cls] && DB.absences[cls][e.s.id]) || {}, a = 0, sk = 0;
        Object.keys(ab).forEach(function (k) {
          var m = /^w(\d+)_ci\d+$/.exec(k); if (!m) return;
          var w = parseInt(m[1], 10); if (w < sp.from || w > sp.to) return;
          if (ab[k] === 'abs') a++; else if (ab[k] === 'sick') sk++;
        });
        if (a >= sp.min && (a > 0 || sp.min === 0)) arows.push({ cls: cls, name: e.s.name, a: a, sk: sk });
      });
    });
    arows.sort(function (x, y) { return y.a - x.a; });
    arows.forEach(function (r, i) { res.data.push([i + 1, r.name].concat(multi ? [r.cls] : []).concat([r.a, r.sk])); });
  } else if (sp.kind === 'summary') {
    res.title = res.title || 'ملخص الفصول';
    res.head = ['الفصل', 'الطلاب', 'المتوسط', 'الأعلى', 'الأدنى', 'متفوقون (٨٥٪+)', 'ناجحون (≥' + PASS_RAW + ')', 'ضعاف (<٥٠٪)', 'بلا درجات'];
    var tmax = totalMax(), tot = { n: 0, sum: 0, c: 0, top: 0, pass: 0, weak: 0, none: 0 };
    sp.classes.forEach(function (cls) {
      var tmax = recordedMax(cls);
      var list = namedStudents(cls), vals = [], none = 0;
      list.forEach(function (e) { var m = metricOf(e.s, cls, { type: 'total' }); if (m) vals.push(m.v); else none++; });
      var sum = vals.reduce(function (a, b) { return a + b; }, 0);
      var top = vals.filter(function (v) { return v / tmax * 100 >= 85; }).length;
      var pass = vals.filter(function (v) { return v >= PASS_RAW; }).length;
      var weak = vals.filter(function (v) { return v / tmax * 100 < 50; }).length;
      res.data.push([cls, list.length, vals.length ? r1(sum / vals.length) + '/' + tmax : '—', vals.length ? Math.max.apply(null, vals) : '—', vals.length ? Math.min.apply(null, vals) : '—', top, pass, weak, none]);
      tot.n += list.length; tot.sum += sum; tot.c += vals.length; tot.top += top; tot.pass += pass; tot.weak += weak; tot.none += none;
    });
    if (sp.classes.length > 1) res.data.push(['الإجمالي', tot.n, tot.c ? r1(tot.sum / tot.c) + '/' + tmax : '—', '', '', tot.top, tot.pass, tot.weak, tot.none]);
    res.agg.totals = tot; considered = tot.n;
    res.listed = res.data.length;
  } else {
    /* score */
    var m = sp.metric, srows = [], skipped = 0;
    res.title = res.title || (sp.op === 'lt' || sp.op === 'lte' ? 'تقرير الطلاب الأقل درجات' : 'تقرير الطلاب الأعلى درجات');
    res.head = ['م', 'الاسم'].concat(multi ? ['الفصل'] : []).concat(['الدرجة', 'النسبة', 'المستوى']);
    sp.classes.forEach(function (cls) {
      namedStudents(cls).forEach(function (e) {
        considered++;
        var r = metricOf(e.s, cls, m);
        if (!r) { skipped++; return; }
        var pct = r.max ? r.v / r.max * 100 : 0, x = sp.unit === 'raw' ? r.v : pct;
        if (!cmpOp(sp.op, x, sp.value, sp.value2)) return;
        srows.push({ cls: cls, name: e.s.name, v: r.v, max: r.max, pct: pct, absent: r.absent });
      });
    });
    srows.sort(function (a, b) { return sp.order === 'asc' ? a.pct - b.pct : b.pct - a.pct; });
    if (sp.n) srows = srows.slice(0, sp.n);
    srows.forEach(function (r, i) {
      res.data.push([i + 1, r.name].concat(multi ? [r.cls] : []).concat([r.absent ? 'غائب' : (r1(r.v) + '/' + r1(r.max)), r1(r.pct) + '٪', levelOf(r.pct)]));
    });
    if (skipped) res.foot.push('لم يُحتسب ' + skipped + ' طالباً لعدم وجود درجات مرصودة لهم في هذا المقياس.');
    if (srows.length) {
      var ps = srows.map(function (r) { return r.pct; });
      res.agg.avgPct = r1(ps.reduce(function (a, b) { return a + b; }, 0) / ps.length);
      res.agg.minPct = r1(Math.min.apply(null, ps)); res.agg.maxPct = r1(Math.max.apply(null, ps));
    }
    res.agg.noData = skipped;
  }
  res.listed = res.data.length;
  res.agg.considered = considered;
  res.agg.listed = sp.kind === 'summary' ? sp.classes.length : res.data.length;
  res.agg.criteria = res.criteria;
  res.agg.title = res.title;
  return res;
}

/* ═════ التصدير ═════ */
function repText(res) {
  var L = [res.title, res.criteria, ''];
  if (res.kind === 'summary') res.data.forEach(function (r) { L.push(r.join(' | ')); });
  else res.data.forEach(function (r) { L.push(r.join(' — ')); });
  L.push('', 'العدد: ' + res.listed);
  res.foot.forEach(function (f) { L.push(f); });
  return L.join('\n');
}
function copyTextToClipboard(txt) {
  var done = function () { if (typeof showSnack === 'function') showSnack('✅ تم نسخ التقرير'); };
  var fallback = function () {
    try {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0;top:0;';
      document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove();
      if (ok) { done(); return; }
    } catch (e) {}
    prompt('انسخ النص من هنا:', txt);
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done).catch(fallback); return; }
  } catch (e) {}
  fallback();
}
function repExcel(res) {
  if (typeof XLSX === 'undefined') { if (typeof showSnack === 'function') showSnack('⚠️ مكتبة Excel غير محمّلة — افتح التطبيق مرة بالإنترنت'); return; }
  var aoa = [[res.title], [res.criteria], [], res.head].concat(res.data);
  res.foot.forEach(function (f) { aoa.push([f]); });
  var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = res.head.map(function (h, i) { return { wch: i === 1 ? 28 : (i === res.head.length - 1 && res.kind === 'missing' ? 40 : 14) }; });
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير');
  XLSX.writeFile(wb, ('تقرير_' + (res.title || 'دفتري')).replace(/[\\\/:*?"<>|\s]+/g, '_').slice(0, 60) + '.xlsx');
}
function repPrint(res, writeup) {
  var th = res.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
  var tr = res.data.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
  var html = '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + esc(res.title) + '</title><style>' +
    '@page{size:A4;margin:12mm}html,body{background:#fff}body{font-family:Cairo,Tahoma,Arial,sans-serif;color:#111}h2{margin:0 0 4px;font-size:18px}.c{color:#555;font-size:12px;margin-bottom:10px}' +
    'table{border-collapse:collapse;width:100%}td,th{border:1px solid #555;padding:4px 6px;font-size:12px;text-align:center;background:#fff;color:#111}th{background:#e5e7eb}td:nth-child(2){text-align:right}' +
    '.f{font-size:11px;color:#444;margin-top:8px}.w{margin:10px 0;font-size:13px;line-height:1.9;white-space:pre-wrap}</style></head><body>' +
    '<h2>' + esc(res.title) + '</h2><div class="c">' + esc(res.criteria) + ' — ' + esc(new Date().toLocaleDateString('ar-EG')) + '</div>' +
    (writeup ? '<div class="w">' + esc(writeup) + '</div>' : '') +
    '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>' +
    '<div class="f">العدد: ' + res.listed + (res.foot.length ? ' — ' + esc(res.foot.join(' ')) : '') + '</div></body></html>';
  /* الإصلاح: الـ iframe بحجم 0×0 كان يطبع صفحة فارغة (خصوصاً على الموبايل).
     الآن تُعرض معاينة حقيقية بحجم كامل مع زر «حفظ PDF» يطبع من داخلها. */
  try { var old = document.getElementById('daiPrintOv'); if (old) old.remove(); } catch (e) {}
  var ov = document.createElement('div');
  ov.id = 'daiPrintOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0b1220;display:flex;flex-direction:column;direction:rtl;font-family:Cairo,Tahoma,Arial,sans-serif;';
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;align-items:center;padding:10px;background:#111c33;border-bottom:1px solid #1e3a5f;flex-shrink:0;';
  var bPrint = document.createElement('button');
  bPrint.textContent = '📄 حفظ PDF / طباعة';
  bPrint.style.cssText = 'flex:1;padding:11px;border:0;border-radius:10px;background:#6366f1;color:#fff;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;';
  var bClose = document.createElement('button');
  bClose.textContent = '✕ إغلاق';
  bClose.style.cssText = 'padding:11px 16px;border:1px solid #475569;border-radius:10px;background:#1e293b;color:#e2e8f0;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;';
  bar.appendChild(bPrint); bar.appendChild(bClose);
  var fr = document.createElement('iframe');
  fr.style.cssText = 'flex:1;width:100%;border:0;background:#fff;';
  ov.appendChild(bar); ov.appendChild(fr);
  document.body.appendChild(ov);
  bClose.onclick = function () { try { ov.remove(); } catch (e) {} };
  var doPrint = function () {
    try { fr.contentWindow.focus(); fr.contentWindow.print(); }
    catch (e) { if (typeof showSnack === 'function') showSnack('⚠️ تعذّرت الطباعة — جرّب من متصفح Chrome'); }
  };
  bPrint.onclick = doPrint;
  var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
}

/* ═════ الواجهة ═════ */
var SYS_REP = 'You turn a teacher\'s Arabic request for a class report into a JSON report spec for a school gradebook app. You never see student data. ' +
  'Output ONE JSON object only (no markdown): {"kind":"missing|score|absences|summary|student","title":"short Arabic title","classes":"selected"|"all"|["class name"],' +
  '"fields":["hw","assess","beh","ex1","ex2"],"from":1,"to":1,"match":"any|all","metric":"total|avg_assess|avg_hw|avg_beh|exams|cell|avg_range","field":"hw","week":3,' +
  '"student":"student name as written","op":"lt|lte|gt|gte|between|none","value":50,"value2":100,"unit":"percent|raw","order":"asc|desc","n":0,"min":3,"clarification":""}. Include only keys relevant to the kind.\n' +
  'Rules:\n- missing = students whose grade cells are EMPTY (not recorded) in given fields (hw=الواجب, assess=التقييم, beh=السلوك, ex1/ex2=الاختبارات) for weeks from..to. match "any" unless the teacher says all.\n' +
  '- score = filter/rank students by a metric. "ضعاف/متعثرون/ضعيف" => metric total, op lt, value 50, unit percent, order asc. "متفوقون/متميزون/الأوائل" => op gte, value 85, unit percent, order desc. ' +
  '"ناجحون" => total gte 60 unit raw; "راسبون" => total lt 60 unit raw. If a number is given ("أقل من 5 في واجب أسبوع 3") use metric cell with field/week, unit raw. "أعلى 10 طلاب" => op none, order desc, n 10. "أضعف 5" => op none, order asc, n 5.\n' +
  '- absences = students with many absences in weeks from..to (default all weeks); min = minimum absence periods.\n- summary = general overview of classes.\n- student = the level/status of ONE named student ("ما مستوى الطالب أحمد؟", "وضع محمد علي"); put the name in student.\n' +
  '- classes: "selected" unless the teacher mentions all classes ("كل الفصول") => "all", or names specific classes from the list.\n' +
  '- weeks default to the current week for missing; for absences default all weeks.\n- If the request cannot be understood as a report, set clarification in Arabic.';

function repContext() {
  return 'Classes: ' + (DB.classes || []).join(' | ') + '\nSelected class: ' + ST.cls + '\nCurrent week: ' + ST.week + ' (active weeks 1..' + activeWeeks() + ')\n' +
    'Max values: total ' + totalMax() + ', assess ' + maxFor('a1') + ', hw ' + maxFor('h1') + ', beh ' + maxFor('bw1') + ', exams 30.';
}
var REP_EXAMPLES = [
  'الطلاب الذين لم ترصد درجاتهم في واجب الأسبوع الحالي',
  'أضعف 10 طلاب في المجموع',
  'المتفوقون في كل الفصول',
  'من حصل على أقل من 5 في تقييم الأسبوع 3؟',
  'الطلاب الذين غابوا أكثر من 4 فترات',
  'ما مستوى الطالب أحمد محمد؟'
];

function viewRep() {
  head('📊 التقارير', true);
  var hk = hasKey();
  var chips = ST.presets.map(function (p, i) {
    return '<button onclick="DAI.repPreset(' + i + ')" style="' + BTN + 'background:#111c33;border:1px solid #1e3a5f;color:#e2e8f0;font-size:11px;padding:8px 10px;">' + p.t + '</button>';
  }).join('');
  box().innerHTML =
    '<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;font-size:11px;color:#94a3b8;flex-wrap:wrap;">الفصل:' +
    '<select style="' + SEL + '" onchange="DAI.repScope(this.value)"><option value="__all__"' + (ST.repAll ? ' selected' : '') + '>كل الفصول</option>' +
    (DB.classes || []).map(function (c) { return '<option value="' + esc(c) + '"' + (!ST.repAll && c === ST.cls ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    'الأسبوع:<select style="' + SEL + '" onchange="DAI.setWeekQuiet(this.value)">' + weekOptions(ST.week) + '</select></div>' +
    '<div style="font-size:11px;color:#6ee7b7;margin-bottom:6px;">⚡ تقارير جاهزة (تعمل بدون مفتاح وبدون إنترنت):</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">' + chips + '</div>' +
    '<div style="font-size:11px;color:#a5b4fc;margin-bottom:6px;">💬 أو اكتب طلبك بالعربية:</div>' +
    '<textarea id="daiRepTxt" rows="3" placeholder="مثال: الطلاب الذين لم ترصد درجاتهم في تقييم الأسبوع 4" oninput="DAI.repText(this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;resize:vertical;line-height:1.8;font-size:13px;">' + esc(ST.repTxt || '') + '</textarea>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 10px;">' + REP_EXAMPLES.map(function (e, i) {
      return '<button onclick="DAI.repExample(' + i + ')" style="' + BTN + 'background:#111c33;border:1px solid #1e3a5f;color:#93c5fd;font-size:10px;padding:5px 9px;font-weight:600;text-align:right;">' + esc(e) + '</button>';
    }).join('') + '</div>' +
    (ST.repClar ? '<div style="background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:10px;padding:9px;font-size:12px;line-height:1.9;margin-bottom:8px;">❓ ' + esc(ST.repClar) + '</div>' : '') +
    (ST.err ? '<div style="color:#fca5a5;font-size:11px;line-height:1.8;margin-bottom:8px;">❌ ' + esc(ST.err) + '</div>' : '') +
    btn('🔍 حلّل طلبي' + (hk ? '' : ' (يحتاج مفتاحاً من ⚙️)'), 'DAI.repAnalyze()', PRIMARY + 'width:100%;' + (hk ? '' : 'opacity:.55;'));
}

function repScopeClasses() { return ST.repAll ? (DB.classes || []).slice() : [ST.cls]; }
function buildPresets() {
  var aw = activeWeeks();
  return [
    { t: '🔴 الضعاف (أقل من ٥٠٪)', s: function () { return { kind: 'score', title: 'الطلاب الضعاف', metric: 'total', op: 'lt', value: 50, unit: 'percent', order: 'asc' }; } },
    { t: '🟢 المتفوقون (٨٥٪ فأكثر)', s: function () { return { kind: 'score', title: 'الطلاب المتفوقون', metric: 'total', op: 'gte', value: 85, unit: 'percent', order: 'desc' }; } },
    { t: '📭 لم يُرصد الواجب', s: function () { return { kind: 'missing', title: 'لم تُرصد درجات الواجب', fields: ['hw'] }; } },
    { t: '📭 لم يُرصد التقييم', s: function () { return { kind: 'missing', title: 'لم تُرصد درجات التقييم', fields: ['assess'] }; } },
    { t: '📭 لم يُرصد السلوك', s: function () { return { kind: 'missing', title: 'لم تُرصد درجات السلوك', fields: ['beh'] }; } },
    { t: '📭 ناقص في الثلاثة', s: function () { return { kind: 'missing', title: 'الطلاب الذين لم تكتمل درجاتهم', fields: ['hw', 'assess', 'beh'] }; } },
    { t: '🚫 الأكثر غياباً', s: function () { return { kind: 'absences', title: 'الطلاب الأكثر غياباً', from: 1, to: aw, min: 3 }; } },
    { t: '👤 مستوى طالب', s: function () { var n = prompt('اكتب اسم الطالب (أو جزءاً منه):'); if (!n || !n.trim()) return null; return { kind: 'student', title: 'مستوى الطالب', student: n.trim() }; } },
    { t: '📊 ملخص الفصول', s: function () { return { kind: 'summary', title: 'ملخص الفصول' }; } }
  ];
}
function showReport(raw) {
  raw.classes = repScopeClasses();
  ST.rep = { spec: normSpec(raw), write: '', writing: false };
  ST.rep.res = runReport(ST.rep.spec);
  ST.view = 'repOut'; render();
}

/* عناصر تحكم المعايير */
function ctl(label, inner) { return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:7px;font-size:11px;color:#94a3b8;"><span style="min-width:64px;">' + label + '</span>' + inner + '</div>'; }
function selHtml(key, opts, cur) {
  return '<select style="' + SEL + '" onchange="DAI.rs(\'' + key + '\',this.value)">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
}
function numHtml(key, cur, w) { return '<input type="number" inputmode="decimal" value="' + esc(cur) + '" oninput="DAI.rs(\'' + key + '\',this.value,true)" style="' + SEL + 'width:' + (w || 64) + 'px;text-align:center;">'; }
function weekOpts() { var o = []; for (var w = 1; w <= activeWeeks(); w++) o.push([w, 'أسبوع ' + w]); return o; }
function controlsHtml(sp) {
  var h = '', all = DB.classes || [];
  h += ctl('الفصول', '<select style="' + SEL + '" onchange="DAI.rs(\'scope\',this.value)"><option value="__all__"' + (sp.classes.length === all.length && all.length > 1 ? ' selected' : '') + '>كل الفصول</option>' +
    all.map(function (c) { return '<option value="' + esc(c) + '"' + (sp.classes.length === 1 && sp.classes[0] === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>');
  if (sp.kind === 'missing') {
    h += ctl('الخانات', REP_FIELDS.map(function (f) {
      return '<label style="color:#cbd5e1;"><input type="checkbox" ' + (sp.fields.indexOf(f[0]) >= 0 ? 'checked' : '') + ' onchange="DAI.rs(\'field_' + f[0] + '\',this.checked)"> ' + f[1] + '</label>';
    }).join(' '));
    h += ctl('من أسبوع', selHtml('from', weekOpts(), sp.from) + ' إلى ' + selHtml('to', weekOpts(), sp.to));
    h += ctl('الشرط', selHtml('match', [['any', 'ناقص في أي خانة'], ['all', 'ناقص في كل الخانات']], sp.match));
  } else if (sp.kind === 'absences') {
    h += ctl('من أسبوع', selHtml('from', weekOpts(), sp.from) + ' إلى ' + selHtml('to', weekOpts(), sp.to));
    h += ctl('غياب لا يقل عن', numHtml('min', sp.min, 56) + ' فترة');
  } else if (sp.kind === 'student') {
    h += ctl('اسم الطالب', '<input type="text" value="' + esc(sp.student || '') + '" oninput="DAI.rs(\'student\',this.value,true)" placeholder="اكتب الاسم أو جزءاً منه" style="' + SEL + 'width:190px;">');
  } else if (sp.kind === 'score') {
    h += ctl('المقياس', selHtml('mtype', REP_METRICS, sp.metric.type));
    if (sp.metric.type === 'cell') h += ctl('الخانة', selHtml('mfield', REP_FIELDS.map(function (f) { return [f[0], f[1]]; }), sp.metric.field) + (/^ex/.test(sp.metric.field) ? '' : selHtml('mweek', weekOpts(), sp.metric.week)));
    if (sp.metric.type === 'avg_range') h += ctl('الخانة', selHtml('mfield', REP_FIELDS.slice(0, 3), sp.metric.field) + selHtml('from', weekOpts(), sp.from) + ' إلى ' + selHtml('to', weekOpts(), sp.to));
    h += ctl('الشرط', selHtml('op', REP_OPS, sp.op) + (sp.op === 'none' ? '' : numHtml('value', sp.value) + (sp.op === 'between' ? ' و ' + numHtml('value2', sp.value2) : '') +
      (sp.metric.type === 'avg_range' ? ' ٪' : selHtml('unit', [['percent', '٪ نسبة'], ['raw', 'درجة']], sp.unit))));
    h += ctl('الترتيب', selHtml('order', [['asc', 'من الأقل'], ['desc', 'من الأعلى']], sp.order) + ' أول ' + numHtml('n', sp.n || '', 56) + ' <span style="color:#64748b;">(فارغ = الكل)</span>');
  }
  return h;
}
function tableHtml(res) {
  var BD = 'border:1px solid #1e293b;';
  var hd = res.head.map(function (h) { return '<th style="padding:5px 6px;background:#1e293b;color:#cbd5e1;font-size:10px;white-space:nowrap;' + BD + '">' + esc(h) + '</th>'; }).join('');
  var body = res.data.map(function (r, ri) {
    var bg = ri % 2 ? '#111a30' : '#0b1220';
    return '<tr style="background:' + bg + ';">' + r.map(function (c, ci) {
      return '<td style="padding:5px 6px;font-size:11px;background:' + bg + ';color:#e2e8f0;' + BD + 'text-align:' + (ci === 1 && res.kind !== 'summary' ? 'right' : 'center') + ';">' + esc(c) + '</td>';
    }).join('') + '</tr>';
  }).join('');
  var empty = res.kind === 'student' ? '🔍 لم يُعثر على طالب بهذا الاسم' : '✅ لا يوجد طلاب مطابقون لهذه المعايير';
  return '<div style="overflow-x:auto;background:#0b1220;border:1px solid #1e293b;border-radius:10px;"><table style="border-collapse:collapse;width:100%;background:#0b1220;color:#e2e8f0;"><thead><tr>' + hd + '</tr></thead><tbody>' +
    (body || '<tr><td colspan="' + res.head.length + '" style="padding:14px;text-align:center;background:#0b1220;color:#6ee7b7;font-size:12px;' + BD + '">' + empty + '</td></tr>') + '</tbody></table></div>';
}
function updateRepRes() {
  var el = document.getElementById('daiRepRes'); if (!el || !ST.rep) return;
  var res = ST.rep.res = runReport(ST.rep.spec);
  el.innerHTML = '<div style="font-size:13px;font-weight:900;color:#e2e8f0;margin-bottom:3px;">' + esc(res.title) + '</div>' +
    '<div style="font-size:10px;color:#94a3b8;line-height:1.8;margin-bottom:6px;">' + esc(res.criteria) + '</div>' +
    '<div style="font-size:12px;color:#a5b4fc;margin-bottom:6px;">العدد: <b>' + res.listed + '</b>' + (res.kind !== 'summary' ? ' من ' + res.agg.considered + ' طالب' : '') + '</div>' +
    tableHtml(res) + (res.foot.length ? '<div style="font-size:10px;color:#fbbf24;margin-top:6px;line-height:1.8;">' + res.foot.map(esc).join('<br>') + '</div>' : '');
}
function viewRepOut() {
  head('📊 التقرير', 'rep');
  var sp = ST.rep.spec;
  box().innerHTML =
    '<details style="background:#0b1220;border:1px solid #1e293b;border-radius:10px;padding:8px 10px;margin-bottom:10px;"><summary style="font-size:12px;color:#93c5fd;cursor:pointer;font-weight:800;">⚙️ تعديل المعايير</summary><div style="margin-top:8px;">' + controlsHtml(sp) + '</div></details>' +
    '<div id="daiRepRes"></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;">' +
    btn('📋 نسخ', 'DAI.repCopy()', GHOST) + btn('📊 Excel', 'DAI.repExcel()', GHOST) + btn('🖨 طباعة / PDF', 'DAI.repPrint()', GHOST) +
    btn('✍️ صياغة رسمية بالذكاء', 'DAI.repWrite()', 'background:#312e81;color:#c7d2fe;border:1px solid #4338ca;padding:8px 12px;font-size:11px;') + '</div>' +
    '<div id="daiRepWrite"></div>';
  updateRepRes(); renderWriteup();
}
function renderWriteup() {
  var el = document.getElementById('daiRepWrite'); if (!el || !ST.rep) return;
  if (ST.rep.writing) { el.innerHTML = '<div style="color:#fcd34d;font-size:11px;">⏳ جاري كتابة الصياغة…</div>'; return; }
  if (!ST.rep.write && !ST.rep.werr) { el.innerHTML = '<div style="font-size:10px;color:#64748b;line-height:1.8;">الصياغة الرسمية تُرسل للذكاء الاصطناعي أرقاماً مجمّعة فقط (أعداد ونسب) — <b>دون أسماء الطلاب</b>.</div>'; return; }
  el.innerHTML = (ST.rep.werr ? '<div style="color:#fca5a5;font-size:11px;margin-bottom:6px;">❌ ' + esc(ST.rep.werr) + '</div>' : '') +
    (ST.rep.write ? '<textarea rows="8" oninput="DAI.repWriteEdit(this.value)" style="' + SEL + 'width:100%;box-sizing:border-box;line-height:1.9;font-size:12px;">' + esc(ST.rep.write) + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:6px;">' + btn('📋 نسخ الصياغة', 'DAI.repCopyWrite()', GHOST) + '</div>' : '');
}
function repWrite() {
  if (!hasKey()) { ST.view = 'settings'; render(); return; }
  var res = ST.rep.res;
  ST.rep.writing = true; ST.rep.werr = ''; renderWriteup();
  callAI({
    system: 'You write concise formal Arabic paragraphs for Egyptian school reports. Use ONLY the figures given; never invent numbers, names, or causes. ' +
      'Write 4-7 sentences summarizing the finding, then 2-3 short practical recommendations as a numbered list. Output ONE JSON object only: {"text":"..."}',
    content: [{ type: 'text', text: 'Subject: ' + ((DB.meta && DB.meta.subject) || 'العلوم') + '\nReport data (aggregates only, no student names):\n' + JSON.stringify(res.agg) }],
    maxTokens: 1500, schema: SCH_TEXT
  }).then(function (r) {
    if (!ST || !ST.rep) return;
    var j = parseJSON(r.text);
    ST.rep.write = String(j.text || '').trim(); ST.rep.writing = false;
    if (!ST.rep.write) throw new Error('BAD_JSON');
    renderWriteup();
  }).catch(function (e) {
    if (!ST || !ST.rep) return;
    ST.rep.writing = false; ST.rep.werr = errMsg(e); renderWriteup();
  });
}
function repAnalyze() {
  var txt = (ST.repTxt || '').trim();
  if (!txt) return;
  if (!hasKey()) { ST.view = 'settings'; render(); return; }
  ST.view = 'loading'; ST.err = ''; ST.repClar = ''; render();
  callAI({ system: SYS_REP, content: [{ type: 'text', text: repContext() + '\n\nRequest (Arabic): ' + txt }], maxTokens: 1200, schema: SCH_ANY, tier: 'light' })
    .then(function (r) {
      if (!ST) return;
      var j = parseJSON(r.text);
      ST.repClar = String(j.clarification || '').trim();
      if (ST.repClar && !j.kind) { ST.view = 'rep'; render(); return; }
      var raw = j; raw.classes = (j.classes === 'all') ? 'all' : (Array.isArray(j.classes) ? j.classes : 'selected');
      if (raw.classes === 'selected') raw.classes = repScopeClasses();
      ST.rep = { spec: normSpec(raw), write: '', writing: false };
      ST.view = 'repOut'; render();
    })
    .catch(function (e) { if (!ST) return; ST.view = 'rep'; ST.err = errMsg(e); render(); });
}
function repSet(k, v, quiet) {
  var sp = ST.rep.spec, all = DB.classes || [], redraw = false, m;
  if (k === 'scope') { sp.classes = v === '__all__' ? all.slice() : [v]; ST.repAll = v === '__all__'; }
  else if ((m = /^field_(\w+)$/.exec(k))) {
    var i = sp.fields.indexOf(m[1]);
    if (v && i < 0) sp.fields.push(m[1]); else if (!v && i >= 0) sp.fields.splice(i, 1);
    if (!sp.fields.length) sp.fields = [m[1]];
  }
  else if (k === 'from' || k === 'to') { sp[k] = parseInt(v, 10) || 1; if (sp.to < sp.from) { if (k === 'from') sp.to = sp.from; else sp.from = sp.to; redraw = true; } if (sp.metric) { sp.metric.from = sp.from; sp.metric.to = sp.to; } }
  else if (k === 'match') sp.match = v === 'all' ? 'all' : 'any';
  else if (k === 'min') sp.min = Math.max(0, parseInt(v, 10) || 0);
  else if (k === 'student') sp.student = String(v || '').slice(0, 60);
  else if (k === 'mtype') { sp.metric.type = v; if (v === 'avg_range') sp.unit = 'percent'; redraw = true; }
  else if (k === 'mfield') { sp.metric.field = v; redraw = true; }
  else if (k === 'mweek') sp.metric.week = parseInt(v, 10) || 1;
  else if (k === 'op') { sp.op = v; if (v === 'none') sp.order = sp.order || 'desc'; redraw = true; }
  else if (k === 'value') sp.value = isFinite(parseFloat(v)) ? parseFloat(v) : 0;
  else if (k === 'value2') sp.value2 = isFinite(parseFloat(v)) ? parseFloat(v) : 0;
  else if (k === 'unit') sp.unit = v === 'raw' ? 'raw' : 'percent';
  else if (k === 'order') sp.order = v === 'asc' ? 'asc' : 'desc';
  else if (k === 'n') sp.n = Math.max(0, Math.min(500, parseInt(v, 10) || 0));
  ST.rep.write = ''; ST.rep.werr = '';
  if (redraw && !quiet) { viewRepOut(); } else { updateRepRes(); renderWriteup(); }
}

/* ═════════════════════════════════════════════════════════════════════
   🧠 المحادثة الذكية (وكيل المساعد)
   • محادثة مستمرة تتذكر ما قيل («والذي قبله؟»، «طبّق نفس الشيء على فصل 2-5»).
   • تحليل وتوصيات من ملخص بيانات محسوب محلياً (الأرقام دقيقة، لا يخمّنها النموذج).
   • عند طلب تعديل: يقترح عمليات تُعرض للمراجعة ولا تُطبَّق إلا بزر «تطبيق»، مع تراجع.
   • إدخال صوتي مباشر بالميكروفون.
   ═════════════════════════════════════════════════════════════════════ */
var CHAT = { msgs: [], busy: false, rec: null, listening: false, draft: '', status: '', imgs: [], imgKind: '', attHint: '', alerts: [], alertsOpen: null };
var CHAT_CHIPS = [
  'أعطني ملخصاً سريعاً عن حال فصولي الآن',
  'من الطلاب المتعثرون في هذا الفصل ولماذا؟',
  'من تراجع مستواه في آخر أسابيع؟',
  'من لم تُرصد درجاته حتى الأسبوع الحالي؟',
  'قارن بين فصولي من حيث المستوى والغياب',
  'من الطلاب المعرّضون للخطر في هذا الفصل؟',
  'أعطني إحصاءات الفصل وتوزيع المستويات',
  'في أي أيام يكثر الغياب؟',
  'هل الغياب يؤثر على درجات الطلاب؟',
  'اقترح خطة علاج للمتعثرين',
  'اكتب رسالة لولي أمر الطالب رقم 5 بخصوص مستواه',
  'كيف يُحسب المجموع وما تأثير الغياب على الدرجات؟',
  'كيف أغيّر الدرجة النهائية لعمود أو أخفي أسابيع؟',
  'اجعل سلوك الأسبوع الحالي 10 لكل الطلاب'
];

/* ── دليل التطبيق: يعرّف المساعد بكل صفحات التطبيق ووظائفه ── */
var APP_PAGES = {
  home: 'الرئيسية', grades: 'الدرجات', weekly: 'الأسبوعي (الراصد والكروت)', sched: 'الجدول', absence: 'الغياب',
  sick: 'المرضى', dict: 'الإملاء', stats: 'إحصائيات', settings: 'الإعدادات', notifs: 'الإشعارات',
  curric: 'توزيع المنهج', backup: 'النسخ الاحتياطي', witness: 'توقيع المتابع', tafrigh: 'كشف التفريغ'
};
var APP_GUIDE =
  'APP GUIDE — "Dalty Grades" (دفتري): a gradebook web-app (PWA) for teachers. Data is stored on the device (localStorage) and can sync to the cloud if the teacher signed in. ' +
  'Navigation: bottom dock for common pages, side menu (☰) for all pages. Page ids you may use in "navigate": ' +
  Object.keys(APP_PAGES).map(function (k) { return k + '=' + APP_PAGES[k]; }).join('; ') + '.\n' +
  '• الدرجات (grades): interactive grades table per class. Column groups: التقييم (assess), الواجب (hw), السلوك والمواظبة (beh) — one column per week — plus اختبار 1/2 (ex1/ex2). ' +
  'The "الأعمدة" button edits columns and their maximum scores; the "الأسابيع" button shows/hides weeks; totals and averages are computed automatically; "غ" = absent, "م" = excused.\n' +
  '• الأسبوعي (weekly): student cards for fast weekly entry (تقييم/واجب/سلوك), with a numpad entry and Arabic voice entry, smart distribution, and card layout/font customisation.\n' +
  '• الغياب (absence): weekly attendance per class and per period (weeks 1..32); absence is linked to the grades page. Settings decide the effect of absence on grades (absenceMode none/zero/deduct, absenceAllowed, absenceDeductPer, examAbsenceMode zero/exclude).\n' +
  '• المرضى (sick): follow students who are sick. • الإملاء (dict): spelling grades by voice, with name matching (match threshold and separator word "التالي" in its settings).\n' +
  '• الجدول (sched): weekly timetable with periods/days/times, can be exported as an image, and drives the "current period" on the home page.\n' +
  '• إحصائيات (stats): performance analysis of students and classes. • توزيع المنهج (curric): units and lessons per week, exam weeks and holidays; shown as a widget on the home page.\n' +
  '• كشف التفريغ (tafrigh): simplified summary sheet for printing; the official grades sheet prints on A4 with school header; توقيع المتابع (witness): follow-up signature sheet.\n' +
  '• النسخ الاحتياطي (backup): export/import all data, local backups; Excel (.xlsx) export is available from the grades pages. • الإشعارات (notifs): custom alerts/alarms with tones. ' +
  '• مشاركة الدرجات مع الطلاب: a viewer page (grades-viewer) with a share link.\n' +
  '• الإعدادات (settings): school/teacher/subject names, semester, start date (it defines the current week), active weeks, periods per week, fonts, absence rules.\n' +
  '• The AI assistant (this chat and the 🤖 button): reads a photo of an attendance sheet / class list / grades sheet, runs typed or spoken edit commands (with preview, apply and undo), and builds smart reports. ' +
  'It needs an AI key from its ⚙️ settings (Gemini free tier or Claude).\n' +
  'Be honest about this guide: it is a summary. If the teacher asks about a button or option you are not sure exists, say you are not sure and point to the most likely page instead of inventing steps.';

var SYS_AGENT = 'You are "Dalty AI" (مساعد دفتري), the built-in assistant of the Dalty Grades gradebook app, talking to an Egyptian preparatory-school teacher. ' +
  'You know the whole app (APP GUIDE below) and you see live data in CONTEXT (settings, curriculum, class overview and a DATA DIGEST of the selected class). ' +
  'Chat in Arabic (Egyptian-friendly, clear, concise, respectful) and be a flexible, practical colleague. You can:\n' +
  '(a) answer HOW-TO questions about the app: short numbered steps, naming the page and button in Arabic; if useful add "navigate" with the page id;\n' +
  '(b) explain how totals, averages and absence rules work, using the SETTINGS in CONTEXT;\n' +
  '(c) analyse the class data, compare classes, and give recommendations, remedial plans and parent messages;\n' +
  '(d) help with general teaching work that needs no data (lesson ideas, quiz questions, activities, wording of notices) — you do not need the data for this;\n' +
  '(e) propose structured edit operations when the teacher clearly asks to change data.\n' +
  '(f) photos: this same chat has 📷/🖼 buttons next to the text box. When the teacher wants to read an attendance sheet, a class name list or a grades sheet from a photo, tell them to tap 📷 or 🖼, press send (the app detects the type, the date and the weekday from the column headers by itself; the teacher may also pick the type manually); a review screen appears before anything is applied. Reports: use the query tools and show tables, which have Excel/PDF buttons.\n' +
  'Output ONE JSON object only (no markdown fences): {"reply":"Arabic answer","summary":"","ops":[],"clarification":"","lookup":null,"navigate":"","remember":[],"forget":[]}.\n' +
  '- "reply": your answer. You may use **bold** and lines starting with "- " for lists. Keep it focused; never pad.\n' +
  '- Numbers and statistics: use ONLY the SETTINGS / OVERVIEW / DATA DIGEST in CONTEXT. Never invent students, grades or statistics. Refer to students as «number. name» (names may be replaced by «طالب N» when the teacher turned off name sharing). If the data does not contain the answer, say so.\n' +
  '- You CAN see every class: the selected class in full and all the other classes in compact form (section OTHER CLASSES). NEVER tell the teacher that you cannot access other classes — use that section, or "lookup" for a full digest.\n' +
  '- "lookup": when you need the full digest of ANOTHER class (or another week) to answer, set {"class":"exact class name","week":N}, leave "reply" empty and the app will call you again with that data (max 2 lookups per question). Do not use it when the selected class is enough.\n' +
  '- "tool": for analysis questions the digest cannot answer exactly (who declined, who is weak in X, one student\'s full profile, comparing classes, week-by-week trend), set {"name":"...","args":{...}}, leave "reply" empty and the app will run it locally and call you again with TOOL RESULT (max 4 tools per question; one tool per turn). Tools: ' +
  '(1) student_profile {"class":"","student":12 or name} — full profile: components vs class average, rank, absences, weekly percentages; ' +
  '(2) query_students {"class":"","metric":"total|avg_assess|avg_hw|avg_beh|exams|absences|missing","op":"top|bottom|lt|lte|gt|gte|between","value":60,"value2":80,"limit":15} — percentages for grade metrics; ' +
  '(3) declining {"class":"","last_n":3,"min_drop":5,"direction":"down|up"} — students whose weekly percentage fell (or rose) between the last N recorded weeks and the N before; ' +
  '(4) compare_classes {} — all classes side by side; (5) weekly_series {"class":"","student":12 (optional)} — percentage per recorded week; (6) find_student {"name":"..."}; ' +
  '(7) at_risk {"class":"","low_pct":50,"min_abs":3,"min_missing":6} — students at risk (low percentage, or a combination of absences / decline / missing grades) with reasons; ' +
  '(8) class_stats {"class":"","metric":"total|avg_assess|avg_hw|avg_beh|exams"} — mean, median, std, min, max, pass rate per metric + level distribution of the chosen metric; ' +
  '(9) absence_pattern {"class":""} — absences by weekday (or period) and by week; ' +
  '(10) missing_report {"class":""} — how many students have no recorded assessment/homework/behaviour per week; ' +
  '(11) compare_weeks {"class":"","week_a":3,"week_b":5} — each student\'s weekly percentage in two weeks and the change (defaults: last two recorded weeks); ' +
  '(12) absence_vs_grades {"class":""} — does absence relate to lower grades (correlation + bands). ' +
  'Omit "class" for the selected class. The app displays each tool result to the teacher as a table automatically — do NOT repeat its rows in "reply"; write a short Arabic summary and insights instead. When you must list several records yourself, use a markdown table (| col | col |) rather than plain lines. Prefer a tool over guessing; use ONLY what TOOL RESULT returns and never invent numbers.\n' +
  '- "navigate": one page id from the APP GUIDE (or "") when opening that page would help; the teacher decides whether to tap the button. Never claim you opened it.\n' +
  '- Recommendations should be concrete and short. Parent messages: polite, specific to that student\'s digest numbers, constructive; never mention other students.\n' +
  '- "ops": [] unless the teacher asks to CHANGE data. Each op may carry an optional "class":"exact class name" — without it the op applies to the SELECTED class; student numbers always refer to the roster of the class the op targets (see the digests). Global ops (add_class, rename_class, set_active_weeks, set_column_max, set_weeks_visibility) need no class. ' +
  'Never claim an edit is done: the teacher reviews and presses apply. When you give ops, "summary" is a short Arabic description and "reply" briefly says what will change.\n' +
  '- "remember": ONLY when the teacher explicitly asks you to remember or always do something (تذكّر، احفظ، دائماً، من الآن) — put it as a short Arabic sentence (max 120 chars) about style, format, tone or defaults; never grades, student data or secrets. "forget": snippets of saved preferences the teacher asks to forget (انسَ…). Otherwise leave both [].\n' +
  '- If a request is ambiguous (which student/week/column?), set "clarification" to a short Arabic question and ops [].\n' +
  '- Use the conversation history to resolve references like "the same", "them", "the previous week".\n' +
  '- Never present something as a feature of the app unless it is in the APP GUIDE or the teacher already used it.\n\n' +
  APP_GUIDE + '\n\n' +
  'Allowed ops (students by roster NUMBER; weeks are integers):\n' +
  '1) {"type":"set_grade","student":12,"field":"assess|hw|beh|ex1|ex2","week":3,"value":8}  (value: number, "غ", "م", or "" to clear)\n' +
  '2) {"type":"fill_column","field":"beh","week":5,"value":10,"students":"all"|[3,7]}\n' +
  '3) {"type":"clear_cells","field":"hw","week":2,"students":"all"|[3,7]}\n' +
  '4) {"type":"set_absence","student":5,"week":4,"period":2,"status":"abs|sick|none"}\n' +
  '5) {"type":"transfer","mode":"move|copy|swap","from":{"field":"hw","week":3},"to":{"field":"hw","week":4},"students":"all"|[..],"delta":0,"scale":false}  (between two students: put "student" inside from/to)\n' +
  '6) {"type":"add_students","names":["..."]}\n' +
  '7) {"type":"adjust","field":"hw","week":3,"delta":2,"students":"all"|[..],"where":{"op":"lt|lte|gt|gte|eq|between","value":5,"value2":8,"unit":"raw|percent"}}  (week_from/week_to for ranges; the app caps at max/floors at 0 itself — never do that arithmetic)\n' +
  NEW_OPS_DOC +
  'Rules: use only fields/weeks/periods/classes listed in the context. Unsupported: deleting classes, changing settings other than listed. ' +
  'Never output students absent from the roster (except add_students). Never delete students unless explicitly asked.';

function classDigest(cls, week) {
  var arr = DB.data[cls] || [], lines = [], tots = [], below = 0, tm = recordedMax(cls), half = tm / 2, priv = !cfgGet().sendRoster;
  var ex = function (s, pre, w) { var v = s[pre + w]; if (!recorded(v)) return null; var n = (v === 'غ') ? 0 : Number(v); return isNaN(n) ? null : n / maxFor(pre + w) * 100; };
  arr.forEach(function (s, i) {
    if (!s || !(s.name || '').trim()) return;
    var cs = {}; try { cs = calcStudent(s, cls) || {}; } catch (e) {}
    var absP = 0; try { absP = countStudentAbsencePeriods(cls, s.id) || 0; } catch (e) {}
    var miss = 0, pcts = [], w, k, vals;
    for (w = 1; w <= week; w++) {
      vals = [];
      ['a', 'h', 'bw'].forEach(function (pre) {
        var v = s[pre + w];
        if (v === 'م') return;
        if (!recorded(v)) { miss++; return; }
        var p = ex(s, pre, w); if (p !== null) vals.push(p);
      });
      if (vals.length) pcts.push(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
    }
    var trend = '';
    if (pcts.length >= 4) {
      var last = pcts.slice(-3), prev = pcts.slice(-6, -3);
      var avg = function (x) { return x.reduce(function (a, b) { return a + b; }, 0) / x.length; };
      trend = Math.round(avg(last) - avg(prev));
    }
    var tot = (s._totalAbsent || cs.total === undefined) ? null : cs.total;
    if (tot !== null) { tots.push(tot); if (tot < half) below++; }
    lines.push((i + 1) + '|' + (priv ? ('طالب ' + (i + 1)) : s.name) + '|total ' + (tot === null ? '-' : tot + '/' + tm) +
      '|assess ' + (cs.avgAssess === undefined ? '-' : cs.avgAssess) + '|hw ' + (cs.avgHw === undefined ? '-' : cs.avgHw) +
      '|beh ' + (cs.avgBeh === undefined ? '-' : cs.avgBeh) + '|exams ' + (cs.exTotal === undefined ? '-' : cs.exTotal) +
      '|absent_periods ' + absP + '|missing_cells_to_week_' + week + ' ' + miss + (trend === '' ? '' : '|trend_last3_vs_prev3 ' + (trend > 0 ? '+' : '') + trend + '%'));
  });
  var mean = tots.length ? Math.round(tots.reduce(function (a, b) { return a + b; }, 0) / tots.length * 10) / 10 : '-';
  return 'DATA DIGEST for class ' + cls + ' (up to week ' + week + '; avg columns are per-week averages; total max ' + tm + '; pass line = ' + half + '):\n' +
    'Students: ' + lines.length + ' | class mean total: ' + mean + ' | below pass line: ' + below + '\n' +
    'number|name|metrics\n' + lines.join('\n');
}
function otherClassesLine(cls) {
  var out = [];
  (DB.classes || []).forEach(function (c) {
    if (c === cls) return;
    var arr = DB.data[c] || [], t = 0, n = 0;
    arr.forEach(function (s) { if (!s || !(s.name || '').trim() || s._totalAbsent) return; try { t += calcStudent(s, c).total; n++; } catch (e) {} });
    out.push(c + ' (' + arr.filter(function (s) { return (s.name || '').trim(); }).length + ' students' + (n ? ', mean total ' + Math.round(t / n * 10) / 10 : '') + ')');
  });
  return out.length ? 'Other classes (names exact, for move_student/transfer): ' + out.join('; ') : '';
}
/* كتالوج الفصل للمحادثة (يحترم خيار «أرسل أسماء الفصل») */
function chatCatalog(cls, week) {
  var cat = buildCatalog(cls, week);
  if (cfgGet().sendRoster) return cat;
  var mark = 'Roster (student number. name):\n', i = cat.indexOf(mark);
  if (i < 0) return cat;
  var arr = DB.data[cls] || [];
  var r = arr.map(function (s, k) { return (s.name || '').trim() ? (k + 1) + '. طالب ' + (k + 1) : null; }).filter(Boolean).join('\n');
  return cat.slice(0, i + mark.length) + r;
}
/* إعدادات المدرسة + المنهج + أسماء الفصول: يجعل المساعد ملمّاً بالصورة الكاملة */
function schoolContext(cls, week) {
  var M = DB.meta || {}, out = [], cw = 1;
  try { cw = _calcCurrentWeek(); } catch (e) {}
  var tm = 0; try { tm = totalMax(); } catch (e) {}
  out.push('SETTINGS: subject=' + (M.subject || '-') + '; semester=' + (M.semester || 1) + '; schoolYear=' + (M.schoolYear || '-') +
    '; startDate=' + (M.startDate || 'not set') + '; calendar_current_week=' + cw + '; active_weeks=' + activeWeeks() +
    '; periods_per_week=' + (M.periodsPerWeek || 3) + '; total_max=' + tm +
    '; absenceMode=' + (M.absenceMode || 'none') + ' (none/zero/deduct; "deduct" uses absenceAllowed=' + (M.absenceAllowed || 0) + ' and absenceDeductPer=' + (M.absenceDeductPer || 0) + ')' +
    '; examAbsenceMode=' + (M.examAbsenceMode || 'zero') + ' (zero: absent in exam counts 0 / exclude: exam ignored).');
  out.push('CLASSES (exact names): ' + (DB.classes || []).join(' | ') + '. Selected class: ' + cls + '.');
  try {
    var c = DB.curric || {}, wd = null, un = '';
    (c.weeks || []).forEach(function (x) { if (x && x.w === week) wd = x; });
    if (wd && wd.unitId) (c.units || []).forEach(function (u) { if (u && u.id === wd.unitId) un = u.name; });
    var ex = (c.exams || []).map(function (e) { return 'w' + e.w + (e.label ? ' ' + e.label : ''); }).join(', ');
    var ho = (c.holidays || []).map(function (e) { return 'w' + e.w + (e.label ? ' ' + e.label : ''); }).join(', ');
    out.push('CURRICULUM week ' + week + ': ' + (un || 'no unit set') + (wd && wd.lessons ? ' — lessons: ' + String(wd.lessons).slice(0, 220) : '') +
      (wd && wd.notes ? ' — notes: ' + String(wd.notes).slice(0, 120) : '') + '. Exam weeks: ' + (ex || 'none') + '. Holidays: ' + (ho || 'none') + '.');
  } catch (e) {}
  return out.join('\n');
}
function compactDigest(cls, week) {
  return classDigest(cls, week).split('\n').map(function (ln) {
    if (!/^\d+\|/.test(ln)) return ln;
    return ln.split('|').filter(function (x, k) { return k < 2 || /^(total|absent_periods|missing_cells|trend)/.test(x); }).join('|');
  }).join('\n');
}
function otherDigests(cls, week) {
  var cs = (DB.classes || []).filter(function (c) { return c !== cls; }), n = 0;
  if (!cs.length) return '';
  cs.forEach(function (c) { n += (DB.data[c] || []).length; });
  if (n > 260) return 'OTHER CLASSES are large — use \"lookup\" to get the digest of the one you need.';
  return 'OTHER CLASSES — compact digests (use \"lookup\" for the full digest; ops may target them with \"class\"):\n' +
    cs.map(function (c) { return compactDigest(c, week); }).join('\n\n');
}
function clampWeek(w, dflt) { w = parseInt(w, 10); if (!w) w = dflt; return Math.min(Math.max(1, w), activeWeeks()); }
function validPage(p) { return typeof p === 'string' && Object.prototype.hasOwnProperty.call(APP_PAGES, p) ? p : ''; }
/* ═════ أدوات المساعد: يطلبها النموذج عند الحاجة وتُنفَّذ محلياً على بيانات التطبيق ═════
   كل أداة تُرجع جدولاً منظماً يُعرض للمعلمة كما هو، ويُرسَل للنموذج نصّه فقط
   (أسماء الطلاب تُستبدل بـ«طالب N» إن أوقفتِ مشاركة الأسماء) */
var TOOL_LABELS = { student_profile: 'أراجع ملف الطالب', query_students: 'أفلتر الطلاب', declining: 'أقارن بين الأسابيع',
  compare_classes: 'أقارن الفصول', weekly_series: 'أحسب تطور الأسابيع', find_student: 'أبحث عن الطالب',
  at_risk: 'أحدد الطلاب المعرّضين للخطر', class_stats: 'أحسب إحصاءات الفصل', absence_pattern: 'أحلّل نمط الغياب',
  missing_report: 'أفحص الدرجات الناقصة', compare_weeks: 'أقارن بين أسبوعين', absence_vs_grades: 'أربط الغياب بالدرجات' };
var TOOL_METRICS = { total: 'المجموع', avg_assess: 'متوسط التقييم', avg_hw: 'متوسط الواجب', avg_beh: 'متوسط السلوك', exams: 'الاختبارات' };
var _TT = null;
function emitTable(title, head, rows, note) {
  if (_TT) _TT.push({ title: title, head: head, rows: rows, note: note || '' });
  return title + (note ? '\n' + note : '') + '\n' + head.join(' | ') + '\n' + rows.map(function (r) { return r.join(' | '); }).join('\n');
}
function toolClass(a) { var c = String((a && (a['class'] || a.cls)) || '').trim(); return (DB.classes || []).indexOf(c) >= 0 ? c : ST.cls; }
function toolNm(s, i) { return cfgGet().sendRoster ? (s.name || '').trim() : ('طالب ' + (i + 1)); }
function toolStu(cls, ref) {
  var arr = DB.data[cls] || [], n = parseInt(ref, 10);
  if (String(ref).trim() !== '' && !isNaN(n) && String(n) === String(ref).trim()) return arr[n - 1] && (arr[n - 1].name || '').trim() ? { s: arr[n - 1], i: n - 1 } : null;
  if (!cfgGet().sendRoster) return null;
  var best = null, bs = 0.6;
  namedStudents(cls).forEach(function (e) { var sc = studentNameScore(String(ref), e.s.name); if (sc >= bs) { bs = sc; best = e; } });
  return best;
}
function toolPct(s, cls, metric) {
  var m = metricOf(s, cls, { type: metric });
  return m && m.max ? m.v / m.max * 100 : null;
}
function toolMissing(s, upTo) {
  var miss = 0, w;
  for (w = 1; w <= upTo; w++) ['a', 'h', 'bw'].forEach(function (p) { var v = s[p + w]; if (v !== 'م' && !recorded(v)) miss++; });
  return miss;
}
function recordedWeeks(cls) {
  var out = [], w;
  for (w = 1; w <= activeWeeks(); w++) {
    if (namedStudents(cls).some(function (e) { return weekPctOf(e.s, w) !== null; })) out.push(w);
  }
  return out;
}
function avgOf(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
function toolStudentProfile(a, cls) {
  var f = toolStu(cls, a.student);
  if (!f) return 'لم أجد الطالب «' + a.student + '» في فصل ' + cls + (cfgGet().sendRoster ? '' : ' (الأسماء مخفية: استخدم رقم الطالب)') + '.';
  var s = f.s, rows = [], list = namedStudents(cls), who = (f.i + 1) + '. ' + toolNm(s, f.i);
  if (!hasAnyGrade(s) || s._totalAbsent) return who + ': لا توجد درجات مرصودة بعد.';
  Object.keys(TOOL_METRICS).forEach(function (k) {
    var mine = metricOf(s, cls, { type: k });
    if (!mine) { rows.push([TOOL_METRICS[k], 'لم يُرصد', '', '', '']); return; }
    var p = mine.v / mine.max * 100, ps = [];
    list.forEach(function (o) { var q = toolPct(o.s, cls, k); if (q !== null) ps.push(q); });
    var av = avgOf(ps), rank = ps.length ? 1 + ps.filter(function (x) { return x > p + 1e-9; }).length : 0;
    rows.push([TOOL_METRICS[k], r1(mine.v) + '/' + r1(mine.max), r1(p) + '٪', av === null ? '-' : r1(av) + '٪', levelOf(p) + (k === 'total' ? ' — الترتيب ' + rank + ' من ' + ps.length : '')]);
  });
  var ab = absCountOf(cls, s), tr = studentTrend(s);
  rows.push(['الغياب', ab.a + ' فترة' + (ab.sk ? ' (+ مرض ' + ab.sk + ')' : ''), '', '', '']);
  rows.push(['الاتجاه', tr.txt, '', '', '']);
  var t1 = emitTable('ملف الطالب ' + who + ' — فصل ' + cls, ['البند', 'درجته', 'النسبة', 'متوسط الفصل', 'التقدير'], rows, 'الدرجة العظمى المرصودة ' + recordedMax(cls));
  var wr = [], w;
  for (w = 1; w <= activeWeeks(); w++) {
    var p2 = weekPctOf(s, w); if (p2 === null) continue;
    var cp = []; list.forEach(function (o) { var q = weekPctOf(o.s, w); if (q !== null) cp.push(q); });
    wr.push(['أسبوع ' + w, r1(p2) + '٪', cp.length ? r1(avgOf(cp)) + '٪' : '-']);
  }
  return wr.length ? t1 + '\n\n' + emitTable('نسبة الطالب كل أسبوع (تقييم/واجب/سلوك)', ['الأسبوع', 'النسبة', 'متوسط الفصل'], wr) : t1;
}
function toolQuery(a, cls) {
  var metric = String(a.metric || 'total'), op = String(a.op || 'bottom'), lim = Math.min(Math.max(parseInt(a.limit, 10) || 15, 1), 40);
  var v1 = Number(a.value), v2 = Number(a.value2), rows = [], unit = '٪';
  namedStudents(cls).forEach(function (e) {
    var v = null;
    if (metric === 'absences') { v = absCountOf(cls, e.s).a; unit = ' فترة'; }
    else if (metric === 'missing') { v = toolMissing(e.s, activeWeeks()); unit = ' خلية'; }
    else if (TOOL_METRICS[metric]) v = toolPct(e.s, cls, metric);
    else return;
    if (v !== null) rows.push({ e: e, v: v });
  });
  if (!rows.length) return 'لا توجد بيانات كافية لهذا المقياس في فصل ' + cls + ' (المقاييس: ' + Object.keys(TOOL_METRICS).concat(['absences', 'missing']).join(', ') + ').';
  var out;
  if (op === 'top') out = rows.slice().sort(function (x, y) { return y.v - x.v; });
  else if (op === 'bottom') out = rows.slice().sort(function (x, y) { return x.v - y.v; });
  else out = rows.filter(function (r) { return cmpOp(op, r.v, v1, v2); }).sort(function (x, y) { return x.v - y.v; });
  var total = out.length; if (op === 'top' || op === 'bottom') total = Math.min(lim, out.length);
  out = out.slice(0, lim);
  var crit = (op === 'top' ? 'الأعلى' : op === 'bottom' ? 'الأدنى' : OP_SYM[op] ? OP_SYM[op] + ' ' + v1 : 'بين ' + v1 + ' و ' + v2);
  var mName = TOOL_METRICS[metric] || (metric === 'absences' ? 'فترات الغياب' : 'الخلايا غير المرصودة');
  return emitTable('فصل ' + cls + ' — ' + mName + ' — ' + crit, ['م', 'الاسم', mName],
    out.map(function (r) { return [String(r.e.i + 1), toolNm(r.e.s, r.e.i), r1(r.v) + unit]; }),
    'المطابقون ' + (op === 'top' || op === 'bottom' ? out.length : total) + ' من ' + rows.length + ' طالب');
}
function toolDeclining(a, cls) {
  var n = Math.min(Math.max(parseInt(a.last_n, 10) || 3, 1), 6), minD = Number(a.min_drop); if (isNaN(minD)) minD = 5;
  var dir = String(a.direction || 'down') === 'up' ? 1 : -1, rows = [];
  namedStudents(cls).forEach(function (e) {
    var pts = [], w; for (w = 1; w <= activeWeeks(); w++) { var p = weekPctOf(e.s, w); if (p !== null) pts.push(p); }
    if (pts.length < 2 * n) return;
    var d = avgOf(pts.slice(-n)) - avgOf(pts.slice(-2 * n, -n));
    if (dir < 0 ? d <= -minD : d >= minD) rows.push({ e: e, d: d, last: avgOf(pts.slice(-n)), prev: avgOf(pts.slice(-2 * n, -n)) });
  });
  rows.sort(function (x, y) { return dir < 0 ? x.d - y.d : y.d - x.d; });
  if (!rows.length) return 'لا يوجد طلاب ' + (dir < 0 ? 'تراجعوا' : 'تحسّنوا') + ' بمقدار ' + minD + '٪ أو أكثر بين آخر ' + n + ' أسابيع مرصودة والـ' + n + ' التي قبلها (فصل ' + cls + ').';
  return emitTable('فصل ' + cls + ' — ' + (dir < 0 ? 'الطلاب المتراجعون' : 'الطلاب المتحسّنون'), ['م', 'الاسم', 'قبل', 'الآن', 'التغير'],
    rows.slice(0, 30).map(function (r) { return [String(r.e.i + 1), toolNm(r.e.s, r.e.i), r1(r.prev) + '٪', r1(r.last) + '٪', (r.d > 0 ? '+' : '') + r1(r.d) + '٪']; }),
    'مقارنة آخر ' + n + ' أسابيع مرصودة بالـ' + n + ' التي قبلها — ' + rows.length + ' طالب');
}
function toolCompare() {
  var rows = (DB.classes || []).map(function (c) {
    var list = namedStudents(c), o = {};
    Object.keys(TOOL_METRICS).forEach(function (k) {
      var ps = []; list.forEach(function (e) { var q = toolPct(e.s, c, k); if (q !== null) ps.push(q); });
      o[k] = ps.length ? r1(avgOf(ps)) + '٪' : '-';
    });
    var ab = avgOf(list.map(function (e) { return absCountOf(c, e.s).a; }));
    return [c, String(list.length), o.total, o.avg_assess, o.avg_hw, o.avg_beh, o.exams, ab === null ? '-' : String(r1(ab))];
  });
  return emitTable('مقارنة الفصول', ['الفصل', 'الطلاب', 'المجموع', 'التقييم', 'الواجب', 'السلوك', 'الاختبارات', 'غياب/طالب'], rows, 'النسب من الدرجة العظمى المرصودة لكل فصل');
}
function toolWeekly(a, cls) {
  var rows = [], f = (a.student !== undefined && a.student !== '') ? toolStu(cls, a.student) : null;
  if (a.student !== undefined && a.student !== '' && !f) return 'لم أجد الطالب «' + a.student + '» في فصل ' + cls + '.';
  recordedWeeks(cls).forEach(function (w) {
    var ps = []; namedStudents(cls).forEach(function (e) { var q = weekPctOf(e.s, w); if (q !== null) ps.push(q); });
    if (f) { var p = weekPctOf(f.s, w); if (p !== null) rows.push(['أسبوع ' + w, r1(p) + '٪', ps.length ? r1(avgOf(ps)) + '٪' : '-']); }
    else if (ps.length) rows.push(['أسبوع ' + w, r1(avgOf(ps)) + '٪', String(ps.length)]);
  });
  if (!rows.length) return 'لا توجد أسابيع مرصودة.';
  return emitTable(f ? 'تطور ' + (f.i + 1) + '. ' + toolNm(f.s, f.i) + ' (فصل ' + cls + ')' : 'تطور متوسط الفصل ' + cls,
    f ? ['الأسبوع', 'نسبة الطالب', 'متوسط الفصل'] : ['الأسبوع', 'متوسط الفصل', 'عدد الطلاب'], rows, 'تقييم/واجب/سلوك');
}
function toolFind(a) {
  if (!cfgGet().sendRoster) return 'مشاركة الأسماء متوقفة — لا أستطيع البحث بالاسم. استخدم رقم الطالب.';
  var q = String(a.name || ''), found = [];
  (DB.classes || []).forEach(function (c) { namedStudents(c).forEach(function (e) { var sc = studentNameScore(q, e.s.name); if (sc >= 0.6) found.push({ c: c, e: e, sc: sc }); }); });
  found.sort(function (x, y) { return y.sc - x.sc; });
  return found.length ? emitTable('المطابقون لـ«' + q + '»', ['الفصل', 'م', 'الاسم'], found.slice(0, 8).map(function (f) { return [f.c, String(f.e.i + 1), f.e.s.name]; })) : 'لا يوجد طالب بهذا الاسم.';
}
/* ───── أدوات تحليل إضافية ───── */
var DAYS_TL = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
function medianOf(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
function stdOf(a) { if (a.length < 2) return null; var m = avgOf(a); return Math.sqrt(avgOf(a.map(function (x) { return (x - m) * (x - m); }))); }
function lastRecWeek(cls) { var r = recordedWeeks(cls); return r.length ? r[r.length - 1] : 0; }
function numArg(v, d) { if (v === undefined || v === null || v === '') return d; var n = Number(v); return isNaN(n) ? d : n; }

/* طلاب معرّضون للخطر: نسبة منخفضة + غياب + تراجع + درجات ناقصة */
function toolRisk(a, cls) {
  var low = numArg(a.low_pct, 50), minAbs = Math.max(1, parseInt(a.min_abs, 10) || 3), minMiss = Math.max(1, parseInt(a.min_missing, 10) || 6);
  var lw = lastRecWeek(cls); if (!lw) return 'لا توجد درجات مرصودة في فصل ' + cls + '.';
  var list = namedStudents(cls), rows = [];
  list.forEach(function (e) {
    var p = toolPct(e.s, cls, 'total'), ab = absCountOf(cls, e.s).a, ms = toolMissing(e.s, lw), tr = studentTrend(e.s), why = [], sc = 0, isLow = p !== null && p < low;
    if (isLow) { why.push('نسبة منخفضة'); sc += 2; }
    if (ab >= minAbs) { why.push('غياب ' + ab); sc++; }
    if (tr.dir < 0) { why.push('تراجع'); sc++; }
    if (ms >= minMiss) { why.push('ناقص ' + ms); sc++; }
    if (isLow || sc >= 2) rows.push({ e: e, p: p, ab: ab, ms: ms, why: why, sc: sc });
  });
  if (!rows.length) return 'لا يوجد طلاب معرّضون للخطر في فصل ' + cls + ' (نسبة < ' + low + '٪، غياب ≥ ' + minAbs + '، ناقص ≥ ' + minMiss + ').';
  rows.sort(function (x, y) { return y.sc - x.sc || (x.p === null ? 101 : x.p) - (y.p === null ? 101 : y.p); });
  return emitTable('فصل ' + cls + ' — الطلاب المعرّضون للخطر', ['م', 'الاسم', 'النسبة', 'غياب', 'ناقص', 'الأسباب'],
    rows.slice(0, 30).map(function (r) { return [String(r.e.i + 1), toolNm(r.e.s, r.e.i), r.p === null ? '-' : r1(r.p) + '٪', String(r.ab), String(r.ms), r.why.join('، ')]; }),
    'المعايير: نسبة < ' + low + '٪ أو تجمّع عاملين: غياب ≥ ' + minAbs + '، تراجع، ناقص ≥ ' + minMiss + ' (حتى أسبوع ' + lw + ') — ' + rows.length + ' من ' + list.length + ' طالب');
}

/* إحصاءات الفصل + توزيع المستويات */
function toolStats(a, cls) {
  var list = namedStudents(cls), rows = [];
  Object.keys(TOOL_METRICS).forEach(function (k) {
    var ps = []; list.forEach(function (e) { var q = toolPct(e.s, cls, k); if (q !== null) ps.push(q); });
    if (!ps.length) { rows.push([TOOL_METRICS[k], '0', '-', '-', '-', '-', '-', '-']); return; }
    rows.push([TOOL_METRICS[k], String(ps.length), r1(avgOf(ps)) + '٪', r1(medianOf(ps)) + '٪', ps.length > 1 ? r1(stdOf(ps)) : '-',
      r1(Math.min.apply(null, ps)) + '٪', r1(Math.max.apply(null, ps)) + '٪', r1(ps.filter(function (x) { return x >= 50; }).length / ps.length * 100) + '٪']);
  });
  var t1 = emitTable('إحصاءات فصل ' + cls, ['المقياس', 'عدد', 'المتوسط', 'الوسيط', 'الانحراف', 'الأدنى', 'الأعلى', 'نجاح ≥50٪'], rows, 'النسب من الدرجة العظمى المرصودة — الانحراف الكبير يعني تفاوتاً كبيراً بين الطلاب');
  var m = TOOL_METRICS[a.metric] ? a.metric : 'total', ps2 = [];
  list.forEach(function (e) { var q = toolPct(e.s, cls, m); if (q !== null) ps2.push(q); });
  if (!ps2.length) return t1;
  var bands = [['ممتاز (90٪ فأكثر)', 90, 1e9], ['جيد جداً (75–90)', 75, 90], ['جيد (60–75)', 60, 75], ['مقبول (50–60)', 50, 60], ['ضعيف (أقل من 50)', -1e9, 50]];
  var rows2 = bands.map(function (b) { var c = ps2.filter(function (x) { return x >= b[1] && x < b[2]; }).length; return [b[0], String(c), r1(c / ps2.length * 100) + '٪']; });
  return t1 + '\n\n' + emitTable('توزيع المستويات — ' + TOOL_METRICS[m] + ' (فصل ' + cls + ')', ['المستوى', 'عدد الطلاب', 'النسبة'], rows2, 'من ' + ps2.length + ' طالب لهم درجات');
}

/* نمط الغياب: حسب اليوم/الحصة وحسب الأسبوع */
function toolAbsPattern(a, cls) {
  var list = namedStudents(cls), aw = activeWeeks(), ppw = Math.max(1, Number(DB.meta.periodsPerWeek) || 3);
  var byDay = [], byCi = {}, byWk = {}, i, any = false, cache = {}, realAny = false;
  for (i = 0; i < 7; i++) byDay.push({ abs: 0, sick: 0 });
  var psOf = function (w) { if (!cache[w]) { cache[w] = periodsFor(cls, w); if (cache[w].some(function (p) { return p.period && !/^g\d+$/.test(String(p.period.id)); })) realAny = true; } return cache[w]; };
  list.forEach(function (e) {
    var ab = (DB.absences && DB.absences[cls] && DB.absences[cls][e.s.id]) || {};
    Object.keys(ab).forEach(function (k) {
      var m = /^w(\d+)_ci(\d+)$/.exec(k); if (!m) return;
      var w = parseInt(m[1], 10), ci = parseInt(m[2], 10), v = ab[k];
      if (w < 1 || w > aw || (v !== 'abs' && v !== 'sick')) return;
      any = true;
      var ps = psOf(w), di = ps[ci] ? ps[ci].dayIdx : -1, kk = v === 'abs' ? 'abs' : 'sick';
      if (di >= 0 && di < 7) byDay[di][kk]++;
      byCi[ci] = byCi[ci] || { abs: 0, sick: 0 }; byCi[ci][kk]++;
      byWk[w] = byWk[w] || { abs: 0, sick: 0 }; byWk[w][kk]++;
    });
  });
  if (!any) return 'لا توجد غيابات مسجّلة في فصل ' + cls + '.';
  var out = [], rowsW = Object.keys(byWk).map(Number).sort(function (x, y) { return x - y; }).map(function (w) {
    return ['أسبوع ' + w, String(byWk[w].abs), String(byWk[w].sick), r1(byWk[w].abs / (list.length * ppw) * 100) + '٪'];
  });
  if (realAny) {
    var rowsD = byDay.map(function (d, di) { return [DAYS_TL[di], String(d.abs), String(d.sick)]; }).filter(function (r) { return r[1] !== '0' || r[2] !== '0'; });
    out.push(emitTable('الغياب حسب اليوم — فصل ' + cls, ['اليوم', 'غياب', 'مرض'], rowsD, 'بحسب أيام حصص الفصل في الجدول'));
  } else {
    var rowsC = Object.keys(byCi).map(Number).sort(function (x, y) { return x - y; }).map(function (ci) { return ['حصة ' + (ci + 1), String(byCi[ci].abs), String(byCi[ci].sick)]; });
    out.push(emitTable('الغياب حسب الحصة — فصل ' + cls, ['الحصة', 'غياب', 'مرض'], rowsC, 'لا يوجد جدول حصص لهذا الفصل لتحديد الأيام'));
  }
  out.push(emitTable('الغياب حسب الأسبوع — فصل ' + cls, ['الأسبوع', 'غياب', 'مرض', 'نسبة الغياب'], rowsW, 'نسبة الغياب = فترات الغياب ÷ (عدد الطلاب × حصص الأسبوع)'));
  return out.join('\n\n');
}

/* الدرجات الناقصة حسب الأسبوع والنوع */
function toolMissingReport(a, cls) {
  var lw = lastRecWeek(cls); if (!lw) return 'لا توجد درجات مرصودة في فصل ' + cls + '.';
  var list = namedStudents(cls), rows = [], w;
  for (w = 1; w <= lw; w++) {
    var r = ['أسبوع ' + w];
    ['a', 'h', 'bw'].forEach(function (p) { r.push(String(list.filter(function (e) { var v = e.s[p + w]; return v !== 'م' && !recorded(v); }).length)); });
    rows.push(r);
  }
  return emitTable('الدرجات الناقصة — فصل ' + cls, ['الأسبوع', 'تقييم', 'واجب', 'سلوك'], rows, 'عدد الطلاب (من ' + list.length + ') الذين لم تُرصد درجتهم، حتى أسبوع ' + lw + ' (المعفى «م» لا يُحسب)');
}

/* مقارنة أسبوعين لكل طالب */
function toolCompareWeeks(a, cls) {
  var rec = recordedWeeks(cls), wb = parseInt(a.week_b, 10), wa = parseInt(a.week_a, 10);
  if (!wb) wb = rec.length ? rec[rec.length - 1] : 0;
  if (!wa) wa = rec.length > 1 ? rec[rec.length - 2] : 0;
  if (!wa || !wb || wa === wb) return 'حدّد أسبوعين مختلفين للمقارنة (week_a و week_b) — الأسابيع المرصودة: ' + (rec.join('، ') || 'لا يوجد') + '.';
  var rows = [], pa = [], pb = [];
  namedStudents(cls).forEach(function (e) {
    var x = weekPctOf(e.s, wa), y = weekPctOf(e.s, wb);
    if (x === null || y === null) return;
    pa.push(x); pb.push(y); rows.push({ e: e, x: x, y: y, d: y - x });
  });
  if (!rows.length) return 'لا يوجد طلاب لهم درجات في الأسبوعين ' + wa + ' و ' + wb + '.';
  rows.sort(function (p, q) { return p.d - q.d; });
  return emitTable('مقارنة أسبوع ' + wa + ' بأسبوع ' + wb + ' — فصل ' + cls, ['م', 'الاسم', 'أسبوع ' + wa, 'أسبوع ' + wb, 'الفرق'],
    rows.slice(0, 40).map(function (r) { return [String(r.e.i + 1), toolNm(r.e.s, r.e.i), r1(r.x) + '٪', r1(r.y) + '٪', (r.d > 0 ? '+' : '') + r1(r.d) + '٪']; }),
    'متوسط الفصل: ' + r1(avgOf(pa)) + '٪ ← ' + r1(avgOf(pb)) + '٪ — الأكثر تراجعاً أولاً — ' + rows.length + ' طالب (تقييم/واجب/سلوك)');
}

/* علاقة الغياب بالدرجات */
function toolAbsVsGrades(a, cls) {
  var pts = [];
  namedStudents(cls).forEach(function (e) { var p = toolPct(e.s, cls, 'total'); if (p !== null) pts.push({ ab: absCountOf(cls, e.s).a, p: p }); });
  if (pts.length < 5) return 'بيانات غير كافية لتحليل العلاقة (يلزم 5 طلاب على الأقل لهم درجات).';
  var mx = avgOf(pts.map(function (q) { return q.ab; })), my = avgOf(pts.map(function (q) { return q.p; })), sxy = 0, sxx = 0, syy = 0;
  pts.forEach(function (q) { sxy += (q.ab - mx) * (q.p - my); sxx += (q.ab - mx) * (q.ab - mx); syy += (q.p - my) * (q.p - my); });
  var r = (sxx > 0 && syy > 0) ? sxy / Math.sqrt(sxx * syy) : null;
  var bands = [['بلا غياب', 0, 0], ['1 – 2', 1, 2], ['3 – 5', 3, 5], ['6 فأكثر', 6, 1e9]];
  var rows = bands.map(function (b) {
    var g = pts.filter(function (q) { return q.ab >= b[1] && q.ab <= b[2]; });
    return [b[0], String(g.length), g.length ? r1(avgOf(g.map(function (q) { return q.p; }))) + '٪' : '-'];
  });
  var txt = r === null ? 'لا يمكن حساب الارتباط (لا تباين في الغياب أو الدرجات)' : 'معامل الارتباط r = ' + (Math.round(r * 100) / 100) + (r <= -0.3 ? ' — علاقة عكسية واضحة: كلما زاد الغياب انخفضت الدرجات' : r >= 0.3 ? ' — علاقة طردية غير معتادة' : ' — علاقة ضعيفة');
  return emitTable('الغياب والدرجات — فصل ' + cls, ['فترات الغياب', 'عدد الطلاب', 'متوسط المجموع'], rows, txt + ' — الارتباط لا يعني السببية');
}

/* يرجع {text, tables} — النص يذهب للنموذج والجداول تُعرض للمعلمة */
function runChatTool(t) {
  _TT = [];
  var text;
  try {
    var name = String((t && t.name) || ''), a = (t && t.args && typeof t.args === 'object') ? t.args : {}, cls = toolClass(a);
    if (name === 'student_profile') text = toolStudentProfile(a, cls);
    else if (name === 'query_students') text = toolQuery(a, cls);
    else if (name === 'declining') text = toolDeclining(a, cls);
    else if (name === 'compare_classes') text = toolCompare();
    else if (name === 'weekly_series') text = toolWeekly(a, cls);
    else if (name === 'find_student') text = toolFind(a);
    else if (name === 'at_risk') text = toolRisk(a, cls);
    else if (name === 'class_stats') text = toolStats(a, cls);
    else if (name === 'absence_pattern') text = toolAbsPattern(a, cls);
    else if (name === 'missing_report') text = toolMissingReport(a, cls);
    else if (name === 'compare_weeks') text = toolCompareWeeks(a, cls);
    else if (name === 'absence_vs_grades') text = toolAbsVsGrades(a, cls);
    else text = 'أداة غير معروفة: ' + name + ' (المتاح: ' + Object.keys(TOOL_LABELS).join(', ') + ').';
  } catch (e) { text = 'تعذّر تنفيذ الأداة: ' + (e && e.message ? e.message : e); _TT = []; }
  var tabs = _TT; _TT = null;
  return { text: text, tables: tabs };
}
/* عرض الجداول (نفس ألوان الواجهة الداكنة صراحةً حتى لا تتأثر بقواعد الصفحة العامة) */
function chatTableHtml(t, mi, ti) {
  var BD = 'border:1px solid #1e293b;';
  var th = t.head.map(function (h) { return '<th style="padding:5px 7px;background:#1e293b;color:#cbd5e1;font-size:10px;white-space:nowrap;' + BD + '">' + esc(h) + '</th>'; }).join('');
  var body = t.rows.map(function (r, ri) {
    var bg = ri % 2 ? '#111a30' : '#0b1220';
    return '<tr style="background:' + bg + ';">' + r.map(function (c, ci) { return '<td style="padding:5px 7px;font-size:11px;background:' + bg + ';color:#e2e8f0;' + BD + 'text-align:' + (ci === 1 && t.head.length > 3 ? 'right' : 'center') + ';">' + esc(c) + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<div style="margin:8px 0 4px;"><div style="font-size:11px;font-weight:800;color:#a5b4fc;margin-bottom:2px;">📊 ' + esc(t.title) + '</div>' +
    (t.note ? '<div style="font-size:9.5px;color:#64748b;margin-bottom:3px;">' + esc(t.note) + '</div>' : '') +
    '<div style="overflow-x:auto;background:#0b1220;border:1px solid #1e293b;border-radius:8px;"><table style="border-collapse:collapse;width:100%;background:#0b1220;color:#e2e8f0;"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div style="text-align:left;margin-top:3px;display:flex;gap:6px;justify-content:flex-end;flex-direction:row-reverse;"><button onclick="DAI.chatTableXls(' + mi + ',' + ti + ')" style="' + XLS_BTN + '">⬇️ Excel</button><button onclick="DAI.chatTablePdf(' + mi + ',' + ti + ')" style="' + PDF_BTN + '">📄 PDF</button></div></div>';
}
function chatTablesHtml(m, mi) { return (m.tables || []).map(function (t, ti) { return chatTableHtml(t, mi, ti); }).join(''); }
function chatTablesText(m) {
  return (m.tables || []).map(function (t) { return t.title + '\n' + t.head.join(' | ') + '\n' + t.rows.map(function (r) { return r.join(' | '); }).join('\n'); }).join('\n\n');
}
function chatTableXls(mi, ti) {
  var m = CHAT.msgs[mi], t = m && m.tables && m.tables[ti]; if (!t) return;
  repExcel({ title: t.title, criteria: t.note || '', head: t.head, data: t.rows, foot: [], kind: 'chat' });
}
function chatHistory() {
  var h = [], m = CHAT.msgs.filter(function (x) { return !x.err; }).slice(-16);
  m.forEach(function (x) {
    if (x.role === 'user') h.push({ role: 'user', text: x.text });
    else {
      var t = x.text || '';
      if (x.plan) t += '\n[proposed edits: ' + (x.summary || '') + ' — ' + (x.state === 'applied' ? 'APPLIED by teacher' : x.state === 'dismissed' ? 'dismissed by teacher' : 'pending review') + ']';
      h.push({ role: 'assistant', text: t });
    }
  });
  /* Gemini/Claude يتطلبان بدء التاريخ برسالة المستخدم */
  while (h.length && h[0].role !== 'user') h.shift();
  return h;
}
function fmtInline(x) { return esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
var XLS_BTN = 'border:1px solid #10b981;background:#065f46;color:#6ee7b7;border-radius:8px;font-family:inherit;font-weight:700;cursor:pointer;touch-action:manipulation;font-size:11px;padding:5px 12px;';
var PDF_BTN = 'border:1px solid #6366f1;background:#312e81;color:#c7d2fe;border-radius:8px;font-family:inherit;font-weight:700;cursor:pointer;touch-action:manipulation;font-size:11px;padding:5px 12px;';
function mdCells(ln) { return ln.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
/* يفصل النص إلى أجزاء: نص عادي وجداول ماركداون (| عمود | عمود |) */
function mdParse(t) {
  var lines = String(t || '').split('\n'), out = [], i = 0;
  var isRow = function (l) { return /^\s*\|.*\|\s*$/.test(l); };
  var isSep = function (l) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l); };
  while (i < lines.length) {
    if (isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1])) {
      var head = mdCells(lines[i]), rows = []; i += 2;
      while (i < lines.length && isRow(lines[i])) { rows.push(mdCells(lines[i])); i++; }
      out.push({ tbl: { head: head, rows: rows } });
    } else { out.push({ txt: lines[i] }); i++; }
  }
  return out;
}
function fmtInline(x) { return esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
function mdTableHtml(tb, mi, k) {
  var BD = 'border:1px solid #1e293b;';
  return '<div style="overflow-x:auto;margin:6px 0 2px;background:#0b1220;border:1px solid #1e293b;border-radius:8px;"><table style="border-collapse:collapse;width:100%;background:#0b1220;color:#e2e8f0;"><thead><tr>' +
    tb.head.map(function (h) { return '<th style="padding:5px 7px;background:#1e293b;color:#cbd5e1;font-size:10px;white-space:nowrap;' + BD + '">' + fmtInline(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    tb.rows.map(function (r, ri) { var bg = ri % 2 ? '#111a30' : '#0b1220'; return '<tr style="background:' + bg + ';">' + r.map(function (c) { return '<td style="padding:5px 7px;font-size:11px;background:' + bg + ';color:#e2e8f0;' + BD + 'text-align:center;">' + fmtInline(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>' +
    (mi !== undefined ? '<div style="text-align:left;margin-bottom:6px;display:flex;gap:6px;justify-content:flex-end;flex-direction:row-reverse;"><button onclick="DAI.chatMdXls(' + mi + ',' + k + ')" style="' + XLS_BTN + '">⬇️ Excel</button><button onclick="DAI.chatMdPdf(' + mi + ',' + k + ')" style="' + PDF_BTN + '">📄 PDF</button></div>' : '');
}
function fmtMsg(t, mi) {
  var segs = mdParse(t), h = '', prevTxt = false, k = 0;
  segs.forEach(function (o) {
    if (o.tbl) { h += mdTableHtml(o.tbl, mi, k++); prevTxt = false; }
    else { h += (prevTxt ? '<br>' : '') + fmtInline(o.txt); prevTxt = true; }
  });
  return h;
}
function chatTablePdf(mi, ti) {
  var m = CHAT.msgs[mi], t = m && m.tables && m.tables[ti]; if (!t) return;
  repPrint({ title: t.title, criteria: t.note || '', head: t.head, data: t.rows, foot: [], listed: t.rows.length, kind: 'chat' }, '');
  try { if (typeof showSnack === 'function') showSnack('📄 في نافذة الطباعة اختر «حفظ كـ PDF»'); } catch (e) {}
}
function chatMdPdf(mi, k) {
  var m = CHAT.msgs[mi]; if (!m) return;
  var tabs = mdParse(m.text).filter(function (o) { return o.tbl; }), tb = tabs[k] && tabs[k].tbl; if (!tb) return;
  var first = String(m.text || '').split('\n').filter(function (l) { return l.trim() && !/^\s*\|/.test(l); })[0] || '';
  repPrint({ title: first.replace(/\*\*/g, '').slice(0, 60) || 'جدول المحادثة', criteria: '', head: tb.head, data: tb.rows, foot: [], listed: tb.rows.length, kind: 'chat' }, '');
  try { if (typeof showSnack === 'function') showSnack('📄 في نافذة الطباعة اختر «حفظ كـ PDF»'); } catch (e) {}
}
function chatMdXls(mi, k) {
  var m = CHAT.msgs[mi]; if (!m) return;
  var tabs = mdParse(m.text).filter(function (o) { return o.tbl; }), tb = tabs[k] && tabs[k].tbl; if (!tb) return;
  var first = String(m.text || '').split('\n').filter(function (l) { return l.trim() && !/^\s*\|/.test(l); })[0] || '';
  repExcel({ title: first.replace(/\*\*/g, '').slice(0, 60) || 'جدول المحادثة', criteria: '', head: tb.head, data: tb.rows, foot: [], kind: 'chat' });
}

function viewChat() {
  var IC = 'width:44px;height:44px;padding:0;border-radius:12px;font-size:19px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  head('🧠 المحادثة الذكية', true);
  var tools = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:11px;color:#94a3b8;">الفصل:' +
    '<select style="' + SEL + '" onchange="DAI.setCls(this.value)">' + classOptions() + '</select>' +
    'حتى الأسبوع:<select style="' + SEL + '" onchange="DAI.setWeek(this.value)">' + weekOptions(ST.week) + '</select>' +
    '<span style="flex:1"></span>' + btn('🧠 ذاكرتي', "DAI.go('prefs')", GHOST + 'padding:5px 9px;font-size:10px;') + btn('🧹 جديدة', 'DAI.chatClear()', GHOST + 'padding:5px 9px;font-size:10px;') + '</div>';
  box().innerHTML = tools +
    '<div id="daiAlerts"></div>' +
    '<div id="daiChatList"></div>' +
    '<div style="position:sticky;bottom:-18px;background:#0f172a;padding:8px 0 calc(6px + env(safe-area-inset-bottom,0px));margin-top:8px;border-top:1px solid #1e293b;">' +
    '<div id="daiChatAtt"></div>' +
    '<input id="daiChatCam" type="file" accept="image/*" capture="environment" style="display:none" onchange="DAI.chatFiles(this)">' +
    '<input id="daiChatGal" type="file" accept="image/*" multiple style="display:none" onchange="DAI.chatFiles(this)">' +
    '<textarea id="daiChatIn" rows="3" placeholder="اكتب سؤالك أو طلبك…" oninput="DAI.chatDraft(this.value);this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,140)+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey&&!(\'ontouchstart\' in window)){event.preventDefault();DAI.chatSend();}" style="' + SEL + 'display:block;width:100%;box-sizing:border-box;resize:none;line-height:1.7;font-size:15px;min-height:78px;max-height:140px;padding:10px 12px;border-radius:12px;margin-bottom:8px;"></textarea>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
    '<button onclick="document.getElementById(\'daiChatCam\').click()" title="التقاط صورة" style="' + BTN + IC + 'background:#1d4ed8;color:#fff;">📷</button>' +
    '<button onclick="document.getElementById(\'daiChatGal\').click()" title="صورة من المعرض" style="' + BTN + IC + 'background:#0f766e;color:#fff;">🖼</button>' +
    '<button id="daiMicBtn" onclick="DAI.chatMic()" title="إدخال صوتي" style="' + BTN + IC + 'background:' + (CHAT.listening ? '#dc2626' : '#475569') + ';color:#fff;">🎤</button>' +
    btn('إرسال ➤', 'DAI.chatSend()', PRIMARY + 'flex:1;height:44px;padding:0 16px;font-size:15px;border-radius:12px;') + '</div></div>';
  chatRenderAlerts(); chatRenderList(); chatRenderAtt();
  var b = box(); if (b) b.scrollTop = b.scrollHeight;
}
function verifyHtml(m) {
  var v = m.verify; if (m.state !== 'applied' || !v) return '';
  var good = !v.bad.length;
  return '<div style="margin-top:7px;font-size:11px;line-height:1.9;border-radius:8px;padding:6px 9px;background:' + (good ? 'rgba(74,222,128,.08)' : 'rgba(251,191,36,.1)') + ';border:1px solid ' + (good ? '#166534' : '#d97706') + ';color:' + (good ? '#86efac' : '#fcd34d') + ';">🔍 ' +
    (good ? 'تحقّقتُ من البيانات بعد الحفظ: ' + v.ok + ' من ' + v.tot + ' تغيير مطابق تماماً' + (v.extras ? ' (+ ' + v.extras + ' عملية بنيوية)' : '') + '.'
          : 'تحقّقتُ بعد الحفظ: ' + v.ok + ' من ' + v.tot + ' مطابق. الاختلافات:<br>' + v.bad.map(esc).join('<br>')) + '</div>';
}
function chatRenderList() {
  var el = document.getElementById('daiChatList'); if (!el) return;
  if (!CHAT.msgs.length) {
    el.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:12px;line-height:1.9;padding:10px 4px;">أنا ملمّ بكل صفحات التطبيق وبيانات فصولك: أجيب عن طريقة الاستخدام، أحلّل وأقارن، أكتب الرسائل والخطط، وأنفّذ التعديلات بعد موافقتك.<br>جرّب أحد الأسئلة:</div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;">' + CHAT_CHIPS.map(function (c, i) {
        return '<button onclick="DAI.chatChip(' + i + ')" style="' + BTN + 'background:#111c33;border:1px solid #1e3a5f;color:#93c5fd;font-size:11px;padding:7px 10px;font-weight:600;text-align:right;">' + esc(c) + '</button>';
      }).join('') + '</div>';
    return;
  }
  var h = '';
  CHAT.msgs.forEach(function (m, i) {
    if (m.role === 'user') {
      h += '<div style="display:flex;justify-content:flex-start;margin:8px 0;"><div style="background:#312e81;color:#e0e7ff;border-radius:14px 14px 4px 14px;padding:8px 12px;font-size:12px;line-height:1.9;max-width:88%;">' + fmtMsg(m.text) + '</div></div>';
      return;
    }
    var card = '';
    if (m.groups) {
      var n = planCount(m);
      var undoable = m.state === 'applied' && (m.undoTs || []).length && m.undoTs.every(function (t) { return undoStack.some(function (u) { return u.t === t; }); });
      card = '<div style="margin-top:8px;border-top:1px dashed #334155;padding-top:8px;">' +
        (m.summary ? '<div style="font-size:11px;color:#c7d2fe;margin-bottom:5px;">🧾 ' + esc(m.summary) + '</div>' : '') +
        m.groups.map(function (g) {
          var p = g.plan;
          return (m.groups.length > 1 ? '<div style="font-size:11px;color:#a5b4fc;font-weight:800;margin:6px 0 3px;">📌 ' + esc(g.cls) + '</div>' : '') +
            (p.warn.length ? '<div style="font-size:10px;color:#fbbf24;line-height:1.8;margin-bottom:5px;">' + p.warn.map(esc).join('<br>') + '</div>' : '') +
            planTable(p, g.cls) +
            (p.over ? '<div style="font-size:10px;color:#fbbf24;margin-top:4px;">⚠️ سيُستبدل ' + p.over + ' درجة موجودة.</div>' : '');
        }).join('') +
        '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">' +
        (m.state === 'applied' ? '<span style="color:#4ade80;font-size:11px;font-weight:800;padding:6px 0;">✅ طُبِّق</span>' + btn('👁 عرض في الصفحة', 'DAI.chatShow(' + i + ')', GHOST + 'padding:6px 10px;font-size:11px;') +
            (undoable ? btn('↩ تراجع', 'DAI.chatUndo(' + i + ')', 'background:rgba(251,191,36,.12);border:1px solid #d97706;color:#fcd34d;padding:6px 10px;font-size:11px;') : '') :
          m.state === 'dismissed' ? '<span style="color:#94a3b8;font-size:11px;padding:6px 0;">تم التجاهل</span>' :
          m.state === 'undone' ? '<span style="color:#fbbf24;font-size:11px;padding:6px 0;">↩ تم التراجع</span>' :
          btn(n ? '✅ تطبيق (' + n + ')' : 'لا يوجد ما يُطبَّق', 'DAI.chatApply(' + i + ')', PRIMARY + 'padding:7px 12px;font-size:12px;' + (n ? '' : 'opacity:.45;'), n ? '' : 'disabled') +
          btn('✖ تجاهل', 'DAI.chatDismiss(' + i + ')', GHOST + 'padding:6px 10px;')) + '</div>' + verifyHtml(m) + '</div>';
    } else if (m.hadPlan) {
      card = '<div style="margin-top:8px;border-top:1px dashed #334155;padding-top:6px;font-size:11px;color:#94a3b8;line-height:1.8;">' +
        (m.state === 'applied' ? '✅ طُبِّقت تعديلات هنا. (زر التراجع غير متاح بعد إعادة فتح التطبيق — لديك نسخة احتياطية قبل التعديل في صفحة 💾 النسخ الاحتياطي.)' + verifyHtml(m) :
          m.state === 'undone' ? '↩ تم التراجع' : m.state === 'dismissed' ? 'تم التجاهل' :
          'انتهت صلاحية معاينة التعديلات بعد إعادة فتح التطبيق. اطلب التعديل من جديد إن أردته.') + '</div>';
    }
    if (m.nav) card += '<div style="margin-top:8px;">' + btn('↗ افتح صفحة «' + esc(APP_PAGES[m.nav]) + '»', 'DAI.chatGo(' + i + ')', GHOST + 'padding:7px 12px;font-size:11px;') + '</div>';
    h += '<div style="display:flex;justify-content:flex-end;margin:8px 0;"><div style="background:' + (m.err ? '#450a0a' : '#111c33') + ';border:1px solid ' + (m.err ? '#7f1d1d' : '#1e3a5f') + ';color:' + (m.err ? '#fca5a5' : '#e2e8f0') + ';border-radius:14px 14px 14px 4px;padding:9px 12px;font-size:12px;line-height:1.95;max-width:94%;">' +
      fmtMsg(m.text, i) + chatTablesHtml(m, i) + (m.prefNote ? '<div style="margin-top:6px;font-size:11px;color:#6ee7b7;line-height:1.8;">' + esc(m.prefNote) + ' <button onclick="DAI.go(\'prefs\')" style="' + BTN + 'background:none;color:#93c5fd;font-size:11px;padding:0 4px;text-decoration:underline;">إدارة</button></div>' : '') + (m.clar ? '<div style="margin-top:6px;background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:8px;padding:6px 8px;">❓ ' + esc(m.clar) + '</div>' : '') + card +
      (m.err ? '' : '<div style="margin-top:6px;text-align:left;"><button onclick="DAI.chatCopy(' + i + ')" style="' + BTN + 'background:none;color:#64748b;font-size:10px;padding:2px 4px;">📋 نسخ</button></div>') +
      '</div></div>';
  });
  if (CHAT.busy) h += '<div style="color:#94a3b8;font-size:12px;padding:8px 4px;">' + (CHAT.status || '🤖 أفكّر…') + '</div>';
  el.innerHTML = h;
  var b = box(); if (b) b.scrollTop = b.scrollHeight;
}

var CHAT_KINDS = [['auto', '🔎 تلقائي'], ['att', '📋 غياب'], ['names', '👥 أسماء'], ['grades', '📝 درجات']];
function chatInferKind(t) {
  t = String(t || '');
  if (/غياب|غائب|حضور/.test(t)) return 'att';
  if (/أسماء|اسماء|قائمة|قايمة|إدراج|ادراج/.test(t)) return 'names';
  if (/درجات|درجة|كشف|واجب|تقييم|سلوك|اختبار/.test(t)) return 'grades';
  return '';
}
function chatInferGType(t) {
  t = String(t || '');
  if (/واجب/.test(t)) return 'hw';
  if (/تقييم/.test(t)) return 'assess';
  if (/سلوك/.test(t)) return 'beh';
  if (/اختبار\s*(2|٢|الثاني|ثاني)/.test(t)) return 'ex2';
  if (/اختبار/.test(t)) return 'ex1';
  return '';
}
function chatRenderAtt() {
  var el = document.getElementById('daiChatAtt'); if (!el) return;
  if (!CHAT.imgs.length) { el.innerHTML = ''; return; }
  var th = CHAT.imgs.map(function (im, i) {
    return '<div style="position:relative;width:54px;height:54px;border-radius:8px;overflow:hidden;border:1px solid #334155;flex-shrink:0;"><img src="' + im.dataUrl + '" style="width:100%;height:100%;object-fit:cover;">' +
      '<button onclick="DAI.chatRmImg(' + i + ')" style="position:absolute;top:1px;left:1px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;">✕</button></div>';
  }).join('');
  var chips = CHAT_KINDS.map(function (k) {
    var on = (CHAT.imgKind || 'auto') === k[0];
    return '<button onclick="DAI.chatKind(\'' + k[0] + '\')" style="' + BTN + 'flex-shrink:0;font-size:12px;padding:7px 11px;border-radius:999px;border:1px solid ' + (on ? '#6366f1' : '#1e3a5f') + ';background:' + (on ? '#312e81' : '#111c33') + ';color:' + (on ? '#e0e7ff' : '#93c5fd') + ';">' + k[1] + '</button>';
  }).join('');
  el.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:6px;">' + th + '</div>' +
    '<div style="display:flex;gap:5px;align-items:center;overflow-x:auto;white-space:nowrap;margin-bottom:8px;font-size:10px;color:#94a3b8;"><span style="flex-shrink:0;">النوع:</span>' + chips + '</div>' +
    (CHAT.attHint ? '<div style="font-size:10px;color:#fbbf24;margin-bottom:6px;">⚠️ ' + esc(CHAT.attHint) + '</div>' : '');
}
function chatAddFiles(input) {
  var files = Array.prototype.slice.call(input.files || []);
  input.value = '';
  var room = MAX_IMAGES - CHAT.imgs.length;
  if (files.length > room) { if (typeof showSnack === 'function') showSnack('⚠️ الحد الأقصى ' + MAX_IMAGES + ' صور'); files = files.slice(0, Math.max(0, room)); }
  Promise.all(files.map(prepImage)).then(function (arr) {
    arr.forEach(function (a) { CHAT.imgs.push(a); });
    CHAT.attHint = ''; chatRenderAtt();
  }).catch(function () { CHAT.attHint = 'تعذّر قراءة الصورة. جرّب صورة أخرى.'; chatRenderAtt(); });
}
/* صور من المحادثة: تُوجَّه لنفس مسارات الغياب/الأسماء/الدرجات ثم تظهر شاشة المراجعة قبل التطبيق */
function chatSendImages(txt) {
  var kind = CHAT.imgKind || 'auto';
  if (!ensureConsent()) { var c2 = document.getElementById('daiChatIn'); if (c2) c2.value = txt; return; }
  if (CHAT.listening) chatMic();
  var gt = chatInferGType(txt);
  ST.mode = kind; ST.imgs = CHAT.imgs.slice(); ST.note = txt || ''; ST.err = ''; ST.tbl = null;
  if (gt) ST.gdef.type = gt;
  var label = (CHAT_KINDS.filter(function (k) { return k[0] === kind; })[0] || ['', ''])[1];
  CHAT.msgs.push({ role: 'user', text: '📷 ' + ST.imgs.length + ' صورة — ' + label + (txt ? ': ' + txt : '') });
  CHAT.imgs = []; CHAT.imgKind = ''; CHAT.attHint = ''; CHAT.draft = '';
  chatSave();
  analyze();
}
/* ═════ ذاكرة التفضيلات: تُحفظ على هذا الجهاز فقط وتُرسل مع رسائل المحادثة لتتبّع أسلوبك ═════ */
var PREF_KEY = 'dai_prefs_v1', PREF_MAX = 20, PREF_LEN = 200;
var PREF_PRESETS = [
  'أجب باختصار وبالنقاط',
  'اكتب رسائل أولياء الأمور بأسلوب رسمي ودود',
  'ابدأ دائماً بالأرقام ثم اشرح باختصار',
  'اقترح خطوات علاج عملية قصيرة عند ذكر الطلاب الضعاف',
  'استخدم اللهجة المصرية البسيطة في الشرح'
];
function prefClean(t) { return String(t == null ? '' : t).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, PREF_LEN); }
function prefNorm(t) { return prefClean(t).replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase(); }
function prefsGet() {
  try {
    var o = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    if (o && Array.isArray(o.items)) return { on: o.on !== false, items: o.items.map(prefClean).filter(Boolean).slice(0, PREF_MAX) };
  } catch (e) {}
  return { on: true, items: [] };
}
function prefsSet(o) { try { localStorage.setItem(PREF_KEY, JSON.stringify({ on: o.on !== false, items: o.items })); } catch (e) {} }
function prefAdd(text) {
  var t = prefClean(text); if (t.length < 3) return false;
  var o = prefsGet(), n = prefNorm(t);
  if (o.items.some(function (x) { return prefNorm(x) === n; })) return false;
  o.items.push(t); if (o.items.length > PREF_MAX) o.items.shift();
  prefsSet(o); return true;
}
function prefForget(snippet) {
  var n = prefNorm(snippet); if (n.length < 3) return 0;
  var o = prefsGet(), before = o.items.length;
  o.items = o.items.filter(function (x) { var m = prefNorm(x); return m.indexOf(n) < 0 && n.indexOf(m) < 0; });
  prefsSet(o); return before - o.items.length;
}
function prefsPrompt() {
  var o = prefsGet(); if (!o.on || !o.items.length) return '';
  return '\n\nTEACHER PREFERENCES (written by the teacher; apply them silently to style, format, tone and defaults. They never override data accuracy, honesty, or the rules above):\n' +
    o.items.map(function (x) { return '- ' + x; }).join('\n');
}
function viewPrefs() {
  head('🧠 ذاكرة التفضيلات', 'chat');
  var o = prefsGet();
  var items = o.items.length ? o.items.map(function (x, i) {
    return '<div style="display:flex;gap:8px;align-items:flex-start;background:#111c33;border:1px solid #1e3a5f;border-radius:10px;padding:8px 10px;margin-bottom:6px;">' +
      '<span style="flex:1;font-size:12px;line-height:1.8;color:#e2e8f0;">' + esc(x) + '</span>' +
      '<button onclick="DAI.prefDel(' + i + ')" title="حذف" style="' + BTN + 'background:none;color:#f87171;font-size:14px;padding:2px 6px;">✕</button></div>';
  }).join('') : '<div style="font-size:12px;color:#94a3b8;line-height:1.9;padding:6px 2px;">لا توجد تفضيلات محفوظة بعد. أضف أولها بالأسفل، أو قل في المحادثة «تذكّر أن…» أو «دائماً…».</div>';
  var presets = PREF_PRESETS.map(function (p, i) {
    return '<button onclick="DAI.prefPreset(' + i + ')" style="' + BTN + 'background:#0b1220;border:1px solid #1e3a5f;color:#93c5fd;font-size:11px;padding:7px 10px;text-align:right;">+ ' + esc(p) + '</button>';
  }).join('');
  box().innerHTML =
    '<label style="display:flex;gap:8px;align-items:center;font-size:12px;color:#cbd5e1;margin-bottom:10px;"><input type="checkbox" ' + (o.on ? 'checked' : '') + ' onchange="DAI.prefToggle(this.checked)"> استخدام التفضيلات في المحادثة</label>' +
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">تفضيلاتي المحفوظة (' + o.items.length + '/' + PREF_MAX + ')</div>' + items +
    '<div style="display:flex;gap:6px;margin:10px 0;"><input id="daiPrefIn" type="text" maxlength="' + PREF_LEN + '" placeholder="مثال: وقّع رسائلي باسم أ/ إيهاب" onkeydown="if(event.key===\'Enter\'){event.preventDefault();DAI.prefAddUi();}" style="' + SEL + 'flex:1;min-width:0;font-size:14px;padding:10px 12px;border-radius:10px;">' +
    btn('إضافة', 'DAI.prefAddUi()', PRIMARY + 'padding:0 16px;border-radius:10px;') + '</div>' +
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">اقتراحات سريعة</div><div style="display:flex;gap:6px;flex-wrap:wrap;">' + presets + '</div>' +
    (o.items.length ? '<div style="margin-top:14px;">' + btn('🗑 مسح كل التفضيلات', 'DAI.prefClear()', 'background:#450a0a;color:#fca5a5;border:1px solid #7f1d1d;padding:8px 12px;font-size:11px;') + '</div>' : '') +
    '<div style="margin-top:14px;padding:10px;background:#0b1220;border:1px solid #1e293b;border-radius:10px;font-size:10px;color:#94a3b8;line-height:1.9;">' +
    '🔒 تُحفظ على هذا الجهاز فقط، وتُرسل لمزوّد الذكاء الاصطناعي مع رسائل المحادثة (ليتبع أسلوبك). لا تكتب فيها أسماء طلاب أو أرقاماً سرية. ' +
    'ويحفظ المساعد تفضيلاً جديداً فقط عندما تطلب ذلك صراحة («تذكّر / دائماً / من الآن»)، وتستطيع قول «انسَ …» لحذفه. التفضيلات تخص الأسلوب والتنسيق ولا تغيّر دقة الأرقام.</div>';
}
function prefRefresh() { if (ST && ST.view === 'prefs') render(); }
var PREF_TRIGGER = /تذكر|احفظ|دائما|دايما|من الان|لا تنس|(^|\s)انس(\s|$)|امسح|احذف/;
function prefApplyFromModel(j, txt) {
  var out = { saved: [], forgot: 0 };
  if (!prefsGet().on) return out;
  var t = prefNorm(txt);
  if (!PREF_TRIGGER.test(t)) return out; /* لا نحفظ إلا بطلب صريح من المعلمة */
  (Array.isArray(j.remember) ? j.remember : []).slice(0, 3).forEach(function (x) { if (typeof x === 'string' && prefAdd(x)) out.saved.push(prefClean(x)); });
  (Array.isArray(j.forget) ? j.forget : []).slice(0, 3).forEach(function (x) { if (typeof x === 'string') out.forgot += prefForget(x); });
  return out;
}

/* ═════ التنبيهات الاستباقية: تُحسب محلياً من بياناتك (بدون إرسال شيء للذكاء الاصطناعي ودون أي تكلفة) ═════ */
function alertCls() {
  try { return (ST && ST.cls) || (typeof GS !== 'undefined' && GS.activeClass) || (DB.classes || [])[0] || ''; } catch (e) { return ''; }
}
function computeAlerts(cls) {
  var out = []; if (!cls) return out;
  var cnt = function (name, args) {
    try { var r = runChatTool({ name: name, args: args }); return r.tables && r.tables.length ? r.tables[0].rows.length : 0; } catch (e) { return 0; }
  };
  var n, A = { 'class': cls };
  if ((n = cnt('at_risk', A))) out.push({ icon: '🚨', text: n + ' طالب معرّض للخطر', tool: { name: 'at_risk', args: A } });
  try {
    var cw = 1; try { cw = _calcCurrentWeek(); } catch (e0) {}
    var w = cw - 1, list = namedStudents(cls);
    if (w >= 1 && w <= activeWeeks() && list.length) {
      var miss = list.filter(function (e) { return ['a', 'h', 'bw'].some(function (p) { var v = e.s[p + w]; return v !== 'م' && !recorded(v); }); }).length;
      if (miss) out.push({ icon: '📝', text: miss === list.length ? 'لم تُرصد درجات الأسبوع ' + w + ' بعد' : 'درجات الأسبوع ' + w + ' ناقصة عند ' + miss + ' طالب', tool: { name: 'missing_report', args: A } });
    }
  } catch (e1) {}
  if ((n = cnt('declining', A))) out.push({ icon: '📉', text: n + ' طالب تراجع مستواهم في آخر الأسابيع', tool: { name: 'declining', args: A } });
  var QA = { 'class': cls, metric: 'absences', op: 'gte', value: 3, limit: 40 };
  if ((n = cnt('query_students', QA))) out.push({ icon: '🙋', text: n + ' طالب غيابهم 3 فترات فأكثر', tool: { name: 'query_students', args: QA } });
  return out;
}
function chatRenderAlerts() {
  var el = document.getElementById('daiAlerts'); if (!el) return;
  var cls = ST.cls, today = new Date().toISOString().slice(0, 10), sn = '';
  try { sn = localStorage.getItem('dai_alert_snooze') || ''; } catch (e) {}
  CHAT.alerts = (sn === cls + '|' + today) ? [] : computeAlerts(cls);
  if (!CHAT.alerts.length) { el.innerHTML = ''; return; }
  var open = CHAT.alertsOpen === null ? !CHAT.msgs.length : CHAT.alertsOpen;
  var sm = 'background:none;border:none;color:#a8a29e;font-size:13px;padding:2px 6px;cursor:pointer;';
  var rows = !open ? '' : CHAT.alerts.map(function (a, i) {
    return '<div style="display:flex;align-items:center;gap:6px;margin-top:7px;flex-wrap:wrap;"><span style="font-size:12px;color:#fde68a;flex:1;min-width:150px;line-height:1.7;">' + a.icon + ' ' + esc(a.text) + '</span>' +
      '<button onclick="DAI.alertDetail(' + i + ')" style="' + BTN + 'background:#78350f;color:#fef3c7;font-size:11px;padding:6px 10px;">تفاصيل</button>' +
      '<button onclick="DAI.alertAsk(' + i + ')" style="' + BTN + 'background:#312e81;color:#e0e7ff;font-size:11px;padding:6px 10px;">💡 ماذا أفعل؟</button></div>';
  }).join('');
  el.innerHTML = '<div style="background:#1c1917;border:1px solid #78350f;border-radius:12px;padding:8px 10px;margin-bottom:8px;">' +
    '<div style="display:flex;align-items:center;gap:4px;"><b style="font-size:12px;color:#fcd34d;">🔔 تنبيهات فصل ' + esc(cls) + ' (' + CHAT.alerts.length + ')</b><span style="flex:1"></span>' +
    '<button onclick="DAI.alertToggle()" style="' + sm + '" title="طيّ/فتح">' + (open ? '▴' : '▾') + '</button>' +
    '<button onclick="DAI.alertHide()" style="' + sm + '" title="إخفاء اليوم">✕</button></div>' + rows + '</div>';
}
function alertToggle() { CHAT.alertsOpen = !(CHAT.alertsOpen === null ? !CHAT.msgs.length : CHAT.alertsOpen); chatRenderAlerts(); }
function alertHide() {
  try { localStorage.setItem('dai_alert_snooze', ST.cls + '|' + new Date().toISOString().slice(0, 10)); } catch (e) {}
  chatRenderAlerts();
}
function alertDetail(i) {
  var a = CHAT.alerts[i]; if (!a) return;
  var r = runChatTool(a.tool);
  CHAT.msgs.push({ role: 'assistant', text: '🔔 ' + a.text + ' — هذه التفاصيل:', cls: ST.cls, tables: (r.tables || []).slice(0, 6) });
  CHAT.alertsOpen = false; chatSave(); render();
}
function alertAsk(i) {
  var a = CHAT.alerts[i]; if (!a) return;
  CHAT.alertsOpen = false;
  chatSend('بخصوص التنبيه «' + a.text + '» في فصل ' + ST.cls + ': ما التدخل المناسب؟ استخدم الأدوات اللازمة واقترح خطوات عملية قصيرة.');
}
/* نقطة حمراء على 🤖 بعدد التنبيهات */
function updateBadge() {
  var b = document.getElementById('daiTopBtn'); if (!b) return;
  var n = 0; try { n = computeAlerts(alertCls()).length; } catch (e) {}
  var d = document.getElementById('daiTopDot');
  if (!n) { if (d) d.remove(); return; }
  if (!d) {
    d = document.createElement('span'); d.id = 'daiTopDot';
    d.style.cssText = 'position:absolute;top:-5px;right:-4px;min-width:14px;height:14px;border-radius:7px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;line-height:14px;text-align:center;padding:0 3px;font-family:sans-serif;pointer-events:none;';
    b.appendChild(d);
  }
  d.textContent = n;
}

function chatSend(textIn) {
  if (CHAT.busy) return;
  var inp = document.getElementById('daiChatIn');
  var txt = String(textIn != null ? textIn : (inp ? inp.value : CHAT.draft) || '').trim();
  if (CHAT.imgs.length) { if (inp) { inp.value = ''; inp.style.height = ''; } chatSendImages(txt); return; }
  if (!txt) return;
  if (!ensureConsent()) return;
  if (CHAT.listening) chatMic();
  var hist = chatHistory();
  CHAT.msgs.push({ role: 'user', text: txt });
  CHAT.draft = ''; if (inp) { inp.value = ''; inp.style.height = ''; }
  CHAT.busy = true; CHAT.status = (cfgGet().route && chatTier(txt) === 'light') ? '⚡ أفكّر بسرعة…' : ''; chatSave(); chatRenderList();
  var cls = ST.cls, week = ST.week;
  var ctx = chatCatalog(cls, week) + '\n' + otherClassesLine(cls) + '\n\n' + schoolContext(cls, week) + '\n\n' + classDigest(cls, week) + '\n\n' + otherDigests(cls, week);
  var extra = '', tabs = [];
  /* يستدعي النموذج؛ وإن طلب بيانات فصل آخر (lookup) نضيفها ونعيد الاستدعاء (حد أقصى مرتان) */
  var run = function (round) {
    var content = [{ type: 'text', text: 'CONTEXT (fresh, authoritative):\n' + ctx + extra + '\n\nTeacher message (Arabic): ' + txt }];
    return callAI({ system: SYS_AGENT + prefsPrompt(), history: hist, content: content, maxTokens: 6000, schema: SCH_AGENT, tier: chatTier(txt) }).then(function (r) {
      var j = null;
      try { j = parseJSON(r.text); } catch (e) { j = null; }
      if (!j || typeof j !== 'object') {
        /* رد نصي عادي: نعرضه كما هو بدل الفشل */
        var plain = String(r.text || '').trim();
        if (!plain) throw new Error('BAD_JSON');
        return { reply: plain, ops: [], clarification: '' };
      }
      if (j.tool && typeof j.tool === 'object' && round < 5) {
        var tn = String(j.tool.name || '');
        CHAT.status = '🔧 ' + (TOOL_LABELS[tn] || 'أحسب') + '…'; chatRenderList();
        var tr = runChatTool(j.tool);
        tr.tables.forEach(function (t) { tabs.push(t); });
        extra += '\n\nTOOL RESULT (' + tn + '):\n' + tr.text;
        return run(round + 1);
      }
      var lk = j.lookup;
      if (lk && typeof lk === 'object' && round < 2) {
        var lc = String(lk.class || lk.cls || '').trim();
        if ((DB.classes || []).indexOf(lc) >= 0) {
          var lw = clampWeek(lk.week, week);
          CHAT.status = '🔍 أراجع بيانات ' + lc + '…'; chatRenderList();
          extra += '\n\nEXTRA DATA requested by you — class ' + lc + ' (you may target this class in ops with "class"):\n' + classDigest(lc, lw);
        } else {
          extra += '\n\n(lookup failed: there is no class named "' + lc + '". Exact names: ' + (DB.classes || []).join(' | ') + ')';
        }
        return run(round + 1);
      }
      return j;
    });
  };
  run(0).then(function (j) {
    if (!ST) return;
    var ops = Array.isArray(j.ops) ? j.ops : [];
    var m = { role: 'assistant', text: String(j.reply || '').trim(), clar: String(j.clarification || '').trim(), cls: cls, nav: validPage(String(j.navigate || '').trim()) };
    if (ops.length) {
      var gm = {}, order = [];
      ops.forEach(function (op) {
        var oc = (op && typeof op['class'] === 'string' && (DB.classes || []).indexOf(op['class']) >= 0) ? op['class'] : cls;
        if (!gm[oc]) { gm[oc] = []; order.push(oc); }
        gm[oc].push(op);
      });
      m.groups = order.map(function (oc) { return { cls: oc, plan: planFromOps(oc, gm[oc], { week: week }) }; });
      m.summary = String(j.summary || '').trim() || '';
      m.state = 'pending';
      if (!m.text) m.text = 'جهّزتُ التعديلات التالية للمراجعة:';
    }
    var pf = prefApplyFromModel(j, txt);
    if (pf.saved.length) m.prefNote = '🧠 حفظتُ في ذاكرتك: ' + pf.saved.join(' — ');
    else if (pf.forgot) m.prefNote = '🧠 حذفتُ ' + pf.forgot + ' من تفضيلاتك المحفوظة';
    if (tabs.length) m.tables = tabs.slice(0, 6);
    if (!m.text && !m.clar && !m.tables && !m.prefNote) m.text = 'لم أجد ما أضيفه. أعد الصياغة من فضلك.';
    CHAT.msgs.push(m);
  }).catch(function (e) {
    CHAT.msgs.push({ role: 'assistant', text: errMsg(e), err: true });
  }).then(function () {
    CHAT.busy = false; CHAT.status = '';
    var oo = ov(); if (oo && oo.style.display === 'none') { CHAT.unread = true; if (miniEl()) showMini(); }
    chatSave();
    if (ST && ST.view === 'chat') chatRenderList();
  });
}
function chatGo(i) {
  var m = CHAT.msgs[i]; if (!m || !m.nav) return;
  var pg = m.nav;
  closeAI();
  try { if (typeof switchPage === 'function') switchPage(pg); } catch (e) {}
}
function planCount(m) {
  var n = 0;
  (m.groups || []).forEach(function (g) { var p = g.plan; n += p.cells.length + p.abs.length + p.add.length + (p.extra || []).length; });
  return n;
}
function refreshHead() { if (ST && ST.view === 'chat') head('🧠 المحادثة الذكية', true); }
/* ═════ التحقق بعد التطبيق: نقرأ البيانات الفعلية من القاعدة ونقارنها بما خُطِّط له ═════ */
function verifyGroups(groups) {
  var tot = 0, ok = 0, bad = [], extras = 0;
  (groups || []).forEach(function (g) {
    var arr = DB.data[g.cls] || [], p = g.plan;
    function byId(id) { for (var k = 0; k < arr.length; k++) if (String(arr[k].id) === String(id)) return arr[k]; return null; }
    (p.cells || []).forEach(function (c) {
      tot++;
      var st = byId(c.id), cur = st ? st[c.key] : undefined;
      var want = hasData(c.nu) ? String(c.nu) : '', got = hasData(cur) ? String(cur) : '';
      if (st && want === got) ok++;
      else bad.push((st ? (st.name || '').trim() : '؟') + ' — ' + labelFor(c.key) + ': المتوقع ' + fmtVal(c.nu) + '، الموجود ' + fmtVal(cur));
    });
    (p.abs || []).forEach(function (a) {
      tot++;
      var st = byId(a.id), cur = st ? (getStudentAbsences(g.cls, st.id)['w' + a.week + '_ci' + a.ci] || '') : null;
      if (st && cur === (a.nu || '')) ok++;
      else bad.push((st ? (st.name || '').trim() : '؟') + ' — غياب أسبوع ' + a.week + ' حصة ' + (a.ci + 1) + ': لم يُسجَّل كما هو متوقع');
    });
    (p.add || []).forEach(function (name) {
      tot++;
      if (arr.some(function (x) { return normAr(x.name) === normAr(name); })) ok++;
      else bad.push('الطالب «' + name + '» لم يُضَف');
    });
    extras += (p.extra || []).length;
  });
  return { tot: tot, ok: ok, bad: bad.slice(0, 6), extras: extras };
}
function chatShow(i) {
  var m = CHAT.msgs[i]; if (!m) return;
  var g = (m.groups && m.groups[0]) || null;
  var cls = (g && g.cls) || m.cls || ST.cls;
  var hasCells = !!(g && m.groups.some(function (x) { return x.plan.cells.length; }));
  var abG = g && m.groups.filter(function (x) { return x.plan.abs.length; })[0];
  var page = (!hasCells && abG) ? 'absence' : 'grades';
  try {
    if (typeof GS !== 'undefined') GS.activeClass = cls;
    if (typeof AS !== 'undefined') { AS.activeClass = cls; if (abG) AS.activeWeek = abG.plan.abs[0].week; }
    if (typeof WKS !== 'undefined') WKS.activeClass = cls;
  } catch (e) {}
  minimizeAI();
  try { if (typeof switchPage === 'function') switchPage(page); } catch (e) {}
}
function chatApply(i) {
  var m = CHAT.msgs[i]; if (!m || !m.groups || m.state !== 'pending') return;
  var label0 = m.summary || ('محادثة: ' + (CHAT.msgs[i - 1] ? CHAT.msgs[i - 1].text : '').slice(0, 40));
  var ts = [], failed = '';
  m.groups.forEach(function (g) {
    if (failed) return;
    var r = applyPlan(g.cls, g.plan, m.groups.length > 1 ? label0 + ' (' + g.cls + ')' : label0);
    if (!r.ok) failed = g.cls + ': ' + r.msg; else ts.push(r.t);
  });
  m.undoTs = ts;
  if (failed) {
    alert(failed + (ts.length ? '\nطُبِّق جزء من التعديلات قبل التوقف — يمكنك التراجع عنه.' : ''));
    if (!ts.length) { chatRenderList(); return; }
  }
  m.state = 'applied';
  try { m.verify = verifyGroups(m.groups); } catch (e) { m.verify = null; }
  if (typeof showSnack === 'function') showSnack(m.verify && m.verify.bad.length ? '⚠️ طُبِّقت التعديلات مع اختلافات — راجع التحقق' : '✅ تم التنفيذ والتحقق من ' + (m.verify ? m.verify.ok : 0) + ' تغيير');
  chatSave(); refreshHead(); chatRenderList();
}
function chatDismiss(i) { var m = CHAT.msgs[i]; if (m && m.state === 'pending') { m.state = 'dismissed'; chatSave(); chatRenderList(); } }
function chatUndo(i) {
  var m = CHAT.msgs[i]; if (!m || m.state !== 'applied') return;
  var ts = (m.undoTs || []).slice().reverse();
  for (var k = 0; k < ts.length; k++) {
    var top = undoStack[undoStack.length - 1];
    if (!top || top.t !== ts[k]) { if (typeof showSnack === 'function') showSnack('⚠️ تراجع أولاً عن العمليات الأحدث'); chatRenderList(); return; }
    undoLast();
  }
  m.state = 'undone';
  if (typeof showSnack === 'function') showSnack('↩ تم التراجع');
  chatSave(); refreshHead(); chatRenderList();
}
function chatCopy(i) { var m = CHAT.msgs[i]; if (m) copyTextToClipboard(m.text + (m.clar ? '\n' + m.clar : '') + (m.tables ? '\n\n' + chatTablesText(m) : '')); }
function chatClear() { CHAT.msgs = []; CHAT.draft = ''; chatSave(); viewChat(); }
function chatMic() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { if (typeof showSnack === 'function') showSnack('⚠️ المتصفح لا يدعم الإدخال الصوتي — استخدم Chrome'); return; }
  if (CHAT.listening && CHAT.rec) { try { CHAT.rec.stop(); } catch (e) {} CHAT.listening = false; var b0 = document.getElementById('daiMicBtn'); if (b0) b0.style.background = '#0f766e'; return; }
  var rec = new SR(); CHAT.rec = rec;
  rec.lang = 'ar-EG'; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onresult = function (ev) {
    var t = ''; for (var k = 0; k < ev.results.length; k++) t += ev.results[k][0].transcript + ' ';
    t = t.trim(); if (!t) return;
    CHAT.listening = false;
    var inp = document.getElementById('daiChatIn');
    if (inp) inp.value = t; CHAT.draft = t;
    chatSend(t);
  };
  rec.onerror = function (ev) {
    CHAT.listening = false;
    var b1 = document.getElementById('daiMicBtn'); if (b1) b1.style.background = '#0f766e';
    var msg = ev && ev.error === 'not-allowed' ? 'اسمح للمتصفح باستخدام الميكروفون' : (ev && ev.error === 'no-speech' ? 'لم أسمع شيئاً' : 'تعذّر الإدخال الصوتي');
    if (typeof showSnack === 'function') showSnack('⚠️ ' + msg);
  };
  rec.onend = function () { CHAT.listening = false; var b2 = document.getElementById('daiMicBtn'); if (b2) b2.style.background = '#0f766e'; };
  try { rec.start(); CHAT.listening = true; var b3 = document.getElementById('daiMicBtn'); if (b3) b3.style.background = '#dc2626'; }
  catch (e) { CHAT.listening = false; }
}

/* ═════════════ أدوات الصورة: تدوير + تحسين الوضوح ═════════════ */
function imgXform(i, kind) {
  var im = ST.imgs[i]; if (!im) return;
  var img = new Image();
  img.onload = function () {
    var w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'), x;
    if (kind === 'rot') {
      c.width = h; c.height = w; x = c.getContext('2d');
      x.translate(h, 0); x.rotate(Math.PI / 2); x.drawImage(img, 0, 0);
    } else {
      c.width = w; c.height = h; x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      /* تدرّج رمادي + تمطيط التباين (1%–99%) ليظهر الحبر الباهت */
      var d = x.getImageData(0, 0, w, h), px = d.data, hist = new Array(256).fill(0), k, g;
      for (k = 0; k < px.length; k += 4) { g = (px[k] * 0.3 + px[k + 1] * 0.59 + px[k + 2] * 0.11) | 0; px[k] = g; hist[g]++; }
      var tot = w * h, lo = 0, hi = 255, acc = 0;
      for (k = 0; k < 256; k++) { acc += hist[k]; if (acc >= tot * 0.01) { lo = k; break; } }
      acc = 0; for (k = 255; k >= 0; k--) { acc += hist[k]; if (acc >= tot * 0.01) { hi = k; break; } }
      if (hi <= lo + 10) { lo = 0; hi = 255; }
      var sc = 255 / (hi - lo);
      for (k = 0; k < px.length; k += 4) {
        g = Math.max(0, Math.min(255, ((px[k] - lo) * sc) | 0));
        px[k] = px[k + 1] = px[k + 2] = g;
      }
      x.putImageData(d, 0, 0);
    }
    var du = c.toDataURL('image/jpeg', 0.88);
    ST.imgs[i] = { dataUrl: du, b64: du.split(',')[1], name: im.name };
    if (ST && ST.view === 'input') render();
  };
  img.src = im.dataUrl;
}

/* ═════════════ لوحة الصورة داخل المراجعة (للمقارنة دون مغادرة التطبيق) ═════════════ */
var PANE_H = [26, 38, 52], PANE_Z = [100, 150, 200, 300, 400, 500];
function paneState() { if (!ST.pane) ST.pane = { open: true, idx: 0, zoom: 100, h: 38, sx: 0, sy: 0 }; return ST.pane; }
function paneHtml() {
  if (!ST || !ST.imgs || !ST.imgs.length) return '';
  var p = paneState(); if (p.idx >= ST.imgs.length) p.idx = 0;
  var sb = 'background:#1e293b;color:#93c5fd;font-size:12px;padding:6px 11px;flex-shrink:0;';
  var bar = '<div style="display:flex;gap:5px;align-items:center;overflow-x:auto;margin-bottom:5px;"><button onclick="DAI.paneToggle()" style="' + BTN + sb + '">🖼 الصورة ' + (p.open ? '▴' : '▾') + '</button>';
  if (p.open) {
    if (ST.imgs.length > 1) bar += ST.imgs.map(function (im, i) { return '<button onclick="DAI.paneImg(' + i + ')" style="' + BTN + sb + (i === p.idx ? 'background:#4338ca;color:#fff;' : '') + '">' + (i + 1) + '</button>'; }).join('');
    bar += '<button onclick="DAI.paneZoomBy(-1)" style="' + BTN + sb + '" title="تصغير">➖</button><button onclick="DAI.paneZoomBy(1)" style="' + BTN + sb + '" title="تكبير">➕</button>' +
      '<button onclick="DAI.paneFit()" style="' + BTN + sb + '" title="ملاءمة العرض">⤢</button><button onclick="DAI.paneSize()" style="' + BTN + sb + '" title="ارتفاع الصورة">↕</button>';
  }
  bar += '</div>';
  var view = '';
  if (p.open) view = '<div id="daiImgView" onscroll="DAI.paneScroll(this)" style="height:' + p.h + 'vh;overflow:auto;background:#000;border:1px solid #334155;border-radius:10px;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;">' +
    '<div id="daiImgInner" style="position:relative;width:' + p.zoom + '%;"><img src="' + ST.imgs[p.idx].dataUrl + '" draggable="false" style="width:100%;display:block;user-select:none;-webkit-user-select:none;">' +
    '<div id="daiImgHi" style="position:absolute;left:0;right:0;display:none;background:rgba(250,204,21,.28);border-top:2px solid #facc15;border-bottom:2px solid #facc15;pointer-events:none;"></div></div></div>';
  return '<div id="daiImgPane" style="position:sticky;top:-12px;z-index:6;background:#0f172a;padding:4px 0 6px;margin-bottom:8px;border-bottom:1px solid #1e293b;">' + bar + view + '</div>';
}
function paneSetZoom(z) {
  var p = paneState(), v = document.getElementById('daiImgView'), n = document.getElementById('daiImgInner');
  z = Math.max(100, Math.min(500, Math.round(z)));
  if (v && n) {
    var fx = (v.scrollLeft + v.clientWidth / 2) / (n.scrollWidth || 1), fy = (v.scrollTop + v.clientHeight / 2) / (n.scrollHeight || 1);
    n.style.width = z + '%';
    v.scrollLeft = fx * n.scrollWidth - v.clientWidth / 2; v.scrollTop = fy * n.scrollHeight - v.clientHeight / 2;
    p.sx = v.scrollLeft; p.sy = v.scrollTop;
  }
  p.zoom = z;
}
function paneBind() {
  var v = document.getElementById('daiImgView'); if (!v || !ST) return;
  var p = paneState(); v.scrollLeft = p.sx || 0; v.scrollTop = p.sy || 0;
  var d0 = 0, z0 = 100;
  var dist = function (t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); };
  v.addEventListener('touchstart', function (e) { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = paneState().zoom; } }, { passive: true });
  v.addEventListener('touchmove', function (e) { if (e.touches.length === 2 && d0) { e.preventDefault(); paneSetZoom(z0 * dist(e.touches) / d0); } }, { passive: false });
  v.addEventListener('touchend', function () { d0 = 0; }, { passive: true });
  v.addEventListener('dblclick', function () { paneSetZoom(paneState().zoom > 100 ? 100 : 250); });
}
function paneRedraw() { var el = document.getElementById('daiImgPane'); if (el) { el.outerHTML = paneHtml(); paneBind(); } reviewSave(); }
function paneLocate(i) {
  var r = ST && ST.tbl && ST.tbl.rows[i]; if (!r || typeof r.y !== 'number') return;
  var p = paneState(), changed = !p.open || (r.img < ST.imgs.length && r.img !== p.idx);
  p.open = true; if (r.img < ST.imgs.length) p.idx = r.img;
  if (changed || !document.getElementById('daiImgView')) paneRedraw();
  if (p.zoom < 200) paneSetZoom(220);
  var v = document.getElementById('daiImgView'), n = document.getElementById('daiImgInner'), hi = document.getElementById('daiImgHi'); if (!v || !n) return;
  v.scrollTop = r.y * n.scrollHeight - v.clientHeight / 2; p.sy = v.scrollTop;
  if (hi) {
    hi.style.top = Math.max(0, r.y - 0.02) * 100 + '%'; hi.style.height = '4%'; hi.style.display = 'block';
    clearTimeout(paneLocate._t); paneLocate._t = setTimeout(function () { var h2 = document.getElementById('daiImgHi'); if (h2) h2.style.display = 'none'; }, 6000);
  }
}

/* ═════════════ حفظ المراجعة: لو أُعيد تحميل التطبيق (مثلاً بعد فتح الصورة في المعرض) تعود كما كانت ═════════════ */
var RV_KEY = 'dalty_ai_review_v1';
function idb() { return new Promise(function (res, rej) { try { var q = indexedDB.open('dalty_ai', 1); q.onupgradeneeded = function () { q.result.createObjectStore('kv'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; } catch (e) { rej(e); } }); }
function idbSet(k, v) { return idb().then(function (db) { return new Promise(function (res) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }); }).catch(function () { return false; }); }
function idbGet(k) { return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction('kv', 'readonly').objectStore('kv').get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
function idbDel(k) { return idb().then(function (db) { return new Promise(function (res) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }); }).catch(function () { return false; }); }
function reviewSave() {
  try {
    if (!ST || (ST.view !== 'reviewTable' && ST.view !== 'reviewNames')) return;
    localStorage.setItem(RV_KEY, JSON.stringify({ t: Date.now(), view: ST.view, mode: ST.mode, cls: ST.cls, week: ST.week, note: ST.note, opts: ST.opts, names: ST.names, gdef: ST.gdef, tbl: ST.tbl, pane: ST.pane, rvf: ST.rvf, colsOpen: ST.colsOpen }));
    if (ST.imgs && ST._imgsSaved !== ST.imgs) {
      ST._imgsSaved = ST.imgs;
      idbSet('review_imgs', ST.imgs.map(function (im) { return { dataUrl: im.dataUrl, name: im.name }; }));
    }
  } catch (e) {}
}
function reviewClear() { try { localStorage.removeItem(RV_KEY); } catch (e) {} idbDel('review_imgs'); }
function reviewRestore() {
  var o = null; try { o = JSON.parse(localStorage.getItem(RV_KEY) || 'null'); } catch (e) {}
  if (!o) return;
  if (Date.now() - (o.t || 0) > 12 * 3600 * 1000 || (o.view !== 'reviewTable' && o.view !== 'reviewNames')) { reviewClear(); return; }
  var tries = 0;
  (function wait() {
    if (ST) return;
    if (window.DB && DB.classes && DB.classes.length && document.body) {
      if (DB.classes.indexOf(o.cls) < 0) { reviewClear(); return; }
      idbGet('review_imgs').then(function (arr) {
        if (ST) return;
        open();
        if (!ST) return;
        ST.mode = o.mode; ST.cls = o.cls; ST.week = o.week || ST.week; ST.note = o.note || '';
        if (o.opts) ST.opts = o.opts; if (o.names) ST.names = o.names; if (o.gdef) ST.gdef = o.gdef;
        ST.tbl = o.tbl || null; ST.pane = o.pane || null; ST.rvf = o.rvf; ST.colsOpen = o.colsOpen; ST.rvKeep = {};
        ST.imgs = (arr || []).map(function (im) { return { dataUrl: im.dataUrl, b64: String(im.dataUrl).split(',')[1], name: im.name }; });
        ST._imgsSaved = ST.imgs;
        if (o.view === 'reviewTable' && !ST.tbl) { ST.view = 'chat'; render(); return; }
        ST.view = o.view; render();
        if (typeof showSnack === 'function') showSnack('↩️ استُعيد تحليلك السابق — لم يُطبَّق منه شيء بعد');
      });
    } else if (tries++ < 40) setTimeout(wait, 500);
  })();
}

/* ═════════════ تصغير المساعد + حفظ المحادثة + تراجع سريع ═════════════ */
var AI_OPEN = false;
var CHAT_STORE = 'dalty_ai_chat_v1';
function miniEl() { return document.getElementById('daiMini'); }
function hideMini() { var e = miniEl(); if (e) e.remove(); }
function showMini() {
  hideMini();
  var dk = document.getElementById('mobileDock'), dh = (dk && dk.offsetHeight) ? dk.offsetHeight : 0;
  var u = undoStack[undoStack.length - 1];
  var d = document.createElement('div');
  d.id = 'daiMini';
  d.style.cssText = 'position:fixed;right:10px;bottom:' + (dh + 10) + 'px;z-index:100040;display:flex;gap:6px;align-items:center;direction:rtl;font-family:inherit;background:#0f172a;border:1px solid #334155;border-radius:999px;padding:5px 6px;box-shadow:0 4px 18px rgba(0,0,0,.55);max-width:calc(100vw - 20px);';
  d.innerHTML = '<button onclick="DAI.restore()" style="' + BTN + 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:8px 12px;font-size:12px;border-radius:999px;white-space:nowrap;">🧠 المساعد' + (CHAT.unread ? ' 🔴' : '') + '</button>' +
    (u ? '<button onclick="DAI.undoBar()" title="تراجع عن آخر تعديل" style="' + BTN + 'background:rgba(251,191,36,.15);border:1px solid #d97706;color:#fcd34d;padding:7px 10px;font-size:11px;border-radius:999px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;">↩ تراجع: ' + esc(String(u.label || '').slice(0, 22)) + '</button>' : '') +
    '<button onclick="DAI.close()" title="إغلاق" style="' + BTN + 'background:none;color:#f87171;font-size:15px;padding:4px 7px;">✕</button>';
  document.body.appendChild(d);
}
function minimizeAI() {
  var o = ov(); if (!o || !ST) return;
  if (CHAT.listening) { try { chatMic(); } catch (e) {} }
  o.style.display = 'none';
  showMini();
}
function restoreAI() {
  var o = ov();
  if (!o) { open('chat'); return; }
  o.style.display = 'flex'; hideMini(); CHAT.unread = false; render();
}
function undoBar() {
  var u = undoLast(); if (!u) return;
  CHAT.msgs.forEach(function (m) {
    if (m.state === 'applied' && m.undoTs && m.undoTs.length &&
        m.undoTs.every(function (t) { return !undoStack.some(function (x) { return x.t === t; }); })) m.state = 'undone';
  });
  chatSave();
  if (typeof showSnack === 'function') showSnack('↩ تم التراجع عن: ' + u.label);
  var o = ov();
  if (o && o.style.display !== 'none' && ST) render(); else if (miniEl()) showMini();
}
/* حفظ المحادثة على الجهاز ليستمر عملك بعد التنقل بين التطبيقات (تنتهي صلاحيتها بعد 24 ساعة) */
function chatSave() {
  try {
    var keep = CHAT.msgs.slice(-40).map(function (m) {
      var o = { role: m.role, text: m.text || '' };
      if (m.clar) o.clar = m.clar;
      if (m.err) o.err = 1;
      if (m.nav) o.nav = m.nav;
      if (m.cls) o.cls = m.cls;
      if (m.summary) o.summary = m.summary;
      if (m.prefNote) o.prefNote = m.prefNote;
      if (m.tables) o.tables = m.tables;
      if (m.groups || m.hadPlan) { o.hadPlan = 1; o.state = m.state; if (m.verify) o.verify = m.verify; }
      return o;
    });
    localStorage.setItem(CHAT_STORE, JSON.stringify({ t: Date.now(), open: AI_OPEN, draft: CHAT.draft || '', msgs: keep }));
  } catch (e) {}
}
function chatRestore() {
  try {
    var o = JSON.parse(localStorage.getItem(CHAT_STORE) || 'null');
    if (!o || !Array.isArray(o.msgs) || Date.now() - (o.t || 0) > 24 * 3600 * 1000) return false;
    CHAT.msgs = o.msgs.map(function (m) { if (m.hadPlan && m.state === 'pending') m.state = 'expired'; return m; });
    CHAT.draft = String(o.draft || '');
    return !!o.open;
  } catch (e) { return false; }
}
document.addEventListener('visibilitychange', function () { if (document.hidden) { chatSave(); reviewSave(); } });
window.addEventListener('pagehide', function () { chatSave(); reviewSave(); });
/* الضغط على شريط الأيقونات السفلي أثناء فتح المساعد يصغّره لتتابع الصفحة */
document.addEventListener('click', function (e) {
  var o = ov(); if (!o || o.style.display === 'none') return;
  if (e.target && e.target.closest && e.target.closest('#mobileDock')) minimizeAI();
}, true);

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
  rotImg: function (i) { imgXform(i, 'rot'); }, enhImg: function (i) { imgXform(i, 'enh'); },
  note: function (v) { ST.note = v; },
  analyze: analyze,
  setRowStu: function (i, v) { var rr = ST.tbl.rows[i]; rr.idx = parseInt(v, 10); rr.conf = 'high'; rr.nameUnsure = false; render(); },
  setColCi: function (j, v) { ST.tbl.cols[j].ci = (v === 'x') ? null : parseInt(v, 10); render(); },
  setColType: function (j, v) { ST.tbl.cols[j].type = v; render(); },
  setColWeek: function (j, v) { ST.tbl.cols[j].week = parseInt(v, 10) || 1; render(); },
  mark: function (i, j) {
    ST.rvKeep = ST.rvKeep || {}; ST.rvKeep[i] = 1;
    var c = ST.tbl.rows[i].cells, o = { absent: 'present', present: 'unknown', unknown: 'absent' };
    c[j] = o[c[j]] || 'absent'; if (ST.tbl.rows[i].doubt) delete ST.tbl.rows[i].doubt[j]; render();
  },
  cell: function (i, j, v) { ST.tbl.rows[i].cells[j] = v; if (ST.tbl.rows[i].doubt) delete ST.tbl.rows[i].doubt[j]; updateSummary(); },
  opt: function (k, v) { ST.opts[k] = !!v; updateSummary(); },
  applyTable: applyTable,
  namesText: function (v) { ST.names.text = v; reviewSave(); namesSummary(); },
  namesMode: function (m) { ST.names.mode = m; namesSummary(); },
  namesStart: function (v) { ST.names.start = Math.max(1, parseInt(v, 10) || 1); namesSummary(); },
  namesDup: function (b) { ST.names.skipDup = !!b; namesSummary(); },
  applyNames: applyNames,
  cmdText: function (v) { ST.cmd.text = v; },
  example: function (i) { ST.cmd.text = EXAMPLES[i]; render(); },
  runCmd: runCmd, applyCmd: applyCmd,
  saveCfg: function () { saveCfg(false); }, testCfg: testCfg, delKey: delKey,
  pasteKey: pasteKey,
  repScope: function (v) { ST.repAll = (v === '__all__'); if (!ST.repAll) ST.cls = v; },
  setWeekQuiet: function (v) { ST.week = parseInt(v, 10) || 1; },
  repPreset: function (i) { var sp = ST.presets[i].s(); if (sp) showReport(sp); },
  repText: function (v) { ST.repTxt = v; },
  repExample: function (i) { ST.repTxt = REP_EXAMPLES[i]; viewRep(); },
  repAnalyze: repAnalyze,
  rs: repSet,
  repCopy: function () { copyTextToClipboard(repText(ST.rep.res)); },
  repExcel: function () { repExcel(ST.rep.res); },
  repPrint: function () { repPrint(ST.rep.res, ST.rep.write); },
  repWrite: repWrite,
  repWriteEdit: function (v) { ST.rep.write = v; },
  repCopyWrite: function () { copyTextToClipboard(ST.rep.write); },
  setProv: function (p) { if (!ST.sets) ST.sets = cfgGet(); ST.sets.provider = p; render(); },
  setSet: function (k, v) { if (!ST.sets) ST.sets = cfgGet(); ST.sets[k] = v; },
  chatSend: function () { chatSend(); }, chatChip: function (i) { chatSend(CHAT_CHIPS[i]); },
  chatDraft: function (v) { CHAT.draft = v; }, chatMic: chatMic, chatClear: chatClear,
  prefAddUi: function () { var el = document.getElementById('daiPrefIn'); if (!el) return; if (prefAdd(el.value)) prefRefresh(); else { el.value = ''; if (typeof showSnack === 'function') showSnack('⚠️ التفضيل فارغ أو مكرر'); } },
  prefDel: function (i) { var o = prefsGet(); o.items.splice(i, 1); prefsSet(o); prefRefresh(); },
  prefToggle: function (v) { var o = prefsGet(); o.on = !!v; prefsSet(o); },
  prefPreset: function (i) { if (PREF_PRESETS[i]) { prefAdd(PREF_PRESETS[i]); prefRefresh(); } },
  prefClear: function () { if (confirm('مسح كل التفضيلات المحفوظة؟')) { prefsSet({ on: prefsGet().on, items: [] }); prefRefresh(); } },
  rvFilter: function (k) { ST.rvf = k; ST.rvKeep = {}; ST._lv = null; render(); },
  colsOpen: function (v) { ST.colsOpen = !!v; reviewSave(); },
  paneToggle: function () { var p = paneState(); p.open = !p.open; paneRedraw(); },
  paneImg: function (i) { var p = paneState(); p.idx = i; p.sx = 0; p.sy = 0; paneRedraw(); },
  paneZoomBy: function (d) { var p = paneState(), k = 0, j; for (j = 0; j < PANE_Z.length; j++) if (PANE_Z[j] <= p.zoom) k = j; k = Math.max(0, Math.min(PANE_Z.length - 1, k + d)); paneSetZoom(PANE_Z[k]); reviewSave(); },
  paneFit: function () { paneSetZoom(100); var v = document.getElementById('daiImgView'); if (v) { v.scrollTop = 0; v.scrollLeft = 0; } reviewSave(); },
  paneSize: function () { var p = paneState(), k = PANE_H.indexOf(p.h); p.h = PANE_H[(k + 1) % PANE_H.length]; paneRedraw(); },
  paneScroll: function (el) { var p = paneState(); p.sx = el.scrollLeft; p.sy = el.scrollTop; },
  locate: paneLocate,
  alertToggle: alertToggle, alertHide: alertHide, alertDetail: alertDetail, alertAsk: alertAsk,
  chatFiles: chatAddFiles, chatRmImg: function (i) { CHAT.imgs.splice(i, 1); chatRenderAtt(); }, chatKind: function (k) { CHAT.imgKind = (CHAT.imgKind === k ? '' : k); CHAT.attHint = ''; chatRenderAtt(); },
  chatGo: chatGo, chatTableXls: chatTableXls, chatMdXls: chatMdXls, chatTablePdf: chatTablePdf, chatMdPdf: chatMdPdf, minimize: minimizeAI, restore: restoreAI, undoBar: undoBar, chatApply: chatApply, chatShow: chatShow, chatDismiss: chatDismiss, chatUndo: chatUndo, chatCopy: chatCopy,
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
  b.style.cssText = 'background:none;border:none;font-size:17px;cursor:pointer;padding:0 2px;line-height:1;position:relative;';
  b.onclick = function () { open(); };
  area.insertBefore(b, area.firstChild);
  return true;
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && ov() && ov().style.display !== 'none') minimizeAI();
});
(function () { if (chatRestore()) { AI_OPEN = true; setTimeout(function () { if (!ST) showMini(); }, 900); } })();
reviewRestore();
var tries = 0;
(function tryMount() { if (!mountButton()) { if (tries++ < 40) setTimeout(tryMount, 500); } else { setTimeout(updateBadge, 2500); } })();
setInterval(function () { try { updateBadge(); } catch (e) {} }, 120000);

})();
