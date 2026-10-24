/* ═══════════════════════════════════════════════════════════════════
   REPORTS v2 — مركز التقارير (Dalty Grades)
   ───────────────────────────────────────────────────────────────────
   • مصدر حساب واحد: calcStudent / recordedMax (نفس أرقام صفحة الدرجات).
   • كل تقرير يُبنى كنموذج بيانات واحد ← شاشة + طباعة + Excel بنفس الأرقام.
   • حدود النجاح والغياب قابلة للضبط (⚙️) وتُحفظ في DB.meta.repCfg.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var RP = { cls: null, prev: null, view: 'dash', si: null, miss: 'a', fuF: 'all', sort: {}, last: null };

/* ── الإعدادات الافتراضية ── */
var DEF = { pass: 50, excel: 85, absWatch: 3, absAlert: 6, drop: 15 };
var LAB  = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول'];
var LCOL = ['#10b981', '#3b82f6', '#f59e0b', '#f97316'];
var FAIL = '#ef4444', GREY = '#64748b';

function $(id) { return document.getElementById(id); }
function E(s) { return esc(s); }
function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }

function cfg() {
  var c = (DB && DB.meta && DB.meta.repCfg) || {}, o = {};
  Object.keys(DEF).forEach(function (k) {
    var n = Number(c[k]);
    o[k] = (c[k] === '' || c[k] == null || isNaN(n)) ? DEF[k] : n;
  });
  o.pass = cl(o.pass, 30, 60);
  o.excel = cl(o.excel, 75, 100);
  o.absWatch = Math.max(1, Math.round(o.absWatch));
  o.absAlert = Math.max(o.absWatch + 1, Math.round(o.absAlert));
  o.drop = cl(o.drop, 5, 40);
  return o;
}

/* سلّم المستويات: نفس مسميات التطبيق (85/70/55) مع جعل «حد النجاح» أدنى مستوى ناجح */
function levels(c) {
  var mins = [c.excel, 70, 55].filter(function (x) { return x > c.pass; });
  mins.push(c.pass);
  var out = mins.map(function (m, i) { return { min: m, label: LAB[i], color: LCOL[i] }; });
  out.push({ min: -1, label: 'راسب', color: FAIL });
  return out;
}
function lvl(p, c) {
  if (p == null) return { label: '—', color: GREY, min: 0 };
  var L = levels(c);
  for (var i = 0; i < L.length; i++) if (p >= L[i].min) return L[i];
  return L[L.length - 1];
}

/* ── أدوات عددية ── */
function mean(a) {
  var s = 0, n = 0;
  a.forEach(function (x) { if (x != null && !isNaN(x)) { s += x; n++; } });
  return n ? s / n : null;
}
function f1(x) { return x == null ? '—' : String(Math.round(x * 10) / 10); }
function f0(x) { return x == null ? '—' : String(Math.round(x)); }
function pcs(x) { return x == null ? '—' : Math.round(x) + '%'; }
function sgn(x, suf) { return x == null ? '—' : (x > 0 ? '+' : '') + f1(x) + (suf || ''); }

/* قراءة خلية درجة بنفس منطق calcStudent: فراغ / م (معفى) / غ (غياب=صفر) / رقم */
function cell(v, max) {
  if (v === '' || v === undefined || v === null) return { st: 'blank', v: null };
  if (v === 'م') return { st: 'exc', v: null };
  if (v === 'غ') return { st: 'abs', v: 0 };
  var n = Number(v);
  if (isNaN(n)) return { st: 'blank', v: null };
  return { st: 'v', v: Math.max(0, Math.min(n, max)) };
}

/* ═══════════════ النموذج الموحّد للفصل ═══════════════ */
function buildModel(cls, C) {
  var weeks = _getActiveWeeks();
  var cols = {};
  allCols().forEach(function (c) { cols[c.id] = c; });
  function cmax(id, d) { var c = cols[id]; return c && Number(c.max) > 0 ? Number(c.max) : d; }
  function cvis(id) { var c = cols[id]; return !c || !!c.visible; }   // calcStudent يتجاهل الأعمدة المخفية
  var AM = cmax('a1', 20), HM = cmax('h1', 10), BM = cmax('bw1', 10), EM = [cmax('ex1', 15), cmax('ex2', 15)];
  var exMode = (DB.meta && DB.meta.examAbsenceMode) || 'zero';
  var rm = recordedMax(cls);
  var cw = {
    a: weeks.filter(function (w) { return cvis('a' + w); }),
    h: weeks.filter(function (w) { return cvis('h' + w); }),
    b: weeks.slice()
  };
  var m = { cls: cls, weeks: weeks, AM: AM, HM: HM, BM: BM, EM: EM, rm: rm, cfg: C, cw: cw, rows: [] };
  var maxAbsWeek = 0;

  (DB.data[cls] || []).forEach(function (s, si) {
    if (!s || !s.name || !String(s.name).trim()) return;
    var r = { s: s, si: si, id: s.id, name: String(s.name).trim(), cls: cls, all: !!s._totalAbsent };
    var c = calcStudent(s, cls);
    r.calc = c;
    r.fu = (DB.follow && DB.follow[cls] && DB.follow[cls][s.id]) || null;   // سجل المتابعة {d:تاريخ, n:سبب/ملاحظة}
    r.total = c.total;
    r.hasBeh = typeof c.avgBeh === 'number';
    r.pct = r.all ? null : (rm > 0 ? c.total / rm * 100 : 0);
    r.w = { a: {}, h: {}, b: {} };
    cw.a.forEach(function (w) { r.w.a[w] = cell(s['a' + w], AM); });
    cw.h.forEach(function (w) { r.w.h[w] = cell(s['h' + w], HM); });
    cw.b.forEach(function (w) { r.w.b[w] = cell(s['bw' + w], BM); });
    r.ex = [cell(s.ex1, EM[0]), cell(s.ex2, EM[1])];
    /* الغياب والمرض (يُقرأ مباشرة دون إنشاء كائنات في DB) */
    r.abs = 0; r.sick = 0; r.absW = {};
    var am = (DB.absences && DB.absences[cls] && DB.absences[cls][s.id]) || {};
    Object.keys(am).forEach(function (k) {
      var t = am[k];
      if (t !== 'abs' && t !== 'sick') return;
      var mm = k.match(/^w(\d+)_/), w = mm ? Number(mm[1]) : 0;
      if (t === 'abs') r.abs++; else r.sick++;
      if (w) {
        if (!r.absW[w]) r.absW[w] = { abs: 0, sick: 0 };
        r.absW[w][t]++;
        if (w > maxAbsWeek) maxAbsWeek = w;
      }
    });
    r.absWeeks = Object.keys(r.absW).length;
    r.lastAbsWeek = r.absWeeks ? Math.max.apply(null, Object.keys(r.absW).map(Number)) : null;
    m.rows.push(r);
  });
  m.act = m.rows.filter(function (r) { return !r.all; });
  m.nAct = m.act.length;
  m.nAll = m.rows.length - m.nAct;
  m.maxAbsWeek = maxAbsWeek;

  /* ── أي الأسابيع/المكوّنات رُصدت فعلاً على مستوى الفصل ── */
  m.wkRec = { a: {}, h: {}, b: {} };
  m.last = { a: 0, h: 0, b: 0 };
  m.use = { a: false, h: false, b: false, e: [false, false] };
  ['a', 'h', 'b'].forEach(function (k) {
    cw[k].forEach(function (w) {
      var any = m.act.some(function (r) { var c = r.w[k][w]; return c.st === 'v' || c.st === 'abs'; });
      m.wkRec[k][w] = any;
      if (any) { m.use[k] = true; if (w > m.last[k]) m.last[k] = w; }
    });
  });
  [0, 1].forEach(function (i) {
    m.use.e[i] = m.act.some(function (r) { return r.ex[i].st === 'v' || r.ex[i].st === 'abs'; });
  });
  m.lastWeek = Math.max(m.last.a, m.last.h, m.last.b);

  /* ── مؤشرات كل طالب ── */
  m.act.forEach(function (r) {
    var c = r.calc;
    r.aP = m.use.a ? c.avgAssess / AM * 100 : null;
    r.hP = m.use.h ? c.avgHw / HM * 100 : null;
    r.bP = m.use.b ? (r.hasBeh ? c.avgBeh / BM * 100 : 0) : null;
    var den = 0, got = 0;
    [0, 1].forEach(function (i) {
      var x = r.ex[i];
      if (x.st === 'v') { den += EM[i]; got += x.v; }
      else if (x.st === 'abs' && exMode !== 'exclude') { den += EM[i]; }
    });
    r.exP = den > 0 ? got / den * 100 : null;
    r.workP = mean([r.aP, r.hP]);
    /* أداء الأسبوع = متوسط نسبتي التقييم والواجب */
    r.wp = {};
    weeks.forEach(function (w) {
      var v = [];
      [['a', AM], ['h', HM]].forEach(function (p) {
        var x = r.w[p[0]][w];
        if (x && (x.st === 'v' || x.st === 'abs')) v.push(x.v / p[1] * 100);
      });
      if (v.length) r.wp[w] = mean(v);
    });
    var rw = Object.keys(r.wp).map(Number).sort(function (a, b) { return a - b; });
    r.delta = null; r.l3 = null; r.p3 = null;
    if (rw.length >= 4) {
      r.l3 = mean(rw.slice(-3).map(function (w) { return r.wp[w]; }));
      r.p3 = mean(rw.slice(-6, -3).map(function (w) { return r.wp[w]; }));
      r.delta = r.l3 - r.p3;
    }
    /* نقص الرصد (الخانات الفارغة في أسابيع/اختبارات رُصدت لباقي الفصل) */
    r.miss = 0; r.rec = 0;
    ['a', 'h', 'b'].forEach(function (k) {
      if (!m.use[k]) return;
      cw[k].forEach(function (w) {
        if (w > m.last[k] || !m.wkRec[k][w]) return;
        if (r.w[k][w].st === 'blank') r.miss++; else r.rec++;
      });
    });
    [0, 1].forEach(function (i) {
      if (!m.use.e[i]) return;
      if (r.ex[i].st === 'blank') r.miss++; else r.rec++;
    });
  });

  /* ── الترتيب (ترتيب تنافسي: 1,2,2,4) ── */
  var sorted = m.act.slice().sort(function (a, b) { return b.total - a.total; });
  sorted.forEach(function (r, i) {
    r.rank = (i > 0 && sorted[i - 1].total === r.total) ? sorted[i - 1].rank : i + 1;
  });

  /* ── إحصاءات الفصل ── */
  m.avgPct = mean(m.act.map(function (r) { return r.pct; }));
  m.avgTotal = mean(m.act.map(function (r) { return r.total; }));
  m.passN = m.act.filter(function (r) { return r.pct >= C.pass; }).length;
  m.excN = m.act.filter(function (r) { return r.pct >= C.excel; }).length;
  m.compAvg = {
    a: mean(m.act.map(function (r) { return r.aP; })),
    h: mean(m.act.map(function (r) { return r.hP; })),
    b: mean(m.act.map(function (r) { return r.bP; })),
    e: mean(m.act.map(function (r) { return r.exP; }))
  };
  var recN = 0, missN = 0;
  m.act.forEach(function (r) { recN += r.rec; missN += r.miss; });
  m.recN = recN; m.missN = missN;
  m.complete = (recN + missN) ? recN / (recN + missN) * 100 : null;
  m.absTot = 0; m.sickTot = 0;
  m.rows.forEach(function (r) { m.absTot += r.abs; m.sickTot += r.sick; });

  /* ── السلاسل الأسبوعية للفصل ── */
  m.series = { a: {}, h: {}, b: {}, p: {} };
  weeks.forEach(function (w) {
    function avgOf(k, max) {
      return mean(m.act.map(function (r) {
        var x = r.w[k][w];
        return x && (x.st === 'v' || x.st === 'abs') ? x.v / max * 100 : null;
      }));
    }
    m.series.a[w] = avgOf('a', AM);
    m.series.h[w] = avgOf('h', HM);
    m.series.b[w] = avgOf('b', BM);
    m.series.p[w] = mean(m.act.map(function (r) { return r.wp[w] != null ? r.wp[w] : null; }));
  });
  m.recWeeks = weeks.filter(function (w) {
    return m.series.a[w] != null || m.series.h[w] != null || m.series.b[w] != null;
  });
  m.absWeeks = {};
  var topW = Math.max(weeks.length, maxAbsWeek);
  for (var w = 1; w <= topW; w++) m.absWeeks[w] = { abs: 0, sick: 0 };
  m.rows.forEach(function (r) {
    Object.keys(r.absW).forEach(function (w) {
      if (!m.absWeeks[w]) m.absWeeks[w] = { abs: 0, sick: 0 };
      m.absWeeks[w].abs += r.absW[w].abs; m.absWeeks[w].sick += r.absW[w].sick;
    });
  });

  /* ── أسباب المتابعة والأولوية ── */
  var FL = {
    all:   { t: 'غائب كلي',               w: 3, c: FAIL,      a: 'التواصل مع ولي الأمر لمعرفة سبب الغياب الكلي' },
    fail:  { t: 'دون حد النجاح',          w: 3, c: FAIL,      a: 'خطة علاجية وإشعار ولي الأمر' },
    edge:  { t: 'على حافة النجاح',        w: 1, c: '#f97316', a: 'متابعة قريبة وتشجيع قبل التقييم القادم' },
    drop:  { t: 'تراجع في آخر الأسابيع',  w: 2, c: '#f97316', a: 'مقابلة الطالب لمعرفة سبب التراجع' },
    abs2:  { t: 'غياب مرتفع',             w: 2, c: FAIL,      a: 'استدعاء ولي الأمر وإحالة للمتابع' },
    abs1:  { t: 'غياب يحتاج متابعة',      w: 1, c: '#f59e0b', a: 'متابعة الحضور والتواصل عند التكرار' },
    hw:    { t: 'ضعف الواجبات',           w: 1, c: '#f59e0b', a: 'متابعة تسليم الواجبات أسبوعياً' },
    beh:   { t: 'ضعف السلوك',             w: 1, c: '#f59e0b', a: 'متابعة سلوكية وتواصل مع المرشد' },
    gap:   { t: 'اختبار أقل من الأعمال',  w: 1, c: '#f59e0b', a: 'مراجعة أسلوب المذاكرة وقلق الاختبار' },
    zero:  { t: 'مخصومة للغياب',          w: 0, c: GREY,      a: '' },
    miss:  { t: 'رصد ناقص',               w: 0, c: GREY,      a: '' }
  };
  m.FL = FL;
  m.rows.forEach(function (r) {
    r.flags = []; r.score = 0;
    function add(k) { r.flags.push(k); r.score += FL[k].w; }
    if (r.all) add('all');
    else {
      if (r.pct < C.pass) add('fail'); else if (r.pct < C.pass + 10) add('edge');
      if (r.delta != null && r.delta <= -C.drop) add('drop');
      if (r.hP != null && r.hP < 50) add('hw');
      if (r.bP != null && r.hasBeh && r.bP < 60) add('beh');
      if (r.workP != null && r.exP != null && r.workP - r.exP >= 25) add('gap');
      if (r.calc.absenceDeduct > 0) add('zero');
      if (r.miss >= 3) add('miss');
    }
    if (r.abs >= C.absAlert) add('abs2'); else if (r.abs >= C.absWatch) add('abs1');
    r.pri = r.score >= 4 ? 3 : r.score >= 2 ? 2 : r.score >= 1 ? 1 : 0;
    /* الإجراء = إجراء أعلى سبب وزناً */
    var best = null;
    r.flags.forEach(function (k) { if (FL[k].a && (!best || FL[k].w > FL[best].w)) best = k; });
    r.action = best ? FL[best].a : '';
  });
  return m;
}

