function weekEndDate(week){
  var d=weekStartDate(week);
  if(!d)return null;
  d.setDate(d.getDate()+5); // Thursday
  return d;
}

function fmtDate(d){
  if(!d)return '—';
  var months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return d.getDate()+' '+months[d.getMonth()];
}

function fmtDateShort(d){
  if(!d)return '—';
  var m=String(d.getMonth()+1).padStart(2,'0');
  return d.getDate()+'/'+m;
}

function gradeCell(val, max, showMax){
  if(val===''||val===undefined||val===null) return '<span class="fr-grade-cell fr-grade-empty">—</span>';
  if(val==='غ') return '<span class="fr-grade-cell fr-grade-abs">غ</span>';
  if(val==='م') return '<span class="fr-grade-cell fr-grade-excuse">م</span>';
  var num=Number(val)||0;
  var pct=max>0?num/max*100:0;
  var cls=pct>=80?'fr-grade-high':pct>=60?'fr-grade-mid':pct>=40?'fr-grade-low':'fr-grade-fail';
  return '<span class="fr-grade-cell '+cls+'">'+num+(showMax?'<span style="font-size:8px;opacity:.6;">/'+max+'</span>':'')+'</span>';
}

function gradeColorLight(pct){
  if(pct>=80)return{bg:'#f0fdf4',color:'#16a34a',border:'#bbf7d0'};
  if(pct>=60)return{bg:'#eff6ff',color:'#2563eb',border:'#bfdbfe'};
  if(pct>=40)return{bg:'#fff7ed',color:'#ea580c',border:'#fed7aa'};
  return{bg:'#fef2f2',color:'#dc2626',border:'#fecaca'};
}

function buildStudentFollowerCard(cls, s){
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var awList=ALL_WEEKS.slice(0,aw);
  var calc=calcStudent(s);
  var tmax=70;
  var pct=Math.round(calc.total/tmax*100);
  var gradePct=gradeColorLight(pct);
  var initials=s.name.split(' ').slice(0,2).map(function(x){return x.charAt(0);}).join('');
  var schoolName=(DB.meta&&DB.meta.schoolName)||'Dalty Grades';
  var teacherName=(DB.meta&&DB.meta.teacherName)||'';
  var subject=(DB.meta&&DB.meta.subject)||'';
  var absCount=countAbsences(cls,s.id);
  var sickCount=countSick(cls,s.id);
  var hasStart=!!(DB.meta&&DB.meta.startDate);

  // Determine which exams/behavior have data
  var ex1Val=s.ex1; var ex2Val=s.ex2;
  var beh1Val=s.beh1; var beh2Val=s.beh2;
  var ex1Done=(ex1Val!==''&&ex1Val!==undefined&&ex1Val!==null);
  var ex2Done=(ex2Val!==''&&ex2Val!==undefined&&ex2Val!==null);

  var html='<div class="fr-student-card">';

  // ── Header
  html+='<div class="fr-student-card-header">';
  // Avatar
  if(s.photo||DB.meta.defaultStudentPhoto) html+='<div class="fr-avatar"><img src="'+(s.photo||DB.meta.defaultStudentPhoto)+'" alt=""/></div>';
  else html+='<div class="fr-avatar">'+esc(initials)+'</div>';
  // Info
  html+='<div style="flex:1;">';
  html+='<div class="fr-stu-name">'+esc(s.name)+'</div>';
  html+='<div class="fr-stu-meta">'+esc(cls)+' — '+esc(subject)+' — '+esc(schoolName)+'</div>';
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px;">';
  html+='<span style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:2px 8px;font-size:9px;">📚 '+aw+' أسبوع نشط</span>';
  if(absCount>0) html+='<span style="background:rgba(239,68,68,.3);border:1px solid rgba(239,68,68,.4);border-radius:6px;padding:2px 8px;font-size:9px;">غياب: '+absCount+' حصة</span>';
  if(sickCount>0) html+='<span style="background:rgba(245,158,11,.3);border:1px solid rgba(245,158,11,.4);border-radius:6px;padding:2px 8px;font-size:9px;">🤒 مرض: '+sickCount+' حصة</span>';
  if(hasStart) html+='<span style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:2px 8px;font-size:9px;">📅 بداية: '+fmtDate(new Date(DB.meta.startDate))+'</span>';
  html+='</div></div>';
  // Score summary
  html+='<div class="fr-score-summary">';
  html+='<div class="fr-score-big">'+calc.total+'</div>';
  html+='<div class="fr-score-lbl">من '+tmax+'</div>';
  html+='<div class="fr-grade-badge">'+gradeAr(pct)+' ('+pct+'%)</div>';
  html+='</div></div>'; // end header

  // ── Weekly Timeline Table
  html+='<div style="overflow-x:auto;">';
  html+='<table class="fr-timeline" style="width:100%;">';
  html+='<thead>';
  html+='<tr>';
  html+='<th class="th-week" rowspan="2">الأسبوع</th>';
  if(hasStart) html+='<th class="th-date" rowspan="2">التاريخ</th>';
  html+='<th colspan="2" style="background:#1e40af;color:white;padding:6px;">📊 التقييم الأسبوعي</th>';
  html+='<th colspan="2" style="background:#5b21b6;color:white;padding:6px;">📝 الواجب الأسبوعي</th>';
  html+='<th style="background:#065f46;color:white;padding:6px;">حالة الأسبوع</th>';
  html+='</tr>';
  html+='<tr>';
  html+='<th style="background:#2563eb;color:white;font-size:9px;">الدرجة<br><span style="opacity:.8;">/20</span></th>';
  html+='<th style="background:#2563eb;color:white;font-size:9px;">النسبة</th>';
  html+='<th style="background:#7c3aed;color:white;font-size:9px;">الدرجة<br><span style="opacity:.8;">/10</span></th>';
  html+='<th style="background:#7c3aed;color:white;font-size:9px;">النسبة</th>';
  html+='<th style="background:#059669;color:white;font-size:9px;">التقييم</th>';
  html+='</tr>';
  html+='</thead><tbody>';

  awList.forEach(function(w){
    var aRaw=s['a'+w]; var hRaw=s['h'+w];
    var aNum=(aRaw===''||aRaw===undefined||aRaw===null||aRaw==='م')?null:(aRaw==='غ'?0:Number(aRaw)||0);
    var hNum=(hRaw===''||hRaw===undefined||hRaw===null||hRaw==='م')?null:(hRaw==='غ'?0:Number(hRaw)||0);
    var aPct=aNum!==null?Math.round(aNum/20*100):null;
    var hPct=hNum!==null?Math.round(hNum/10*100):null;

    // Week status
    var statusStr='', statusStyle='';
    if(aRaw==='غ'||hRaw==='غ'){statusStr='غياب';statusStyle='color:#dc2626;font-weight:700;';}
    else if(aRaw==='م'||hRaw==='م'){statusStr='معذور';statusStyle='color:#2563eb;';}
    else if(aNum===null&&hNum===null){statusStr='لم يُرصد';statusStyle='color:#94a3b8;';}
    else {
      var sp=(aPct||0+hPct||0)/2;
      if(aPct!==null&&hPct!==null) sp=Math.round((aPct+hPct)/2);
      else if(aPct!==null) sp=aPct;
      else sp=hPct||0;
      var g=gradeColorLight(sp);
      statusStr=gradeAr(sp);
      statusStyle='color:'+g.color+';font-weight:700;';
    }

    // Date range
    var dateStr='';
    if(hasStart){
      var dStart=weekStartDate(w);
      var dEnd=weekEndDate(w);
      dateStr=fmtDateShort(dStart)+'<br>'+fmtDateShort(dEnd);
    }

    html+='<tr>';
    html+='<td class="td-week">أسبوع '+w+'</td>';
    if(hasStart) html+='<td class="td-date" style="font-size:9.5px;line-height:1.4;">'+dateStr+'</td>';
    // Assessment
    html+='<td>'+gradeCell(aRaw,20,false)+'</td>';
    html+='<td style="font-size:10px;'+(aPct!==null?'color:'+(aPct>=60?'#16a34a':'#dc2626')+';font-weight:700;':'color:#94a3b8;')+'">'+( aPct!==null?aPct+'%':'—')+'</td>';
    // Homework
    html+='<td>'+gradeCell(hRaw,10,false)+'</td>';
    html+='<td style="font-size:10px;'+(hPct!==null?'color:'+(hPct>=60?'#16a34a':'#dc2626')+';font-weight:700;':'color:#94a3b8;')+'">'+( hPct!==null?hPct+'%':'—')+'</td>';
    // Status
    html+='<td style="'+statusStyle+';font-size:10px;">'+statusStr+'</td>';
    html+='</tr>';
  });

  html+='</tbody>';

  // Totals row
  html+='<tfoot>';
  html+='<tr style="background:#f8fafc;">';
  html+='<td colspan="'+(hasStart?2:1)+'" style="text-align:right;padding:8px 10px;font-weight:700;font-size:10px;color:#0f2a5e;background:#e0e7ff;">📊 المتوسطات والمجاميع</td>';
  html+='<td style="background:#e0e7ff;font-weight:800;color:#1d4ed8;font-size:12px;">'+calc.avgAssess+'</td>';
  var aPctTotal=Math.round(calc.avgAssess/20*100);
  html+='<td style="background:#e0e7ff;font-weight:800;color:'+(aPctTotal>=60?'#16a34a':'#dc2626')+';font-size:11px;">'+aPctTotal+'%</td>';
  html+='<td style="background:#ede9fe;font-weight:800;color:#7c3aed;font-size:12px;">'+calc.avgHw+'</td>';
  var hPctTotal=Math.round(calc.avgHw/10*100);
  html+='<td style="background:#ede9fe;font-weight:800;color:'+(hPctTotal>=60?'#16a34a':'#dc2626')+';font-size:11px;">'+hPctTotal+'%</td>';
  html+='<td style="background:#d1fae5;font-weight:800;color:#065f46;font-size:11px;">'+gradeAr(Math.round((aPctTotal+hPctTotal)/2))+'</td>';
  html+='</tr>';
  html+='</tfoot>';
  html+='</table></div>';

  // ── Behavior & Exams section
  html+='<div style="background:#f8fafc;border-top:2px solid #e2e8f0;padding:12px 16px;">';
  html+='<div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:8px;">📋 السلوك والاختبارات</div>';
  html+='<div class="fr-other-grid">';

  // Behavior 1
  var b1=s.beh1; var b1num=(b1!==''&&b1!==undefined&&b1!==null)?Number(b1):null;
  var b1pct=b1num!==null?Math.round(b1num/5*100):0;
  var b1c=gradeColorLight(b1pct);
  html+='<div class="fr-other-cell">';
  html+='<div class="fr-other-lbl">🌟 سلوك 1</div>';
  html+='<div class="fr-other-val" style="color:'+(b1num!==null?b1c.color:'#94a3b8')+'">'+(b1num!==null?b1num:'—')+'</div>';
  html+='<div class="fr-other-max">/5</div>';
  if(b1num!==null){html+='<div class="fr-bar"><div class="fr-bar-fill" style="width:'+b1pct+'%;background:'+b1c.color+'"></div></div>';}
  html+='</div>';

  // Behavior 2
  var b2=s.beh2; var b2num=(b2!==''&&b2!==undefined&&b2!==null)?Number(b2):null;
  var b2pct=b2num!==null?Math.round(b2num/5*100):0;
  var b2c=gradeColorLight(b2pct);
  html+='<div class="fr-other-cell">';
  html+='<div class="fr-other-lbl">🌟 سلوك 2</div>';
  html+='<div class="fr-other-val" style="color:'+(b2num!==null?b2c.color:'#94a3b8')+'">'+(b2num!==null?b2num:'—')+'</div>';
  html+='<div class="fr-other-max">/5</div>';
  if(b2num!==null){html+='<div class="fr-bar"><div class="fr-bar-fill" style="width:'+b2pct+'%;background:'+b2c.color+'"></div></div>';}
  html+='</div>';

  // Exam 1
  var e1=s.ex1; var e1num=(e1!==''&&e1!==undefined&&e1!==null)?Number(e1):null;
  var e1pct=e1num!==null?Math.round(e1num/15*100):0;
  var e1c=gradeColorLight(e1pct);
  html+='<div class="fr-other-cell" style="background:'+(ex1Done?e1c.bg:'white')+'">';
  html+='<div class="fr-other-lbl">📋 اختبار 1 '+(ex1Done?'<span style="background:'+e1c.color+';color:white;border-radius:4px;padding:1px 4px;font-size:8px;">تم</span>':'<span style="color:#94a3b8;font-size:8px;">لم يُجرَ</span>')+'</div>';
  html+='<div class="fr-other-val" style="color:'+(e1num!==null?e1c.color:'#94a3b8')+'">'+(e1num!==null?e1num:'—')+'</div>';
  html+='<div class="fr-other-max">/15</div>';
  if(e1num!==null){html+='<div class="fr-bar"><div class="fr-bar-fill" style="width:'+e1pct+'%;background:'+e1c.color+'"></div></div>';}
  html+='</div>';

  // Exam 2
  var e2=s.ex2; var e2num=(e2!==''&&e2!==undefined&&e2!==null)?Number(e2):null;
  var e2pct=e2num!==null?Math.round(e2num/15*100):0;
  var e2c=gradeColorLight(e2pct);
  html+='<div class="fr-other-cell" style="background:'+(ex2Done?e2c.bg:'white')+'">';
  html+='<div class="fr-other-lbl">📋 اختبار 2 '+(ex2Done?'<span style="background:'+e2c.color+';color:white;border-radius:4px;padding:1px 4px;font-size:8px;">تم</span>':'<span style="color:#94a3b8;font-size:8px;">لم يُجرَ</span>')+'</div>';
  html+='<div class="fr-other-val" style="color:'+(e2num!==null?e2c.color:'#94a3b8')+'">'+(e2num!==null?e2num:'—')+'</div>';
  html+='<div class="fr-other-max">/15</div>';
  if(e2num!==null){html+='<div class="fr-bar"><div class="fr-bar-fill" style="width:'+e2pct+'%;background:'+e2c.color+'"></div></div>';}
  html+='</div>';

  html+='</div></div>'; // end fr-other-grid + bg section

  // ── Total summary bar
  var tcolor=gradeColorLight(pct);
  html+='<div style="background:'+tcolor.bg+';border-top:2px solid '+tcolor.border+';padding:12px 18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';
  html+='<div style="flex:1;">';
  html+='<div style="font-size:10px;color:'+tcolor.color+';font-weight:700;margin-bottom:5px;">المجموع الكلي</div>';
  html+='<div style="height:10px;background:rgba(0,0,0,.1);border-radius:5px;overflow:hidden;">';
  html+='<div style="width:'+pct+'%;background:'+tcolor.color+';height:100%;border-radius:5px;transition:width .5s;"></div>';
  html+='</div>';
  html+='<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:'+tcolor.color+';">';
  html+='<span>'+calc.avgAssess+' تقييم + '+calc.avgHw+' واجب + '+calc.avgBeh+' سلوك + '+calc.exTotal+' اختبارات</span>';
  html+='<span style="font-weight:700;">'+calc.total+'/70</span>';
  html+='</div></div>';
  html+='<div style="text-align:center;padding:4px 16px;background:'+tcolor.color+';color:white;border-radius:10px;min-width:80px;">';
  html+='<div style="font-size:22px;font-weight:900;">'+pct+'%</div>';
  html+='<div style="font-size:10px;opacity:.9;">'+gradeAr(pct)+'</div>';
  html+='</div>';
  html+='</div>';

  // ── Signature section
  html+='<div class="fr-signature">';
  html+='<div class="fr-sig-cell"><div style="font-size:9px;font-weight:700;color:#374151;">المعلم / '+esc(teacherName)+'</div><div class="fr-sig-line"></div><div>التوقيع</div></div>';
  html+='<div class="fr-sig-cell"><div style="font-size:9px;font-weight:700;color:#374151;">ولي الأمر</div><div class="fr-sig-line"></div><div>التوقيع</div></div>';
  html+='<div class="fr-sig-cell"><div style="font-size:9px;font-weight:700;color:#374151;">مدير المدرسة</div><div class="fr-sig-line"></div><div>التوقيع</div></div>';
  html+='</div>';

  html+='</div>'; // end fr-student-card
  return html;
}

