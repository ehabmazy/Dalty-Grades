

// ══════════════════════════════════════════════════════
// SECTION 1: ROUTING (no login)
// ══════════════════════════════════════════════════════
function doLogout(){location.reload();}

function showApp(){
  var _ls=document.getElementById("loginScreen");if(_ls)_ls.style.display="none";
  var shell=document.getElementById("appShell");
  if(shell)shell.classList.add("visible");
  var _un=document.getElementById("topUserName");if(_un)_un.textContent="";
  if(!window._booted){window._booted=true;initDB();initNotifications();}
  if(window.innerWidth<=700){closeSidebar();}else{openSidebar();}
  setTimeout(function(){switchPage("home");},0);
  if(typeof loadSavedFontSettings === 'function') loadSavedFontSettings();
}
window.addEventListener("load",function(){
  showApp();
});
document.addEventListener("contextmenu",function(e){e.preventDefault();});

// ── SIDEBAR CONTROL ──────────────────────────────────
var _sbOpen=true;
function toggleSidebar(){_sbOpen=!_sbOpen;_applySidebar();}
function openSidebar(){_sbOpen=true;_applySidebar();}
function closeSidebar(){_sbOpen=false;_applySidebar();}
function closeSidebarMobile(){if(window.innerWidth<=700)closeSidebar();}
function _applySidebar(){
  var sb=document.getElementById("appSidebar");
  var ov=document.getElementById("sidebarOverlay");
  if(!sb)return;
  if(_sbOpen){
    sb.classList.remove("collapsed");
    if(ov){ov.classList[window.innerWidth<=700?"add":"remove"]("active");}
  }else{
    sb.classList.add("collapsed");
    if(ov)ov.classList.remove("active");
  }
}
window.addEventListener("resize",function(){
  if(window.innerWidth>700&&!_sbOpen){_sbOpen=true;_applySidebar();}
  if(window.innerWidth<=700&&_sbOpen){closeSidebar();}
});

// ── PAGE ROUTING ─────────────────────────────────────
var _PAGE_TITLES={
  home:"🏠 الرئيسية",
  grades:"📝 الدرجات",weekly:"📅 الأسبوعي",
  sched:"🗓 الجدول",absence:"📋 الغياب",sick:"🤒 المرضى",
  dict:"🎤 الإملاء",stats:"📊 إحصائيات",settings:"⚙️ الإعدادات",
  notifs:"🔔 الإشعارات",curric:"📖 توزيع المنهج",
  backup:"💾 النسخ الاحتياطي",
  witness:"✍️ توقيع المتابع",
  tafrigh:"📋 كشف التفريغ"
};
var _ALL_PAGES=["home","grades","weekly","sched","absence","sick","dict","stats","settings","notifs","curric","backup","witness","tafrigh"];
var _currentPage="home";