/* ═══════════════ خلايا الجداول ═══════════════ */
function C(t, o) { o = o || {}; o.t = (t == null ? '' : String(t)); return o; }
function ct(c) { return (c && typeof c === 'object') ? (c.t == null ? '' : String(c.t)) : (c == null ? '' : String(c)); }
function cv(c) {
  if (c && typeof c === 'object' && c.v !== undefined) return c.v;
  var t = ct(c), s = t.replace('%', '').replace(/^\+/, '');
  if (s !== '' && /^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return t;
}
function tint(hex, a) {
  var h = String(hex).replace('#', '');
  if (h.length !== 6) return 'transparent';
  return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
}
function gol(r) { return [DB.classes.indexOf(r.cls), r.si]; }
function NM(r) { return C(r.name, { go: gol(r), nm: 1 }); }
function pctCell(p, m) {
  if (p == null) return C('—');
  var l = lvl(p, m.cfg);
  return C(f0(p) + '%', { v: p, c: l.color, b: 1 });
}

/* ═══════════════ عرض الكتل ═══════════════ */
function kpisHtml(items) {
  return '<div class="rp-kpis">' + items.map(function (k) {
    return '<div class="rp-kpi"><div class="rp-kpi-i">' + (k.i || '') + '</div><div class="rp-kpi-l">' + E(k.l) +
      '</div><div class="rp-kpi-v"' + (k.c ? ' style="color:' + k.c + '"' : '') + '>' + E(k.v) + '</div>' +
      (k.s ? '<div class="rp-kpi-s">' + E(k.s) + '</div>' : '') + '</div>';
  }).join('') + '</div>';
}

function barsHtml(b) {
  var h = b.title ? '<div class="rp-bt">' + E(b.title) + '</div>' : '';
  h += '<div class="rp-bars">' + b.items.map(function (it) {
    var w = cl(it.v == null ? 0 : it.v, 0, 100);
    return '<div class="rp-bar"><span class="rp-bl">' + E(it.l) + '</span><span class="rp-btr"><i style="width:' + w + '%;background:' +
      (it.c || '#3b82f6') + '"></i></span><span class="rp-bv">' + E(it.t) + '</span></div>';
  }).join('') + '</div>';
  return '<div class="rp-blk">' + h + '</div>';
}

function lineHtml(b) {
  var W = 340, H = 170, pl = 30, pr = 8, pt = 10, pb = 22, n = b.labels.length;
  function X(i) { return pl + (W - pl - pr) * (n === 1 ? .5 : i / (n - 1)); }
  function Y(v) { return pt + (H - pt - pb) * (1 - cl(v, 0, 100) / 100); }
  var s = '<svg class="rp-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  [0, 25, 50, 75, 100].forEach(function (g) {
    s += '<line class="rp-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>' +
      '<text class="rp-ax" x="' + (pl - 4) + '" y="' + (Y(g) + 3) + '" text-anchor="end">' + g + '</text>';
  });
  var step = n > 14 ? 2 : 1;
  b.labels.forEach(function (l, i) {
    if (i % step === 0) s += '<text class="rp-ax" x="' + X(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + E(l) + '</text>';
  });
  b.series.forEach(function (se) {
    var d = '', pen = false, dots = '';
    se.vals.forEach(function (v, i) {
      if (v == null) { pen = false; return; }
      d += (pen ? ' L' : ' M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true;
      dots += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.6" fill="' + se.color + '"/>';
    });
    s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="2" stroke-linejoin="round"' +
      (se.dash ? ' stroke-dasharray="5 4"' : '') + '/>' + dots;
  });
  s += '</svg>';
  var lg = '<div class="rp-lg">' + b.series.map(function (se) {
    return '<span><i style="background:' + se.color + '"></i>' + E(se.name) + '</span>';
  }).join('') + '</div>';
  return '<div class="rp-blk">' + (b.title ? '<div class="rp-bt">' + E(b.title) + '</div>' : '') + lg + s + '</div>';
}

function tableHtml(t, mode) {
  var scr = mode === 'screen';
  var rows = t.rows.map(function (r, i) { return { r: r, i: i }; });
  var st = RP.sort[t.id];
  if (st) {
    rows.sort(function (a, b) {
      var x = cv(a.r[st.c]), y = cv(b.r[st.c]), nx = typeof x === 'number', ny = typeof y === 'number';
      if (nx && !ny) return -1;
      if (!nx && ny) return 1;
      var d = (nx && ny) ? x - y : String(x).localeCompare(String(y), 'ar');
      return d !== 0 ? d * st.d : a.i - b.i;
    });
  }
  var h = '<div class="rp-blk">';
  if (t.title) h += '<div class="rp-bt">' + E(t.title) + '</div>';
  if (!rows.length) {
    h += '<div class="rp-empty">' + E(t.empty || 'لا توجد بيانات') + '</div></div>';
    return h;
  }
  h += '<div class="rp-tw"><table class="rp-tbl"><thead><tr><th class="ix">م</th>';
  t.cols.forEach(function (c, i) {
    var sortable = scr && c.s !== false && t.s !== false;
    var arrow = (st && st.c === i) ? (st.d > 0 ? ' ▲' : ' ▼') : '';
    h += '<th class="' + (c.nm ? 'nm' : '') + '"' + (sortable ? ' onclick="RP2.sort(\'' + t.id + '\',' + i + ')" style="cursor:pointer"' : '') + '>' + E(c.h) + arrow + '</th>';
  });
  h += '</tr></thead><tbody>';
  rows.forEach(function (o, n) {
    h += '<tr><td class="ix">' + (n + 1) + '</td>';
    o.r.forEach(function (c, i) { h += tdHtml(c, t.cols[i], scr); });
    h += '</tr>';
  });
  h += '</tbody>';
  if (t.foot) {
    h += '<tfoot>' + t.foot.map(function (fr) {
      return '<tr><td class="ix"></td>' + fr.map(function (c, i) { return tdHtml(c, t.cols[i], scr); }).join('') + '</tr>';
    }).join('') + '</tfoot>';
  }
  h += '</table></div>';
  if (t.note) h += '<div class="rp-tn">' + E(t.note) + '</div>';
  return h + '</div>';
}
function tdHtml(c, col, scr) {
  var o = (c && typeof c === 'object') ? c : { t: c };
  var inner = (!scr && o.p != null) ? E(o.p) : (o.h != null ? o.h : E(o.t == null ? '' : o.t));
  if (scr && o.go) inner = '<a class="rp-go" onclick="RP2.go(' + o.go[0] + ',' + o.go[1] + ')">' + inner + '</a>';
  var st = '';
  if (o.c) st += 'color:' + o.c + ';';
  if (o.bg) st += 'background:' + o.bg + ';';
  if (o.b) st += 'font-weight:900;';
  return '<td class="' + ((col && col.nm) ? 'nm' : '') + ((col && col.a === 'r') ? ' tr' : '') + ((o.wrap || (o.h != null && !o.nowr)) ? ' wr' : '') + '"' + (st ? ' style="' + st + '"' : '') + '>' + inner + '</td>';
}

function blocksHtml(blocks, mode) {
  return blocks.map(function (b) {
    switch (b.type) {
      case 'kpis':  return kpisHtml(b.items);
      case 'bars':  return barsHtml(b);
      case 'line':  return lineHtml(b);
      case 'table': return tableHtml(b, mode);
      case 'h':     return '<div class="rp-h">' + E(b.t) + '</div>';
      case 'note':  return '<div class="rp-note ' + (b.kind || 'info') + '">' + (b.html != null ? b.html : E(b.t)) + '</div>';
      case 'list':
        return '<div class="rp-blk">' + (b.title ? '<div class="rp-bt">' + E(b.title) + '</div>' : '') +
          '<ul class="rp-ul">' + b.items.map(function (i) { return '<li>' + E(i) + '</li>'; }).join('') + '</ul></div>';
      case 'html':  return mode === 'screen' ? b.html : '';
      case 'sign':
        return '<div class="rp-sign">' + b.items.map(function (i) { return '<div><span>' + E(i) + '</span></div>'; }).join('') + '</div>';
    }
    return '';
  }).join('');
}

/* ═══════════════ الطباعة ═══════════════ */
var PRINT_CSS = '@page{size:A4 portrait;margin:10mm}body{font-family:Cairo,Tahoma,Arial,sans-serif;margin:0;padding:14px;color:#0f172a;background:#fff;font-size:12px}' +
  '.land{}.hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid #0f2a5e;padding-bottom:8px;margin-bottom:10px}.hd img{width:54px;height:54px;border-radius:50%;object-fit:contain;background:#000}' +
  '.hd .t{flex:1}.hd h1{font-size:17px;margin:0;color:#0f2a5e}.hd .s{font-size:11px;color:#475569;margin-top:2px}.hd .m{font-size:10px;color:#64748b;text-align:left;line-height:1.6}' +
  '.rp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.rp-kpi{border:1px solid #cbd5e1;border-radius:8px;padding:6px;text-align:center;break-inside:avoid}' +
  '.rp-kpi-i{display:none}.rp-kpi-l{font-size:10px;color:#64748b}.rp-kpi-v{font-size:16px;font-weight:900}.rp-kpi-s{font-size:9px;color:#64748b}' +
  '.rp-bt{font-weight:900;color:#0f2a5e;margin:10px 0 5px;font-size:12px}.rp-h{font-weight:900;font-size:14px;color:#0f2a5e;margin:14px 0 4px}.rp-blk{break-inside:auto}' +
  '.rp-bar{display:flex;align-items:center;gap:6px;margin-bottom:3px}.rp-bl{width:120px;font-size:10px}.rp-btr{flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;display:block}.rp-btr i{display:block;height:100%}.rp-bv{width:90px;font-size:10px;color:#475569}' +
  '.rp-tw{overflow:visible}.rp-tbl{width:100%;border-collapse:collapse;font-size:10.5px}.rp-tbl th{background:#0f2a5e;color:#fff;padding:5px 4px;border:1px solid #1e3a8a;font-weight:700}' +
  '.rp-tbl td{border:1px solid #cbd5e1;padding:4px;text-align:center}.rp-tbl td.tr,.rp-tbl td.nm{text-align:right}.rp-tbl tr:nth-child(even) td{background:#f8fafc}.rp-tbl tfoot td{background:#e2e8f0!important;font-weight:900}' +
  '.rp-tbl tr{break-inside:avoid}.rp-tn{font-size:10px;color:#64748b;margin-top:3px}.rp-empty,.rp-note{font-size:11px;color:#475569;padding:6px 8px;border:1px dashed #cbd5e1;border-radius:6px;margin:6px 0}' +
  '.rp-note.warn{border-color:#f59e0b;background:#fffbeb;color:#92400e}.rp-ul{margin:4px 18px;padding:0;line-height:1.9}.rp-lg{font-size:10px;margin-bottom:3px}.rp-lg span{margin-left:12px}.rp-lg i{display:inline-block;width:10px;height:3px;margin-left:4px;vertical-align:middle}' +
  '.rp-svg{width:100%;max-width:520px;height:auto}.rp-grid{stroke:#e2e8f0}.rp-ax{font-size:8px;fill:#64748b}.rp-tag{display:inline-block;border:1px solid currentColor;border-radius:9px;padding:0 6px;margin:1px;font-size:9.5px;font-weight:700}' +
  '.rp-sign{display:flex;gap:20px;margin-top:34px}.rp-sign div{flex:1;border-top:1px solid #0f172a;text-align:center;padding-top:4px;font-size:11px}.pg{page-break-after:always}.pg:last-child{page-break-after:auto}' +
  '.ftr{margin-top:12px;font-size:9px;color:#94a3b8;text-align:center}.noprint{text-align:center;margin-bottom:10px}.noprint button{background:#0f2a5e;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}' +
  '@media print{.noprint{display:none}body{padding:0}}';

function today() { var d = new Date(); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }

function printHeader(res) {
  var M = DB.meta || {};
  var logo = '';
  try { logo = new URL('images/logo.jpg', location.href).href; } catch (e) { logo = 'images/logo.jpg'; }
  var sem = (Number(M.semester) === 2) ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول';
  return '<div class="hd"><img src="' + E(logo) + '" alt=""><div class="t"><h1>' + E(res.title) + '</h1><div class="s">' + E(res.sub || '') + '</div></div>' +
    '<div class="m">' + E(M.schoolName || '') + '<br>' + E(M.subject || '') + ' — ' + E(sem) + (M.schoolYear ? ' ' + E(M.schoolYear) : '') +
    '<br>' + (M.teacherName ? 'المعلم: ' + E(M.teacherName) + ' — ' : '') + today() + '</div></div>';
}
function printDoc(parts, land) {
  var css = PRINT_CSS + (land ? '@page{size:A4 landscape;margin:8mm}' : '');
  return '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' +
    '<div class="noprint"><button onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div>' +
    parts.map(function (p) { return '<div class="pg">' + p + '</div>'; }).join('') +
    '<div class="ftr">Dalty Grades — ' + today() + '</div></body></html>';
}
function openPrint(html) {
  var w = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
  if (!w) { showSnack('⚠️ المتصفح منع النافذة المنبثقة — اسمح بها ثم أعد المحاولة'); return null; }
  w.document.open(); w.document.write(html); w.document.close();
  return w;
}

/* ═══════════════ تصدير Excel ═══════════════ */
function xlsxBuild(res) {
  var wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  var used = {};
  function sname(n) {
    n = String(n || 'ورقة').replace(/[\\\/\?\*\[\]:]/g, ' ').trim().substring(0, 28) || 'ورقة';
    var b = n, i = 2;
    while (used[n]) n = b.substring(0, 25) + ' ' + (i++);
    used[n] = 1; return n;
  }
  function val(c) { var v = cv(c); return v == null ? '' : v; }
  /* ورقة الملخص: العنوان + المؤشرات + الأعمدة/الخطوط */
  var sum = [[res.title], [res.sub || ''], ['تاريخ التقرير', today()], []];
  res.blocks.forEach(function (b) {
    if (b.type === 'kpis') { sum.push(['المؤشرات']); b.items.forEach(function (k) { sum.push([k.l, k.v, k.s || '']); }); sum.push([]); }
    else if (b.type === 'bars') { sum.push([b.title || 'توزيع']); b.items.forEach(function (i) { sum.push([i.l, i.t]); }); sum.push([]); }
    else if (b.type === 'line') {
      sum.push([b.title || 'تطور']); sum.push(['الأسبوع'].concat(b.series.map(function (s) { return s.name; })));
      b.labels.forEach(function (l, i) { sum.push([l].concat(b.series.map(function (s) { return s.vals[i] == null ? '' : Math.round(s.vals[i] * 10) / 10; }))); });
      sum.push([]);
    }
    else if (b.type === 'note' && b.t) { sum.push([b.t]); }
    else if (b.type === 'list') { sum.push([b.title || '']); b.items.forEach(function (i) { sum.push([i]); }); sum.push([]); }
  });
  var ws0 = XLSX.utils.aoa_to_sheet(sum);
  ws0['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws0, sname('ملخص'));
  res.blocks.forEach(function (b) {
    if (b.type !== 'table' || !b.rows.length) return;
    var aoa = [['م'].concat(b.cols.map(function (c) { return c.h; }))];
    b.rows.forEach(function (r, i) { aoa.push([i + 1].concat(r.map(val))); });
    (b.foot || []).forEach(function (r) { aoa.push([''].concat(r.map(val))); });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map(function (_, i) { return { wch: i === 0 ? 5 : (b.cols[i - 1] && b.cols[i - 1].nm ? 28 : 13) }; });
    XLSX.utils.book_append_sheet(wb, ws, sname(b.title || res.title));
  });
  return wb;
}

/* ═══════════════ بناة التقارير ═══════════════ */
function empty(title, msg) { return { title: title, blocks: [{ type: 'note', kind: 'warn', t: msg }] }; }
function flat(ms) { var o = []; ms.forEach(function (m) { m.rows.forEach(function (r) { o.push(r); }); }); return o; }
function flatAct(ms) { var o = []; ms.forEach(function (m) { m.act.forEach(function (r) { o.push(r); }); }); return o; }
function tagHtml(m, flags) {
  return flags.filter(function (k) { return m.FL[k].w > 0 || k === 'zero' || k === 'miss'; }).map(function (k) {
    return '<span class="rp-tag" style="color:' + m.FL[k].c + '">' + E(m.FL[k].t) + '</span>';
  }).join('');
}
function flagText(m, flags) { return flags.map(function (k) { return m.FL[k].t; }).join('، '); }
function priCell(r) {
  var t = r.pri === 3 ? 'عاجل' : r.pri === 2 ? 'متابعة' : r.pri === 1 ? 'ملاحظة' : 'سليم';
  var c = r.pri === 3 ? FAIL : r.pri === 2 ? '#f97316' : r.pri === 1 ? '#f59e0b' : '#10b981';
  return C(t, { v: r.score, c: c, b: 1 });
}
function weeksLabel(ws) { return ws.map(function (w) { return String(w); }); }

/* ① لوحة الفصل */
function insights(m) {
  var C0 = m.cfg, o = [];
  var comp = [['التقييمات', m.compAvg.a], ['الواجبات', m.compAvg.h], ['السلوك', m.compAvg.b], ['الاختبارات', m.compAvg.e]]
    .filter(function (x) { return x[1] != null; }).sort(function (a, b) { return a[1] - b[1]; });
  if (comp.length > 1) o.push('أضعف مكوّن: ' + comp[0][0] + ' (' + pcs(comp[0][1]) + ')، وأقواها: ' + comp[comp.length - 1][0] + ' (' + pcs(comp[comp.length - 1][1]) + ').');
  var rw = m.recWeeks.filter(function (w) { return m.series.p[w] != null; });
  if (rw.length >= 4) {
    var l3 = mean(rw.slice(-3).map(function (w) { return m.series.p[w]; })), p3 = mean(rw.slice(-6, -3).map(function (w) { return m.series.p[w]; }));
    var d = l3 - p3;
    o.push(Math.abs(d) < 2 ? 'مستوى الفصل مستقر في آخر 3 أسابيع (' + sgn(d, ' نقطة') + ').'
      : (d > 0 ? 'مستوى الفصل في تحسّن: ' : 'مستوى الفصل في تراجع: ') + sgn(d, ' نقطة') + ' في آخر 3 أسابيع مقارنة بما قبلها.');
  }
  var urgent = m.act.filter(function (r) { return r.pri === 3; }).length;
  if (urgent) o.push(urgent + ' طالب يحتاجون متابعة عاجلة — راجع «متابعة الطلاب».');
  var ab = m.rows.filter(function (r) { return r.abs >= C0.absWatch; }).length;
  if (ab) o.push(ab + ' طالب وصل غيابهم حد المتابعة (' + C0.absWatch + ' فترات فأكثر).');
  if (m.complete != null && m.complete < 90) o.push('اكتمال الرصد ' + pcs(m.complete) + ' — توجد خانات فارغة، راجع «اكتمال الرصد».');
  return o;
}
function R_dash(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'لوحة الفصل';
  if (!m.rows.length) return empty(t, 'لا يوجد طلاب في هذا الفصل.');
  var urgent = m.act.filter(function (r) { return r.pri === 3; }).length;
  var follow = m.act.filter(function (r) { return r.pri === 2; }).length;
  var av = lvl(m.avgPct, C0);
  var B = [];
  B.push({ type: 'kpis', items: [
    { i: '👥', l: 'الطلاب', v: m.rows.length, s: m.nAll ? m.nAll + ' غائب كلي (مستبعد)' : '' },
    { i: '📈', l: 'متوسط الفصل', v: pcs(m.avgPct), s: m.nAct ? f1(m.avgTotal) + ' من ' + m.rm : '', c: av.color },
    { i: '✅', l: 'نسبة النجاح', v: m.nAct ? pcs(m.passN / m.nAct * 100) : '—', s: m.passN + ' من ' + m.nAct, c: '#10b981' },
    { i: '🌟', l: 'ممتاز (≥' + C0.excel + '%)', v: m.excN, s: m.nAct ? pcs(m.excN / m.nAct * 100) : '', c: '#fbbf24' },
    { i: '🚨', l: 'متابعة عاجلة', v: urgent, s: 'ومتابعة عادية: ' + follow, c: urgent ? FAIL : '#10b981' },
    { i: '📋', l: 'فترات الغياب', v: m.absTot, s: 'مرض: ' + m.sickTot },
    { i: '🧾', l: 'اكتمال الرصد', v: pcs(m.complete), s: m.missN ? m.missN + ' خانة ناقصة' : 'مكتمل', c: m.complete != null && m.complete < 90 ? '#f59e0b' : '#10b981' }
  ] });
  if (m.nAct) {
    var L = levels(C0);
    B.push({ type: 'bars', title: 'توزيع المستويات', items: L.map(function (l) {
      var n = m.act.filter(function (r) { return lvl(r.pct, C0).label === l.label; }).length;
      return { l: l.label + (l.min > 0 ? ' (≥' + l.min + '%)' : ' (<' + C0.pass + '%)'), v: n / m.nAct * 100, t: n + ' (' + Math.round(n / m.nAct * 100) + '%)', c: l.color };
    }) });
    var ci = [['التقييمات الأسبوعية', m.compAvg.a], ['الواجبات', m.compAvg.h], ['السلوك والمواظبة', m.compAvg.b], ['الاختبارات', m.compAvg.e]].filter(function (c) { return c[1] != null; });
    if (ci.length) B.push({ type: 'bars', title: 'متوسط المكوّنات', items: ci.map(function (c) { return { l: c[0], v: c[1], t: pcs(c[1]), c: lvl(c[1], C0).color }; }) });
    if (m.recWeeks.length >= 2) {
      var ser = [{ name: 'التحصيل (تقييم+واجب)', color: '#3b82f6', vals: m.recWeeks.map(function (w) { return m.series.p[w]; }) }];
      if (m.use.b) ser.push({ name: 'السلوك', color: '#10b981', dash: 1, vals: m.recWeeks.map(function (w) { return m.series.b[w]; }) });
      B.push({ type: 'line', title: 'التطور الأسبوعي للفصل (%)', labels: weeksLabel(m.recWeeks), series: ser });
    }
    var srt = m.act.slice().sort(function (a, b) { return b.total - a.total; });
    var cols = [{ h: 'الاسم', nm: 1, a: 'r' }, { h: 'المجموع' }, { h: '%' }, { h: 'التقدير' }];
    function trow(r) { var l = lvl(r.pct, C0); return [NM(r), C(r.total, { b: 1 }), pctCell(r.pct, m), C(l.label, { c: l.color })]; }
    if (srt.length >= 2) {
      B.push({ type: 'table', id: 'dash_top', title: '🏅 أعلى 5 طلاب', cols: cols, rows: srt.slice(0, 5).map(trow) });
      B.push({ type: 'table', id: 'dash_low', title: '⚠️ أدنى 5 طلاب', cols: cols, rows: srt.slice(-5).reverse().map(trow) });
    }
    var ins = insights(m);
    if (ins.length) B.push({ type: 'list', title: '🔎 ملاحظات آلية', items: ins });
  } else B.push({ type: 'note', kind: 'warn', t: 'لم تُرصد درجات بعد لهذا الفصل.' });
  return { title: t + ' — ' + x.cls, sub: m.rows.length + ' طالب', blocks: B };
}

/* ② مقارنة الفصول */
function R_cmp(x) {
  var ms = DB.classes.map(function (c) { return x.model(c); }), C0 = x.cfg, t = 'مقارنة الفصول';
  if (!ms.length) return empty(t, 'لا توجد فصول.');
  var cols = [{ h: 'الفصل', nm: 1, a: 'r' }, { h: 'الطلاب' }, { h: 'المتوسط %' }, { h: 'النجاح %' }, { h: 'ممتاز' }, { h: 'عاجل' }, { h: 'غياب (فترات)' }, { h: 'غياب/طالب' }, { h: 'اكتمال الرصد' }];
  var rows = ms.map(function (m, i) {
    return [C(m.cls, { go: [i, -1], nm: 1 }), C(m.rows.length), pctCell(m.avgPct, m),
      m.nAct ? C(f0(m.passN / m.nAct * 100) + '%', { v: m.passN / m.nAct * 100 }) : C('—'), C(m.excN),
      C(m.act.filter(function (r) { return r.pri === 3; }).length), C(m.absTot),
      C(m.rows.length ? f1(m.absTot / m.rows.length) : '—', { v: m.rows.length ? m.absTot / m.rows.length : null }), C(pcs(m.complete), { v: m.complete })];
  });
  var act = flatAct(ms), all = flat(ms);
  var foot = [[C('الإجمالي', { b: 1, nm: 1 }), C(all.length), C(pcs(mean(act.map(function (r) { return r.pct; })))),
    C(act.length ? f0(act.filter(function (r) { return r.pct >= C0.pass; }).length / act.length * 100) + '%' : '—'),
    C(act.filter(function (r) { return r.pct >= C0.excel; }).length), C(act.filter(function (r) { return r.pri === 3; }).length),
    C(ms.reduce(function (s, m) { return s + m.absTot; }, 0)), C(all.length ? f1(ms.reduce(function (s, m) { return s + m.absTot; }, 0) / all.length) : '—'), C('')]];
  var B = [];
  B.push({ type: 'bars', title: 'متوسط الفصول (%)', items: ms.filter(function (m) { return m.avgPct != null; }).map(function (m) {
    return { l: m.cls, v: m.avgPct, t: pcs(m.avgPct), c: lvl(m.avgPct, C0).color };
  }) });
  B.push({ type: 'table', id: 'cmp', title: 'جدول المقارنة', cols: cols, rows: rows, foot: foot,
    note: 'المتوسط محسوب كنسبة من الدرجة العظمى المرصودة لكل فصل، لذا فهو قابل للمقارنة حتى لو اختلف ما رُصد بين الفصول.' });
  return { title: t, sub: 'كل الفصول — ' + all.length + ' طالب', blocks: B };
}

/* ③ كشف الطلاب التفصيلي */
function R_sheet(x) {
  var ms = x.models(), C0 = x.cfg, t = 'كشف الطلاب التفصيلي';
  var rows = flat(ms);
  if (!rows.length) return empty(t, 'لا يوجد طلاب.');
  var m0 = ms[0], all = x.all, ded = ((DB.meta || {}).absenceMode || 'none') !== 'none';
  var cols = [];
  if (all) cols.push({ h: 'الفصل' });
  cols.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'تقييم/' + m0.AM }, { h: 'واجب/' + m0.HM }, { h: 'سلوك/' + m0.BM }, { h: 'اختبارات' },
    { h: all ? 'المجموع' : 'المجموع/' + m0.rm }, { h: '%' }, { h: 'التقدير' }, { h: 'الترتيب' }, { h: 'غياب' }, { h: 'مرض' });
  if (ded) cols.push({ h: 'خصم الغياب' });
  var body = ms.map(function (m) {
    return m.rows.map(function (r) {
      var c = r.calc, l = lvl(r.pct, C0), o = [];
      if (all) o.push(C(r.cls));
      o.push(NM(r));
      if (r.all) o.push(C('—'), C('—'), C('—'), C('—'), C('—'), C('—'), C('غائب كلي', { c: FAIL, b: 1 }), C('—'));
      else o.push(m.use.a ? C(c.avgAssess) : C('—'), m.use.h ? C(c.avgHw) : C('—'), m.use.b ? C(r.hasBeh ? c.avgBeh : 0) : C('—'),
        (m.use.e[0] || m.use.e[1]) ? C(c.exTotal) : C('—'), C(r.total, { b: 1, c: l.color }), pctCell(r.pct, m), C(l.label, { c: l.color }), C(r.rank));
      o.push(C(r.abs), C(r.sick));
      if (ded) o.push(C(c.absenceDeduct || 0));
      return o;
    });
  });
  var B = [], tr = [];
  body.forEach(function (b) { b.forEach(function (r) { tr.push(r); }); });
  var act = flatAct(ms), off = all ? 1 : 0;
  var foot = [];
  if (act.length) {
    var f = [];
    if (all) f.push(C(''));
    f.push(C(all ? 'المتوسط العام' : 'متوسط الفصل', { b: 1, nm: 1 }),
      C(f1(mean(act.map(function (r) { return r.calc.avgAssess; })))), C(f1(mean(act.map(function (r) { return r.calc.avgHw; })))),
      C(f1(mean(act.map(function (r) { return r.hasBeh ? r.calc.avgBeh : 0; })))), C(f1(mean(act.map(function (r) { return r.calc.exTotal || 0; })))),
      C(f1(mean(act.map(function (r) { return r.total; })))), C(pcs(mean(act.map(function (r) { return r.pct; })))), C(''), C(''),
      C(rows.reduce(function (s, r) { return s + r.abs; }, 0)), C(rows.reduce(function (s, r) { return s + r.sick; }, 0)));
    if (ded) f.push(C(''));
    foot.push(f);
  }
  B.push({ type: 'table', id: 'sheet' + (all ? '_all' : ''), title: all ? 'كل الطلاب' : x.cls, cols: cols, rows: tr, foot: foot,
    note: 'الدرجات من نفس حسابات صفحة الدرجات. الطالب «غائب كلي» مستبعد من المتوسطات والترتيب.' + (ded ? ' عمود «خصم الغياب» حسب سياسة الغياب في الإعدادات.' : '') });
  return { title: t, sub: all ? 'كل الفصول' : x.cls, blocks: B, land: true };
}

