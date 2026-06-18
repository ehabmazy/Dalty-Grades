// SECTION NEW-A: WEEKLY GRADES PAGE
// ══════════════════════════════════════════════════════
var WKS={activeClass:"",activeWeek:1,_autoWeekSet:false,search:'',selectedCol:'',viewMode:'numpad',imlaaPanel:{open:false,conf:70,sep:'التالي',log:[],justSet:{}}};

function _getActiveWeeks(){
  var n=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  return ALL_WEEKS.slice(0,n);
}

// Auto-detect current week based on startDate and today's date
function _calcCurrentWeek(){
  if(!DB.meta||!DB.meta.startDate)return 1;
  var start=new Date(DB.meta.startDate);
  var today=new Date();
  today.setHours(0,0,0,0);start.setHours(0,0,0,0);
  var diff=Math.floor((today-start)/(1000*60*60*24*7));
  var w=diff+1;
  var maxW=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  return Math.min(Math.max(1,w),maxW);
}

function renderWeekly(){
  var root=document.getElementById("weeklyRoot");
  if(!root)return;
  if(!WKS.activeClass&&DB.classes.length)WKS.activeClass=DB.classes[0];
  // Auto-set current week on first load or when class changes
  if(!WKS._autoWeekSet){WKS.activeWeek=_calcCurrentWeek();WKS._autoWeekSet=true;}
  var cls=WKS.activeClass;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var week=WKS.activeWeek;
  var activeWks=_getActiveWeeks();
  // Build absence columns
  var absCols=buildAbsCols(cls,week);
  // Set date info on each col
  absCols.forEach(function(col){
    if(col.dayIdx>=0){
      var d=getWeekDateForDay(week,col.dayIdx);
      col.dateStr=d?dateToStr(d):null;
      col.dateLabel=d?(d.getDate()+"/"+(d.getMonth()+1)):"";
    }else{col.dateStr=null;col.dateLabel="";}
  });

  // Week header date
  var wdl="";
  if(DB.meta.startDate){
    var wd=getWeekDateForDay(week,0);
    if(wd)wdl=" — "+wd.getDate()+"/"+(wd.getMonth()+1);
  }

  // Grade maxes
  var assessMax=20,hwMax=10,imlaaMax=10;
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.forEach(function(col){
      if(col.field==="a"+week)assessMax=col.max;
      if(col.field==="h"+week)hwMax=col.max;
      if(col.field==="im"+week)imlaaMax=col.max;
    });
  });
  var aF="a"+week,hF="h"+week,imF="im"+week;

  // HW→Absence link: which absCol index is linked to HW?
  // Stored in WKS.hwAbsLink (default 0 = first period)
  if(WKS.hwAbsLink===undefined)WKS.hwAbsLink=0;
  var hwAbsIdx=Math.min(WKS.hwAbsLink,Math.max(0,absCols.length-1));

  // ── Filter by search ──
  var _srch=(WKS.search||'').trim();
  var displayStudents=students;
  if(_srch){
    var _srchNum=Number(_srch);
    displayStudents=students.filter(function(s,si){
      if(!isNaN(_srchNum)&&_srch!==''&&(si+1)===_srchNum)return true;
      return s.name&&s.name.indexOf(_srch)>=0;
    });
  }

  // ── Compute key stats for toolbar ──
  var totalCells=students.length*(absCols.length+2);
  var recordedCells=0,absentCount=0,assessRecorded=0,hwRecorded=0;
  students.forEach(function(s){
    var aV=s[aF];var hV=s[hF];
    if(aV!==undefined&&aV!==""){assessRecorded++; recordedCells++;}
    if(hV!==undefined&&hV!==""){hwRecorded++; recordedCells++;}
    var absData=getStudentAbsences(cls,s.id);
    absCols.forEach(function(col,ai){
      var k="w"+week+"_ci"+ai;
      if(absData[k]){recordedCells++;}
      if(absData[k]==="abs"){absentCount++;}
    });
  });
  var pct=totalCells>0?Math.round(recordedCells/totalCells*100):0;

  var html='<div class="weekly-page">';

  // ── Toolbar ──
  html+='<div class="wk-toolbar" style="flex-wrap:wrap;gap:6px;align-items:center;">';
  html+='<span class="wk-toolbar-title">📅 الأسبوعي</span>';
  if(WKS.activeClass) html+='<span style="background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.35);border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;">🏷 '+WKS.activeClass+'</span>';
  html+='<span style="background:rgba(16,185,129,.15);color:#6ee7b7;border:1px solid rgba(16,185,129,.35);border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;">📆 الأسبوع '+WKS.activeWeek+'</span>';
  html+='<span style="font-size:10px;background:#1e3a5f;padding:3px 9px;border-radius:8px;color:#93c5fd;font-weight:700;">👥 '+(_srch?(displayStudents.length+'/'+students.length):students.length)+'</span>';
  html+='<span style="font-size:10px;background:rgba(239,68,68,.15);padding:3px 9px;border-radius:8px;color:#fca5a5;font-weight:700;">✗ '+absentCount+'</span>';
  html+='<span style="font-size:10px;background:rgba(16,185,129,.12);padding:3px 9px;border-radius:8px;color:#6ee7b7;font-weight:700;">📝 '+assessRecorded+'/'+students.length+'</span>';
  html+='<span style="font-size:10px;background:rgba(99,102,241,.12);padding:3px 9px;border-radius:8px;color:#a5b4fc;font-weight:700;">📚 '+hwRecorded+'/'+students.length+'</span>';
  html+='<span style="font-size:10px;background:rgba(251,191,36,.12);padding:3px 9px;border-radius:8px;color:#fcd34d;font-weight:700;">⚡ '+pct+'%</span>';
  html+='<button onclick="if(typeof FNP_toggle===\'function\')FNP_toggle();" title="لوحة الأرقام" style="background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.4);color:#c4b5fd;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;">🔢</button>';
  if(WKS.search){
    html+='<span style="background:rgba(99,102,241,.2);border:1px solid #6366f1;color:#a5b4fc;padding:2px 8px;border-radius:6px;font-size:10px;display:flex;align-items:center;gap:5px;">🔍 '+esc(WKS.search)+'<button onclick="WKS.search=\'\';if(typeof _devBarState!==\'undefined\'&&_devBarState.search){var i=document.getElementById(\'devBarSearchInp\');if(i)i.value=\'\';}renderWeekly();" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:11px;padding:0 2px;">✕</button></span>';
  }
  html+='</div>';

  // ── Settings bar — hidden in cards mode ──
  html+='<div class="weekly-body">';

  var autoW=_calcCurrentWeek();

  // ── View mode branch ──
  if(WKS.viewMode==='numpad'){
    var _oldPanel = document.getElementById('np2FloatPanel');
    if(_oldPanel && typeof _oldPanel._cleanup==='function') _oldPanel._cleanup();
    var _oldAttP = document.getElementById('attFloatPanel');
    if(_oldAttP && typeof _oldAttP._cleanup==='function') _oldAttP._cleanup();
    var _oldAbsP = document.getElementById('absFloatPanel');
    if(_oldAbsP && typeof _oldAbsP._cleanup==='function') _oldAbsP._cleanup();
    html+=renderWeeklyNumpad(cls,students,displayStudents,week,absCols,aF,hF,assessMax,hwMax);
    html+='</div></div>';
    root.innerHTML=html;
    _initNumpadEvents();
    _initFloatPanel();
    return;
  }

  if(WKS.viewMode==='attend'){
    var _oldAttPanel = document.getElementById('attFloatPanel');
    if(_oldAttPanel && typeof _oldAttPanel._cleanup==='function') _oldAttPanel._cleanup();
    var _oldNpPanelA = document.getElementById('np2FloatPanel');
    if(_oldNpPanelA && typeof _oldNpPanelA._cleanup==='function') _oldNpPanelA._cleanup();
    var _oldAbsPanelA = document.getElementById('absFloatPanel');
    if(_oldAbsPanelA && typeof _oldAbsPanelA._cleanup==='function') _oldAbsPanelA._cleanup();
    html+=renderWeeklyAttend(cls,students,week,absCols);
    html+='</div></div>';
    root.innerHTML=html;
    _initFloatPanel('attFloatPanel','attFloatDrag','attFloatResize',{x:'_afpX',y:'_afpY',w:'_afpW',h:'_afpH'});
    return;
  }

  if(WKS.viewMode==='absent'){
    var _oldAbsPanel = document.getElementById('absFloatPanel');
    if(_oldAbsPanel && typeof _oldAbsPanel._cleanup==='function') _oldAbsPanel._cleanup();
    var _oldNpPanelB = document.getElementById('np2FloatPanel');
    if(_oldNpPanelB && typeof _oldNpPanelB._cleanup==='function') _oldNpPanelB._cleanup();
    var _oldAttPanelB = document.getElementById('attFloatPanel');
    if(_oldAttPanelB && typeof _oldAttPanelB._cleanup==='function') _oldAttPanelB._cleanup();
    html+=renderWeeklyAbsent(cls,students,week,absCols);
    html+='</div></div>';
    root.innerHTML=html;
    _initFloatPanel('absFloatPanel','absFloatDrag','absFloatResize',{x:'_bfpX',y:'_bfpY',w:'_bfpW',h:'_bfpH'});
    return;
  }

  {
  var _oldNpPanelT = document.getElementById('np2FloatPanel');
  if(_oldNpPanelT && typeof _oldNpPanelT._cleanup==='function') _oldNpPanelT._cleanup();
  var _oldAttPanelT = document.getElementById('attFloatPanel');
  if(_oldAttPanelT && typeof _oldAttPanelT._cleanup==='function') _oldAttPanelT._cleanup();
  var _oldAbsPanelT = document.getElementById('absFloatPanel');
  if(_oldAbsPanelT && typeof _oldAbsPanelT._cleanup==='function') _oldAbsPanelT._cleanup();

  // ── Table card ──
  html+='<div class=\"wk-card\">';
  html+='<div class="wk-card-hdr">';
  var _isCurrentWk=(week===autoW);
  html+='<span>أسبوع '+week+wdl+' — '+esc(cls)+(_isCurrentWk?' <span style="background:#92400e;color:#fbbf24;border-radius:5px;padding:1px 7px;font-size:9px;font-weight:700;margin-right:5px;">الأسبوع الحالي</span>':'')+'</span>';
  html+='<span class="wk-card-hdr-note">'+students.length+' طالب • '+absCols.length+' فترة • الواجب مرتبط بـ: '+(absCols[hwAbsIdx]?esc(absCols[hwAbsIdx].label):'—')+'</span>';
  html+='</div>';

  // ── Build column order: # | اسم | واجب | غ(hwAbsIdx) | صورة | تقييم | غ(other) | سلوك | مجموع ──
  var colDefs=[];
  colDefs.push({type:'num'});
  colDefs.push({type:'name'});
  colDefs.push({type:'hw'});
  // Insert hwAbs col right after HW
  var otherAbsCols=[];
  absCols.forEach(function(col,ai){if(ai!==hwAbsIdx)otherAbsCols.push({col:col,idx:ai});});
  if(absCols.length>0){
    colDefs.push({type:'abs',col:absCols[hwAbsIdx],idx:hwAbsIdx});
  }
  // صورة بين ف1 والتقييم
  colDefs.push({type:'photo'});
  colDefs.push({type:'assess'});
  // عمود الإملاء محذوف من الجدول (الرصد يتم عبر لوحة الإملاء الصوتي)
  // Insert other abs cols
  otherAbsCols.forEach(function(item,i){
    colDefs.push({type:'abs',col:item.col,idx:item.idx});
  });
  colDefs.push({type:'beh'});
  colDefs.push({type:'tot'});

  // ── Pre-calculate column stats ──
  var colStats={};
  // assess: count recorded (not empty, not غ, not م)
  var assessRecordedCount=0, assessAbsCount=0, assessExcCount=0;
  var hwRecordedCount=0, hwAbsCount=0, hwExcCount=0;
  var imlaaRecordedCount=0, imlaaAbsCount=0, imlaaExcCount=0;
  students.forEach(function(s){
    var aV=s[aF]; var hV=s[hF]; var imV=s[imF];
    if(aV==="غ")assessAbsCount++;
    else if(aV==="م")assessExcCount++;
    else if(aV!==undefined&&aV!=="")assessRecordedCount++;
    if(hV==="غ")hwAbsCount++;
    else if(hV==="م")hwExcCount++;
    else if(hV!==undefined&&hV!=="")hwRecordedCount++;
    if(imV==="غ")imlaaAbsCount++;
    else if(imV==="م")imlaaExcCount++;
    else if(imV!==undefined&&imV!=="")imlaaRecordedCount++;
  });
  colStats.assess={rec:assessRecordedCount,abs:assessAbsCount,exc:assessExcCount};
  colStats.hw={rec:hwRecordedCount,abs:hwAbsCount,exc:hwExcCount};
  colStats.imlaa={rec:imlaaRecordedCount,abs:imlaaAbsCount,exc:imlaaExcCount};
  // beh: count those with beh>0 for this week
  var behCount=students.filter(function(s){var bwv=s["bw"+week];return bwv!==""&&bwv!==undefined&&Number(bwv)>0;}).length;
  colStats.beh=behCount;
  // tot: count those with tot>0
  var totCount=0;
  students.forEach(function(s){
    var aV=s[aF],hV=s[hF];
    var isAA=aV==="غ",isAM=aV==="م",isHA=hV==="غ",isHM=hV==="م";
    var _aW=(isAA||isAM)?0:(aV!==""&&aV!==undefined?Math.min(Number(aV)||0,assessMax):0);
    var _hW=(isHA||isHM)?0:(hV!==""&&hV!==undefined?Math.min(Number(hV)||0,hwMax):0);
    var _b=Math.min((Number(s.beh1)||0)+(Number(s.beh2)||0),10);
    if((_aW+_hW+_b)>0)totCount++;
  });
  colStats.tot=totCount;
  // abs cols: count absent per col
  colStats.absCol={};
  absCols.forEach(function(col,ai){
    var cnt=0;
    students.forEach(function(s){
      var absData=getStudentAbsences(cls,s.id);
      if(absData["w"+week+"_ci"+ai]==="abs")cnt++;
    });
    colStats.absCol[ai]=cnt;
  });

  // ── Header row + stats row ──
  html+='<div class="wk-grid"><table class="wk-table"><thead>';
  // Stats row
  html+='<tr>';
  colDefs.forEach(function(cd){
    var statStyle='background:#071020;border-bottom:2px solid #1e3a5f;padding:2px 1px;text-align:center;font-size:10px;font-weight:900;';
    if(cd.type==='num'||cd.type==='name'||cd.type==='photo'){
      html+='<th style="'+statStyle+'color:#1e3a5f;">—</th>';
    } else if(cd.type==='hw'){
      var s=colStats.hw;
      html+='<th style="'+statStyle+'">';
      if(s.rec>0)html+='<span style="color:#6ee7b7;">'+s.rec+'</span>';
      if(s.abs>0)html+=(s.rec>0?' ':'')+'<span style="color:#f87171;">غ:'+s.abs+'</span>';
      if(s.exc>0)html+=(s.rec>0||s.abs>0?' ':'')+'<span style="color:#a5b4fc;">م:'+s.exc+'</span>';
      if(!s.rec&&!s.abs&&!s.exc)html+='<span style="color:#334155;">0</span>';
      html+='</th>';
    } else if(cd.type==='assess'){
      var s=colStats.assess;
      html+='<th style="'+statStyle+'">';
      if(s.rec>0)html+='<span style="color:#6ee7b7;">'+s.rec+'</span>';
      if(s.abs>0)html+=(s.rec>0?' ':'')+'<span style="color:#f87171;">غ:'+s.abs+'</span>';
      if(s.exc>0)html+=(s.rec>0||s.abs>0?' ':'')+'<span style="color:#a5b4fc;">م:'+s.exc+'</span>';
      if(!s.rec&&!s.abs&&!s.exc)html+='<span style="color:#334155;">0</span>';
      html+='</th>';
    } else if(cd.type==='imlaa'){
      var s=colStats.imlaa;
      html+='<th style="'+statStyle+'">';
      if(s.rec>0)html+='<span style="color:#fdba74;">'+s.rec+'</span>';
      if(s.abs>0)html+=(s.rec>0?' ':'')+'<span style="color:#f87171;">غ:'+s.abs+'</span>';
      if(s.exc>0)html+=(s.rec>0||s.abs>0?' ':'')+'<span style="color:#a5b4fc;">م:'+s.exc+'</span>';
      if(!s.rec&&!s.abs&&!s.exc)html+='<span style="color:#334155;">0</span>';
      html+='</th>';
    } else if(cd.type==='abs'){
      var cnt=colStats.absCol[cd.idx]||0;
      html+='<th style="'+statStyle+(cnt>0?'color:#f87171;':'color:#334155;')+'">'+cnt+'</th>';
    } else if(cd.type==='beh'){
      html+='<th style="'+statStyle+'color:#c4b5fd;">'+colStats.beh+'</th>';
    } else if(cd.type==='tot'){
      html+='<th style="'+statStyle+'color:#fcd34d;">'+colStats.tot+'</th>';
    }
  });
  html+='</tr>';
  // Labels row
  html+='<tr>';
  colDefs.forEach(function(cd){
    if(cd.type==='num'){html+='<th class="wk-th-tot" style="min-width:18px;">#</th>';}
    else if(cd.type==='name'){html+='<th class="wk-th-name">الاسم</th>';}
    else if(cd.type==='hw'){html+='<th class="wk-th-g">واجب<br><small style="opacity:.6;">/'+hwMax+'</small><br><button style="margin-top:3px;background:#4c1d95;border:none;color:#ddd6fe;border-radius:3px;font-size:7px;padding:1px 5px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="weeklyClearGradeCol(\'hw\')">🗑 مسح</button></th>';}
    else if(cd.type==='assess'){html+='<th class="wk-th-g">تقييم<br><small style="opacity:.6;">/'+assessMax+'</small><br><button style="margin-top:3px;background:#164e63;border:none;color:#a5f3fc;border-radius:3px;font-size:7px;padding:1px 5px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="weeklyClearGradeCol(\'assess\')">🗑 مسح</button></th>';}
    else if(cd.type==='imlaa'){html+='<th class="wk-th-g" style="background:#1a1200;color:#fdba74;">🎤 إملاء<br><small style="opacity:.6;">/'+imlaaMax+'</small><br><button style="margin-top:3px;background:#451a03;border:none;color:#fcd34d;border-radius:3px;font-size:7px;padding:1px 5px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="weeklyClearGradeCol(\'imlaa\')">🗑 مسح</button></th>';}
    else if(cd.type==='photo'){html+='<th class="wk-th-abs" style="min-width:36px;background:#12214a;">صورة</th>';}
    else if(cd.type==='abs'){
      var col=cd.col;
      var _ci=cd.idx;
      html+='<th class="wk-th-abs" style="min-width:44px;padding:3px 2px;">';
      html+=esc(col.label.trim());
      if(col.dateLabel)html+='<br><small style="opacity:.6;font-size:7px;">'+esc(col.dateLabel)+'</small>';
      html+='<br><button style="margin-top:3px;background:#7f1d1d;border:none;color:#fca5a5;border-radius:3px;font-size:7px;padding:1px 5px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="weeklyClearAbsCol('+_ci+')">🗑 مسح</button>';
      html+='</th>';
    }
    else if(cd.type==='beh'){html+='<th class="wk-th-beh">السلوك<br><small style="opacity:.6;">والمواظبة /10</small><br><button style="margin-top:3px;background:#3b1a5e;border:none;color:#c4b5fd;border-radius:3px;font-size:7px;padding:1px 5px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="weeklyClearGradeCol(\'beh\')">🗑 مسح</button></th>';}
    else if(cd.type==='tot'){html+='<th class="wk-th-tot">مجموع<br><small style="opacity:.6;font-size:7px;">/'+(assessMax+hwMax+10)+'</small></th>';}
  });
  html+='</tr></thead><tbody>';

  // ── Body rows ──
  if(_srch&&displayStudents.length===0){
    html+='<tr><td colspan="99" style="text-align:center;padding:18px;color:#475569;font-size:11px;">لا توجد نتائج مطابقة لـ "'+esc(_srch)+'"</td></tr>';
  }
  displayStudents.forEach(function(s,si){
    var stuIdx=(DB.data[cls]||[]).indexOf(s);
    var aVal=s[aF]!==undefined?s[aF]:"";
    var hVal=s[hF]!==undefined?s[hF]:"";
    var imVal=s[imF]!==undefined?s[imF]:"";
    var isAA=aVal==="غ",isAM=aVal==="م",isHA=hVal==="غ",isHM=hVal==="م";
    var isIMA=imVal==="غ",isIMM=imVal==="م";
    var _bwVal=s["bw"+week];
    var beh=(_bwVal!==undefined&&_bwVal!==null&&_bwVal!=="")
      ?Math.min(Number(_bwVal)||0,10)
      :((s.beh1===''||s.beh1===undefined||s.beh1===null)&&(s.beh2===''||s.beh2===undefined||s.beh2===null)?'':Math.min((Number(s.beh1)||0)+(Number(s.beh2)||0),10));
    var res=calcStudent(s);
    // مجموع هذا الأسبوع فقط: تقييم + واجب + إملاء + سلوك
    // غ = صفر في الجمع، م = صفر في الجمع
    var _aW = (isAA||isAM) ? 0 : (aVal !== "" && aVal !== undefined ? Math.min(Number(aVal)||0, assessMax) : 0);
    var _hW = (isHA||isHM) ? 0 : (hVal !== "" && hVal !== undefined ? Math.min(Number(hVal)||0, hwMax) : 0);
    var tot = _aW + _hW + beh;
    var absData=getStudentAbsences(cls,s.id);

    html+='<tr>';
    colDefs.forEach(function(cd){
      if(cd.type==='num'){
        html+='<td class="wk-num-cell">'+(si+1)+'</td>';
      } else if(cd.type==='name'){
        html+='<td class="wk-name-cell" title="'+esc(s.name)+'">'+esc(s.name)+'</td>';
      } else if(cd.type==='hw'){
        var _isTblSel=(WKS._tblCell&&WKS._tblCell.stuIdx===stuIdx&&WKS._tblCell.fld==='hw');
        if(isHA||isHM){
          html+='<td style="cursor:pointer;text-align:center;" onclick="gradesSetField('+stuIdx+',\''+hF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isHA?"is-abs":"is-exc")+'">'+(isHA?"غ":"م")+'</span></td>';
        }else{
          var _hwDisplay=hVal!==''?hVal:'—';
          html+='<td class="wk-tbl-cell'+((_isTblSel)?' wk-tbl-sel':'')+'" style="cursor:pointer;text-align:center;padding:4px 3px;" onclick="_tblSelectCell('+stuIdx+',\'hw\',\''+hF+'\','+hwMax+','+si+');" data-stuIdx="'+stuIdx+'" data-fld="hw">';
          html+='<span style="font-size:11px;font-weight:700;color:'+(_isTblSel?'#fbbf24':(hVal!==''?'#93c5fd':'#334155'))+';">'+(_isTblSel&&WKS._tblInput!==''?WKS._tblInput:_hwDisplay)+'</span>';
          if(hVal!==''&&!_isTblSel)html+='<span style="font-size:8px;color:#475569;">/'+hwMax+'</span>';
          html+='</td>';
        }
      } else if(cd.type==='assess'){
        var _isTblSel=(WKS._tblCell&&WKS._tblCell.stuIdx===stuIdx&&WKS._tblCell.fld==='assess');
        if(isAA||isAM){
          html+='<td style="cursor:pointer;text-align:center;" onclick="gradesSetField('+stuIdx+',\''+aF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isAA?"is-abs":"is-exc")+'">'+(isAA?"غ":"م")+'</span></td>';
        }else{
          var _asDisplay=aVal!==''?aVal:'—';
          html+='<td class="wk-tbl-cell'+((_isTblSel)?' wk-tbl-sel':'')+'" style="cursor:pointer;text-align:center;padding:4px 3px;" onclick="_tblSelectCell('+stuIdx+',\'assess\',\''+aF+'\','+assessMax+','+si+');" data-stuIdx="'+stuIdx+'" data-fld="assess">';
          html+='<span style="font-size:11px;font-weight:700;color:'+(_isTblSel?'#fbbf24':(aVal!==''?'#6ee7b7':'#334155'))+';">'+(_isTblSel&&WKS._tblInput!==''?WKS._tblInput:_asDisplay)+'</span>';
          if(aVal!==''&&!_isTblSel)html+='<span style="font-size:8px;color:#475569;">/'+assessMax+'</span>';
          html+='</td>';
        }
      } else if(cd.type==='imlaa'){
        var _isTblSel=(WKS._tblCell&&WKS._tblCell.stuIdx===stuIdx&&WKS._tblCell.fld==='imlaa');
        if(isIMA||isIMM){
          html+='<td style="cursor:pointer;text-align:center;background:rgba(249,115,22,.08);" onclick="gradesSetField('+stuIdx+',\''+imF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isIMA?"is-abs":"is-exc")+'">'+(isIMA?"غ":"م")+'</span></td>';
        }else{
          var _imDisplay=imVal!==''?imVal:'—';
          html+='<td class="wk-tbl-cell'+((_isTblSel)?' wk-tbl-sel':'')+'" style="cursor:pointer;text-align:center;padding:4px 3px;background:rgba(249,115,22,.06);" onclick="_tblSelectCell('+stuIdx+',\'imlaa\',\''+imF+'\','+imlaaMax+','+si+');">';
          html+='<span style="font-size:11px;font-weight:700;color:'+(_isTblSel?'#fbbf24':(imVal!==''?'#fdba74':'#334155'))+';">'+(_isTblSel&&WKS._tblInput!==''?WKS._tblInput:_imDisplay)+'</span>';
          if(imVal!==''&&!_isTblSel)html+='<span style="font-size:8px;color:#475569;">/'+imlaaMax+'</span>';
          html+='</td>';
        }
      } else if(cd.type==='abs'){
        var col=cd.col;
        var di=col.dayIdx>=0?col.dayIdx:0;
        var k="w"+week+"_ci"+cd.idx;
        var st=absData[k];
        var isAbs=st==="abs";
        var bgStyle=isAbs?"background:rgba(239,68,68,.22);":"";
        html+='<td style="padding:0;'+bgStyle+'" onclick="toggleAbsence(\''+esc(cls)+'\','+s.id+','+week+','+cd.idx+');renderWeekly();">';
        html+='<div class="wk-abs-cell'+(isAbs?' is-abs':' is-here')+'" title="'+(isAbs?"غائب":"حضور")+'">'+(isAbs?'✗':'')+'</div></td>';
      } else if(cd.type==='photo'){
        var photoSrc=s.photo||(DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:"");
        if(photoSrc){
          html+='<td style="padding:2px;text-align:center;"><img src="'+photoSrc+'" style="width:28px;height:28px;border-radius:4px;object-fit:cover;display:block;margin:0 auto;" onerror="this.style.display=\'none\'"></td>';
        }else{
          var _defPw=DB.meta.defaultStudentPhoto||'';
          html+=(_defPw?'<td style="padding:2px;text-align:center;"><img src="'+_defPw+'" style="width:28px;height:28px;border-radius:4px;object-fit:cover;display:block;margin:0 auto;"></td>':'<td style="padding:2px;text-align:center;"><div style="width:28px;height:28px;border-radius:4px;background:#1e3a5f;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:10px;color:#334155;">👤</div></td>');
        }
      } else if(cd.type==='beh'){
        var _bvd=(beh==='' ? '' : beh);
        var _isTblSelBeh=(WKS._tblCell&&WKS._tblCell.stuIdx===stuIdx&&WKS._tblCell.fld==='beh');
        var _behDisplay=_bvd!==''?_bvd:'—';
        html+='<td class="wk-tbl-cell'+((_isTblSelBeh)?' wk-tbl-sel':'')+'" style="cursor:pointer;text-align:center;padding:4px 3px;" onclick="_tblSelectCell('+stuIdx+',\'beh\',\'bw'+week+'\',10,'+si+');">';
        html+='<span style="font-size:11px;font-weight:700;color:'+(_isTblSelBeh?'#fbbf24':(_bvd!==''?'#c4b5fd':'#334155'))+';">'+(_isTblSelBeh&&WKS._tblInput!==''?WKS._tblInput:_behDisplay)+'</span>';
        if(_bvd!==''&&!_isTblSelBeh)html+='<span style="font-size:8px;color:#475569;">/10</span>';
        html+='</td>';
      } else if(cd.type==='tot'){
        var _totMax=assessMax+hwMax+10;
        var tc=gc(typeof tot==='number'?tot:0);
        var _totLabel=tot+'/'+_totMax;
        html+='<td><span class="wk-tot-badge" style="background:'+tc+'18;color:'+tc+';border:1px solid '+tc+'44;">'+_totLabel+'</span></td>';
      }
    });
    html+='</tr>';
  });

  html+='</tbody></table></div></div>';
  html+='<div style="font-size:8.5px;color:#475569;margin-top:5px;padding-bottom:4px;display:flex;gap:10px;flex-wrap:wrap;">';
  html+='<span style="color:#fca5a5;">✗ = غائب (اضغط للتبديل)</span>';
  html+='<span style="color:#fb923c;">غ = الدرجة غياب</span>';
  html+='<span style="color:#a5b4fc;">م = معذور</span>';
  html+='<span style="color:#475569;">اضغط غ/م لإلغاء التعليم</span>';
  html+='</div>';

  } // end table else

  // ── لوحة رصد الإملاء السريع ──
  var IP=WKS.imlaaPanel;
  var ipOpen=IP.open;
  var ipConf=IP.conf||70;
  var ipConfCls=ipConf>=70?"cb-h":ipConf>=50?"cb-m":"cb-l";
  var ipStudents=(DB.data[cls]||[]).filter(function(s){return s.name;});
  // عدد المرصودين للعمود المختار
  var _ipGradedColDef=null;
  (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_ipGradedColDef=c;});});
  var _isBehSel=WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol);
  var _ipGradedField=_isBehSel?('bw'+week):(_ipGradedColDef?_ipGradedColDef.field:imF);
  var ipGraded=_isBehSel
    ?ipStudents.filter(function(s){var v=s["bw"+week];return v!==undefined&&v!=="";}).length
    :ipStudents.filter(function(s){var v=s[_ipGradedField];return v!==undefined&&v!=="";}).length;

  html+='<div style="background:#1a0e00;border:2px solid #92400e;border-radius:10px;margin-bottom:8px;overflow:hidden;">';
  // رأس اللوحة
  html+='<div onclick="WKS.imlaaPanel.open=!WKS.imlaaPanel.open;if(typeof _devBarState!==\'undefined\')_devBarState.imlaa=WKS.imlaaPanel.open;_devBarUpdateBtns();renderWeekly();" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:7px 12px;background:#1a0e00;user-select:none;">';
  html+='<span style="font-size:14px;">🎤</span>';
  var _ipHdrColDef=null;
  (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_ipHdrColDef=c;});});
  var _ipHdrLabel=_isBehSel?'السلوك والمواظبة':(_ipHdrColDef?_ipHdrColDef.label:'اختر عموداً');
  html+='<span style="font-size:11px;font-weight:900;color:#fdba74;flex:1;">🎤 رصد درجات — <span style="color:'+(WKS.selectedCol?'#fbbf24':'#92400e')+';">'+esc(_ipHdrLabel)+'</span> — أسبوع '+week+' ('+esc(cls)+')</span>';
  html+='<span style="font-size:9px;background:rgba(249,115,22,.2);border:1px solid #92400e;padding:1px 8px;border-radius:8px;color:#fdba74;">'+ipGraded+'/'+ipStudents.length+' مُرصد</span>';
  html+='<span style="font-size:11px;color:#92400e;">'+(ipOpen?'▲':'▼')+'</span>';
  html+='</div>';

  if(ipOpen){
    var ipLog=IP.log||[];
    var ipOkCnt=ipLog.filter(function(l){return l.status==="ok"||l.status==="weak";}).length;
    var ipFailCnt=ipLog.filter(function(l){return l.status==="unmatched"||l.status==="error";}).length;

    html+='<div style="padding:8px 12px;border-top:1px solid #92400e;">';
    // شريط الإعدادات
    // قائمة العمود المستهدف
    var wkNoCol=!WKS.selectedCol;
    var wkColOpts='<option value=""'+(wkNoCol?' selected':'')+' disabled style="color:#94a3b8;">— اختر العمود المستهدف —</option>';
    var _wk=WKS.activeWeek||1;
    var _weekCols=[];
    (DB.colPages||[]).forEach(function(pg){
      pg.cols.filter(function(c){return c.visible;}).forEach(function(c){
        // تقييم وواجب: a<N> و h<N>
        var m=c.field.match(/^(a|h)(\d+)$/);
        if(m&&Number(m[2])===_wk)_weekCols.push(c);
        // إملاء: im<N>
        var mi=c.field.match(/^im(\d+)$/);
        if(mi&&Number(mi[1])===_wk)_weekCols.push(c);
        // سلوك: bw<N>
        var mb=c.field.match(/^bw(\d+)$/);
        if(mb&&Number(mb[1])===_wk)_weekCols.push(c);
      });
    });
    // إضافة عمود السلوك إذا لم يكن موجوداً بعد (للتوافق مع بيانات قديمة)
    if(!_weekCols.find(function(c){return c.field==='bw'+_wk;})){
      _weekCols.push({id:'__beh__',field:'bw'+_wk,label:'السلوك والمواظبة',max:10});
    }
    _weekCols.forEach(function(c){
      wkColOpts+='<option value="'+c.id+'"'+(c.id===WKS.selectedCol?' selected':'')+'>'+esc(c.label)+' /'+c.max+'</option>';
    });
    html+='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:8px;padding:6px 10px;background:'+(wkNoCol?'rgba(245,158,11,.1)':'rgba(249,115,22,.08)')+';border:1.5px solid '+(wkNoCol?'#d97706':'#78350f')+';border-radius:8px;">';
    html+='<span style="font-size:10px;font-weight:700;color:#fdba74;">🎯 العمود المستهدف:</span>';
    html+='<select style="background:#0f172a;border:1.5px solid '+(wkNoCol?'#d97706':'#78350f')+';color:'+(wkNoCol?'#fcd34d':'#fdba74')+';padding:3px 8px;border-radius:6px;font-size:10px;outline:none;font-family:inherit;" onchange="WKS.selectedCol=this.value;renderWeekly();">'+wkColOpts+'</select>';
    if(wkNoCol)html+='<span style="font-size:9px;color:#fbbf24;font-weight:700;">⚠ اختر العمود أولاً قبل بدء الرصد</span>';
    html+='</div>';

    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:7px;">';
    html+='<div class="conf-row"><span class="conf-label" style="color:#fdba74;">دقة:</span>';
    html+='<input type="number" id="wkImConf" class="conf-inp" min="10" max="100" value="'+ipConf+'"/>';
    html+='<span class="conf-badge '+ipConfCls+'">'+ipConf+'%</span></div>';
    html+='<div class="conf-row"><span class="conf-label" style="color:#fdba74;">فاصل:</span>';
    html+='<input type="text" id="wkImSep" style="background:#0f172a;border:1.5px solid #78350f;color:#f1f5f9;padding:2px 7px;border-radius:6px;font-size:11px;width:70px;outline:none;" value="'+esc(IP.sep||'التالي')+'"/>';
    html+='</div>';
    html+='<button class="btn btn-ghost btn-sm" onclick="wkImUndo()">↩ تراجع</button>';
    html+='<button class="btn btn-danger btn-sm" onclick="if(confirm(\'مسح سجل الإملاء؟\')){WKS.imlaaPanel.log=[];renderWeekly();}">🗑 مسح</button>';
    {
      var _tblOpen=IP.tableOpen;
      html+='<button class="btn btn-sm" style="background:'+(_tblOpen?'rgba(16,185,129,.3)':'rgba(16,185,129,.15)')+';border:1px solid rgba(16,185,129,.4);color:#6ee7b7;font-size:10px;padding:3px 10px;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:700;" onclick="WKS.imlaaPanel.tableOpen=!WKS.imlaaPanel.tableOpen;renderWeekly();">📋 جدول الرصد '+(_tblOpen?'▲':'▼')+'</button>';
    }
    html+='</div>';

    // منطقة الإدخال
    html+='<textarea id="wkImInput" class="dict-input" style="border-color:#78350f;" rows="2" placeholder="مثال: محمد أحمد 8&#10;أو: 5 8 (رقم الطالب + الدرجة)&#10;الاسم فقط = غائب تلقائياً" onkeydown="wkImOnKey(event)"></textarea>';
    html+='<div class="d-hint" style="color:#92400e;margin-bottom:7px;">فاصل: <code>،</code> <code>/</code> <code>-</code> | طلاب: <code>'+esc(IP.sep||'التالي')+'</code> أو سطر | <strong style="color:#fca5a5">اسم فقط = غائب</strong> | <code>🔢 الرقم 8</code> = طالب رقم 8</div>';

    // صندوق الحالة
    var sbCls=ipOkCnt>0&&!ipFailCnt?"sb-ok":ipFailCnt>0?"sb-err":"sb-idle";
    var sbMsg=ipOkCnt>0?"✅ آخر رصد: "+ipOkCnt+" طالب"+(ipFailCnt?" | ❌ "+ipFailCnt+" فشل":""):ipFailCnt>0?"❌ "+ipFailCnt+" فشل — راجع السجل":"💡 اكتب اسم الطالب ودرجته ثم Enter";
    html+='<div id="wkImStatus" class="status-box '+sbCls+'"><span>'+(ipOkCnt>0&&!ipFailCnt?"✅":ipFailCnt>0?"❌":"💡")+'</span><span>'+sbMsg+'</span></div>';

    // قائمة الطلاب المرصودين
    html+='<div style="display:flex;gap:8px;margin-top:7px;">';
    // سجل الإدخال
    html+='<div style="flex:1;min-width:0;">';
    html+='<div style="font-size:9px;color:#78350f;font-weight:700;margin-bottom:4px;">📋 سجل الرصد ('+ipLog.length+')</div>';
    html+='<div style="background:#0f172a;border:1px solid #292524;border-radius:6px;max-height:140px;overflow-y:auto;">';
    html+='<table style="width:100%;border-collapse:collapse;font-size:9.5px;">';
    html+='<thead><tr>';
    html+='<th style="background:#1c1917;color:#92400e;border-bottom:1px solid #292524;padding:3px 5px;">#</th>';
    html+='<th style="background:#1c1917;color:#92400e;border-bottom:1px solid #292524;padding:3px 5px;text-align:right;">الطالب</th>';
    html+='<th style="background:#1c1917;color:#92400e;border-bottom:1px solid #292524;padding:3px 5px;">الدرجة</th>';
    html+='<th style="background:#1c1917;color:#92400e;border-bottom:1px solid #292524;padding:3px 5px;">دقة</th>';
    html+='</tr></thead><tbody>';
    if(!ipLog.length){
      html+='<tr><td colspan="4" style="color:#334155;padding:8px;text-align:center;">لا يوجد</td></tr>';
    }
    ipLog.forEach(function(l,i){
      html+='<tr>';
      html+='<td style="text-align:center;color:#44403c;border-bottom:1px solid #1c1917;padding:2px 5px;">'+(ipLog.length-i)+'</td>';
      html+='<td style="text-align:right;border-bottom:1px solid #1c1917;padding:2px 5px;color:'+(l.matchedName?'#d97706':'#ef4444')+';">'+esc(l.matchedName||(l.error||'؟'))+'</td>';
      html+='<td style="text-align:center;border-bottom:1px solid #1c1917;padding:2px 5px;">';
      if(l.isAbsent)html+='<span style="background:#7c2d12;color:#fcd34d;padding:1px 7px;border-radius:8px;font-size:9px;font-weight:700;">غ</span>';
      else if(l.grade!=null)html+='<span style="background:#78350f;color:#fdba74;padding:1px 7px;border-radius:8px;font-size:9px;font-weight:700;">'+l.grade+'</span>';
      else html+='—';
      html+='</td>';
      html+='<td style="text-align:center;border-bottom:1px solid #1c1917;padding:2px 5px;color:'+(l.pct>=80?'#34d399':l.pct>=50?'#fcd34d':'#f87171')+';font-weight:700;">'+(l.pct!=null?l.pct+'%':l.byNum?'🔢':'❌')+'</td>';
      html+='</tr>';
      if(l.rivalWarn){
        html+='<tr><td colspan="4" style="background:#451a03;color:#fcd34d;font-size:9px;padding:3px 8px;text-align:right;border-bottom:1px solid #7c2d12;">'+esc(l.rivalWarn)+'</td></tr>';
      }
    });
    html+='</tbody></table></div>';
    html+='</div>';
    // قائمة الطلاب
    html+='<div style="width:160px;flex-shrink:0;">';
    html+='<div style="font-size:9px;color:#78350f;font-weight:700;margin-bottom:4px;">👥 طلاب '+esc(cls)+' ('+ipGraded+'/'+ipStudents.length+')</div>';
    html+='<div style="background:#0f172a;border:1px solid #292524;border-radius:6px;max-height:140px;overflow-y:auto;">';
    var now2=Date.now();
    // اعرض قيمة العمود المختار في قائمة الطلاب
    var _ipColDef=null;
    (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_ipColDef=c;});});
    var _isBehCol=WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol);
    var _ipField=_isBehCol?('bw'+week):(_ipColDef?_ipColDef.field:imF);
    ipStudents.forEach(function(s,i){
      var v=_isBehCol?(s["bw"+week]!==undefined&&s["bw"+week]!==''?s["bw"+week]:''):s[_ipField];
      // السلوك: أي قيمة مُسجَّلة (حتى لو صفر للغائب) تُعدّ مرصودة
      var hasg=_isBehCol?(v!==''&&v!==undefined):(v!==undefined&&v!=="");
      var isAbs=!_isBehCol&&v==="غ";
      var isJust=IP.justSet&&IP.justSet[s.id]&&(now2-IP.justSet[s.id])<5000;
      var bg=isJust?"background:#78350f;":hasg?"background:#1a1200;":"background:#0f172a;";
      var clr=isJust?"color:#fef3c7;":hasg?"color:#fdba74;":"color:#44403c;";
      html+='<div style="display:flex;align-items:center;gap:5px;padding:3px 7px;border-bottom:1px solid #1c1917;'+bg+clr+'">';
      html+='<span style="font-size:9px;color:#44403c;flex-shrink:0;">'+(i+1)+'</span>';
      html+='<span style="font-size:9.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+esc(s.name)+'">'+esc(s.name)+'</span>';
      if(hasg)html+='<span style="font-size:10px;font-weight:900;padding:1px 6px;border-radius:6px;background:rgba(249,115,22,.2);color:#fdba74;">'+(isAbs?'غ':v)+'</span>';
      else html+='<span style="font-size:9px;color:#44403c;">—</span>';
      html+='</div>';
    });
    html+='</div></div>';
    html+='</div>'; // flex row
    html+='</div>'; // padding
    if(IP.tableOpen){
      html+=renderWkGradesTableInline(cls,week,absCols);
    }
  }
  html+='</div>'; // imlaa panel box

  html+='</div></div>';
  // حفظ موضع التمرير قبل إعادة البناء
  var _wb=root.querySelector('.weekly-body');
  var _sy=_wb?_wb.scrollTop:0;
  html+=renderWeeklySmartDistModal();
  root.innerHTML=html;
  // ── ربط أحداث لوحة الإملاء ──
  var wkImConf=document.getElementById("wkImConf");
  if(wkImConf)wkImConf.addEventListener("change",function(){WKS.imlaaPanel.conf=clamp(Number(this.value),10,100);});
  var wkImSep=document.getElementById("wkImSep");
  if(wkImSep)wkImSep.addEventListener("change",function(){WKS.imlaaPanel.sep=this.value.trim()||'التالي';});
  if(WKS.imlaaPanel.open){
    setTimeout(function(){var el=document.getElementById("wkImInput");if(el)el.focus();},30);
  }
  // استعادة موضع التمرير فوراً بعد إعادة البناء
  if(_sy>0){
    var _wb2=root.querySelector('.weekly-body');
    if(_wb2)_wb2.scrollTop=_sy;
  }
  // تحديث شريط العرض إذا كان مفتوحاً
  var _vb=document.getElementById('viewBar');
  if(_vb&&_vb.classList.contains('open'))renderViewBar();
  // تحديث select تخصيص الفترة إذا كان مفتوحاً
  if(_devBarState&&_devBarState.customFont)_devBarRefreshHwLink();
  if(typeof updateAbsColToggleBtn==='function')updateAbsColToggleBtn();
}
// ── Weekly Smart Distribution ────────────────────────