function _tryRequestNotifPermission(){
  if(typeof Notification==='undefined') return;
  if(Notification.permission==='default'){
    Notification.requestPermission().then(function(result){
      if(result==='granted') showSnack('✅ تم تفعيل إشعارات المتصفح');
      else if(result==='denied') showSnack('⚠️ إشعارات المتصفح مرفوضة — ستعمل الإشعارات الداخلية فقط','warn');
      window._notifPermAsked=true;
    });
  }
  window._notifPermAsked=true;
}
function switchPage(p){
  _ALL_PAGES.forEach(function(x){
    var pg=document.getElementById("page_"+x);
    if(pg){pg.classList.remove("active");pg.style.display="none";}
    var nb=document.getElementById("nb_"+x);
    if(nb)nb.classList.remove("active");
  });
  var el=document.getElementById("page_"+p);
  if(el){
    el.style.display=(p==="backup")?"block":"flex";
    el.classList.add("active");
  }
  var nb=document.getElementById("nb_"+p);
  if(nb)nb.classList.add("active");
  _currentPage=p;
  var tt=document.getElementById("topPageTitle");
  if(tt)tt.textContent=_PAGE_TITLES[p]||p;
  var _topBrand=document.getElementById("topBrand");
  if(_topBrand)_topBrand.style.display=(p==="weekly"||p==="tafrigh")?"none":"flex";
  if(tt)tt.style.display=(p==="weekly"||p==="tafrigh")?"none":"";
  if(p==="grades")   renderGrades();
  if(p==="weekly")   renderWeekly();
  if(p==="sched")    renderSched();
  if(p==="absence")  renderAbsence();
  if(p==="sick")     renderSick();
  if(p==="dict")     renderDict();
  if(p==="stats")    renderStats();
  if(p==="settings") renderSettings();
  if(p==="notifs")    renderNotifsPage();
  if(p==="home")      renderHomePage();
  if(p==="curric")    renderCurric();
  if(p==="backup")    { if(typeof renderBackupPage==="function") renderBackupPage(); }
  if(p==="witness")   renderWitnessPage();
  if(p==="tafrigh")   { if(typeof renderTafrighPage==="function") renderTafrighPage(); }
  if(p!=="notifs"&&p!=="home"&&typeof _stopClock!=="undefined") _stopClock();
  // Show/hide topbar menus based on page
  var _isHome=(p==="home");
  var _isWeekly=(p==="weekly");
  var _isGrades=(p==="grades");
  var _tbEdit=document.getElementById("tbMenuEdit");
  var _tbCls=document.getElementById("tbMenuCls");
  var _tbDev=document.getElementById("tbDevBtn");
  var _tbPages=document.getElementById("tbMenuPages");
  var _tbTools=document.getElementById("tbMenuTools");
  var _tbGWeeks=document.getElementById("tbMenuGradeWeeks");
  if(_tbEdit)_tbEdit.style.display=(_isHome)?"none":"flex";
  if(_tbCls)_tbCls.style.display=(_isHome||p==="dict"||p==="absence"||p==="tafrigh")?"none":"flex";
  var _tbDict=document.getElementById("tbDictBtns");
  if(_tbDict)_tbDict.style.display=(p==="dict")?"flex":"none";
  if(_tbPages)_tbPages.style.display=_isGrades?"flex":"none";
  if(_tbTools)_tbTools.style.display=_isGrades?"flex":"none";
  if(_tbGWeeks)_tbGWeeks.style.display=_isGrades?"flex":"none";
  var _tbHomeCols=document.getElementById("tbMenuHomeCols");
  if(_tbHomeCols)_tbHomeCols.style.display=_isGrades?"flex":"none";
  if(!_isGrades){pagesBarClose();toolsBarClose();gradeWeeksBarClose();homeColsBarClose();}
  if(p!=="dict"){var _dcb=document.getElementById('dictClsBar');if(_dcb)_dcb.classList.remove('open');var _dcbBtn=document.getElementById('tbDictClsBarBtn');if(_dcbBtn){_dcbBtn.style.background='rgba(251,191,36,.12)';_dcbBtn.style.borderColor='#78350f';_dcbBtn.style.color='#fbbf24';}}
  if(_tbDev)_tbDev.style.display=_isWeekly?"flex":"none";
  var _tbWeeks=document.getElementById("tbWeeksBtn");
  if(_tbWeeks)_tbWeeks.style.display=_isWeekly?"flex":"none";
  var _tbView=document.getElementById("tbViewBtn");
  if(_tbView)_tbView.style.display=_isWeekly?"flex":"none";
  var _isTafrigh=(p==="tafrigh");
  var _tfrIds=["tbMenuTfrCls","tbMenuTfrWeeks","tbMenuTfrCols","tbMenuTfrMeta","tbMenuTfrPrint","tbMenuTfrCF","tbMenuTfrExcel","tbMenuTfrFont"];
  _tfrIds.forEach(function(id){var el=document.getElementById(id);if(el)el.style.display=_isTafrigh?"flex":"none";});
  if(!_isTafrigh&&typeof tfrAllBarsClose==="function") tfrAllBarsClose();
  var _isAbsence=(p==="absence");
  var _tbAbsCls=document.getElementById("tbMenuAbsCls");
  var _tbAbsWeeks=document.getElementById("tbMenuAbsWeeks");
  if(_tbAbsCls)_tbAbsCls.style.display=_isAbsence?"flex":"none";
  if(_tbAbsWeeks)_tbAbsWeeks.style.display=_isAbsence?"flex":"none";
  if(!_isAbsence){absClsBarClose();absWeeksBarClose();}
  /* إخفاء لوحة الأرقام العائمة عند الانتقال لأي صفحة لا تستخدمها */
  if(p!=='weekly' && p!=='grades'){
    if(typeof FNP_hide==='function') FNP_hide();
  }
  if(!_isWeekly){
    var sp=document.getElementById('devBar');
    if(sp)sp.classList.remove('open');
    var devBtn=document.getElementById('tbDevBtn');
    if(devBtn)devBtn.classList.remove('active');
    if(typeof _devBarState!=='undefined'){_devBarState.open=false;_devBarState.search=false;_devBarState.imlaa=false;_devBarState.customFont=false;}
    // إغلاق شريط الأسابيع
    var wb=document.getElementById('weeksBar');
    if(wb)wb.classList.remove('open');
    var wbBtn=document.getElementById('tbWeeksBtn');
    if(wbBtn)wbBtn.classList.remove('active');
    // إغلاق شريط العرض
    var vb=document.getElementById('viewBar');
    if(vb)vb.classList.remove('open');
    var vbBtn=document.getElementById('tbViewBtn');
    if(vbBtn)vbBtn.classList.remove('active');
  }
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

// SECTION 2: DATA MODEL & STORAGE
// ══════════════════════════════════════════════════════
var STORE_KEY="grades_v6";
var ALL_WEEKS=[1,2,3,4,5,6,7,8,9,10,11,12,13,14];
var DAYS_AR=["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
var DAYS_SHORT=["س","أ","ن","ث","ر","خ","ج"];

// DB shape:
// {
//   classes:[],
//   data:{ cls:[student,...] },
//   meta:{ subject, startDate, periodsPerWeek },
//   colPages:[{ id, name, cols:[{id,field,label,max,visible,order}] }],
//   schedule:{ cls:{ periods:[{id,time,label}], slots:{periodId_dayIdx: subject} } },
//   absences:{ cls:{ studentId:{ weekNum_periodId_dayIdx: bool } } }
// }

function emptyStudent(id,name){
  var s={id:id,name:name||"",photo:null,absences:{}};
  ALL_WEEKS.forEach(function(w){s["a"+w]="";s["h"+w]="";s["im"+w]="";s["bw"+w]="";});
  s.beh1="";s.beh2="";s.ex1="";s.ex2="";s._totalAbsent=false;
  return s;
}

function defaultColPages(){
  // Page 1: Assessments /20
  var assessCols=ALL_WEEKS.map(function(w,i){return{id:"a"+w,field:"a"+w,label:"تقييم أسبوع "+w,max:20,visible:true,order:i};});
  // Page 2: Homework /10
  var hwCols=ALL_WEEKS.map(function(w,i){return{id:"h"+w,field:"h"+w,label:"واجب أسبوع "+w,max:10,visible:true,order:i};});
  // Page 2b: Behavior /10 per week
  var behCols=ALL_WEEKS.map(function(w,i){return{id:"bw"+w,field:"bw"+w,label:"سلوك ومواظبة أسبوع "+w,max:10,visible:true,order:i};});
  // Page 3: Behavior & Exams
  var otherCols=[
    {id:"ex1", field:"ex1", label:"اختبار 1",max:15,visible:true,order:0},
    {id:"ex2", field:"ex2", label:"اختبار 2",max:15,visible:true,order:1}
  ];
  return[
    {id:"pg_assess",name:"التقييمات /20",   cols:assessCols},
    {id:"pg_hw",    name:"الواجبات /10",    cols:hwCols},
    {id:"pg_beh",   name:"السلوك والمواظبة /10", cols:behCols},
    {id:"pg_other", name:"الاختبارات",cols:otherCols}
  ];
}

function defaultSchedule(){return{periods:[],slots:{}};}

function freshDB(){
  var cls=["فصل 2-4","فصل 2-5","فصل 2-6","فصل 2-7"];
  var data={};var sched={};var absDB={};
  cls.forEach(function(c){
    data[c]=[emptyStudent(1,"محمد أحمد علي"),emptyStudent(2,"أحمد محمد حسن")];
    sched[c]=defaultSchedule();
    absDB[c]={};
  });
  return{classes:cls,data:data,meta:{subject:"العلوم",startDate:"",periodsPerWeek:3,periodsPerDay:4,activeWeeks:14,periodTimes:[],semester:1,schoolYear:"2025 / 2026"},colPages:defaultColPages(),schedule:sched,absences:absDB,curric:{units:[],weeks:[],holidays:[],exams:[]}};
}

var DB=null;
function loadDB(){
  try{var s=localStorage.getItem(STORE_KEY);if(s)return JSON.parse(s);}catch(e){}
  return null;
}
function saveDB(){
  try{localStorage.setItem(STORE_KEY,JSON.stringify(DB));}catch(e){}
}
function initDB(){
  var saved=loadDB();
  DB=saved||freshDB();
  // migrations
  if(!DB.colPages)DB.colPages=defaultColPages();
  if(!DB.schedule){DB.schedule={};DB.classes.forEach(function(c){DB.schedule[c]=defaultSchedule();});}
  if(!DB.absences){DB.absences={};DB.classes.forEach(function(c){DB.absences[c]={};});}
  if(!DB.meta.activeWeeks)DB.meta.activeWeeks=14;
  if(!DB.meta.periodTimes)DB.meta.periodTimes=[];
  if(!DB.meta.schoolName)DB.meta.schoolName='Dalty Grades';
  if(!DB.meta.teacherName)DB.meta.teacherName='إيهاب ماري عبده';
  if(!DB.meta.teacherGender)DB.meta.teacherGender='male';
  if(DB.meta.teacherPhoto===undefined)DB.meta.teacherPhoto='';
  if(DB.meta.defaultStudentPhoto===undefined)DB.meta.defaultStudentPhoto='images/logo.jpg';
  if(!DB.meta.semester)DB.meta.semester=1;
  if(!DB.meta.schoolYear)DB.meta.schoolYear='2025 / 2026';
  if(DB.meta.absenceAllowed===undefined)DB.meta.absenceAllowed=0;
  if(DB.meta.absenceDeductPer===undefined)DB.meta.absenceDeductPer=0;
  // absenceMode: 'none' | 'zero' | 'deduct'
  if(!DB.meta.absenceMode)DB.meta.absenceMode='none';
  // examAbsenceMode: 'zero' | 'exclude'
  // zero    = غ في الاختبار يُحتسب صفراً (الوضع الافتراضي)
  // exclude = غ يُحذف الاختبار من الحساب (كأنه لم يُجرَ)
  if(!DB.meta.examAbsenceMode)DB.meta.examAbsenceMode='zero';
  if(DB.meta.examAbsenceMode==='max')DB.meta.examAbsenceMode='zero'; // إزالة وضع قديم غير منطقي
  if(!DB.curric)DB.curric={units:[],weeks:[],holidays:[],exams:[]};
  if(!DB.curric.units)DB.curric.units=[];
  if(!DB.curric.weeks)DB.curric.weeks=[];
  if(!DB.curric.holidays)DB.curric.holidays=[];
  if(!DB.curric.exams)DB.curric.exams=[];
  DB.classes.forEach(function(c){
    if(!DB.schedule[c])DB.schedule[c]=defaultSchedule();
    if(!DB.absences[c])DB.absences[c]={};
    (DB.data[c]||[]).forEach(function(s){
      if(!s.absences)s.absences={};
      // migration: add im fields if missing
      ALL_WEEKS.forEach(function(w){if(s["im"+w]===undefined)s["im"+w]="";});
    });
  });
  // remove pg_imlaa colPage if it exists (no longer used in grades)
  if(DB.colPages){DB.colPages=DB.colPages.filter(function(p){return p.id!=="pg_imlaa";});}
  // migration: add pg_beh colPage if missing
  if(DB.colPages&&!DB.colPages.find(function(p){return p.id==="pg_beh";})){
    var behColsMig=ALL_WEEKS.map(function(w,i){return{id:"bw"+w,field:"bw"+w,label:"سلوك ومواظبة أسبوع "+w,max:10,visible:true,order:i};});
    // insert after pg_hw
    var hwIdx=DB.colPages.findIndex?DB.colPages.findIndex(function(p){return p.id==="pg_hw";}):1;
    DB.colPages.splice(hwIdx+1,0,{id:"pg_beh",name:"السلوك والمواظبة /10",cols:behColsMig});
  }
  // migration: update pg_beh name
  var _pb=DB.colPages&&DB.colPages.find(function(p){return p.id==="pg_beh";});
  if(_pb&&_pb.name!=="السلوك والمواظبة /10")_pb.name="السلوك والمواظبة /10";
  // migration: remove beh1/beh2 from pg_other if still present
  var _po=DB.colPages&&DB.colPages.find(function(p){return p.id==="pg_other";});
  if(_po){_po.cols=_po.cols.filter(function(c){return c.id!=="beh1"&&c.id!=="beh2";});
    // rename old tab if needed
    if(_po.name==="سلوك / اختبارات")_po.name="الاختبارات";
  }
  // migration: add bw fields if missing on students
  DB.classes.forEach(function(c){
    (DB.data[c]||[]).forEach(function(s){
      ALL_WEEKS.forEach(function(w){if(s["bw"+w]===undefined)s["bw"+w]="";});
    });
  });
  // Update school name in static HTML elements
  var _sn=DB.meta.schoolName||'Dalty Grades';
  var _lsn=document.getElementById('loginSchoolTitle');if(_lsn)_lsn.textContent=_sn;
  var _ssn=document.getElementById('sidebarSchoolName');if(_ssn)_ssn.textContent='Dalty Grades';
  applyAppFont();
}

// ══════════════════════════════════════════════════════
// SECTION 3: HELPERS
// ══════════════════════════════════════════════════════
// ── تطبيق خط التطبيق ──
var _loadedFonts={};
function applyAppFont(){
  var font=DB&&DB.meta&&DB.meta.appFont?DB.meta.appFont:'Amiri';
  var size=DB&&DB.meta&&DB.meta.appFontSize?DB.meta.appFontSize:14;
  // تحميل خط Google Fonts إن لزم
  if(font!=='inherit'&&font!=='Arial'&&!_loadedFonts[font]){
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(font)+':wght@400;700;900&display=swap';
    document.head.appendChild(link);
    _loadedFonts[font]=true;
  }
  // استخدام <style> tag بـ !important للتغلب على CSS الموجود
  var styleId='appFontOverride';
  var el=document.getElementById(styleId);
  if(!el){el=document.createElement('style');el.id=styleId;document.head.appendChild(el);}
  var fontVal=font==='inherit'?'inherit':"'"+font+"',sans-serif";
  var scale=size/14; // 14px = baseline
  el.textContent=
    '*,*::before,*::after{font-family:'+fontVal+'!important;}'
    +'html{font-size:'+size+'px!important;}'
    +'body,input,select,textarea,button{font-family:'+fontVal+'!important;}';
  // معاينة في صفحة الإعدادات
  var prev=document.getElementById('fontPreviewLbl');
  if(prev){prev.style.fontFamily=font==='inherit'?'':font;}
  var sizeEl=document.getElementById('fontSizeVal');
  if(sizeEl)sizeEl.textContent=size+'px';
}

function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}

// ── Long-press repeat for grade arrows ──
var _holdTimer=null,_holdInterval=null;
function holdStart(fn){
  fn();
  _holdTimer=setTimeout(function(){
    _holdInterval=setInterval(fn,80);
  },400);
}
function holdEnd(){
  clearTimeout(_holdTimer);
  clearInterval(_holdInterval);
  _holdTimer=null;_holdInterval=null;
}
function gc(t){if(t==="غ")return"#b45309";if(t>=60)return"#10b981";if(t>=40)return"#f59e0b";return"#ef4444";}

function showSnack(msg,undoFn,type){
  var c=document.getElementById("snackContainer");
  if(!c){console.log("SNACK:",msg);return;}
  var cls="snack";
  if(!type){if(msg.indexOf("✅")>=0||msg.indexOf("تم")===0)cls+=" snack-ok";else if(msg.indexOf("⚠")>=0)cls+=" snack-warn";else if(msg.indexOf("❌")>=0||msg.indexOf("خطأ")===0)cls+=" snack-err";}
  else cls+=" snack-"+type;
  var d=document.createElement("div");
  d.className=cls;
  var uid="su"+Date.now();
  d.innerHTML=esc(msg)+(undoFn?'<button class="snack-undo" id="'+uid+'">↩ تراجع</button>':"");
  c.innerHTML="";c.appendChild(d);
  if(undoFn){setTimeout(function(){var b=document.getElementById(uid);if(b)b.addEventListener("click",function(){undoFn();c.innerHTML="";});},0);}
  clearTimeout(showSnack._t);
  showSnack._t=setTimeout(function(){if(c.contains(d))c.removeChild(d);},3500);
}

// All cols flat from colPages
function allCols(){
  var r=[];
  (DB.colPages||[]).forEach(function(pg){(pg.cols||[]).forEach(function(c){r.push(c);});});
  return r;
}
function allVisibleCols(){return allCols().filter(function(c){return c.visible;});}

function totalMax(){
  // مجموع ثابت: متوسط تقييم(20) + متوسط واجب(10) + سلوك(10) + اختبارات(30) = 70
  return 70;
}

// حساب متوسط السلوك لكل نصف من الأسابيع المُرصدة (من 10)
function calcBehHalves(s){
  var _aw=DB&&DB.meta?Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length):14;
  var _awList=ALL_WEEKS.slice(0,_aw);
  var half=Math.ceil(_aw/2);
  var firstList=_awList.slice(0,half);
  var secondList=_awList.slice(half);
  function avgHalf(list){
    var sum=0,cnt=0;
    list.forEach(function(w){
      var v=s["bw"+w];
      if(v===""||v===undefined||v===null||v==="م")return;
      sum+=(v==="غ"?0:Math.min(Number(v)||0,10));
      cnt++;
    });
    return cnt?Math.round(sum/cnt):null; // null = لم يُرصد بعد
  }
  return{beh1:avgHalf(firstList),beh2:avgHalf(secondList)};
}