/* ④ الترتيب والمتفوقون */
function R_rank(x) {
  var ms = x.models(), C0 = x.cfg, t = 'الترتيب والمتفوقون';
  var act = flatAct(ms);
  if (!act.length) return empty(t, 'لا توجد درجات مرصودة.');
  var srt = act.slice().sort(function (a, b) { return b.pct - a.pct || a.name.localeCompare(b.name, 'ar'); });
  srt.forEach(function (r, i) { r.orank = (i > 0 && Math.abs(srt[i - 1].pct - r.pct) < 1e-9) ? srt[i - 1].orank : i + 1; });
  var med = ['🥇', '🥈', '🥉'], all = x.all, B = [];
  var cols = [{ h: 'الترتيب' }]; if (all) cols.push({ h: 'الفصل' });
  cols.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'المجموع' }, { h: '%' }, { h: 'التقدير' });
  B.push({ type: 'table', id: 'rank_top', title: '🏆 لوحة الشرف — أعلى 10', cols: cols, rows: srt.slice(0, 10).map(function (r) {
    var l = lvl(r.pct, C0), o = [C((med[r.orank - 1] || '') + ' ' + r.orank, { v: r.orank, b: 1 })];
    if (all) o.push(C(r.cls));
    o.push(NM(r), C(r.total, { b: 1 }), pctCell(r.pct, { cfg: C0 }), C(l.label, { c: l.color }));
    return o;
  }) });
  var imp = act.filter(function (r) { return r.delta != null && r.delta >= C0.drop; }).sort(function (a, b) { return b.delta - a.delta; }).slice(0, 8);
  var c2 = []; if (all) c2.push({ h: 'الفصل' });
  c2.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'آخر 3 أسابيع %' }, { h: 'قبلها %' }, { h: 'التحسّن' });
  B.push({ type: 'table', id: 'rank_imp', title: '📈 الأكثر تحسناً (آخر 3 أسابيع مقابل ما قبلها)', cols: c2, empty: 'لا يوجد طلاب بتحسّن ≥ ' + C0.drop + ' نقطة حتى الآن.',
    rows: imp.map(function (r) { var o = []; if (all) o.push(C(r.cls)); o.push(NM(r), C(f0(r.l3) + '%', { v: r.l3 }), C(f0(r.p3) + '%', { v: r.p3 }), C(sgn(r.delta), { v: r.delta, c: '#10b981', b: 1 })); return o; }) });
  var per = act.filter(function (r) { return r.bP != null && r.hasBeh && r.bP >= 90 && r.abs === 0; }).sort(function (a, b) { return b.bP - a.bP; }).slice(0, 15);
  var c3 = []; if (all) c3.push({ h: 'الفصل' });
  c3.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'السلوك %' }, { h: 'الغياب' });
  B.push({ type: 'table', id: 'rank_beh', title: '🤝 المنضبطون: سلوك ≥ 90% وبلا غياب', cols: c3, empty: 'لا يوجد طلاب بهذه المواصفات (أو لم يُرصد السلوك).',
    rows: per.map(function (r) { var o = []; if (all) o.push(C(r.cls)); o.push(NM(r), C(f0(r.bP) + '%', { v: r.bP, c: '#10b981', b: 1 }), C(r.abs)); return o; }) });
  return { title: t, sub: all ? 'كل الفصول' : x.cls, blocks: B };
}