function renderFollowerReport(cls){
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var clsIdx=DB.classes.indexOf(cls);
  var color=CLS_COLORS[clsIdx%CLS_COLORS.length];
  var hasStart=!!(DB.meta&&DB.meta.startDate);
  var aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);

  // Sort by name
  var sorted=students.slice().sort(function(a,b){return a.name.localeCompare(b.name,'ar');});

  var html='<div class="fr-page">';

  // ── Filter/control bar
  html+='<div class="fr-filter-bar">';
  html+='<span class="fr-filter-label">🖨 تقارير المتابعين —</span>';
  html+='<span style="font-size:11px;color:var(--text2);">'+esc(cls)+'</span>';
  html+='<span style="margin-right:auto;display:flex;gap:7px;flex-wrap:wrap;align-items:center;">';
  if(!hasStart){
    html+='<span style="background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid rgba(245,158,11,.3);border-radius:7px;padding:3px 9px;font-size:9px;">⚠️ لم يُحدد تاريخ بداية الفصل من الإعدادات — التواريخ لن تظهر</span>';
  } else {
    html+='<span style="background:rgba(16,185,129,.1);color:#34d399;border:1px solid rgba(16,185,129,.3);border-radius:7px;padding:3px 9px;font-size:9px;">📅 البداية: '+fmtDate(new Date(DB.meta.startDate))+' — '+aw+' أسبوع</span>';
  }
  html+='<input class="search-inp" style="max-width:180px;font-size:10px;" placeholder="🔍 بحث بالاسم..." oninput="frFilter(this.value)" id="frSearch"/>';
  html+='<button class="btn btn-ghost" style="font-size:10px;" onclick="frSelectAll()">تحديد الكل</button>';
  html+='<button class="btn btn-ghost" style="font-size:10px;" onclick="frClearAll()">إلغاء الكل</button>';
  html+='<button class="btn btn-primary" style="font-size:10px;" onclick="frPrint()">🖨 طباعة المحدد</button>';
  html+='</span></div>';

  // ── Student selector checkboxes
  html+='<div id="frSelectorBar" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px;">';
  sorted.forEach(function(s){
    var calc=calcStudent(s);
    var pct=Math.round(calc.total/70*100);
    var c=gradeColorLight(pct);
    html+='<label style="display:flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px 10px;cursor:pointer;font-size:10px;color:var(--text2);transition:all .15s;" id="frl_'+s.id+'" onmouseover="this.style.borderColor=\''+c.color+'\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
    html+='<input type="checkbox" id="frchk_'+s.id+'" checked onchange="frToggle('+s.id+')" style="accent-color:'+c.color+';cursor:pointer;width:13px;height:13px;"/>';
    html+='<span>'+esc(s.name.split(' ')[0])+'</span>';
    html+='<span style="background:'+c.bg+';color:'+c.color+';border:1px solid '+c.border+';border-radius:5px;padding:0 5px;font-size:9px;font-weight:700;">'+calc.total+'</span>';
    html+='</label>';
  });
  html+='</div>';

  // ── Student cards
  html+='<div id="frCards">';
  sorted.forEach(function(s){
    html+='<div id="frcard_'+s.id+'" class="fr-card-wrapper" data-name="'+esc(s.name)+'">';
    html+=buildStudentFollowerCard(cls,s);
    html+='</div>';
  });

  if(!sorted.length){
    html+='<div class="empty-state"><div class="es-icon">👥</div><div class="es-msg">لا يوجد طلاب في هذا الفصل</div></div>';
  }

  html+='</div>';
  html+='</div>'; // fr-page

  document.getElementById('mainContent').innerHTML=html;

  // Store sorted for filter
  window._frSorted=sorted;
  window._frCls=cls;
  window._frSelected=sorted.map(function(s){return s.id;});
}

function frToggle(sid){
  if(!window._frSelected) return;
  var idx=window._frSelected.indexOf(sid);
  if(idx>=0) window._frSelected.splice(idx,1);
  else window._frSelected.push(sid);
  // Update card visibility
  var card=document.getElementById('frcard_'+sid);
  if(card) card.style.opacity=window._frSelected.indexOf(sid)>=0?'1':'0.35';
}

function frSelectAll(){
  if(!window._frSorted)return;
  window._frSorted.forEach(function(s){
    window._frSelected=window._frSorted.map(function(x){return x.id;});
    var chk=document.getElementById('frchk_'+s.id);
    if(chk) chk.checked=true;
    var card=document.getElementById('frcard_'+s.id);
    if(card) card.style.opacity='1';
  });
}

