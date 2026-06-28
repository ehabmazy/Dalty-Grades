// SECTION 7: GRADES PAGE
// ══════════════════════════════════════════════════════
var GS={activeClass:"",activePage:"pg_home",search:"",hOpen:true,distRange:{min:0,max:null},dictHL:{},
  modal:null, // {type, data}
  homeColVis:{assess:true,hw:true,beh:true,avgAssess:true,avgHw:true,avgBeh:true,total:true,dist:true}
};

function renderGrades(){
  var root=document.getElementById("gradesRoot");
  if(!root)return;
  if(!GS.activeClass&&DB.classes.length)GS.activeClass=DB.classes[0];
  var cls=GS.activeClass;
  var students=DB.data[cls]||[];
  var search=GS.search.trim();
  var filtered=search?students.filter(function(s,i){return s.name.indexOf(search)>=0||String(i+1)===search;}):students;
  var tmax=totalMax();
  var rmax=GS.distRange.max!==null?GS.distRange.max:tmax;

  // Active page cols
  var activePg=null;
  (DB.colPages||[]).forEach(function(pg){if(pg.id===GS.activePage)activePg=pg;});
  if(!activePg&&GS.activePage!=='pg_home'&&DB.colPages.length){activePg=DB.colPages[0];GS.activePage=activePg.id;}
  var _aw=Math.min(Math.max(1,Number(DB.meta&&DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var _awSet={};ALL_WEEKS.slice(0,_aw).forEach(function(w){_awSet[w]=true;});
  function _colInActiveWeeks(c){
    // أعمدة الاختبارات ليس لها أسبوع — تظهر دائماً
    if(c.id==='ex1'||c.id==='ex2')return true;
    var m=c.id.match(/\d+$/);
    return m?_awSet[Number(m[0])]:true;
  }
  var pageCols=activePg?(activePg.cols||[]).filter(function(c){return c.visible&&_colInActiveWeeks(c);}).sort(function(a,b){return a.order-b.order;}):[];

  var html='<div class="grades-page">';

  // TOP BAR
  html+='<div class="g-topbar">';
  html+='<div class="g-ctrl-row">';
  html+='<input class="g-search" placeholder="🔍 بحث..." value="'+esc(GS.search)+'" oninput="GS.search=this.value;renderGrades()"/>';
  html+='</div>';
  html+='</div>'; // g-topbar

  // MAIN
  html+='<div class="g-main">';
  html+='<div class="g-info-bar">';
  html+='<div class="g-info-left">📌 '+esc(cls)+' — '+esc(DB.meta.subject)+'</div>';
  html+='<div class="g-info-right">';
  html+='<span class="badge badge-blue">'+filtered.length+' طالب</span>';
  html+='<button class="btn btn-sm" style="background:#0e7490;color:white;border:none;" onclick="gradesSortAlpha()">🔤 أبجدي</button>';
  html+='<button class="btn btn-sm" style="background:#7c3aed;color:white;border:none;" onclick="showStudentFormLinks()">📲 روابط التسجيل</button>';
  html+='<button class="btn btn-primary btn-sm" onclick="gradesAddStudent()">+ جديد</button>';
  html+='</div></div>';

  // HOME PAGE: إجمالي الجداول (تقييم + واجب + سلوك) لكل أسبوع
  if(GS.activePage==="pg_home"){
    var assessPg=null,hwPg=null,behPg=null;
    (DB.colPages||[]).forEach(function(pg){
      if(pg.id==="pg_assess")assessPg=pg;
      if(pg.id==="pg_hw")hwPg=pg;
      if(pg.id==="pg_beh")behPg=pg;
    });
    var _curWk=(typeof _calcCurrentWeek==='function')?_calcCurrentWeek():999;
    var _hwActive=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
    var weeks=ALL_WEEKS.slice(0,_hwActive).filter(function(w){if(!assessPg)return true;var col=(assessPg.cols||[]).find(function(c){return c.id==='a'+w;});return col?col.visible:true;});

    // ── اكتمال كل عمود/أسبوع: كل الطلاب عندهم درجة مسجلة (غ/م تُحسب مسجلة) ──
    var _wkComplete={};
    weeks.forEach(function(w){
      var aField='a'+w,hField='h'+w,bField='bw'+w;
      var aOk=students.length>0,hOk=students.length>0,bOk=students.length>0;
      students.forEach(function(s){
        var av=s[aField],hv=s[hField],bv=s[bField];
        if(av===''||av===undefined)aOk=false;
        if(hv===''||hv===undefined)hOk=false;
        if(bv===''||bv===undefined)bOk=false;
      });
      _wkComplete[w]={assess:aOk,hw:hOk,beh:bOk};
    });

    // ── رأس الجدول ──
    var _hv=_getHomeColVis();
    var _showAssess=_hv.assess!==false;
    var _showHw=_hv.hw!==false;
    var _showBeh=_hv.beh!==false;
    var _showAvgAssess=_hv.avgAssess!==false;
    var _showAvgHw=_hv.avgHw!==false;
    var _showAvgBeh=_hv.avgBeh!==false;
    var _showTotal=_hv.total!==false;
    var _showDist=_hv.dist!==false;
    // حساب colspan لكل أسبوع
    var _wkSpan=(_showAssess?1:0)+(_showHw?1:0)+(_showBeh?1:0);
    var _firstShownFld=_showAssess?'assess':(_showHw?'hw':(_showBeh?'beh':null));
    var _lastShownFld=_showBeh?'beh':(_showHw?'hw':(_showAssess?'assess':null));
    var _wkBorderClr='rgba(251,191,36,.55)'; // لون فاصل الأسابيع
    function _wkEdgeStyle(fld){
      var s='';
      if(fld===_firstShownFld)s+='border-right:3px solid '+_wkBorderClr+';';
      if(fld===_lastShownFld)s+='border-left:3px solid '+_wkBorderClr+';';
      return s;
    }
    html+='<div class="tw"><table><thead>';
    if(_wkSpan>0){
      html+='<tr>';
      html+='<th style="min-width:20px">م</th><th style="width:32px;"></th><th class="td-name">الاسم</th>';
      weeks.forEach(function(w){
        if(_wkSpan>0){
          var _wc=_wkComplete[w];
          var _wkDone=(_showAssess?_wc.assess:true)&&(_showHw?_wc.hw:true)&&(_showBeh?_wc.beh:true);
          var _wkBg=_wkDone?'#0d9488':'#0d2350';
          var _wkColor=_wkDone?'#ffffff':'';
          html+='<th colspan="'+_wkSpan+'" style="background:'+_wkBg+';text-align:center;'+(_wkColor?'color:'+_wkColor+';':'')+'border-right:3px solid '+_wkBorderClr+';border-left:3px solid '+_wkBorderClr+';">'+(_wkDone?'✅ ':'')+'أسبوع '+w+'</th>';
        }
      });
      if(_showAvgAssess)html+='<th style="background:#0a1e35;">متوسط<br><small>تقييم</small></th>';
      if(_showAvgHw)html+='<th style="background:#0a1e35;">متوسط<br><small>واجب</small></th>';
      if(_showAvgBeh)html+='<th style="background:#1a0d3a;">متوسط<br><small>سلوك</small></th>';
      html+='<th style="background:#1c1400;">اختبارات<br><small>/30</small></th>';
      if(_showTotal)html+='<th style="background:#0a1e35;">مجموع<br><small>/'+tmax+'</small></th>';
      if(_showTotal)html+='<th title="عدد الدرجات المخصومة من المجموع بسبب الغياب">خصم<br><small style="color:#f97316;">الغياب</small></th>';
      if(_showDist)html+='<th>توزيع</th>';
      html+='<th>تحريك</th><th>حذف</th>';
      html+='</tr>';
    }
    html+='<tr>';
    html+='<th></th><th></th><th></th>';
    weeks.forEach(function(w){
      var _wc=_wkComplete[w];
      if(_showAssess)html+='<th style="background:'+(_wc.assess?'#0d9488':'#102060')+';font-size:8px;'+(_wc.assess?'color:#ffffff;':'')+_wkEdgeStyle('assess')+'">'+(_wc.assess?'✅ ':'')+'تقييم<br>/20</th>';
      if(_showHw)html+='<th style="background:'+(_wc.hw?'#0d9488':'#102060')+';font-size:8px;'+(_wc.hw?'color:#ffffff;':'')+_wkEdgeStyle('hw')+'">'+(_wc.hw?'✅ ':'')+'واجب<br>/10</th>';
      if(_showBeh)html+='<th style="background:'+(_wc.beh?'#0d9488':'#1a0d3a')+';font-size:8px;color:'+(_wc.beh?'#ffffff':'#c4b5fd')+';'+_wkEdgeStyle('beh')+'">'+(_wc.beh?'✅ ':'')+'سلوك<br>/10</th>';
    });
    if(_wkSpan===0){
      if(_showAvgAssess)html+='<th style="background:#0a1e35;">متوسط<br><small>تقييم</small></th>';
      if(_showAvgHw)html+='<th style="background:#0a1e35;">متوسط<br><small>واجب</small></th>';
      if(_showAvgBeh)html+='<th style="background:#1a0d3a;">متوسط<br><small>سلوك</small></th>';
      html+='<th style="background:#1c1400;">اختبارات<br><small>/30</small></th>';
      if(_showTotal)html+='<th style="background:#0a1e35;">مجموع<br><small>/'+tmax+'</small></th>';
      if(_showTotal)html+='<th title="عدد الدرجات المخصومة من المجموع بسبب الغياب">خصم<br><small style="color:#f97316;">الغياب</small></th>';
      if(_showDist)html+='<th>توزيع</th>';
      html+='<th>تحريك</th><th>حذف</th>';
    } else {
      if(_showAvgAssess)html+='<th></th>';
      if(_showAvgHw)html+='<th></th>';
      if(_showAvgBeh)html+='<th></th>';
      html+='<th></th>';
      if(_showTotal)html+='<th></th>';
      if(_showTotal)html+='<th></th>';
      if(_showDist)html+='<th></th>';
      html+='<th></th><th></th>';
    }
    html+='</tr></thead><tbody>';

    // ── صفوف الطلاب ──
    filtered.forEach(function(s){
      var idx=students.indexOf(s);
      var res=calcStudent(s,cls);
      var tot=res.total;
      html+='<tr>';
      html+='<td class="td-rn">'+(idx+1)+'</td>';
      var _gPhoto=s.photo||(DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
      html+='<td style="padding:1px;text-align:center;width:34px;">';
      html+='<div class="pu" style="width:30px;height:30px;border-radius:50%;overflow:hidden;border:1.5px solid #1e3a5f;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:auto;" onclick="document.getElementById(\'hph'+s.id+'\').click()">';
      if(_gPhoto)html+='<img src="'+_gPhoto+'" style="width:100%;height:100%;object-fit:cover;"/>';
      else html+='<span style="font-size:11px;color:#475569;">'+(idx+1)+'</span>';
      html+='</div>';
      html+='<input id="hph'+s.id+'" type="file" accept="image/*" capture="environment" style="display:none" onchange="gradesPhotoChange(event,'+idx+')" />';
      html+='</td>';
      html+='<td class="td-name" style="font-size:10px;padding:3px 5px;">'+esc(s.name)+'</td>';
      var behSum=0,behCnt=0;
      weeks.forEach(function(w){
        var aField='a'+w, hField='h'+w, bField='bw'+w;
        var aMax=20,hMax=10,bMax=10;
        if(assessPg)assessPg.cols.forEach(function(c){if(c.field===aField)aMax=c.max;});
        if(hwPg)hwPg.cols.forEach(function(c){if(c.field===hField)hMax=c.max;});
        if(behPg)behPg.cols.forEach(function(c){if(c.field===bField)bMax=c.max;});
        var av=s[aField],hv=s[hField],bv=s[bField];
        var isAA=(av==="غ"),isAM=(av==="م");
        var isHA=(hv==="غ"),isHM=(hv==="م");
        var isBA=(bv==="غ"),isBM=(bv==="م");
        var _isPastWk=(w<=_curWk);
        // خلية التقييم
        if(_showAssess){
          var _gsCellIdA='gs_'+idx+'_'+aField;
          var _gsSelA=(GS._gsCell&&GS._gsCell.cellId===_gsCellIdA);
          var _aMissing=(_isPastWk&&!isAA&&!isAM&&(av===''||av===undefined));
          html+='<td style="padding:1px;'+(_aMissing&&!_gsSelA?'background:rgba(239,68,68,.22);':'')+_wkEdgeStyle('assess')+'">';
          if(!isAA&&!isAM){
            html+='<div class="gs-tbl-cell'+(_gsSelA?' gs-tbl-sel':'')+'" onclick="_gsSelectCell('+idx+',\''+aField+'\','+aMax+',\''+_gsCellIdA+'\',\'assess_w'+w+'\')">';
            html+='<span class="gv '+(_gsSelA?'gv-sel':(av!==''&&av!==undefined?'gv-assess':(_aMissing?'gv-missing':'gv-empty')))+'">';
            html+=(_gsSelA&&GS._gsInput!==''?GS._gsInput:(av!==''&&av!==undefined?av:'—'))+'</span>';
            html+='</div>';
          } else if(isAA)html+='<span class="gc-lbl-abs" onclick="gradesSetField('+idx+',\''+aField+'\',\'\');renderGrades();">غ</span>';
          else html+='<span class="gc-lbl-exc" onclick="gradesSetField('+idx+',\''+aField+'\',\'\');renderGrades();">م</span>';
          html+='</td>';
        }
        // خلية الواجب
        if(_showHw){
          var _gsCellIdH='gs_'+idx+'_'+hField;
          var _gsSelH=(GS._gsCell&&GS._gsCell.cellId===_gsCellIdH);
          var _hMissing=(_isPastWk&&!isHA&&!isHM&&(hv===''||hv===undefined));
          html+='<td style="padding:1px;'+(_hMissing&&!_gsSelH?'background:rgba(239,68,68,.22);':'')+_wkEdgeStyle('hw')+'">';
          if(!isHA&&!isHM){
            html+='<div class="gs-tbl-cell'+(_gsSelH?' gs-tbl-sel':'')+'" onclick="_gsSelectCell('+idx+',\''+hField+'\','+hMax+',\''+_gsCellIdH+'\',\'hw_w'+w+'\')">';
            html+='<span class="gv '+(_gsSelH?'gv-sel':(hv!==''&&hv!==undefined?'gv-hw':(_hMissing?'gv-missing':'gv-empty')))+'">';
            html+=(_gsSelH&&GS._gsInput!==''?GS._gsInput:(hv!==''&&hv!==undefined?hv:'—'))+'</span>';
            html+='</div>';
          } else if(isHA)html+='<span class="gc-lbl-abs" onclick="gradesSetField('+idx+',\''+hField+'\',\'\');renderGrades();">غ</span>';
          else html+='<span class="gc-lbl-exc" onclick="gradesSetField('+idx+',\''+hField+'\',\'\');renderGrades();">م</span>';
          html+='</td>';
        }
        // خلية السلوك
        var bNum=parseFloat(bv);
        if(!isBA&&!isBM&&bv!==undefined&&bv!==''&&!isNaN(bNum)){behSum+=bNum;behCnt++;}
        if(_showBeh){
          var _gsCellIdB='gs_'+idx+'_'+bField;
          var _gsSelB=(GS._gsCell&&GS._gsCell.cellId===_gsCellIdB);
          var _bMissing=(_isPastWk&&!isBA&&!isBM&&(bv===''||bv===undefined));
          html+='<td style="padding:1px;'+(_bMissing&&!_gsSelB?'background:rgba(239,68,68,.22);':'background:rgba(124,58,237,0.07);')+_wkEdgeStyle('beh')+'">';
          if(!isBA&&!isBM){
            html+='<div class="gs-tbl-cell'+(_gsSelB?' gs-tbl-sel':'')+'" onclick="_gsSelectCell('+idx+',\''+bField+'\','+bMax+',\''+_gsCellIdB+'\',\'beh_w'+w+'\')">';
            html+='<span class="gv '+(_gsSelB?'gv-sel':(bv!==''&&bv!==undefined?'gv-beh':(_bMissing?'gv-missing':'gv-empty')))+'">';
            html+=(_gsSelB&&GS._gsInput!==''?GS._gsInput:(bv!==''&&bv!==undefined?bv:'—'))+'</span>';
            html+='</div>';
          } else if(isBA)html+='<span class="gc-lbl-abs" onclick="gradesSetField('+idx+',\''+bField+'\',\'\');renderGrades();">غ</span>';
          else html+='<span class="gc-lbl-exc" onclick="gradesSetField('+idx+',\''+bField+'\',\'\');renderGrades();">م</span>';
          html+='</td>';
        }
      });
      var avgBeh=behCnt>0?Math.round(behSum/behCnt):'—';
      if(_showAvgAssess)html+='<td class="avg-cell">'+res.avgAssess+'</td>';
      if(_showAvgHw)html+='<td class="avg-cell">'+res.avgHw+'</td>';
      if(_showAvgBeh)html+='<td class="avg-cell" style="color:#000000;">'+avgBeh+'</td>';
      html+='<td class="avg-cell gv-exam">'+res.exTotal+'</td>';
      if(_showTotal)html+='<td><span class="tot-cell" id="tot_'+idx+'" style="background:'+gc(tot)+'22;color:'+gc(tot)+';border:1.5px solid '+gc(tot)+'">'+tot+'</span></td>';
      if(_showTotal){
        var _absDedHome=res.absenceDeduct||0;
        html+='<td>'+(_absDedHome>0?'<span style="color:#f97316;font-weight:700;font-size:11px;">−'+_absDedHome+'</span>':'<span style="color:#475569;">—</span>')+'</td>';
      }
      if(_showDist){
        var _gsDistId='gs_dist_'+idx;
        var _gsDistSel=(GS._gsCell&&GS._gsCell.cellId===_gsDistId);
        html+='<td>';
        html+='<div class="gs-tbl-cell'+(_gsDistSel?' gs-tbl-sel':'')+'" onclick="_gsSelectDistCell('+idx+',\'dih'+s.id+'\','+tmax+',\''+_gsDistId+'\')" style="min-width:36px;">';
        html+='<span class="gv '+(_gsDistSel?'gv-sel':'gv-dist')+'"> '+(_gsDistSel&&GS._gsInput!==''?GS._gsInput:'مج')+'</span>';
        html+='</div>';
        html+='</td>';
      }
      // Move up/down
      html+='<td style="white-space:nowrap;padding:1px 2px;">';
      html+='<div style="display:flex;flex-direction:column;gap:1px;align-items:center;">';
      html+='<button onclick="gradesMoveStudent('+idx+',-1)" style="background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;cursor:pointer;padding:1px 5px;line-height:1.2;"'+(idx===0?' disabled style="opacity:.3;background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;padding:1px 5px;"':'')+'>▲</button>';
      html+='<button onclick="gradesMoveStudent('+idx+',1)" style="background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;cursor:pointer;padding:1px 5px;line-height:1.2;"'+(idx===students.length-1?' disabled style="opacity:.3;background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;padding:1px 5px;"':'')+'>▼</button>';
      html+='</div></td>';
      // Delete
      html+='<td><button class="del-btn" onclick="openDelStudentModal('+idx+')">🗑</button></td>';
      html+='</tr>';
    });
    html+='</tbody></table></div>';
    html+='<div style="font-size:10px;color:#94a3b8;margin:4px 2px;display:flex;gap:14px;flex-wrap:wrap;"><span style="color:#fca5a5;">🟥 الخانة الحمراء = الدرجة لسه متسجلتش في أسبوع وصلنا له أو فات</span><span style="color:#6ee7b7;">✅ رأس العمود/الأسبوع الأخضر = كل الطلاب درجاتهم متسجلة</span><span style="color:#fbbf24;">┃ الخط السميك = فاصل بين الأسابيع</span></div>';
    html+='<button class="add-row-btn" onclick="gradesAddStudent()">+ إضافة طالب جديد</button>';
  } else {
  // NORMAL PAGE VIEW
  html+='<div class="g-legend">';
  (DB.colPages||[]).forEach(function(pg){
    var pgMax=pg.cols.filter(function(c){return c.visible;}).reduce(function(s,c){return s+c.max;},0);
    html+='<span>'+esc(pg.name)+' /'+pgMax+'</span>';
  });
  html+='<span>متوسط تقييم /20 | متوسط واجب /10 | متوسط سلوك /10</span>';
  html+='</div>';
  if(GS.activePage==='pg_beh'){
    html+='<div style="background:linear-gradient(135deg,#1a0d3a,#2d1b5e);border:1px solid #7c3aed;border-radius:8px;padding:8px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
    html+='<span style="font-size:10px;color:#c4b5fd;">🔗 درجات السلوك والمواظبة مرتبطة بصفحة الأسبوعي — أي تعديل هنا أو في الأسبوعي يتزامنان تلقائياً</span>';
    html+='<button class="btn btn-sm" style="background:#7c3aed;color:white;" onclick="switchPage(\'weekly\')">📅 الذهاب للأسبوعي</button>';
    html+='</div>';
  }
  if(GS.activePage==='pg_other'){
    html+='<div style="background:linear-gradient(135deg,#0a1628,#1a2540);border:1px solid #1d4ed8;border-radius:8px;padding:7px 14px;margin-bottom:8px;font-size:9.5px;color:#93c5fd;display:flex;gap:16px;flex-wrap:wrap;align-items:center;">';
    html+='<span>📋 أدخل درجات الاختبارين — الإجمالي /30</span>';
    html+='</div>';
  }

  html+='<div class="tw"><table><thead><tr>';
  html+='<th>م</th><th class="td-photo">صورة</th><th class="td-name">الاسم</th>';
  pageCols.forEach(function(c){
    html+='<th>'+esc(c.label)+'<span class="ml">/'+c.max+'</span>';
    html+='<div style="display:flex;gap:2px;justify-content:center;margin-top:2px;">';
    html+='<button style="background:#e2e8f0;border:1px solid #94a3b8;border-radius:3px;font-size:7px;color:#475569;cursor:pointer;padding:0 3px;" onclick="gradesSetColAll(\''+c.id+'\',\'\')">مسح</button>';
    html+='<button style="background:#ede9fe;border:1px solid #7c3aed;border-radius:3px;font-size:7px;color:#6d28d9;cursor:pointer;padding:0 4px;font-weight:700;" onclick="openPasteModal(\''+c.id+'\')">📋</button>';
    html+='</div></th>';
  });
  html+='<th>متوسط<span class="ml">تقييم/20</span></th>';
  html+='<th>متوسط<span class="ml">واجب/10</span></th>';
  html+='<th title="متوسط السلوك = مجموع درجات السلوك الأسبوعية ÷ عدد الأسابيع المُرصدة">متوسط سلوك<span class="ml">/10</span><br><span style="font-size:7px;color:#a78bfa;font-weight:400;">Σ سلوك ÷ ن</span></th>';
  html+='<th title="مجموع درجات الاختبارات">متوسط<br><span style="font-size:7px;color:#fbbf24;">اختبارات/30</span></th>';
  html+='<th>مجموع<span class="ml">/'+tmax+'</span></th>';
  html+='<th title="عدد الدرجات المخصومة من المجموع بسبب الغياب">خصم<br><span style="font-size:7px;color:#f97316;">الغياب</span></th>';
  html+='<th>غياب</th><th>توزيع</th><th>تحريك</th><th>حذف</th>';
  html+='</tr></thead><tbody>';

  filtered.forEach(function(s){
    var idx=students.indexOf(s);
    var res=calcStudent(s,cls);
    var isAbsent=s._totalAbsent;
    var isDictHL=!!GS.dictHL[s.id];
    var absPer=countStudentAbsencePeriods(cls,s.id);
    var rowCls=(isDictHL?"hl-dict":isAbsent?"hl-abs":"");

    html+='<tr class="'+rowCls+'">';
    html+='<td class="td-rn">'+(idx+1)+'</td>';
    // Photo
    html+='<td class="td-photo"><div class="pu" onclick="document.getElementById(\'ph'+s.id+'\').click()">';
    var _defP=DB.meta.defaultStudentPhoto||'';
    html+=(s.photo?'<img src="'+s.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:4px;"/>':(_defP?'<img src="'+_defP+'" style="width:100%;height:100%;object-fit:cover;border-radius:4px;"/>':'<span style="font-size:12px;color:#94a3b8">👤</span>'));
    html+='</div><input id="ph'+s.id+'" type="file" accept="image/*" style="display:none" onchange="gradesPhotoChange(event,'+idx+')"/></td>';
    // Name
    html+='<td class="td-name"><input class="ni" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" value="'+esc(s.name)+'" onchange="gradesSetField('+idx+',\'name\',this.value)" placeholder="اسم الطالب"/></td>';
    // Grade cells for this page
    pageCols.forEach(function(c){
        var v=s[c.field];
        var isA=v==="غ",isM=v==="م";
        var _gsCellId='gs_'+idx+'_'+c.field;
        var _gsSel=(GS._gsCell&&GS._gsCell.cellId===_gsCellId);
        html+='<td>';
        if(!isA&&!isM){
          html+='<div class="gs-tbl-cell'+(_gsSel?' gs-tbl-sel':'')+'" onclick="_gsSelectCell('+idx+',\''+c.field+'\','+c.max+',\''+_gsCellId+'\',\'pg_'+c.id+'\')">';
          html+='<span class="gv '+(_gsSel?'gv-sel':(v!==''&&v!==undefined?'gv-assess':'gv-empty'))+'">';
          html+=(_gsSel&&GS._gsInput!==''?GS._gsInput:(v!==''&&v!==undefined?v:'—'))+'</span>';
          html+='</div>';
        } else if(isA){html+='<span class="gc-lbl-abs" onclick="gradesSetField('+idx+',\''+c.field+'\',\'\');renderGrades();">غ</span>';}
        else{html+='<span class="gc-lbl-exc" onclick="gradesSetField('+idx+',\''+c.field+'\',\'\');renderGrades();">م</span>';}
        html+='</td>';
    });
    // Averages
    html+='<td class="avg-cell" style="'+(res.avgAssess==="غ"?"color:#b45309":"")+'">'+res.avgAssess+'</td>';
    html+='<td class="avg-cell" style="'+(res.avgHw==="غ"?"color:#b45309":"")+'">'+res.avgHw+'</td>';
    html+='<td class="avg-cell" style="'+(res.avgBeh==="غ"?"color:#b45309":"")+'">'+res.avgBeh+'</td>';
    html+='<td class="avg-cell gv-exam">'+res.exTotal+'</td>';
    // Total
    var tot=res.total;
    var _absDed=res.absenceDeduct||0;
    html+='<td><span class="tot-cell" id="tot_'+idx+'" style="background:'+gc(tot)+'22;color:'+gc(tot)+';border:1.5px solid '+gc(tot)+'" title="'+(_absDed>0?'خصم غياب: −'+_absDed:'')+'">';
    html+=tot;
    if(_absDed>0)html+='<sup style="font-size:7px;color:#f97316;margin-right:1px;">−'+_absDed+'</sup>';
    html+='</span></td>';
    // Absence deduction column
    html+='<td>'+(_absDed>0?'<span style="color:#f97316;font-weight:700;font-size:11px;">−'+_absDed+'</span>':'<span style="color:#475569;">—</span>')+'</td>';
    // Absence
    html+='<td>';
    html+='<button class="abs-btn" onclick="switchPage(\'absence\')">'+( absPer>0?'<span class="abs-cnt">'+absPer+'</span>':"")+' 📋</button>';
    if(absPer>0)html+='<div style="font-size:8px;color:#f97316;">'+absPer+'ف</div>';
    html+='</td>';
    // Distribute — clickable cell
    var _gsDistId2='gs_dist_'+idx;
    var _gsDistSel2=(GS._gsCell&&GS._gsCell.cellId===_gsDistId2);
    html+='<td><div style="display:flex;flex-direction:column;gap:2px;align-items:center;">';
    html+='<div class="gs-tbl-cell'+(_gsDistSel2?' gs-tbl-sel':'')+'" onclick="_gsSelectDistCell('+idx+',\'di'+s.id+'\','+tmax+',\''+_gsDistId2+'\')" style="min-width:38px;">';
    html+='<span class="gv '+(_gsDistSel2?'gv-sel':'gv-dist')+'"> '+(_gsDistSel2&&GS._gsInput!==''?GS._gsInput:'مج')+'</span>';
    html+='</div>';
    html+='<button style="background:'+(s._totalAbsent?'#fee2e2':'#fef3c7')+';border:1px solid '+(s._totalAbsent?'#ef4444':'#f59e0b')+';border-radius:2px;font-size:7.5px;color:'+(s._totalAbsent?'#dc2626':'#b45309')+';cursor:pointer;padding:1px 3px;" onclick="gradesSetAllAbsent('+idx+')">'+(s._totalAbsent?'↩ تراجع':'غ كامل')+'</button>';
    html+='</div></td>';
    // Move up/down
    html+='<td style="white-space:nowrap;padding:1px 2px;">';
    html+='<div style="display:flex;flex-direction:column;gap:1px;align-items:center;">';
    html+='<button onclick="gradesMoveStudent('+idx+',-1)" '+(idx===0?'disabled ':'')+'style="background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;cursor:pointer;padding:1px 5px;line-height:1.2;'+(idx===0?'opacity:.3;':'')+'">▲</button>';
    html+='<button onclick="gradesMoveStudent('+idx+',1)" '+(idx===students.length-1?'disabled ':'')+'style="background:#1e3a5f;border:none;color:#93c5fd;border-radius:3px;font-size:10px;cursor:pointer;padding:1px 5px;line-height:1.2;'+(idx===students.length-1?'opacity:.3;':'')+'">▼</button>';
    html+='</div></td>';
    // Delete
    html+='<td><button class="del-btn" onclick="openDelStudentModal('+idx+')">🗑</button></td>';
    html+='</tr>';
  });

  html+='</tbody></table></div>';
  html+='<button class="add-row-btn" onclick="gradesAddStudent()">+ إضافة طالب جديد</button>';
  } // end else normal view
  html+='</div>'; // g-main

  // MODALS
  html+=renderGradesModals(students,tmax,rmax);
  html+='</div>'; // grades-page

  // حفظ موضع التمرير لتجنب القفز عند إدخال الدرجات
  var _gMain=root.querySelector('.g-main');
  var _savedScrollTop=_gMain?_gMain.scrollTop:0;
  var _savedScrollLeft=_gMain?_gMain.scrollLeft:0;
  root.innerHTML=html;
  var _gMainNew=root.querySelector('.g-main');
  if(_gMainNew){
    _gMainNew.scrollTop=_savedScrollTop;
    _gMainNew.scrollLeft=_savedScrollLeft;
  }
  // تفعيل اللوحة العائمة في صفحة الدرجات
  if(typeof buildFloatingNumpad === 'function') {
    buildFloatingNumpad();
    if(typeof FNP !== 'undefined') {
      if(GS._gsCell) {
        if(FNP.tog) FNP.tog.classList.add('fnp-tog-visible');
        if(!FNP.visible && typeof FNP_show === 'function') FNP_show();
        if(typeof _gsFnpUpdateHeader === 'function') _gsFnpUpdateHeader();
      } else {
        if(FNP.tog) FNP.tog.classList.remove('fnp-tog-visible');
        if(FNP.el) FNP.el.classList.remove('fnp-visible');
        FNP.visible = false;
      }
    }
  }
  // تحديث شريط الجداول في التوب بار
  var _pb=document.getElementById('pagesBar');
  if(_pb&&_pb.classList.contains('open'))renderPagesBar();
  // تحديث شريط الأسابيع إذا كان مفتوحاً
  var _gwb=document.getElementById('gradeWeeksBar');
  if(_gwb&&_gwb.classList.contains('open'))renderGradeWeeksBar();
  // تحديث حالة زر الجداول
  var _pBtn=document.getElementById('tbPagesBtn');
  if(_pBtn){var _isPageActive=GS.activePage&&GS.activePage!=='pg_home';_pBtn.classList.toggle('active',!!_isPageActive);}
}

function gradesAddStudent(){
  DB.data[GS.activeClass].push(emptyStudent(Date.now()));
  saveDB();renderGrades();
}
function gradesSortAlpha(){
  var cls=GS.activeClass;
  if(!DB.data[cls])return;
  DB.data[cls].sort(function(a,b){return (a.name||'').localeCompare(b.name||'','ar');});
  saveDB();renderGrades();
  showSnack('✅ تم الترتيب الأبجدي');
}
function gradesMoveStudent(idx,dir){
  var cls=GS.activeClass;
  var arr=DB.data[cls];
  if(!arr)return;
  var newIdx=idx+dir;
  if(newIdx<0||newIdx>=arr.length)return;
  var tmp=arr[idx];arr[idx]=arr[newIdx];arr[newIdx]=tmp;
  saveDB();renderGrades();
}
var _gradesRenderTimer=null;
function gradesSetField(idx,field,val){
  var activeCls=(_currentPage==="weekly"||_currentPage==="sched")?WKS.activeClass:GS.activeClass;
  if(!DB.data[activeCls])return;
  DB.data[activeCls][idx][field]=val;
  saveDB();
  // تحديث خلية الإجمالي مباشرةً في DOM دون إعادة بناء الجدول
  _gradesUpdateTotCell(activeCls,idx);
  // إعادة رسم كاملة بعد توقف المستخدم (لتحديث الإحصائيات والألوان)
  if(_gradesRenderTimer)clearTimeout(_gradesRenderTimer);
  _gradesRenderTimer=setTimeout(function(){
    var gm=document.querySelector('.g-main');
    var st=gm?gm.scrollTop:0;
    var sl=gm?gm.scrollLeft:0;
    if(_currentPage==="grades"){renderGrades();}
    else{_refreshCurrentAndRelated();}
    var gm2=document.querySelector('.g-main');
    if(gm2){gm2.scrollTop=st;gm2.scrollLeft=sl;}
  },900);
}
function _gradesUpdateTotCell(cls,idx){
  var s=DB.data[cls]&&DB.data[cls][idx];
  if(!s)return;
  var tmax=totalMax();
  var total=calcStudent(s,cls).total;
  var cell=document.getElementById('tot_'+idx);
  if(!cell)return;
  var isFail=total<Math.round(tmax/2);
  cell.textContent=total;
  cell.style.background=isFail?'#fee2e2':'#d1fae5';
  cell.style.color=isFail?'#b91c1c':'#065f46';
}
function gradesPhotoChange(e,idx){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();r.onload=function(){DB.data[GS.activeClass][idx].photo=r.result;saveDB();renderGrades();};r.readAsDataURL(f);
}
function gradesDistribute(idx,inp){
  var v=inp.value.trim();if(!v)return;
  var tmax=totalMax(),rmax=GS.distRange.max!==null?GS.distRange.max:tmax;
  var p=distributeTotal(v,DB.data[GS.activeClass][idx]);
  if(p){DB.data[GS.activeClass][idx]=p;saveDB();renderGrades();}
  inp.value="";
}
function gradesSetAllAbsent(idx){
  var s=DB.data[GS.activeClass][idx];
  if(s._totalAbsent){
    // تراجع: مسح كل الغيابات
    var p=Object.assign({},s);
    allCols().forEach(function(c){if(p[c.field]==="غ")p[c.field]="";});
    delete p._totalAbsent;
    DB.data[GS.activeClass][idx]=p;
  } else {
    DB.data[GS.activeClass][idx]=setAllAbsent(s);
  }
  saveDB();renderGrades();
}
// FIX 4: set all students for a column to غ, م, or clear
function gradesSetColAll(colId,val){
  var cls=GS.activeClass;
  (DB.data[cls]||[]).forEach(function(s){s[colId]=val;});
  saveDB();renderGrades();
}

// ── Grades Modals ─────────────────────────────────────
function openSmartDistModal(){
  var _aw=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  GS.modal={type:"smartDist",data:{srcCols:[],weeksCount:_aw,targets:{assess:true,hw:false,beh:false,ex1:false,ex2:false},scope:"all"}};
  renderGrades();
}
function sdToggleSrc(colId){
  if(!GS.modal||GS.modal.type!=="smartDist")return;
  var arr=GS.modal.data.srcCols;
  var i=arr.indexOf(colId);
  if(i>=0)arr.splice(i,1); else arr.push(colId);
  renderGrades();
}
function sdToggleTarget(field,on){
  if(!GS.modal||GS.modal.type!=="smartDist")return;
  if(!GS.modal.data.targets)GS.modal.data.targets={};
  GS.modal.data.targets[field]=on;
  renderGrades();
}
function gradesApplySmartDist(){
  if(!GS.modal||GS.modal.type!=="smartDist")return;
  var d=GS.modal.data;
  if(!d.srcCols.length){showSnack("⚠️ اختر عمود مصدر واحداً على الأقل");return;}
  var tg=d.targets||{};
  if(!tg.assess&&!tg.hw&&!tg.beh&&!tg.ex1&&!tg.ex2){showSnack("⚠️ اختر هدفاً واحداً على الأقل");return;}

  var cls=GS.activeClass;
  var students=DB.data[cls]||[];
  var wCount=Math.max(1,Math.min(d.weeksCount||ALL_WEEKS.length,ALL_WEEKS.length));
  var weeksList=ALL_WEEKS.slice(0,wCount);
  var scopeEmpty=d.scope==='empty';

  var colMap={};
  allCols().forEach(function(c){colMap[c.id]=c;});

  var changed=0;

  students.forEach(function(s){
    if(!s.name)return;

    // ── compute reference average from srcCols ──
    var srcSum=0,srcCnt=0,srcMaxSum=0;
    d.srcCols.forEach(function(cid){
      var col=colMap[cid]; if(!col)return;
      var v=s[cid];
      if(v===''||v===undefined||v===null||v==='م')return;
      var n=(v==='غ')?0:Math.min(Number(v)||0,col.max);
      srcSum+=n; srcMaxSum+=col.max; srcCnt++;
    });
    if(!srcCnt)return; // no reference — skip student

    // ratio 0-1 based on source performance
    var ratio=srcMaxSum>0?srcSum/srcMaxSum:0;

    // helper: jitter a value around target within [0, max]
    function jv(target,max,spread){
      return Math.max(0,Math.min(max,Math.round(target+Math.floor(Math.random()*spread*2+1)-spread)));
    }
    function isEmpty(v){return v===''||v===undefined||v===null;}

    // ── Distribute assess (per week) ──
    if(tg.assess){
      weeksList.forEach(function(w){
        var field='a'+w;
        var col=colMap[field]; var max=col?col.max:20;
        if(s[field]==='غ'||s[field]==='م')return;
        if(scopeEmpty&&!isEmpty(s[field]))return;
        s[field]=jv(ratio*max,max,3); changed++;
      });
    }

    // ── Distribute hw (per week) ──
    if(tg.hw){
      weeksList.forEach(function(w){
        var field='h'+w;
        var col=colMap[field]; var max=col?col.max:10;
        if(s[field]==='غ'||s[field]==='م')return;
        if(scopeEmpty&&!isEmpty(s[field]))return;
        s[field]=jv(ratio*max,max,2); changed++;
      });
    }

    // ── Distribute beh — السلوك والمواظبة (per week bw<N>) ──
    if(tg.beh){
      weeksList.forEach(function(w){
        var field='bw'+w;
        var col=colMap[field]; var max=col?col.max:10;
        if(s[field]==='غ'||s[field]==='م')return;
        if(scopeEmpty&&!isEmpty(s[field]))return;
        s[field]=jv(ratio*max,max,2); changed++;
      });
    }

    // ── Distribute ex1 /15 ──
    if(tg.ex1){
      var ex1Max=(colMap['ex1']?colMap['ex1'].max:15);
      if(!scopeEmpty||isEmpty(s.ex1)){
        s.ex1=jv(ratio*ex1Max,ex1Max,3); changed++;
      }
    }

    // ── Distribute ex2 /15 ──
    if(tg.ex2){
      var ex2Max=(colMap['ex2']?colMap['ex2'].max:15);
      if(!scopeEmpty||isEmpty(s.ex2)){
        s.ex2=jv(ratio*ex2Max,ex2Max,3); changed++;
      }
    }
  });

  saveDB(); GS.modal=null;
  showSnack('✅ تم التوزيع الذكي — '+changed+' خلية');
  renderGrades();
}

function openPasteModal(preCol){GS.modal={type:"paste",data:{col:preCol||"total",text:"",rows:[]}};renderGrades();}
function pasteFromClipboard(){
  if(!navigator.clipboard||!navigator.clipboard.readText){showSnack('المتصفح لا يدعم اللصق التلقائي، استخدم Ctrl+V');return;}
  navigator.clipboard.readText().then(function(text){
    var ta=document.getElementById('pasteTA');
    if(ta){ta.value=text;ta.focus();}
  }).catch(function(){showSnack('تعذّر الوصول للحافظة — استخدم Ctrl+V داخل المربع');});
}
function openRangeModal(){GS.modal={type:"range"};renderGrades();}
function openColConfigModal(){GS.modal={type:"colConfig",data:{activePgId:GS.activePage}};renderGrades();}
function openDelStudentModal(idx){GS.modal={type:"delStudent",data:{idx:idx}};renderGrades();}
function openAddClsModal(){GS.modal={type:"addCls",data:{name:""}};renderGrades();}
function openRenameClsModal(cls){GS.modal={type:"renameCls",data:{old:cls,val:cls}};renderGrades();}
function openDelClsModal(cls){GS.modal={type:"delCls",data:{cls:cls}};renderGrades();}
function closeModal(){GS.modal=null;renderGrades();}

function renderGradesModals(students,tmax,rmax){
  if(!GS.modal)return"";
  var m=GS.modal,html="";
  var stopProp=' onclick="event.stopPropagation()"';

  // ── Delete student ───────────────────────────────────
  if(m.type==="delStudent"){
    var s=students[m.data.idx];
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:260px" '+stopProp+'>';
    html+='<div class="mh"><h2>🗑️ حذف الطالب</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="text-align:center;padding:16px">';
    html+='<div style="font-size:11px;color:#475569;margin-bottom:10px">'+(s?esc(s.name):"")+'</div>';
    html+='<div style="display:flex;gap:7px;justify-content:center">';
    html+='<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>';
    html+='<button class="btn btn-danger" onclick="gradesDelStudent('+m.data.idx+')">حذف</button>';
    html+='</div></div></div></div>';
  }

  // ── Add class ────────────────────────────────────────
  if(m.type==="addCls"){
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:400px" '+stopProp+'>';
    html+='<div class="mh"><h2>➕ فصل جديد</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="display:flex;flex-direction:column;gap:12px;">';
    html+='<div>';
    html+='<label style="font-size:10px;color:#64748b;display:block;margin-bottom:4px;">اسم الفصل:</label>';
    html+='<input class="input-std" id="newClsInp" placeholder="مثال: الأول أ" autofocus/>';
    html+='</div>';
    html+='<div>';
    html+='<label style="font-size:10px;color:#64748b;display:block;margin-bottom:4px;">أسماء الطلاب <span style="color:#94a3b8;font-weight:400;">(اختياري — اسم واحد في كل سطر)</span>:</label>';
    html+='<textarea id="newClsStudents" class="input-std" rows="8" style="resize:vertical;font-size:11px;line-height:1.7;" placeholder="محمد أحمد علي&#10;خالد محمود إبراهيم&#10;عمر يوسف عبدالله&#10;..."></textarea>';
    html+='<div style="font-size:9px;color:#475569;margin-top:3px;">💡 يمكنك إضافة الأسماء لاحقاً من صفحة الدرجات</div>';
    html+='</div>';
    html+='</div>';
    html+='<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="gradesAddCls()">➕ إنشاء الفصل</button></div>';
    html+='</div></div>';
  }
  // ── Rename class ─────────────────────────────────────
  if(m.type==="renameCls"){
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:280px" '+stopProp+'>';
    html+='<div class="mh"><h2>✏️ تغيير الاسم</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb"><input class="input-std" id="renClsInp" value="'+esc(m.data.val)+'" autofocus/></div>';
    html+='<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="gradesRenameCls()">حفظ</button></div>';
    html+='</div></div>';
  }
  // ── Delete class ─────────────────────────────────────
  if(m.type==="delCls"){
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:260px" '+stopProp+'>';
    html+='<div class="mh"><h2>🗑️ حذف الفصل</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="text-align:center;padding:14px"><div style="font-size:11px;margin-bottom:10px;color:#ef4444">سيُحذف نهائياً: '+esc(m.data.cls)+'</div>';
    html+='<div style="display:flex;gap:7px;justify-content:center"><button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-danger" onclick="gradesDelCls(\''+esc(m.data.cls)+'\')">حذف</button></div>';
    html+='</div></div></div>';
  }

  // ── Distribute range ──────────────────────────────────
  if(m.type==="range"){
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:340px" '+stopProp+'>';
    html+='<div class="mh"><h2>🎲 نطاق التوزيع العشوائي</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="display:flex;flex-direction:column;gap:10px;">';
    html+='<div style="font-size:10px;color:#475569;background:#f8fafc;padding:7px 10px;border-radius:6px;">حدد نطاق المجموع عند التوزيع التلقائي.</div>';
    html+='<div style="display:flex;gap:10px;align-items:center;"><label style="font-size:11px;min-width:70px">من:</label>';
    html+='<input type="number" class="input-std" style="width:80px" id="rMin" min="0" max="'+tmax+'" value="'+GS.distRange.min+'"/>';
    html+='<span class="badge badge-purple">'+GS.distRange.min+'/'+tmax+'</span></div>';
    html+='<div style="display:flex;gap:10px;align-items:center;"><label style="font-size:11px;min-width:70px">إلى:</label>';
    html+='<input type="number" class="input-std" style="width:80px" id="rMax" min="0" max="'+tmax+'" value="'+rmax+'"/>';
    html+='<span class="badge badge-purple">'+rmax+'/'+tmax+'</span></div>';
    html+='</div>';
    html+='<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="gradesSaveRange()">تطبيق</button></div>';
    html+='</div></div>';
  }

  // ── Paste modal ──────────────────────────────────────
  if(m.type==="paste"){
    var colOpts='<option value="total"'+(m.data.col==="total"?' selected':'')+'>المجموع /'+tmax+' (توزيع)</option>';
    (DB.colPages||[]).forEach(function(pg){
      pg.cols.filter(function(c){return c.visible;}).forEach(function(c){
        colOpts+='<option value="'+c.id+'"'+(m.data.col===c.id?' selected':'')+'>'+esc(c.label)+' /'+c.max+'</option>';
      });
    });
    var maxForCol={total:tmax};allCols().forEach(function(c){maxForCol[c.id]=c.max;});
    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:460px" '+stopProp+'>';
    html+='<div class="mh"><h2>📋 لصق البيانات</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="display:flex;flex-direction:column;gap:8px;">';
    html+='<div style="display:flex;gap:8px;align-items:center;"><label style="font-size:10px;white-space:nowrap">العمود:</label>';
    html+='<select class="select-std" id="pasteColSel" onchange="GS.modal.data.col=this.value">'+colOpts+'</select></div>';
    html+='<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:10px;color:#475569;">';
    html+='<b>صيغة اللصق:</b><br/>';
    html+='• اسم فقط → يطابق الطالب ولا يغيّر درجاته<br/>';
    html+='• اسم<code style="background:#e2e8f0;padding:0 3px;border-radius:2px">tab</code>قيمة → يضع القيمة في العمود المحدد<br/>';
    html+='• اسم<code style="background:#e2e8f0;padding:0 3px;border-radius:2px">tab</code>غ → يضع غياب في العمود المحدد فقط';
    html+='</div>';
    html+='<div style="position:relative;">';
    html+='<textarea class="input-std" id="pasteTA" rows="6" placeholder="الصق هنا..." style="resize:vertical;width:100%;box-sizing:border-box;"></textarea>';
    html+='<button onclick="pasteFromClipboard()" style="position:absolute;top:6px;left:6px;background:#ede9fe;border:1px solid #7c3aed;border-radius:5px;font-size:9px;color:#6d28d9;cursor:pointer;padding:3px 8px;font-weight:700;display:flex;align-items:center;gap:3px;">📋 لصق سريع</button>';
    html+='</div>';
    html+='<div id="pastePreview" style="max-height:130px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;display:none;"></div>';
    html+='</div>';
    html+='<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-success" onclick="gradesApplyPaste()">تطبيق</button></div>';
    html+='</div></div>';
  }

  // ── Smart Distribution modal ─────────────────────────
  if(m.type==="smartDist"){
    var _aw2=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
    var _sdData=m.data;
    // _sdData: {srcCols:[], weeksCount, targets:{assess,hw,beh,ex1,ex2}, scope}

    // Build source columns grouped by type
    var assessCols2=[],hwCols2=[],bwCols2=[],exCols2=[];
    (DB.colPages||[]).forEach(function(pg){
      pg.cols.filter(function(c){return c.visible;}).forEach(function(c){
        if(c.id.match(/^a\d+$/))assessCols2.push(c);
        else if(c.id.match(/^h\d+$/))hwCols2.push(c);
        else if(c.id.match(/^bw\d+$/))bwCols2.push(c);
        else if(c.id==='ex1'||c.id==='ex2')exCols2.push(c);
      });
    });
    // Also ensure ex cols are included even if not visible
    allCols().forEach(function(c){
      if((c.id==='ex1'||c.id==='ex2')&&!exCols2.find(function(x){return x.id===c.id;}))exCols2.push(c);
    });

    // targets is an object of booleans: {assess, hw, beh, ex1, ex2}
    if(!_sdData.targets)_sdData.targets={assess:true,hw:false,beh:false,ex1:false,ex2:false};
    var tg=_sdData.targets;

    function _sdChk(field,label,color){
      var on=tg[field];
      return '<label style="display:flex;align-items:center;gap:4px;background:'+(on?'#fff7ed':'#f8fafc')+';border:1.5px solid '+(on?color:'#e2e8f0')+';border-radius:7px;padding:5px 10px;cursor:pointer;font-size:10px;font-weight:700;color:'+(on?color:'#64748b')+';transition:all .15s;">'
        +'<input type="checkbox" '+(on?'checked':'')+' onchange="sdToggleTarget(\''+field+'\',this.checked)" style="cursor:pointer;accent-color:'+color+';width:13px;height:13px;"/>'
        +label+'</label>';
    }

    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:520px" '+stopProp+'>';
    html+='<div class="mh"><h2>🔀 التوزيع الذكي للدرجات</h2><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb" style="display:flex;flex-direction:column;gap:11px;">';

    // Info
    html+='<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:7px;padding:8px 11px;font-size:10px;color:#0369a1;">يأخذ متوسط الأعمدة المرجعية لكل طالب ويوزّعه عشوائياً على الأعمدة المستهدفة مع الحفاظ على المتوسط.</div>';

    // ── SOURCE ──
    html+='<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
    html+='<div style="background:#f8fafc;padding:7px 11px;font-size:10px;font-weight:700;color:#0f2a5e;border-bottom:1px solid #e2e8f0;">📌 أعمدة المصدر (المرجع)</div>';
    html+='<div style="padding:8px 11px;display:flex;flex-direction:column;gap:6px;">';
    html+='<div style="font-size:9px;color:#64748b;">اختر عموداً أو أكثر — سيُحسب متوسطها كدرجة مرجعية لكل طالب:</div>';

    function _srcGroup(cols, title, color, accentColor){
      if(!cols.length)return;
      html+='<div style="font-size:9px;font-weight:700;color:'+color+';margin-top:2px;">'+title+'</div>';
      html+='<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      cols.forEach(function(c){
        var checked=_sdData.srcCols.indexOf(c.id)>=0;
        html+='<label style="display:flex;align-items:center;gap:3px;background:'+(checked?'#f0f9ff':'#f1f5f9')+';border:1px solid '+(checked?color:'#e2e8f0')+';border-radius:5px;padding:2px 8px;cursor:pointer;font-size:9px;color:'+(checked?color:'#475569')+'">';
        html+='<input type="checkbox" '+(checked?'checked':'')+' onchange="sdToggleSrc(\''+c.id+'\')" style="cursor:pointer;accent-color:'+accentColor+';"/>'+esc(c.label)+'</label>';
      });
      html+='</div>';
    }
    _srcGroup(assessCols2,'تقييمات /20','#1d4ed8','#1d4ed8');
    _srcGroup(hwCols2,'واجبات /10','#7c3aed','#7c3aed');
    _srcGroup(bwCols2,'السلوك والمواظبة /10','#059669','#059669');
    _srcGroup(exCols2,'اختبارات /15','#c2410c','#c2410c');
    html+='</div></div>';

    // ── TARGETS ──
    html+='<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
    html+='<div style="background:#f8fafc;padding:7px 11px;font-size:10px;font-weight:700;color:#0f2a5e;border-bottom:1px solid #e2e8f0;">🎯 الأعمدة المستهدفة (التوزيع عليها)</div>';
    html+='<div style="padding:10px 11px;display:flex;flex-direction:column;gap:10px;">';
    html+='<div style="display:flex;flex-wrap:wrap;gap:7px;">';
    html+=_sdChk('assess','📊 تقييمات /20','#1d4ed8');
    html+=_sdChk('hw','📝 واجبات /10','#7c3aed');
    html+=_sdChk('beh','🌟 سلوك ومواظبة /10','#059669');
    html+=_sdChk('ex1','📋 اختبار 1 /15','#c2410c');
    html+=_sdChk('ex2','📋 اختبار 2 /15','#b91c1c');
    html+='</div>';

    // ── WEEKS SLIDER (embedded, active when assess/hw/beh ticked) ──
    var showWeeks=tg.assess||tg.hw||tg.beh;
    html+='<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:8px 11px;'+(showWeeks?'':'opacity:.4;pointer-events:none;')+'">';
    html+='<div style="font-size:9px;font-weight:700;color:#475569;margin-bottom:6px;">📅 نطاق الأسابيع</div>';
    html+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html+='<input type="range" min="1" max="'+_aw2+'" value="'+(_sdData.weeksCount||_aw2)+'" style="flex:1;min-width:80px;accent-color:#c2410c;" oninput="GS.modal.data.weeksCount=Number(this.value);document.getElementById(\'sdWkNum\').textContent=this.value"/>';
    html+='<span id="sdWkNum" style="font-size:13px;font-weight:900;color:#c2410c;min-width:22px;">'+(_sdData.weeksCount||_aw2)+'</span>';
    html+='<span style="font-size:9px;color:#94a3b8;">أسبوع 1 → '+(_sdData.weeksCount||_aw2)+'</span>';
    html+='</div>';
    if(!showWeeks)html+='<div style="font-size:9px;color:#94a3b8;margin-top:3px;">فعّل تقييمات أو واجبات أو سلوك لاستخدام هذا الخيار</div>';
    html+='</div>';

    // ── SCOPE (embedded) ──
    html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
    html+='<label style="font-size:10px;color:#475569;white-space:nowrap;">👥 الطلاب:</label>';
    html+='<label style="display:flex;align-items:center;gap:4px;font-size:10px;cursor:pointer;"><input type="radio" name="sdScope" value="all" '+(_sdData.scope!=='empty'?'checked':'')+' onchange="GS.modal.data.scope=\'all\'" style="accent-color:#c2410c;"/>جميع الطلاب</label>';
    html+='<label style="display:flex;align-items:center;gap:4px;font-size:10px;cursor:pointer;"><input type="radio" name="sdScope" value="empty" '+(_sdData.scope==='empty'?'checked':'')+' onchange="GS.modal.data.scope=\'empty\'" style="accent-color:#c2410c;"/>الخلايا الفارغة فقط</label>';
    html+='</div>';

    html+='</div></div>';

    html+='</div>'; // mb
    html+='<div class="mf">';
    html+='<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>';
    html+='<button class="btn btn-orange" onclick="gradesApplySmartDist()">🔀 تطبيق التوزيع</button>';
    html+='</div></div></div>';
  }
  if(m.type==="colConfig"){
    var activePgId=m.data.activePgId;
    var activePg2=null;
    (DB.colPages||[]).forEach(function(pg){if(pg.id===activePgId)activePg2=pg;});
    if(!activePg2&&DB.colPages.length){activePg2=DB.colPages[0];m.data.activePgId=activePg2.id;}

    html+='<div class="mo" onclick="closeModal()"><div class="md" style="max-width:560px" '+stopProp+'>';
    html+='<div class="mh"><h2>⚙️ تخصيص الأعمدة</h2><span style="font-size:9px;color:#64748b;">اسحب لإعادة الترتيب</span><button class="xbtn" onclick="closeModal()">✕</button></div>';
    html+='<div class="mb">';
    // Page tabs
    html+='<div class="col-page-tabs">';
    (DB.colPages||[]).forEach(function(pg){
      html+='<button class="col-page-tab'+(pg.id===activePgId?" active":"")+'" onclick="GS.modal.data.activePgId=\''+pg.id+'\';renderGrades()">'+esc(pg.name)+'</button>';
    });
    html+='<button class="col-page-tab" style="border-color:#059669;color:#059669;" onclick="colAddPage()">+ صفحة</button>';
    html+='</div>';

    if(activePg2){
      // Page name edit
      html+='<div style="display:flex;gap:7px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">';
      html+='<label style="font-size:10px;color:#475569;">اسم الصفحة:</label>';
      html+='<input class="input-std" style="width:160px" value="'+esc(activePg2.name)+'" onchange="colRenamePage(\''+activePg2.id+'\',this.value)"/>';
      html+='<button class="btn btn-danger btn-sm" onclick="colDeletePage(\''+activePg2.id+'\')">🗑 حذف الصفحة</button>';
      html+='</div>';
      // Cols
      var sortedCols=(activePg2.cols||[]).sort(function(a,b){return a.order-b.order;});
      sortedCols.forEach(function(c,i){
        html+='<div class="col-row" id="ccr'+i+'" draggable="true" ondragstart="colDragStart(\''+activePg2.id+'\','+i+')" ondragover="colDragOver(event,'+i+')" ondrop="colDrop(event,\''+activePg2.id+'\','+i+')">';
        html+='<span class="col-drag">⠿</span>';
        html+='<input type="checkbox" class="col-chk" '+(c.visible?"checked":"")+' onchange="colToggleVis(\''+activePg2.id+'\',\''+c.id+'\',this.checked)"/>';
        html+='<input class="col-lbl-inp" value="'+esc(c.label)+'" onchange="colSetLabel(\''+activePg2.id+'\',\''+c.id+'\',this.value)" title="اسم العمود"/>';
        html+='<span style="font-size:9px;color:#94a3b8;">/</span>';
        html+='<input type="number" class="col-max-inp" value="'+c.max+'" min="1" max="999" onchange="colSetMax(\''+activePg2.id+'\',\''+c.id+'\',Number(this.value))" title="القيمة القصوى"/>';
        html+='<button class="col-del-btn" onclick="colDeleteCol(\''+activePg2.id+'\',\''+c.id+'\')">✕</button>';
        html+='</div>';
      });
      // Add col row
      html+='<div class="col-add-row">';
      html+='<input class="input-std" style="flex:1;min-width:80px" id="newColLabel" placeholder="اسم العمود الجديد"/>';
      html+='<input type="number" class="input-std" style="width:60px" id="newColMax" placeholder="القيمة" value="10" min="1"/>';
      html+='<button class="btn btn-primary btn-sm" onclick="colAddCol(\''+activePg2.id+'\')">+ إضافة</button>';
      html+='</div>';
    }
    html+='</div>';
    html+='<div class="mf">';
    html+='<button class="btn btn-ghost" onclick="DB.colPages=defaultColPages();saveDB();closeModal()">إعادة الضبط</button>';
    html+='<button class="btn btn-success" onclick="saveDB();closeModal()">حفظ وإغلاق</button>';
    html+='</div></div></div>';
  }

  return html;
}

// ── Grade page actions ────────────────────────────────
function gradesDelStudent(idx){
  DB.data[GS.activeClass].splice(idx,1);
  saveDB();GS.modal=null;renderGrades();
}
function gradesAddCls(){
  var inp=document.getElementById("newClsInp");
  var name=(inp?inp.value:"").trim();
  if(!name)return;
  if(DB.classes.includes(name)){showSnack("الاسم موجود");return;}
  DB.classes.push(name);DB.data[name]=[];DB.schedule[name]=defaultSchedule();DB.absences[name]={};
  // إضافة أسماء الطلاب إذا تم إدخالها
  var stuInp=document.getElementById("newClsStudents");
  if(stuInp&&stuInp.value.trim()){
    var lines=stuInp.value.split(/\n/).map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
    lines.forEach(function(sname,i){
      DB.data[name].push(emptyStudent(Date.now()+i,sname));
    });
    showSnack("✅ تم إنشاء الفصل وإضافة "+lines.length+" طالب");
  } else {
    showSnack("✅ تم إنشاء الفصل");
  }
  GS.activeClass=name;saveDB();GS.modal=null;renderGrades();
}
function gradesRenameCls(){
  var inp=document.getElementById("renClsInp");
  var nw=(inp?inp.value:"").trim();var old=GS.modal.data.old;
  if(!nw)return;
  if(DB.classes.includes(nw)&&nw!==old){showSnack("الاسم موجود");return;}
  var idx=DB.classes.indexOf(old);if(idx>=0)DB.classes[idx]=nw;
  DB.data[nw]=DB.data[old];delete DB.data[old];
  DB.schedule[nw]=DB.schedule[old]||defaultSchedule();delete DB.schedule[old];
  DB.absences[nw]=DB.absences[old]||{};delete DB.absences[old];
  if(GS.activeClass===old)GS.activeClass=nw;
  saveDB();GS.modal=null;renderGrades();
}
function gradesDelCls(cls){
  DB.classes=DB.classes.filter(function(c){return c!==cls;});
  delete DB.data[cls];delete DB.schedule[cls];delete DB.absences[cls];
  GS.activeClass=DB.classes[0]||"";
  saveDB();GS.modal=null;renderGrades();
}
function gradesSaveRange(){
  var mn=Number(document.getElementById("rMin").value);
  var mx=Number(document.getElementById("rMax").value);
  if(mn>mx){showSnack("الحد الأدنى أكبر من الأقصى");return;}
  GS.distRange={min:mn,max:mx};
  closeModal();
}
function gradesApplyPaste(){
  var ta=document.getElementById("pasteTA");
  var colSel=document.getElementById("pasteColSel");
  if(!ta||!colSel)return;
  var colTarget=colSel.value;
  var tmax=totalMax();
  var maxForCol={total:tmax};allCols().forEach(function(c){maxForCol[c.id]=c.max;});
  var lines=ta.value.trim().split(/\n/).filter(function(l){return l.trim();});
  var ex=DB.data[GS.activeClass];
  var nm={};ex.forEach(function(s,i){nm[s.name]=i;});
  var applied=0,added=0;
  lines.forEach(function(line,li){
    var parts=line.trim().split(/\t|,|  +/);
    var name=parts[0].trim();if(!name)return;
    var hasValue=parts.length>1&&parts[parts.length-1].trim()!=="";
    var valStr=hasValue?parts[parts.length-1].trim():null;
    var isNewStudent=nm[name]===undefined;
    var base=isNewStudent?emptyStudent(Date.now()+li,name):Object.assign({},ex[nm[name]]);
    var p;
    if(valStr===null){
      // Name only — just ensure student exists, don't change grades
      p=base;
    } else if(valStr==="غ"||valStr==="غائب"){
      // Explicit غ for the chosen column only (not all columns)
      p=Object.assign({},base);
      if(colTarget==="total"){
        p=setAllAbsent(p);
      } else {
        p[colTarget]="غ";
      }
    } else if(colTarget==="total"){
      p=distributeTotal(valStr,base)||base;
    } else {
      p=Object.assign({},base);
      var numVal=parseFloat(valStr);
      p[colTarget]=isNaN(numVal)?valStr:Math.min(numVal,maxForCol[colTarget]||999);
    }
    if(!isNewStudent){ex[nm[name]]=p;}else{ex.push(p);nm[name]=ex.length-1;added++;}
    applied++;
  });
  saveDB();GS.modal=null;
  showSnack("✅ تم تطبيق "+applied+" سجل"+(added?" ("+added+" جديد)":""));
  renderGrades();
}

// ── Column config actions ─────────────────────────────
var _dragColSrc=null;
function colDragStart(pgId,i){_dragColSrc={pgId:pgId,i:i};}
function colDragOver(e,i){e.preventDefault();}
function colDrop(e,pgId,destI){
  e.preventDefault();
  if(!_dragColSrc||_dragColSrc.pgId!==pgId)return;
  var pg=null;(DB.colPages||[]).forEach(function(p){if(p.id===pgId)pg=p;});
  if(!pg)return;
  var cols=pg.cols.sort(function(a,b){return a.order-b.order;});
  var moved=cols.splice(_dragColSrc.i,1)[0];
  cols.splice(destI,0,moved);
  cols.forEach(function(c,i){c.order=i;});
  _dragColSrc=null;saveDB();renderGrades();
}
function colToggleVis(pgId,colId,val){
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.cols.forEach(function(c){if(c.id===colId)c.visible=val;});});
  saveDB();renderGrades();
}
function colSetLabel(pgId,colId,val){
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.cols.forEach(function(c){if(c.id===colId)c.label=val;});});
  saveDB();
}
function colSetMax(pgId,colId,val){
  if(isNaN(val)||val<1)return;
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.cols.forEach(function(c){if(c.id===colId)c.max=val;});});
  saveDB();renderGrades();
}
function colDeleteCol(pgId,colId){
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.cols=pg.cols.filter(function(c){return c.id!==colId;});});
  saveDB();renderGrades();
}
function colAddCol(pgId){
  var lbl=(document.getElementById("newColLabel")||{}).value||"";
  var mx=Number((document.getElementById("newColMax")||{}).value)||10;
  if(!lbl.trim()){showSnack("أدخل اسم العمود");return;}
  var id="col_"+Date.now();
  (DB.colPages||[]).forEach(function(pg){
    if(pg.id===pgId){
      var maxOrder=pg.cols.reduce(function(m,c){return Math.max(m,c.order);},0);
      pg.cols.push({id:id,field:id,label:lbl.trim(),max:mx,visible:true,order:maxOrder+1});
    }
  });
  // Ensure all students have this field
  DB.classes.forEach(function(cls){(DB.data[cls]||[]).forEach(function(s){if(s[id]===undefined)s[id]="";});});
  saveDB();renderGrades();
}
function colAddPage(){
  var name=prompt("اسم الصفحة الجديدة:");
  if(!name||!name.trim())return;
  var id="pg_"+Date.now();
  DB.colPages.push({id:id,name:name.trim(),cols:[]});
  GS.modal.data.activePgId=id;
  saveDB();renderGrades();
}
function colRenamePage(pgId,val){
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.name=val;});
  saveDB();
}
function colDeletePage(pgId){
  if(DB.colPages.length<=1){showSnack("لا يمكن حذف الصفحة الأخيرة");return;}
  DB.colPages=DB.colPages.filter(function(pg){return pg.id!==pgId;});
  GS.modal.data.activePgId=DB.colPages[0].id;
  saveDB();renderGrades();
}