/* ⑤ متابعة الطلاب */
function R_risk(x) {
  var ms = x.models(), C0 = x.cfg, t = 'متابعة الطلاب';
  var rows = flat(ms);
  if (!rows.length) return empty(t, 'لا يوجد طلاب.');
  var cnt = [0, 0, 0, 0];
  rows.forEach(function (r) { cnt[r.pri]++; });
  var all = x.all, m0 = ms[0], B = [];
  B.push({ type: 'kpis', items: [
    { i: '🚨', l: 'عاجل', v: cnt[3], c: FAIL }, { i: '🟠', l: 'متابعة', v: cnt[2], c: '#f97316' },
    { i: '🟡', l: 'ملاحظة', v: cnt[1], c: '#f59e0b' }, { i: '✅', l: 'سليم', v: cnt[0], c: '#10b981' } ] });
  var cols = [{ h: 'الأولوية' }]; if (all) cols.push({ h: 'الفصل' });
  cols.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: '%' }, { h: 'الغياب' }, { h: 'الاتجاه' }, { h: 'الأسباب', a: 'r', s: false }, { h: 'الإجراء المقترح', a: 'r', s: false });
  var list = rows.filter(function (r) { return r.pri > 0; }).sort(function (a, b) { return b.score - a.score || (a.pct == null ? -1 : b.pct == null ? 1 : a.pct - b.pct); });
  B.push({ type: 'table', id: 'risk' + (all ? '_all' : ''), title: 'قائمة المتابعة (' + list.length + ' طالب)', cols: cols, empty: 'لا يوجد طلاب يحتاجون متابعة 🎉',
    rows: list.map(function (r) {
      var m = ms.filter(function (q) { return q.cls === r.cls; })[0], o = [priCell(r)];
      if (all) o.push(C(r.cls));
      o.push(NM(r), r.all ? C('—') : pctCell(r.pct, m), C(r.abs, { c: r.abs >= C0.absAlert ? FAIL : r.abs >= C0.absWatch ? '#f59e0b' : undefined }),
        r.delta == null ? C('—') : C(sgn(r.delta), { v: r.delta, c: r.delta <= -C0.drop ? FAIL : r.delta >= C0.drop ? '#10b981' : undefined }),
        C(flagText(m, r.flags), { h: tagHtml(m, r.flags) }), C(r.action, { wrap: 1 }));
      return o;
    }),
    note: 'الأولوية تُحسب من مجموع أوزان الأسباب (عاجل ≥ 4، متابعة 2–3، ملاحظة 1). حدود النجاح والغياب من ⚙️ الإعدادات.' });
  return { title: t, sub: (all ? 'كل الفصول' : x.cls) + ' — حد النجاح ' + C0.pass + '%', blocks: B, land: true };
}

