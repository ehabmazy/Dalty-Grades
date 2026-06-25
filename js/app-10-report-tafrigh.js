

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
// TAFRIGH PAGE — كشف تفريغ درجات (مثل الـ PDF الرسمي)
// ══════════════════════════════════════════════════════
var TFR = {
  cls: null,
  weeks: [],
  teacherName: '',
  subject: '',
  term: '',
  schoolYear: '2025 - 2026',
  font: {family:'Cairo,sans-serif', tableSize:10, headerSize:9, nameSize:10, totalSize:12, weight:700}
};
(function(){try{var tf=JSON.parse(localStorage.getItem('tfr_font_v1'));if(tf)TFR.font=Object.assign(TFR.font,tf);}catch(e){}}());

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

  // حساب تاريخ بداية كل أسبوع من البيانات
  var weekDates={};
  if(DB.meta && DB.meta.weekDates){
    weekDates=DB.meta.weekDates;
  }

  function fmtWeekDate(w){
    var d=weekDates[w];
    if(!d)return '';
    try{
      var dt=new Date(d);
      return dt.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});
    }catch(e){return d;}
  }

  var allCalc=students.map(function(s){return {s:s,r:tfrCalc(s,selWeeks)};});

  var p='';
  // ═══ CSS ═══
  p+='<style>'
  +'*{box-sizing:border-box;margin:0;padding:0;}'
  +'body{font-family:Cairo,sans-serif;background:#f8fafc;color:#1e293b;font-size:12px;direction:rtl;}'
  +'.no-print{background:#1e3a8a;color:white;padding:8px 16px;display:flex;gap:10px;align-items:center;position:sticky;top:0;z-index:10;}'
  +'.print-btn{background:#16a34a;border:none;color:white;padding:7px 20px;border-radius:7px;font-size:12px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}'
  +'.close-btn{background:rgba(255,255,255,.2);border:none;color:white;padding:7px 16px;border-radius:7px;font-size:12px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;}'
  +'.wrap{padding:0;width:100%;}'
  +'.scale-wrap{display:inline-block;}'
  // رأس الكشف
  +'.tfr-header{border:2px solid #1e40af;border-radius:6px;padding:8px 14px;margin-bottom:8px;background:#eff6ff;}'
  +'.tfr-header-top{text-align:center;margin-bottom:5px;}'
  +'.tfr-school{font-size:17px;font-weight:900;color:#0f2a5e;}'
  +'.tfr-title{font-size:13px;font-weight:700;color:#1e40af;margin-top:2px;}'
  +'.tfr-meta{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#374151;flex-wrap:wrap;}'
  +'.tfr-meta span{background:#dbeafe;border-radius:4px;padding:2px 8px;}'
  // جدول
  +'table{border-collapse:collapse;width:100%;font-size:10.5px;direction:rtl;background:white;table-layout:fixed;}'
  +'th,td{border:1.2px solid #94a3b8;padding:4px 3px;text-align:center;vertical-align:middle;overflow:hidden;white-space:nowrap;}'
  +'thead tr.hdr1 th{background:#1e3a8a;color:white;font-size:10px;font-weight:800;}'
  +'thead tr.hdr2 th{background:#1e40af;color:white;font-size:9.5px;font-weight:700;}'
  +'thead tr.hdr3 th{background:#3b82f6;color:white;font-size:9px;font-weight:700;}'
  +'td.name-td{text-align:right;font-weight:700;font-size:10px;color:#0f2a5e;background:#eff6ff;padding:3px 6px;width:50mm;max-width:50mm;overflow:hidden;text-overflow:ellipsis;}'
  +'td.num-td{font-size:9px;background:#f8fafc;color:#64748b;width:20px;}'
  +'td.g-td{font-size:10px;background:#f8fafc;}'
  +'td.avg-td{font-weight:800;background:#d1fae5;color:#065f46;}'
  +'td.beh-td{background:#ede9fe;color:#4c1d95;font-weight:700;}'
  +'td.ex-td{background:#ffedd5;color:#7c2d12;font-weight:700;}'
  +'td.tot-td{background:#fef3c7;color:#92400e;font-weight:900;font-size:12px;}'
  +'td.fail-td{background:#fee2e2!important;color:#b91c1c!important;font-weight:900;font-size:12px;}'
  +'td span.g{color:#ef4444;font-weight:700;}'
  +'td span.m{color:#d97706;font-weight:700;}'
  +'tr:nth-child(even) td{filter:brightness(0.97);}'
  // توقيعات
  +'.tfr-sigs{display:flex;justify-content:space-between;margin-top:12px;gap:16px;}'
  +'.sig-box{flex:1;border:1.5px solid #cbd5e1;border-radius:6px;padding:10px 14px;text-align:center;background:#f8fafc;}'
  +'.sig-title{font-size:10px;font-weight:700;color:#374151;margin-bottom:6px;}'
  +'.sig-name{font-size:11px;font-weight:900;color:#1e40af;margin-bottom:18px;}'
  +'.sig-line{border-top:1.5px solid #94a3b8;margin-top:4px;padding-top:4px;font-size:9px;color:#64748b;}'
  // ملاحظة
  +'.tfr-note{font-size:8.5px;color:#475569;background:#e0e7ff;border:1px solid #bfdbfe;border-radius:5px;padding:4px 10px;margin-top:6px;}'
  +'@media print{'
  +'  @page{size:A4 portrait;margin:3mm 3mm;}'
  +'  html,body{background:#fff;width:100%;margin:0;overflow:hidden;}'
  +'  .no-print{display:none!important;}'
  +'  .wrap{padding:0;width:100%;}'
  +'  .tfr-header{padding:3px 6px;margin-bottom:3px;border-width:1px;border-radius:3px;}'
  +'  .tfr-school{font-size:11px;}'
  +'  .tfr-title{font-size:9px;margin-top:1px;}'
  +'  .tfr-meta{font-size:7.5px;gap:3px;}'
  +'  .tfr-meta span{padding:1px 5px;}'
  +'  td span.g{color:#ef4444!important;}'
  +'  td span.m{color:#d97706!important;}'
  +'  .tfr-sigs{margin-top:4px;gap:5px;}'
  +'  .sig-box{padding:3px 6px;border-radius:3px;}'
  +'  .sig-name{margin-bottom:6px;font-size:7.5px;}'
  +'  .sig-title{font-size:7px;margin-bottom:3px;}'
  +'  .sig-line{font-size:6.5px;}'
  +'  .tfr-note{font-size:6px;padding:2px 5px;margin-top:2px;}'
  +'  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'
  +'}'
  +'</style>'
  // سكريبت الضغط التلقائي بـ zoom
  +'<script>'
  +'window.addEventListener("load",function(){'
  +'  applyZoom();'
  +'});'
  +'window.addEventListener("beforeprint",function(){'
  +'  applyZoomPrint();'
  +'});'
  +'window.addEventListener("afterprint",function(){'
  +'  applyZoom();'
  +'});'
  +'function applyZoom(){'
  +'  var sw=document.querySelector(".scale-wrap");'
  +'  if(!sw)return;'
  +'  sw.style.zoom=1;'
  +'  var cw=sw.offsetWidth; var ch=sw.offsetHeight;'
  +'  var winW=window.innerWidth-4; var winH=window.innerHeight-60;'
  +'  var z=Math.min(winW/cw, winH/ch, 1);'
  +'  sw.style.zoom=z;'
  +'}'
  +'function applyZoomPrint(){'
  +'  var sw=document.querySelector(".scale-wrap");'
  +'  if(!sw)return;'
  +'  sw.style.zoom=1;'
  +'  var cw=sw.offsetWidth; var ch=sw.offsetHeight;'
  // A4 portrait at 96dpi: 794×1123px, minus 3mm margins each side = ~794-23=771w, ~1123-23=1100h
  +'  var pgW=771; var pgH=1100;'
  +'  var z=Math.min(pgW/cw, pgH/ch, 1);'
  +'  sw.style.zoom=z;'
  +'}'
  +'<\/script>';

  // شريط الأزرار
  p+='<div class="no-print">'
  +'<button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>'
  +'<button class="close-btn" onclick="window.close()">✕ إغلاق</button>'
  +'<span style="font-size:10px;opacity:.7;margin-right:8px;">اختر "حفظ كـ PDF" لحفظ الملف</span>'
  +'</div>';

  p+='<div class="wrap"><div class="scale-wrap">';

  // رأس الكشف
  p+='<div class="tfr-header">';
  p+='<div class="tfr-header-top">';
  p+='<div class="tfr-school">'+esc(DB.meta.schoolName||'Dalty Grades')+'</div>';
  p+='<div class="tfr-title">كشف تفريغ درجات'+(subject?' مادة '+tfrEsc(subject):'')+(term?' - '+tfrEsc(term):'')+(syear?' - '+tfrEsc(syear):'')+'</div>';
  p+='</div>';
  p+='<div class="tfr-meta">';
  p+='<span>📚 الفصل: <strong>'+tfrEsc(cls)+'</strong></span>';
  p+='<span>📅 الأسابيع: <strong>'+selWeeks.join('، ')+'</strong></span>';
  p+='<span>🖨️ تاريخ الطباعة: <strong>'+dateStr+'</strong></span>';
  if(teacherName) p+='<span>👨‍🏫 المعلم: <strong>'+tfrEsc(teacherName)+'</strong></span>';
  p+='</div>';
  p+='</div>';

  // الجدول
  // عدد الأعمدة: 1(رقم) + 1(اسم) + selWeeks*2 + 4(تجميعي) + 1(مجموع)
  var totalCols = 1 + 1 + selWeeks.length*2 + 4 + 1;
  var otherCols = totalCols - 2; // كل الأعمدة عدا الرقم والاسم
  p+='<table>';
  p+='<colgroup>';
  p+='<col style="width:18px;">';        // رقم
  p+='<col style="width:50mm;">';        // اسم — ثابت 50mm
  for(var ci=0;ci<otherCols;ci++){
    p+='<col style="width:auto;">';      // باقي الأعمدة توزيع متساوٍ
  }
  p+='</colgroup>';
  // صف 1: رقم + اسم + أسابيع (بتاريخ) + تجميعي + مجموع
  p+='<thead>';
  p+='<tr class="hdr1">';
  p+='<th rowspan="2">#</th>';
  p+='<th rowspan="2" style="text-align:right;">اسم الطالب</th>';
  selWeeks.forEach(function(w){
    var d=fmtWeekDate(w);
    p+='<th colspan="2" style="background:#0f3460;">'+(d?'<div style="font-size:8px;font-weight:400;opacity:.8;">'+d+'</div>':'')+' أ'+w+'</th>';
  });
  p+='<th colspan="4" style="background:#14532d;color:#86efac;">التجميعي</th>';
  p+='<th rowspan="2" style="background:#451a03;color:#fcd34d;min-width:35px;">المج<br/>/70</th>';
  p+='</tr>';

  // صف 2: درجات كل أسبوع
  p+='<tr class="hdr2">';
  selWeeks.forEach(function(){
    p+='<th style="background:#0f3460;color:#93c5fd;">ت<br/>/20</th>';
    p+='<th style="background:#1e4080;color:#67e8f9;">و<br/>/10</th>';
  });
  p+='<th style="background:#14532d;color:#86efac;">م.ت<br/>/20</th>';
  p+='<th style="background:#14532d;color:#67e8f9;">م.و<br/>/10</th>';
  p+='<th style="background:#14532d;color:#a78bfa;" title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br/><small>/10</small></th>';
  p+='<th style="background:#14532d;color:#fdba74;">اخت<br/>/30</th>';
  p+='</tr></thead><tbody>';

  allCalc.forEach(function(item,idx){
    var s=item.s, r=item.r;
    var isFail=r.total<35;
    p+='<tr>';
    p+='<td class="num-td">'+(idx+1)+'</td>';
    p+='<td class="name-td">'+tfrEsc(s.name)+'</td>';
    selWeeks.forEach(function(w){
      var wd=r.weeks[w];
      var av=wd.av_raw, hv=wd.hv_raw;
      var avD=(av===''||av===undefined||av===null)?'—':(av==='غ'?'<span class="g">غ</span>':(av==='م'?'<span class="m">م</span>':av));
      var hvD=(hv===''||hv===undefined||hv===null)?'—':(hv==='غ'?'<span class="g">غ</span>':(hv==='م'?'<span class="m">م</span>':hv));
      p+='<td class="g-td">'+avD+'</td>';
      p+='<td class="g-td">'+hvD+'</td>';
    });
    p+='<td class="avg-td">'+r.avgA+'</td>';
    p+='<td class="avg-td">'+r.avgH+'</td>';
    p+='<td class="beh-td">'+r.beh+'</td>';
    p+='<td class="ex-td">'+r.exam+'</td>';
    p+='<td class="'+(isFail?'fail-td':'tot-td')+'">'+r.total+'</td>';
    p+='</tr>';
  });

  p+='</tbody></table>';

  // ملاحظة
  p+='<div class="tfr-note">📌 الإجمالي = م.التقييم(20) + م.الواجبات(10) + م.السلوك(10) + م.الاختبارات(30) = 70 &nbsp;|&nbsp; الأسابيع: '+selWeeks.join('،')+' &nbsp;|&nbsp; تلقائي | تلقائي</div>';

  // التوقيعات
  p+='<div class="tfr-sigs">';
  p+='<div class="sig-box"><div class="sig-title">توقيع معلم المادة</div><div class="sig-name">ا/ '+tfrEsc(teacherName||'.....................')+'</div><div class="sig-line">السلوك والمواظبة</div></div>';
  p+='<div class="sig-box"><div class="sig-title">درجة أعمال السنة للطالب</div><div class="sig-name">&nbsp;</div><div class="sig-line">المجموع الكلي</div></div>';
  p+='<div class="sig-box"><div class="sig-title">مدير المدرسة</div><div class="sig-name">&nbsp;</div><div class="sig-line">التوقيع والختم</div></div>';
  p+='</div>';

  p+='</div>'; // .scale-wrap
  p+='</div>'; // .wrap

  var win=window.open('','_blank','width=1200,height=850,scrollbars=yes');
  if(!win){alert('يرجى السماح بالنوافذ المنبثقة في المتصفح');return;}
  win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف التفريغ — '+tfrEsc(cls)+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">'
    +'<\/head><body>'+p+'<\/body><\/html>');
  win.document.close();
}
window.tfrPrint = tfrPrint;