function calcStudent(s,cls){
  if(s._totalAbsent)return{total:0,avgAssess:0,avgHw:0,avgBeh:0,absenceDeduct:0,absencePeriods:0};
  var aSum=0,aC=0,hSum=0,hC=0,bSum=0,bC=0,exSum=0;
  var _aw=DB&&DB.meta?Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length):14;
  var _awList=ALL_WEEKS.slice(0,_aw);
  // حساب السلوك من الأسابيع المُرصدة (bw fields)
  _awList.forEach(function(w){
    var bwv=s["bw"+w];
    if(bwv===""||bwv===undefined||bwv===null)return;
    if(bwv==="م")return;
    if(bwv!=="غ"&&isNaN(Number(bwv)))return; // تجاهل قيم غير صالحة (D وغيرها)
    var bwn=bwv==="غ"?0:Math.min(Number(bwv)||0,10);
    bSum+=bwn;bC++;
  });
  var hasBwData=bC>0;
  allCols().forEach(function(c){
    if(c.id.match(/^a\d+$/)){var wn=parseInt(c.id.slice(1));if(_awList.indexOf(wn)<0)return;}
    if(c.id.match(/^h\d+$/)){var wn=parseInt(c.id.slice(1));if(_awList.indexOf(wn)<0)return;}
    if(c.id.match(/^bw\d+$/))return;
    if(c.id==="beh1"||c.id==="beh2")return;
    if(!c.visible&&c.id!=="ex1"&&c.id!=="ex2")return;
    var raw=s[c.field];
    if(raw===""||raw===undefined||raw===null)return;
    if(raw==="م")return;
    // الاختبارات تُعالَج لاحقاً بمنطق خاص
    if(c.id==="ex1"||c.id==="ex2")return;
    var v=raw==="غ"?0:Math.min(Number(raw)||0,c.max);
    if(c.id.charAt(0)==="a"&&c.id!=="abs"){aSum+=v;aC++;}
    else if(c.id.charAt(0)==="h"){hSum+=v;hC++;}
  });

  // ── حساب الاختبارات مع مراعاة examAbsenceMode ──
  var _exMode=DB&&DB.meta?DB.meta.examAbsenceMode:'zero';
  var exCols=[]; // جمع أعمدة الاختبارات المرئية
  allCols().forEach(function(c){if(c.id==="ex1"||c.id==="ex2")exCols.push(c);});
  var exVals={}; // {ex1: value_or_null, ex2: value_or_null}  null = غياب
  exCols.forEach(function(c){
    var raw=s[c.field];
    if(raw===""||raw===undefined||raw===null||raw==="م")return; // فراغ/استثناء = يُتجاهل
    if(raw==="غ"){exVals[c.id]=null;} // غياب
    else{exVals[c.id]=Math.min(Number(raw)||0,c.max);}
  });
  // تطبيق القاعدة
  exCols.forEach(function(c){
    if(!(c.id in exVals))return; // لم يُدخَل بعد — تُتجاهل
    var val=exVals[c.id];
    if(val===null){
      // غياب في هذا الاختبار
      if(_exMode==='zero'){
        exSum+=0; // صفر
      } else if(_exMode==='exclude'){
        // لا تضيف شيئاً — كأن الاختبار لم يوجد
      }
    } else {
      exSum+=val;
    }
  });
  var avgA=aC?Math.round(aSum/aC):0;
  var avgH=hC?Math.round(hSum/hC):0;
  // السلوك = متوسط جميع أسابيع bw المُرصدة
  var beh=hasBwData?Math.round(bSum/bC):0;
  var avgBehDisp=hasBwData?beh:'—';
  var ex=Math.min(exSum,30);
  var total=avgA+avgH+beh+ex;

  // ── تأثير الغياب على المجموع ──
  var absenceDeduct=0;
  var absencePeriods=0;
  var _mode=DB&&DB.meta?DB.meta.absenceMode:'none';

  if(_mode==='zero'){
    // وضع "غ = صفر": إذا كان الطالب غائباً (أي فترة مسجّلة) يأخذ صفراً
    var _cls0=cls||(window.GS?GS.activeClass:'');
    if(!_cls0&&window.WKS)_cls0=WKS.activeClass;
    if(_cls0&&s.id&&DB.absences&&DB.absences[_cls0]){
      absencePeriods=countStudentAbsencePeriods(_cls0,s.id);
      if(absencePeriods>0){total=0;absenceDeduct=avgA+avgH+(hasBwData?beh:0)+ex;}
    }
  } else if(_mode==='deduct'){
    // وضع "خصم بالفترات": خصم درجات لكل فترة تتجاوز الحد المسموح
    var _allowed=DB&&DB.meta?Math.max(0,Number(DB.meta.absenceAllowed)||0):0;
    var _deductPer=DB&&DB.meta?Math.max(0,Number(DB.meta.absenceDeductPer)||0):0;
    if(_deductPer>0){
      var _cls=cls||(window.GS?GS.activeClass:'');
      if(!_cls&&window.WKS)_cls=WKS.activeClass;
      if(_cls&&s.id&&DB.absences&&DB.absences[_cls]){
        absencePeriods=countStudentAbsencePeriods(_cls,s.id);
        var extraPeriods=Math.max(0,absencePeriods-_allowed);
        absenceDeduct=extraPeriods*_deductPer;
        total=Math.max(0,total-absenceDeduct);
      }
    }
  }
  // وضع 'none': لا يتغير المجموع

  return{total:total,avgAssess:avgA,avgHw:avgH,avgBeh:avgBehDisp,exTotal:ex,absenceDeduct:absenceDeduct,absencePeriods:absencePeriods};
}