/* ⑥ تحليل المكوّنات */
function R_comp(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'تحليل المكوّنات';
  if (!m.nAct) return empty(t, 'لا توجد درجات مرصودة.');
  var defs = [['a', 'التقييمات الأسبوعية', m.AM, 'aP'], ['h', 'الواجبات', m.HM, 'hP'], ['b', 'السلوك والمواظبة', m.BM, 'bP']];
  var rows = [], items = [];
  defs.forEach(function (d) {
    if (!m.use[d[0]]) return;
    var v = m.act.map(function (r) { return r[d[3]]; }).filter(function (q) { return q != null; });
    var av = mean(v);
    rows.push([C(d[1], { nm: 1 }), C(d[2]), C(f1(av * d[2] / 100), { v: av * d[2] / 100 }), pctCell(av, m), C(f0(Math.max.apply(null, v)) + '%', { v: Math.max.apply(null, v) }),
      C(f0(Math.min.apply(null, v)) + '%', { v: Math.min.apply(null, v) }), C(v.filter(function (q) { return q < C0.pass; }).length)]);
    items.push({ l: d[1], v: av, t: pcs(av), c: lvl(av, C0).color });
  });
  var emax = (m.use.e[0] ? m.EM[0] : 0) + (m.use.e[1] ? m.EM[1] : 0);
  var ev = m.act.map(function (r) { return r.exP; }).filter(function (q) { return q != null; });
  if (ev.length) {
    var ea = mean(ev);
    rows.push([C('الاختبارات', { nm: 1 }), C(emax), C(f1(ea * emax / 100), { v: ea * emax / 100 }), pctCell(ea, m), C(f0(Math.max.apply(null, ev)) + '%', { v: Math.max.apply(null, ev) }),
      C(f0(Math.min.apply(null, ev)) + '%', { v: Math.min.apply(null, ev) }), C(ev.filter(function (q) { return q < C0.pass; }).length)]);
    items.push({ l: 'الاختبارات', v: ea, t: pcs(ea), c: lvl(ea, C0).color });
  }
  var B = [];
  if (items.length) B.push({ type: 'bars', title: 'متوسط كل مكوّن (%)', items: items });
  B.push({ type: 'table', id: 'comp', title: 'تفصيل المكوّنات', empty: 'لا توجد مكوّنات مرصودة.', s: false,
    cols: [{ h: 'المكوّن', nm: 1, a: 'r' }, { h: 'العظمى' }, { h: 'المتوسط' }, { h: '%' }, { h: 'أعلى %' }, { h: 'أدنى %' }, { h: 'دون حد النجاح' }], rows: rows,
    note: 'عمود «دون حد النجاح» = عدد الطلاب الذين نسبتهم في هذا المكوّن أقل من ' + C0.pass + '%.' });
  var gap = m.act.filter(function (r) { return r.workP != null && r.exP != null && Math.abs(r.workP - r.exP) >= 25; })
    .sort(function (a, b) { return Math.abs(b.workP - b.exP) - Math.abs(a.workP - a.exP); });
  B.push({ type: 'table', id: 'comp_gap', title: 'فجوة بين الأعمال والاختبار (≥ 25 نقطة)', empty: 'لا توجد فجوات كبيرة (أو لم تُرصد اختبارات).',
    cols: [{ h: 'الاسم', nm: 1, a: 'r' }, { h: 'الأعمال %' }, { h: 'الاختبار %' }, { h: 'الفرق' }, { h: 'الدلالة', a: 'r', s: false }],
    rows: gap.map(function (r) { var d = r.workP - r.exP; return [NM(r), pctCell(r.workP, m), pctCell(r.exP, m), C(sgn(d), { v: d, b: 1, c: d > 0 ? '#f97316' : '#3b82f6' }),
      C(d > 0 ? 'الاختبار أقل من مستوى الأعمال' : 'الاختبار أعلى من مستوى الأعمال', { a: 'r' })]; }),
    note: 'الأعمال = متوسط نسبتي التقييمات والواجبات. الفجوة الكبيرة تستدعي مراجعة أسلوب المذاكرة أو ظروف الاختبار.' });
  return { title: t + ' — ' + x.cls, sub: m.nAct + ' طالب', blocks: B };
}

/* ⑦ التطور الأسبوعي */
function R_trend(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'التطور الأسبوعي';
  if (m.recWeeks.length < 1) return empty(t, 'لا توجد أسابيع مرصودة بعد.');
  var B = [], W = m.recWeeks;
  if (W.length >= 2) {
    var ser = [{ name: 'التحصيل', color: '#3b82f6', vals: W.map(function (w) { return m.series.p[w]; }) }];
    if (m.use.a) ser.push({ name: 'التقييم', color: '#8b5cf6', dash: 1, vals: W.map(function (w) { return m.series.a[w]; }) });
    if (m.use.h) ser.push({ name: 'الواجب', color: '#f59e0b', dash: 1, vals: W.map(function (w) { return m.series.h[w]; }) });
    if (m.use.b) ser.push({ name: 'السلوك', color: '#10b981', vals: W.map(function (w) { return m.series.b[w]; }) });
    B.push({ type: 'line', title: 'متوسط الفصل لكل أسبوع (%)', labels: weeksLabel(W), series: ser });
  }
  var prev = null, rows = W.map(function (w) {
    var p = m.series.p[w], d = (prev != null && p != null) ? p - prev : null; if (p != null) prev = p;
    var n = m.act.filter(function (r) { return r.wp[w] != null || (r.w.b[w] && (r.w.b[w].st === 'v' || r.w.b[w].st === 'abs')); }).length;
    var ab = m.absWeeks[w] ? m.absWeeks[w].abs + m.absWeeks[w].sick : 0;
    return [C('أسبوع ' + w, { v: w, nm: 1 }), C(n), C(pcs(m.series.a[w]), { v: m.series.a[w] }), C(pcs(m.series.h[w]), { v: m.series.h[w] }),
      C(pcs(m.series.b[w]), { v: m.series.b[w] }), C(pcs(p), { v: p, b: 1 }), C(d == null ? '—' : sgn(d), { v: d, c: d == null ? undefined : d <= -5 ? FAIL : d >= 5 ? '#10b981' : undefined }), C(ab)];
  });
  B.push({ type: 'table', id: 'trend_w', title: 'الأسابيع المرصودة', s: false,
    cols: [{ h: 'الأسبوع', nm: 1, a: 'r' }, { h: 'مرصود لـ' }, { h: 'تقييم' }, { h: 'واجب' }, { h: 'سلوك' }, { h: 'التحصيل' }, { h: 'التغير' }, { h: 'غياب+مرض' }], rows: rows,
    note: 'التغير = فرق التحصيل عن آخر أسبوع مرصود قبله.' });
  var dn = m.act.filter(function (r) { return r.delta != null && r.delta <= -C0.drop; }).sort(function (a, b) { return a.delta - b.delta; }).slice(0, 10);
  var up = m.act.filter(function (r) { return r.delta != null && r.delta >= C0.drop; }).sort(function (a, b) { return b.delta - a.delta; }).slice(0, 10);
  var cs = [{ h: 'الاسم', nm: 1, a: 'r' }, { h: 'آخر 3 أسابيع %' }, { h: 'قبلها %' }, { h: 'التغير' }];
  function tr(r) { return [NM(r), C(f0(r.l3) + '%', { v: r.l3 }), C(f0(r.p3) + '%', { v: r.p3 }), C(sgn(r.delta), { v: r.delta, b: 1, c: r.delta < 0 ? FAIL : '#10b981' })]; }
  B.push({ type: 'table', id: 'trend_dn', title: '📉 تراجع ملحوظ (≥ ' + C0.drop + ' نقطة)', cols: cs, rows: dn.map(tr), empty: 'لا يوجد تراجع ملحوظ.' });
  B.push({ type: 'table', id: 'trend_up', title: '📈 تحسّن ملحوظ (≥ ' + C0.drop + ' نقطة)', cols: cs, rows: up.map(tr), empty: 'لا يوجد تحسّن ملحوظ.',
    note: 'تُقارن آخر 3 أسابيع مرصودة للطالب بالـ3 التي قبلها، ويلزم 4 أسابيع مرصودة على الأقل.' });
  return { title: t + ' — ' + x.cls, sub: W.length + ' أسبوع مرصود', blocks: B };
}

/* ⑧ تحليل الاختبارات */
function R_exam(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'تحليل الاختبارات';
  if (!m.use.e[0] && !m.use.e[1]) return empty(t, 'لم تُرصد درجات اختبارات بعد.');
  var rows = [], B = [], L = levels(C0);
  [0, 1].forEach(function (i) {
    if (!m.use.e[i]) return;
    var mx = m.EM[i], vs = [], ab = 0, ex = 0, bl = 0;
    m.act.forEach(function (r) {
      var c = r.ex[i];
      if (c.st === 'v') vs.push({ r: r, p: c.v / mx * 100, v: c.v });
      else if (c.st === 'abs') ab++; else if (c.st === 'exc') ex++; else bl++;
    });
    var pv = vs.map(function (q) { return q.p; });
    rows.push([C('اختبار ' + (i + 1), { nm: 1 }), C(mx), C(vs.length), C(ab), C(ex), C(bl), C(f1(mean(vs.map(function (q) { return q.v; })))), pctCell(mean(pv), m),
      C(vs.length ? Math.max.apply(null, vs.map(function (q) { return q.v; })) : '—'), C(vs.length ? Math.min.apply(null, vs.map(function (q) { return q.v; })) : '—'),
      C(vs.length ? f0(pv.filter(function (p) { return p >= C0.pass; }).length / vs.length * 100) + '%' : '—')]);
    if (vs.length) B.push({ type: 'bars', title: 'توزيع مستويات اختبار ' + (i + 1), items: L.map(function (l) {
      var n = pv.filter(function (p) { return lvl(p, C0).label === l.label; }).length;
      return { l: l.label, v: n / vs.length * 100, t: n + ' (' + Math.round(n / vs.length * 100) + '%)', c: l.color };
    }) });
  });
  B.unshift({ type: 'table', id: 'exam', title: 'ملخص الاختبارات', s: false, empty: '',
    cols: [{ h: 'الاختبار', nm: 1, a: 'r' }, { h: 'العظمى' }, { h: 'اختبر' }, { h: 'غياب' }, { h: 'معفى' }, { h: 'لم يُرصد' }, { h: 'المتوسط' }, { h: '%' }, { h: 'أعلى' }, { h: 'أدنى' }, { h: 'نجاح' }], rows: rows,
    note: 'الغياب في الاختبار يُحتسب حسب سياسة الاختبار في الإعدادات (' + (((DB.meta || {}).examAbsenceMode === 'exclude') ? 'يُستبعد' : 'صفر') + ').' });
  if (m.use.e[0] && m.use.e[1]) {
    var both = m.act.filter(function (r) { return r.ex[0].st === 'v' && r.ex[1].st === 'v'; });
    B.push({ type: 'table', id: 'exam_cmp', title: 'مقارنة الاختبار 1 بالاختبار 2', empty: 'لا يوجد طلاب أدّوا الاختبارين.',
      cols: [{ h: 'الاسم', nm: 1, a: 'r' }, { h: 'اختبار 1 %' }, { h: 'اختبار 2 %' }, { h: 'التغير' }],
      rows: both.map(function (r) { var a = r.ex[0].v / m.EM[0] * 100, b = r.ex[1].v / m.EM[1] * 100, d = b - a;
        return [NM(r), C(f0(a) + '%', { v: a }), C(f0(b) + '%', { v: b }), C(sgn(d), { v: d, b: 1, c: d < -10 ? FAIL : d > 10 ? '#10b981' : undefined })]; }) });
  }
  return { title: t + ' — ' + x.cls, sub: m.nAct + ' طالب', blocks: B };
}