// ══ دوال لوحة رصد الإملاء السريع في الأسبوعي ══

function wkImPool(){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  return (DB.data[cls]||[]).filter(function(s){return s.name;}).map(function(s){return Object.assign({},s,{_cls:cls});});
}

function wkImApplyGrade(student,grade){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var _selColDef=null;
  (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_selColDef=c;});});
  // isBeh: either legacy __beh__ or a bw<N> col from pg_beh
  var isBeh=WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol);
  var field=isBeh?('bw'+week):(_selColDef?_selColDef.field:('im'+week));
  console.log('[DEBUG] selectedCol='+WKS.selectedCol+' isBeh='+isBeh+' field='+field+' grade='+grade+' id='+student.id+' cls='+cls);
  var sts=DB.data[cls]||[];
  var idx=-1;
  for(var i=0;i<sts.length;i++){if(sts[i].id==student.id){idx=i;break;}}
  console.log('[DEBUG] found idx='+idx+' of '+sts.length);
  if(idx<0)return;
  var IP=WKS.imlaaPanel;
  if(!IP._undo)IP._undo=[];
  IP._undo.push({id:student.id,cls:cls,field:field,prev:sts[idx][field]});
  if(IP._undo.length>60)IP._undo.shift();
  var gradeNum=isBeh?(grade==='غ'?0:Math.min(Number(grade)||0,10)):grade;
  if(isBeh)sts[idx][field]=gradeNum;
  else sts[idx][field]=grade;
  if(!IP.justSet)IP.justSet={};
  IP.justSet[student.id]=Date.now();
  saveDB();
  if(_currentPage==="weekly")renderWeekly();
}

