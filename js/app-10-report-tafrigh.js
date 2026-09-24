

// ══════════════════════════════


if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    setTimeout(function(){
      /* ── استخراج مسار sw.js ديناميكياً بناءً على موقع التطبيق الفعلي ──
         يحل مشكلة: مسار ثابت /grades-project/sw.js لا يتطابق مع
         أسماء مستودعات مختلفة على GitHub Pages أو رفع مباشر ── */
      var swPath = (function(){
        var scripts = document.querySelectorAll('script[src]');
        for(var i=0; i<scripts.length; i++){
          var src = scripts[i].getAttribute('src');
          if(src && src.indexOf('app-10') !== -1){
            /* مجلد js/ داخل مجلد التطبيق → ارجع مستوى للأعلى */
            return src.replace(/\/js\/app-10[^/]*$/, '/sw.js');
          }
        }
        /* احتياطي: مسار نسبي من الصفحة الحالية */
        return './sw.js';
      })();

      navigator.serviceWorker.register(swPath)
        .then(function(reg){
          console.log('[SW] مُسجَّل على:', reg.scope);
          reg.update();
          if(reg.waiting){ reg.waiting.postMessage({type:'SKIP_WAITING'}); }
          reg.addEventListener('updatefound', function(){
            var nw = reg.installing;
            if(!nw) return;
            nw.addEventListener('statechange', function(){
              if(nw.state === 'installed' && navigator.serviceWorker.controller){
                nw.postMessage({type:'SKIP_WAITING'});
              }
            });
          });
        })
        .catch(function(err){ console.warn('[SW] فشل التسجيل:', err); });

      /* إعادة تحميل عند تفعيل نسخة جديدة */
      var _swRefreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', function(){
        if(_swRefreshed) return;
        _swRefreshed = true;
        location.reload();
      });
    }, 1000);
  });
}


// ══════════════════════════════


document.addEventListener('DOMContentLoaded', function(){
  function applyScrollFix(){
    document.querySelectorAll('.wk-grid').forEach(function(el){
      el.style.overscrollBehaviorX = 'contain';
    });
    var wb = document.querySelector('.weekly-body');
    if(wb) wb.style.overscrollBehaviorY = 'contain';
  }
  applyScrollFix();
  var root = document.getElementById('weeklyRoot');
  if(root) new MutationObserver(applyScrollFix).observe(root,{childList:true,subtree:true});
});


// ══════════════════════════════


function openAboutModal(){document.getElementById("aboutModal").style.display="flex";}
function closeAboutModal(){document.getElementById("aboutModal").style.display="none";}


// ══════════════════════════════


// ══════════════════════════════════════════════════════
// REPORT PAGE — كشف درجات قابل للطباعة
// ══════════════════════════════════════════════════════

var RPT = {
  cls: null,
  weeks: [],
  allWeeks: false,
  customScores: {},
  examMode: 'auto',   // 'auto' | 'ex1' | 'ex1ex2'
  behMode:  'auto'    // 'auto' | 'beh1' | 'beh1beh2'
};

function rptSaveCustom(cls, field, val){
  if(!RPT.customScores[cls]) RPT.customScores[cls] = {};
  if(val === undefined || val === '' || isNaN(Number(val))){
    delete RPT.customScores[cls][field];
  } else {
    RPT.customScores[cls][field] = Number(val);
  }
  renderReportPage();
}