/* ⑨ الغياب والمرض */
function R_abs(x) {
  var ms = x.models(), C0 = x.cfg, t = 'تقرير الغياب والمرض';
  var rows = flat(ms);
  if (!rows.length) return empty(t, 'لا يوجد طلاب.');
  var all = x.all, B = [];
  var ta = rows.reduce(function (s, r) { return s + r.abs; }, 0), ts = rows.reduce(function (s, r) { return s + r.sick; }, 0);
  var nW = rows.filter(function (r) { return r.abs >= C0.absWatch && r.abs < C0.absAlert; }).length, nA = rows.filter(function (r) { return r.abs >= C0.absAlert; }).length;
  B.push({ type: 'kpis', items: [
    { i: '🚫', l: 'فترات الغياب', v: ta }, { i: '🤒', l: 'فترات المرض', v: ts },
    { i: '🟡', l: 'متابعة (≥' + C0.absWatch + ')', v: nW, c: '#f59e0b' }, { i: '🔴', l: 'إنذار (≥' + C0.absAlert + ')', v: nA, c: FAIL },
    { i: '✅', l: 'بلا غياب', v: rows.filter(function (r) { return r.abs === 0; }).length, c: '#10b981' } ] });
  var wk = {}, topW = 0;
  ms.forEach(function (m) { Object.keys(m.absWeeks).forEach(function (w) { w = Number(w); if (!wk[w]) wk[w] = { abs: 0, sick: 0 }; wk[w].abs += m.absWeeks[w].abs; wk[w].sick += m.absWeeks[w].sick; if (w > topW) topW = w; }); });
  var mx = 0, wl = [];
  for (var w = 1; w <= topW; w++) { var q = wk[w] || { abs: 0, sick: 0 }; if (q.abs + q.sick > 0) wl.push(w); mx = Math.max(mx, q.abs + q.sick); }
  if (wl.length) B.push({ type: 'bars', title: 'توزيع الغياب على الأسابيع', items: wl.map(function (w) {
    var q = wk[w]; return { l: 'الأسبوع ' + w, v: mx ? (q.abs + q.sick) / mx * 100 : 0, t: q.abs + ' غياب' + (q.sick ? ' + ' + q.sick + ' مرض' : ''), c: q.abs >= q.sick ? '#f97316' : '#8b5cf6' };
  }) });
  var hi = rows.filter(function (r) { return !r.all && r.abs >= C0.absWatch; }), lo = rows.filter(function (r) { return !r.all && r.abs < C0.absWatch; });
  var ah = mean(hi.map(function (r) { return r.pct; })), al = mean(lo.map(function (r) { return r.pct; }));
  if (hi.length && lo.length && ah != null && al != null) {
    B.push({ type: 'note', kind: 'info', t: 'متوسط درجات كثيري الغياب (' + hi.length + ' طالب) ' + pcs(ah) + ' مقابل ' + pcs(al) + ' لغيرهم — فرق ' + sgn(ah - al, ' نقطة') + '.' });
  }
  var cols = []; if (all) cols.push({ h: 'الفصل' });
  cols.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'غياب' }, { h: 'مرض' }, { h: 'الإجمالي' }, { h: 'أسابيع بها غياب' }, { h: 'آخر أسبوع' }, { h: 'الحالة' }, { h: 'الدرجة %' });
  var srt = rows.slice().sort(function (a, b) { return b.abs - a.abs || b.sick - a.sick; });
  B.push({ type: 'table', id: 'abs' + (all ? '_all' : ''), title: 'الطلاب', cols: cols, rows: srt.map(function (r) {
    var m = ms.filter(function (q) { return q.cls === r.cls; })[0], o = [];
    var st = r.abs >= C0.absAlert ? ['إنذار', FAIL] : r.abs >= C0.absWatch ? ['متابعة', '#f59e0b'] : r.abs === 0 ? ['منتظم', '#10b981'] : ['طبيعي', GREY];
    if (all) o.push(C(r.cls));
    o.push(NM(r), C(r.abs, { b: r.abs >= C0.absWatch, c: r.abs >= C0.absAlert ? FAIL : r.abs >= C0.absWatch ? '#f59e0b' : undefined }), C(r.sick), C(r.abs + r.sick, { b: 1 }),
      C(r.absWeeks), C(r.lastAbsWeek == null ? '—' : r.lastAbsWeek, { v: r.lastAbsWeek }), C(st[0], { c: st[1], b: 1, v: r.abs }), r.all ? C('غائب كلي', { c: FAIL }) : pctCell(r.pct, m));
    return o;
  }), note: 'الحالة تُحدَّد بفترات «الغياب» فقط؛ المرض عذر ولا يدخل في الإنذار. الحدود من ⚙️ الإعدادات.' });
  return { title: t, sub: all ? 'كل الفصول' : x.cls, blocks: B, land: all };
}

/* ⑩ السلوك */
function R_beh(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'تقرير السلوك';
  if (!m.use.b) return empty(t, 'لم يُرصد السلوك والمواظبة بعد (أعمدة «سلوك ومواظبة» أسبوعياً).');
  var B = [], act = m.act;
  var avg = m.compAvg.b, lo = act.filter(function (r) { return r.bP < 60; }).length, hi = act.filter(function (r) { return r.bP >= 90; }).length;
  B.push({ type: 'kpis', items: [
    { i: '🤝', l: 'متوسط السلوك', v: pcs(avg), c: lvl(avg, C0).color }, { i: '⚠️', l: 'أقل من 60%', v: lo, c: lo ? FAIL : '#10b981' },
    { i: '🌟', l: '90% فأكثر', v: hi, c: '#10b981' }, { i: '📅', l: 'أسابيع مرصودة', v: m.cw.b.filter(function (w) { return m.wkRec.b[w]; }).length } ] });
  var W = m.cw.b.filter(function (w) { return m.wkRec.b[w]; });
  if (W.length >= 2) B.push({ type: 'line', title: 'متوسط السلوك لكل أسبوع (%)', labels: weeksLabel(W), series: [{ name: 'السلوك', color: '#10b981', vals: W.map(function (w) { return m.series.b[w]; }) }] });
  var rows = act.slice().sort(function (a, b) { return a.bP - b.bP; }).map(function (r) {
    var mn = null, mw = null, below = 0;
    W.forEach(function (w) { var c = r.w.b[w]; if (c && (c.st === 'v' || c.st === 'abs')) { if (mn == null || c.v < mn) { mn = c.v; mw = w; } if (c.v / m.BM < .6) below++; } });
    var st = r.bP < 60 ? ['ضعيف', FAIL] : r.bP < 75 ? ['يحتاج دعم', '#f59e0b'] : r.bP >= 90 ? ['متميز', '#10b981'] : ['جيد', '#3b82f6'];
    return [NM(r), C(r.hasBeh ? r.calc.avgBeh : 0), pctCell(r.bP, m), C(mn == null ? '—' : mn + ' (أسبوع ' + mw + ')', { v: mn }), C(below), C(r.abs), C(st[0], { c: st[1], b: 1, v: r.bP })];
  });
  B.push({ type: 'table', id: 'beh', title: 'الطلاب (الأضعف أولاً)', cols: [{ h: 'الاسم', nm: 1, a: 'r' }, { h: 'المتوسط/' + m.BM }, { h: '%' }, { h: 'أدنى أسبوع' }, { h: 'أسابيع <60%' }, { h: 'غياب' }, { h: 'الحالة' }], rows: rows });
  return { title: t + ' — ' + x.cls, sub: act.length + ' طالب', blocks: B };
}

/* ⑪ اكتمال الرصد */
function R_miss(x) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'اكتمال الرصد';
  if (!m.nAct) return empty(t, 'لا توجد درجات مرصودة.');
  var K = RP.miss, kn = { a: 'التقييمات', h: 'الواجبات', b: 'السلوك' };
  if (!m.use[K]) K = m.use.a ? 'a' : m.use.h ? 'h' : m.use.b ? 'b' : 'a';
  var B = [];
  B.push({ type: 'kpis', items: [
    { i: '🧾', l: 'اكتمال الرصد', v: pcs(m.complete), c: m.complete != null && m.complete < 90 ? '#f59e0b' : '#10b981' },
    { i: '❌', l: 'خانات ناقصة', v: m.missN, c: m.missN ? FAIL : '#10b981' },
    { i: '📅', l: 'آخر أسبوع مرصود', v: m.lastWeek || '—' },
    { i: '👤', l: 'طلاب بنقص ≥ 3', v: m.act.filter(function (r) { return r.miss >= 3; }).length } ] });
  var chips = '<div class="rp-sub">' + ['a', 'h', 'b'].filter(function (k) { return m.use[k]; }).map(function (k) {
    return '<button class="rp-chip' + (k === K ? ' on' : '') + '" onclick="RP2.missComp(\'' + k + '\')">' + kn[k] + '</button>';
  }).join('') + '</div>';
  B.push({ type: 'html', html: chips });
  var W = m.cw[K].filter(function (w) { return w <= m.last[K]; });
  var cols = [{ h: 'الاسم', nm: 1, a: 'r' }];
  W.forEach(function (w) { cols.push({ h: 'أ' + w, s: false }); });
  cols.push({ h: 'ناقص' }, { h: 'ناقص (الكل)' });
  var rows = m.rows.map(function (r) {
    var o = [NM(r)], n = 0;
    W.forEach(function (w) {
      var c = r.w[K][w], mx = K === 'a' ? m.AM : K === 'h' ? m.HM : m.BM;
      if (r.all) { o.push(C('غ', { c: GREY })); return; }
      if (c.st === 'v') { var l = lvl(c.v / mx * 100, C0); o.push(C(c.v, { v: c.v, c: l.color, bg: tint(l.color, .14) })); }
      else if (c.st === 'abs') o.push(C('غ', { c: '#a78bfa', b: 1 }));
      else if (c.st === 'exc') o.push(C('م', { c: GREY }));
      else if (!m.wkRec[K][w]) o.push(C('·', { c: GREY }));
      else { n++; o.push(C('✗', { c: FAIL, b: 1, bg: tint(FAIL, .15), v: -1 })); }
    });
    o.push(C(n, { b: n > 0, c: n ? FAIL : '#10b981' }), C(r.all ? '—' : r.miss, { v: r.all ? null : r.miss }));
    return o;
  });
  B.push({ type: 'table', id: 'miss_' + K, title: 'مصفوفة ' + kn[K] + ' (أسابيع 1–' + (m.last[K] || 0) + ')', cols: cols, rows: rows,
    note: '✗ = خانة فارغة في أسبوع رُصد لباقي الفصل · م = معفى · غ = غياب · · = أسبوع لم يُرصد لأحد.' });
  var gaps = [];
  m.weeks.filter(function (w) { return w <= m.lastWeek && !m.wkRec.a[w] && !m.wkRec.h[w] && !m.wkRec.b[w]; }).forEach(function (w) { gaps.push(w); });
  if (gaps.length) B.push({ type: 'note', kind: 'warn', t: 'أسابيع لم يُرصد فيها شيء لأي طالب: ' + gaps.join('، ') + ' (قد تكون إجازة أو اختباراً).' });
  var ex = [];
  [0, 1].forEach(function (i) { if (m.use.e[i]) { var n = m.act.filter(function (r) { return r.ex[i].st === 'blank'; }).length; if (n) ex.push('اختبار ' + (i + 1) + ': ' + n + ' طالب بلا درجة'); } });
  if (ex.length) B.push({ type: 'note', kind: 'warn', t: ex.join(' — ') });
  return { title: t + ' — ' + x.cls, sub: kn[K], blocks: B, land: true };
}