function wkImUndo(){
  var IP=WKS.imlaaPanel;
  if(!IP._undo||!IP._undo.length){showSnack('⚠ لا يوجد ما يمكن التراجع عنه');return;}
  var last=IP._undo.pop();
  var sts=DB.data[last.cls]||[];
  for(var i=0;i<sts.length;i++){
    if(sts[i].id===last.id){
      sts[i][last.field]=last.prev;
      if(last.isBeh)sts[i][last.field2]=last.prev2;
      break;
    }
  }
  if(IP.log&&IP.log.length)IP.log.shift();
  saveDB();
  showSnack('↩ تم التراجع');
  renderWeekly();
}

function wkImParseEntry(text,pool){
  var t=text.trim();if(!t)return null;
  var week=WKS.activeWeek||1;
  var imlaaMax=10;
  // استخدم الحد الأقصى للعمود المختار
  if(WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol)){
    imlaaMax=10;
  } else {
    (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){
      if(c.id===WKS.selectedCol)imlaaMax=c.max;
      else if(!WKS.selectedCol&&c.field==='im'+week)imlaaMax=c.max;
    });});
  }
  var parsed=dSplitNameGrade(t);
  var nameStr=parsed.nameStr,grade=parsed.grade;
  if(grade===null)grade="غ";
  if(grade!=="غ"&&(grade<0||grade>imlaaMax))
    return{error:"الدرجة "+grade+" خارج 0-"+imlaaMax,status:"error",nameStr:nameStr,grade:grade};
  var IP=WKS.imlaaPanel;
  // ── التعرف برقم الطالب ──
  var numQ=parseInt(dnorm(nameStr));
  if(!isNaN(numQ)&&numQ>=1&&numQ<=pool.length){
    var stuByNum=pool[numQ-1];
    return{nameStr:nameStr,student:stuByNum,grade:grade,pct:100,status:"ok",isAbsent:grade==="غ",byNum:true,rivalWarn:null};
  }
  // ── البحث بالاسم ──
  var m=wkImFindInPool(nameStr,pool);
  var pct=m?Math.round(m.score*100):0;
  if(!m||pct<(IP.conf||70))
    return{nameStr:nameStr,grade:grade,error:"لم يُعرف: \""+nameStr+"\""+(m?" ("+m.s.name+" "+pct+"%)":""),status:"unmatched"};
  var rivalWarn=(m.rivals&&m.rivals.length)
    ?("⚠️ "+m.rivals.length+" مشابه: "+m.rivals.map(function(r){return"«"+r.name+"»";}).join("، ")):null;
  // ── إذا وجد تشابه أضف إلى قائمة الانتظار ──
  if(m.rivals&&m.rivals.length>0&&pct>=(IP.conf||70)){
    if(!IP._rivalQueue)IP._rivalQueue=[];
    IP._rivalQueue.push({nameStr:nameStr,grade:grade,candidates:[m.s].concat(m.rivals)});
    return{nameStr:nameStr,student:m.s,grade:grade,pct:pct,status:pct>=80?"ok":"weak",isAbsent:grade==="غ",rivalWarn:rivalWarn,hasPendingRival:true};
  }
  return{nameStr:nameStr,student:m.s,grade:grade,pct:pct,status:pct>=80?"ok":"weak",isAbsent:grade==="غ",rivalWarn:rivalWarn};
}