function distributeTotal(target,s){
  // توزيع المجموع على: متوسط تقييم(20) + متوسط واجب(10) + سلوك(10) + اختبارات(30) = 70
  var rmin=GS&&GS.distRange?GS.distRange.min:0;
  var rmax2=GS&&GS.distRange&&GS.distRange.max!==null?GS.distRange.max:70;
  target=clamp(Math.round(Number(target)),rmin,rmax2);
  if(isNaN(target))return null;
  var p=Object.assign({},s);
  // توزيع عشوائي مع مراعاة النسب
  var base=target/70;
  var avgA=clamp(Math.round(20*base+Math.floor(Math.random()*5)-2),0,20);
  var avgH=clamp(Math.round(10*base+Math.floor(Math.random()*3)-1),0,10);
  var beh =clamp(Math.round(10*base+Math.floor(Math.random()*3)-1),0,10);
  var ex  =clamp(target-(avgA+avgH+beh),0,30);
  // تصحيح لضمان المجموع = target بالضبط
  var diff=target-(avgA+avgH+beh+ex);
  avgA=clamp(avgA+diff,0,20);
  // توزيع على الأسابيع
  var _daw=DB&&DB.meta?Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length):14;
  var _dawList=ALL_WEEKS.slice(0,_daw);
  _dawList.forEach(function(w){
    var locked=s["a"+w]==="غ"||s["a"+w]==="م";
    if(!locked)p["a"+w]=clamp(avgA+Math.floor(Math.random()*7)-3,0,20);
  });
  _dawList.forEach(function(w){
    var locked=s["h"+w]==="غ"||s["h"+w]==="م";
    if(!locked)p["h"+w]=clamp(avgH+Math.floor(Math.random()*5)-2,0,10);
  });
  p.beh1=0; p.beh2=0; // deprecated fields kept for compatibility
  // توزيع السلوك على الأسابيع
  _dawList.forEach(function(w){
    p["bw"+w]=clamp(beh+Math.floor(Math.random()*3)-1,0,10);
  });
  p.ex1=clamp(Math.floor(ex/2),0,15);
  p.ex2=clamp(ex-p.ex1,0,15);
  p._totalAbsent=false;
  return p;
}

function setAllAbsent(s){
  var p=Object.assign({},s);
  allCols().forEach(function(c){p[c.field]="غ";});
  p._totalAbsent=true;
  return p;
}

// ══════════════════════════════════════════════════════