// ── Grades Excel Export — كل فصل ورقتان (أسابيع 1-6 ثم 7-12 + تجميعات) ──
function gradesExportExcel(){
  try{
    var wb=XLSX.utils.book_new();
    var _aw=Math.min(Math.max(1,Number((DB.meta||{}).activeWeeks)||14),ALL_WEEKS.length);
    // نستخدم 12 أسبوع فقط (أو activeWeeks إذا أقل)
    var EXPORT_WEEKS=ALL_WEEKS.slice(0,Math.min(_aw,12));
    var PART_SIZE=6; // عدد الأسابيع في كل ورقة
    var weeks_p1=EXPORT_WEEKS.slice(0,PART_SIZE);
    var weeks_p2=EXPORT_WEEKS.slice(PART_SIZE);

    // تاريخ بداية الأسبوع
    function weekLabel(w){
      if(!DB.meta.startDate)return"أسبوع "+w;
      var d=new Date(DB.meta.startDate);
      d.setDate(d.getDate()+(w-1)*7);
      return d.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit"});
    }

    // تنسيق خلية (نمط)
    function cellStyle(bold,bgRGB,fgRGB,sz,hAlign){
      return{
        font:{bold:!!bold,sz:sz||9,color:{rgb:fgRGB||"000000"},name:"Arial"},
        fill:{patternType:"solid",fgColor:{rgb:bgRGB||"FFFFFF"}},
        alignment:{horizontal:hAlign||"center",vertical:"center",wrapText:true,readingOrder:2},
        border:{
          top:{style:"thin",color:{rgb:"AAAAAA"}},
          bottom:{style:"thin",color:{rgb:"AAAAAA"}},
          left:{style:"thin",color:{rgb:"AAAAAA"}},
          right:{style:"thin",color:{rgb:"AAAAAA"}}
        }
      };
    }

    // حساب طالب مع قائمة أسابيع مخصصة
    function calcWithWeeks(s,weeks){
      if(s._totalAbsent)return{avgA:0,avgH:0,beh:0,ex:0,total:0,absent:true};
      var aSum=0,aC=0,hSum=0,hC=0;
      weeks.forEach(function(w){
        var av=s["a"+w],hv=s["h"+w];
        if(av!==""&&av!==undefined&&av!==null&&av!=="م"){var n=av==="غ"?0:Math.min(Number(av)||0,20);aSum+=n;aC++;}
        if(hv!==""&&hv!==undefined&&hv!==null&&hv!=="م"){var m=hv==="غ"?0:Math.min(Number(hv)||0,10);hSum+=m;hC++;}
      });
      var e1=s.ex1,e2=s.ex2;
      function nv(v,mx){if(v===""||v===undefined||v===null||v==="م")return 0;if(v==="غ")return 0;return Math.min(Number(v)||0,mx);}
      // متوسط درجات السلوك الأسبوعية (bw1..bwN) للأسابيع المُدرجة فقط
      var bwSum=0,bwCnt=0;
      weeks.forEach(function(w){
        var bv=s["bw"+w];
        if(bv!==""&&bv!==undefined&&bv!==null&&bv!=="م"&&(bv==="غ"||!isNaN(Number(bv)))){
          var bn=bv==="غ"?0:Math.min(Number(bv)||0,10);
          bwSum+=bn;bwCnt++;
        }
      });
      var beh=bwCnt>0?Math.round(bwSum/bwCnt):0;
      var ex =Math.min(nv(e1,15)+nv(e2,15),30);
      var avgA=aC?Math.round(aSum/aC):0;
      var avgH=hC?Math.round(hSum/hC):0;
      return{avgA:avgA,avgH:avgH,beh:beh,ex:ex,total:avgA+avgH+beh+ex,absent:false};
    }

    // بناء ورقة واحدة
    function buildSheet(cls,weeks,partNum,isSecond){
      var sts=(DB.data[cls]||[]).filter(function(s){return s.name;});
      if(!sts.length)return null;
      var school=(DB.meta.schoolName)||"Dalty Grades";
      var teacher=(DB.meta.teacherName)||"";
      var subject=DB.meta.subject||"العلوم";
      var clsClean=cls.replace(/[:\\/?*\[\]]/g,"_");

      // ── بناء مصفوفة البيانات (AOA) ──
      // صف 0: عنوان المدرسة
      var titleRow=[];
      var _exSem=(Number(DB.meta.semester)===2?"الفصل الدراسي الثاني":"الفصل الدراسي الأول");var _exYr=DB.meta.schoolYear||"2025 / 2026";      titleRow[0]=school+"   —   "+subject+"   —   "+cls+"   |   "+_exSem+"  "+_exYr+" م";
      // صف 1: عنوان الكشف
      var _semLbl=(Number(DB.meta.semester)===2?"الفصل الدراسي الثاني":"الفصل الدراسي الأول");var _yrLbl=(DB.meta.schoolYear||"2025 / 2026");var subTitle="كشف تفريغ درجات — "+_semLbl+" "+_yrLbl+"   |   الجزء "+partNum+"/2   |   أسابيع "+weeks[0]+"–"+weeks[weeks.length-1];
      var subRow=[];subRow[0]=subTitle;
      // صف 2: فاصل
      // صف 3: رأس التواريخ (merged pairs)
      var dateRow=["م","اسم الطالب"];
      weeks.forEach(function(w){dateRow.push(weekLabel(w),"");});
      if(isSecond){dateRow.push("","","م.السلوك","الاختبارات","م.تقييم","م.واجب","الإجمالي /70");}
      // صف 4: رأس الأعمدة
      var hdrRow=["م","اسم الطالب"];
      weeks.forEach(function(w){hdrRow.push("تقييم "+w+"\n/20","واجب "+w+"\n/10");});
      if(isSecond){hdrRow.push("واجب14\n/10","اختبار2\n/15","م.سلوك\n/10","اختبارات\n/30","م.تقييم\n/20","م.واجب\n/10","الإجمالي\n/70");}
      // صف 5: الحد الأقصى
      var maxRow=["",""];
      weeks.forEach(function(){maxRow.push(20,10);});
      if(isSecond){maxRow.push(10,15,10,30,20,10,70);}

      var aoa=[titleRow,subRow,[],dateRow,hdrRow,maxRow];

      // صفوف الطلاب
      var totalsArr=[];
      sts.forEach(function(s,i){
        var calc=calcWithWeeks(s,EXPORT_WEEKS);
        var row=[i+1,s.name];
        weeks.forEach(function(w){
          var av=s["a"+w],hv=s["h"+w];
          row.push(av===""||av===undefined?"-":av, hv===""||hv===undefined?"-":hv);
        });
        if(isSecond){
          if(s._totalAbsent||calc.absent){
            row.push("غ","غ","غ","غ","غ","غ","غ");
          } else {
            var h14v=s["h14"];var e2v=s["ex2"];
            row.push(
              h14v===""||h14v===undefined?"-":h14v,
              e2v===""||e2v===undefined?"-":e2v,
              calc.beh,calc.ex,calc.avgA,calc.avgH,calc.total
            );
            totalsArr.push(calc.total);
          }
        }
        aoa.push(row);
      });

      // صف التوقيعات
      aoa.push([]);
      var sigRow=["توقيع معلم المادة","","ا/ "+teacher,"","","مدير المدرسة"];
      aoa.push(sigRow);

      // صف المتوسط (ورقة 2 فقط)
      if(isSecond&&totalsArr.length){
        var avgTotal=Math.round(totalsArr.reduce(function(a,b){return a+b;},0)/totalsArr.length);
        var passCount=totalsArr.filter(function(t){return t>=60;}).length;
        aoa.push([]);
        aoa.push(["","المتوسط العام: "+avgTotal+" / 70","","","","ناجح: "+passCount+" / "+sts.length]);
      }

      // ── إنشاء الورقة ──
      var ws=XLSX.utils.aoa_to_sheet(aoa);

      // عرض الأعمدة
      var colWidths=[{wch:3},{wch:28}];
      weeks.forEach(function(){colWidths.push({wch:5},{wch:5});});
      if(isSecond){colWidths.push({wch:5},{wch:5},{wch:5},{wch:6},{wch:5},{wch:5},{wch:6});}
      ws["!cols"]=colWidths;

      // ارتفاع الصفوف
      ws["!rows"]=[{hpt:22},{hpt:18},{hpt:6},{hpt:20},{hpt:28},{hpt:14}];

      // الدمج (merges)
      var totalCols=2+weeks.length*2+(isSecond?7:0);
      var merges=[
        {s:{r:0,c:0},e:{r:0,c:totalCols-1}},  // عنوان
        {s:{r:1,c:0},e:{r:1,c:totalCols-1}},  // عنوان فرعي
        {s:{r:2,c:0},e:{r:2,c:totalCols-1}},  // فاصل
      ];
      // دمج أزواج التواريخ
      weeks.forEach(function(w,i){
        var c=2+i*2;
        merges.push({s:{r:3,c:c},e:{r:3,c:c+1}});
      });
      // دمج م وأسم الطالب في صفوف 3-4
      merges.push({s:{r:3,c:0},e:{r:4,c:0}});
      merges.push({s:{r:3,c:1},e:{r:4,c:1}});
      ws["!merges"]=merges;

      // ── تطبيق الألوان والأنماط ──
      var HDR_BG="1F4E79",HDR_FG="FFFFFF";
      var WK_BG ="153580",WK_FG ="FFFFFF";
      var SUM_BG ="0A2A5E",SUM_FG ="FFFFFF";
      var DATE_BG="2E75B6",DATE_FG="FFFFFF";
      var MAX_BG ="BDD7EE",MAX_FG ="000000";
      var TITLE_BG="DEEAF1";
      var ALT_BG ="EEF3FB";

      function setStyle(r,c,bold,bg,fg,sz,ha){
        var addr=XLSX.utils.encode_cell({r:r,c:c});
        if(!ws[addr])ws[addr]={v:"",t:"s"};
        ws[addr].s=cellStyle(bold,bg,fg,sz,ha);
      }

      // صف العنوان
      setStyle(0,0,true,TITLE_BG,"1F4E79",12,"center");
      // صف العنوان الفرعي
      setStyle(1,0,true,"E9F0FA","1F4E79",10,"center");

      // صف التواريخ (صف 3)
      setStyle(3,0,true,HDR_BG,HDR_FG,9,"center");
      setStyle(3,1,true,HDR_BG,HDR_FG,9,"center");
      weeks.forEach(function(w,i){
        var c=2+i*2;
        setStyle(3,c,true,DATE_BG,DATE_FG,9,"center");
      });
      if(isSecond){
        var sc=2+weeks.length*2;
        ["","","م.السلوك","الاختبارات","م.تقييم","م.واجب","الإجمالي"].forEach(function(lbl,k){
          setStyle(3,sc+k,true,SUM_BG,SUM_FG,8,"center");
        });
      }

      // صف رأس الأعمدة (صف 4)
      setStyle(4,0,true,HDR_BG,HDR_FG,9,"center");
      setStyle(4,1,true,HDR_BG,HDR_FG,9,"right");
      weeks.forEach(function(w,i){
        setStyle(4,2+i*2,true,WK_BG,WK_FG,8,"center");
        setStyle(4,3+i*2,true,WK_BG,WK_FG,8,"center");
      });
      if(isSecond){
        var sc2=2+weeks.length*2;
        for(var k2=0;k2<7;k2++)setStyle(4,sc2+k2,true,SUM_BG,SUM_FG,8,"center");
      }

      // صف الحد الأقصى (صف 5)
      setStyle(5,0,true,MAX_BG,MAX_FG,8,"center");
      setStyle(5,1,true,MAX_BG,MAX_FG,8,"center");
      var totCols2=2+weeks.length*2+(isSecond?7:0);
      for(var ci=2;ci<totCols2;ci++)setStyle(5,ci,true,MAX_BG,MAX_FG,8,"center");

      // صفوف الطلاب (تبدأ من صف 6)
      sts.forEach(function(s,i){
        var r=6+i;
        var bg=i%2===0?"FFFFFF":ALT_BG;
        var totCols3=2+weeks.length*2+(isSecond?7:0);
        for(var ci2=0;ci2<totCols3;ci2++){
          var isSumCol=isSecond&&ci2>=2+weeks.length*2;
          var isNameCol=ci2===1;
          var isLastCol=isSecond&&ci2===totCols3-1;
          var cellBg=isSumCol?(ci2===totCols3-1?"E2EFDA":(ci2===totCols3-2||ci2===totCols3-3?"DEEAF1":"F0F7FF")):bg;
          var cellFg="000000";
          // تلوين الغياب
          var addr2=XLSX.utils.encode_cell({r:r,c:ci2});
          var cellV=ws[addr2]?ws[addr2].v:"";
          if(cellV==="غ"){cellBg="FFE0E0";cellFg="C00000";}
          // تلوين المجموع
          if(isLastCol&&typeof cellV==="number"){
            var pct=cellV/70*100;
            if(pct>=85)cellBg="C6EFCE";
            else if(pct>=70)cellBg="BDD7EE";
            else if(pct>=55)cellBg="FFEB9C";
            else if(pct>=40)cellBg="FFCC99";
            else cellBg="FFC7CE";
          }
          var ha2=isNameCol?"right":"center";
          setStyle(r,ci2,true,cellBg,cellFg,isNameCol?9:9,ha2);
        }
      });

      return ws;
    }

    // ── بناء الكتاب ──
    DB.classes.forEach(function(cls){
      var sts=(DB.data[cls]||[]).filter(function(s){return s.name;});
      if(!sts.length)return;
      var clsClean=cls.replace(/[:\\/?*\[\]]/g,"_");
      // ورقة 1: أسابيع 1-6
      if(weeks_p1.length){
        var ws1=buildSheet(cls,weeks_p1,1,false);
        if(ws1)XLSX.utils.book_append_sheet(wb,ws1,(clsClean+" أسابيع1-6").substring(0,31));
      }
      // ورقة 2: أسابيع 7-12 + تجميعات
      if(weeks_p2.length){
        var ws2=buildSheet(cls,weeks_p2,2,true);
        if(ws2)XLSX.utils.book_append_sheet(wb,ws2,(clsClean+" أسابيع7-12").substring(0,31));
      }
    });

    if(!wb.SheetNames.length){alert("لا بيانات للتصدير");return;}
    XLSX.writeFile(wb,"كشف_درجات_"+(DB.meta.subject||"العلوم")+".xlsx");
    showSnack("✅ تم تصدير الكشف — ورقتان لكل فصل","","ok");
  }catch(e){alert("خطأ في التصدير: "+e.message);console.error(e);}
}