function renderTafrighPage(){
  var root=document.getElementById('tafrighRoot');
  if(!root)return;

  if(!TFR.cls && DB.classes.length) TFR.cls=DB.classes[0];
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var availWeeks=ALL_WEEKS.slice(0,aw);
  if(!TFR.weeks.length) TFR.weeks=availWeeks.slice();

  var cls=TFR.cls;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var selWeeks=TFR.weeks.slice().sort(function(a,b){return a-b;});

  // حساب تاريخ بداية الأسبوع من meta
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

  // إعدادات الخط
  var TF=TFR.font||{};
  var tfFamily=TF.family||'Cairo,sans-serif';
  var tfTableSize=TF.tableSize||10;
  var tfHeaderSize=TF.headerSize||9;
  var tfNameSize=TF.nameSize||10;
  var tfTotalSize=TF.totalSize||12;
  var tfWeight=TF.weight||700;

  var h='';
  h+='<div style="display:flex;flex-direction:column;height:100%;background:#f1f5f9;font-family:'+tfFamily+';direction:rtl;">';

  // شريط الأدوات
  h+='<div style="background:#1e3a8a;padding:9px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0;">';
  h+='<span style="font-size:12px;font-weight:800;color:#f1f5f9;">📋 كشف التفريغ</span>';
  // أزرار الفصول
  DB.classes.forEach(function(c){
    var on=c===cls;
    h+='<button onclick="TFR.cls=\''+tfrEsc(c)+'\';TFR.weeks=[];renderTafrighPage()" style="padding:3px 12px;border-radius:6px;font-size:10px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:'+(on?'#0f766e':'rgba(255,255,255,.15)')+';color:#fff;">'+tfrEsc(c)+'</button>';
  });
  h+='<div style="width:1px;height:20px;background:#334155;margin:0 4px;"></div>';
  // فاصل + أسابيع
  h+='<button onclick="TFR.weeks='+JSON.stringify(availWeeks)+';renderTafrighPage()" style="background:#0f766e;border:none;color:white;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">كل الأسابيع</button>';
  h+='<button onclick="TFR.weeks=[];renderTafrighPage()" style="background:#7f1d1d;border:none;color:white;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">مسح الكل</button>';
  h+='<div style="width:1px;height:20px;background:#334155;margin:0 4px;"></div>';
  // زر الطباعة
  h+='<button onclick="tfrPrint()" style="background:linear-gradient(135deg,#15803d,#16a34a);border:none;color:white;padding:6px 18px;border-radius:8px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">🖨️ طباعة كشف التفريغ</button>';
  h+='<button onclick="tfrExportExcel()" style="background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:white;padding:6px 18px;border-radius:8px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">⬇️ تصدير Excel</button>';
  h+='<button onclick="openTfrFontSettings()" style="background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;">⚙ الخط</button>';
  h+='</div>';

  // اختيار الأسابيع
  h+='<div style="background:#0a1628;padding:8px 14px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex-shrink:0;border-bottom:1px solid #1e3a5f;">';
  h+='<span style="font-size:9px;color:#94a3b8;font-weight:700;margin-left:4px;">📅 الأسابيع:</span>';
  availWeeks.forEach(function(w){
    var on=TFR.weeks.indexOf(w)>=0;
    h+='<button onclick="var i=TFR.weeks.indexOf('+w+');if(i>=0)TFR.weeks.splice(i,1);else TFR.weeks.push('+w+');renderTafrighPage()" style="padding:2px 9px;border-radius:14px;font-size:10px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer;border:1px solid '+(on?'#3b82f6':'#334155')+';background:'+(on?'#1d4ed8':'rgba(255,255,255,.07)')+';color:'+(on?'#fff':'#64748b')+';">أ'+w+'</button>';
  });
  // تفاصيل اسم المعلم والمادة
  h+='<div style="margin-right:auto;display:flex;gap:6px;align-items:center;">';
  h+='<input id="tfr_subject" value="'+tfrEsc(TFR.subject)+'" placeholder="المادة" oninput="TFR.subject=this.value" style="background:rgba(255,255,255,.09);border:1px solid #334155;color:white;padding:3px 8px;border-radius:5px;font-size:10px;font-family:Cairo,sans-serif;width:90px;outline:none;">';
  h+='<input id="tfr_teacher" value="'+tfrEsc(TFR.teacherName)+'" placeholder="اسم المعلم" oninput="TFR.teacherName=this.value" style="background:rgba(255,255,255,.09);border:1px solid #334155;color:white;padding:3px 8px;border-radius:5px;font-size:10px;font-family:Cairo,sans-serif;width:130px;outline:none;">';
  h+='<input id="tfr_term" value="'+tfrEsc(TFR.term)+'" placeholder="الفصل الدراسي" oninput="TFR.term=this.value" style="background:rgba(255,255,255,.09);border:1px solid #334155;color:white;padding:3px 8px;border-radius:5px;font-size:10px;font-family:Cairo,sans-serif;width:110px;outline:none;">';
  h+='</div>';
  h+='</div>';

  if(!selWeeks.length){
    h+='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#475569;font-size:13px;">اختر أسبوعاً واحداً على الأقل</div>';
    h+='</div>';
    root.innerHTML=h;
    return;
  }

  // إحصائيات سريعة
  h+='<div style="background:#0f172a;padding:6px 14px;display:flex;gap:16px;flex-shrink:0;border-bottom:1px solid #1e3a5f;">';
  h+='<span style="font-size:9.5px;color:#60a5fa;">👥 عدد الطلاب: <strong style="color:#f1f5f9;">'+students.length+'</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">📊 متوسط الإجمالي: <strong style="color:#34d399;">'+avg+'/70</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">✅ ناجح (≥35): <strong style="color:#4ade80;">'+pass+'</strong></span>';
  h+='<span style="font-size:9.5px;color:#60a5fa;">❌ راسب: <strong style="color:#f87171;">'+(students.length-pass)+'</strong></span>';
  h+='</div>';

  // الجدول
  h+='<div style="flex:1;overflow:auto;padding:10px 14px;">';
  h+='<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;margin-bottom:8px;padding:8px 12px;font-size:10px;color:#93c5fd;">📌 معاينة كشف التفريغ — اضغط "طباعة" للحصول على النسخة الرسمية القابلة للطباعة</div>';
  h+='<table style="border-collapse:collapse;width:100%;font-size:'+tfTableSize+'px;direction:rtl;background:white;border-radius:8px;overflow:hidden;font-family:'+tfFamily+';">';
  h+='<thead>';
  h+='<tr>';
  h+='<th rowspan="2" style="background:#1e3a8a;color:white;border:1px solid #3b82f6;padding:5px 3px;width:24px;">#</th>';
  h+='<th rowspan="2" style="background:#1e3a8a;color:white;border:1px solid #3b82f6;padding:5px 6px;text-align:right;min-width:120px;">اسم الطالب</th>';
  selWeeks.forEach(function(w){
    var d=fmtD(w);
    h+='<th colspan="2" style="background:#0f3460;color:#93c5fd;border:1px solid #3b82f6;padding:4px 2px;font-size:'+tfHeaderSize+'px;">'+(d?'<div style="font-size:8px;opacity:.8;">'+d+'</div>':'')+'أسبوع '+w+'</th>';
  });
  h+='<th colspan="4" style="background:#14532d;color:#86efac;border:1px solid #3b82f6;padding:5px 2px;">التجميعي</th>';
  h+='<th rowspan="2" style="background:#451a03;color:#fcd34d;border:1px solid #3b82f6;padding:5px 3px;min-width:38px;">الإجمالي<br/>/70</th>';
  h+='</tr><tr>';
  selWeeks.forEach(function(){
    h+='<th style="background:#0f3460;color:#93c5fd;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">ت<br/>/20</th>';
    h+='<th style="background:#1e4080;color:#67e8f9;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">و<br/>/10</th>';
  });
  h+='<th style="background:#14532d;color:#86efac;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">م.ت<br/>/20</th>';
  h+='<th style="background:#14532d;color:#67e8f9;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">م.و<br/>/10</th>';
  h+='<th style="background:#14532d;color:#a78bfa;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;" title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br/><small>/10</small></th>';
  h+='<th style="background:#14532d;color:#fdba74;border:1px solid #3b82f6;padding:3px 1px;font-size:'+tfHeaderSize+'px;">اخت<br/>/30</th>';
  h+='</tr></thead><tbody>';

  allCalc.forEach(function(item,idx){
    var s=item.s,r=item.r;
    var isFail=r.total<35;
    h+='<tr>';
    h+='<td style="text-align:center;font-size:'+tfHeaderSize+'px;background:#f8fafc;border:1px solid #bfdbfe;color:#64748b;">'+(idx+1)+'</td>';
    h+='<td style="text-align:right;font-weight:'+tfWeight+';font-size:'+tfNameSize+'px;color:#0f2a5e;background:#eff6ff;border:1px solid #bfdbfe;padding:3px 6px;">'+tfrEsc(s.name)+'</td>';
    selWeeks.forEach(function(w){
      var wd=r.weeks[w];
      var av=wd.av_raw,hv=wd.hv_raw;
      var avD=(av===''||av===undefined||av===null)?'—':(av==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(av==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':av));
      var hvD=(hv===''||hv===undefined||hv===null)?'—':(hv==='غ'?'<span style="color:#ef4444;font-weight:700;">غ</span>':(hv==='م'?'<span style="color:#d97706;font-weight:700;">م</span>':hv));
      h+='<td style="text-align:center;font-size:'+tfTableSize+'px;font-weight:'+tfWeight+';background:#f8fafc;border:1px solid #bfdbfe;">'+avD+'</td>';
      h+='<td style="text-align:center;font-size:'+tfTableSize+'px;font-weight:'+tfWeight+';background:#f8fafc;border:1px solid #bfdbfe;">'+hvD+'</td>';
    });
    h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;background:#d1fae5;border:1px solid #bfdbfe;color:#065f46;">'+r.avgA+'</td>';
    h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;background:#d1fae5;border:1px solid #bfdbfe;color:#065f46;">'+r.avgH+'</td>';
    h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;background:#ede9fe;border:1px solid #bfdbfe;color:#4c1d95;">'+r.beh+'</td>';
    h+='<td style="text-align:center;font-weight:'+tfWeight+';font-size:'+tfTableSize+'px;background:#ffedd5;border:1px solid #bfdbfe;color:#7c2d12;">'+r.exam+'</td>';
    h+='<td style="text-align:center;font-weight:900;font-size:'+tfTotalSize+'px;background:'+(isFail?'#fee2e2':'#fef3c7')+';border:1px solid #bfdbfe;color:'+(isFail?'#b91c1c':'#92400e')+';">'+r.total+'</td>';
    h+='</tr>';
  });

  h+='</tbody></table>';
  h+='</div>'; // overflow:auto

  h+='</div>'; // flex container
  root.innerHTML=h;
}
window.renderTafrighPage = renderTafrighPage;

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