/* ⑤-ب الطلبة المتعثرون (مع تأشير المتابعة وتدوين السبب) */
var FU_REASONS = ['ضعف في المهارات الأساسية', 'غياب متكرر', 'عدم تسليم الواجبات', 'ظروف أسرية', 'ضعف التركيز', 'قلق الاختبار', 'صعوبات تعلّم', 'مشكلات سلوكية'];
function fdate(ts) { var d = new Date(ts); return isNaN(d) ? '' : d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
function R_weak(x) {
  var ms = x.models(), C0 = x.cfg, t = 'الطلبة المتعثرون', all = x.all;
  var rows = flat(ms).filter(function (r) { return r.all || r.pct < C0.pass || r.pri === 3 || (r.fu && (r.fu.d || r.fu.n)); });
  var B = [];
  var done = rows.filter(function (r) { return r.fu && r.fu.d; }).length;
  B.push({ type: 'kpis', items: [
    { i: '🆘', l: 'المتعثرون', v: rows.length, c: rows.length ? FAIL : '#10b981' },
    { i: '✅', l: 'تمت متابعتهم', v: done, c: '#10b981' },
    { i: '⏳', l: 'لم يُتابَعوا', v: rows.length - done, c: rows.length - done ? '#f59e0b' : '#10b981' } ] });
  if (!rows.length) {
    B.push({ type: 'note', t: 'لا يوجد طلبة متعثرون حالياً 🎉' });
    return { title: t, sub: all ? 'كل الفصول' : x.cls, blocks: B };
  }
  var F = RP.fuF;
  var chips = '<div class="rp-sub">' + [['all', 'الكل (' + rows.length + ')'], ['todo', 'لم يُتابَع (' + (rows.length - done) + ')'], ['done', 'تمت متابعته (' + done + ')']].map(function (q) {
    return '<button class="rp-chip' + (q[0] === F ? ' on' : '') + '" onclick="RP2.fuFilter(\'' + q[0] + '\')">' + q[1] + '</button>';
  }).join('') + '</div><datalist id="rpReasons">' + FU_REASONS.map(function (q) { return '<option value="' + E(q) + '">'; }).join('') + '</datalist>';
  B.push({ type: 'html', html: chips });
  var list = rows.filter(function (r) { var d = !!(r.fu && r.fu.d); return F === 'all' || (F === 'done' ? d : !d); })
    .sort(function (a, b) {
      var da = a.fu && a.fu.d ? 1 : 0, db = b.fu && b.fu.d ? 1 : 0;
      return da - db || b.score - a.score || (a.pct == null ? -1 : b.pct == null ? 1 : a.pct - b.pct);
    });
  var cols = []; if (all) cols.push({ h: 'الفصل' });
  cols.push({ h: 'الاسم', nm: 1, a: 'r' }, { h: 'تمت المتابعة' }, { h: '%' }, { h: 'الغياب' }, { h: 'أسباب التعثر', a: 'r', s: false }, { h: 'سبب / ملاحظتي', a: 'r' }, { h: 'تاريخ المتابعة' });
  B.push({ type: 'table', id: 'weak' + (all ? '_all' : ''), title: 'قائمة المتعثرين (' + list.length + ')', cols: cols, empty: 'لا يوجد طلاب في هذه القائمة.',
    rows: list.map(function (r) {
      var m = ms.filter(function (q) { return q.cls === r.cls; })[0], ci = DB.classes.indexOf(r.cls);
      var on = !!(r.fu && r.fu.d), note = (r.fu && r.fu.n) || '';
      var ck = C(on ? '☑' : '☐', { v: on ? 1 : 0, p: on ? '☑' : '☐', nowr: 1,
        h: '<input type="checkbox" class="rp-ck"' + (on ? ' checked' : '') + ' onchange="RP2.fu(' + ci + ',' + r.si + ',this.checked)">' });
      var o = [];
      if (all) o.push(C(r.cls));
      var why = tagHtml(m, r.flags) || '<span class="rp-tag" style="color:#10b981">لا أسباب حالية</span>';
      o.push(NM(r), ck, r.all ? C('غائب كلي', { c: FAIL, b: 1 }) : pctCell(r.pct, m), C(r.abs, { c: r.abs >= C0.absAlert ? FAIL : r.abs >= C0.absWatch ? '#f59e0b' : undefined }),
        C(flagText(m, r.flags) || 'لا أسباب حالية', { h: why }),
        C(note, { p: note || '—',
          h: '<input type="text" class="rp-fi" list="rpReasons" placeholder="اكتب سبب التعثر…" value="' + E(note) + '" onchange="RP2.fuNote(' + ci + ',' + r.si + ',this.value)">' }),
        C(on ? fdate(r.fu.d) : '—', { v: on ? r.fu.d : null }));
      return o;
    }),
    note: 'المتعثر = دون حد النجاح (' + C0.pass + '%) أو غائب كلياً أو أولويته «عاجل». يبقى الطالب في القائمة بعد تجاوزه إن سبق تأشير متابعته أو تدوين سببه. «أسباب التعثر» تُستنتج تلقائياً، وخانة «سبب / ملاحظتي» لتدوين تقديرك.' });
  return { title: t, sub: (all ? 'كل الفصول' : x.cls) + ' — حد النجاح ' + C0.pass + '%', blocks: B, land: true };
}

/* ⑫ تقرير الطالب (بطاقة الطالب / ولي الأمر) */
function R_stu(x, si) {
  var m = x.model(x.cls), C0 = x.cfg, t = 'تقرير الطالب';
  if (!m.rows.length) return empty(t, 'لا يوجد طلاب في هذا الفصل.');
  var r = null;
  m.rows.forEach(function (q) { if (si != null ? q.si === si : q.si === RP.si) r = q; });
  if (!r) r = m.rows[0];
  var B = [];
  B.push({ type: 'html', html: '<div class="rp-sub"><select class="ns-select rp-sel" onchange="RP2.pick(this.value)">' + m.rows.map(function (q) {
    return '<option value="' + q.si + '"' + (q.si === r.si ? ' selected' : '') + '>' + E(q.name) + '</option>'; }).join('') + '</select></div>' });
  if (r.all) {
    B.push({ type: 'note', kind: 'warn', t: 'الطالب مسجّل «غائب كلي» ولا تُحسب له درجات.' });
    B.push({ type: 'kpis', items: [{ l: 'فترات الغياب', v: r.abs }, { l: 'فترات المرض', v: r.sick }] });
    return { title: t + ' — ' + r.name, sub: x.cls, blocks: B };
  }
  var l = lvl(r.pct, C0);
  B.push({ type: 'kpis', items: [
    { i: '🎯', l: 'المجموع', v: r.total + ' من ' + m.rm, c: l.color }, { i: '📊', l: 'النسبة', v: pcs(r.pct), s: l.label, c: l.color },
    { i: '🏅', l: 'الترتيب', v: r.rank + ' من ' + m.nAct }, { i: '📈', l: 'متوسط الفصل', v: pcs(m.avgPct) },
    { i: '🚫', l: 'غياب', v: r.abs, c: r.abs >= C0.absWatch ? '#f59e0b' : undefined }, { i: '🤒', l: 'مرض', v: r.sick } ] });
  var cmp = [['التقييمات', r.aP, m.compAvg.a], ['الواجبات', r.hP, m.compAvg.h], ['السلوك', r.bP, m.compAvg.b], ['الاختبارات', r.exP, m.compAvg.e]].filter(function (c) { return c[1] != null; });
  B.push({ type: 'table', id: 'stu_cmp', title: 'مقارنة بمتوسط الفصل', s: false, cols: [{ h: 'المكوّن', nm: 1, a: 'r' }, { h: 'الطالب' }, { h: 'الفصل' }, { h: 'الفرق' }],
    rows: cmp.map(function (c) { var d = c[2] == null ? null : c[1] - c[2]; return [C(c[0], { nm: 1 }), pctCell(c[1], m), C(pcs(c[2])), C(sgn(d), { v: d, b: 1, c: d == null ? undefined : d < -10 ? FAIL : d > 10 ? '#10b981' : undefined })]; }) });
  var W = m.recWeeks;
  if (W.length >= 2) B.push({ type: 'line', title: 'الأداء الأسبوعي: الطالب مقابل الفصل (%)', labels: weeksLabel(W), series: [
    { name: 'الطالب', color: '#3b82f6', vals: W.map(function (w) { return r.wp[w] != null ? r.wp[w] : null; }) },
    { name: 'متوسط الفصل', color: '#94a3b8', dash: 1, vals: W.map(function (w) { return m.series.p[w]; }) }] });
  function wc(c, mx) { if (!c) return C('—'); if (c.st === 'v') return C(c.v, { v: c.v, c: lvl(c.v / mx * 100, C0).color, b: 1 }); if (c.st === 'abs') return C('غ', { c: '#a78bfa', b: 1 }); if (c.st === 'exc') return C('م', { c: GREY }); return C('—', { c: GREY }); }
  var wrows = m.weeks.filter(function (w) { return w <= m.lastWeek; }).map(function (w) {
    var q = r.absW[w] || { abs: 0, sick: 0 };
    return [C('أسبوع ' + w, { v: w, nm: 1 }), wc(r.w.a[w], m.AM), wc(r.w.h[w], m.HM), wc(r.w.b[w], m.BM), C(q.abs || '·', { c: q.abs ? FAIL : GREY }), C(q.sick || '·', { c: q.sick ? '#8b5cf6' : GREY })];
  });
  B.push({ type: 'table', id: 'stu_w', title: 'التفاصيل الأسبوعية', s: false, empty: 'لا توجد أسابيع مرصودة.',
    cols: [{ h: 'الأسبوع', nm: 1, a: 'r' }, { h: 'تقييم/' + m.AM }, { h: 'واجب/' + m.HM }, { h: 'سلوك/' + m.BM }, { h: 'غياب' }, { h: 'مرض' }], rows: wrows });
  var er = [];
  [0, 1].forEach(function (i) { if (!m.use.e[i]) return; var c = r.ex[i], cm = mean(m.act.filter(function (q) { return q.ex[i].st === 'v'; }).map(function (q) { return q.ex[i].v / m.EM[i] * 100; }));
    er.push([C('اختبار ' + (i + 1), { nm: 1 }), wc(c, m.EM[i]), C(m.EM[i]), c.st === 'v' ? pctCell(c.v / m.EM[i] * 100, m) : C('—'), C(pcs(cm))]); });
  if (er.length) B.push({ type: 'table', id: 'stu_ex', title: 'الاختبارات', s: false, cols: [{ h: 'الاختبار', nm: 1, a: 'r' }, { h: 'الدرجة' }, { h: 'من' }, { h: '%' }, { h: 'متوسط الفصل' }], rows: er });
  var ob = [];
  cmp.forEach(function (c) { if (c[2] != null && c[1] - c[2] >= 10) ob.push('نقطة قوة: ' + c[0] + ' أعلى من متوسط الفصل بـ ' + f0(c[1] - c[2]) + ' نقطة.'); if (c[1] < C0.pass) ob.push('يحتاج دعماً في ' + c[0] + ' (' + pcs(c[1]) + ').'); });
  if (r.delta != null && r.delta <= -C0.drop) ob.push('تراجع في آخر 3 أسابيع بمقدار ' + f0(-r.delta) + ' نقطة.');
  if (r.delta != null && r.delta >= C0.drop) ob.push('تحسّن في آخر 3 أسابيع بمقدار ' + f0(r.delta) + ' نقطة.');
  if (r.abs >= C0.absWatch) ob.push('عدد فترات الغياب ' + r.abs + ' — يحتاج متابعة الحضور.');
  if (r.calc.absenceDeduct > 0) ob.push('خُصم من مجموعه ' + r.calc.absenceDeduct + ' درجة بسبب سياسة الغياب.');
  if (r.miss > 0) ob.push('توجد ' + r.miss + ' خانة غير مرصودة له — قد تؤثر على دقة المجموع.');
  if (!ob.length) ob.push('أداء منتظم دون ملاحظات خاصة.');
  B.push({ type: 'list', title: '📝 ملاحظات', items: ob });
  B.push({ type: 'sign', items: ['المعلم', 'ولي الأمر', 'المتابع / الإدارة'] });
  return { title: t + ' — ' + r.name, sub: x.cls + ' · ' + (DB.meta.subject || ''), blocks: B };
}

/* ═══════════════ سجل التقارير ═══════════════ */
var GROUPS = ['نظرة عامة', 'الأداء الدراسي', 'المواظبة والانضباط', 'جودة الرصد', 'تقرير فردي'];
var REPORTS = [
  { id: 'dash',  g: 0, ic: '📋', t: 'لوحة الفصل',         fn: R_dash },
  { id: 'cmp',   g: 0, ic: '⚖️', t: 'مقارنة الفصول',      fn: R_cmp,  all: 'only' },
  { id: 'sheet', g: 1, ic: '📑', t: 'كشف الطلاب',         fn: R_sheet, all: true },
  { id: 'rank',  g: 1, ic: '🏆', t: 'الترتيب والمتفوقون', fn: R_rank, all: true },
  { id: 'risk',  g: 1, ic: '🚨', t: 'متابعة الطلاب',      fn: R_risk, all: true },
  { id: 'weak',  g: 1, ic: '🆘', t: 'الطلبة المتعثرون',   fn: R_weak, all: true },
  { id: 'comp',  g: 1, ic: '🧩', t: 'تحليل المكوّنات',    fn: R_comp },
  { id: 'trend', g: 1, ic: '📈', t: 'التطور الأسبوعي',    fn: R_trend },
  { id: 'exam',  g: 1, ic: '📝', t: 'الاختبارات',         fn: R_exam },
  { id: 'abs',   g: 2, ic: '🚫', t: 'الغياب والمرض',      fn: R_abs,  all: true },
  { id: 'beh',   g: 2, ic: '🤝', t: 'السلوك',             fn: R_beh },
  { id: 'miss',  g: 3, ic: '🧾', t: 'اكتمال الرصد',       fn: R_miss },
  { id: 'stu',   g: 4, ic: '👤', t: 'تقرير الطالب',       fn: R_stu }
];
function getRep(id) { for (var i = 0; i < REPORTS.length; i++) if (REPORTS[i].id === id) return REPORTS[i]; return REPORTS[0]; }

function makeCtx() {
  var C0 = cfg(), cache = {};
  var scope = RP.cls === '*' ? DB.classes.slice() : [RP.cls];
  var x = { cfg: C0, cls: RP.cls, all: RP.cls === '*', scope: scope };
  x.model = function (c) { return cache[c] || (cache[c] = buildModel(c, C0)); };
  x.models = function () { return scope.map(x.model); };
  return x;
}

function fix() {
  var R = getRep(RP.view); RP.view = R.id;
  if (R.all === 'only') { if (RP.cls !== '*') { RP.prev = RP.cls; RP.cls = '*'; } }
  else if (RP.cls === '*' && !R.all) RP.cls = (RP.prev && DB.classes.indexOf(RP.prev) >= 0) ? RP.prev : DB.classes[0];
  else if (RP.cls !== '*' && DB.classes.indexOf(RP.cls) < 0) RP.cls = DB.classes[0];
}

/* ═══════════════ الواجهة ═══════════════ */
function chipsHtml() {
  var h = '<div class="rp-chips" id="rpChips">', g = -1;
  REPORTS.forEach(function (r) {
    if (r.g !== g) { if (g >= 0) h += '<span class="rp-sep"></span>'; g = r.g; }
    h += '<button class="rp-chip' + (r.id === RP.view ? ' on' : '') + '" onclick="RP2.view(\'' + r.id + '\')">' + r.ic + ' ' + r.t + '</button>';
  });
  return h + '</div>';
}
function headHtml() {
  var R = getRep(RP.view);
  var sel = '<select class="ns-select rp-sel" onchange="RP2.cls(this.value)"' + (R.all === 'only' ? ' disabled' : '') + '>';
  if (R.all) sel += '<option value="*"' + (RP.cls === '*' ? ' selected' : '') + '>📚 كل الفصول</option>';
  if (R.all !== 'only') DB.classes.forEach(function (c) { sel += '<option value="' + E(c) + '"' + (c === RP.cls ? ' selected' : '') + '>🏫 ' + E(c) + '</option>'; });
  sel += '</select>';
  return '<div class="rp-head">' + chipsHtml() + '<div class="rp-ctl">' + sel +
    '<button class="rp-btn" onclick="RP2.print()">🖨️ طباعة</button><button class="rp-btn" onclick="RP2.xlsx()">⬇ Excel</button>' +
    (R.id === 'stu' ? '<button class="rp-btn" onclick="RP2.printAll()" title="طباعة تقرير لكل طالب في الفصل">🖨️ كل الفصل</button>' : '') +
    '<button class="rp-btn" onclick="RP2.cfg()" title="إعدادات التقارير">⚙️</button></div></div>';
}
function policyText() {
  var M = DB.meta || {}, o = [];
  if (M.absenceMode === 'zero') o.push('سياسة الغياب: أي غياب = صفر');
  else if (M.absenceMode === 'deduct') o.push('سياسة الغياب: خصم ' + (Number(M.absenceDeductPer) || 0) + ' لكل فترة بعد ' + (Number(M.absenceAllowed) || 0));
  if (M.examAbsenceMode === 'exclude') o.push('غياب الاختبار: يُستبعد');
  return o;
}
function ctxHtml(x) {
  var C0 = x.cfg, p = [], w = [];
  if (x.all) {
    p.push('كل الفصول (' + x.scope.length + ')');
  } else {
    var m = x.model(x.cls);
    p.push(m.recWeeks.length ? 'أسابيع مرصودة: ' + m.recWeeks.length + ' (حتى الأسبوع ' + m.lastWeek + ' من ' + m.weeks.length + ')' : 'لا توجد أسابيع مرصودة');
    p.push('الدرجة العظمى المرصودة: ' + m.rm);
    if (m.complete != null) p.push('اكتمال الرصد: ' + pcs(m.complete));
    if (m.nAll) p.push(m.nAll + ' غائب كلي مستبعد');
    if (m.nAct && !m.use.a && !m.use.h && !m.use.b && !m.use.e[0] && !m.use.e[1]) w.push('لم تُرصد أي درجات لهذا الفصل بعد — التقارير ستظهر فارغة.');
  }
  p.push('حد النجاح: ' + C0.pass + '%');
  policyText().forEach(function (s) { p.push(s); });
  return '<div class="rp-ctx">' + p.map(E).join(' · ') + '</div>' + w.map(function (s) { return '<div class="rp-note warn">' + E(s) + '</div>'; }).join('');
}

function render(keep) {
  if (!DB || !DB.classes) return;
  var body = $('repBody'); if (!body) return;
  if (!DB.classes.length) { body.innerHTML = '<div class="rp-note warn">لا توجد فصول بعد — أنشئ فصلاً من صفحة الدرجات.</div>'; return; }
  var top = keep ? body.scrollTop : 0;
  fix();
  var R = getRep(RP.view), x = makeCtx(), out, res = null;
  try { res = R.fn(x); out = blocksHtml(res.blocks, 'screen'); }
  catch (e) { console.error('[reports]', e); out = '<div class="rp-note warn">تعذّر بناء هذا التقرير: ' + E(e && e.message) + '</div>'; }
  RP.last = res;
  var ctx = '';
  try { ctx = ctxHtml(x); } catch (e2) { console.error('[reports ctx]', e2); }
  body.innerHTML = headHtml() + '<div class="rp-out">' + ctx + out + '</div>';
  var on = body.querySelector('.rp-chip.on');
  if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e3) { } }
  body.scrollTop = top;
  var acts = $('repTopActions');
  if (acts) acts.innerHTML = '<span style="font-size:11px;color:#60a5fa;font-weight:700;">' + E((DB.meta || {}).subject || 'العلوم') + '</span>';
  buildNav();
}