// ══════════════════════════════════════════════════════
// CUSTOM EXPORT — كشف مخصص (متوسطات + مجموع + غياب)
// ══════════════════════════════════════════════════════
function gradesExportCustom(){
  try{
    var wb=XLSX.utils.book_new();
    var subject  = DB.meta.subject   || "المادة";
    var teacher  = DB.meta.teacherName || "";
    var school   = DB.meta.schoolName || "Dalty Grades";
    var today    = new Date().toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"});
    var FONT     = "Times New Roman";
    var SZ       = 12;   // حجم الخط الأساسي
    var SZ_HDR   = 13;   // حجم رأس الجدول
    var SZ_TITLE = 14;   // حجم عنوان الصفحة

    // ─── أنماط الخلايا ─────────────────────────────────
    function _border(style){
      return{top:{style:style,color:{rgb:"AAAAAA"}},bottom:{style:style,color:{rgb:"AAAAAA"}},
             left:{style:style,color:{rgb:"AAAAAA"}},right:{style:style,color:{rgb:"AAAAAA"}}};
    }
    function _style(bold,bgRGB,fgRGB,sz,hAlign,wrapText,borderStyle){
      return{
        font:{bold:!!bold,sz:sz||SZ,color:{rgb:fgRGB||"1A1A1A"},name:FONT},
        fill:{patternType:"solid",fgColor:{rgb:bgRGB||"FFFFFF"}},
        alignment:{horizontal:hAlign||"center",vertical:"center",wrapText:!!wrapText,readingOrder:2},
        border:_border(borderStyle||"thin")
      };
    }
    // أنماط جاهزة
    var ST_TITLE  = _style(true,"1F4E79","FFFFFF",SZ_TITLE,"center",false,"medium");
    var ST_META   = _style(false,"DEEAF1","1A3A6E",SZ,"center",false,"thin");
    var ST_HDR    = _style(true,"1F4E79","FFFFFF",SZ_HDR,"center",true,"medium");
    var ST_HDR_N  = _style(true,"1F4E79","FFFFFF",SZ_HDR,"right",  false,"medium");
    var ST_HDR_AVG= _style(true,"1A4E8A","FFFFFF",SZ_HDR,"center",true,"medium");
    var ST_HDR_TOT= _style(true,"0A2A5E","FFFFFF",SZ_HDR,"center",true,"medium");
    var ST_HDR_ABS= _style(true,"4A1010","FFFFFF",SZ_HDR,"center",true,"medium");
    var ST_DATA   = _style(false,"FFFFFF","1A1A1A",SZ,"center",false,"thin");
    var ST_DATA_N = _style(false,"FFFFFF","1A1A1A",SZ,"right", false,"thin");
    var ST_ABSENT = _style(true, "FFE0E0","C00000",SZ,"center",false,"thin");
    var ST_TOTAL_H= _style(true, "C6EFCE","1A5928",SZ,"center",false,"thin");
    var ST_TOTAL_M= _style(true, "FFEB9C","7D4E00",SZ,"center",false,"thin");
    var ST_TOTAL_L= _style(true, "FFC7CE","9C0006",SZ,"center",false,"thin");
    var ST_AVG    = _style(false,"EEF4FF","1A3A6E",SZ,"center",false,"thin");
    var ST_FOOTER = _style(false,"F5F5F5","444444",SZ-1,"right", false,"thin");
    var ST_SIG_LBL= _style(true, "F0F4FF","1A3A6E",SZ,"center",false,"thin");
    var ST_SIG_VAL= _style(false,"FFFFFF","444444",SZ,"center",false,"medium");
    var ST_EMPTY  = _style(false,"FFFFFF","FFFFFF",SZ,"center",false,"thin");

    function setCell(ws,r,c,val,style,type){
      if(r===undefined||r===null||c===undefined||c===null)return;
      var addr=XLSX.utils.encode_cell({r:r,c:c});
      var safeVal=(val===undefined||val===null)?"":val;
      var t=type||(typeof safeVal==="number"?"n":"s");
      ws[addr]={v:safeVal,t:t};
      if(style)ws[addr].s=style;
    }
    function mergeRange(ws,r1,c1,r2,c2){
      if(!ws["!merges"])ws["!merges"]=[];
      ws["!merges"].push({s:{r:r1,c:c1},e:{r:r2,c:c2}});
    }

    // ─── بناء ورقة فصل — ديناميكي حسب الصفحة النشطة ──────
    function buildCustomSheet(cls){
      var students=(DB.data[cls]||[]).filter(function(s){return s.name&&s.name.trim();});
      if(!students.length)return null;
      var ws={};
      var tmax=totalMax();
      var activePage=GS.activePage||"pg_home";
      var _aw=Math.min(Math.max(1,Number((DB.meta||{}).activeWeeks)||14),ALL_WEEKS.length);
      var _awSet={};ALL_WEEKS.slice(0,_aw).forEach(function(w){_awSet[w]=true;});
      function _colInActiveWeeks(c){
        if(c.id==="ex1"||c.id==="ex2")return true;
        var m=c.id.match(/\d+$/);return m?!!_awSet[Number(m[0])]:true;
      }

      // ── تحديد الأعمدة الديناميكية ──────────────────────
      // كل عمود: {key, label, maxVal, getVal(s), style, width}
      var dynCols=[];

      if(activePage==="pg_home"){
        // الرئيسية: نفس منطق homeColVis
        var _hv=_getHomeColVis();
        var assessPg=null,hwPg=null,behPg=null;
        (DB.colPages||[]).forEach(function(pg){
          if(pg.id==="pg_assess")assessPg=pg;
          if(pg.id==="pg_hw")hwPg=pg;
          if(pg.id==="pg_beh")behPg=pg;
        });
        var visWeeks=ALL_WEEKS.slice(0,_aw).filter(function(w){
          if(!assessPg)return true;
          var col=(assessPg.cols||[]).find(function(c){return c.id==="a"+w;});
          return col?col.visible:true;
        });
        // أعمدة الاختبارات (تقييم/واجب/سلوك) لكل أسبوع
        visWeeks.forEach(function(w){
          var _w=w; // capture
          if(_hv.assess!==false){
            var aMax=20;
            if(assessPg)(assessPg.cols||[]).forEach(function(c){if(c.field==="a"+_w)aMax=c.max;});
            (function(wk,mx){
              dynCols.push({label:"تقييم\nأسبوع "+wk+"\n/"+mx,maxVal:mx,width:8,
                getVal:function(s){var v=s["a"+wk];return(v===""||v===undefined)?"-":v;},
                styleData:function(v){return(v==="غ"||v==="م")?ST_ABSENT:ST_DATA;},
                styleHdr:_style(true,"1F4E79","FFFFFF",SZ_HDR,"center",true,"medium")
              });
            })(_w,aMax);
          }
          if(_hv.hw!==false){
            var hMax=10;
            if(hwPg)(hwPg.cols||[]).forEach(function(c){if(c.field==="h"+_w)hMax=c.max;});
            (function(wk,mx){
              dynCols.push({label:"واجب\nأسبوع "+wk+"\n/"+mx,maxVal:mx,width:8,
                getVal:function(s){var v=s["h"+wk];return(v===""||v===undefined)?"-":v;},
                styleData:function(v){return(v==="غ"||v==="م")?ST_ABSENT:ST_DATA;},
                styleHdr:_style(true,"153580","FFFFFF",SZ_HDR,"center",true,"medium")
              });
            })(_w,hMax);
          }
          if(_hv.beh!==false){
            var bMax=10;
            if(behPg)(behPg.cols||[]).forEach(function(c){if(c.field==="bw"+_w)bMax=c.max;});
            (function(wk,mx){
              dynCols.push({label:"سلوك\nأسبوع "+wk+"\n/"+mx,maxVal:mx,width:8,
                getVal:function(s){var v=s["bw"+wk];return(v===""||v===undefined)?"-":v;},
                styleData:function(v){return(v==="غ"||v==="م")?ST_ABSENT:ST_DATA;},
                styleHdr:_style(true,"5B1A6E","FFFFFF",SZ_HDR,"center",true,"medium")
              });
            })(_w,bMax);
          }
        });
        // أعمدة الإجماليات
        if(_hv.avgAssess!==false)dynCols.push({label:"متوسط\nتقييم\n/20",maxVal:20,width:10,isCalc:"avgAssess",
          styleHdr:_style(true,"1A4E8A","FFFFFF",SZ_HDR,"center",true,"medium"),
          styleData:function(){return ST_AVG;}
        });
        if(_hv.avgHw!==false)dynCols.push({label:"متوسط\nواجب\n/10",maxVal:10,width:10,isCalc:"avgHw",
          styleHdr:_style(true,"1A4E8A","FFFFFF",SZ_HDR,"center",true,"medium"),
          styleData:function(){return ST_AVG;}
        });
        if(_hv.avgBeh!==false)dynCols.push({label:"متوسط\nسلوك\n/10",maxVal:10,width:10,isCalc:"avgBeh",
          styleHdr:_style(true,"3B1265","FFFFFF",SZ_HDR,"center",true,"medium"),
          styleData:function(){return ST_AVG;}
        });
        if(_hv.total!==false)dynCols.push({label:"المجموع\n/"+tmax,maxVal:tmax,width:10,isCalc:"total",
          styleHdr:ST_HDR_TOT,
          styleData:function(v,s){
            var pct=tmax>0?v/tmax*100:0;
            return s._totalAbsent?ST_ABSENT:(pct>=70?ST_TOTAL_H:(pct>=40?ST_TOTAL_M:ST_TOTAL_L));
          }
        });
        if(_hv.dist!==false){/* skip توزيع in export */}
        // غياب دائماً
        dynCols.push({label:"الغياب\nفترة",maxVal:null,width:8,isCalc:"abs",
          styleHdr:ST_HDR_ABS,
          styleData:function(v){return v>0?ST_ABSENT:ST_DATA;}
        });
      } else {
        // صفحة عادية: الأعمدة المرئية من pg
        var activePg=null;
        (DB.colPages||[]).forEach(function(pg){if(pg.id===activePage)activePg=pg;});
        if(!activePg)return null;
        var pageCols=(activePg.cols||[]).filter(function(c){return c.visible&&_colInActiveWeeks(c);}).sort(function(a,b){return a.order-b.order;});
        pageCols.forEach(function(c){
          (function(field,label,maxV){
            dynCols.push({label:label+"\n/"+maxV,maxVal:maxV,width:8,
              getVal:function(s){var v=s[field];return(v===""||v===undefined)?"-":v;},
              styleData:function(v){return(v==="غ"||v==="م")?ST_ABSENT:ST_DATA;},
              styleHdr:_style(true,"1F4E79","FFFFFF",SZ_HDR,"center",true,"medium")
            });
          })(c.field,c.label,c.max);
        });
        // متوسط تقييم + متوسط واجب + سلوك + مجموع دائماً في نهاية الصفحات العادية
        if(activePage==="pg_assess"||activePage==="pg_hw"||activePage==="pg_other"){
          dynCols.push({label:"متوسط\nتقييم\n/20",maxVal:20,width:10,isCalc:"avgAssess",
            styleHdr:_style(true,"1A4E8A","FFFFFF",SZ_HDR,"center",true,"medium"),styleData:function(){return ST_AVG;}});
          dynCols.push({label:"متوسط\nواجب\n/10",maxVal:10,width:10,isCalc:"avgHw",
            styleHdr:_style(true,"1A4E8A","FFFFFF",SZ_HDR,"center",true,"medium"),styleData:function(){return ST_AVG;}});
          dynCols.push({label:"المجموع\n/"+tmax,maxVal:tmax,width:10,isCalc:"total",
            styleHdr:ST_HDR_TOT,styleData:function(v,s){
              var pct=tmax>0?v/tmax*100:0;return s._totalAbsent?ST_ABSENT:(pct>=70?ST_TOTAL_H:(pct>=40?ST_TOTAL_M:ST_TOTAL_L));
            }});
        }
        if(activePage==="pg_beh"){
          dynCols.push({label:"متوسط\nسلوك\n/10",maxVal:10,width:10,isCalc:"avgBeh",
            styleHdr:_style(true,"3B1265","FFFFFF",SZ_HDR,"center",true,"medium"),styleData:function(){return ST_AVG;}});
        }
        // غياب دائماً
        dynCols.push({label:"الغياب\nفترة",maxVal:null,width:8,isCalc:"abs",
          styleHdr:ST_HDR_ABS,styleData:function(v){return v>0?ST_ABSENT:ST_DATA;}});
      }

      if(!dynCols.length)return null;
      var TOTAL_COLS=2+dynCols.length; // م + اسم + dynCols

      // ── تسمية الصفحة للعنوان ──
      var pageLabel="الرئيسية";
      if(activePage!=="pg_home"){
        var _apg=(DB.colPages||[]).find(function(p){return p.id===activePage;});
        if(_apg)pageLabel=_apg.name;
      }

      // ── الصف 0: اسم المدرسة (يمين) + اسم الفصل (يسار) ──
      var ST_SCHOOL = _style(true,"1F4E79","FFFFFF",SZ_TITLE,"right",false,"medium");
      var ST_CLS_R  = _style(true,"1F4E79","FFFFFF",SZ_TITLE,"left", false,"medium");
      var ST_EMPTY_H= _style(false,"1F4E79","1F4E79",SZ,"center",false,"medium");
      var halfC=Math.floor(TOTAL_COLS/2);
      // يمين: اسم المدرسة
      setCell(ws,0,0,school,ST_SCHOOL);
      mergeRange(ws,0,0,0,halfC-1);
      // يسار: اسم الفصل
      setCell(ws,0,halfC,cls,ST_CLS_R);
      mergeRange(ws,0,halfC,0,TOTAL_COLS-1);

      // ── الصف 1: عنوان الكشف الكامل ──
      var _semLbl=(Number(DB.meta.semester)===2?"الفصل الدراسي الثاني":"الفصل الدراسي الأول");
      var _yrLbl=DB.meta.schoolYear||"2025 / 2026";
      var fullTitle="كشف تفريغ درجات مادة "+subject+" — "+_semLbl+" "+_yrLbl;
      var ST_SUBTITLE=_style(true,"DEEAF1","1A3A6E",SZ+1,"center",false,"medium");
      setCell(ws,1,0,fullTitle,ST_SUBTITLE);
      mergeRange(ws,1,0,1,TOTAL_COLS-1);

      // ── الصف 2: رأس الجدول ──
      var HDR_ROW=2;
      setCell(ws,HDR_ROW,0,"م",ST_HDR);
      setCell(ws,HDR_ROW,1,"اسم الطالب",ST_HDR_N);
      dynCols.forEach(function(col,i){
        setCell(ws,HDR_ROW,2+i,col.label,col.styleHdr);
      });

      // ── صفوف الطلاب ──
      var DATA_START=3;
      var totals=[];
      students.forEach(function(s,i){
        var r=DATA_START+i;
        var res=calcStudent(s,cls);
        var tot=res.total;
        totals.push(tot);

        setCell(ws,r,0,i+1,ST_DATA);
        setCell(ws,r,1,s.name,ST_DATA_N);

        dynCols.forEach(function(col,ci){
          try{
            var rawVal,dispVal,cellStyle;
            if(col.isCalc){
              if(col.isCalc==="abs"){rawVal=absVal;dispVal=absVal;}
              else if(col.isCalc==="total"){rawVal=s._totalAbsent?"غ":tot;dispVal=rawVal;}
              else if(col.isCalc==="avgAssess"){rawVal=s._totalAbsent?"غ":res.avgAssess;dispVal=rawVal;}
              else if(col.isCalc==="avgHw"){rawVal=s._totalAbsent?"غ":res.avgHw;dispVal=rawVal;}
              else if(col.isCalc==="avgBeh"){rawVal=s._totalAbsent?"غ":res.avgBeh;dispVal=rawVal;}
              else{rawVal="-";dispVal="-";}
              cellStyle=col.styleData?col.styleData(rawVal,s):ST_DATA;
            } else {
              rawVal=col.getVal?col.getVal(s):"-";
              dispVal=rawVal;
              cellStyle=col.styleData?col.styleData(rawVal):ST_DATA;
            }
            if(dispVal===undefined||dispVal===null)dispVal="-";
            var t=(typeof dispVal==="number")?"n":"s";
            setCell(ws,r,2+ci,dispVal,cellStyle,t);
          }catch(e){setCell(ws,r,2+ci,"-",ST_DATA);}
        });
      });

      // ── صف فاصل ──
      var SEP_ROW=DATA_START+students.length;
      for(var ci=0;ci<TOTAL_COLS;ci++)setCell(ws,SEP_ROW,ci,"",ST_EMPTY);

      // ── صف الإحصائيات ──
      var STAT_ROW=SEP_ROW+1;
      var numTotals=totals.filter(function(t){return typeof t==="number";});
      if(numTotals.length){
        var avg=Math.round(numTotals.reduce(function(a,b){return a+b;},0)/numTotals.length);
        var passCount=numTotals.filter(function(t){return t>=Math.round(tmax/2);}).length;
        var lastC=TOTAL_COLS-1;
        setCell(ws,STAT_ROW,0,"إحصائيات",_style(true,"0A2A5E","FFFFFF",SZ,"center",false,"medium"));
        mergeRange(ws,STAT_ROW,0,STAT_ROW,1);
        var midC=Math.floor(TOTAL_COLS/2);
        setCell(ws,STAT_ROW,2,"متوسط الفصل: "+avg,_style(true,"EEF4FF","1A3A6E",SZ,"center",false,"thin"));
        mergeRange(ws,STAT_ROW,2,STAT_ROW,midC);
        setCell(ws,STAT_ROW,midC+1,"ناجح: "+passCount+"/"+students.length,_style(true,"C6EFCE","1A5928",SZ,"center",false,"thin"));
        mergeRange(ws,STAT_ROW,midC+1,STAT_ROW,lastC-1);
        setCell(ws,STAT_ROW,lastC,"راسب: "+(students.length-passCount)+"/"+students.length,_style(true,"FFC7CE","9C0006",SZ,"center",false,"thin"));
      }

      // ── ذيل: توقيع + تاريخ طباعة ──
      var SIG_ROW=STAT_ROW+2;
      var half=Math.floor(TOTAL_COLS/2)-1;
      setCell(ws,SIG_ROW,0,"توقيع المعلم",ST_SIG_LBL);
      mergeRange(ws,SIG_ROW,0,SIG_ROW,half);
      setCell(ws,SIG_ROW,half+2,"تاريخ الطباعة",ST_SIG_LBL);
      mergeRange(ws,SIG_ROW,half+2,SIG_ROW,TOTAL_COLS-1);
      setCell(ws,SIG_ROW+1,0,"أ/ "+teacher,ST_SIG_VAL);
      mergeRange(ws,SIG_ROW+1,0,SIG_ROW+1,half);
      setCell(ws,SIG_ROW+1,half+2,today,ST_SIG_VAL);
      mergeRange(ws,SIG_ROW+1,half+2,SIG_ROW+1,TOTAL_COLS-1);
      setCell(ws,SIG_ROW,half+1,"",ST_EMPTY);
      setCell(ws,SIG_ROW+1,half+1,"",ST_EMPTY);

      // ── ارتفاع الصفوف ──
      var rowH=[];
      rowH[0]={hpt:26};  // اسم المدرسة + الفصل
      rowH[1]={hpt:24};  // عنوان الكشف الكامل
      rowH[2]={hpt:36};  // رأس الجدول
      for(var ri=DATA_START;ri<DATA_START+students.length;ri++)rowH[ri]={hpt:20};
      rowH[SEP_ROW]={hpt:6};rowH[STAT_ROW]={hpt:20};
      rowH[SIG_ROW]={hpt:18};rowH[SIG_ROW+1]={hpt:24};
      ws["!rows"]=rowH;

      // ── عرض الأعمدة ──
      var colWidths=[{wch:4},{wch:30}];
      dynCols.forEach(function(col){colWidths.push({wch:col.width||9});});
      ws["!cols"]=colWidths;

      // ── نطاق الورقة ──
      ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:SIG_ROW+1,c:TOTAL_COLS-1}});
      return ws;
    }

    // ─── بناء الكتاب ─────────────────────────────────────
    var exported=0;
    DB.classes.forEach(function(cls){
      var sts=(DB.data[cls]||[]).filter(function(s){return s.name&&s.name.trim();});
      if(!sts.length)return;
      var ws=buildCustomSheet(cls);
      if(ws){
        var sheetName=cls.replace(/[:\\/?*\[\]]/g,"_").substring(0,31);
        XLSX.utils.book_append_sheet(wb,ws,sheetName);
        exported++;
      }
    });

    if(!exported){alert("لا توجد بيانات للتصدير");return;}
    var _activePgLabel="الرئيسية";
    if(GS.activePage!=="pg_home"){
      var _apgF=(DB.colPages||[]).find(function(p){return p.id===GS.activePage;});
      if(_apgF)_activePgLabel=_apgF.name;
    }
    var fname="كشف_"+_activePgLabel+"_"+(subject)+"_"+today.replace(/[\s\/]/g,"_")+".xlsx";
    XLSX.writeFile(wb,fname);
    showSnack("✅ تم تصدير كشف ["+_activePgLabel+"] ("+exported+" فصل)","","ok");
  }catch(e){alert("خطأ في التصدير: "+e.message);console.error(e);}
}
window.gradesExportCustom=gradesExportCustom;



// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// روابط استمارة تسجيل بيانات الطلاب
// ══════════════════════════════════════════════════════

function showStudentFormLinks(){
  var cls = GS.activeClass;
  if(!cls){ alert('اختاري فصلاً أولاً'); return; }
  var students = DB.data[cls] || [];
  if(!students.length){ alert('لا يوجد طلاب في هذا الفصل'); return; }

  // رابط أساسي للتطبيق (نفس النطاق)
  var baseUrl = location.origin + location.pathname.replace('index.html','') + 'student-form.html';

  var modal = document.createElement('div');
  modal.id = 'formLinksModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';

  var inner = document.createElement('div');
  inner.style.cssText = 'background:#111827;border:1px solid #1e3a5f;border-radius:16px;width:100%;max-width:480px;margin:auto;overflow:hidden;';

  // رأس النافذة
  var head = '<div style="background:#0d1a35;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e3a5f;">'
    + '<span style="font-weight:900;font-size:15px;">📲 روابط التسجيل — '+esc(cls)+'</span>'
    + '<button onclick="document.getElementById(\'formLinksModal\').remove()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">✕</button>'
    + '</div>';

  // زر "نسخ كل الروابط"
  var allLinks = students.map(function(s){
    return s.name + ':\n' + buildFormUrl(baseUrl, s, cls);
  }).join('\n\n');

  var controls = '<div style="padding:12px 14px;background:#0a0f1e;border-bottom:1px solid #1e3a5f;display:flex;gap:8px;">'
    + '<button onclick="copyText(\''+encodeAllLinks(allLinks)+'\',this)" style="flex:1;padding:9px;background:#7c3aed;color:white;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📋 نسخ كل الروابط</button>'
    + '<button onclick="shareAllWhatsApp(\''+encodeAllLinks(allLinks)+'\')" style="flex:1;padding:9px;background:#16a34a;color:white;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">💬 واتساب</button>'
    + '</div>';

  // قائمة الطلاب
  var list = '<div style="padding:10px 14px;max-height:55vh;overflow-y:auto;">';
  students.forEach(function(s, i){
    var url = buildFormUrl(baseUrl, s, cls);
    list += '<div style="background:#0d1526;border:1px solid #1e3a5f;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">'
      + '<span style="background:#1e3a5f;color:#7dd3fc;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">'+(i+1)+'</span>'
      + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">'+esc(s.name)+'</div>'
        + '<div style="font-size:10px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+url+'</div>'
      + '</div>'
      + '<div style="display:flex;gap:5px;flex-shrink:0;">'
        + '<button onclick="copyText(\''+encodeURIComponent(url)+'\',this)" title="نسخ" style="padding:6px 8px;background:#1e3a5f;color:#7dd3fc;border:none;border-radius:7px;cursor:pointer;font-size:13px;">📋</button>'
        + '<button onclick="shareWhatsApp(\''+encodeURIComponent(s.name)+'\',\''+encodeURIComponent(url)+'\')" title="واتساب" style="padding:6px 8px;background:#14532d;color:#86efac;border:none;border-radius:7px;cursor:pointer;font-size:13px;">💬</button>'
      + '</div>'
      + '</div>';
  });
  list += '</div>';

  inner.innerHTML = head + controls + list;
  modal.appendChild(inner);
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

function buildFormUrl(base, student, cls){
  return base
    + '?id=' + encodeURIComponent(student.id)
    + '&name=' + encodeURIComponent(student.name)
    + '&cls=' + encodeURIComponent(cls);
}

function encodeAllLinks(text){
  return encodeURIComponent(text);
}

function copyText(encodedText, btn){
  var text = decodeURIComponent(encodedText);
  navigator.clipboard.writeText(text).then(function(){
    var orig = btn.innerHTML;
    btn.innerHTML = '✅ تم النسخ';
    btn.style.background = '#14532d';
    setTimeout(function(){ btn.innerHTML = orig; btn.style.background=''; }, 1800);
  }).catch(function(){
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    var orig = btn.innerHTML;
    btn.innerHTML = '✅ تم النسخ';
    setTimeout(function(){ btn.innerHTML = orig; }, 1800);
  });
}

function shareWhatsApp(encodedName, encodedUrl){
  var name = decodeURIComponent(encodedName);
  var url  = decodeURIComponent(encodedUrl);
  var msg  = 'السلام عليكم ورحمة الله 🌟\nيُرجى تعبئة بيانات الطالب *' + name + '* عبر الرابط التالي:\n' + url;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareAllWhatsApp(encodedText){
  var text = decodeURIComponent(encodedText);
  var msg = 'السلام عليكم ورحمة الله 🌟\nيُرجى تعبئة بيانات طالبكم عبر الرابط الخاص به:\n\n' + text;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

window.showStudentFormLinks = showStudentFormLinks;
window.copyText = copyText;
window.shareWhatsApp = shareWhatsApp;
window.shareAllWhatsApp = shareAllWhatsApp;

// ══════════════════════════════════════════════════════
// مشاركة الدرجات مع الطلاب — صفحة داخل التطبيق
// ══════════════════════════════════════════════════════

function _sgBuildUrl(uid, selWeeks, selCols) {
  var base = location.origin + location.pathname.replace('index.html','') + 'grades-viewer.html';
  var p = '?uid=' + encodeURIComponent(uid);
  if (selWeeks && selWeeks.length) p += '&weeks=' + selWeeks.join(',');
  if (selCols  && selCols.length)  p += '&cols='  + selCols.join(',');
  return base + p;
}

function _sgUpdateUrl() {
  var uid = window._sgUID; if(!uid) return;
  var weeks = [], cols = [];
  document.querySelectorAll('#sgWeekChips .sg-chip.active').forEach(function(el){ weeks.push(el.dataset.w); });
  document.querySelectorAll('#sgColChips .sg-chip.active').forEach(function(el){ cols.push(el.dataset.c); });
  var url = _sgBuildUrl(uid, weeks, cols);
  window._sgCurrentUrl = url;
  var el = document.getElementById('sgViewerUrl');
  if(el) el.textContent = url;
  var btn = document.getElementById('sgCopyBtn');
  if(btn){ btn.innerHTML = '📋 نسخ الرابط'; btn.style.background = '#1d4ed8'; }
}

function copyViewerLink(){
  var user = firebase.auth && firebase.auth().currentUser;
  if(!user){ alert('يجب تسجيل الدخول أولاً'); return; }
  window._sgUID = user.uid;

  var totalWeeks = (DB && DB.meta && DB.meta.activeWeeks) ? Number(DB.meta.activeWeeks) : 14;
  var allWeeks = []; for(var i=1;i<=totalWeeks;i++) allWeeks.push(i);

  var colDefs = [
    {id:'a',   label:'تقييم'},
    {id:'h',   label:'واجب'},
    {id:'bw',  label:'سلوك'},
    {id:'ex1', label:'اختبار 1'},
    {id:'ex2', label:'اختبار 2'},
    {id:'total',label:'المجموع'}
  ];

  // رقائق الأسابيع
  var weeksHtml = allWeeks.map(function(w){
    return '<button class="sg-chip active" data-w="'+w+'" onclick="this.classList.toggle(\'active\');_sgUpdateUrl()">'+w+'</button>';
  }).join('');

  // رقائق الأعمدة
  var colsHtml = colDefs.map(function(c){
    return '<button class="sg-chip active" data-c="'+c.id+'" onclick="this.classList.toggle(\'active\');_sgUpdateUrl()">'+c.label+'</button>';
  }).join('');

  var initUrl = _sgBuildUrl(user.uid, allWeeks, colDefs.map(function(c){return c.id;}));
  window._sgCurrentUrl = initUrl;

  var overlay = document.createElement('div');
  overlay.id  = 'shareGradesOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#0a0f1e;z-index:9999;display:flex;flex-direction:column;overflow:hidden;font-family:Cairo,sans-serif;direction:rtl;';

  overlay.innerHTML =
    // ── رأس ──
    '<div style="background:#0d1a35;border-bottom:1px solid #1e3a5f;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">'+
      '<div style="display:flex;align-items:center;gap:10px;">'+
        '<span style="font-size:20px;">🔗</span>'+
        '<div>'+
          '<div style="font-weight:900;font-size:15px;color:#60a5fa;">مشاركة الدرجات مع الطلاب</div>'+
          '<div style="font-size:10px;color:#64748b;margin-top:2px;">رابط عرض القراءة فقط — للطلاب والأولياء</div>'+
        '</div>'+
      '</div>'+
      '<button onclick="document.getElementById(\'shareGradesOverlay\').remove()" style="background:rgba(255,255,255,.08);border:1px solid #1e3a5f;color:#94a3b8;border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;font-family:Cairo,sans-serif;">✕ إغلاق</button>'+
    '</div>'+

    // ── محتوى قابل للتمرير ──
    '<div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;align-items:center;gap:14px;">'+

      // تخصيص الأسابيع
      '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:14px;padding:16px 18px;width:100%;max-width:560px;">'+
        '<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:10px;">📅 الأسابيع المعروضة</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">'+
          '<button onclick="document.querySelectorAll(\'#sgWeekChips .sg-chip\').forEach(function(e){e.classList.add(\'active\')});_sgUpdateUrl()" style="padding:4px 10px;background:#1e3a5f;color:#7dd3fc;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;">تحديد الكل</button>'+
          '<button onclick="document.querySelectorAll(\'#sgWeekChips .sg-chip\').forEach(function(e){e.classList.remove(\'active\')});_sgUpdateUrl()" style="padding:4px 10px;background:#1e1e2e;color:#64748b;border:1px solid #1e3a5f;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;">إلغاء الكل</button>'+
        '</div>'+
        '<div id="sgWeekChips" style="display:flex;flex-wrap:wrap;gap:6px;">'+weeksHtml+'</div>'+
      '</div>'+

      // تخصيص الأعمدة
      '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:14px;padding:16px 18px;width:100%;max-width:560px;">'+
        '<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:10px;">📊 الأعمدة المعروضة</div>'+
        '<div id="sgColChips" style="display:flex;flex-wrap:wrap;gap:8px;">'+colsHtml+'</div>'+
      '</div>'+

      // الرابط
      '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:14px;padding:16px 18px;width:100%;max-width:560px;">'+
        '<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:8px;">📎 رابط العرض</div>'+
        '<div id="sgViewerUrl" style="background:#0a0f1e;border:1px solid #1e3a5f;border-radius:8px;padding:10px 14px;font-size:10px;color:#7dd3fc;word-break:break-all;line-height:1.7;margin-bottom:12px;">'+initUrl+'</div>'+
        '<div style="display:flex;gap:10px;">'+
          '<button id="sgCopyBtn" onclick="sgCopy()" style="flex:1;padding:11px;background:#1d4ed8;color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;">📋 نسخ الرابط</button>'+
          '<button onclick="window.open(window._sgCurrentUrl,\'_blank\')" style="padding:11px 16px;background:#0f2a5e;color:#7dd3fc;border:1px solid #1e3a5f;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;">🔍 معاينة</button>'+
        '</div>'+
      '</div>'+

      // تعليمات
      '<div style="background:#0f1e35;border:1px solid #1e3a5f;border-radius:14px;padding:14px 18px;width:100%;max-width:560px;">'+
        '<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:8px;">ℹ️ تعليمات</div>'+
        '<div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:#94a3b8;line-height:1.7;">'+
          '<div>📤 <strong style="color:#e2e8f0;">انسخ الرابط</strong> وأرسله للطلاب — يفتح مباشرة بالأعمدة والأسابيع التي اخترتها</div>'+
          '<div>👁️ <strong style="color:#e2e8f0;">للقراءة فقط</strong> — لا يمكن للطلاب تعديل أي بيانات</div>'+
          '<div>🔄 <strong style="color:#e2e8f0;">يتحدث تلقائياً</strong> — أي تغيير تجريه يظهر فوراً للطلاب</div>'+
        '</div>'+
      '</div>'+

    '</div>';

  // CSS الرقائق
  if(!document.getElementById('sgChipCSS')){
    var st=document.createElement('style'); st.id='sgChipCSS';
    st.textContent='.sg-chip{padding:5px 12px;background:#0a1628;border:1px solid #1e3a5f;border-radius:20px;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;transition:all .15s;}'
      +'.sg-chip.active{background:#1d4ed8;border-color:#3b82f6;color:#fff;}';
    document.head.appendChild(st);
  }

  document.body.appendChild(overlay);
}

function sgCopy(){
  var url  = window._sgCurrentUrl || '';
  var btn  = document.getElementById('sgCopyBtn');
  if(!btn) return;
  navigator.clipboard ? navigator.clipboard.writeText(url).then(function(){
    btn.innerHTML='✅ تم النسخ'; btn.style.background='#16a34a';
    setTimeout(function(){ btn.innerHTML='📋 نسخ الرابط'; btn.style.background='#1d4ed8'; },2500);
  }) : (function(){
    var ta=document.createElement('textarea'); ta.value=url;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    btn.innerHTML='✅ تم النسخ'; btn.style.background='#16a34a';
    setTimeout(function(){ btn.innerHTML='📋 نسخ الرابط'; btn.style.background='#1d4ed8'; },2500);
  })();
}

window.copyViewerLink = copyViewerLink;
window.sgCopy = sgCopy;
window._sgUpdateUrl = _sgUpdateUrl;