function wkImFindInPool(q,pool){
  var best=null,bs=0;
  pool.forEach(function(s){var sc=dSim(q,s.name);if(sc>bs){bs=sc;best=s;}});
  if(!best||bs<=0)return null;
  var threshold=Math.max(bs-0.05,0.7);
  var rivals=pool.filter(function(s){return s.id!==best.id&&dSim(q,s.name)>=threshold;});
  return{s:best,score:bs,byNum:false,rivals:rivals};
}

function wkImProcess(raw){
  var pool=wkImPool();
  var IP=WKS.imlaaPanel;
  var entries=splitEntries(raw, IP.sep||'التالي');
  var results=[];
  entries.forEach(function(entry){
    var r=wkImParseEntry(entry,pool);if(!r)return;
    if(r.error&&!r.student){
      results.push({inputText:entry,status:r.status||"error",error:r.error,nameStr:r.nameStr||"",grade:r.grade});
      return;
    }
    wkImApplyGrade(r.student,r.grade);
    results.push({inputText:entry,matchedName:r.student.name,studentId:r.student.id,cls:r.student._cls,nameStr:r.nameStr,grade:r.grade,status:r.status,pct:r.pct,byNum:r.byNum,isAbsent:r.isAbsent,rivalWarn:r.rivalWarn||null});
  });
  if(!IP.log)IP.log=[];
  IP.log=[].concat(results,IP.log).slice(0,100);
  return results;
}