function buildNav() {
  var nl = $('repNavList'); if (!nl) return;
  var h = '<div class="app-nav-section-lbl">📊 التقارير</div>';
  REPORTS.forEach(function (r) {
    h += '<button class="app-nav-btn' + (r.id === RP.view ? ' anb-active' : '') + '" onclick="RP2.view(\'' + r.id + '\');repNavClose();"><span>' + r.ic + '</span>' + r.t + '</button>';
  });
  h += '<div class="app-nav-sep"></div><div class="app-nav-section-lbl">📱 صفحات التطبيق</div>';
  [
    { p: 'home', icon: '🏠', lbl: 'الرئيسية', extra: '' },
    { p: 'grades', icon: '📝', lbl: 'الدرجات', extra: '' },
    { p: 'weekly', icon: '🎯', lbl: 'الراصد', extra: "setTimeout(function(){WKS.viewMode='numpad';WKS.numpadStudent=null;WKS.numpadInput='';renderWeekly();renderViewBar();},80);" },
    { p: 'sched', icon: '🗓', lbl: 'الجدول', extra: '' },
    { p: 'absence', icon: '📋', lbl: 'الغياب', extra: '' },
    { p: 'sick', icon: '🤒', lbl: 'المرضى', extra: '' },
    { p: 'dict', icon: '🎤', lbl: 'الإملاء', extra: '' },
    { p: 'curric', icon: '📖', lbl: 'توزيع المنهج', extra: '' },
    { p: 'settings', icon: '⚙️', lbl: 'الإعدادات', extra: '' },
    { p: 'backup', icon: '💾', lbl: 'النسخ الاحتياطي', extra: '' },
    { p: 'tafrigh', icon: '📋', lbl: 'كشف التفريغ', extra: '' },
    { p: 'witness', icon: '✍️', lbl: 'توقيع المتابع', extra: '' },
    { p: 'notifs', icon: '🔔', lbl: 'الإشعارات', extra: '' }
  ].forEach(function (it) {
    h += '<button class="app-nav-btn" onclick="portalShow(0);switchPage(\'' + it.p + '\');' +
      (typeof bnSetActive === 'function' ? "bnSetActive('" + it.p + "');" : '') + it.extra + 'repNavClose();"><span>' + it.icon + '</span>' + it.lbl + '</button>';
  });
  nl.innerHTML = h;
}

/* ═══════════════ إعدادات التقارير ═══════════════ */
function cfgOpen() {
  var c = cfg(), host = document.querySelector('#repPage .app'); if (!host) return;
  var old = $('rpModal'); if (old) old.remove();
  function fld(id, lbl, v, mn, mx, hint) {
    return '<label class="rp-f"><span>' + lbl + '</span><input id="rpc_' + id + '" type="number" inputmode="numeric" min="' + mn + '" max="' + mx + '" value="' + v + '"><small>' + hint + '</small></label>';
  }
  host.insertAdjacentHTML('beforeend', '<div class="rp-modal" id="rpModal"><div class="rp-mbox"><div class="rp-mt">⚙️ إعدادات التقارير</div>' +
    fld('pass', 'حد النجاح %', c.pass, 30, 60, 'يُطبَّق على كل التقارير (30–60)') +
    fld('excel', 'حد التفوق %', c.excel, 75, 100, 'لقب «ممتاز» ولوحة الشرف (75–100)') +
    fld('absWatch', 'غياب يحتاج متابعة (فترات)', c.absWatch, 1, 40, 'فترات «الغياب» بدون المرض') +
    fld('absAlert', 'غياب إنذار (فترات)', c.absAlert, 2, 60, 'يجب أن يكون أكبر من حد المتابعة') +
    fld('drop', 'حد التراجع / التحسّن (نقاط)', c.drop, 5, 40, 'آخر 3 أسابيع مقابل ما قبلها') +
    '<div class="rp-mb"><button class="rp-btn pri" onclick="RP2.cfgSave()">حفظ</button><button class="rp-btn" onclick="RP2.cfgReset()">القيم الافتراضية</button><button class="rp-btn" onclick="RP2.cfgClose()">إغلاق</button></div></div></div>');
}
function cfgSave() {
  var o = {};
  Object.keys(DEF).forEach(function (k) { var el = $('rpc_' + k); if (el && el.value !== '') o[k] = Number(el.value); });
  DB.meta.repCfg = o; saveDB(); cfgClose(); render(true);
  showSnack('✅ تم حفظ إعدادات التقارير');
}
function cfgReset() { delete DB.meta.repCfg; saveDB(); cfgClose(); render(true); showSnack('تمت إعادة القيم الافتراضية'); }
function cfgClose() { var m = $('rpModal'); if (m) m.remove(); }

/* سجل المتابعة: DB.follow[الفصل][معرّف الطالب] = { d: وقت التأشير, n: السبب/الملاحظة } */
function fuRec(ci, si, create) {
  var cls = DB.classes[ci], s = cls && DB.data[cls] && DB.data[cls][si];
  if (!s) return null;
  if (!DB.follow) DB.follow = {};
  if (!DB.follow[cls]) DB.follow[cls] = {};
  var o = DB.follow[cls][s.id];
  if (!o && create) o = DB.follow[cls][s.id] = {};
  return { cls: cls, id: s.id, o: o };
}
function fuTidy(g) { var o = DB.follow[g.cls][g.id]; if (o && !o.d && !o.n) delete DB.follow[g.cls][g.id]; }

/* ═══════════════ واجهة الأحداث العامة ═══════════════ */
window.RP2 = {
  view: function (v) { RP.view = v; render(); var b = $('repBody'); if (b) b.scrollTop = 0; },
  cls: function (c) { RP.cls = c; if (c !== '*') RP.prev = c; render(); },
  sort: function (id, i) {
    var cur = RP.sort[id];
    if (cur && cur.c === i) cur.d = -cur.d;
    else {
      var first = 1;
      if (RP.last) RP.last.blocks.forEach(function (b) {
        if (b.type === 'table' && b.id === id) {
          for (var k = 0; k < b.rows.length; k++) { var v = cv(b.rows[k][i]); if (typeof v === 'number') { first = -1; break; } }
        }
      });
      RP.sort[id] = { c: i, d: first };
    }
    render(true);
  },
  go: function (ci, si) {
    var c = DB.classes[ci]; if (!c) return;
    RP.cls = c; RP.prev = c;
    if (si < 0) RP.view = 'dash'; else { RP.view = 'stu'; RP.si = si; }
    render(); var b = $('repBody'); if (b) b.scrollTop = 0;
  },
  pick: function (v) { RP.si = Number(v); render(true); },
  fuFilter: function (f) { RP.fuF = f; render(true); },
  fu: function (ci, si, on) {
    var g = fuRec(ci, si, true); if (!g) return;
    if (on) g.o.d = Date.now(); else delete g.o.d;
    fuTidy(g); saveDB(); render(true);
  },
  fuNote: function (ci, si, v) {
    var g = fuRec(ci, si, true); if (!g) return;
    v = String(v || '').trim();
    if (v) g.o.n = v; else delete g.o.n;
    fuTidy(g); saveDB(); render(true);
  },
  missComp: function (k) { RP.miss = k; render(true); },
  print: function () {
    if (!RP.last) { showSnack('لا يوجد تقرير للطباعة'); return; }
    var res = RP.last;
    openPrint(printDoc([printHeader(res) + blocksHtml(res.blocks, 'print')], res.land));
  },
  printAll: function () {
    var x = makeCtx(), m = x.model(x.cls), parts = [];
    m.rows.forEach(function (r) { var res = R_stu(x, r.si); parts.push(printHeader(res) + blocksHtml(res.blocks.filter(function (b) { return b.type !== 'html'; }), 'print')); });
    if (!parts.length) { showSnack('لا يوجد طلاب'); return; }
    openPrint(printDoc(parts, false));
  },
  xlsx: function () {
    if (!RP.last) { showSnack('لا يوجد تقرير للتصدير'); return; }
    if (typeof XLSX === 'undefined') { showSnack('⚠️ مكتبة Excel غير محمّلة — تحتاج اتصالاً بالإنترنت لأول مرة'); return; }
    try {
      var nm = String(RP.last.title).replace(/[\\\/\?\*\[\]:"<>|]/g, ' ').replace(/\s+/g, '_');
      XLSX.writeFile(xlsxBuild(RP.last), nm + '.xlsx');
    } catch (e) { console.error(e); showSnack('⚠️ تعذّر إنشاء ملف Excel'); }
  },
  cfg: cfgOpen, cfgSave: cfgSave, cfgReset: cfgReset, cfgClose: cfgClose,
  _state: RP, _build: buildModel, _cfg: cfg, _reports: REPORTS, _ctx: makeCtx, _html: blocksHtml, _printDoc: printDoc, _xlsx: xlsxBuild
};

/* ═══════════════ نقاط الدخول (متوافقة مع بوابة التبويبات في app-08) ═══════════════ */
function repNavToggle() {
  var bar = $('repNavBar'), ov = $('repNavOverlay'); if (!bar) return;
  var open = bar.classList.toggle('open'); if (ov) ov.classList.toggle('active', open);
}
function repNavClose() {
  var bar = $('repNavBar'), ov = $('repNavOverlay');
  if (bar) bar.classList.remove('open'); if (ov) ov.classList.remove('active');
}
function repInit() {
  if (!DB) { setTimeout(repInit, 300); return; }
  if (!RP.cls && DB.classes.length) RP.cls = DB.classes[0];
  render();
}
function repRefresh() { if (DB) render(true); }   // يُستدعى عند كل عودة لتبويب التقارير حتى لا تبقى الأرقام قديمة
window.repNavToggle = repNavToggle; window.repNavClose = repNavClose;
window.repInit = repInit; window.repRefresh = repRefresh; window._repRender = render;

})();