function frClearAll(){
  if(!window._frSorted)return;
  window._frSelected=[];
  window._frSorted.forEach(function(s){
    var chk=document.getElementById('frchk_'+s.id);
    if(chk) chk.checked=false;
    var card=document.getElementById('frcard_'+s.id);
    if(card) card.style.opacity='0.35';
  });
}

function frFilter(q){
  q=q.trim();
  if(!window._frSorted)return;
  window._frSorted.forEach(function(s){
    var card=document.getElementById('frcard_'+s.id);
    var lbl=document.getElementById('frl_'+s.id);
    var match=!q||s.name.indexOf(q)>=0;
    if(card) card.style.display=match?'':'none';
    if(lbl) lbl.style.display=match?'':'none';
  });
}

function frPrint(){
  // Hide unselected cards temporarily, print, then restore
  if(!window._frSorted||!window._frSelected)return;
  window._frSorted.forEach(function(s){
    var card=document.getElementById('frcard_'+s.id);
    if(card) card.dataset.wasHidden=(window._frSelected.indexOf(s.id)<0)?'1':'0';
    if(card&&window._frSelected.indexOf(s.id)<0) card.style.display='none';
  });
  window.print();
  setTimeout(function(){
    if(!window._frSorted)return;
    window._frSorted.forEach(function(s){
      var card=document.getElementById('frcard_'+s.id);
      if(card&&card.dataset.wasHidden==='1') card.style.display='';
    });
  },500);
}

// ── Entry point ───────────────────────────────────────
window._repReady = repInit;



// ══════════════════════════════



// ── Week definitions ──────────────────────────────────────────
var WEEK_DATES = {
  1:  '08/02/2026', 2:  '15/02/2026', 3:  '22/02/2026',
  4:  '01/03/2026', 5:  '08/03/2026', 6:  '15/03/2026',
  7:  '22/03/2026', 8:  '29/03/2026', 9:  '05/04/2026',
  10: '12/04/2026', 11: '19/04/2026', 12: '26/04/2026',
  13: '03/05/2026', 14: '10/05/2026'
};

var ALL_WEEKS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14];

var DB = null;