function wkImOnKey(e){
  if(e.key!=="Enter"||e.shiftKey)return;
  e.preventDefault();
  var el=document.getElementById("wkImInput");if(!el)return;
  var raw=el.value.trim();if(!raw)return;
  var IP=WKS.imlaaPanel;
  // تحقق من تحديد العمود
  if(!WKS.selectedCol){
    showSnack('⚠ اختر العمود المستهدف أولاً');
    var sb=document.getElementById('wkImStatus');
    if(sb){sb.className='status-box sb-err';sb.innerHTML='<span>⚠️</span><span>اختر العمود المستهدف أولاً قبل بدء الرصد</span>';}
    return;
  }
  // حفظ sep من الحقل
  var sepEl=document.getElementById("wkImSep");
  if(sepEl)IP.sep=sepEl.value.trim()||'التالي';
  var confEl=document.getElementById("wkImConf");
  if(confEl)IP.conf=clamp(Number(confEl.value),10,100);

  var results=wkImProcess(raw);
  var okCount=results.filter(function(r){return r.status==="ok"||r.status==="weak";}).length;
  var failCount=results.filter(function(r){return r.status==="unmatched"||r.status==="error";}).length;

  el.value="";
  if(okCount)showSnack("✅ رُصد إملاء "+okCount+(failCount?" | ⚠ "+failCount+" فشل":""));
  else if(failCount)showSnack("❌ "+failCount+" فشل — راجع السجل");

  renderWeekly();
  // إذا وجد انتظار تشابه، افتح نافذة الاختيار
  var IP=WKS.imlaaPanel;
  if(IP._rivalQueue&&IP._rivalQueue.length){
    setTimeout(function(){wkImShowRivalPicker();},80);
  } else {
    setTimeout(function(){var el2=document.getElementById("wkImInput");if(el2)el2.focus();},30);
  }
}