function rptPrint(){
  // نبني HTML الطباعة مباشرة من البيانات
  if(!RPT.cls && DB.classes.length) RPT.cls = DB.classes[0];
  var aw = Math.min(Math.max(1, Number(DB.meta.activeWeeks)||14), ALL_WEEKS.length);
  var availWeeks = ALL_WEEKS.slice(0, aw);
  var cls = RPT.cls;
  var students = (DB.data[cls]||[]).filter(function(s){return s.name;});
  var selWeeks = (RPT.weeks.length ? RPT.weeks : availWeeks).slice().sort(function(a,b){return a-b;});
  var custom = RPT.customScores[cls] || {};
  var customBeh1 = (custom.beh1 !== undefined) ? Number(custom.beh1) : null;
  var customBeh2 = (custom.beh2 !== undefined) ? Number(custom.beh2) : null;
  var customEx1  = (custom.ex1  !== undefined) ? Number(custom.ex1)  : null;
  var customEx2  = (custom.ex2  !== undefined) ? Number(custom.ex2)  : null;

  function escP(v){ return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function calcP(s){
    var res = {weeks:{}, avgAssess:0, avgHw:0, beh:0, exam:0, total:0};
    var aSum=0, aC=0, hSum=0, hC=0;
    selWeeks.forEach(function(w){
      var av=s['a'+w], hv=s['h'+w];
      var avN=(av===''||av===undefined||av===null)?null:(av==='غ'?0:(av==='م'?null:Number(av)));
      var hvN=(hv===''||hv===undefined||hv===null)?null:(hv==='غ'?0:(hv==='م'?null:Number(hv)));
      res.weeks[w]={a:avN,h:hvN,av_raw:av,hv_raw:hv};
      if(avN!==null){aSum+=avN;aC++;}
      if(hvN!==null){hSum+=hvN;hC++;}
    });
    res.avgAssess = aC ? Math.round(aSum/aC) : 0;
    res.avgHw     = hC ? Math.round(hSum/hC) : 0;
    var b1=(customBeh1!==null)?customBeh1:(Number(s.beh1)||0);
    var b2=(customBeh2!==null)?customBeh2:(Number(s.beh2)||0);
    var e1=(customEx1!==null)?customEx1:(Number(s.ex1)||0);
    var e2=(customEx2!==null)?customEx2:(Number(s.ex2)||0);
    // وضع الاختبار
    var em=RPT.examMode;
    if(em==='auto'){ var se1=(customEx1!==null)?customEx1:(s.ex1!==undefined&&s.ex1!==''&&s.ex1!==null?Number(s.ex1):null); var se2=(customEx2!==null)?customEx2:(s.ex2!==undefined&&s.ex2!==''&&s.ex2!==null?Number(s.ex2):null); em=(se1!==null&&se2===null)?'ex1':'ex1ex2'; }
    var bm=RPT.behMode;
    if(bm==='auto'){ var sb1=(customBeh1!==null)?customBeh1:(s.beh1!==undefined&&s.beh1!==''&&s.beh1!==null?Number(s.beh1):null); var sb2=(customBeh2!==null)?customBeh2:(s.beh2!==undefined&&s.beh2!==''&&s.beh2!==null?Number(s.beh2):null); bm=(sb1!==null&&sb2===null)?'beh1':'beh1beh2'; }
    res.exam = em==='ex1' ? Math.min(e1*2, 30) : Math.min((e1+e2)*2, 30);
    res.beh  = bm==='beh1' ? Math.min(b1*2,10) : Math.min(b1+b2,10);
    res.total = res.avgAssess + res.avgHw + res.beh + res.exam;
    return res;
  }

  var allCalc = students.map(function(s){return {s:s,r:calcP(s)};});
  var totals = allCalc.map(function(x){return x.r.total;});
  var avgTotal = totals.length ? Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length) : 0;
  var maxTotal = totals.length ? Math.max.apply(null,totals) : 0;
  var pass = totals.filter(function(t){return t>=35;}).length;

  var p = '';
  // بدون إحصائيات — مباشرة للجدول

  // الجدول
  p += '<table>';
  p += '<thead>';
  p += '<tr>';
  p += '<th rowspan="2" style="min-width:20px;">#</th>';
  p += '<th rowspan="2" style="min-width:110px;text-align:right;">اسم الطالب</th>';
  selWeeks.forEach(function(w){
    p += '<th colspan="2" style="background:#0f3460;">أ'+w+'</th>';
  });
  p += '<th colspan="4" style="background:#14532d;color:#86efac;">التجميعي</th>';
  p += '<th rowspan="2" style="background:#451a03;color:#fcd34d;min-width:36px;">المج<br/>/70</th>';
  p += '</tr><tr>';
  selWeeks.forEach(function(){
    p += '<th>ت<br/>/20</th>';
    p += '<th>و<br/>/10</th>';
  });
  p += '<th style="background:#14532d;color:#86efac;">م.ت<br/>/20</th>';
  p += '<th style="background:#14532d;color:#67e8f9;">م.و<br/>/10</th>';
  p += '<th style="background:#14532d;color:#a78bfa;" title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br/><small>/10</small></th>';
  p += '<th style="background:#14532d;color:#fdba74;">اخت<br/>/30</th>';
  p += '</tr></thead><tbody>';

  allCalc.forEach(function(item, idx){
    var s=item.s, r=item.r;
    var isFail = r.total < 35;
    p += '<tr>';
    p += '<td class="num-td">'+(idx+1)+'</td>';
    p += '<td class="name-td">'+escP(s.name)+'</td>';
    selWeeks.forEach(function(w){
      var wd=r.weeks[w];
      var av=wd.av_raw, hv=wd.hv_raw;
      var avD=(av===''||av===undefined||av===null)?'—':(av==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(av==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':av));
      var hvD=(hv===''||hv===undefined||hv===null)?'—':(hv==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(hv==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':hv));
      p += '<td>'+avD+'</td>';
      p += '<td>'+hvD+'</td>';
    });
    p += '<td class="avg-td">'+r.avgAssess+'</td>';
    p += '<td class="avg-td">'+r.avgHw+'</td>';
    p += '<td class="beh-td">'+r.beh+'</td>';
    p += '<td class="ex-td">'+r.exam+'</td>';
    p += '<td class="'+(isFail?'fail-td':'tot-td')+'">'+r.total+'</td>';
    p += '</tr>';
  });
  p += '</tbody></table>';

  // ملاحظة مضغوطة
  var exLbl = RPT.examMode==='ex1'?'اختبار 1 (×2)':(RPT.examMode==='ex1ex2'?'اختبار 1+2':'تلقائي');
  var bhLbl = RPT.behMode==='beh1'?'سلوك 1 (×2)':(RPT.behMode==='beh1beh2'?'سلوك 1+2':'تلقائي');
  p += '<div class="note">';
  p += 'المجموع = م.تقييم(20) + م.واجب(10) + سلوك(10) + اختبار(30) = 70';
  p += ' | الأسابيع: '+selWeeks.join('،');
  p += ' | '+exLbl+' | '+bhLbl;
  p += '</div>';

  var now = new Date();
  var dateStr = now.toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

  var win = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes');
  if(!win){ alert('يرجى السماح بالنوافذ المنبثقة في المتصفح'); return; }
  win.document.write(
    '<!DOCTYPE html><html dir="rtl" lang="ar"><head>'
    + '<meta charset="UTF-8"><title>كشف الدرجات — '+escP(cls)+'</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0;}'
    + 'body{font-family:Cairo,sans-serif;background:#f0f4f8;color:#1e293b;font-size:13px;}'
    + '.no-print{background:#1e3a8a;color:white;padding:10px 18px;display:flex;gap:10px;align-items:center;position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.3);}'
    + '.print-btn{background:#3b82f6;border:none;color:white;padding:8px 22px;border-radius:8px;font-size:13px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}'
    + '.close-btn{background:rgba(255,255,255,.2);border:none;color:white;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}'
    + '.content{padding:14px 18px;max-width:1300px;margin:0 auto;}'
    + '.school-header{text-align:center;margin-bottom:12px;padding:10px;background:white;border-radius:10px;border:2px solid #bfdbfe;}'
    + '.school-header h1{font-size:17px;font-weight:900;color:#0f2a5e;margin-bottom:3px;}'
    + '.school-header .sub{font-size:12px;color:#475569;}'
    + '.school-header .date{font-size:10px;color:#94a3b8;margin-top:3px;}'
    + 'table{border-collapse:collapse;width:100%;font-size:12px;direction:rtl;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);}'
    + 'thead tr:first-child th{background:#1e40af;color:white;font-size:11px;font-weight:800;padding:6px 5px;border:1px solid #3b82f6;}'
    + 'thead tr:last-child th{background:#3b82f6;color:white;font-size:10px;font-weight:700;padding:5px 4px;border:1px solid #60a5fa;}'
    + 'td{border:1px solid #bfdbfe;padding:4px 4px;text-align:center;font-size:11px;}'
    + 'td.name-td{text-align:right;font-weight:700;font-size:11px;color:#0f2a5e;background:#eff6ff;padding:4px 7px;min-width:130px;max-width:180px;}'
    + 'td.num-td{color:#64748b;font-size:10px;background:#f8fafc;}'
    + 'td.avg-td{font-weight:800;font-size:11px;color:#065f46;background:#d1fae5;}'
    + 'td.beh-td{font-weight:700;font-size:11px;color:#4c1d95;background:#ede9fe;}'
    + 'td.ex-td{font-weight:800;font-size:11px;color:#7c2d12;background:#ffedd5;}'
    + 'td.tot-td{font-weight:900;font-size:13px;color:#92400e;background:#fef3c7;}'
    + 'td.fail-td{color:#b91c1c!important;background:#fee2e2!important;font-weight:900;font-size:13px;}'
    + 'tr:nth-child(even) td{filter:brightness(0.97);}'
    + '.note{font-size:9px;color:#475569;margin-top:8px;padding:5px 10px;background:#e0e7ff;border-radius:6px;border:1px solid #bfdbfe;}'
    + '@media print{'
    + '  @page{size:A4 landscape;margin:5mm 5mm;}'
    + '  html,body{width:100%;background:#fff;}'
    + '  .no-print{display:none!important;}'
    + '  .content{padding:0;max-width:100%;}'
    + '  .school-header{padding:4px 10px;margin-bottom:5px;border:1.5px solid #1e40af;border-radius:4px;page-break-inside:avoid;background:#eff6ff!important;}'
    + '  .school-header h1{font-size:12px;margin-bottom:2px;color:#0f2a5e!important;}'
    + '  .school-header .sub{font-size:9px;color:#1e40af!important;}'
    + '  .school-header .date{font-size:8px;color:#475569!important;}'
    + '  table{font-size:7.5px;box-shadow:none;border-radius:0;width:100%;table-layout:fixed;}'
    + '  thead tr:first-child th{font-size:8px;padding:3px 2px;}'
    + '  thead tr:last-child th{font-size:7.5px;padding:2px 1px;}'
    + '  th{padding:3px 2px;}'
    + '  td{padding:2.5px 1px;font-size:7.5px;}'
    + '  td.name-td{font-size:7.5px;min-width:80px;max-width:100px;padding:2.5px 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '  td.num-td{font-size:7px;width:18px;}'
    + '  td.avg-td,td.beh-td,td.ex-td{font-size:8px;font-weight:800;}'
    + '  td.tot-td,td.fail-td{font-size:9px;font-weight:900;}'
    + '  .note{font-size:7px;padding:3px 7px;margin-top:3px;}'
    + '  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'
    + '}'
    + '</style>'
    + '</head><body>'
    + '<div class="no-print">'
    + '<button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>'
    + '<button class="close-btn" onclick="window.close()">✕ إغلاق</button>'
    + '<span style="font-size:11px;opacity:.7;margin-right:8px;">اختر "حفظ كـ PDF" عند الطباعة لحفظ الملف</span>'
    + '</div>'
    + '<div class="content">'
    + '<div class="school-header">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="images/logo.jpg" style="width:60px;height:60px;object-fit:contain;border-radius:50%;background:#000;"/><h1 style="margin:0;">'+(DB.meta.schoolName||'Dalty Grades')+'</h1></div>'
    + '<div class="sub">كشف درجات &nbsp;|&nbsp; الفصل: <strong>'+escP(cls)+'</strong> &nbsp;|&nbsp; الأسابيع: <strong>'+selWeeks.join('، ')+'</strong></div>'
    + '<div class="date">📅 تاريخ الطباعة: '+dateStr+'</div>'
    + '</div>'
    + p
    + '</div>'
    + '<\/body><\/html>'
  );
  win.document.close();
}

function renderReportPage(){
  var root = document.getElementById('reportRoot');
  if(!root) return;

  if(!RPT.cls && DB.classes.length) RPT.cls = DB.classes[0];
  var aw = Math.min(Math.max(1, Number(DB.meta.activeWeeks)||14), ALL_WEEKS.length);
  var availWeeks = ALL_WEEKS.slice(0, aw);
  if(!RPT.weeks.length) RPT.weeks = availWeeks.slice();

  var cls = RPT.cls;
  var students = (DB.data[cls]||[]).filter(function(s){return s.name;});
  var selWeeks = RPT.weeks.slice().sort(function(a,b){return a-b;});

  var custom = RPT.customScores[cls] || {};
  var customBeh1 = (custom.beh1 !== undefined) ? Number(custom.beh1) : null;
  var customBeh2 = (custom.beh2 !== undefined) ? Number(custom.beh2) : null;
  var customEx1  = (custom.ex1  !== undefined) ? Number(custom.ex1)  : null;
  var customEx2  = (custom.ex2  !== undefined) ? Number(custom.ex2)  : null;

  var css = [
    '<style id="rptStyle">',
    '.rpt-page{display:flex;flex-direction:column;height:100%;background:#f8fafc;color:#1e293b;font-family:Cairo,sans-serif;direction:rtl;}',
    '.rpt-toolbar{background:#1e3a8a;border-bottom:1px solid #1d4ed8;padding:10px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0;}',
    '.rpt-body{flex:1;overflow-y:auto;padding:16px;background:#f1f5f9;}',
    '.rpt-section{background:#ffffff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:12px;overflow:hidden;}',
    '.rpt-sec-hdr{background:#1e40af;padding:8px 14px;font-size:11px;font-weight:700;color:#ffffff;display:flex;align-items:center;gap:8px;}',
    '.rpt-sec-body{padding:10px 14px;}',
    '.rpt-week-grid{display:flex;flex-wrap:wrap;gap:6px;}',
    '.rpt-wk-btn{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;transition:all .12s;}',
    '.rpt-wk-btn.on{background:#1d4ed8;border-color:#3b82f6;color:#fff;}',
    '.rpt-cls-btn{padding:3px 12px;border-radius:6px;font-size:10px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);color:#fff;}',
    '.rpt-cls-btn.on{background:#0f766e;border-color:#14b8a6;color:#fff;}',
    '.rpt-print-btn{background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:6px 18px;border-radius:8px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}',
    '.rpt-tbl-wrap{overflow-x:auto;}',
    '.rpt-tbl{border-collapse:collapse;width:100%;font-size:10px;direction:rtl;}',
    '.rpt-tbl th,.rpt-tbl td{border:1px solid #bfdbfe;padding:4px 6px;text-align:center;white-space:nowrap;}',
    '.rpt-tbl thead tr:first-child th{background:#1e40af;color:#ffffff;font-size:10px;font-weight:800;}',
    '.rpt-tbl thead tr:last-child th{background:#3b82f6;color:#ffffff;font-size:9.5px;font-weight:700;}',
    '.rpt-tbl td.name-cell{text-align:right;min-width:120px;color:#1e293b;font-weight:700;font-size:10px;background:#eff6ff;}',
    '.rpt-tbl td.num-cell{color:#374151;font-size:10px;font-weight:600;background:#f1f5f9;}',
    '.rpt-tbl td.grade-cell{color:#111827;font-size:10px;font-weight:700;background:#f8fafc;}',
    '.rpt-tbl td.total-cell{color:#92400e;font-weight:900;font-size:11px;background:#fef3c7;}',
    '.rpt-tbl td.avg-cell{color:#065f46;font-weight:800;font-size:10px;background:#d1fae5;}',
    '.rpt-tbl td.beh-cell{color:#4c1d95;font-weight:700;font-size:10px;background:#ede9fe;}',
    '.rpt-tbl td.ex-cell{color:#7c2d12;font-weight:700;font-size:10px;background:#ffedd5;}',
    '.rpt-tbl td.fail{color:#b91c1c!important;background:#fee2e2!important;}',
    '.rpt-tbl tr:hover td{filter:brightness(0.95);}',
    '.rpt-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:12px;}',
    '.rpt-stat{background:#ffffff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;text-align:center;}',
    '.rpt-stat-v{font-size:20px;font-weight:900;color:#1d4ed8;}',
    '.rpt-stat-l{font-size:8.5px;color:#64748b;margin-top:2px;}',
    '.rpt-custom-box{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;}',
    '.rpt-custom-field{display:flex;flex-direction:column;gap:3px;}',
    '.rpt-custom-label{font-size:9px;color:#e0e7ff;}',
    '.rpt-custom-input{background:#ffffff;border:1.5px solid #93c5fd;color:#1e293b;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;width:70px;text-align:center;font-family:Cairo,sans-serif;outline:none;}',
    '.rpt-custom-input:focus{border-color:#60a5fa;}',
    '@media print{',
    '  body>*:not(#page_report){display:none!important;}',
    '  #page_report{display:flex!important;}',
    '  .rpt-toolbar{display:none!important;}',
    '  .rpt-page{height:auto;}',
    '  .rpt-body{overflow:visible;}',
    '  .rpt-tbl{font-size:7.5px;}',
    '  .rpt-tbl th,.rpt-tbl td{padding:3px 4px;}',
    '  body{background:#fff!important;color:#000!important;}',
    '  .rpt-page{background:#fff!important;}',
    '  .rpt-tbl th,.rpt-tbl td{color:#000!important;border-color:#999!important;}',
    '  .rpt-tbl td.grade-cell{background:#f8fafc!important;}',
    '  .rpt-tbl td.avg-cell{background:#d1fae5!important;}',
    '  .rpt-tbl td.beh-cell{background:#ede9fe!important;}',
    '  .rpt-tbl td.ex-cell{background:#ffedd5!important;}',
    '  .rpt-tbl td.total-cell{background:#fef3c7!important;font-weight:900;}',
    '  .rpt-tbl td.name-cell{background:#eff6ff!important;}',
    '  .rpt-section.rpt-no-print{display:none!important;}',
    '}',
    '</style>'
  ].join('');

  function calcStudentReport(s){
    var res = {weeks:{}, avgAssess:0, avgHw:0, beh:0, exam:0, total:0};
    var aSum=0, aC=0, hSum=0, hC=0;
    selWeeks.forEach(function(w){
      var av = s['a'+w]; var hv = s['h'+w];
      var avN = (av===''||av===undefined||av===null)?null:(av==='\u063a'?0:(av==='\u0645'?null:Number(av)));
      var hvN = (hv===''||hv===undefined||hv===null)?null:(hv==='\u063a'?0:(hv==='\u0645'?null:Number(hv)));
      res.weeks[w] = {a: avN, h: hvN, av_raw: av, hv_raw: hv};
      if(avN !== null){ aSum += avN; aC++; }
      if(hvN !== null){ hSum += hvN; hC++; }
    });
    res.avgAssess = aC ? Math.round(aSum/aC) : 0;
    res.avgHw     = hC ? Math.round(hSum/hC) : 0;
    var b1 = (customBeh1 !== null) ? customBeh1 : (Number(s.beh1)||0);
    var b2 = (customBeh2 !== null) ? customBeh2 : (Number(s.beh2)||0);
    var e1 = (customEx1  !== null) ? customEx1  : (Number(s.ex1)||0);
    var e2 = (customEx2  !== null) ? customEx2  : (Number(s.ex2)||0);

    // — تحديد وضع الاختبار —
    var examMode = RPT.examMode;
    if(examMode === 'auto'){
      // إذا كان الاختبار 1 مرصودًا والاختبار 2 ليس مرصودًا → اختبار 1 فقط
      var s_ex1 = (customEx1!==null) ? customEx1 : (s.ex1!==undefined&&s.ex1!==''&&s.ex1!==null ? Number(s.ex1) : null);
      var s_ex2 = (customEx2!==null) ? customEx2 : (s.ex2!==undefined&&s.ex2!==''&&s.ex2!==null ? Number(s.ex2) : null);
      examMode = (s_ex1!==null && s_ex2===null) ? 'ex1' : 'ex1ex2';
    }
    // — تحديد وضع السلوك —
    var behMode = RPT.behMode;
    if(behMode === 'auto'){
      var s_beh1 = (customBeh1!==null) ? customBeh1 : (s.beh1!==undefined&&s.beh1!==''&&s.beh1!==null ? Number(s.beh1) : null);
      var s_beh2 = (customBeh2!==null) ? customBeh2 : (s.beh2!==undefined&&s.beh2!==''&&s.beh2!==null ? Number(s.beh2) : null);
      behMode = (s_beh1!==null && s_beh2===null) ? 'beh1' : 'beh1beh2';
    }

    if(examMode === 'ex1'){
      // اختبار 1 فقط من 15 → ×2 ليصبح من 30
      res.exam = Math.min(e1 * 2, 30);
    } else {
      // اختبار 1 + اختبار 2 كل منهما من 15 → مجموعهما من 30 مباشرة
      res.exam = Math.min(e1 + e2, 30);
    }
    if(behMode === 'beh1'){
      // سلوك 1 فقط: نضربه بـ2 ليكون من 10
      res.beh = Math.min(b1 * 2, 10);
    } else {
      res.beh = Math.min(b1 + b2, 10);
    }
    res.total = res.avgAssess + res.avgHw + res.beh + res.exam;
    return res;
  }

  var allCalc = students.map(function(s){ return {s:s, r:calcStudentReport(s)}; });
  var totals = allCalc.map(function(x){return x.r.total;});
  var avgTotal = totals.length ? Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length) : 0;
  var maxTotal = totals.length ? Math.max.apply(null,totals) : 0;
  var pass = totals.filter(function(t){return t>=35;}).length;

  var html = css;
  html += '<div class="rpt-page">';

  // Toolbar
  html += '<div class="rpt-toolbar">';
  html += '<span style="font-size:12px;font-weight:800;color:#f1f5f9;">\uD83D\uDCC4 \u0643\u0634\u0641 \u0627\u0644\u062F\u0631\u062C\u0627\u062A</span>';
  DB.classes.forEach(function(c){
    html += '<button class="rpt-cls-btn'+(c===cls?' on':'')+'" onclick="RPT.cls=\''+esc(c)+'\';renderReportPage()">'+esc(c)+'</button>';
  });
  html += '<div style="width:1px;height:20px;background:#334155;margin:0 4px;"></div>';
  html += '<button onclick="RPT.weeks='+JSON.stringify(availWeeks)+';renderReportPage()" style="background:#0f766e;border:none;color:white;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0628\u064A\u0639</button>';
  html += '<button onclick="RPT.weeks=[];renderReportPage()" style="background:#7f1d1d;border:none;color:white;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">\u0645\u0633\u062D \u0627\u0644\u0643\u0644</button>';
  html += '<button class="rpt-print-btn" onclick="rptPrint()">\uD83D\uDDA8\uFE0F \u0637\u0628\u0627\u0639\u0629</button>';

  // أزرار وضع الاختبار
  html += '<div style="width:1px;height:20px;background:#334155;margin:0 2px;"></div>';
  html += '<span style="font-size:9px;color:#93c5fd;font-weight:700;white-space:nowrap;">\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631:</span>';
  var emAuto = RPT.examMode==='auto', emEx1 = RPT.examMode==='ex1', emBoth = RPT.examMode==='ex1ex2';
  html += '<button onclick="RPT.examMode=\'auto\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(emAuto?'#0f766e':'rgba(255,255,255,.15)')+';color:white;">\u062A\u0644\u0642\u0627\u0626\u064A</button>';
  html += '<button onclick="RPT.examMode=\'ex1\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(emEx1?'#0f766e':'rgba(255,255,255,.15)')+';color:white;">1 \u0641\u0642\u0637</button>';
  html += '<button onclick="RPT.examMode=\'ex1ex2\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(emBoth?'#0f766e':'rgba(255,255,255,.15)')+';color:white;">1+2</button>';

  // أزرار وضع السلوك
  html += '<div style="width:1px;height:20px;background:#334155;margin:0 2px;"></div>';
  html += '<span style="font-size:9px;color:#a78bfa;font-weight:700;white-space:nowrap;">\uD83C\uDF1F \u0633\u0644\u0648\u0643:</span>';
  var bhAuto = RPT.behMode==='auto', bhB1 = RPT.behMode==='beh1', bhBoth = RPT.behMode==='beh1beh2';
  html += '<button onclick="RPT.behMode=\'auto\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(bhAuto?'#7c3aed':'rgba(255,255,255,.15)')+';color:white;">\u062A\u0644\u0642\u0627\u0626\u064A</button>';
  html += '<button onclick="RPT.behMode=\'beh1\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(bhB1?'#7c3aed':'rgba(255,255,255,.15)')+';color:white;">1 \u0641\u0642\u0637</button>';
  html += '<button onclick="RPT.behMode=\'beh1beh2\';renderReportPage()" style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:none;background:'+(bhBoth?'#7c3aed':'rgba(255,255,255,.15)')+';color:white;">1+2</button>';
  html += '</div>';

  html += '<div class="rpt-body">';

  // اختيار الأسابيع
  html += '<div class="rpt-section rpt-no-print">';
  html += '<div class="rpt-sec-hdr">\uD83D\uDCC5 \u0627\u062E\u062A\u0631 \u0627\u0644\u0623\u0633\u0627\u0628\u064A\u0639 \u0644\u0644\u0643\u0634\u0641</div>';
  html += '<div class="rpt-sec-body"><div class="rpt-week-grid">';
  availWeeks.forEach(function(w){
    var on = RPT.weeks.indexOf(w)>=0;
    html += '<button class="rpt-wk-btn'+(on?' on':'')+'" onclick="var i=RPT.weeks.indexOf('+w+');if(i>=0)RPT.weeks.splice(i,1);else RPT.weeks.push('+w+');renderReportPage()">\u0623'+w+'</button>';
  });
  html += '</div></div></div>';

  // تخصيص السلوك والاختبار
  var clsJ = JSON.stringify(cls);
  var behTotal = Math.min((customBeh1||0)+(customBeh2||0), 10);
  var exTotal  = Math.min((customEx1||0)+(customEx2||0),   30);

  html += '<div class="rpt-section rpt-no-print">';
  html += '<div class="rpt-sec-hdr">\u2699\uFE0F \u062A\u062E\u0635\u064A\u0635 \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643 \u0648\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 <span style="font-size:9px;color:#475569;font-weight:400;">(\u0627\u062A\u0631\u0643\u0647\u0627 \u0641\u0627\u0631\u063A\u0629 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062F\u0631\u062C\u0629 \u0643\u0644 \u0637\u0627\u0644\u0628)</span></div>';
  html += '<div class="rpt-sec-body"><div class="rpt-custom-box">';

  var b1v = (customBeh1 !== null) ? customBeh1 : '';
  var b2v = (customBeh2 !== null) ? customBeh2 : '';
  var e1v = (customEx1  !== null) ? customEx1  : '';
  var e2v = (customEx2  !== null) ? customEx2  : '';

  html += '<div class="rpt-custom-field"><label class="rpt-custom-label">\uD83C\uDF1F \u0633\u0644\u0648\u0643 1 /5</label>';
  html += '<input class="rpt-custom-input" type="number" min="0" max="5" placeholder="\u062A\u0644\u0642\u0627\u0626\u064A" value="'+b1v+'" oninput="rptSaveCustom('+clsJ+',\'beh1\',this.value)"></div>';

  html += '<div class="rpt-custom-field"><label class="rpt-custom-label">\uD83C\uDF1F \u0633\u0644\u0648\u0643 2 /5</label>';
  html += '<input class="rpt-custom-input" type="number" min="0" max="5" placeholder="\u062A\u0644\u0642\u0627\u0626\u064A" value="'+b2v+'" oninput="rptSaveCustom('+clsJ+',\'beh2\',this.value)"></div>';

  html += '<div style="width:1px;height:40px;background:#334155;margin:0 4px;align-self:center;"></div>';

  html += '<div class="rpt-custom-field"><label class="rpt-custom-label">\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631 1 /15</label>';
  html += '<input class="rpt-custom-input" type="number" min="0" max="15" placeholder="\u062A\u0644\u0642\u0627\u0626\u064A" value="'+e1v+'" oninput="rptSaveCustom('+clsJ+',\'ex1\',this.value)"></div>';

  html += '<div class="rpt-custom-field"><label class="rpt-custom-label">\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631 2 /15</label>';
  html += '<input class="rpt-custom-input" type="number" min="0" max="15" placeholder="\u062A\u0644\u0642\u0627\u0626\u064A" value="'+e2v+'" oninput="rptSaveCustom('+clsJ+',\'ex2\',this.value)"></div>';

  html += '<div style="align-self:flex-end;"><button onclick="RPT.customScores['+clsJ+']={}; renderReportPage();" style="background:#334155;border:none;color:#94a3b8;padding:5px 12px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">\u21A9 \u0645\u0633\u062D \u0627\u0644\u062A\u062E\u0635\u064A\u0635</button></div>';

  if(customBeh1!==null||customBeh2!==null||customEx1!==null||customEx2!==null){
    html += '<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:7px;padding:6px 12px;font-size:10px;color:#60a5fa;align-self:flex-end;">';
    html += '\u2705 \u0633\u0644\u0648\u0643: <strong>'+behTotal+'/10</strong> &nbsp;|&nbsp; \u0627\u062E\u062A\u0628\u0627\u0631: <strong>'+exTotal+'/30</strong>';
    html += '</div>';
  }

  html += '</div></div></div>';

  if(!selWeeks.length){
    html += '<div style="background:#1e293b;border-radius:10px;padding:20px;text-align:center;color:#475569;">\u0627\u062E\u062A\u0631 \u0623\u0633\u0628\u0648\u0639\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644</div>';
    html += '</div></div>';
    root.innerHTML = html;
    return;
  }

  // إحصائيات
  html += '<div class="rpt-summary">';
  html += '<div class="rpt-stat"><div class="rpt-stat-v">'+students.length+'</div><div class="rpt-stat-l">\u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0627\u0628</div></div>';
  html += '<div class="rpt-stat"><div class="rpt-stat-v" style="color:#34d399;">'+avgTotal+'</div><div class="rpt-stat-l">\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u062C\u0645\u0648\u0639 / 70</div></div>';
  html += '<div class="rpt-stat"><div class="rpt-stat-v" style="color:#fbbf24;">'+maxTotal+'</div><div class="rpt-stat-l">\u0623\u0639\u0644\u0649 \u062F\u0631\u062C\u0629</div></div>';
  html += '<div class="rpt-stat"><div class="rpt-stat-v" style="color:#4ade80;">'+pass+'</div><div class="rpt-stat-l">\u0646\u0627\u062C\u062D (\u227235)</div></div>';
  html += '<div class="rpt-stat"><div class="rpt-stat-v" style="color:#f87171;">'+(students.length-pass)+'</div><div class="rpt-stat-l">\u0631\u0627\u0633\u0628</div></div>';
  html += '</div>';

  // الجدول
  html += '<div class="rpt-section"><div class="rpt-tbl-wrap"><table class="rpt-tbl">';
  html += '<thead><tr>';
  html += '<th rowspan="2" style="min-width:30px;">#</th>';
  html += '<th rowspan="2" style="min-width:130px;text-align:right;">\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628</th>';
  selWeeks.forEach(function(w){
    html += '<th colspan="2" style="background:#0f3460;color:#93c5fd;">\u0623\u0633\u0628\u0648\u0639 '+w+'</th>';
  });
  html += '<th colspan="4" style="background:#14532d;color:#86efac;">\u0627\u0644\u062A\u062C\u0645\u064A\u0639\u064A</th>';
  html += '<th rowspan="2" style="background:#451a03;color:#fcd34d;min-width:50px;">\u0627\u0644\u0645\u062C\u0645\u0648\u0639<br/>/70</th>';
  html += '</tr><tr>';
  selWeeks.forEach(function(){
    html += '<th style="color:#93c5fd;">\u062A\u0642\u064A\u064A\u0645<br/>/20</th>';
    html += '<th style="color:#67e8f9;">\u0648\u0627\u062C\u0628<br/>/10</th>';
  });
  html += '<th style="color:#86efac;">\u0645. \u062A\u0642\u064A\u064A\u0645<br/>/20</th>';
  html += '<th style="color:#67e8f9;">\u0645. \u0648\u0627\u062C\u0628<br/>/10</th>';
  html += '<th style="color:#a78bfa;">\u0633\u0644\u0648\u0643<br/>/10</th>';
  html += '<th style="color:#fdba74;">\u0627\u062E\u062A\u0628\u0627\u0631<br/>/30</th>';
  html += '</tr></thead><tbody>';

  allCalc.forEach(function(item, idx){
    var s=item.s, r=item.r;
    var isFail = r.total < 35;
    html += '<tr>';
    html += '<td class="num-cell">'+(idx+1)+'</td>';
    html += '<td class="name-cell">'+esc(s.name)+'</td>';
    selWeeks.forEach(function(w){
      var wd = r.weeks[w];
      var av = wd.av_raw; var hv = wd.hv_raw;
      var avDisp = (av===''||av===undefined||av===null)?'\u2014':(av==='\u063a'?'<span style="color:#f87171">\u063a</span>':(av==='\u0645'?'<span style="color:#fbbf24">\u0645</span>':av));
      var hvDisp = (hv===''||hv===undefined||hv===null)?'\u2014':(hv==='\u063a'?'<span style="color:#f87171">\u063a</span>':(hv==='\u0645'?'<span style="color:#fbbf24">\u0645</span>':hv));
      html += '<td class="grade-cell">'+avDisp+'</td>';
      html += '<td class="grade-cell">'+hvDisp+'</td>';
    });
    html += '<td class="avg-cell">'+r.avgAssess+'</td>';
    html += '<td class="avg-cell">'+r.avgHw+'</td>';
    html += '<td class="beh-cell">'+r.beh+'</td>';
    html += '<td class="ex-cell">'+r.exam+'</td>';
    html += '<td class="total-cell'+(isFail?' fail':'')+'" style="font-size:12px;">'+r.total+'</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div></div>';

  // ══════════════════════════════════════════════════════
  // قسم الغياب - القطاعات الدائرية الديناميكية
  // ══════════════════════════════════════════════════════
  (function buildAbsenceSection(){
    // ── حساب بيانات الغياب للفصل الحالي ──
    var clsAbsData = DB.absences && DB.absences[cls] ? DB.absences[cls] : {};
    var totalAbsPeriods = 0, totalSickPeriods = 0;
    var studentAbsStats = [];
    var zeroAbs = 0, lowAbs = 0, midAbs = 0, highAbs = 0;
    students.forEach(function(s){
      var sid = s.id;
      var absObj = clsAbsData[sid] || {};
      var keys = Object.keys(absObj);
      var absCnt  = keys.filter(function(k){ return absObj[k]==='abs';  }).length;
      var sickCnt = keys.filter(function(k){ return absObj[k]==='sick'; }).length;
      totalAbsPeriods  += absCnt;
      totalSickPeriods += sickCnt;
      studentAbsStats.push({ name: s.name, abs: absCnt, sick: sickCnt, total: absCnt + sickCnt });
      if(absCnt === 0) zeroAbs++;
      else if(absCnt <= 3) lowAbs++;
      else if(absCnt <= 7) midAbs++;
      else highAbs++;
    });

    // ── حساب إجمالي الغياب لجميع الفصول ──
    var allClsStats = [];
    DB.classes.forEach(function(c){
      var cData = DB.absences && DB.absences[c] ? DB.absences[c] : {};
      var cStudents = (DB.data[c]||[]).filter(function(s){return s.name;});
      var cAbs = 0, cSick = 0;
      cStudents.forEach(function(s){
        var absObj = cData[s.id] || {};
        var keys = Object.keys(absObj);
        cAbs  += keys.filter(function(k){ return absObj[k]==='abs';  }).length;
        cSick += keys.filter(function(k){ return absObj[k]==='sick'; }).length;
      });
      allClsStats.push({ name: c, abs: cAbs, sick: cSick, total: cAbs + cSick, count: cStudents.length });
    });

    // ── أعلى 5 طلاب غياباً في الفصل الحالي ──
    var top5 = studentAbsStats.slice().sort(function(a,b){ return b.total - a.total; }).slice(0,5);

    // ── دالة مساعدة لرسم قطاع دائري SVG ──
    function drawPie(data, cx, cy, r){
      if(!data || !data.length) return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#1e293b"/>';
      var total = data.reduce(function(s,d){ return s + d.value; }, 0);
      if(total === 0) return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#1e293b"/><text x="'+cx+'" y="'+(cy+5)+'" text-anchor="middle" font-size="11" fill="#475569">لا يوجد</text>';
      var svg = '';
      var startAngle = -Math.PI / 2;
      data.forEach(function(d){
        if(d.value === 0) return;
        var sweep = (d.value / total) * 2 * Math.PI;
        var endAngle = startAngle + sweep;
        var x1 = cx + r * Math.cos(startAngle);
        var y1 = cy + r * Math.sin(startAngle);
        var x2 = cx + r * Math.cos(endAngle);
        var y2 = cy + r * Math.sin(endAngle);
        var large = sweep > Math.PI ? 1 : 0;
        svg += '<path d="M'+cx+','+cy+' L'+x1.toFixed(2)+','+y1.toFixed(2)+' A'+r+','+r+' 0 '+large+' 1 '+x2.toFixed(2)+','+y2.toFixed(2)+' Z" fill="'+d.color+'" stroke="#0f172a" stroke-width="1.5">';
        svg += '<title>'+d.label+': '+d.value+'</title></path>';
        // Label inside slice
        if(sweep > 0.35){
          var midAngle = startAngle + sweep / 2;
          var lx = cx + (r * 0.62) * Math.cos(midAngle);
          var ly = cy + (r * 0.62) * Math.sin(midAngle);
          var pct = Math.round(d.value/total*100);
          svg += '<text x="'+lx.toFixed(1)+'" y="'+(ly+1).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" fill="#fff" font-family="Cairo,sans-serif">'+pct+'%</text>';
        }
        startAngle = endAngle;
      });
      return svg;
    }

    // ── SVG القطاع الدائري 1: توزيع الغياب في الفصل ──
    var pieAbsData = [
      { label: 'بدون غياب', value: zeroAbs,  color: '#22c55e' },
      { label: 'غياب منخفض (1-3)', value: lowAbs,  color: '#facc15' },
      { label: 'غياب متوسط (4-7)', value: midAbs,  color: '#f97316' },
      { label: 'غياب مرتفع (8+)',  value: highAbs, color: '#ef4444' }
    ];

    // ── SVG القطاع الدائري 2: مقارنة الفصول ──
    var clsColors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
    var pieClsData = allClsStats.map(function(c, i){
      return { label: c.name + ' ('+c.total+')', value: c.total, color: clsColors[i % clsColors.length] };
    }).filter(function(d){ return d.value > 0; });
    if(!pieClsData.length) pieClsData = allClsStats.map(function(c, i){
      return { label: c.name, value: Math.max(c.count, 1), color: clsColors[i % clsColors.length] };
    });

    // ── SVG القطاع الدائري 3: غياب vs مرض في الفصل الحالي ──
    var pieTypeData = [
      { label: 'غياب بدون عذر',  value: totalAbsPeriods,  color: '#ef4444' },
      { label: 'مرض/عذر',         value: totalSickPeriods, color: '#3b82f6' }
    ];

    // === بناء HTML ===
    var uniqId = 'absSection_' + Date.now();
    html += '<div class="rpt-section" style="margin-top:14px;">';
    html += '<div class="rpt-sec-hdr" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);">📊 تحليل الغياب — '+esc(cls)+'</div>';
    html += '<div class="rpt-sec-body" style="padding:14px;">';

    // ── بطاقات إحصائية سريعة ──
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:16px;">';
    html += '<div style="background:#0f172a;border:1px solid #7c3aed;border-radius:10px;padding:10px;text-align:center;">';
    html += '<div style="font-size:22px;font-weight:900;color:#ef4444;">'+totalAbsPeriods+'</div>';
    html += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">إجمالي الغياب (حصص)</div></div>';

    html += '<div style="background:#0f172a;border:1px solid #7c3aed;border-radius:10px;padding:10px;text-align:center;">';
    html += '<div style="font-size:22px;font-weight:900;color:#3b82f6;">'+totalSickPeriods+'</div>';
    html += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">مرض / بعذر (حصص)</div></div>';

    html += '<div style="background:#0f172a;border:1px solid #7c3aed;border-radius:10px;padding:10px;text-align:center;">';
    html += '<div style="font-size:22px;font-weight:900;color:#22c55e;">'+zeroAbs+'</div>';
    html += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">طلاب بلا غياب</div></div>';

    html += '<div style="background:#0f172a;border:1px solid #7c3aed;border-radius:10px;padding:10px;text-align:center;">';
    html += '<div style="font-size:22px;font-weight:900;color:#f97316;">'+highAbs+'</div>';
    html += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">غياب مرتفع (8+ حصص)</div></div>';

    var avgAbsPerStudent = students.length ? (totalAbsPeriods / students.length).toFixed(1) : 0;
    html += '<div style="background:#0f172a;border:1px solid #7c3aed;border-radius:10px;padding:10px;text-align:center;">';
    html += '<div style="font-size:22px;font-weight:900;color:#facc15;">'+avgAbsPerStudent+'</div>';
    html += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">متوسط غياب/طالب</div></div>';
    html += '</div>';

    // ── الرسوم الدائرية ──
    html += '<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:16px;">';

    // دائرة 1: توزيع مستويات الغياب
    html += '<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px;text-align:center;min-width:200px;flex:1;">';
    html += '<div style="font-size:11px;font-weight:800;color:#a78bfa;margin-bottom:10px;">توزيع مستويات الغياب — '+esc(cls)+'</div>';
    html += '<svg viewBox="0 0 200 200" width="160" height="160" style="display:block;margin:auto;">';
    html += drawPie(pieAbsData, 100, 100, 85);
    html += '</svg>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px;">';
    pieAbsData.forEach(function(d){
      html += '<span style="display:flex;align-items:center;gap:4px;font-size:8.5px;color:#94a3b8;">';
      html += '<span style="width:10px;height:10px;border-radius:50%;background:'+d.color+';display:inline-block;flex-shrink:0;"></span>'+d.label+' ('+d.value+')';
      html += '</span>';
    });
    html += '</div></div>';

    // دائرة 2: غياب vs مرض
    html += '<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px;text-align:center;min-width:200px;flex:1;">';
    html += '<div style="font-size:11px;font-weight:800;color:#a78bfa;margin-bottom:10px;">نوع الغياب — '+esc(cls)+'</div>';
    html += '<svg viewBox="0 0 200 200" width="160" height="160" style="display:block;margin:auto;">';
    html += drawPie(pieTypeData, 100, 100, 85);
    if(totalAbsPeriods + totalSickPeriods === 0){
      html += '<text x="100" y="105" text-anchor="middle" font-size="13" fill="#22c55e" font-family="Cairo,sans-serif" font-weight="700">✓ لا يوجد غياب</text>';
    }
    html += '</svg>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px;">';
    pieTypeData.forEach(function(d){
      html += '<span style="display:flex;align-items:center;gap:4px;font-size:8.5px;color:#94a3b8;">';
      html += '<span style="width:10px;height:10px;border-radius:50%;background:'+d.color+';display:inline-block;flex-shrink:0;"></span>'+d.label+' ('+d.value+'  حصة)';
      html += '</span>';
    });
    html += '</div></div>';

    // دائرة 3: مقارنة الفصول
    if(allClsStats.length > 1){
      html += '<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px;text-align:center;min-width:200px;flex:1;">';
      html += '<div style="font-size:11px;font-weight:800;color:#a78bfa;margin-bottom:10px;">مقارنة الغياب بين الفصول</div>';
      html += '<svg viewBox="0 0 200 200" width="160" height="160" style="display:block;margin:auto;">';
      html += drawPie(pieClsData, 100, 100, 85);
      html += '</svg>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px;">';
      allClsStats.forEach(function(c, i){
        html += '<span style="display:flex;align-items:center;gap:4px;font-size:8.5px;color:#94a3b8;">';
        html += '<span style="width:10px;height:10px;border-radius:50%;background:'+clsColors[i % clsColors.length]+';display:inline-block;flex-shrink:0;"></span>'+esc(c.name)+' ('+c.total+')';
        html += '</span>';
      });
      html += '</div></div>';
    }

    html += '</div>'; // end flex charts row

    // ── مخطط شريطي لأعلى طلاب غياباً ──
    if(top5.length && top5[0].total > 0){
      html += '<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px;margin-bottom:12px;">';
      html += '<div style="font-size:11px;font-weight:800;color:#f87171;margin-bottom:10px;">🔴 أعلى الطلاب غياباً — '+esc(cls)+'</div>';
      var maxVal = top5[0].total || 1;
      top5.forEach(function(s, i){
        if(s.total === 0) return;
        var pct = Math.round((s.total / maxVal) * 100);
        var barColor = s.total >= 8 ? '#ef4444' : s.total >= 4 ? '#f97316' : '#facc15';
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">';
        html += '<span style="font-size:10px;color:#e2e8f0;font-weight:700;">'+(i+1)+'. '+esc(s.name)+'</span>';
        html += '<span style="font-size:10px;font-weight:900;color:'+barColor+';">'+s.total+' حصة</span>';
        html += '</div>';
        html += '<div style="background:#1e293b;border-radius:4px;height:10px;overflow:hidden;">';
        html += '<div style="width:'+pct+'%;height:100%;background:'+barColor+';border-radius:4px;transition:width .5s;"></div>';
        html += '</div>';
        if(s.abs > 0 || s.sick > 0){
          html += '<div style="font-size:8px;color:#64748b;margin-top:2px;">بدون عذر: <span style="color:#f87171;">'+s.abs+'</span> | بعذر: <span style="color:#60a5fa;">'+s.sick+'</span></div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // ── جدول تفصيلي للطلاب ──
    html += '<div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:8px;">تفاصيل غياب الطلاب — '+esc(cls)+'</div>';
    html += '<div style="overflow-x:auto;"><table class="rpt-tbl" style="font-size:10px;">';
    html += '<thead><tr>';
    html += '<th style="background:#312e81;color:#e0e7ff;">#</th>';
    html += '<th style="background:#312e81;color:#e0e7ff;text-align:right;min-width:120px;">اسم الطالب</th>';
    html += '<th style="background:#7c1d1d;color:#fca5a5;">غياب (حصص)</th>';
    html += '<th style="background:#1e3a8a;color:#bfdbfe;">مرض/عذر</th>';
    html += '<th style="background:#312e81;color:#e0e7ff;">الإجمالي</th>';
    html += '<th style="background:#3b0764;color:#d8b4fe;">المستوى</th>';
    html += '</tr></thead><tbody>';
    studentAbsStats.sort(function(a,b){ return b.total - a.total; }).forEach(function(s, idx){
      var level, lvlColor;
      if(s.abs === 0){ level='✅ لا يوجد'; lvlColor='#22c55e'; }
      else if(s.abs <= 3){ level='🟡 منخفض'; lvlColor='#facc15'; }
      else if(s.abs <= 7){ level='🟠 متوسط'; lvlColor='#f97316'; }
      else { level='🔴 مرتفع'; lvlColor='#ef4444'; }
      html += '<tr>';
      html += '<td class="num-cell">'+(idx+1)+'</td>';
      html += '<td class="name-cell">'+esc(s.name)+'</td>';
      html += '<td style="text-align:center;color:#f87171;font-weight:700;font-size:11px;">'+s.abs+'</td>';
      html += '<td style="text-align:center;color:#60a5fa;font-weight:700;font-size:11px;">'+s.sick+'</td>';
      html += '<td style="text-align:center;color:#e2e8f0;font-weight:800;font-size:12px;">'+s.total+'</td>';
      html += '<td style="text-align:center;font-size:10px;font-weight:700;color:'+lvlColor+';">'+level+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    html += '</div></div>'; // rpt-sec-body + rpt-section
  })();

  // توضيح
  html += '<div style="font-size:9px;color:#475569;margin-top:8px;padding:8px 12px;background:#e0e7ff;border-radius:8px;border:1px solid #bfdbfe;">';
  html += '\uD83D\uDCCC \u0627\u0644\u0645\u062C\u0645\u0648\u0639 = \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 (20) + \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0648\u0627\u062C\u0628 (10) + \u0627\u0644\u0633\u0644\u0648\u0643 (10) + \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 (30) = <strong style="color:#60a5fa;">70</strong>';
  html += ' &nbsp;|&nbsp; \u0627\u0644\u0623\u0633\u0627\u0628\u064A\u0639: <strong style="color:#60a5fa;">'+selWeeks.join('\u060C ')+'</strong>';

  // وضع الاختبار
  var exModeLabel = RPT.examMode==='ex1' ? '\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631 1 \u0641\u0642\u0637 (\u00D72)' : (RPT.examMode==='ex1ex2' ? '\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631 1+2' : '\uD83D\uDCCB \u0627\u062E\u062A\u0628\u0627\u0631: \u062A\u0644\u0642\u0627\u0626\u064A');
  var bhModeLabel = RPT.behMode==='beh1' ? '\uD83C\uDF1F \u0633\u0644\u0648\u0643 1 \u0641\u0642\u0637 (\u00D72)' : (RPT.behMode==='beh1beh2' ? '\uD83C\uDF1F \u0633\u0644\u0648\u0643 1+2' : '\uD83C\uDF1F \u0633\u0644\u0648\u0643: \u062A\u0644\u0642\u0627\u0626\u064A');
  html += ' &nbsp;|&nbsp; <span style="color:#fdba74;">'+exModeLabel+'</span>';
  html += ' &nbsp;|&nbsp; <span style="color:#a78bfa;">'+bhModeLabel+'</span>';

  if(customBeh1!==null||customBeh2!==null||customEx1!==null||customEx2!==null){
    html += ' &nbsp;|&nbsp; <span style="color:#a78bfa;">\u0633\u0644\u0648\u0643 \u0645\u0648\u062D\u062F: '+behTotal+'/10</span>';
    html += ' &nbsp;|&nbsp; <span style="color:#fdba74;">\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0648\u062D\u062F: '+exTotal+'/30</span>';
  } else {
    html += ' &nbsp;|&nbsp; \u0633\u0644\u0648\u0643/\u0627\u062E\u062A\u0628\u0627\u0631: \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0644 \u0637\u0627\u0644\u0628';
  }
  html += '</div>';

  html += '</div></div>';
  root.innerHTML = html;
}

window.renderReportPage = renderReportPage;

// ══════════════════════════════════════════════════════
// ══ التنسيق الشرطي للتجميعي ══
var TFR_CF = {
  levels: [
    {name:'راسب',    from:0,  to:34,  bg:'#fee2e2', color:'#b91c1c'},
    {name:'مقبول',   from:35, to:44,  bg:'#ffedd5', color:'#c2410c'},
    {name:'جيد',     from:45, to:54,  bg:'#fef9c3', color:'#854d0e'},
    {name:'جيد جداً',from:55, to:62,  bg:'#dcfce7', color:'#15803d'},
    {name:'ممتاز',   from:63, to:70,  bg:'#dbeafe', color:'#1d4ed8'}
  ],
  scopes: {tot:true, ex:false, avg:false, beh:false}
};

try {
  var _cfSaved = localStorage.getItem('tfr_cf_v1');
  if(_cfSaved) { var _cfParsed=JSON.parse(_cfSaved); if(_cfParsed.levels) TFR_CF=_cfParsed; }
} catch(e){}

function tfrCFGetStyle(val, maxVal, type) {
  if(val===null||val===undefined||val===''||val==='غ'||val==='م') return '';
  var scope = (type==='tot'&&TFR_CF.scopes.tot)||(type==='ex'&&TFR_CF.scopes.ex)||
              ((type==='avg'||type==='avgh')&&TFR_CF.scopes.avg)||(type==='beh'&&TFR_CF.scopes.beh);
  if(!scope) return '';
  var pct = (Number(val)/maxVal)*70;
  var lv = TFR_CF.levels.slice().sort(function(a,b){return b.from-a.from;}).find(function(l){return pct>=l.from;});
  if(!lv) return '';
  return 'background:'+lv.bg+'!important;color:'+lv.color+'!important;';
}

function tfrOpenCFModal() {
  var existing = document.getElementById('tfrCFModal');
  if(existing) { existing.remove(); }

  var modal = document.createElement('div');
  modal.id = 'tfrCFModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;direction:rtl;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#0f1e3d;border:1.5px solid #1e3a5f;border-radius:12px;padding:20px;width:640px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Cairo,sans-serif;color:#f1f5f9;';

  box.innerHTML = _tfrCFModalHTML();
  modal.appendChild(box);
  document.body.appendChild(modal);

  modal.addEventListener('click', function(e){ if(e.target===modal) tfrCloseCFModal(); });
  _tfrCFRender();
}

function tfrCloseCFModal() {
  var m = document.getElementById('tfrCFModal');
  if(m) m.remove();
}

function _tfrCFModalHTML() {
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'+
    '<div style="font-size:14px;font-weight:700;color:#c4b5fd;">🎨 تنسيق شرطي — التجميعي</div>'+
    '<button onclick="tfrCloseCFModal()" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;line-height:1;">✕</button>'+
  '</div>'+
  // نطاق التطبيق
  '<div style="margin-bottom:12px;">'+
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;font-weight:700;">تطبيق على:</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;" id="cfScopeBtns">'+
      _cfScopeBtn('tot','المجموع /70','#fcd34d')+
      _cfScopeBtn('ex','الاختبار /30','#fdba74')+
      _cfScopeBtn('avg','م.تقييم / م.واجب','#86efac')+
      _cfScopeBtn('beh','م.سلوك','#a78bfa')+
    '</div>'+
  '</div>'+
  // جدول المستويات
  '<div style="margin-bottom:4px;display:grid;grid-template-columns:1fr 60px 60px 90px 1fr;gap:6px;font-size:10px;color:#64748b;padding:0 4px;">'+
    '<span>الاسم</span><span style="text-align:center;">من</span><span style="text-align:center;">إلى</span><span style="text-align:center;">لون الخلفية</span><span style="text-align:center;">معاينة</span>'+
  '</div>'+
  '<div id="cfLevels" style="display:flex;flex-direction:column;gap:6px;"></div>'+
  // أزرار
  '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">'+
    '<button onclick="tfrCFReset()" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#fca5a5;padding:6px 16px;border-radius:8px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;">↺ إعادة الضبط</button>'+
    '<button onclick="tfrCFSave()" style="background:rgba(139,92,246,.3);border:1px solid rgba(139,92,246,.6);color:#c4b5fd;padding:6px 20px;border-radius:8px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;">✓ حفظ وتطبيق</button>'+
  '</div>';
}

function _cfScopeBtn(key, label, color) {
  var on = TFR_CF.scopes[key];
  return '<button onclick="TFR_CF.scopes[\''+key+'\']= !TFR_CF.scopes[\''+key+'\'];_tfrCFRender();" '+
    'id="cfScope-'+key+'" '+
    'style="padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700;font-family:inherit;cursor:pointer;'+
    'border:1.5px solid '+(on?color:'#334155')+';background:'+(on?color+'22':'rgba(255,255,255,.04)')+';color:'+(on?color:'#64748b')+';">'+
    (on?'✓ ':'')+label+'</button>';
}

function _tfrCFRender() {
  // تحديث أزرار النطاق
  ['tot','ex','avg','beh'].forEach(function(key) {
    var colors = {tot:'#fcd34d',ex:'#fdba74',avg:'#86efac',beh:'#a78bfa'};
    var labels = {tot:'المجموع /70',ex:'الاختبار /30',avg:'م.تقييم / م.واجب',beh:'م.سلوك'};
    var btn = document.getElementById('cfScope-'+key);
    if(!btn) return;
    var on = TFR_CF.scopes[key];
    var c = colors[key];
    btn.style.border = '1.5px solid '+(on?c:'#334155');
    btn.style.background = on?c+'22':'rgba(255,255,255,.04)';
    btn.style.color = on?c:'#64748b';
    btn.textContent = (on?'✓ ':'')+labels[key];
  });

  // رسم صفوف المستويات
  var cont = document.getElementById('cfLevels');
  if(!cont) return;
  cont.innerHTML = '';
  TFR_CF.levels.forEach(function(lv, i) {
    var textColor = _cfAutoTextColor(lv.bg);
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 60px 60px 90px 1fr;gap:6px;align-items:center;background:#1e293b;border-radius:8px;padding:8px 10px;';
    row.innerHTML =
      '<input value="'+_cfEsc(lv.name)+'" oninput="TFR_CF.levels['+i+'].name=this.value;_tfrCFRenderPreview('+i+')" '+
        'style="background:#0f172a;border:1px solid #334155;color:#f1f5f9;padding:4px 8px;border-radius:6px;font-size:11px;font-family:inherit;width:100%;" dir="rtl">'+
      '<input type="number" min="0" max="70" value="'+lv.from+'" oninput="TFR_CF.levels['+i+'].from=+this.value;_tfrCFRenderPreview('+i+')" '+
        'style="background:#0f172a;border:1px solid #334155;color:#f1f5f9;padding:4px 6px;border-radius:6px;font-size:11px;font-family:inherit;text-align:center;width:100%;">'+
      '<input type="number" min="0" max="70" value="'+lv.to+'" oninput="TFR_CF.levels['+i+'].to=+this.value;_tfrCFRenderPreview('+i+')" '+
        'style="background:#0f172a;border:1px solid #334155;color:#f1f5f9;padding:4px 6px;border-radius:6px;font-size:11px;font-family:inherit;text-align:center;width:100%;">'+
      '<div style="display:flex;align-items:center;gap:6px;justify-content:center;">'+
        '<input type="color" value="'+lv.bg+'" oninput="TFR_CF.levels['+i+'].bg=this.value;_tfrCFRenderPreview('+i+')" '+
          'style="width:36px;height:28px;border:1px solid #334155;border-radius:6px;padding:2px;cursor:pointer;background:#0f172a;">'+
      '</div>'+
      '<div id="cfBadge-'+i+'" style="padding:4px 8px;border-radius:16px;font-size:10px;font-weight:700;text-align:center;background:'+lv.bg+';color:'+textColor+';border:1.5px solid '+textColor+'30;">'+
        _cfEsc(lv.name)+' ('+lv.from+'–'+lv.to+')'+
      '</div>';
    cont.appendChild(row);
  });
}

function _tfrCFRenderPreview(i) {
  var lv = TFR_CF.levels[i];
  var badge = document.getElementById('cfBadge-'+i);
  if(!badge) return;
  var tc = _cfAutoTextColor(lv.bg);
  badge.style.background = lv.bg;
  badge.style.color = tc;
  badge.style.borderColor = tc+'30';
  badge.textContent = lv.name+' ('+lv.from+'–'+lv.to+')';
}

function _cfAutoTextColor(hex) {
  hex = hex.replace('#','');
  if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255 > 0.5 ? '#1e293b' : '#f8fafc';
}

function _cfEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function tfrCFSave() {
  try { localStorage.setItem('tfr_cf_v1', JSON.stringify(TFR_CF)); } catch(e){}
  tfrCloseCFModal();
  renderTafrighPage();
}

function tfrCFReset() {
  TFR_CF = {
    levels:[
      {name:'راسب',    from:0,  to:34,  bg:'#fee2e2', color:'#b91c1c'},
      {name:'مقبول',   from:35, to:44,  bg:'#ffedd5', color:'#c2410c'},
      {name:'جيد',     from:45, to:54,  bg:'#fef9c3', color:'#854d0e'},
      {name:'جيد جداً',from:55, to:62,  bg:'#dcfce7', color:'#15803d'},
      {name:'ممتاز',   from:63, to:70,  bg:'#dbeafe', color:'#1d4ed8'}
    ],
    scopes:{tot:true, ex:false, avg:false, beh:false}
  };
  _tfrCFRender();
}
window.tfrOpenCFModal = tfrOpenCFModal;
window.tfrCloseCFModal = tfrCloseCFModal;
window.tfrCFSave = tfrCFSave;
window.tfrCFReset = tfrCFReset;
window.tfrCFGetStyle = tfrCFGetStyle;

// TAFRIGH PAGE — كشف تفريغ درجات (مثل الـ PDF الرسمي)
// ══════════════════════════════════════════════════════
var TFR = {
  cls: null,
  weeks: [],
  teacherName: '',
  subject: '',
  term: '',
  schoolYear: '2025 - 2026',
  font: {family:'Cairo,sans-serif', tableSize:10, headerSize:9, nameSize:10, totalSize:12, weight:700, nameWidth:45},
  cols: {showAssess:true, showHw:true, showBeh:true, showAvgAssess:true, showAvgHw:true, showAvgBeh:true, showExam:true}
};
(function(){try{var tf=JSON.parse(localStorage.getItem('tfr_font_v1'));if(tf)TFR.font=Object.assign(TFR.font,tf);}catch(e){}}());
(function(){try{var tc=JSON.parse(localStorage.getItem('tfr_cols_v1'));if(tc)TFR.cols=Object.assign(TFR.cols,tc);}catch(e){}}());

// تهيئة بيانات كشف التفريغ من الإعدادات (تُنفَّذ مرة واحدة عند أول فتح للصفحة)
var _tfrSyncedFromDB = false;
function tfrSyncFromDB(){
  if(_tfrSyncedFromDB) return;
  _tfrSyncedFromDB = true;
  if(!TFR.teacherName && DB.meta.teacherName) TFR.teacherName = DB.meta.teacherName;
  if(!TFR.subject    && DB.meta.subject)      TFR.subject     = DB.meta.subject;
  if(!TFR.schoolYear && DB.meta.schoolYear)   TFR.schoolYear  = DB.meta.schoolYear;
  // الفصل الدراسي من DB.meta.semester
  if(!TFR.term && DB.meta.semester){
    TFR.term = Number(DB.meta.semester)===2 ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول';
  }
}

function tfrEsc(v){ return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function tfrCalc(s, selWeeks){
  var aSum=0,aC=0,hSum=0,hC=0;
  var weeks={};
  selWeeks.forEach(function(w){
    var av=s['a'+w], hv=s['h'+w];
    var avN=(av===''||av===undefined||av===null)?null:(av==='غ'?0:(av==='م'?null:Number(av)));
    var hvN=(hv===''||hv===undefined||hv===null)?null:(hv==='غ'?0:(hv==='م'?null:Number(hv)));
    weeks[w]={av_raw:av,hv_raw:hv,avN:avN,hvN:hvN};
    if(avN!==null){aSum+=avN;aC++;}
    if(hvN!==null){hSum+=hvN;hC++;}
  });
  var avgA=aC?Math.round(aSum/aC):0;
  var avgH=hC?Math.round(hSum/hC):0;
  // السلوك: متوسط أعمدة bw للأسابيع النشطة في DB
  var _aw=DB&&DB.meta?Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length):14;
  var bSum=0,bC=0;
  ALL_WEEKS.slice(0,_aw).forEach(function(w){
    var bwv=s['bw'+w];
    if(bwv===''||bwv===undefined||bwv===null||bwv==='م')return;
    bSum+=(bwv==='غ'?0:Math.min(Number(bwv)||0,10));
    bC++;
  });
  var beh=bC?Math.round(bSum/bC):0;
  var ex1=Number(s.ex1||0), ex2=Number(s.ex2||0);
  // إذا اختبار 1 فقط: ×2، وإلا مجموع 1+2
  var hasEx2=s.ex2!==undefined&&s.ex2!==''&&s.ex2!==null&&s.ex2!==0;
  var exam=hasEx2?Math.min(ex1+ex2,30):Math.min(ex1*2,30);
  var total=avgA+avgH+beh+exam;
  return {weeks:weeks, avgA:avgA, avgH:avgH, beh:beh, exam:exam, total:total, ex1:ex1, ex2:ex2};
}

function tfrPrint(){
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var availWeeks=ALL_WEEKS.slice(0,aw);
  var cls=TFR.cls||(DB.classes.length?DB.classes[0]:'');
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var selWeeks=(TFR.weeks.length?TFR.weeks:availWeeks).slice().sort(function(a,b){return a-b;});
  var teacherName=TFR.teacherName||'';
  var subject=TFR.subject||'';
  var term=TFR.term||'';
  var syear=TFR.schoolYear||'';
  var now=new Date();
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // إعدادات الخط الحالية
  var TF=TFR.font||{};
  var initFamily   = (TF.family||'Cairo,sans-serif').replace(/"/g,"'");
  var initTableSize= TF.tableSize||10;
  var initHdrSize  = TF.headerSize||9;
  var initNameSize = TF.nameSize||10;
  var initTotSize  = TF.totalSize||12;
  var initWeight   = TF.weight||700;
  var initNameW    = TF.nameWidth||45;  // عرض عمود الاسم بالـ mm

  var weekDates=(DB.meta&&DB.meta.weekDates)||{};
  function fmtWeekDate(w){
    var d=weekDates[w];
    if(!d)return '';
    try{return new Date(d).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return d;}
  }

  var allCalc=students.map(function(s){return {s:s,r:tfrCalc(s,selWeeks)};});
  var C=TFR.cols;

  // بيانات الطلاب كـ JSON لإعادة بناء الجدول داخل النافذة
  var rows=allCalc.map(function(item,idx){
    var s=item.s,r=item.r;
    var cells=[];
    selWeeks.forEach(function(w){
      var wd=r.weeks[w];
      var av=wd.av_raw,hv=wd.hv_raw;
      var bwv=(s['bw'+w]!==undefined&&s['bw'+w]!==null&&s['bw'+w]!=='')?s['bw'+w]:null;
      if(C.showAssess) cells.push({v:av,type:'assess'});
      if(C.showHw)     cells.push({v:hv,type:'hw'});
      if(C.showBeh)    cells.push({v:bwv,type:'beh'});
    });
    if(C.showAvgAssess) cells.push({v:r.avgA,type:'avg'});
    if(C.showAvgHw)     cells.push({v:r.avgH,type:'avg'});
    if(C.showAvgBeh)    cells.push({v:r.beh,type:'beh'});
    if(C.showExam)      cells.push({v:r.exam,type:'ex'});
    cells.push({v:r.total,type:r.total<35?'fail':'tot'});
    return {n:idx+1,name:s.name,cells:cells,fail:r.total<35};
  });

  // رؤوس الجدول
  var hdr1=[]; // صف 1
  var hdr2=[]; // صف 2
  selWeeks.forEach(function(w){
    var d=fmtWeekDate(w);
    var span=(C.showAssess?1:0)+(C.showHw?1:0)+(C.showBeh?1:0);
    if(span>0) hdr1.push({label:'أ'+w+(d?'|'+d:''),span:span,bg:'#0f3460',color:'#93c5fd'});
    if(C.showAssess) hdr2.push({label:'ت<br>/20',bg:'#0f3460',color:'#93c5fd'});
    if(C.showHw)     hdr2.push({label:'و<br>/10',bg:'#1e4080',color:'#67e8f9'});
    if(C.showBeh)    hdr2.push({label:'س<br>/10',bg:'#2d1b69',color:'#a78bfa'});
  });
  var sumSpan=(C.showAvgAssess?1:0)+(C.showAvgHw?1:0)+(C.showAvgBeh?1:0)+(C.showExam?1:0)+1;
  if(sumSpan>0) hdr1.push({label:'إجمالي درجات الطالب',span:sumSpan,bg:'#14532d',color:'#86efac'});
  if(C.showAvgAssess) hdr2.push({label:'م.ت<br>/20',bg:'#14532d',color:'#86efac'});
  if(C.showAvgHw)     hdr2.push({label:'م.و<br>/10',bg:'#14532d',color:'#67e8f9'});
  if(C.showAvgBeh)    hdr2.push({label:'م.سلوك<br>/10',bg:'#14532d',color:'#a78bfa'});
  if(C.showExam)      hdr2.push({label:'اخت<br>/30',bg:'#14532d',color:'#fdba74'});
  hdr2.push({label:'المج<br>/70',bg:'#78350f',color:'#fef3c7'});

  var pageData={
    cls:cls,subject:subject,term:term,syear:syear,teacher:teacherName,date:dateStr,
    school:DB.meta.schoolName||'Dalty Grades',
    hdr1:hdr1,hdr2:hdr2,rows:rows,selWeeks:selWeeks,
    font:{family:initFamily,tableSize:initTableSize,headerSize:initHdrSize,
          nameSize:initNameSize,totalSize:initTotSize,weight:initWeight,nameWidth:initNameW},
    cf:JSON.parse(JSON.stringify(TFR_CF))
  };

  var fontName=initFamily.match(/'?([A-Za-z]+)/);
  fontName=fontName?fontName[1]:'Cairo';

  var winHTML='<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">'
    +'<title>كشف التفريغ — '+tfrEsc(cls)+'</title>'
    +'<link id="gfont-main" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0;}'
    +'body{font-family:Cairo,sans-serif;background:#f1f5f9;direction:rtl;}'
    // شريط التحكم
    +'.ctrl{background:#0f1e3d;color:white;padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:100;border-bottom:2px solid #1e3a5f;}'
    +'.ctrl-group{display:flex;flex-direction:column;gap:2px;}'
    +'.ctrl-label{font-size:7.5px;color:#94a3b8;font-weight:700;}'
    +'.ctrl select,.ctrl input[type=range]{background:#1e293b;border:1px solid #334155;color:#f1f5f9;padding:3px 6px;border-radius:5px;font-size:10px;font-family:inherit;outline:none;}'
    +'.ctrl input[type=range]{width:80px;}'
    +'.ctrl-val{font-size:9px;color:#93c5fd;text-align:center;font-weight:700;}'
    +'.sep{width:1px;height:32px;background:#1e3a5f;margin:0 4px;flex-shrink:0;}'
    +'.btn-print{background:#16a34a;border:none;color:white;padding:7px 18px;border-radius:7px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;white-space:nowrap;}'
    +'.btn-close{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;padding:7px 14px;border-radius:7px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}'
    // الصفحة
    +'.page{width:210mm;margin:0;background:white;padding:4mm 3mm;}'
    // رأس
    +'.hdr{border:1.5px solid #1e40af;border-radius:4px;padding:4px 10px;margin-bottom:4px;background:#eff6ff;}'
    +'.hdr-top{display:flex;justify-content:space-between;align-items:center;}'
    +'.hdr-school{font-size:14px;font-weight:900;color:#0f2a5e;text-align:right;}'
    +'.hdr-cls{font-size:13px;font-weight:900;color:#0f2a5e;text-align:left;}'
    +'.hdr-sub{font-size:13px;font-weight:900;color:#1e40af;text-align:center;margin-top:3px;}'
    +'.hdr-meta{display:flex;justify-content:space-between;gap:4px;font-size:8px;color:#374151;flex-wrap:wrap;margin-top:3px;}'
    +'.hdr-meta span{background:#dbeafe;border-radius:3px;padding:1px 5px;white-space:nowrap;}'
    // جدول
    +'table{border-collapse:collapse;width:100%;direction:rtl;table-layout:fixed;}'
    +'th{border:0.5px solid #94a3b8;padding:1px;text-align:center;vertical-align:middle;line-height:1.2;overflow:hidden;}'
    +'td{border:0.5px solid #94a3b8;padding:1px;text-align:center;vertical-align:middle;line-height:1.2;overflow:hidden;}'
    +'.td-name{text-align:right;color:#0f2a5e;background:#eff6ff!important;padding:1px 4px;}'
    +'.td-num{color:#64748b;}'
    +'.td-beh{background:#f5f3ff!important;color:#6d28d9;}'
    +'.td-avg{background:#d1fae5!important;color:#065f46;}'
    +'.td-avgh{background:#d1fae5!important;color:#065f46;}'
    +'.td-avgbeh{background:#ede9fe!important;color:#4c1d95;}'
    +'.td-ex{background:#ffedd5!important;color:#7c2d12;}'
    +'.td-tot{background:#fef3c7!important;color:#92400e;}'
    +'.td-fail{background:#fee2e2!important;color:#b91c1c;}'
    +'.gab{color:#ef4444;font-weight:900;}'
    +'.mit{color:#d97706;font-weight:900;}'
    +'tr:nth-child(even) td:not(.td-name){filter:brightness(.97);}'
    // توقيعات
    +'.sigs{display:flex;gap:6px;margin-top:5px;}'
    +'.sig{flex:1;border:1px solid #cbd5e1;border-radius:4px;padding:4px 6px;text-align:center;}'
    +'.sig-t{font-size:7.5px;font-weight:700;color:#374151;margin-bottom:3px;}'
    +'.sig-n{font-size:8.5px;font-weight:900;color:#1e40af;margin-bottom:12px;}'
    +'.sig-l{border-top:1px solid #94a3b8;padding-top:2px;font-size:6.5px;color:#64748b;}'
    +'.note{font-size:6.5px;color:#475569;background:#e0e7ff;border:0.5px solid #bfdbfe;border-radius:3px;padding:2px 5px;margin-top:3px;}'
    // دليل حدود الصفحة
    +'.page-wrapper{position:relative;width:210mm;margin:6px auto;}'
    +'.page-border{position:absolute;top:0;left:0;right:0;bottom:0;border:2px dashed #3b82f6;border-radius:3px;pointer-events:none;z-index:50;}'
    +'.page-border-label{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:#3b82f6;background:#dbeafe;padding:1px 8px;border-radius:4px;white-space:nowrap;}'
    +'.page-hlimit{position:absolute;left:0;right:0;border-top:2px dashed #ef4444;z-index:51;pointer-events:none;}'
    +'.page-hlimit-label{position:absolute;left:50%;transform:translateX(-50%);top:-14px;font-size:9px;font-weight:700;color:#ef4444;background:#fee2e2;padding:1px 8px;border-radius:4px;white-space:nowrap;}'
    +'.page-hlimit-ok{position:absolute;left:0;right:0;border-top:2px dashed #10b981;z-index:51;pointer-events:none;}'
    +'.page-hlimit-ok-label{position:absolute;left:50%;transform:translateX(-50%);top:-14px;font-size:9px;font-weight:700;color:#10b981;background:#d1fae5;padding:1px 8px;border-radius:4px;white-space:nowrap;}'
    +'@media print{.page-border,.page-hlimit,.page-hlimit-label,.page-border-label,.page-hlimit-ok,.page-hlimit-ok-label{display:none!important;}}'
    +'@media print{'
    +'  @page{size:A4 portrait;margin:4mm 3mm;}'
    +'  html,body{width:210mm;background:white;}'
    +'  .ctrl{display:none!important;}'
    +'  .page{margin:0;width:210mm;padding:2mm 2mm;}'
    +'  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'
    +'}'
    +'</style>'
    +'</head><body>'

    // شريط التحكم
    +'<div class="ctrl" id="ctrl">'
    +'<button class="btn-print" onclick="window.print()">🖨️ طباعة / PDF</button>'
    +'<button class="btn-close" onclick="window.close()">✕</button>'
    +'<div class="sep"></div>'
    // نوع الخط
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">نوع الخط</span>'
    +'<select id="pFamily" onchange="applySettings()">'
    +'<option value="Cairo,sans-serif">Cairo</option>'
    +'<option value="Tajawal,sans-serif">Tajawal</option>'
    +'<option value="Amiri,serif">Amiri</option>'
    +'<option value="Tahoma,Arial,sans-serif">Tahoma</option>'
    +'<option value="Arial,sans-serif">Arial</option>'
    +'</select></div>'
    +'<div class="sep"></div>'
    // حجم خلايا
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">الخلايا</span>'
    +'<input type="range" id="pTable" min="6" max="16" step="1" oninput="document.getElementById(\'pTableV\').textContent=this.value;applySettings()">'
    +'<span class="ctrl-val" id="pTableV">10</span>'
    +'</div>'
    // حجم الرؤوس
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">الرؤوس</span>'
    +'<input type="range" id="pHdr" min="5" max="14" step="1" oninput="document.getElementById(\'pHdrV\').textContent=this.value;applySettings()">'
    +'<span class="ctrl-val" id="pHdrV">9</span>'
    +'</div>'
    // حجم الاسم
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">الاسم</span>'
    +'<input type="range" id="pName" min="6" max="16" step="1" oninput="document.getElementById(\'pNameV\').textContent=this.value;applySettings()">'
    +'<span class="ctrl-val" id="pNameV">10</span>'
    +'</div>'
    // حجم المجموع
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">المجموع</span>'
    +'<input type="range" id="pTot" min="7" max="18" step="1" oninput="document.getElementById(\'pTotV\').textContent=this.value;applySettings()">'
    +'<span class="ctrl-val" id="pTotV">12</span>'
    +'</div>'
    // سُمك الخط
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">السُّمك</span>'
    +'<select id="pWeight" onchange="applySettings()">'
    +'<option value="400">عادي</option>'
    +'<option value="600">شبه عريض</option>'
    +'<option value="700">عريض</option>'
    +'<option value="800">أسود</option>'
    +'</select></div>'
    +'<div class="sep"></div>'
    // عرض الاسم
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">عرض الاسم (mm)</span>'
    +'<input type="range" id="pNameW" min="25" max="80" step="1" oninput="document.getElementById(\'pNameWV\').textContent=this.value;applySettings()">'
    +'<span class="ctrl-val" id="pNameWV">45</span>'
    +'</div>'
    +'<div class="sep"></div>'
    // زر الاحتواء التلقائي
    +'<div class="ctrl-group">'
    +'<span class="ctrl-label">احتواء الاسم</span>'
    +'<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:10px;color:#f1f5f9;">'
    +'<input type="checkbox" id="pAutoFit" onchange="applySettings()" style="width:14px;height:14px;cursor:pointer;">'
    +'<span>سطر واحد</span>'
    +'</label>'
    +'</div>'
    +'<div class="sep"></div>'
    // زر فحص الأسماء الطويلة
    +'<button class="btn-print" style="background:#d97706;white-space:nowrap;" onclick="checkLongNames()">⚠️ فحص الأسماء</button>'
    +'<div id="warnBox" style="display:none;background:#fef3c7;border:1.5px solid #f59e0b;border-radius:6px;padding:4px 10px;font-size:10px;color:#92400e;max-width:240px;line-height:1.6;"></div>'
    +'</div>'  // .ctrl

    // الصفحة
    +'<div class="page-wrapper" id="pageWrapper">'
    +'<div class="page-border"><span class="page-border-label">◄ حدود ورقة A4 (210mm) ►</span></div>'
    +'<div id="hLimit"></div>'
    +'<div class="page" id="thePage"></div>'
    +'</div>'

    +'<script>'
    +'var DATA='+JSON.stringify(pageData)+';'
    +'function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}'
    +'function fmtV(v){'
    +'  if(v===null||v===undefined||v==="")return "—";'
    +'  if(v==="غ")return "<span class=\'gab\'>غ</span>";'
    +'  if(v==="م")return "<span class=\'mit\'>م</span>";'
    +'  return esc(v);'
    +'}'
    +'function cfStyle(val,maxVal,type){'
    +'  var CF=DATA.cf;'
    +'  if(!CF||!CF.levels) return "";'
    +'  var scope=(type==="tot"&&CF.scopes.tot)||(type==="ex"&&CF.scopes.ex)||'
    +'            ((type==="avg")&&CF.scopes.avg)||(type==="beh"&&CF.scopes.beh);'
    +'  if(!scope) return "";'
    +'  if(val===null||val===undefined||val===""||val==="غ"||val==="م") return "";'
    +'  var pct=(Number(val)/maxVal)*70;'
    +'  var sorted=CF.levels.slice().sort(function(a,b){return b.from-a.from;});'
    +'  var lv=sorted.find(function(l){return pct>=l.from;});'
    +'  if(!lv) return "";'
    +'  return "background:"+lv.bg+"!important;color:"+lv.color+"!important;";'
    +'}'
    // تهيئة القيم الأولية من بيانات TFR
    +'function initControls(){'
    +'  var f=DATA.font;'
    +'  var sel=document.getElementById("pFamily");'
    +'  for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===f.family){sel.selectedIndex=i;break;}}'
    +'  document.getElementById("pTable").value=f.tableSize; document.getElementById("pTableV").textContent=f.tableSize;'
    +'  document.getElementById("pHdr").value=f.headerSize; document.getElementById("pHdrV").textContent=f.headerSize;'
    +'  document.getElementById("pName").value=f.nameSize; document.getElementById("pNameV").textContent=f.nameSize;'
    +'  document.getElementById("pTot").value=f.totalSize; document.getElementById("pTotV").textContent=f.totalSize;'
    +'  var ws=document.getElementById("pWeight");'
    +'  for(var j=0;j<ws.options.length;j++){if(ws.options[j].value==f.weight){ws.selectedIndex=j;break;}}'
    +'  document.getElementById("pNameW").value=f.nameWidth||45; document.getElementById("pNameWV").textContent=f.nameWidth||45;'
    +'}'
    +'function applySettings(){'
    +'  var fam=document.getElementById("pFamily").value;'
    +'  var ts=Number(document.getElementById("pTable").value);'
    +'  var hs=Number(document.getElementById("pHdr").value);'
    +'  var ns=Number(document.getElementById("pName").value);'
    +'  var tot=Number(document.getElementById("pTot").value);'
    +'  var fw=document.getElementById("pWeight").value;'
    +'  var nw=Number(document.getElementById("pNameW").value);'
    +'  var af=document.getElementById("pAutoFit").checked;'
    +'  buildPage(fam,ts,hs,ns,tot,fw,nw,af);'
    +'}'
    +'function buildPage(fam,ts,hs,ns,tot,fw,nw,af){'
    +'  var D=DATA;'
    +'  var numDataCols=0;'
    +'  D.rows[0]&&D.rows[0].cells.forEach(function(){numDataCols++;});'
    +'  var remainMm=204-6-nw;'
    +'  var colW=numDataCols>0?(remainMm/numDataCols).toFixed(1):8;'
    +'  var h="";'
    // رأس الكشف
    +'  h+=\'<div class="hdr">\';'
    +'  h+=\'<div class="hdr-top\"><div class="hdr-school\">\'+esc(D.school)+\'</div><div class="hdr-cls\">\'+esc(D.cls||\'\')+\'</div></div>\';'
    +'  h+=\'<div class="hdr-sub">كشف درجات مادة\'+(D.subject?\' — \'+esc(D.subject):\'\')+( D.term?\' — \'+esc(D.term):\'\')+( D.syear?\' — \'+esc(D.syear):\'\')+\'</div>\';'
    +'  h+=\'</div>\';'
    // الجدول
    +'  h+=\'<table style="font-family:\'+fam+\';font-size:\'+ts+\'px;">\';'
    +'  h+=\'<colgroup><col style="width:6mm;"><col style="width:\'+nw+\'mm;">\';'
    +'  for(var ci=0;ci<numDataCols-1;ci++) h+=\'<col style="width:\'+colW+\'mm;">\';'
    +'  h+=\'<col style="width:\'+(parseFloat(colW)+2)+\'mm;"></colgroup>\';'
    +'  h+=\'<thead>\';'
    // صف 1
    +'  h+=\'<tr><th rowspan="2" style="background:#1e3a8a;color:white;font-size:\'+hs+\'px;">#</th>\';'
    +'  h+=\'<th rowspan="2" style="background:#1e3a8a;color:white;text-align:right;padding-right:4px;font-size:\'+hs+\'px;">اسم الطالب</th>\';'
    +'  D.hdr1.forEach(function(h1){'
    +'    var parts=h1.label.split("|");'
    +'    var label=parts[0]; var date=parts[1]||"";'
    +'    h+=\'<th colspan="\'+h1.span+\'" style="background:\'+h1.bg+\';color:\'+h1.color+\';font-size:\'+hs+\'px;">\';'
    +'    if(date) h+=\'<div style="font-size:\'+(hs-1)+\'px;font-weight:400;opacity:.85;">\'+date+\'</div>\';'
    +'    h+=label+\'</th>\';'
    +'  });'
    +'  h+=\'</tr>\';'
    // صف 2
    +'  h+=\'<tr>\';'
    +'  D.hdr2.forEach(function(h2){'
    +'    h+=\'<th style="background:\'+h2.bg+\';color:\'+h2.color+\';font-size:\'+hs+\'px;">\'+h2.label+\'</th>\';'
    +'  });'
    +'  h+=\'</tr></thead><tbody>\';'
    // الصفوف
    +'  D.rows.forEach(function(row,ri){'
    +'    h+=\'<tr><td class="td-num" style="font-size:\'+(hs-1)+\'px;">\'+row.n+\'</td>\';'
    +'    var nameStyle="font-size:"+ns+"px;font-weight:"+fw+";";'
    +'    if(af) nameStyle+="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";'
    +'    h+=\'<td class="td-name" style="\'+nameStyle+\'">\'+esc(row.name)+\'</td>\';'
    +'    row.cells.forEach(function(c){'
    +'      var cls2="";'
    +'      var cMax=20;'
    +'      if(c.type==="beh"){cls2="td-beh";cMax=10;}'
    +'      else if(c.type==="avg"){cls2="td-avg";cMax=20;}'
    +'      else if(c.type==="ex"){cls2="td-ex";cMax=30;}'
    +'      else if(c.type==="tot"){cls2="td-tot";cMax=70;}'
    +'      else if(c.type==="fail"){cls2="td-fail";cMax=70;}'
    +'      var fw2=(c.type==="tot"||c.type==="fail")?900:fw;'
    +'      var fs2=(c.type==="tot"||c.type==="fail")?tot:ts;'
    +'      var cfS=cfStyle(c.v,cMax,c.type==="fail"?"tot":c.type);'
    +'      var cellStyle="font-size:"+fs2+"px;font-weight:"+fw2+";";'
    +'      if(cfS) cellStyle+=cfS; '
    +'      h+=\'<td class="\'+cls2+\'" style="\'+cellStyle+\'">\'+fmtV(c.v)+\'</td>\';'
    +'    });'
    +'    h+=\'</tr>\';'
    +'  });'
    +'  h+=\'</tbody></table>\';'
    +'  h+=\'<div class="note">📌 المج = م.تقييم(20) + م.واجب(10) + م.سلوك(10) + اختبارات(30) = 70 | الأسابيع: \'+D.selWeeks.join("،")+\'</div>\';'
    +'  h+=\'<div class="sigs">\';'
    +'  h+=\'<div class="sig"><div class="sig-t">توقيع معلم المادة</div><div class="sig-n">ا/ \'+esc(D.teacher||"................")+\'</div></div>\';'
    +'  h+=\'<div class="sig"><div class="sig-t">توقيع المشرف</div><div class="sig-n">&nbsp;</div></div>\';'
    +'  h+=\'<div class="sig"><div class="sig-t">مدير المدرسة</div><div class="sig-n">&nbsp;</div></div>\';'
    +'  h+=\'</div>\';'
    +'  document.getElementById("thePage").innerHTML=h;'
    +'  document.getElementById("thePage").style.fontFamily=fam;'
    +'  updatePageLimit();'
    +'}'
    +'function updatePageLimit(){'
    +'  var A4_H_MM=297;'
    +'  var marginMM=6;'  // top+bottom margin في @page
    +'  var printH=A4_H_MM-marginMM;'  // الارتفاع المتاح للطباعة
    +'  var wrapper=document.getElementById("pageWrapper");'
    +'  var page=document.getElementById("thePage");'
    +'  var hLim=document.getElementById("hLimit");'
    +'  if(!wrapper||!page||!hLim)return;'
    +'  var pageH=page.offsetHeight;'
    +'  var wrapperW=wrapper.offsetWidth;'
    // تحويل mm إلى px بدقة
    +'  var pxPerMm=wrapperW/210;'
    +'  var limitPx=printH*pxPerMm;'
    +'  hLim.style.top=limitPx+"px";'
    +'  hLim.style.left="0";'
    +'  hLim.style.right="0";'
    +'  hLim.style.position="absolute";'
    +'  hLim.style.zIndex="51";'
    +'  hLim.style.pointerEvents="none";'
    +'  if(pageH<=limitPx){'
    +'    hLim.className="page-hlimit-ok";'
    +'    hLim.innerHTML="<span class=\'page-hlimit-ok-label\'>✅ الكشف يسع في صفحة واحدة</span>";'
    +'  } else {'
    +'    hLim.className="page-hlimit";'
    +'    hLim.innerHTML="<span class=\'page-hlimit-label\'>⛔ تجاوز حد A4 — سيطبع على ورقتين</span>";'
    +'  }'
    +'}'
    +'function checkLongNames(){'
    +'  var nw=Number(document.getElementById("pNameW").value);'
    +'  var ns=Number(document.getElementById("pName").value);'
    +'  var af=document.getElementById("pAutoFit").checked;'
    +'  var box=document.getElementById("warnBox");'
    +'  var longNames=[];'
    +'  DATA.rows.forEach(function(row){'
    +'    var approxChars=Math.floor((nw*3.5)/ns);'
    +'    if(row.name && row.name.length > approxChars) longNames.push(row.n+". "+row.name);'
    +'  });'
    +'  if(longNames.length===0){'
    +'    box.style.display="block";'
    +'    box.style.background="#d1fae5";'
    +'    box.style.borderColor="#10b981";'
    +'    box.style.color="#065f46";'
    +'    box.innerHTML="✅ جميع الأسماء تناسب سطراً واحداً";'
    +'    setTimeout(function(){box.style.display="none";},3000);'
    +'    return;'
    +'  }'
    +'  var msg="⚠️ "+longNames.length+" اسم قد يأخذ سطرين:<br>"+longNames.slice(0,5).join("<br>");'
    +'  if(longNames.length>5) msg+="<br>... و"+(longNames.length-5)+" آخرين";'
    +'  if(!af) msg+="<br><b>💡 فعّل \'احتواء الاسم\' لإصلاحها تلقائياً</b>";'
    +'  else msg+="<br><b>✅ الاحتواء التلقائي مفعّل — الأسماء ستُقطع</b>";'
    +'  box.style.display="block";'
    +'  box.style.background="#fef3c7";'
    +'  box.style.borderColor="#f59e0b";'
    +'  box.style.color="#92400e";'
    +'  box.innerHTML=msg;'
    +'}'
    +'window.addEventListener("load",function(){initControls();applySettings();});'
    +'window.addEventListener("resize",function(){updatePageLimit();});'
    +'<\/script>'
    +'</body></html>';

  var win=window.open('','_blank','width=1100,height=850,scrollbars=yes');
  if(!win){alert('يرجى السماح بالنوافذ المنبثقة في المتصفح');return;}
  win.document.write(winHTML);
  win.document.close();
}
window.tfrPrint = tfrPrint;





function renderTafrighPage(){
  var root=document.getElementById('tafrighRoot');
  if(!root)return;

  tfrSyncFromDB();
  if(!TFR.cls && DB.classes.length) TFR.cls=DB.classes[0];
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var availWeeks=ALL_WEEKS.slice(0,aw);
  if(!TFR.weeks.length) TFR.weeks=availWeeks.slice();

  var cls=TFR.cls;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var selWeeks=TFR.weeks.slice().sort(function(a,b){return a-b;});
  var C=TFR.cols;

  var weekDates=(DB.meta&&DB.meta.weekDates)||{};
  function fmtD(w){
    var d=weekDates[w];
    if(!d)return '';
    try{return new Date(d).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return d;}
  }

  var allCalc=students.map(function(s){return {s:s,r:tfrCalc(s,selWeeks)};});
  var totals=allCalc.map(function(x){return x.r.total;});
  var avg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
  var pass=totals.filter(function(t){return t>=35;}).length;

  var TF=TFR.font||{};
  var tfFamily=TF.family||'Cairo,sans-serif';
  var tfTableSize=TF.tableSize||10;
  var tfHeaderSize=TF.headerSize||9;
  var tfNameSize=TF.nameSize||10;
  var tfTotalSize=TF.totalSize||12;
  var tfWeight=TF.weight||700;

  // تحديث الشارات في الشريط العلوي
  var wb=document.getElementById('tfrWeeksBadge');
  if(wb) wb.textContent=selWeeks.length+'/'+availWeeks.length;
  var cb=document.getElementById('tfrColsBadge');
  if(cb){
    var colsOn=[C.showAssess,C.showHw,C.showBeh,C.showAvgAssess,C.showAvgHw,C.showAvgBeh,C.showExam].filter(Boolean).length;
    cb.textContent=colsOn+'/7';
  }
  // تحديث زر الفصل
  var clsBtn=document.getElementById('tbTfrClsBtn');
  if(clsBtn) clsBtn.innerHTML='🏫 <span class="btn-txt">'+tfrEsc(cls||'الفصل')+'</span>';

  // ══ بناء الصفحة (إحصاء + جدول فقط) ══
  var h='<div style="display:flex;flex-direction:column;height:100%;background:#0d1117;font-family:'+tfFamily+';direction:rtl;overflow:hidden;">';

  // شريط الإحصاء
  h+='<div style="background:#060e1d;border-bottom:1px solid #1e3a5f;padding:5px 14px;display:flex;gap:14px;flex-shrink:0;flex-wrap:wrap;">';
  h+='<span style="font-size:9.5px;color:#60a5fa;">👥 الطلاب: <strong style="color:#f1f5f9;">'+students.length+'</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">📅 أسابيع: <strong style="color:#f1f5f9;">'+selWeeks.length+'</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">📊 المتوسط: <strong style="color:#34d399;">'+avg+'/70</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">✅ ناجح: <strong style="color:#4ade80;">'+pass+'</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">❌ راسب: <strong style="color:#f87171;">'+(students.length-pass)+'</strong></span>';
  h+='</div>';

  if(!selWeeks.length){
    h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">';
    h+='<div style="font-size:32px;">📅</div>';
    h+='<div style="color:#475569;font-size:13px;">اضغط <strong style="color:#93c5fd;">الأسابيع</strong> في الشريط العلوي</div>';
    h+='</div>';
    h+='</div>';
    root.innerHTML=h;
    return;
  }

  // الجدول
  h+='<div style="flex:1;overflow:auto;padding:10px;">';
  h+='<table style="border-collapse:collapse;width:100%;font-size:'+tfTableSize+'px;direction:rtl;background:white;border-radius:8px;overflow:hidden;font-family:'+tfFamily+';">';
  h+='<thead>';

  // صف 1
  h+='<tr>';
  h+='<th rowspan="2" style="background:#1e3a8a;color:white;border:1px solid #3b82f6;padding:5px 3px;width:24px;">#</th>';
  h+='<th rowspan="2" style="background:#1e3a8a;color:white;border:1px solid #3b82f6;padding:5px 6px;text-align:right;min-width:120px;">اسم الطالب</th>';
  selWeeks.forEach(function(w){
    var d=fmtD(w);
    var span=(C.showAssess?1:0)+(C.showHw?1:0)+(C.showBeh?1:0);
    if(span===0) return;
    h+='<th colspan="'+span+'" style="background:#0f3460;color:#93c5fd;border:1px solid #3b82f6;padding:4px 2px;font-size:'+tfHeaderSize+'px;">'
      +(d?'<div style="font-size:7.5px;opacity:.8;">'+d+'</div>':'')+'أ'+w+'</th>';
  });
  var sumSpan=(C.showAvgAssess?1:0)+(C.showAvgHw?1:0)+(C.showAvgBeh?1:0)+(C.showExam?1:0);
  if(sumSpan>0) h+='<th colspan="'+sumSpan+'" style="background:#14532d;color:#86efac;border:1px solid #3b82f6;padding:5px 2px;">إجمالي درجات الطالب</th>';
  h+='<th rowspan="2" style="background:#451a03;color:#fcd34d;border:1px solid #3b82f6;padding:5px 3px;min-width:36px;">المج<br/>/70</th>';
  h+='</tr>';

  // صف 2
  h+='<tr>';
  selWeeks.forEach(function(){
    if(C.showAssess) h+='<th style="background:#0f3460;color:#93c5fd;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">ت<br/>/20</th>';
    if(C.showHw)     h+='<th style="background:#1e4080;color:#67e8f9;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">و<br/>/10</th>';
    if(C.showBeh)    h+='<th style="background:#2d1b69;color:#a78bfa;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">س<br/>/10</th>';
  });
  if(C.showAvgAssess) h+='<th style="background:#14532d;color:#86efac;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">م.ت<br/>/20</th>';
  if(C.showAvgHw)     h+='<th style="background:#14532d;color:#67e8f9;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">م.و<br/>/10</th>';
  if(C.showAvgBeh)    h+='<th style="background:#14532d;color:#a78bfa;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">م.سلوك<br/><small>/10</small></th>';
  if(C.showExam)      h+='<th style="background:#14532d;color:#fdba74;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">اخت<br/>/30</th>';
  h+='</tr></thead><tbody>';

  allCalc.forEach(function(item,idx){
    var s=item.s, r=item.r;
    var isFail=r.total<35;
    var rowBg=idx%2===0?'#ffffff':'#f8fafc';
    h+='<tr>';
    h+='<td style="text-align:center;font-size:'+tfHeaderSize+'px;background:'+rowBg+';border:1px solid #bfdbfe;color:#64748b;">'+(idx+1)+'</td>';
    h+='<td style="text-align:right;font-weight:'+tfWeight+';font-size:'+tfNameSize+'px;color:#0f2a5e;background:#eff6ff;border:1px solid #bfdbfe;padding:3px 6px;">'+tfrEsc(s.name)+'</td>';
    selWeeks.forEach(function(w){
      var wd=r.weeks[w];
      var av=wd.av_raw, hv=wd.hv_raw;
      var bwv=(s['bw'+w]!==undefined&&s['bw'+w]!==null&&s['bw'+w]!=='')?s['bw'+w]:null;
      var avD=(av===''||av===undefined||av===null)?'—':(av==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(av==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':av));
      var hvD=(hv===''||hv===undefined||hv===null)?'—':(hv==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(hv==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':hv));
      var bwD=(bwv===null)?'—':(bwv==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(bwv==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':bwv));
      if(C.showAssess) h+='<td style="text-align:center;font-size:'+tfTableSize+'px;font-weight:'+tfWeight+';background:'+rowBg+';border:1px solid #bfdbfe;">'+avD+'</td>';
      if(C.showHw)     h+='<td style="text-align:center;font-size:'+tfTableSize+'px;font-weight:'+tfWeight+';background:#f0f9ff;border:1px solid #bfdbfe;">'+hvD+'</td>';
      if(C.showBeh)    h+='<td style="text-align:center;font-size:'+tfTableSize+'px;font-weight:'+tfWeight+';background:#faf5ff;border:1px solid #bfdbfe;color:#6d28d9;">'+bwD+'</td>';
    });
    if(C.showAvgAssess){ var _cfA=tfrCFGetStyle(r.avgA,20,'avg'); h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;'+(_cfA||'background:#d1fae5;color:#065f46;')+'border:1px solid #bfdbfe;">'+r.avgA+'</td>'; }
    if(C.showAvgHw){ var _cfH=tfrCFGetStyle(r.avgH,10,'avg'); h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;'+(_cfH||'background:#d1fae5;color:#065f46;')+'border:1px solid #bfdbfe;">'+r.avgH+'</td>'; }
    if(C.showAvgBeh){ var _cfB=tfrCFGetStyle(r.beh,10,'beh'); h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;'+(_cfB||'background:#ede9fe;color:#4c1d95;')+'border:1px solid #bfdbfe;">'+r.beh+'</td>'; }
    if(C.showExam){ var _cfE=tfrCFGetStyle(r.exam,30,'ex'); h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;'+(_cfE||'background:#ffedd5;color:#7c2d12;')+'border:1px solid #bfdbfe;">'+r.exam+'</td>'; }
    var _cfT=tfrCFGetStyle(r.total,70,'tot'); h+='<td style="text-align:center;font-weight:900;font-size:'+tfTotalSize+'px;'+(_cfT||(isFail?'background:#fee2e2;color:#b91c1c;':'background:#fef3c7;color:#92400e;'))+'border:1px solid #bfdbfe;">'+r.total+'</td>';
    h+='</tr>';
  });

  h+='</tbody></table></div>';
  h+='</div>';
  root.innerHTML=h;
  // أعد رسم البانلات المفتوحة لتعكس الحالة الجديدة
  if(typeof _tfrRenderWeeksBar==='function') _tfrRenderWeeksBar();
  if(typeof _tfrRenderColsBar==='function') _tfrRenderColsBar();
}
window.renderTafrighPage = renderTafrighPage;

// ══════════════════════════════════════════════════════
// TAFRIGH TOPBAR BARS
// ══════════════════════════════════════════════════════

function tfrAllBarsClose(){
  ['tfrClsBar','tfrWeeksBar','tfrColsBar','tfrMetaBar'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.classList.remove('open');el.innerHTML='';}
  });
  ['tbTfrClsBtn','tbTfrWeeksBtn','tbTfrColsBtn','tbTfrMetaBtn'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.classList.remove('active');
  });
}

function _tfrBarToggle(barId,btnId,renderFn){
  var bar=document.getElementById(barId);
  var btn=document.getElementById(btnId);
  if(!bar||!btn)return;
  var wasOpen=bar.classList.contains('open');
  tfrAllBarsClose();
  if(!wasOpen){
    bar.classList.add('open');
    btn.classList.add('active');
    renderFn(bar);
  }
}

// ── شريط الفصول ──
function tfrClsBarToggle(){
  _tfrBarToggle('tfrClsBar','tbTfrClsBtn',function(bar){
    var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
    var availWeeks=ALL_WEEKS.slice(0,aw);
    var h='<div class="sub-bar-inner" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:0 8px;">';
    h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;white-space:nowrap;">🏫 الفصل:</span>';
    DB.classes.forEach(function(c){
      var on=c===TFR.cls;
      h+='<button onclick="TFR.cls=\''+tfrEsc(c)+'\';TFR.weeks=[];tfrAllBarsClose();renderTafrighPage();" '
       +'style="padding:3px 12px;border-radius:6px;font-size:10px;font-weight:700;font-family:inherit;cursor:pointer;'
       +'border:1px solid '+(on?'#0f766e':'#334155')+';background:'+(on?'rgba(15,118,110,.3)':'rgba(255,255,255,.07)')+';color:'+(on?'#34d399':'#94a3b8')+';">'
       +tfrEsc(c)+'</button>';
    });
    h+='</div>';
    bar.innerHTML=h;
  });
}

// ── رسم شريط الأسابيع ──
function _tfrRenderWeeksBar(){
  var bar=document.getElementById('tfrWeeksBar');
  if(!bar||!bar.classList.contains('open'))return;
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var availWeeks=ALL_WEEKS.slice(0,aw);
  var h='<div class="sub-bar-inner" style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;padding:0 8px;">';
  h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;white-space:nowrap;">📅 الأسابيع:</span>';
  h+='<button onclick="TFR.weeks='+JSON.stringify(availWeeks)+';renderTafrighPage();_tfrRenderWeeksBar();" '
   +'style="padding:2px 9px;border-radius:12px;font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;border:none;background:#0f766e;color:white;">✓ كل</button>';
  h+='<button onclick="TFR.weeks=[];renderTafrighPage();_tfrRenderWeeksBar();" '
   +'style="padding:2px 9px;border-radius:12px;font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;border:none;background:#7f1d1d;color:white;">✕ مسح</button>';
  h+='<div style="width:1px;height:16px;background:#1e3a5f;margin:0 2px;"></div>';
  availWeeks.forEach(function(w){
    var on=TFR.weeks.indexOf(w)>=0;
    h+='<button onclick="var i=TFR.weeks.indexOf('+w+');if(i>=0)TFR.weeks.splice(i,1);else TFR.weeks.push('+w+');renderTafrighPage();_tfrRenderWeeksBar();" '
     +'style="padding:2px 9px;border-radius:12px;font-size:10px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .1s;'
     +'border:1px solid '+(on?'#3b82f6':'#334155')+';background:'+(on?'#1d4ed8':'rgba(255,255,255,.06)')+';color:'+(on?'#fff':'#64748b')+';">'
     +'أ'+w+'</button>';
  });
  h+='</div>';
  bar.innerHTML=h;
}
function tfrWeeksBarToggle(){
  _tfrBarToggle('tfrWeeksBar','tbTfrWeeksBtn',function(){ _tfrRenderWeeksBar(); });
}

// ── رسم شريط الأعمدة ──
function _tfrRenderColsBar(){
  var bar=document.getElementById('tfrColsBar');
  if(!bar||!bar.classList.contains('open'))return;
  var C=TFR.cols;
  function chip(key,lbl,col){
    var on=C[key];
    return '<button onclick="TFR.cols[\''+key+'\']=!TFR.cols[\''+key+'\'];try{localStorage.setItem(\'tfr_cols_v1\',JSON.stringify(TFR.cols));}catch(e){}renderTafrighPage();_tfrRenderColsBar();" '
      +'style="display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:12px;font-size:9.5px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .1s;'
      +'border:1.5px solid '+(on?col:'#334155')+';background:'+(on?col+'22':'rgba(255,255,255,.04)')+';color:'+(on?col:'#475569')+';white-space:nowrap;">'
      +(on?'✓':'○')+' '+lbl+'</button>';
  }
  var h='<div class="sub-bar-inner" style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;padding:0 8px;">';
  h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;white-space:nowrap;">لكل أسبوع:</span>';
  h+=chip('showAssess','تقييم (ت)','#93c5fd');
  h+=chip('showHw','واجب (و)','#67e8f9');
  h+=chip('showBeh','سلوك (س)','#a78bfa');
  h+='<div style="width:1px;height:16px;background:#1e3a5f;margin:0 2px;"></div>';
  h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;white-space:nowrap;">تجميعي:</span>';
  h+=chip('showAvgAssess','م.تقييم','#86efac');
  h+=chip('showAvgHw','م.واجب','#67e8f9');
  h+=chip('showAvgBeh','م.سلوك','#a78bfa');
  h+=chip('showExam','اختبارات','#fdba74');
  h+='<div style="width:1px;height:16px;background:#1e3a5f;margin:0 2px;"></div>';
  h+='<button onclick="TFR.cols={showAssess:true,showHw:true,showBeh:true,showAvgAssess:true,showAvgHw:true,showAvgBeh:true,showExam:true};try{localStorage.setItem(\'tfr_cols_v1\',JSON.stringify(TFR.cols));}catch(e){}renderTafrighPage();_tfrRenderColsBar();" '
   +'style="padding:2px 9px;border-radius:12px;font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;border:1px solid #334155;background:rgba(255,255,255,.05);color:#64748b;">↺ إعادة ضبط</button>';
  h+='</div>';
  bar.innerHTML=h;
}
function tfrColsBarToggle(){
  _tfrBarToggle('tfrColsBar','tbTfrColsBtn',function(){ _tfrRenderColsBar(); });
}

// ── شريط بيانات الكشف ──
function tfrMetaBarToggle(){
  _tfrBarToggle('tfrMetaBar','tbTfrMetaBtn',function(bar){
    function inp(id,lbl,val,ev,w){
      return '<div style="display:flex;flex-direction:column;gap:2px;">'
        +'<span style="font-size:7.5px;color:#64748b;font-weight:700;">'+lbl+'</span>'
        +'<input id="'+id+'" value="'+tfrEsc(val)+'" placeholder="'+lbl+'" oninput="'+ev+'" '
        +'style="background:rgba(255,255,255,.1);border:1px solid #334155;color:#f1f5f9;padding:4px 8px;border-radius:5px;font-size:10px;font-family:inherit;width:'+w+'px;outline:none;" '
        +'onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'#334155\'">'
        +'</div>';
    }
    var h='<div class="sub-bar-inner" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:0 8px;">';
    h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;white-space:nowrap;align-self:center;">📝 بيانات الكشف:</span>';
    h+=inp('tfr_teacher','اسم المعلم',TFR.teacherName,'TFR.teacherName=this.value',140);
    h+=inp('tfr_subject','المادة',TFR.subject,'TFR.subject=this.value',90);
    h+=inp('tfr_term','الفصل الدراسي',TFR.term,'TFR.term=this.value',140);
    h+=inp('tfr_syear','العام الدراسي',TFR.schoolYear,'TFR.schoolYear=this.value',110);
    h+='<button onclick="TFR.teacherName=DB.meta.teacherName||TFR.teacherName;TFR.subject=DB.meta.subject||TFR.subject;TFR.schoolYear=DB.meta.schoolYear||TFR.schoolYear;TFR.term=(Number(DB.meta.semester)===2?\'الفصل الدراسي الثاني\':\'الفصل الدراسي الأول\');renderTafrighPage();" '
     +'style="padding:4px 10px;border-radius:6px;font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;border:1px solid #3b82f6;background:rgba(59,130,246,.15);color:#93c5fd;white-space:nowrap;align-self:flex-end;">🔄 من الإعدادات</button>';
    h+='</div>';
    bar.innerHTML=h;
  });
}

window.tfrClsBarToggle=tfrClsBarToggle;
window.tfrWeeksBarToggle=tfrWeeksBarToggle;
window.tfrColsBarToggle=tfrColsBarToggle;
window.tfrMetaBarToggle=tfrMetaBarToggle;
window.tfrAllBarsClose=tfrAllBarsClose;







function tfrExportExcel(){
  try{
    var wb=XLSX.utils.book_new();
    var _aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
    var availWeeks=ALL_WEEKS.slice(0,_aw);
    var selWeeks=(TFR.weeks.length?TFR.weeks.slice():availWeeks).sort(function(a,b){return a-b;});
    if(!selWeeks.length){alert('اختر أسبوعاً واحداً على الأقل');return;}

    var weekDates=(DB.meta&&DB.meta.weekDates)||{};
    function fmtD(w){
      var d=weekDates[w];
      if(!d)return'أسبوع '+w;
      try{return new Date(d).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return d;}
    }

    var exportClasses=TFR.cls?[TFR.cls]:DB.classes;

    exportClasses.forEach(function(cls){
      var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
      if(!students.length)return;

      var school=(DB.meta.schoolName||'Dalty Grades');
      var teacher=TFR.teacherName||DB.meta.teacherName||'';
      var subject=TFR.subject||DB.meta.subject||'';
      var term=TFR.term||'';
      var _sem=(Number(DB.meta.semester)===2?'الفصل الدراسي الثاني':'الفصل الدراسي الأول');
      var _yr=DB.meta.schoolYear||'2025 / 2026';

      // Header rows
      var titleRow=[school+' — '+subject+' — '+cls+' | '+_sem+' '+_yr+' م'];
      var subRow=['كشف تفريغ الدرجات'+(teacher?' | المعلم: '+teacher:'')+(term?' | '+term:'')];

      // Date row + header row
      var dateRow=['م','اسم الطالب'];
      selWeeks.forEach(function(w){dateRow.push(fmtD(w),'');});
      dateRow.push('','','','','');

      var hdrRow=['م','اسم الطالب'];
      selWeeks.forEach(function(w){hdrRow.push('تقييم أ'+w+'\n/20','واجب أ'+w+'\n/10');});
      hdrRow.push('م.تقييم\n/20','م.واجب\n/10','م.سلوك\n/10','اختبارات\n/30','الإجمالي\n/70');

      var dataRows=[];
      students.forEach(function(s,idx){
        var r=tfrCalc(s,selWeeks);
        var row=[idx+1,s.name];
        selWeeks.forEach(function(w){
          var wd=r.weeks[w];
          var av=wd.av_raw,hv=wd.hv_raw;
          row.push(av===''||av===undefined||av===null?'—':av);
          row.push(hv===''||hv===undefined||hv===null?'—':hv);
        });
        row.push(r.avgA,r.avgH,r.beh,r.exam,r.total);
        dataRows.push(row);
      });

      var aoa=[titleRow,subRow,[],dateRow,hdrRow];
      dataRows.forEach(function(r){aoa.push(r);});

      // Stats footer
      var totals=students.map(function(s){return tfrCalc(s,selWeeks).total;});
      var avg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
      var pass=totals.filter(function(t){return t>=35;}).length;
      aoa.push([]);
      aoa.push(['إجمالي الطلاب: '+students.length+' | ناجح: '+pass+' | راسب: '+(students.length-pass)+' | متوسط: '+avg+'/70']);

      var ws=XLSX.utils.aoa_to_sheet(aoa);

      // Column widths
      var wscols=[{wch:4},{wch:28}];
      selWeeks.forEach(function(){wscols.push({wch:10},{wch:10});});
      wscols.push({wch:10},{wch:10},{wch:8},{wch:12},{wch:10});
      ws['!cols']=wscols;

      var sheetName=(cls||'فصل').substring(0,31);
      XLSX.utils.book_append_sheet(wb,ws,sheetName);
    });

    if(!wb.SheetNames.length){alert('لا توجد بيانات للتصدير');return;}
    var fname='كشف_التفريغ_'+(TFR.cls||'الكل')+'_'+(new Date().toLocaleDateString('ar-EG').replace(/\//g,'-'))+'.xlsx';
    XLSX.writeFile(wb,fname);
  }catch(e){alert('خطأ في التصدير: '+e.message);}
}
window.tfrExportExcel = tfrExportExcel;


// ══════════════════════════════



// ══════════════════════════════
// PWA Install Prompt — تثبيت التطبيق
// يلتقط حدث beforeinstallprompt ويحفظه لعرض زر التثبيت عند الطلب
// ══════════════════════════════

(function(){
  var _deferredPrompt = null;

  /* التقاط حدث التثبيت قبل أن يختفي */
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    _deferredPrompt = e;
    /* إظهار زر التثبيت في الشريط الجانبي */
    var bar = document.getElementById('pwaInstallBar');
    if(bar) bar.style.display = 'block';
    console.log('[PWA] زر التثبيت جاهز');
  });

  /* إخفاء الزر بعد التثبيت الناجح */
  window.addEventListener('appinstalled', function(){
    _deferredPrompt = null;
    var bar = document.getElementById('pwaInstallBar');
    if(bar) bar.style.display = 'none';
    console.log('[PWA] تم تثبيت التطبيق بنجاح');
  });

  /* الدالة التي يستدعيها زر التثبيت */
  window.triggerPwaInstall = function(){
    if(!_deferredPrompt){
      /* إذا لم يكن الحدث متاحاً — أعطِ إرشادات يدوية */
      var msg = 'لتثبيت التطبيق يدوياً:\n\n' +
        '📱 أندرويد: اضغط القائمة ⋮ ← "إضافة إلى الشاشة الرئيسية"\n' +
        '🍎 آيفون: اضغط زر المشاركة ↑ ← "إضافة إلى الشاشة الرئيسية"\n' +
        '💻 كمبيوتر: انقر أيقونة ⊕ في شريط العنوان';
      alert(msg);
      return;
    }
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function(result){
      console.log('[PWA] اختيار المستخدم:', result.outcome);
      _deferredPrompt = null;
      var bar = document.getElementById('pwaInstallBar');
      if(bar) bar.style.display = 'none';
    });
  };
})();