// ── Load from localStorage ────────────────────────────────────
function loadDB() {
  var keys = ['grades_v6','grades_v5','grades_v4','grades_v3','grades'];
  for (var i = 0; i < keys.length; i++) {
    try {
      var s = localStorage.getItem(keys[i]);
      if (s) { var d = JSON.parse(s); if (d && d.classes) return d; }
    } catch(e){}
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtVal(v) {
  if (v===null||v===undefined||v==='') return '—';
  if (v==='غ') return '<span class="td-absent">غ</span>';
  return v;
}

function totalClass(score, max) {
  var p = max > 0 ? score/max*100 : 0;
  if (p >= 85) return 'score-exc';
  if (p >= 70) return 'score-vgood';
  if (p >= 55) return 'score-good';
  if (p >= 40) return 'score-pass';
  return 'score-fail';
}

function calcTotal(s, weeks) {
  if (s._totalAbsent) return null;
  var aSum=0,aC=0,hSum=0,hC=0,beh=0,ex=0;
  weeks.forEach(function(w){
    var av=s['a'+w]; var hv=s['h'+w];
    if (av!==null&&av!==undefined&&av!=='') {
      var n = av==='غ'?0:(av==='م'?null:Number(av));
      if (n!==null){aSum+=n;aC++;}
    }
    if (hv!==null&&hv!==undefined&&hv!=='') {
      var m = hv==='غ'?0:(hv==='م'?null:Number(hv));
      if (m!==null){hSum+=m;hC++;}
    }
  });
  // behavior & exams (always from full data)
  var b1=s.beh1; var b2=s.beh2; var e1=s.ex1; var e2=s.ex2;
  var bv1=(!b1||b1==='')?0:(b1==='غ'?0:Number(b1)||0);
  var bv2=(!b2||b2==='')?0:(b2==='غ'?0:Number(b2)||0);
  var ev1=(!e1||e1==='')?0:(e1==='غ'?0:Number(e1)||0);
  var ev2=(!e2||e2==='')?0:(e2==='غ'?0:Number(e2)||0);
  beh = Math.min(bv1+bv2, 10);
  ex  = Math.min(ev1*2, 30);
  var avgA = aC ? Math.round(aSum/aC) : 0;
  var avgH = hC ? Math.round(hSum/hC) : 0;
  return avgA + avgH + beh + ex;
}

// ── Get active weeks list ────────────────────────────────────
function getWeeks() {
  var half = document.getElementById('halfSel') ? document.getElementById('halfSel').value : 'both';
  var aw = DB ? Math.min(Math.max(1, Number((DB.meta||{}).activeWeeks)||14), 14) : 14;
  var all = ALL_WEEKS.slice(0, aw);
  if (half === 'first') return all.filter(function(w){ return w <= 8; });
  if (half === 'second') return all.filter(function(w){ return w >= 9; });
  return all;
}

// ── Build one half-table (shared logic for print page) ────────
function buildHalfTable(cls, halfNum) {
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var meta = DB.meta || {};
  var school  = meta.schoolName  || 'Dalty Grades';
  var subject = meta.subject     || 'مادة العلوم';
  var grade   = meta.grade       || 'الصف الثاني الإعدادي';
  var year    = meta.year        || '2025 - 2026';
  var teacher = meta.teacherName || 'ا/ إيهاب مازي عبده';

  var _aw = Math.min(Math.max(1, Number(meta.activeWeeks)||14), ALL_WEEKS.length);
  var allW = ALL_WEEKS.slice(0, Math.min(_aw, 12));
  var wks  = halfNum===1 ? allW.slice(0,6) : allW.slice(6);
  if (!wks.length) return '';

  var isSummary = (halfNum === 2);
  var halfLabel = halfNum===1 ? 'الأسابيع 1–6' : 'الأسابيع 7–12 + التجميعات';

  var html = '<div class="print-page">';

  // ── Page header ──
  html += '<div class="page-hdr">';
  html += '<div class="page-hdr-right">';
  html += '<div class="school-name">'+esc(school)+'</div>';
  var _sl=(Number(DB.meta.semester)===2?'الفصل الدراسي الثاني':'الفصل الدراسي الأول');var _yl=(DB.meta.schoolYear||'2025 / 2026');  html += '<div class="sub-title">'+esc(grade)+' — '+_sl+' '+esc(_yl)+'</div>';
  html += '</div>';
  html += '<div class="page-hdr-center">';
  html += '<div class="sheet-title">كشف تفريغ درجات '+esc(subject)+'</div>';
  html += '<div class="sub-title">فصل: <strong>'+esc(cls)+'</strong> &nbsp;|&nbsp; '+halfLabel+'</div>';
  html += '</div>';
  html += '<div class="page-hdr-left">';
  html += '<div class="teacher-sig">توقيع معلم المادة</div>';
  html += '<div class="teacher-sig" style="font-weight:700;margin-top:4px;">'+esc(teacher)+'</div>';
  html += '</div>';
  html += '</div>';

  // ── Table ──
  html += '<div class="tbl-wrap"><table class="grade-tbl">';

  // colgroup for precise widths
  html += '<colgroup>';
  html += '<col class="col-idx"/>';   // م
  html += '<col class="col-name"/>'; // اسم الطالب
  wks.forEach(function(){
    html += '<col class="col-wk"/>'; // تقييم
    html += '<col class="col-wk"/>'; // واجب
  });
  if (!isSummary) {
    // م.تقييم / م.واجب / السلوك / تعديل الاختبار / المجموع
    html += '<col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-tot"/>';
  } else {
    // سلوك2 / اختبار2 / م.تقييم / م.واجب / السلوك / الاختبار×2 / المجموع
    html += '<col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-sum"/><col class="col-tot"/>';
  }
  html += '</colgroup>';

  html += '<thead>';

  // Row 1
  html += '<tr>';
  html += '<th rowspan="3" class="th-name" style="width:26px;">م</th>';
  html += '<th rowspan="3" class="th-name">اسم الطالب</th>';
  wks.forEach(function(w){
    html += '<th colspan="2" class="wk-grp-label">أسبوع '+w+'<br><span style="font-size:7.5px;opacity:.7;">'+WEEK_DATES[w]+'</span></th>';
  });
  if (!isSummary) {
    // Half 1: م.تقييم / م.واجب / السلوك / تعديل الاختبار / المجموع
    html += '<th rowspan="3" style="background:#112a6e;">م التقييمات<br><span style="font-size:7.5px;opacity:.75;">/20</span></th>';
    html += '<th rowspan="3" style="background:#112a6e;">م الواجبات<br><span style="font-size:7.5px;opacity:.75;">/10</span></th>';
    html += '<th rowspan="3" style="background:#0d3a5c;">السلوك<br><span style="font-size:7.5px;opacity:.75;">/10</span></th>';
    html += '<th rowspan="3" style="background:#1a5c1a;">تعديل الاختبار<br><span style="font-size:7.5px;opacity:.75;">/30</span></th>';
    html += '<th rowspan="3" style="background:#0a2a4e;font-size:11px;">المجموع<br><span style="font-size:7.5px;opacity:.75;">/70</span></th>';
  } else {
    // Half 2: سلوك2 / اختبار2 + م.تقييم / م.واجب / السلوك / الاختبار×2 / المجموع
    html += '<th colspan="1" style="background:#0c3060;">السلوك</th>';
    html += '<th colspan="1" style="background:#0c3060;">الاختبارات</th>';
    html += '<th rowspan="3" style="background:#112a6e;">م.تقييم<br><span style="font-size:7.5px;opacity:.75;">/20</span></th>';
    html += '<th rowspan="3" style="background:#112a6e;">م.واجب<br><span style="font-size:7.5px;opacity:.75;">/10</span></th>';
    html += '<th rowspan="3" style="background:#0d3a5c;">السلوك<br><span style="font-size:7.5px;opacity:.75;">/10</span></th>';
    html += '<th rowspan="3" style="background:#1a5c1a;">الاختبار×2<br><span style="font-size:7.5px;opacity:.75;">/30</span></th>';
    html += '<th rowspan="3" style="background:#0a2a4e;font-size:11px;">المجموع<br><span style="font-size:7.5px;opacity:.75;">/70</span></th>';
  }
  html += '</tr>';

  // Row 2
  html += '<tr>';
  wks.forEach(function(){
    html += '<th style="background:#183060;font-size:8px;">تقييم<br>/20</th>';
    html += '<th style="background:#183060;font-size:8px;">واجب<br>/10</th>';
  });
  if (isSummary) {
    html += '<th style="background:#071a3e;font-size:8px;color:#bfdbfe;">سلوك2<br>/5</th>';
    html += '<th style="background:#071a3e;font-size:8px;color:#bfdbfe;">اختبار2<br>/15</th>';
  }
  html += '</tr>';

  // Row 3 (max scores)
  html += '<tr style="background:#153580;">';
  wks.forEach(function(){
    html += '<th style="background:#153580;font-size:8px;color:#bfdbfe;">20</th>';
    html += '<th style="background:#1a3d90;font-size:8px;color:#bfdbfe;">10</th>';
  });
  if (isSummary) {
    html += '<th style="background:#071a3e;font-size:8px;color:#bfdbfe;">5</th>';
    html += '<th style="background:#071a3e;font-size:8px;color:#bfdbfe;">15</th>';
  }
  html += '</tr>';
  html += '</thead><tbody>';

  var sumT=0, cT=0;

  students.forEach(function(s, idx){
    var isAbsent = s._totalAbsent;

    // Calc averages over ALL active weeks
    var allActiveW = allW;
    var aSum=0,aC=0,hSum=0,hC=0;
    allActiveW.forEach(function(w){
      var av=s['a'+w], hv=s['h'+w];
      if(av!==''&&av!==undefined&&av!==null&&av!=='م'){var n=av==='غ'?0:Math.min(Number(av)||0,20);aSum+=n;aC++;}
      if(hv!==''&&hv!==undefined&&hv!==null&&hv!=='م'){var m=hv==='غ'?0:Math.min(Number(hv)||0,10);hSum+=m;hC++;}
    });
    function nv(v,mx){if(v===''||v===undefined||v===null||v==='م')return 0;if(v==='غ')return 0;return Math.min(Number(v)||0,mx);}
    var avgA = aC ? Math.round(aSum/aC) : 0;
    var avgH = hC ? Math.round(hSum/hC) : 0;
    var beh  = Math.min(nv(s.beh1,5)+nv(s.beh2,5), 10);
    var ex   = Math.min(nv(s.ex1,15)*2, 30);
    var total = isAbsent ? null : (avgA + avgH + beh + ex);
    var pct   = total!==null ? total/70*100 : 0;
    var sc    = pct>=85?'score-exc':pct>=70?'score-vgood':pct>=55?'score-good':pct>=40?'score-pass':'score-fail';
    if (total!==null){ sumT+=total; cT++; }

    var evenRow = idx%2===0;
    html += '<tr style="'+(evenRow?'':'background:#f8fafc;')+'">';
    html += '<td class="td-idx">'+(idx+1)+'</td>';
    html += '<td class="td-name">'+esc(s.name)+'</td>';

    // Week cells (read-only for print)
    wks.forEach(function(w){
      var av=s['a'+w]; var hv=s['h'+w];
      var aD=(av===null||av===undefined||av==='')?'—':(av==='غ'?'<span class="td-absent">غ</span>':av==='م'?'<span style="color:#2563eb;">م</span>':av);
      var hD=(hv===null||hv===undefined||hv==='')?'—':(hv==='غ'?'<span class="td-absent">غ</span>':hv==='م'?'<span style="color:#2563eb;">م</span>':hv);
      html += '<td class="td-num">'+aD+'</td>';
      html += '<td class="td-num" style="background:'+(evenRow?'#f3f6fc':'white')+';">'+hD+'</td>';
    });

    if (!isSummary) {
      // Half 1 summary cols
      if (isAbsent) {
        html += '<td class="td-absent">غ</td><td class="td-absent">غ</td>';
        html += '<td class="td-absent">غ</td><td class="td-absent">غ</td>';
        html += '<td class="td-total td-absent">غ</td>';
      } else {
        html += '<td class="td-num" style="background:#dbeafe;font-weight:700;">'+avgA+'</td>';
        html += '<td class="td-num" style="background:#dbeafe;font-weight:700;">'+avgH+'</td>';
        html += '<td class="td-num" style="background:#e0f2fe;font-weight:700;">'+beh+'</td>';
        html += '<td class="td-num" style="background:#d1fae5;font-weight:700;">'+ex+'</td>';
        html += '<td class="td-total '+sc+'">'+total+'</td>';
      }
    } else {
      // Half 2 summary cols
      if (isAbsent) {
        html += '<td class="td-absent">غ</td><td class="td-absent">غ</td>';
        html += '<td>—</td><td>—</td><td>—</td><td>—</td>';
        html += '<td class="td-total td-absent">غ</td>';
      } else {
        var b2v = s.beh2===''?'—':(s.beh2===undefined?'—':s.beh2);
        var e2v = s.ex2===''?'—':(s.ex2===undefined?'—':s.ex2);
        html += '<td class="td-num">'+b2v+'</td>';
        html += '<td class="td-num">'+e2v+'</td>';
        html += '<td class="td-num" style="background:#dbeafe;font-weight:700;">'+avgA+'</td>';
        html += '<td class="td-num" style="background:#dbeafe;font-weight:700;">'+avgH+'</td>';
        html += '<td class="td-num" style="background:#e0f2fe;font-weight:700;">'+beh+'</td>';
        html += '<td class="td-num" style="background:#d1fae5;font-weight:700;">'+ex+'</td>';
        html += '<td class="td-total '+sc+'">'+total+'</td>';
      }
    }

    html += '</tr>';
  });

  html += '</tbody>';

  // TFOOT
  var colSpan = 2 + wks.length*2;
  var avgTotal = cT ? Math.round(sumT/cT) : 0;
  var passC = students.filter(function(s){
    if(s._totalAbsent)return false;
    var allW2=allW;
    var aS=0,aC2=0,hS=0,hC2=0;
    allW2.forEach(function(w){
      var av=s['a'+w],hv=s['h'+w];
      if(av!==''&&av!==undefined&&av!==null&&av!=='م'){aS+=av==='غ'?0:Math.min(Number(av)||0,20);aC2++;}
      if(hv!==''&&hv!==undefined&&hv!==null&&hv!=='م'){hS+=hv==='غ'?0:Math.min(Number(hv)||0,10);hC2++;}
    });
    function nv2(v,mx){if(v===''||v===undefined||v===null||v==='م')return 0;if(v==='غ')return 0;return Math.min(Number(v)||0,mx);}
    var a2=aC2?Math.round(aS/aC2):0, h2=hC2?Math.round(hS/hC2):0;
    var b=Math.min(nv2(s.beh1,5)+nv2(s.beh2,5),10), e=Math.min(nv2(s.ex1,15)*2,30);
    return (a2+h2+b+e)>=42;
  }).length;
  html += '<tfoot><tr>';
  html += '<td colspan="'+colSpan+'" class="td-name">المتوسط العام للفصل</td>';
  var extraDash = isSummary ? '<td>—</td><td>—</td>' : '';
  html += extraDash;
  html += '<td>—</td><td>—</td><td>—</td><td>—</td>';
  html += '<td style="font-size:11px;background:#0a2a4e;color:white;font-weight:700;">'+avgTotal+' / 70<br><span style="font-size:7px;opacity:.75;">ناجح: '+passC+'/'+students.length+'</span></td>';
  html += '</tr></tfoot>';
  html += '</table></div>';

  // Footer
  html += '<div class="page-ftr">';
  html += '<div class="legend">';
  html += '<span style="font-weight:700;font-size:9.5px;color:#374151;">مفتاح التقدير:</span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#059669;"></span><span style="font-size:9px;">ممتاز ≥85%</span></span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#1d4ed8;"></span><span style="font-size:9px;">جيد جداً ≥70%</span></span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#d97706;"></span><span style="font-size:9px;">جيد ≥55%</span></span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#ea580c;"></span><span style="font-size:9px;">مقبول ≥40%</span></span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#dc2626;"></span><span style="font-size:9px;">راسب &lt;40%</span></span>';
  html += '<span style="font-size:9px;color:#6b7280;margin-right:8px;"><span style="color:#dc2626;font-weight:700;">غ</span>=غائب &nbsp;<span style="color:#2563eb;">م</span>=معذور</span>';
  html += '</div>';
  html += '<div style="display:flex;gap:40px;align-items:flex-end;">';
  html += '<div style="text-align:center;"><div class="sig-box">مدير المدرسة</div></div>';
  html += '<div style="text-align:center;"><div class="sig-box">'+esc(teacher)+'</div></div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // .print-page
  return html;
}

// ── Build table for one class = two half-pages ───────────────
function buildTable(cls) {
  return buildHalfTable(cls, 1) + buildHalfTable(cls, 2);
}

// ── Render all ────────────────────────────────────────────────
function renderAll() {
  var container = document.getElementById('pagesContainer');
  var infoBox = document.getElementById('infoBox');
  if (!DB) { infoBox.style.display='block'; container.innerHTML=''; return; }
  infoBox.style.display='none';

  var selCls = document.getElementById('clsSel').value;
  var clsList = selCls ? [selCls] : DB.classes;

  var html = '';
  clsList.forEach(function(cls){
    html += buildTable(cls);
  });
  container.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────
window._guReady = function(){
  DB = loadDB();
  var sel = document.getElementById('clsSel');
  if (DB && DB.classes) {
    DB.classes.forEach(function(c){
      var opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
    document.getElementById('infoBox').style.display = 'none';
    renderAll();
  } else {
    // Show demo with PDF data
    showDemoData();
  }
};

// ── Demo Data (from PDF) ──────────────────────────────────────
function showDemoData() {
  // Class 4/2 sample data from PDF
  DB = {
    meta: {
      schoolName: 'Dalty Grades',
      subject: 'مادة العلوم',
      grade: 'الصف الثاني الإعدادي',
      year: '2025 - 2026',
      teacherName: 'ا/ إيهاب مازي عبده',
      activeWeeks: 14
    },
    classes: ['2/4', '2/5', '2/6', '2/7'],
    data: {
      '2/4': [
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
        {id:48,name:'محمد احمد محمد توكل علي البغدادي',a9:20,h9:10,a10:20,h10:10,a11:20,h11:10,a12:19,h12:10,a13:16,h13:10,beh1:9,beh2:6,ex1:15,ex2:14},
      ],
      '2/5': [], '2/6': [], '2/7': []
    }
  };

  // Populate class selector
  var sel = document.getElementById('clsSel');
  while(sel.options.length > 1) sel.remove(1);
  DB.classes.forEach(function(c){
    var opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });

  // Set default to class 2/4 which has data
  sel.value = '2/4';

  document.getElementById('infoBox').style.display = 'none';
  renderAll();
}



// ══════════════════════════════


(function(){
  var cur = 0;
  var repLoaded = false;
  var guLoaded  = false;

  // ── App-Nav sidebar helpers for repPage & guPage ──
  function toggleRepNav(){
    var bar=document.getElementById('repNavBar');
    var ov=document.getElementById('repNavOverlay');
    if(!bar)return;
    var open=bar.classList.contains('open');
    bar.classList.toggle('open',!open);
    if(ov)ov.classList.toggle('active',!open);
  }
  function closeRepNav(){
    var bar=document.getElementById('repNavBar');
    var ov=document.getElementById('repNavOverlay');
    if(bar)bar.classList.remove('open');
    if(ov)ov.classList.remove('active');
  }
  function toggleGuNav(){
    var bar=document.getElementById('guNavBar');
    var ov=document.getElementById('guNavOverlay');
    if(!bar)return;
    var open=bar.classList.contains('open');
    bar.classList.toggle('open',!open);
    if(ov)ov.classList.toggle('active',!open);
  }
  function closeGuNav(){
    var bar=document.getElementById('guNavBar');
    var ov=document.getElementById('guNavOverlay');
    if(bar)bar.classList.remove('open');
    if(ov)ov.classList.remove('active');
  }
  window.toggleRepNav=toggleRepNav; window.closeRepNav=closeRepNav;
  window.toggleGuNav=toggleGuNav;   window.closeGuNav=closeGuNav;

  function portalShow(idx){
    if(idx === cur) return;
    // hide current
    if(cur===0){
      document.getElementById('appShell').style.display='none';
    } else if(cur===1){
      var rc=document.getElementById('repContainer');if(rc)rc.classList.remove('active');
    } else if(cur===2){
      var gc=document.getElementById('guContainer');if(gc)gc.classList.remove('active');
    }
    var ptOld=document.getElementById('ptab'+cur);if(ptOld)ptOld.classList.remove('active');
    cur = idx;
    var ptNew=document.getElementById('ptab'+cur);if(ptNew)ptNew.classList.add('active');

    // Show/hide portalNav: hidden on main app (idx=0), visible on pages 1 & 2
    var pnav = document.getElementById('portalNav');
    if(pnav) pnav.style.display = (cur === 0) ? 'none' : 'flex';

    if(cur===0){
      document.getElementById('appShell').style.display='flex';
    } else if(cur===1){
      var rc2=document.getElementById('repContainer');if(rc2)rc2.classList.add('active');
      if(!repLoaded){ repLoaded=true; if(window.repInit) repInit(); }
    } else if(cur===2){
      var gc2=document.getElementById('guContainer');if(gc2)gc2.classList.add('active');
      if(!guLoaded){ guLoaded=true; if(window._guReady) window._guReady(); }
    }
  }

  // expose globally
  window.portalShow = portalShow;

  // Also inject nav buttons into g99 sidebar
  window.addEventListener('load', function(){
    // Wait for sidebar to be rendered then inject portal nav links
    setTimeout(function(){
      var sbnav = document.querySelector('#appSidebar .sidebar-nav');
      if(!sbnav) return;
      
      var sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:#1e3a5f;margin:8px 12px;';
      sbnav.appendChild(sep);

      var lbl = document.createElement('div');
      lbl.style.cssText = 'padding:6px 16px 2px;font-size:9px;font-weight:700;color:#334155;letter-spacing:.5px;';
      lbl.textContent = 'الأقسام الأخرى';
      sbnav.appendChild(lbl);

      [
        {icon:'📊', label:'التقارير',        idx:1},
      ].forEach(function(item){
        var btn = document.createElement('button');
        btn.className = 'sb-btn';
        btn.innerHTML = '<span class="sb-icon">'+item.icon+'</span><span class="sb-label">'+item.label+'</span>';
        btn.onclick = function(){ portalShow(item.idx); closeSidebarMobile && closeSidebarMobile(); };
        sbnav.appendChild(btn);
      });
    }, 800);
  });

})();

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// REPORTS PAGE — تقارير المتابعة
// ══════════════════════════════════════════════════════
var _REP = { cls: null, view: 'summary' };

function repNavToggle() {
  var bar = document.getElementById('repNavBar');
  var ov  = document.getElementById('repNavOverlay');
  if (!bar) return;
  var open = bar.classList.toggle('open');
  if (ov) ov.classList.toggle('active', open);
}
function repNavClose() {
  var bar = document.getElementById('repNavBar');
  var ov  = document.getElementById('repNavOverlay');
  if (bar) bar.classList.remove('open');
  if (ov)  ov.classList.remove('active');
}

function repInit() {
  if (!DB) { setTimeout(repInit, 300); return; }
  if (!_REP.cls && DB.classes.length) _REP.cls = DB.classes[0];
  _repBuildNav();
  _repRender();
}

function _repBuildNav() {
  var nl = document.getElementById('repNavList');
  if (!nl) return;
  var html = '';
  html += '<div class="app-nav-section-lbl">🏫 الفصول</div>';
  DB.classes.forEach(function(c) {
    html += '<button class="app-nav-btn' + (c === _REP.cls ? ' anb-active' : '') + '" onclick="_REP.cls=\'' + esc(c) + '\';_repRender();repNavClose();">';
    html += '<span>📚</span>' + esc(c);
    html += '</button>';
  });
  html += '<div class="app-nav-sep"></div>';
  html += '<div class="app-nav-section-lbl">العرض</div>';
  [
    { v: 'summary', lbl: '📋 ملخص الفصل' },
    { v: 'students', lbl: '👤 تفصيل الطلاب' },
    { v: 'absence', lbl: '📊 الغياب' },
  ].forEach(function(item) {
    html += '<button class="app-nav-btn' + (_REP.view === item.v ? ' anb-active' : '') + '" onclick="_REP.view=\'' + item.v + '\';_repRender();repNavClose();">' + item.lbl + '</button>';
  });
  nl.innerHTML = html;
}

function _repRender() {
  _repBuildNav();
  var body = document.getElementById('repBody');
  if (!body) return;
  var cls = _REP.cls;
  if (!cls) { body.innerHTML = '<div style="color:#64748b;padding:20px;text-align:center;">اختر فصلاً من القائمة</div>'; return; }

  var students = (DB.data[cls] || []).filter(function(s) { return s.name; });
  var subject = (DB.meta || {}).subject || 'العلوم';

  // Header actions
  var acts = document.getElementById('repTopActions');
  if (acts) acts.innerHTML = '<span style="font-size:11px;color:#60a5fa;font-weight:700;">' + esc(cls) + ' — ' + esc(subject) + '</span>';

  if (_REP.view === 'summary') {
    _repSummary(body, cls, students);
  } else if (_REP.view === 'students') {
    _repStudents(body, cls, students);
  } else {
    _repAbsence(body, cls, students);
  }
}

function _repSummary(body, cls, students) {
  var _aw = Math.min(Math.max(1, Number((DB.meta||{}).activeWeeks)||14), ALL_WEEKS.length);
  var allW = ALL_WEEKS.slice(0, Math.min(_aw, 12));
  var totals = students.map(function(s) {
    if (s._totalAbsent) return null;
    var aS=0,aC=0,hS=0,hC=0;
    allW.forEach(function(w){
      var av=s['a'+w],hv=s['h'+w];
      if(av!==''&&av!==undefined&&av!==null&&av!=='م'){aS+=(av==='غ'?0:Math.min(Number(av)||0,20));aC++;}
      if(hv!==''&&hv!==undefined&&hv!==null&&hv!=='م'){hS+=(hv==='غ'?0:Math.min(Number(hv)||0,10));hC++;}
    });
    function nv(v,mx){if(v===''||v===undefined||v===null||v==='م')return 0;if(v==='غ')return 0;return Math.min(Number(v)||0,mx);}
    var beh=Math.min(nv(s.beh1,5)+nv(s.beh2,5),10);
    var ex=Math.min(nv(s.ex1,15)*2,30);
    var avgA=aC?Math.round(aS/aC):0, avgH=hC?Math.round(hS/hC):0;
    return avgA+avgH+beh+ex;
  });
  var filtered = totals.filter(function(t){return t!==null;});
  var avg = filtered.length ? Math.round(filtered.reduce(function(a,b){return a+b;},0)/filtered.length) : 0;
  var pass = filtered.filter(function(t){return t>=35;}).length;
  var exc  = filtered.filter(function(t){return t>=59.5;}).length;
  var fail = filtered.filter(function(t){return t<35;}).length;

  var CARD = function(icon,label,val,color){
    return '<div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;">'
      +'<div style="font-size:22px;">'+icon+'</div>'
      +'<div style="font-size:11px;color:#64748b;margin-top:4px;">'+label+'</div>'
      +'<div style="font-size:20px;font-weight:900;color:'+color+';margin-top:4px;">'+val+'</div>'
      +'</div>';
  };

  var html = '<h2 style="font-size:14px;font-weight:900;color:#60a5fa;margin-bottom:12px;">📋 ملخص الفصل — ' + esc(cls) + '</h2>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px;">';
  html += CARD('👥','إجمالي الطلاب',students.length,'#f1f5f9');
  html += CARD('📈','المتوسط العام',avg+'/70',avg>=35?'#10b981':'#ef4444');
  html += CARD('✅','ناجح',pass,'#10b981');
  html += CARD('🌟','ممتاز',exc,'#fbbf24');
  html += CARD('❌','راسب',fail,'#ef4444');
  html += CARD('🚫','غائب كلي',students.filter(function(s){return s._totalAbsent;}).length,'#94a3b8');
  html += '</div>';

  // Distribution bar
  var distHtml='<div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:14px;">';
  distHtml+='<div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;">توزيع الدرجات</div>';
  var ranges=[
    {lbl:'ممتاز ≥85%',min:60,color:'#059669',bg:'#d1fae5'},
    {lbl:'جيد جداً ≥70%',min:49,color:'#1d4ed8',bg:'#dbeafe'},
    {lbl:'جيد ≥55%',min:38.5,color:'#d97706',bg:'#fef3c7'},
    {lbl:'مقبول ≥40%',min:28,color:'#ea580c',bg:'#ffedd5'},
    {lbl:'راسب <40%',min:0,color:'#dc2626',bg:'#fee2e2'},
  ];
  ranges.forEach(function(r,i){
    var next=i>0?ranges[i-1].min:999;
    var count=filtered.filter(function(t){return t>=r.min&&t<next;}).length;
    var pct=filtered.length?Math.round(count/filtered.length*100):0;
    distHtml+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">';
    distHtml+='<span style="width:90px;font-size:9px;color:'+r.color+';">'+r.lbl+'</span>';
    distHtml+='<div style="flex:1;background:#0f172a;border-radius:4px;height:14px;">';
    distHtml+='<div style="width:'+pct+'%;background:'+r.color+';height:100%;border-radius:4px;transition:width .3s;"></div></div>';
    distHtml+='<span style="font-size:9px;color:#94a3b8;width:36px;">'+count+' ('+pct+'%)</span>';
    distHtml+='</div>';
  });
  distHtml+='</div>';
  html+=distHtml;
  body.innerHTML=html;
}

function _repStudents(body, cls, students) {
  var _aw=Math.min(Math.max(1,Number((DB.meta||{}).activeWeeks)||14),ALL_WEEKS.length);
  var allW=ALL_WEEKS.slice(0,Math.min(_aw,12));
  function nv(v,mx){if(v===''||v===undefined||v===null||v==='م')return 0;if(v==='غ')return 0;return Math.min(Number(v)||0,mx);}

  var html='<h2 style="font-size:14px;font-weight:900;color:#60a5fa;margin-bottom:12px;">👤 تفصيل الطلاب — '+esc(cls)+'</h2>';
  html+='<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;font-size:10px;">';
  html+='<thead><tr style="background:#0f2a5e;color:white;">';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">م</th>';
  html+='<th style="padding:7px 8px;border:1px solid #2d4a8e;text-align:right;">الاسم</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">م.تقييم</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">م.واجب</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">السلوك</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">الاختبار</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">المجموع/70</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">الغياب</th>';
  html+='</tr></thead><tbody>';

  students.forEach(function(s,i){
    var isAbs=s._totalAbsent;
    var aS=0,aC=0,hS=0,hC=0;
    allW.forEach(function(w){
      var av=s['a'+w],hv=s['h'+w];
      if(av!==''&&av!==undefined&&av!==null&&av!=='م'){aS+=(av==='غ'?0:Math.min(Number(av)||0,20));aC++;}
      if(hv!==''&&hv!==undefined&&hv!==null&&hv!=='م'){hS+=(hv==='غ'?0:Math.min(Number(hv)||0,10));hC++;}
    });
    var beh=Math.min(nv(s.beh1,5)+nv(s.beh2,5),10);
    var ex=Math.min(nv(s.ex1,15)*2,30);
    var avgA=aC?Math.round(aS/aC):0, avgH=hC?Math.round(hS/hC):0;
    var total=isAbs?'غ':(avgA+avgH+beh+ex);
    var pct=isAbs?0:total/70*100;
    var sc=pct>=85?'#059669':pct>=70?'#1d4ed8':pct>=55?'#d97706':pct>=40?'#ea580c':'#dc2626';
    var absCnt=countStudentAbsencePeriods(cls,s.id);
    var even=i%2===0;
    html+='<tr style="background:'+(even?'#1e293b':'#162032')+'">';
    html+='<td style="padding:5px 4px;border:1px solid #334155;color:#64748b;text-align:center;">'+(i+1)+'</td>';
    html+='<td style="padding:5px 8px;border:1px solid #334155;font-weight:600;color:#e2e8f0;">'+esc(s.name)+'</td>';
    if(isAbs){
      html+='<td colspan="5" style="padding:5px;border:1px solid #334155;color:#ef4444;text-align:center;font-weight:700;">غائب كلي</td>';
    } else {
      html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;">'+avgA+'</td>';
      html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;">'+avgH+'</td>';
      html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;">'+beh+'</td>';
      html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;">'+ex+'</td>';
      html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;font-weight:900;color:'+sc+';">'+total+'</td>';
    }
    html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;color:'+(absCnt>5?'#ef4444':'#94a3b8')+';">'+absCnt+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  body.innerHTML=html;
}

function _repAbsence(body, cls, students) {
  var html='<h2 style="font-size:14px;font-weight:900;color:#60a5fa;margin-bottom:12px;">📊 تقرير الغياب — '+esc(cls)+'</h2>';
  var sorted=students.slice().sort(function(a,b){
    return countStudentAbsencePeriods(cls,b.id)-countStudentAbsencePeriods(cls,a.id);
  });
  html+='<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;font-size:10px;">';
  html+='<thead><tr style="background:#0f2a5e;color:white;">';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">م</th>';
  html+='<th style="padding:7px 8px;border:1px solid #2d4a8e;text-align:right;">الاسم</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">فترات الغياب</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">فترات المرض</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">الإجمالي</th>';
  html+='<th style="padding:7px 5px;border:1px solid #2d4a8e;">الحالة</th>';
  html+='</tr></thead><tbody>';
  sorted.forEach(function(s,i){
    var abs=countStudentAbsencePeriods(cls,s.id);
    var sick=countStudentSickPeriods(cls,s.id);
    var total=abs+sick;
    var even=i%2===0;
    var status=total>15?'⚠️ تحذير':total>8?'🟡 متابعة':'✅ طبيعي';
    var stColor=total>15?'#ef4444':total>8?'#f59e0b':'#10b981';
    html+='<tr style="background:'+(even?'#1e293b':'#162032')+'">';
    html+='<td style="padding:5px 4px;border:1px solid #334155;color:#64748b;text-align:center;">'+(i+1)+'</td>';
    html+='<td style="padding:5px 8px;border:1px solid #334155;font-weight:600;color:#e2e8f0;">'+esc(s.name)+'</td>';
    html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;color:'+(abs>10?'#ef4444':'#94a3b8')+';">'+abs+'</td>';
    html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;color:'+(sick>5?'#f59e0b':'#94a3b8')+';">'+sick+'</td>';
    html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;font-weight:700;color:'+(total>10?'#ef4444':'#94a3b8')+';">'+total+'</td>';
    html+='<td style="padding:5px 4px;border:1px solid #334155;text-align:center;color:'+stColor+';">'+status+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  body.innerHTML=html;
}

// Expose repInit globally
window.repInit = repInit;

// ══════════════════════════════════════════════════════
// CURRICULUM DISTRIBUTION PAGE
// ══════════════════════════════════════════════════════

var UNIT_COLORS=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'];
var _curricView='table'; // 'table' | 'config'

function getCurricData(){
  if(!DB.curric)DB.curric={units:[],weeks:[],holidays:[],exams:[]};
  if(!Array.isArray(DB.curric.units))DB.curric.units=[];
  if(!Array.isArray(DB.curric.weeks))DB.curric.weeks=[];
  if(!Array.isArray(DB.curric.holidays))DB.curric.holidays=[];
  if(!Array.isArray(DB.curric.exams))DB.curric.exams=[];
  return DB.curric;
}

function curricSave(){
  saveDB();
}

function getCurricWeekCount(){
  return Number(DB.meta.activeWeeks)||14;
}

function getCurricSemesterLabel(){
  return (DB.meta.semester==2)?'الفصل الدراسي الثاني':'الفصل الدراسي الأول';
}

function curricWeekDateRange(weekNum){
  if(!DB.meta.startDate)return '';
  try{
    var d=new Date(DB.meta.startDate);
    d.setDate(d.getDate()+(weekNum-1)*7);
    var dayOfWeek=d.getDay();// 0=Sun
    // align to Saturday (day 6)
    var diff=(6-dayOfWeek+7)%7;
    d.setDate(d.getDate()+diff-(weekNum>1?0:0));
    // just use the computed start
    var start=new Date(d);
    var end=new Date(d); end.setDate(end.getDate()+4);
    return fmtDate(start)+' – '+fmtDate(end);
  }catch(e){return '';}
}

function fmtDate(d){
  return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
}

function curricGetWeekData(w){
  var c=getCurricData();
  if(!c.weeks)c.weeks=[];
  var wd=c.weeks.find(function(x){return x.w===w;});
  if(!wd){wd={w:w,unitId:'',lessons:'',notes:''};c.weeks.push(wd);}
  return wd;
}

function curricGetExam(w){
  var c=getCurricData();
  return c.exams.find(function(x){return x.w===w;})||null;
}

function curricGetHoliday(w){
  var c=getCurricData();
  return c.holidays.find(function(x){return x.w===w;})||null;
}

function curricGetUnit(id){
  var c=getCurricData();
  return c.units.find(function(u){return u.id===id;})||null;
}

function renderCurric(){
  var root=document.getElementById('curricRoot');
  if(!root)return;
  var c=getCurricData();
  var numWeeks=getCurricWeekCount();

  // Ensure at least some default units if empty
  if(c.units.length===0){
    c.units=[
      {id:'u1',name:'الوحدة الأولى',color:UNIT_COLORS[0]},
      {id:'u2',name:'الوحدة الثانية',color:UNIT_COLORS[1]},
      {id:'u3',name:'الوحدة الثالثة',color:UNIT_COLORS[2]},
    ];
    curricSave();
  }

  // Stats
  var weeksWithLessons=c.weeks.filter(function(w){return w.lessons&&w.lessons.trim();}).length;
  var weeksWithUnit=c.weeks.filter(function(w){return w.unitId;}).length;
  var numExams=c.exams.length;
  var numHolidays=c.holidays.length;

  var html='<div class="curric-page">';
  // Toolbar
  html+='<div class="curric-toolbar">';
  html+='<span class="curric-toolbar-title">📖 توزيع المنهج — '+esc(DB.meta.subject||'المادة')+' — '+esc(getCurricSemesterLabel())+'</span>';
  html+='<button class="btn btn-purple btn-sm" onclick="curricToggleView(\'config\')">⚙️ إعداد الوحدات</button>';
  html+='<button class="btn btn-teal btn-sm" onclick="curricToggleView(\'table\')">📋 جدول التوزيع</button>';
  html+='<button class="btn btn-ghost btn-sm" onclick="curricPrint()">🖨️ طباعة</button>';
  html+='</div>';

  html+='<div class="curric-body" id="curricBodyInner">';

  // Summary
  html+='<div class="curric-summary">';
  html+=curricStatCard('📅',numWeeks,'عدد الأسابيع','#60a5fa');
  html+=curricStatCard('📚',c.units.length,'الوحدات','#a78bfa');
  html+=curricStatCard('📝',weeksWithLessons,'أسابيع بدروس','#34d399');
  html+=curricStatCard('📋',numExams,'اختبارات','#c4b5fd');
  html+=curricStatCard('🏖️',numHolidays,'إجازات','#fbbf24');
  html+='</div>';

  // Config view
  html+='<div id="curricConfigPanel" style="display:'+(( _curricView==='config')?'block':'none')+';">';
  html+=curricBuildConfigPanel(c);
  html+='</div>';

  // Table view
  html+='<div id="curricTablePanel" style="display:'+((_curricView==='table')?'block':'none')+';">';
  html+=curricBuildTable(c,numWeeks);
  html+='</div>';

  html+='</div></div>';
  root.innerHTML=html;
}

function curricStatCard(icon,val,lbl,color){
  return '<div class="curric-stat"><div class="curric-stat-v" style="color:'+color+';">'+icon+' '+val+'</div><div class="curric-stat-l">'+lbl+'</div></div>';
}

function curricBuildConfigPanel(c){
  var html='<div class="curric-config">';
  html+='<div class="curric-section-hdr">⚙️ إعدادات التوزيع</div>';

  // Semester & year from meta (display only, edit in settings)
  html+='<div class="curric-config-row">';
  html+='<span class="curric-config-lbl">الفصل الدراسي:</span>';
  html+='<select class="curric-config-inp" onchange="curricChangeSemester(this.value)">';
  html+='<option value="1"'+(DB.meta.semester==1?' selected':'')+'>الفصل الأول</option>';
  html+='<option value="2"'+(DB.meta.semester==2?' selected':'')+'>الفصل الثاني</option>';
  html+='</select>';
  html+='<span class="curric-config-lbl" style="margin-right:10px;">تاريخ بداية الفصل:</span>';
  html+='<input type="date" class="curric-config-inp" value="'+esc(DB.meta.startDate||'')+'" onchange="curricChangeStartDate(this.value)" color-scheme="dark">';
  html+='<span class="curric-config-lbl" style="margin-right:10px;">عدد أسابيع الفصل:</span>';
  html+='<input type="number" min="1" max="20" class="curric-config-inp" style="width:60px;" value="'+Number(DB.meta.activeWeeks||14)+'" onchange="curricChangeWeeks(this.value)">';
  html+='</div>';

  // Units manager
  html+='<div class="curric-section-hdr" style="margin-top:10px;">📚 الوحدات الدراسية</div>';
  html+='<div class="unit-list" id="unitList">';
  c.units.forEach(function(u){
    html+='<div class="unit-item" id="uitem_'+u.id+'">';
    html+='<div class="unit-item-dot" style="background:'+u.color+';" onclick="curricPickColor(\''+u.id+'\')"></div>';
    html+='<input class="unit-item-name" value="'+esc(u.name)+'" placeholder="اسم الوحدة" onchange="curricRenameUnit(\''+u.id+'\',this.value)">';
    html+='<button class="unit-del-btn" onclick="curricDeleteUnit(\''+u.id+'\')">✕</button>';
    html+='</div>';
  });
  html+='</div>';
  html+='<button class="btn btn-purple btn-sm" onclick="curricAddUnit()" style="margin-top:6px;">+ إضافة وحدة</button>';

  // Holidays & Exams quick manager
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">';
  // Exams
  html+='<div>';
  html+='<div class="curric-section-hdr">📋 مواعيد الاختبارات</div>';
  html+='<div id="examList">';
  c.exams.forEach(function(ex){
    html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;background:#1a0f35;border:1px solid #4c1d95;border-radius:6px;padding:4px 8px;">';
    html+='<span class="exam-badge">📋 أسبوع '+ex.w+'</span>';
    html+='<input class="curric-config-inp" style="flex:1;font-size:10px;" placeholder="نوع الاختبار" value="'+esc(ex.label||'')+'" onchange="curricExamLabel('+ex.w+',this.value)">';
    html+='<button class="unit-del-btn" onclick="curricRemoveExam('+ex.w+')">✕</button>';
    html+='</div>';
  });
  html+='</div>';
  html+='<div style="display:flex;gap:5px;align-items:center;margin-top:5px;">';
  html+='<select class="curric-config-inp" id="newExamWeek" style="width:100px;font-size:10px;">';
  for(var w=1;w<=Number(DB.meta.activeWeeks||14);w++){html+='<option value="'+w+'">الأسبوع '+w+'</option>';}
  html+='</select>';
  html+='<button class="btn btn-purple btn-sm" onclick="curricAddExam()">+ إضافة</button>';
  html+='</div>';
  html+='</div>';
  // Holidays
  html+='<div>';
  html+='<div class="curric-section-hdr">🏖️ الإجازات الرسمية</div>';
  html+='<div id="holidayList">';
  c.holidays.forEach(function(hol){
    html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;background:#1a1505;border:1px solid #854d0e;border-radius:6px;padding:4px 8px;">';
    html+='<span class="holiday-badge">🏖️ أسبوع '+hol.w+'</span>';
    html+='<input class="curric-config-inp" style="flex:1;font-size:10px;" placeholder="اسم الإجازة" value="'+esc(hol.label||'')+'" onchange="curricHolidayLabel('+hol.w+',this.value)">';
    html+='<button class="unit-del-btn" onclick="curricRemoveHoliday('+hol.w+')">✕</button>';
    html+='</div>';
  });
  html+='</div>';
  html+='<div style="display:flex;gap:5px;align-items:center;margin-top:5px;">';
  html+='<select class="curric-config-inp" id="newHolWeek" style="width:100px;font-size:10px;">';
  for(var w2=1;w2<=Number(DB.meta.activeWeeks||14);w2++){html+='<option value="'+w2+'">الأسبوع '+w2+'</option>';}
  html+='</select>';
  html+='<button class="btn btn-warn btn-sm" onclick="curricAddHoliday()">+ إضافة</button>';
  html+='</div>';
  html+='</div>';
  html+='</div>';

  html+='</div>';
  return html;
}

function curricBuildTable(c,numWeeks){
  var html='<div class="curric-grid">';
  html+='<table class="curric-table" id="curricMainTable">';
  html+='<thead><tr>';
  html+='<th class="cth-week">الأسبوع</th>';
  html+='<th class="cth-dates">التواريخ</th>';
  html+='<th class="cth-unit">الوحدة</th>';
  html+='<th class="cth-lessons">الدروس والمحتوى</th>';
  html+='<th class="cth-exam">الاختبار</th>';
  html+='<th class="cth-holiday">الإجازة</th>';
  html+='<th class="cth-notes">ملاحظات</th>';
  html+='</tr></thead><tbody>';

  for(var w=1;w<=numWeeks;w++){
    var wd=curricGetWeekData(w);
    var exam=curricGetExam(w);
    var holiday=curricGetHoliday(w);
    var unit=wd.unitId?curricGetUnit(wd.unitId):null;
    var rowClass=(exam?'row-exam':(holiday?'row-holiday':''));
    var dateRange=curricWeekDateRange(w);

    html+='<tr class="'+rowClass+'" id="crow_'+w+'">';
    // Week num
    html+='<td class="td-week-num">';
    html+='الأسبوع '+w;
    html+='</td>';
    // Dates
    html+='<td class="td-dates">'+esc(dateRange)+'</td>';
    // Unit selector
    html+='<td>';
    html+='<select class="curric-inp" onchange="curricSetUnit('+w+',this.value)" style="min-width:90px;">';
    html+='<option value="">— اختر وحدة —</option>';
    c.units.forEach(function(u){
      html+='<option value="'+u.id+'"'+(wd.unitId===u.id?' selected':'')+'>'+esc(u.name)+'</option>';
    });
    html+='</select>';
    if(unit){html+='<span class="unit-dot" style="background:'+unit.color+';"></span>';}
    html+='</td>';
    // Lessons
    html+='<td>';
    html+='<input class="curric-inp" placeholder="الدروس والمحتوى..." value="'+esc(wd.lessons||'')+'" onchange="curricSetLessons('+w+',this.value)">';
    html+='</td>';
    // Exam
    html+='<td style="text-align:center;">';
    if(exam){html+='<span class="exam-badge" title="'+esc(exam.label||'اختبار')+'">📋 '+esc(exam.label||'اختبار')+'</span>';}
    else{html+='<span style="color:#1e3a5f;font-size:9px;">—</span>';}
    html+='</td>';
    // Holiday
    html+='<td style="text-align:center;">';
    if(holiday){html+='<span class="holiday-badge" title="'+esc(holiday.label||'إجازة')+'">🏖️ '+esc(holiday.label||'إجازة')+'</span>';}
    else{html+='<span style="color:#1e3a5f;font-size:9px;">—</span>';}
    html+='</td>';
    // Notes
    html+='<td>';
    html+='<input class="curric-inp" placeholder="ملاحظات..." value="'+esc(wd.notes||'')+'" onchange="curricSetNotes('+w+',this.value)">';
    html+='</td>';
    html+='</tr>';
  }
  html+='</tbody></table></div>';
  return html;
}

// ── Curric event handlers ──────────────────────────────

function curricToggleView(v){
  _curricView=v;
  var config=document.getElementById('curricConfigPanel');
  var table=document.getElementById('curricTablePanel');
  if(config)config.style.display=(v==='config'?'block':'none');
  if(table)table.style.display=(v==='table'?'block':'none');
  if(v==='table'){
    // rebuild table to reflect any config changes
    var c=getCurricData();
    var numWeeks=getCurricWeekCount();
    if(table)table.innerHTML=curricBuildTable(c,numWeeks);
  }
}

function curricSetUnit(w,unitId){
  var wd=curricGetWeekData(w);
  wd.unitId=unitId;
  curricSave();
  // update dot color inline
  var row=document.getElementById('crow_'+w);
  if(row){
    var dot=row.querySelector('.unit-dot');
    var unit=unitId?curricGetUnit(unitId):null;
    if(dot&&unit)dot.style.background=unit.color;
    else if(dot)dot.style.background='transparent';
  }
}

function curricSetLessons(w,val){
  var wd=curricGetWeekData(w);
  wd.lessons=val;
  curricSave();
}

function curricSetNotes(w,val){
  var wd=curricGetWeekData(w);
  wd.notes=val;
  curricSave();
}

function curricChangeSemester(v){
  DB.meta.semester=Number(v);
  curricSave();
  showSnack('✅ تم تحديث الفصل الدراسي');
}

function curricChangeStartDate(v){
  DB.meta.startDate=v;
  curricSave();
  showSnack('✅ تم تحديث تاريخ البداية');
  // rebuild table dates
  var c=getCurricData(); var numWeeks=getCurricWeekCount();
  var table=document.getElementById('curricTablePanel');
  if(table)table.innerHTML=curricBuildTable(c,numWeeks);
}

function curricChangeWeeks(v){
  var n=Math.max(1,Math.min(20,Number(v)||14));
  DB.meta.activeWeeks=n;
  curricSave();
  renderCurric();
}

function curricAddUnit(){
  var c=getCurricData();
  var id='u'+Date.now();
  var color=UNIT_COLORS[c.units.length%UNIT_COLORS.length];
  c.units.push({id:id,name:'وحدة جديدة',color:color});
  curricSave();
  renderCurric(); curricToggleView('config');
}

function curricRenameUnit(id,name){
  var c=getCurricData();
  var u=c.units.find(function(x){return x.id===id;});
  if(u){u.name=name;curricSave();}
}

function curricDeleteUnit(id){
  var c=getCurricData();
  c.units=c.units.filter(function(u){return u.id!==id;});
  // clear refs in weeks
  c.weeks.forEach(function(w){if(w.unitId===id)w.unitId='';});
  curricSave();
  renderCurric(); curricToggleView('config');
}

function curricPickColor(unitId){
  var c=getCurricData();
  var u=c.units.find(function(x){return x.id===unitId;});
  if(!u)return;
  var idx=UNIT_COLORS.indexOf(u.color);
  u.color=UNIT_COLORS[(idx+1)%UNIT_COLORS.length];
  curricSave();
  var dot=document.querySelector('#uitem_'+unitId+' .unit-item-dot');
  if(dot)dot.style.background=u.color;
}

function curricAddExam(){
  var c=getCurricData();
  var sel=document.getElementById('newExamWeek');
  if(!sel)return;
  var w=Number(sel.value);
  if(!c.exams.find(function(x){return x.w===w;})){
    c.exams.push({w:w,label:'اختبار'});
    c.exams.sort(function(a,b){return a.w-b.w;});
    curricSave();
    renderCurric(); curricToggleView('config');
    showSnack('✅ تم إضافة الاختبار في الأسبوع '+w);
  }else{showSnack('⚠️ يوجد اختبار مسجل لهذا الأسبوع','','warn');}
}

function curricRemoveExam(w){
  var c=getCurricData();
  c.exams=c.exams.filter(function(x){return x.w!==w;});
  curricSave();
  renderCurric(); curricToggleView('config');
}

function curricExamLabel(w,lbl){
  var c=getCurricData();
  var ex=c.exams.find(function(x){return x.w===w;});
  if(ex){ex.label=lbl;curricSave();}
}

function curricAddHoliday(){
  var c=getCurricData();
  var sel=document.getElementById('newHolWeek');
  if(!sel)return;
  var w=Number(sel.value);
  if(!c.holidays.find(function(x){return x.w===w;})){
    c.holidays.push({w:w,label:'إجازة رسمية'});
    c.holidays.sort(function(a,b){return a.w-b.w;});
    curricSave();
    renderCurric(); curricToggleView('config');
    showSnack('✅ تم إضافة الإجازة في الأسبوع '+w);
  }else{showSnack('⚠️ توجد إجازة مسجلة لهذا الأسبوع','','warn');}
}

function curricRemoveHoliday(w){
  var c=getCurricData();
  c.holidays=c.holidays.filter(function(x){return x.w!==w;});
  curricSave();
  renderCurric(); curricToggleView('config');
}

function curricHolidayLabel(w,lbl){
  var c=getCurricData();
  var hol=c.holidays.find(function(x){return x.w===w;});
  if(hol){hol.label=lbl;curricSave();}
}

function curricPrint(){
  var c=getCurricData();
  var numWeeks=getCurricWeekCount();
  var html=curricBuildPrintPage(c,numWeeks);
  // Inject print frame
  var frame=document.getElementById('curricPrintFrame');
  if(!frame){frame=document.createElement('div');frame.id='curricPrintFrame';document.body.appendChild(frame);}
  frame.innerHTML=html;
  frame.style.display='block';
  setTimeout(function(){
    window.print();
    setTimeout(function(){frame.style.display='none';},500);
  },300);
}

function curricBuildPrintPage(c,numWeeks){
  var semester=getCurricSemesterLabel();
  var subject=DB.meta.subject||'المادة';
  var schoolName=DB.meta.schoolName||'Dalty Grades';
  var teacherName=DB.meta.teacherName||'';
  var schoolYear=DB.meta.schoolYear||'2025 / 2026';

  // Count stats
  var weeksWithLessons=c.weeks.filter(function(w){return w.lessons&&w.lessons.trim();}).length;
  var numExams=c.exams.length;
  var numHolidays=c.holidays.length;

  var html='<div class="cp-page">';

  // ── Header ──
  html+='<div class="cp-hdr">';
  html+='<div class="cp-hdr-side"><div class="cp-hdr-logo"><img src="images/logo.jpg" style="width:36px;height:36px;object-fit:contain;border-radius:50%;background:#000;"/></div><div class="cp-year">'+esc(schoolYear)+'</div></div>';
  html+='<div class="cp-hdr-center">';
  html+='<div class="cp-school-name">'+esc(schoolName)+'</div>';
  html+='<div class="cp-sheet-title">توزيع منهج مادة '+esc(subject)+'</div>';
  html+='<div class="cp-meta-line">'+esc(semester)+' — العام الدراسي '+esc(schoolYear)+'</div>';
  if(DB.meta.startDate){
    html+='<div class="cp-meta-line">يبدأ في: '+esc(fmtDate(new Date(DB.meta.startDate)))+' &nbsp;|&nbsp; عدد الأسابيع: '+numWeeks+'</div>';
  }
  html+='</div>';
  html+='<div class="cp-hdr-side"><div class="cp-year">المعلم: '+esc(teacherName)+'</div></div>';
  html+='</div>';

  // ── Summary bar ──
  html+='<div class="cp-summary">';
  html+=cpStat('📅',numWeeks,'أسبوع');
  html+=cpStat('📚',c.units.length,'وحدة');
  html+=cpStat('📖',weeksWithLessons,'أسبوع بدروس');
  html+=cpStat('📋',numExams,'اختبار');
  html+=cpStat('🏖️',numHolidays,'إجازة');
  html+='</div>';

  // ── Legend ──
  html+='<div class="cp-legend">';
  c.units.forEach(function(u){
    html+='<div class="cp-legend-item"><div class="cp-legend-box" style="background:'+u.color+'20;border:1.5px solid '+u.color+';"></div><span>'+esc(u.name)+'</span></div>';
  });
  html+='<div class="cp-legend-item"><div class="cp-legend-box" style="background:#f3f0ff;border:1.5px solid #7c3aed;"></div><span>أسبوع اختبار</span></div>';
  html+='<div class="cp-legend-item"><div class="cp-legend-box" style="background:#fffbeb;border:1.5px solid #d97706;"></div><span>أسبوع إجازة</span></div>';
  html+='</div>';

  // ── Main table ──
  html+='<table class="cp-tbl">';
  html+='<thead><tr>';
  html+='<th class="cpth-week">الأسبوع</th>';
  html+='<th class="cpth-dates">التواريخ</th>';
  html+='<th class="cpth-unit">الوحدة الدراسية</th>';
  html+='<th class="cpth-lessons">الدروس والمحتوى</th>';
  html+='<th class="cpth-exam">الاختبار</th>';
  html+='<th class="cpth-holiday">الإجازة</th>';
  html+='<th class="cpth-notes">ملاحظات</th>';
  html+='</tr></thead><tbody>';

  for(var w=1;w<=numWeeks;w++){
    var wd=curricGetWeekData(w);
    var exam=curricGetExam(w);
    var holiday=curricGetHoliday(w);
    var unit=wd.unitId?curricGetUnit(wd.unitId):null;
    var rowClass=exam?'cp-row-exam':(holiday?'cp-row-holiday':'');
    var dateRange=curricWeekDateRange(w);

    html+='<tr class="'+rowClass+'">';
    // Week
    html+='<td class="cpd-week">الأسبوع '+w+'</td>';
    // Dates
    html+='<td class="cpd-dates">'+esc(dateRange)+'</td>';
    // Unit
    html+='<td class="cpd-unit" style="'+(unit?'border-right:3px solid '+unit.color+';':'')+';">';
    if(unit){
      html+='<span class="cp-unit-dot" style="background:'+unit.color+';"></span>';
      html+=esc(unit.name);
    }
    html+='</td>';
    // Lessons
    html+='<td class="cpd-lessons">'+esc(wd.lessons||'')+'</td>';
    // Exam
    html+='<td class="cpd-exam">';
    if(exam)html+='<span class="cp-exam-badge">📋 '+esc(exam.label||'اختبار')+'</span>';
    html+='</td>';
    // Holiday
    html+='<td class="cpd-holiday">';
    if(holiday)html+='<span class="cp-holiday-badge">🏖️ '+esc(holiday.label||'إجازة')+'</span>';
    html+='</td>';
    // Notes
    html+='<td class="cpd-notes">'+esc(wd.notes||'')+'</td>';
    html+='</tr>';
  }
  html+='</tbody></table>';

  // ── Signatures ──
  html+='<div class="cp-signatures">';
  html+='<div class="cp-sig-cell">';
  html+='<div class="cp-sig-title">المعلم / المعلمة</div>';
  html+='<div class="cp-sig-line"></div>';
  html+='<div class="cp-sig-name">'+esc(teacherName||'................................')+'</div>';
  html+='</div>';
  html+='<div class="cp-sig-cell">';
  html+='<div class="cp-sig-title">المتابع / الموجه</div>';
  html+='<div class="cp-sig-line"></div>';
  html+='<div class="cp-sig-name">................................</div>';
  html+='</div>';
  html+='<div class="cp-sig-cell">';
  html+='<div class="cp-sig-title">مدير / مديرة المدرسة</div>';
  html+='<div class="cp-sig-line"></div>';
  html+='<div class="cp-sig-name">................................</div>';
  html+='</div>';
  html+='</div>';

  html+='</div>'; // cp-page
  return html;
}

function cpStat(icon,val,lbl){
  return '<div class="cp-stat"><div class="cp-stat-v">'+icon+' '+val+'</div><div class="cp-stat-l">'+lbl+'</div></div>';
}




// ══════════════════════════════