// تنظيف justSet لألوان اللوحة
window._weeklyHighlightInterval=setInterval(function(){
  var IP=WKS.imlaaPanel;
  if(!IP||!IP.justSet)return;
  var now=Date.now();var changed=false;
  Object.keys(IP.justSet).forEach(function(id){if(now-IP.justSet[id]>5000){delete IP.justSet[id];changed=true;}});
  if(changed&&_currentPage==="weekly"&&IP.open)renderWeekly();
},1000);

// ══ نافذة اختيار الطالب عند التشابه (الأسبوعي) ══
function wkImShowRivalPicker(){
  var IP=WKS.imlaaPanel;
  if(!IP._rivalQueue||!IP._rivalQueue.length){
    setTimeout(function(){var el=document.getElementById("wkImInput");if(el)el.focus();},30);
    return;
  }
  var old=document.getElementById("wkRivalPickerModal");
  if(old)old.remove();
  var item=IP._rivalQueue[0];
  var remaining=IP._rivalQueue.length;
  var mo=document.createElement("div");
  mo.id="wkRivalPickerModal";
  mo.className="mo";
  var gradeTxt=item.grade==="غ"?'<span style="background:#7c2d12;color:#fcd34d;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700;">غائب</span>':
    '<span style="background:#78350f;color:#fdba74;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700;">'+item.grade+'</span>';
  var h='<div class="md" style="max-width:380px;">';
  h+='<div class="mh" style="background:linear-gradient(135deg,#7c2d12,#b45309);">';
  h+='<span style="font-size:16px;">⚠️</span>';
  h+='<h2 style="color:white;">أسماء متشابهة — الأسبوعي</h2>';
  if(remaining>1)h+='<span style="background:rgba(0,0,0,.3);color:#fcd34d;padding:1px 8px;border-radius:8px;font-size:9px;">'+remaining+' في الانتظار</span>';
  h+='<button class="xbtn" style="color:rgba(255,255,255,.7);" onclick="wkImRivalSkip()">✕</button>';
  h+='</div>';
  h+='<div class="mb">';
  h+='<div style="background:#1a0a00;border:1px solid #92400e;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:#fdba74;">';
  h+='🎤 الإدخال: <strong style="color:white;">«'+esc(item.nameStr)+'»</strong> — الدرجة: '+gradeTxt;
  h+='</div>';
  h+='<div style="font-size:10px;color:#94a3b8;margin-bottom:7px;">اختر الطالب الصحيح:</div>';
  item.candidates.forEach(function(s,i){
    h+='<button onclick="wkImRivalPick('+s.id+')" style="width:100%;text-align:right;background:'+(i===0?'rgba(29,78,216,.15)':'rgba(255,255,255,.04)')+';border:1.5px solid '+(i===0?'#3b82f6':'#334155')+';color:'+(i===0?'#93c5fd':'#cbd5e1')+';padding:8px 14px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;margin-bottom:5px;font-family:inherit;display:flex;align-items:center;gap:8px;">';
    h+='<span style="background:'+(i===0?'#1d4ed8':'#334155')+';color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;">'+(i===0?'✓':'?')+'</span>';
    h+=esc(s.name);
    h+='</button>';
  });
  h+='</div>';
  h+='<div class="mf">';
  h+='<button class="btn btn-ghost btn-sm" onclick="wkImRivalSkip()">تخطي</button>';
  h+='</div>';
  h+='</div>';
  mo.innerHTML=h;
  mo.onclick=function(e){if(e.target===mo)wkImRivalSkip();};
  document.body.appendChild(mo);
}

function wkImRivalPick(stuId){
  var IP=WKS.imlaaPanel;
  var mo=document.getElementById("wkRivalPickerModal");
  if(mo)mo.remove();
  if(!IP._rivalQueue||!IP._rivalQueue.length)return;
  var item=IP._rivalQueue.shift();
  // ابحث عن الطالب بالـ id
  var pool=wkImPool();
  var stu=null;
  for(var i=0;i<pool.length;i++){if(pool[i].id==stuId){stu=pool[i];break;}}
  if(stu){
    wkImApplyGrade(stu,item.grade);
    // حدّث السجل — استبدل آخر مدخل hasPendingRival
    if(!IP.log)IP.log=[];
    for(var j=0;j<IP.log.length;j++){
      if(IP.log[j].hasPendingRival){
        IP.log[j].matchedName=stu.name;
        IP.log[j].studentId=stu.id;
        IP.log[j].hasPendingRival=false;
        IP.log[j].rivalWarn='✅ اختيار يدوي: «'+stu.name+'»';
        break;
      }
    }
    showSnack('✅ رُصد «'+stu.name+'» = '+item.grade);
  }
  renderWeekly();
  if(IP._rivalQueue&&IP._rivalQueue.length){
    setTimeout(function(){wkImShowRivalPicker();},80);
  } else {
    setTimeout(function(){var el=document.getElementById("wkImInput");if(el)el.focus();},30);
  }
}

function wkImRivalSkip(){
  var IP=WKS.imlaaPanel;
  var mo=document.getElementById("wkRivalPickerModal");
  if(mo)mo.remove();
  if(IP._rivalQueue&&IP._rivalQueue.length)IP._rivalQueue.shift();
  renderWeekly();
  if(IP._rivalQueue&&IP._rivalQueue.length){
    setTimeout(function(){wkImShowRivalPicker();},80);
  } else {
    setTimeout(function(){var el=document.getElementById("wkImInput");if(el)el.focus();},30);
  }
}


// ══ جدول رصد العمود المختار — مضمّن في الصفحة (متزامن) ══
function renderWkGradesTableInline(cls,week,absCols){
  var IP=WKS.imlaaPanel;

  // إيجاد تعريف العمود المختار
  var _selColDef=null;
  (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_selColDef=c;});});
  var _isBehSel=WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol);
  var colLabel=_isBehSel?'السلوك والمواظبة':(_selColDef?_selColDef.label:'اختر عموداً');
  var colMax=_selColDef?_selColDef.max:10;
  var colField=_isBehSel?('bw'+week):(_selColDef?_selColDef.field:('im'+week));

  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});

  var h='<div style="background:#0d1117;border:2px solid #16a34a;border-radius:10px;margin-top:8px;overflow:hidden;">';

  // ── رأس ──
  h+='<div style="background:linear-gradient(135deg,#064e3b,#065f46);border-bottom:2px solid #16a34a;padding:8px 12px;display:flex;align-items:center;gap:8px;">';
  h+='<span style="font-size:16px;">📋</span>';
  h+='<div style="flex:1;">';
  h+='<div style="color:#6ee7b7;font-weight:900;font-size:12px;">جدول الرصد — '+esc(colLabel)+'</div>';
  h+='<div style="font-size:9px;color:#4ade80;margin-top:2px;">الأسبوع '+week+' — الفصل: <strong>'+esc(cls)+'</strong></div>';
  h+='</div>';
  h+='<button class="btn btn-sm" style="background:rgba(16,185,129,.2);border:1px solid #16a34a;color:#6ee7b7;font-size:10px;" onclick="wkGradesTablePrint()">🖨 طباعة</button>';
  h+='<button class="xbtn" style="color:#6ee7b7;" onclick="WKS.imlaaPanel.tableOpen=false;renderWeekly();">✕</button>';
  h+='</div>';

  // ── الجدول القابل للتمرير ──
  var _tblId='wkGradesTbl_'+Date.now();
  h+='<div id="'+_tblId+'" style="max-height:320px;overflow-y:auto;overflow-x:auto;cursor:grab;user-select:none;" onmousedown="(function(el,e){if(e.button!==0)return;el.style.cursor=\'grabbing\';var sx=e.pageX,sl=el.scrollLeft,sy=e.pageY,st=el.scrollTop;function mm(ev){el.scrollLeft=sl-(ev.pageX-sx);el.scrollTop=st-(ev.pageY-sy);}function mu(){el.style.cursor=\'grab\';document.removeEventListener(\'mousemove\',mm);document.removeEventListener(\'mouseup\',mu);}document.addEventListener(\'mousemove\',mm);document.addEventListener(\'mouseup\',mu);})(this,event)">';
  h+='<table style="width:100%;border-collapse:collapse;font-size:10px;">';
  h+='<thead><tr>';
  h+='<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:5px 8px;text-align:center;position:sticky;top:0;">#</th>';
  h+='<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:5px 8px;text-align:right;position:sticky;top:0;">الاسم</th>';
  h+='<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:5px 8px;text-align:center;position:sticky;top:0;">الدرجة /'+colMax+'</th>';
  h+='<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:5px 8px;text-align:center;position:sticky;top:0;">الحضور</th>';
  h+='</tr></thead><tbody>';

  if(!students.length){
    h+='<tr><td colspan="4" style="text-align:center;padding:14px;color:#475569;">لا يوجد طلاب</td></tr>';
  }

  students.forEach(function(s,i){
    var v=s[colField];
    var hasGrade=(v!==undefined&&v!==''&&v!=='غ'&&v!=='م');
    var isGAbs=v==='غ',isGExc=v==='م';

    var absData=getStudentAbsences(cls,s.id);
    var isAbsentSession=false;
    absCols.forEach(function(col,ai){
      if(absData["w"+week+"_ci"+ai]==="abs")isAbsentSession=true;
    });

    var rowBg=isAbsentSession?'background:rgba(239,68,68,.06);':'';
    h+='<tr style="'+rowBg+'">';
    h+='<td style="text-align:center;color:#475569;border-bottom:1px solid #1e293b;padding:4px 8px;">'+(i+1)+'</td>';
    h+='<td style="text-align:right;border-bottom:1px solid #1e293b;padding:4px 8px;color:#cbd5e1;font-weight:700;">'+esc(s.name)+'</td>';

    h+='<td style="text-align:center;border-bottom:1px solid #1e293b;padding:4px 8px;">';
    if(isGAbs)h+='<span style="background:#7c2d12;color:#fcd34d;padding:1px 9px;border-radius:8px;font-size:9px;font-weight:700;">غ</span>';
    else if(isGExc)h+='<span style="background:#3730a3;color:#c7d2fe;padding:1px 9px;border-radius:8px;font-size:9px;font-weight:700;">م</span>';
    else if(hasGrade)h+='<span style="background:#064e3b;color:#6ee7b7;padding:1px 11px;border-radius:8px;font-size:10px;font-weight:900;">'+esc(String(v))+'</span>';
    else h+='<span style="color:#334155;">—</span>';
    h+='</td>';

    h+='<td style="text-align:center;border-bottom:1px solid #1e293b;padding:4px 8px;">';
    if(isAbsentSession)h+='<span style="background:#7f1d1d;color:#fca5a5;padding:1px 9px;border-radius:8px;font-size:9px;font-weight:700;">✗ غائب</span>';
    else h+='<span style="color:#334155;">—</span>';
    h+='</td>';

    h+='</tr>';
  });

  h+='</tbody></table>';
  h+='</div>'; // scroll area
  h+='</div>'; // outer box
  return h;
}

function wkGradesTablePrint(){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var absCols=buildAbsCols(cls,week);

  var _selColDef=null;
  (DB.colPages||[]).forEach(function(pg){pg.cols.forEach(function(c){if(c.id===WKS.selectedCol)_selColDef=c;});});
  var _isBehSel=WKS.selectedCol==='__beh__'||/^bw\d+$/.test(WKS.selectedCol);
  var colLabel=_isBehSel?'السلوك والمواظبة':(_selColDef?_selColDef.label:'اختر عموداً');
  var colMax=_selColDef?_selColDef.max:10;
  var colField=_isBehSel?('bw'+week):(_selColDef?_selColDef.field:('im'+week));

  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});

  var rows=students.map(function(s,i){
    var v=s[colField];
    var hasGrade=(v!==undefined&&v!==''&&v!=='غ'&&v!=='م');
    var gradeTxt=v==='غ'?'غ':v==='م'?'م':hasGrade?(v+'/'+colMax):'—';

    var absData=getStudentAbsences(cls,s.id);
    var isAbsentSession=false;
    absCols.forEach(function(col,ai){
      if(absData["w"+week+"_ci"+ai]==="abs")isAbsentSession=true;
    });
    var attTxt=isAbsentSession?'✗ غائب':'—';

    return '<tr><td>'+(i+1)+'</td><td style="text-align:right">'+esc(s.name)+'</td><td>'+esc(gradeTxt)+'</td><td>'+attTxt+'</td></tr>';
  }).join('');

  var now=new Date();
  var dateStr=now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  var win=window.open('','_blank');
  win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>جدول الرصد</title>'
    +'<style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px;color:#111;}h1{font-size:15px;margin-bottom:4px;}table{border-collapse:collapse;width:100%;margin-top:12px;}th,td{border:1px solid #ccc;padding:5px 8px;font-size:12px;text-align:center;}th{background:#064e3b;color:white;}</style>'
    +'</head><body>'
    +'<h1>📋 جدول الرصد — '+esc(colLabel)+' — أسبوع '+week+' — فصل: '+esc(cls)+'</h1>'
    +'<div style="font-size:11px;color:#555;margin-bottom:8px;">تاريخ الطباعة: '+dateStr+'</div>'
    +'<table><thead><tr><th>#</th><th>الاسم</th><th>الدرجة /'+colMax+'</th><th>الحضور</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'</body></html>');
  win.document.close();
  win.print();
}


var WSD={open:false,srcCols:[],targets:{assess:true,hw:false,beh:false},scope:'all'};

function openWeeklySmartDistModal(){
  WSD={open:true,srcCols:[],targets:{assess:true,hw:false,beh:false},scope:'all'};
  renderWeekly();
}
function closeWeeklySmartDistModal(){
  WSD.open=false;
  renderWeekly();
}
function wsdToggleSrc(colId){
  var i=WSD.srcCols.indexOf(colId);
  if(i>=0)WSD.srcCols.splice(i,1); else WSD.srcCols.push(colId);
  renderWeekly();
}
function wsdToggleTarget(field,on){
  WSD.targets[field]=on;
  renderWeekly();
}
function renderWeeklySmartDistModal(){
  if(!WSD.open)return'';
  var week=WKS.activeWeek||1;
  var assessMax=20,hwMax=10,behMax=10;
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.forEach(function(col){
      if(col.field==='a'+week)assessMax=col.max;
      if(col.field==='h'+week)hwMax=col.max;
      if(col.field==='bw'+week)behMax=col.max;
    });
  });
  // Build source column groups
  var assessCols=[],hwCols=[],bwCols=[],exCols=[];
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.filter(function(c){return c.visible;}).forEach(function(c){
      if(c.id.match(/^a\d+$/))assessCols.push(c);
      else if(c.id.match(/^h\d+$/))hwCols.push(c);
      else if(c.id.match(/^bw\d+$/))bwCols.push(c);
      else if(c.id==='ex1'||c.id==='ex2')exCols.push(c);
    });
  });
  allCols().forEach(function(c){
    if((c.id==='ex1'||c.id==='ex2')&&!exCols.find(function(x){return x.id===c.id;}))exCols.push(c);
  });
  var tg=WSD.targets;
  var stopProp=' onclick="event.stopPropagation()"';
  function chkTarget(field,label,color){
    var on=tg[field];
    return '<label style="display:flex;align-items:center;gap:4px;background:'+(on?'#fff7ed':'#f8fafc')+';border:1.5px solid '+(on?color:'#e2e8f0')+';border-radius:7px;padding:5px 10px;cursor:pointer;font-size:10px;font-weight:700;color:'+(on?color:'#64748b')+';transition:all .15s;"><input type="checkbox" '+(on?'checked':'')+' onchange="wsdToggleTarget(\''+field+'\',this.checked)" style="cursor:pointer;accent-color:'+color+';width:13px;height:13px;"/>'+label+'</label>';
  }
  var h='';
  h+='<div class="mo" onclick="closeWeeklySmartDistModal()"><div class="md" style="max-width:520px" '+stopProp+'>';
  h+='<div class="mh"><h2>🔀 التوزيع الذكي — الأسبوع '+week+'</h2><button class="xbtn" onclick="closeWeeklySmartDistModal()">✕</button></div>';
  h+='<div class="mb" style="display:flex;flex-direction:column;gap:11px;">';
  h+='<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:7px;padding:8px 11px;font-size:10px;color:#0369a1;">يأخذ متوسط الأعمدة المرجعية لكل طالب ويوزّعه عشوائياً على الأعمدة المستهدفة للأسبوع <strong>'+week+'</strong> مع الحفاظ على المتوسط.</div>';

  // ── SOURCE ──
  h+='<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
  h+='<div style="background:#f8fafc;padding:7px 11px;font-size:10px;font-weight:700;color:#0f2a5e;border-bottom:1px solid #e2e8f0;">📌 أعمدة المصدر (المرجع)</div>';
  h+='<div style="padding:8px 11px;display:flex;flex-direction:column;gap:6px;">';
  h+='<div style="font-size:9px;color:#64748b;">اختر عموداً أو أكثر من أي صفحة — سيُحسب متوسطها كدرجة مرجعية لكل طالب:</div>';
  function srcGroup(cols,title,color){
    if(!cols.length)return;
    h+='<div style="font-size:9px;font-weight:700;color:'+color+';margin-top:2px;">'+title+'</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    cols.forEach(function(c){
      var checked=WSD.srcCols.indexOf(c.id)>=0;
      h+='<label style="display:flex;align-items:center;gap:3px;background:'+(checked?'#f0f9ff':'#f1f5f9')+';border:1px solid '+(checked?color:'#e2e8f0')+';border-radius:5px;padding:2px 8px;cursor:pointer;font-size:9px;color:'+(checked?color:'#475569')+'"><input type="checkbox" '+(checked?'checked':'')+' onchange="wsdToggleSrc(\''+c.id+'\')" style="cursor:pointer;accent-color:'+color+';"/>'+esc(c.label)+'</label>';
    });
    h+='</div>';
  }
  srcGroup(assessCols,'تقييمات /20','#1d4ed8');
  srcGroup(hwCols,'واجبات /10','#7c3aed');
  srcGroup(bwCols,'السلوك والمواظبة /10','#059669');
  srcGroup(exCols,'اختبارات /15','#c2410c');
  h+='</div></div>';

  // ── TARGETS ──
  h+='<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
  h+='<div style="background:#f8fafc;padding:7px 11px;font-size:10px;font-weight:700;color:#0f2a5e;border-bottom:1px solid #e2e8f0;">🎯 الأعمدة المستهدفة — الأسبوع '+week+'</div>';
  h+='<div style="padding:10px 11px;display:flex;flex-direction:column;gap:10px;">';
  h+='<div style="display:flex;flex-wrap:wrap;gap:7px;">';
  h+=chkTarget('assess','📊 تقييم /'+assessMax,'#1d4ed8');
  h+=chkTarget('hw','📝 واجب /'+hwMax,'#7c3aed');
  h+=chkTarget('beh','🌟 سلوك ومواظبة /'+behMax,'#059669');
  h+='</div>';

  // ── SCOPE (embedded inside targets card) ──
  h+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  h+='<label style="font-size:10px;color:#475569;white-space:nowrap;">👥 الطلاب:</label>';
  h+='<label style="display:flex;align-items:center;gap:4px;font-size:10px;cursor:pointer;"><input type="radio" name="wsdScope" value="all" '+(WSD.scope!=='empty'?'checked':'')+' onchange="WSD.scope=\'all\'" style="accent-color:#c2410c;"/>جميع الطلاب</label>';
  h+='<label style="display:flex;align-items:center;gap:4px;font-size:10px;cursor:pointer;"><input type="radio" name="wsdScope" value="empty" '+(WSD.scope==='empty'?'checked':'')+' onchange="WSD.scope=\'empty\'" style="accent-color:#c2410c;"/>الخلايا الفارغة فقط</label>';
  h+='</div>';
  h+='</div></div>';

  h+='</div>';
  h+='<div class="mf"><button class="btn btn-ghost" onclick="closeWeeklySmartDistModal()">إلغاء</button><button class="btn btn-orange" onclick="weeklyApplySmartDist()">🔀 تطبيق التوزيع</button></div>';
  h+='</div></div>';
  return h;
}
function weeklyApplySmartDist(){
  if(!WSD.srcCols.length){showSnack('⚠️ اختر عمود مصدر واحداً على الأقل');return;}
  var tg=WSD.targets;
  if(!tg.assess&&!tg.hw&&!tg.beh){showSnack('⚠️ اختر هدفاً واحداً على الأقل');return;}
  var week=WKS.activeWeek||1;
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var assessMax=20,hwMax=10,behMax=10;
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.forEach(function(col){
      if(col.field==='a'+week)assessMax=col.max;
      if(col.field==='h'+week)hwMax=col.max;
      if(col.field==='bw'+week)behMax=col.max;
    });
  });
  var colMap={};allCols().forEach(function(c){colMap[c.id]=c;});
  var students=DB.data[cls]||[];
  var scopeEmpty=WSD.scope==='empty';
  var changed=0;
  function jv(target,max,spread){return Math.max(0,Math.min(max,Math.round(target+Math.floor(Math.random()*spread*2+1)-spread)));}
  function isEmpty(v){return v===''||v===undefined||v===null;}
  students.forEach(function(s){
    if(!s.name)return;
    var srcSum=0,srcCnt=0,srcMaxSum=0;
    WSD.srcCols.forEach(function(cid){
      var col=colMap[cid];if(!col)return;
      var v=s[cid];
      if(v===''||v===undefined||v===null||v==='م')return;
      var n=(v==='غ')?0:Math.min(Number(v)||0,col.max);
      srcSum+=n;srcMaxSum+=col.max;srcCnt++;
    });
    if(!srcCnt)return;
    var ratio=srcMaxSum>0?srcSum/srcMaxSum:0;
    if(tg.assess){var af='a'+week;if(s[af]!=='غ'&&s[af]!=='م'){if(!scopeEmpty||isEmpty(s[af])){s[af]=jv(ratio*assessMax,assessMax,3);changed++;}}}
    if(tg.hw){var hf='h'+week;if(s[hf]!=='غ'&&s[hf]!=='م'){if(!scopeEmpty||isEmpty(s[hf])){s[hf]=jv(ratio*hwMax,hwMax,2);changed++;}}}
    if(tg.beh){var bf='bw'+week;if(s[bf]!=='غ'&&s[bf]!=='م'){if(!scopeEmpty||isEmpty(s[bf])){s[bf]=jv(ratio*behMax,behMax,2);changed++;}}}
  });
  saveDB();WSD.open=false;
  showSnack('✅ تم التوزيع الذكي — '+changed+' خلية');
  renderWeekly();
}

function weeklyClearGradeCol(type){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var label=type==='assess'?'التقييم':type==='imlaa'?'الإملاء':type==='beh'?'السلوك':'الواجب';
  if(!confirm('مسح '+label+' للأسبوع '+week+' للفصل '+cls+' نهائياً؟'))return;
  var students=DB.data[cls]||[];
  students.forEach(function(s){
    if(type==='assess'||type==='both') s['a'+week]='';
    if(type==='hw'||type==='both')     s['h'+week]='';
    if(type==='imlaa')                 s['im'+week]='';
    if(type==='beh'){
      s['bw'+week]='';
      s.beh1=''; s.beh2='';
    }
  });
  saveDB();renderWeekly();
  showSnack('✅ تم مسح '+label+' — الأسبوع '+week,'ok');
}
function weeklyClearAbsCol(ci){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var absCols=buildAbsCols(cls,week);
  var colLabel=absCols[ci]?absCols[ci].label:'الفترة';
  if(!confirm('مسح غياب '+colLabel+' للأسبوع '+week+' للفصل '+cls+' نهائياً؟'))return;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var k='w'+week+'_ci'+ci;
  students.forEach(function(s){
    if(DB.absences&&DB.absences[cls]&&DB.absences[cls][s.id])
      delete DB.absences[cls][s.id][k];
  });
  saveDB();renderWeekly();
  showSnack('✅ تم مسح غياب '+colLabel+' — الأسبوع '+week,'ok');
}
function weeklyExport(){
  try{
    var wb=XLSX.utils.book_new();
    var activeWks=_getActiveWeeks();
    DB.classes.forEach(function(cls){
      var sts=(DB.data[cls]||[]).filter(function(s){return s.name;});
      var hdrs=["م","الاسم"];
      activeWks.forEach(function(w){hdrs.push("تقييم أسبوع "+w+" /20","واجب أسبوع "+w+" /10","إملاء أسبوع "+w+" /10");});
      hdrs.push("متوسط سلوك /10","المجموع /"+totalMax(),"فترات الغياب");
      var rows=sts.map(function(s,i){
        var row=[i+1,s.name];
        activeWks.forEach(function(w){row.push(s["a"+w]||"",s["h"+w]||"",s["im"+w]||"");});
        var res=calcStudent(s);
        row.push((Number(s.beh1)||0)+(Number(s.beh2)||0),res.total,countStudentAbsencePeriods(cls,s.id));
        return row;
      });
      var ws=XLSX.utils.aoa_to_sheet([hdrs].concat(rows));
      XLSX.utils.book_append_sheet(wb,ws,cls.substring(0,31));
    });
    XLSX.writeFile(wb,"الدرجات_الأسبوعية.xlsx");
  }catch(e){alert("خطأ: "+e.message);}
}

// ══════════════════════════════════════════════════════
