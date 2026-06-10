

// ══════════════════════════════════════════════════════
// SECTION 1: ROUTING (no login)
// ══════════════════════════════════════════════════════
function doLogout(){location.reload();}

function showApp(){
  document.getElementById("loginScreen").style.display="none";
  var shell=document.getElementById("appShell");
  shell.classList.add("visible");
  document.getElementById("topUserName").textContent="";
  if(!window._booted){window._booted=true;initDB();initNotifications();}
  if(window.innerWidth<=700){closeSidebar();}else{openSidebar();}
  switchPage("home");
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
var _ALL_PAGES=["home","grades","weekly","sched","absence","sick","dict","stats","settings","notifs","curric","backup","witness","report","tafrigh"];
var _currentPage="grades";

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
  if(_topBrand)_topBrand.style.display=(p==="weekly")?"none":"flex";
  if(tt)tt.style.display=(p==="weekly")?"none":"";
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
  if(p==="report")    { if(typeof renderReportPage==="function") renderReportPage(); }
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
  if(_tbCls)_tbCls.style.display=(_isHome||p==="dict")?"none":"flex";
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
var DAYS_AR=["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس"];
var DAYS_SHORT=["س","أ","ن","ث","ر","خ"];

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
}

// ══════════════════════════════════════════════════════
// SECTION 3: HELPERS
// ══════════════════════════════════════════════════════
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

function calcStudent(s){
  if(s._totalAbsent)return{total:0,avgAssess:0,avgHw:0,avgBeh:0};
  var aSum=0,aC=0,hSum=0,hC=0,bSum=0,bC=0,exSum=0;
  var _aw=DB&&DB.meta?Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length):14;
  var _awList=ALL_WEEKS.slice(0,_aw);
  // حساب السلوك من الأسابيع المُرصدة (bw fields)
  _awList.forEach(function(w){
    var bwv=s["bw"+w];
    if(bwv===""||bwv===undefined||bwv===null)return;
    if(bwv==="م")return;
    var bwn=bwv==="غ"?0:Math.min(Number(bwv)||0,10);
    bSum+=bwn;bC++;
  });
  var hasBwData=bC>0;
  allCols().forEach(function(c){
    if(c.id.match(/^a\d+$/)){var wn=parseInt(c.id.slice(1));if(_awList.indexOf(wn)<0)return;}
    if(c.id.match(/^h\d+$/)){var wn=parseInt(c.id.slice(1));if(_awList.indexOf(wn)<0)return;}
    if(c.id.match(/^bw\d+$/))return;
    if(c.id==="beh1"||c.id==="beh2")return; // تجاهل - لم تعد مستخدمة
    if(!c.visible&&c.id!=="ex1"&&c.id!=="ex2")return;
    var raw=s[c.field];
    if(raw===""||raw===undefined||raw===null)return;
    if(raw==="م")return;
    var v=raw==="غ"?0:Math.min(Number(raw)||0,c.max);
    if(c.id.charAt(0)==="a"&&c.id!=="abs"){aSum+=v;aC++;}
    else if(c.id.charAt(0)==="h"){hSum+=v;hC++;}
    else if(c.id==="ex1"||c.id==="ex2")exSum+=Math.min(v,c.max);
  });
  var avgA=aC?Math.round(aSum/aC):0;
  var avgH=hC?Math.round(hSum/hC):0;
  // السلوك = متوسط جميع أسابيع bw المُرصدة
  var beh=hasBwData?Math.round(bSum/bC):0;
  var avgBehDisp=hasBwData?beh:'—';
  var ex=Math.min(exSum,30);
  var total=avgA+avgH+beh+ex;
  return{total:total,avgAssess:avgA,avgHw:avgH,avgBeh:avgBehDisp,exTotal:ex};
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
// SECTION 4: ABSENCE LOGIC (linked to schedule)
// ══════════════════════════════════════════════════════
// absences[cls][studentId][key] = true
// key = "w{week}_p{periodId}_d{dayIdx}"
// When a student is absent for a period that matches the class schedule,
// the corresponding assessment/hw week gets flagged.

function absKey(week,periodId,dayIdx,dateStr){
  // dateStr optional: "YYYY-MM-DD"
  var base="w"+week+"_p"+periodId+"_d"+dayIdx;
  return dateStr?base+"_dt"+dateStr.replace(/-/g,""):base;
}
function absKeyDate(key){
  // extract date from key if present
  var m=key.match(/_dt(\d{8})$/);
  if(!m)return null;
  var s=m[1];
  return s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6,8);
}
function absKeyBase(key){
  // strip date from key
  return key.replace(/_dt\d{8}$/,"");
}
function getDateForAbsKey(key){
  // Return a display date string from a key
  var dt=absKeyDate(key);
  if(dt){var d=new Date(dt);return d.getDate()+"/"+(d.getMonth()+1);}
  return "";
}
function getWeekDateForDay(week,dayIdx){
  // Return Date object for a specific day in a week
  if(!DB.meta.startDate)return null;
  var d=new Date(DB.meta.startDate);
  // startDate = Saturday of week 1; dayIdx 0=Sat,1=Sun,...
  d.setDate(d.getDate()+(week-1)*7+dayIdx);
  return d;
}
function dateToStr(d){
  if(!d)return "";
  var y=d.getFullYear();
  var m=String(d.getMonth()+1).padStart(2,"0");
  var day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}

function getStudentAbsences(cls,studentId){
  if(!DB.absences[cls])DB.absences[cls]={};
  if(!DB.absences[cls][studentId])DB.absences[cls][studentId]={};
  return DB.absences[cls][studentId];
}

function countStudentAbsencePeriods(cls,studentId){
  var abs=getStudentAbsences(cls,studentId);
  // Count unique absence entries (new format: w{n}_ci{n}, old: w{n}_p{id}_d{n})
  return Object.keys(abs).filter(function(k){return abs[k]==="abs";}).length;
}
function countStudentSickPeriods(cls,studentId){
  var abs=getStudentAbsences(cls,studentId);
  return Object.keys(abs).filter(function(k){return abs[k]==="sick";}).length;
}
function totalClassAbsencePeriods(cls){
  var t=0;(DB.data[cls]||[]).forEach(function(s){t+=countStudentAbsencePeriods(cls,s.id);});return t;
}
function countStudentAbsenceDays(cls,studentId){
  var abs=getStudentAbsences(cls,studentId),weeks=new Set();
  Object.keys(abs).forEach(function(k){if(abs[k]==="abs"||abs[k]==="sick"){var m=k.match(/^w(\d+)_/);if(m)weeks.add(m[1]);}});
  return weeks.size;
}

function totalClassAbsencePeriods(cls){
  var total=0;
  (DB.data[cls]||[]).forEach(function(s){
    total+=countStudentAbsencePeriods(cls,s.id);
  });
  return total;
}
function countStudentAbsenceDays(cls,studentId){
  var abs=getStudentAbsences(cls,studentId);
  var weeks=new Set();
  Object.keys(abs).forEach(function(k){
    if(abs[k]==="abs"||abs[k]==="sick"){
      var m=k.match(/^w(\d+)_/);
      if(m)weeks.add(m[1]);
    }
  });
  return weeks.size;
}

function countStudentAllAbsences(cls,studentId){
  return countStudentAbsencePeriods(cls,studentId)+countStudentSickPeriods(cls,studentId);
}


function toggleAbsence(cls,studentId,week,colIndex){
  // colIndex = index in buildAbsCols array for this week
  var abs=getStudentAbsences(cls,studentId);
  var k="w"+week+"_ci"+colIndex;
  if(abs[k]){delete abs[k];}
  else abs[k]="abs";
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}
function toggleSickCol(cls,studentId,week,colIndex){
  var abs=getStudentAbsences(cls,studentId);
  var k="w"+week+"_ci"+colIndex;
  if(abs[k]==="sick"){delete abs[k];}
  else abs[k]="sick";
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}
function toggleSick(cls,studentId,week,periodId,dayIdx,dateStr){
  // Toggles SICK only. Two states: حضور ↔ مريض
  var abs=getStudentAbsences(cls,studentId);
  var dt=dateStr||(DB.meta.startDate?dateToStr(getWeekDateForDay(week,dayIdx>=0?dayIdx:0)):null);
  var k=absKey(week,periodId,dayIdx,dt);
  var oldK=absKey(week,periodId,dayIdx);
  if(abs[k]==="sick"||abs[oldK]==="sick"){delete abs[k];delete abs[oldK];}
  else{delete abs[oldK];abs[k]="sick";}
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}
function setSickRange(cls,studentId,week,periodId,dayIdx,fromDate,toDate){
  if(!fromDate||!toDate)return;
  var from=new Date(fromDate),to=new Date(toDate);
  var abs=getStudentAbsences(cls,studentId);
  ALL_WEEKS.forEach(function(w){
    var wStart=getWeekDateForDay(w,0);
    if(!wStart)return;
    var wEnd=new Date(wStart);wEnd.setDate(wEnd.getDate()+5);
    if(wStart>to||wEnd<from)return;
    var cols=buildAbsCols(cls,w);
    cols.forEach(function(col,ci){
      var d=getWeekDateForDay(w,col.dayIdx>=0?col.dayIdx:0);
      if(!d||d<from||d>to)return;
      abs["w"+w+"_ci"+ci]="sick";
    });
  });
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}
function clearSickRange(cls,studentId,fromDate,toDate){
  var from=new Date(fromDate),to=new Date(toDate);
  var abs=getStudentAbsences(cls,studentId);
  // For new format keys, we check week start dates
  ALL_WEEKS.forEach(function(w){
    var wStart=getWeekDateForDay(w,0);
    if(!wStart)return;
    var wEnd=new Date(wStart);wEnd.setDate(wEnd.getDate()+5);
    if(wStart>to||wEnd<from)return;
    var cols=buildAbsCols(cls,w);
    cols.forEach(function(col,ci){
      var k="w"+w+"_ci"+ci;
      if(abs[k]==="sick")delete abs[k];
    });
  });
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}
function buildAbsCols(cls,week){
  // عدد الأعمدة دائماً = periodsPerWeek (فترات المادة)
  // الجدول يُضيف فقط بيانات اليوم والوقت لكل فترة
  var ppw=Math.max(1,Number(DB.meta.periodsPerWeek)||3);
  var shared=(DB.schedule&&DB.schedule._shared)||{periods:[],slots:{}};
  var schedPeriods=shared.periods||[];
  var slots=shared.slots||{};

  // جمع فترات المادة من الجدول (مُرتبة حسب اليوم ثم الفترة)
  var scheduledCols=[];
  schedPeriods.forEach(function(period){
    DAYS_AR.forEach(function(_,di){
      var slot=slots[period.id+"_d"+di]||"";
      if(slot.trim()===cls){
        scheduledCols.push({period:period,dayIdx:di,
          label:DAYS_SHORT[di]+" "+(period.label||period.id)});
      }
    });
  });

  var cols=[];
  for(var pi=0;pi<ppw;pi++){
    if(pi<scheduledCols.length){
      // استخدم بيانات الجدول
      cols.push(scheduledCols[pi]);
    } else {
      // لا يوجد في الجدول — أنشئ عموداً وهمياً
      cols.push({period:{id:"g"+pi,label:"ف"+(pi+1)},dayIdx:pi%6,label:"ف"+(pi+1)});
    }
  }
  return cols;
}
function _refreshCurrentAndRelated(){
  if(_currentPage==="absence")renderAbsence();
  if(_currentPage==="sick")renderSick();
  if(_currentPage==="weekly"){
    // تزامن الفصل النشط بين الأسبوعي والدرجات
    GS.activeClass=WKS.activeClass;
    renderWeekly();
  }
  if(_currentPage==="grades")renderGrades();
}

function applyAbsenceToGrades(cls,studentId){
  var abs=getStudentAbsences(cls,studentId);
  var stu=null;var stuIdx=-1;
  (DB.data[cls]||[]).forEach(function(s,i){if(s.id==studentId){stu=s;stuIdx=i;}});
  if(!stu)return;
  var p=Object.assign({},stu);

  ALL_WEEKS.forEach(function(w){
    var cols=buildAbsCols(cls,w);
    // hwAbsLink: which colIndex maps to HW (default 0)
    var hwIdx=window.WKS&&WKS.hwAbsLink!==undefined
              ?Math.min(Number(WKS.hwAbsLink),Math.max(0,cols.length-1)):0;

    var absHw=false,absAssess=false,sickHw=false,sickAssess=false;

    cols.forEach(function(col,ci){
      var k="w"+w+"_ci"+ci;
      var val=abs[k];
      if(!val)return;
      var isHwCol=(ci===hwIdx);
      if(val==="abs"){ if(isHwCol)absHw=true;    else absAssess=true; }
      if(val==="sick"){if(isHwCol)sickHw=true;   else sickAssess=true;}
    });

    // HW grade
    if(absHw)        p["h"+w]="غ";
    else if(sickHw)  p["h"+w]="م";
    else if(p["h"+w]==="غ"||p["h"+w]==="م") p["h"+w]="";

    // Assess grade
    if(absAssess)       p["a"+w]="غ";
    else if(sickAssess) p["a"+w]="م";
    else if(p["a"+w]==="غ"||p["a"+w]==="م") p["a"+w]="";
  });

  DB.data[cls][stuIdx]=p;
}




// ══════════════════════════════════════════════════════
// SECTION 5: SCHEDULE PAGE — UNIFIED GRID
// ══════════════════════════════════════════════════════
// Data model: DB.schedule is now a SINGLE shared schedule
// slots are stored as: periodId + "_d" + dayIdx → className
// periods are shared across all classes (stored in DB.schedule._shared)
// ══════════════════════════════════════════════════════

// Class color palette (10 distinct colors)
var CLASS_COLORS=[
  {bg:"#1e40af",text:"#bfdbfe",border:"#3b82f6",light:"rgba(30,64,175,.25)"},
  {bg:"#065f46",text:"#6ee7b7",border:"#10b981",light:"rgba(6,95,70,.25)"},
  {bg:"#7c2d12",text:"#fcd34d",border:"#f59e0b",light:"rgba(124,45,18,.25)"},
  {bg:"#4c1d95",text:"#c4b5fd",border:"#8b5cf6",light:"rgba(76,29,149,.25)"},
  {bg:"#9d174d",text:"#fbcfe8",border:"#ec4899",light:"rgba(157,23,77,.25)"},
  {bg:"#155e75",text:"#a5f3fc",border:"#06b6d4",light:"rgba(21,94,117,.25)"},
  {bg:"#134e4a",text:"#99f6e4",border:"#14b8a6",light:"rgba(19,78,74,.25)"},
  {bg:"#78350f",text:"#fde68a",border:"#f59e0b",light:"rgba(120,53,15,.25)"},
  {bg:"#1e3a5f",text:"#93c5fd",border:"#60a5fa",light:"rgba(30,58,95,.25)"},
  {bg:"#3b1818",text:"#fca5a5",border:"#ef4444",light:"rgba(59,24,24,.25)"},
];

function getClassColor(cls){
  var idx=DB.classes.indexOf(cls);
  if(idx<0)idx=0;
  return CLASS_COLORS[idx%CLASS_COLORS.length];
}

// Get shared periods (unified across all classes)
function getSharedPeriods(){
  if(!DB.schedule._shared){DB.schedule._shared={periods:[],notes:""};}
  if(!DB.schedule._shared.periods){DB.schedule._shared.periods=[];}
  return DB.schedule._shared.periods;
}

// Get unified slot value: periodId + "_d" + dayIdx → className
function getUnifiedSlot(pid,di){
  if(!DB.schedule._shared)return"";
  return (DB.schedule._shared.slots||{})[pid+"_d"+di]||"";
}
function setUnifiedSlot(pid,di,val){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  if(!DB.schedule._shared.slots)DB.schedule._shared.slots={};
  DB.schedule._shared.slots[pid+"_d"+di]=val;
  saveDB();
}

function renderSched(){
  var root=document.getElementById("schedRoot");
  if(!root)return;

  // Migrate old per-class schedules to unified format if needed
  _schedMigrateToUnified();

  var shared=DB.schedule._shared||(DB.schedule._shared={periods:[],slots:{},notes:""});
  var periods=getSharedPeriods();
  var savedTimes=DB.meta.periodTimes||[];

  // Auto-init 4 default periods if none exist
  if(!periods.length){
    _schedInitUnifiedPeriods();
    periods=getSharedPeriods();
  }

  // Count filled slots
  var totalFilled=0;
  periods.forEach(function(p){
    DAYS_AR.forEach(function(_,di){if(getUnifiedSlot(p.id,di).trim())totalFilled++;});
  });

  var html='<div class="sched-page">';

  // ── Header ──
  html+='<div class="sched-header">';
  html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
  html+='<div class="sched-title">🗓 جدول الحصص</div>';
  html+='<span style="background:#1e3a5f;border:1px solid #2d4a6e;border-radius:12px;padding:2px 10px;font-size:9px;color:#60a5fa;">'+periods.length+' فترات</span>';
  html+='<span style="background:#14432a;border:1px solid #10b981;border-radius:12px;padding:2px 10px;font-size:9px;color:#6ee7b7;">'+totalFilled+' خانة محددة</span>';
  html+='</div>';
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">';
  html+='<button class="btn btn-success btn-sm" onclick="schedAddPeriodUnified()">＋ حصة</button>';
  html+='<button onclick="schedToggleSpecial(\'assembly\')" style="background:'+(shared.specialPeriods&&shared.specialPeriods.assembly&&shared.specialPeriods.assembly.enabled?'linear-gradient(135deg,#065f46,#059669)':'#1e293b')+';border:1px solid '+(shared.specialPeriods&&shared.specialPeriods.assembly&&shared.specialPeriods.assembly.enabled?'#059669':'#334155')+';color:'+(shared.specialPeriods&&shared.specialPeriods.assembly&&shared.specialPeriods.assembly.enabled?'#6ee7b7':'#64748b')+';padding:3px 10px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;font-family:inherit;">🟢 طابور</button>';
  html+='<button onclick="schedToggleSpecial(\'break\')" style="background:'+(shared.specialPeriods&&shared.specialPeriods.break&&shared.specialPeriods.break.enabled?'linear-gradient(135deg,#92400e,#d97706)':'#1e293b')+';border:1px solid '+(shared.specialPeriods&&shared.specialPeriods.break&&shared.specialPeriods.break.enabled?'#d97706':'#334155')+';color:'+(shared.specialPeriods&&shared.specialPeriods.break&&shared.specialPeriods.break.enabled?'#fbbf24':'#64748b')+';padding:3px 10px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;font-family:inherit;">☕ فسحة</button>';
  html+='<button class="btn btn-teal btn-sm" onclick="switchPage(\'settings\')">⚙️ المواعيد</button>';
  html+='</div>';
  html+='</div>';

  html+='<div class="sched-body">';

  // ── Stats bar ──
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center;padding:6px 10px;background:#111827;border-radius:7px;border:1px solid #1e3a5f;">';
  html+='<span style="font-size:9.5px;color:#64748b;">عدد الحصص: <strong style="color:#60a5fa;">'+periods.length+'</strong></span>';
  html+='<span style="color:#1e3a5f;">|</span>';
  html+='<span style="font-size:9.5px;color:#64748b;">خانات محددة: <strong style="color:#34d399;">'+totalFilled+'</strong> / '+(periods.length*6)+'</span>';
  if(savedTimes.length){
    html+='<span style="color:#1e3a5f;">|</span>';
    html+='<span style="font-size:9px;color:#f59e0b;">⏰ '+savedTimes.length+' وقت محفوظ</span>';
    html+='<button onclick="schedAutoFillUnified()" style="background:#0369a1;border:none;color:white;padding:2px 10px;border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;font-family:inherit;">⚡ تعبئة المواعيد</button>';
  }
  html+='</div>';

  // ── Class color legend ──
  html+='<div class="sched-legend">';
  html+='<span style="font-size:9px;color:#475569;align-self:center;">الفصول: </span>';
  DB.classes.forEach(function(c){
    var col=getClassColor(c);
    html+='<span class="sched-legend-item" style="background:'+col.bg+';color:'+col.text+';border:1px solid '+col.border+';">'+esc(c)+'</span>';
  });
  html+='</div>';

  // ── Unified grid table ──
  // Build special periods config
  var sp=shared.specialPeriods||(shared.specialPeriods={});
  var spAssembly=sp.assembly||(sp.assembly={enabled:false,time:'',days:{},overrides:{}});
  var spBreak=sp.break||(sp.break={enabled:false,time:'',days:{},overrides:{}});

  // Determine which days have at least one class slot filled
  function daysWithSlots(){
    var d={};
    for(var di=0;di<6;di++){
      var has=periods.some(function(p){return(shared.slots||{})[p.id+'_d'+di];});
      d[di]=has;
    }
    return d;
  }
  var activeDays=daysWithSlots();

  html+='<div class="sched-unified-wrap">';
  html+='<table class="sched-unified-table" style="min-width:'+(90+(periods.length+(spAssembly.enabled?1:0)+(spBreak.enabled?1:0))*120)+'px;">';

  // Header: corner + period columns
  html+='<thead><tr>';
  html+='<th class="corner">اليوم \\ الحصة</th>';

  // طابور column header
  if(spAssembly.enabled){
    html+='<th class="period-hdr ph-assembly">';
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html+='<span class="ph-name" style="color:#34d399;">🟢 طابور</span>';
    html+='<input value="'+esc(spAssembly.time||"")+'" placeholder="7:30-7:45" class="ph-time-inp" style="color:#34d399;"'
      +' onchange="schedSetSpecialTime(\'assembly\',this.value)"'
      +' oninput="schedSetSpecialTime(\'assembly\',this.value)"'
      +'/>';
    html+='<span style="font-size:8px;color:#6ee7b7;background:rgba(16,185,129,.2);padding:1px 6px;border-radius:8px;">تلقائي للأيام النشطة</span>';
    html+='<button class="ph-del-btn" onclick="schedToggleSpecial(\'assembly\')" style="background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.3);">✕ إخفاء</button>';
    html+='</div></th>';
  }

  periods.forEach(function(period,pi){
    var ptype=(shared.periodTypes&&shared.periodTypes[period.id])||"both";
    var ptypeColor=ptype==="hw"?"#fcd34d":(ptype==="assess"?"#93c5fd":"#6ee7b7");
    html+='<th class="period-hdr">';
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html+='<span class="ph-name">'+esc(period.label||('الفترة '+(pi+1)))+'</span>';
    // Time input
    html+='<input id="sti_'+period.id+'" value="'+esc(period.time||"")+'" placeholder="8:00-8:45"'
      +' class="ph-time-inp" autocomplete="off"'
      +' onfocus="schedTimeDropOpen(\''+period.id+'\')"'
      +' onblur="setTimeout(function(){schedTimeDropClose(\''+period.id+'\')},150)"'
      +' onchange="schedSetTimeUnified(\''+period.id+'\',this.value)"'
      +' oninput="schedTimeFilter(\''+period.id+'\')"'
      +'/>';
    // Type select
    html+='<select class="ph-type-sel" onchange="schedSetTypeUnified(\''+period.id+'\',this.value)" style="color:'+ptypeColor+';">';
    html+='<option value="both"'+(ptype==="both"?" selected":"")+'>واجب+تقييم</option>';
    html+='<option value="hw"'+(ptype==="hw"?" selected":"")+'>واجب</option>';
    html+='<option value="assess"'+(ptype==="assess"?" selected":"")+'>تقييم</option>';
    html+='</select>';
    html+='<button class="ph-del-btn" onclick="schedDelPeriodUnified(\''+period.id+'\')">✕ حذف</button>';
    html+='</div></th>';
  });

  // فسحة column header
  if(spBreak.enabled){
    html+='<th class="period-hdr ph-break">';
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html+='<span class="ph-name" style="color:#fbbf24;">☕ فسحة</span>';
    html+='<input value="'+esc(spBreak.time||"")+'" placeholder="10:00-10:20" class="ph-time-inp" style="color:#fbbf24;"'
      +' onchange="schedSetSpecialTime(\'break\',this.value)"'
      +' oninput="schedSetSpecialTime(\'break\',this.value)"'
      +'/>';
    html+='<span style="font-size:8px;color:#fbbf24;background:rgba(251,191,36,.2);padding:1px 6px;border-radius:8px;">تلقائي للأيام النشطة</span>';
    html+='<button class="ph-del-btn" onclick="schedToggleSpecial(\'break\')" style="background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.3);">✕ إخفاء</button>';
    html+='</div></th>';
  }

  html+='</tr></thead>';

  // Body: each row = one day
  html+='<tbody>';
  DAYS_AR.forEach(function(dayName,di){
    var rowCls=di%2===0?"even-row":"odd-row";
    var dayIsActive=activeDays[di];
    html+='<tr>';
    html+='<td class="day-lbl">'+dayName+'</td>';

    // طابور cell
    if(spAssembly.enabled){
      // override: 0=auto(active day), 1=forced on, 2=forced off
      var aOvr=(spAssembly.overrides&&spAssembly.overrides[di])||0;
      var aOn=(aOvr===1)||(aOvr===0&&dayIsActive);
      var aOff=(aOvr===2)||(aOvr===0&&!dayIsActive);
      html+='<td class="slot '+rowCls+(aOn?' sp-assembly':'')+(aOff?' has-cls':'')
        +'" style="'+(aOff?'opacity:.35;':'')+'">';
      if(aOn){
        html+='<div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;">';
        html+='<span class="sched-special-badge sp-badge-assembly">🟢 طابور</span>';
        html+='<button onclick="schedSpecialOverride(\'assembly\','+di+',2)" style="background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35);color:#fca5a5;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إزالة</button>';
        html+='</div>';
      } else {
        html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px;">';
        html+='<span style="font-size:9px;color:#334155;">—</span>';
        if(!dayIsActive){html+='<button onclick="schedSpecialOverride(\'assembly\','+di+',1)" style="background:rgba(16,185,129,.15);border:1px solid #059669;color:#6ee7b7;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إضافة</button>';}
        html+='</div>';
      }
      html+='</td>';
    }

    periods.forEach(function(period){
      var val=getUnifiedSlot(period.id,di);
      var hasCls=val.trim().length>0;
      var col=hasCls?getClassColor(val):null;
      var cellStyle=hasCls?'background:'+col.light+';':'';
      html+='<td class="slot '+rowCls+(hasCls?" has-cls":"")+'" style="'+cellStyle+'">';
      // Colored select
      var selBg=hasCls?col.bg:"#0f172a";
      var selColor=hasCls?col.text:"#64748b";
      var selBorder=hasCls?col.border:"#334155";
      html+='<select class="sched-slot-sel'+(hasCls?" filled":"")+'"'
        +' onchange="schedSetSlotUnified(\''+period.id+'\','+di+',this.value)"'
        +' style="background:'+selBg+';color:'+selColor+';border-color:'+selBorder+';">';
      html+='<option value="" style="background:#1e293b;color:#64748b;">— فارغ —</option>';
      DB.classes.forEach(function(c){
        var cc=getClassColor(c);
        html+='<option value="'+esc(c)+'"'+(val===c?" selected":"")
          +' style="background:'+cc.bg+';color:'+cc.text+';">'+esc(c)+'</option>';
      });
      if(val&&!DB.classes.includes(val)){
        html+='<option value="'+esc(val)+'" selected style="background:#1e293b;">'+esc(val)+'</option>';
      }
      html+='</select>';
      html+='</td>';
    });

    // فسحة cell
    if(spBreak.enabled){
      var bOvr=(spBreak.overrides&&spBreak.overrides[di])||0;
      var bOn=(bOvr===1)||(bOvr===0&&dayIsActive);
      var bOff=(bOvr===2)||(bOvr===0&&!dayIsActive);
      html+='<td class="slot '+rowCls+(bOn?' sp-break':'')+(bOff?' has-cls':'')
        +'" style="'+(bOff?'opacity:.35;':'')+'">';
      if(bOn){
        html+='<div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;">';
        html+='<span class="sched-special-badge sp-badge-break">☕ فسحة</span>';
        html+='<button onclick="schedSpecialOverride(\'break\','+di+',2)" style="background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35);color:#fca5a5;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إزالة</button>';
        html+='</div>';
      } else {
        html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px;">';
        html+='<span style="font-size:9px;color:#334155;">—</span>';
        if(!dayIsActive){html+='<button onclick="schedSpecialOverride(\'break\','+di+',1)" style="background:rgba(251,191,36,.15);border:1px solid #d97706;color:#fbbf24;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إضافة</button>';}
        html+='</div>';
      }
      html+='</td>';
    }

    html+='</tr>';
  });
  html+='</tbody>';

  // Footer: add period
  html+='<tfoot><tr>';
  html+='<td style="border:1.5px solid #334155;padding:8px 10px;background:#0f172a;text-align:center;"><span style="font-size:9px;color:#475569;">إضافة حصة</span></td>';
  html+='<td colspan="'+periods.length+'" style="border:1.5px solid #334155;padding:7px 10px;background:#0f172a;">';
  html+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  html+='<button onclick="schedAddPeriodUnified()" style="background:linear-gradient(135deg,#059669,#10b981);border:none;color:white;padding:5px 18px;border-radius:7px;cursor:pointer;font-size:10.5px;font-weight:700;font-family:inherit;">＋ إضافة حصة</button>';
  if(savedTimes.length){
    html+='<button onclick="schedAutoFillUnified()" style="background:linear-gradient(135deg,#0369a1,#0ea5e9);border:none;color:white;padding:5px 14px;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;font-family:inherit;">⚡ تعبئة المواعيد تلقائياً</button>';
  }
  html+='</div>';
  html+='</td>';
  html+='</tr></tfoot>';

  html+='</table></div>';

  // ── Notes ──
  html+='<div style="background:#1e293b;border-radius:8px;padding:10px 12px;border:1px solid #334155;margin-top:10px;">';
  html+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:6px;">📌 ملاحظات الجدول</div>';
  html+='<textarea id="schedNotes" style="width:100%;background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:5px;padding:6px;font-size:10px;resize:vertical;min-height:50px;outline:none;font-family:inherit;box-sizing:border-box;" placeholder="ملاحظات..." onchange="schedSaveNotesUnified(this.value)">'+esc((shared.notes)||"")+'</textarea>';
  html+='</div>';

  html+='</div></div>';
  root.innerHTML=html;
}

// ── Unified schedule helpers ──────────────────────────
function _schedMigrateToUnified(){
  // If _shared doesn't exist yet, initialize it
  if(!DB.schedule._shared){
    DB.schedule._shared={periods:[],slots:{},notes:""};
    // Try to pull periods from first class that has any
    var migrated=false;
    DB.classes.forEach(function(c){
      if(migrated)return;
      var s=DB.schedule[c]||{};
      if(s.periods&&s.periods.length){
        DB.schedule._shared.periods=JSON.parse(JSON.stringify(s.periods));
        DB.schedule._shared.periodTypes=JSON.parse(JSON.stringify(s.periodTypes||{}));
        // Migrate slots: slot "pid_dDI" for this class → unified slot with class name
        Object.keys(s.slots||{}).forEach(function(k){
          if(s.slots[k])DB.schedule._shared.slots[k]=s.slots[k]?c:"";
        });
        migrated=true;
      }
    });
    saveDB();
  }
}


function _schedInitUnifiedPeriods(){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  var savedTimes=DB.meta.periodTimes||[];
  var count=Math.max(1,Math.min(12,Number(DB.meta.periodsPerDay)||4)); // عدد فترات اليوم الدراسي من الإعدادات
  for(var i=0;i<count;i++){
    var id="p"+(Date.now()%100000+i);
    DB.schedule._shared.periods.push({id:id,label:"فترة "+(i+1),time:savedTimes[i]||""});
  }
  saveDB();
}

function schedSetSlotUnified(pid,di,val){
  setUnifiedSlot(pid,di,val);
  renderSched();
  // Refresh home page ring if it is currently visible
  var homeRoot=document.getElementById("homeRoot");
  if(homeRoot&&homeRoot.offsetParent!==null&&typeof _homeTick==="function")_homeTick();
}

function schedSetTimeUnified(pid,val){
  var shared=DB.schedule._shared||(DB.schedule._shared={periods:[],slots:{},notes:""});
  (shared.periods||[]).forEach(function(p){if(p.id===pid)p.time=val;});
  saveDB();renderSched();
  var homeRoot=document.getElementById("homeRoot");
  if(homeRoot&&homeRoot.offsetParent!==null&&typeof _homeTick==="function")_homeTick();
}

function schedSetTypeUnified(pid,val){
  var shared=DB.schedule._shared||(DB.schedule._shared={periods:[],slots:{},notes:""});
  if(!shared.periodTypes)shared.periodTypes={};
  shared.periodTypes[pid]=val;
  saveDB();
}

function schedDelPeriodUnified(pid){
  var shared=DB.schedule._shared;
  if(!shared)return;
  shared.periods=(shared.periods||[]).filter(function(p){return p.id!==pid;});
  Object.keys(shared.slots||{}).forEach(function(k){if(k.startsWith(pid+"_"))delete shared.slots[k];});
  saveDB();renderSched();
}

function schedAddPeriodUnified(){
  var shared=DB.schedule._shared||(DB.schedule._shared={periods:[],slots:{},notes:""});
  if(!shared.periods)shared.periods=[];
  var id="p"+(Date.now()%100000);
  var num=shared.periods.length+1;
  var savedTimes=DB.meta.periodTimes||[];
  shared.periods.push({id:id,label:"فترة "+num,time:savedTimes[num-1]||""});
  saveDB();renderSched();
  showSnack("✅ تمت إضافة فترة "+num);
}

function schedAutoFillUnified(){
  var shared=DB.schedule._shared;
  var saved=DB.meta.periodTimes||[];
  if(!saved.length){showSnack("⚠️ لا توجد مواعيد محفوظة — أضفها من الإعدادات");return;}
  (shared.periods||[]).forEach(function(p,i){if(saved[i])p.time=saved[i];});
  saveDB();renderSched();
  showSnack("✅ تم تعبئة المواعيد من الإعدادات");
}

function schedSaveNotesUnified(val){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  DB.schedule._shared.notes=val;saveDB();
}

// ── Legacy compat stubs (called from old code paths) ──
var SS={activeClass:""};
function schedAddPeriod(){schedAddPeriodUnified();}
function schedDelPeriod(pid){schedDelPeriodUnified(pid);}
function schedSetTime(pid,val){schedSetTimeUnified(pid,val);}
function schedSetSlot(pid,di,val){schedSetSlotUnified(pid,di,val);}
function schedSaveNotes(val){schedSaveNotesUnified(val);}
function schedSetPeriodType(pid,val){schedSetTypeUnified(pid,val);}
function schedCopyTo(){showSnack("الجدول الموحد يشترك بين جميع الفصول");}
function schedAutoFillTimes(){schedAutoFillUnified();}
function schedAutoFillTimesFromSettings(){schedAutoFillUnified();}
// (old per-class functions replaced by unified versions above)

// ── Special Periods: طابور / فسحة ─────────────────────
function _schedGetSP(type){
  var shared=DB.schedule._shared||(DB.schedule._shared={periods:[],slots:{},notes:""});
  if(!shared.specialPeriods)shared.specialPeriods={};
  if(!shared.specialPeriods[type])shared.specialPeriods[type]={enabled:false,time:'',overrides:{}};
  return shared.specialPeriods[type];
}

function schedToggleSpecial(type){
  var sp=_schedGetSP(type);
  sp.enabled=!sp.enabled;
  saveDB();renderSched();
  var _hr=document.getElementById('homeRoot');if(_hr&&_hr.offsetParent!==null&&typeof _homeTick==='function')_homeTick();
  showSnack(sp.enabled?('✅ تم تفعيل '+(type==='assembly'?'الطابور':'الفسحة')):('⬜ تم إخفاء '+(type==='assembly'?'الطابور':'الفسحة')));
}

function schedSetSpecialTime(type,val){
  _schedGetSP(type).time=val;
  saveDB();
}

function schedSpecialOverride(type,di,val){
  // val: 0=auto, 1=force on, 2=force off
  var sp=_schedGetSP(type);
  if(!sp.overrides)sp.overrides={};
  sp.overrides[di]=val;
  saveDB();renderSched();
}

// Build special period items for home/notifications
function _getSpecialPeriodItems(){
  var items=[];
  if(!DB||!DB.schedule||!DB.schedule._shared)return items;
  var shared=DB.schedule._shared;
  var sp=shared.specialPeriods||{};

  // Determine which days have at least one class slot (active days)
  function getActiveDays(){
    var d=[];
    for(var di=0;di<6;di++){
      var has=(shared.periods||[]).some(function(p){return(shared.slots||{})[p.id+'_d'+di];});
      if(has)d.push(di);
    }
    return d;
  }
  var activeDays=getActiveDays();

  ['assembly','break'].forEach(function(type){
    var cfg=sp[type];
    if(!cfg||!cfg.enabled)return;
    // Determine effective days
    var days=[];
    for(var di=0;di<6;di++){
      var ovr=(cfg.overrides&&cfg.overrides[di])||0;
      var on=(ovr===1)||(ovr===0&&activeDays.indexOf(di)>=0);
      var off=(ovr===2);
      if(on&&!off)days.push(di);
    }
    if(!days.length)return;
    var label=type==='assembly'?'🟢 طابور':'☕ فسحة';
    var fakeId='__special_'+type;
    items.push({
      cls:label,
      per:{id:fakeId,label:label,time:cfg.time||''},
      days:days,
      isSpecial:true,
      specialType:type
    });
  });
  return items;
}


// ── Schedule time dropdown (fixed portal) ────────────
var _schedTimeDdPid=null;
function schedTimeDropOpen(pid){
  _schedTimeDdPid=pid;
  var inp=document.getElementById('sti_'+pid);
  var portal=document.getElementById('schedTimeDdPortal');
  if(!inp||!portal)return;

  // Rebuild portal content fresh from DB
  var savedTimes=(DB.meta.periodTimes||[]);
  var html='';
  if(savedTimes.length){
    html+='<div class="sched-time-dd-hdr">⭐ المواعيد المحفوظة</div>';
    savedTimes.forEach(function(t){
      html+='<div class="sched-time-opt saved" onmousedown="schedPickTime(\''+t.replace(/'/g,"\\'")+'\')">'
        +t.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>';
    });
    html+='<div class="sched-time-dd-sep"></div>';
  }
  html+='<div class="sched-time-dd-hdr">🕐 أوقات شائعة</div>';
  _PERIOD_PRESETS.forEach(function(t){
    html+='<div class="sched-time-opt" onmousedown="schedPickTime(\''+t.replace(/'/g,"\\'")+'\')">'
      +t+'</div>';
  });
  portal.innerHTML=html;

  // Position under the input — portal is position:fixed so use viewport coords only
  var rect=inp.getBoundingClientRect();
  var top=rect.bottom+4;
  var left=rect.left;
  // Keep within viewport
  var portalW=Math.max(170,rect.width);
  if(left+portalW>window.innerWidth-8) left=window.innerWidth-portalW-8;
  if(left<4) left=4;
  portal.style.top=top+'px';
  portal.style.left=left+'px';
  portal.style.right='unset';
  portal.style.minWidth=portalW+'px';
  portal.style.display='block';
  portal._pid=pid;
}
function schedTimeDropClose(pid){
  if(pid!==undefined&&_schedTimeDdPid!==pid)return;
  var portal=document.getElementById('schedTimeDdPortal');
  if(portal){portal.style.display='none';portal.innerHTML='';}
  _schedTimeDdPid=null;
}
function schedTimeFilter(pid){
  var inp=document.getElementById('sti_'+pid);
  var portal=document.getElementById('schedTimeDdPortal');
  if(!inp||!portal||portal.style.display==='none')return;
  var q=inp.value.trim();
  portal.querySelectorAll('.sched-time-opt').forEach(function(o){
    o.style.display=(q===''||o.textContent.indexOf(q)>=0)?'block':'none';
  });
}
function schedPickTime(val){
  var pid=_schedTimeDdPid;
  if(!pid)return;
  var inp=document.getElementById('sti_'+pid);
  if(inp)inp.value=val;
  schedSetTimeUnified(pid,val);
  schedTimeDropClose(pid);
  // update displayed time in header without full re-render
  renderSched();
}
// Close portal on outside click
document.addEventListener('click',function(e){
  if(!_schedTimeDdPid)return;
  var portal=document.getElementById('schedTimeDdPortal');
  if(portal&&portal.contains(e.target))return;
  if(e.target.classList.contains('sched-time-inp')||e.target.classList.contains('ph-time-inp'))return;
  schedTimeDropClose(_schedTimeDdPid);
});

// ══════════════════════════════════════════════════════
// SECTION 5b: PERIOD TIMES SETTINGS HELPERS
// ══════════════════════════════════════════════════════
function settingsAddPeriodTime(){
  var inp=document.getElementById('sNewPeriodTime');
  if(!inp)return;
  var val=inp.value.trim();
  if(!val){showSnack('⚠️ أدخل وقتاً أولاً');return;}
  if(!DB.meta.periodTimes)DB.meta.periodTimes=[];
  if(DB.meta.periodTimes.indexOf(val)>=0){showSnack('⚠️ هذا الوقت موجود مسبقاً');return;}
  DB.meta.periodTimes.push(val);
  saveDB();inp.value='';renderSettings();
  showSnack('✅ تم إضافة الوقت: '+val);
}
function settingsDelPeriodTime(idx){
  if(!DB.meta.periodTimes)return;
  DB.meta.periodTimes.splice(idx,1);
  saveDB();renderSettings();showSnack('✅ تم حذف الوقت');
}
function settingsMoveUpPeriodTime(idx){
  var arr=DB.meta.periodTimes;
  if(!arr||idx<=0)return;
  var tmp=arr[idx-1];arr[idx-1]=arr[idx];arr[idx]=tmp;
  saveDB();renderSettings();
}
function settingsQuickFillTimes(){
  if(!DB.meta.periodTimes)DB.meta.periodTimes=[];
  var added=0;
  _PERIOD_PRESETS.forEach(function(t){
    if(DB.meta.periodTimes.indexOf(t)<0){DB.meta.periodTimes.push(t);added++;}
  });
  saveDB();renderSettings();
  showSnack(added>0?'✅ تمت إضافة '+added+' وقت':'⚠️ الأوقات موجودة بالفعل');
}


// ══════════════════════════════════════════════════════
var AS={activeClass:"",activeWeek:1,search:"",showAllPeriods:false};

function renderAbsence(){
  var root=document.getElementById("absenceRoot");
  if(!root)return;
  if(!AS.activeClass&&DB.classes.length)AS.activeClass=DB.classes[0];
  var cls=AS.activeClass;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var _shared=(DB.schedule&&DB.schedule._shared)||{periods:[],slots:{}};
  var periods=_shared.periods||[];
  var week=AS.activeWeek;

  // Get week date info
  var weekStartStr="";
  if(DB.meta.startDate){
    var d=new Date(DB.meta.startDate);
    d.setDate(d.getDate()+(week-1)*7);
    weekStartStr=" ("+d.getDate()+"/"+(d.getMonth()+1)+")";
  }

  // Total absences for stats
  var totalAbsPeriods=totalClassAbsencePeriods(cls);
  var studentsWithAbs=students.filter(function(s){return countStudentAbsencePeriods(cls,s.id)>0;}).length;
  var thisWeekAbs=0, thisWeekSick=0;
  students.forEach(function(s){
    var abs=getStudentAbsences(cls,s.id);
    Object.keys(abs).forEach(function(k){
      if(!abs[k]||!k.startsWith("w"+week+"_"))return;
      if(abs[k]==="abs")thisWeekAbs++;
      else if(abs[k]==="sick")thisWeekSick++;
    });
  });

  // Filtered students
  var filtered=AS.search?students.filter(function(s){return s.name.indexOf(AS.search)>=0;}):students;

  var html='<div class="abs-page">';
  html+='<div class="abs-header">';
  html+='<div style="display:flex;align-items:center;gap:8px;"><div class="abs-title">📋 سجل الغياب</div><span style="font-size:8px;color:#475569;background:#1e293b;padding:1px 8px;border-radius:8px;">عرض فقط — التعديل من صفحتي الأسبوعي والمرضى</span></div>';
  html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  html+='<input style="background:#0f172a;border:1px solid #334155;color:#f1f5f9;border-radius:6px;padding:3px 9px;font-size:10px;outline:none;" placeholder="🔍 بحث..." value="'+esc(AS.search)+'" oninput="AS.search=this.value;renderAbsence()"/>';
  html+='<button class="btn btn-success btn-sm" onclick="absExport()">⬇ Excel</button>';
  html+='</div></div>';
  html+='<div class="abs-body">';

  // Class tabs
  html+='<div class="abs-cls-tabs">';
  DB.classes.forEach(function(c){
    var absCnt=totalClassAbsencePeriods(c);
    html+='<button class="abs-cls-tab'+(c===cls?" active":"")+'" onclick="AS.activeClass=\''+esc(c)+'\';AS.activeWeek=1;renderAbsence()">'+esc(c)+(absCnt?' <span class="badge badge-red">'+absCnt+'</span>':"")+' </button>';
  });
  html+='</div>';

  // Stats
  var totalSick=0;
  students.forEach(function(s){totalSick+=countStudentSickPeriods(cls,s.id);});
  html+='<div class="abs-stats-row">';
  html+='<div class="abs-stat"><div class="abs-stat-v" style="color:#f87171;">'+thisWeekAbs+'</div><div class="abs-stat-l">غياب هذا الأسبوع</div></div>';
  html+='<div class="abs-stat"><div class="abs-stat-v" style="color:#fbbf24;">'+thisWeekSick+'</div><div class="abs-stat-l">مرضى هذا الأسبوع</div></div>';
  html+='<div class="abs-stat"><div class="abs-stat-v" style="color:#fcd34d;">'+totalAbsPeriods+'</div><div class="abs-stat-l">إجمالي غياب</div></div>';
  html+='<div class="abs-stat"><div class="abs-stat-v" style="color:#60a5fa;">'+totalSick+'</div><div class="abs-stat-l">إجمالي مرضى</div></div>';
  html+='<div class="abs-stat"><div class="abs-stat-v" style="color:#34d399;">'+students.length+'</div><div class="abs-stat-l">عدد الطلاب</div></div>';
  html+='</div>';

  // Week nav
  html+='<div class="abs-week-nav">';
  html+='<span style="font-size:10px;color:#64748b;">الأسبوع:</span>';
  var _absW=ALL_WEEKS.slice(0,Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length));
  _absW.forEach(function(w){
    var hasAbs=false;
    students.forEach(function(s){var abs=getStudentAbsences(cls,s.id);Object.keys(abs).forEach(function(k){if(abs[k]&&k.startsWith("w"+w+"_"))hasAbs=true;});});
    html+='<button class="abs-week-btn'+(w===week?" active":hasAbs?" has-abs":"")+'" onclick="AS.activeWeek='+w+';renderAbsence()">أ'+w+'</button>';
  });
  html+='</div>';

  // الأعمدة دائماً من buildAbsCols (يعتمد على periodsPerWeek)
  {
    var _bCols=buildAbsCols(cls,week);
    var activePeriodDays=_bCols.map(function(col,ci){
      return {
        period:col.period,
        dayIdx:col.dayIdx,
        isScheduled:true,
        slotLabel:cls,
        _ci:ci
      };
    });

    // Only show columns where any slot has content OR all (show all for full control)
    // Actually show all period×day combos but mark scheduled ones
    var colCount=activePeriodDays.length;
    var gridCols="120px repeat("+colCount+",minmax(36px,1fr)) 60px";

    // Header
    html+='<div style="display:flex;gap:7px;align-items:center;margin-bottom:7px;flex-wrap:wrap;">';
    html+='<span style="background:#1e3a5f;border:1px solid #2d4a6e;border-radius:10px;padding:2px 10px;font-size:9px;color:#60a5fa;">📚 '+activePeriodDays.length+' فترة / الأسبوع</span>';
    html+='<button onclick="switchPage(\'settings\')" style="background:#0f172a;border:1px solid #334155;padding:2px 9px;border-radius:6px;cursor:pointer;font-size:9px;color:#64748b;font-family:inherit;">⚙️ تغيير العدد</button>';
    html+='</div>';
    html+='<div class="abs-grid">';
    html+='<div class="abs-grid-hdr" style="display:grid;grid-template-columns:'+gridCols+';">';
    html+='<div style="padding:5px 7px;border-left:none;">الطالب — أسبوع '+week+weekStartStr+'</div>';
    activePeriodDays.forEach(function(col){
      html+='<div style="font-size:8px;line-height:1.3;'+(col.isScheduled?"color:#60a5fa;font-weight:700;":"")+'">';
      html+=esc(col.period.label||col.period.id)+'<br/>'+DAYS_SHORT[col.dayIdx];
      if(col.period.time)html+='<br/><span style="font-size:7px;color:#475569;">'+esc(col.period.time)+'</span>';
      html+='</div>';
    });
    html+='<div>غياب</div>';
    html+='</div>';

    // Student rows
    filtered.forEach(function(s){
      var abs=getStudentAbsences(cls,s.id);
      var weekAbsCnt=0;
      activePeriodDays.forEach(function(col){var k="w"+week+"_ci"+col._ci;if(abs[k])weekAbsCnt++;});
      var totalAbs=countStudentAbsencePeriods(cls,s.id);

      html+='<div class="abs-student-row" style="grid-template-columns:'+gridCols+';">';
      html+='<div class="abs-student-name" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
      activePeriodDays.forEach(function(col){
        var k="w"+week+"_ci"+col._ci;
        var absSt=abs[k]; // "abs", "sick", or undefined
        var isAbs=absSt==="abs", isSick=absSt==="sick";
        var cellBg=isAbs?"background:rgba(239,68,68,.3);color:#f87171;font-weight:700;"
                  :isSick?"background:rgba(245,158,11,.25);color:#fbbf24;font-weight:700;"
                  :col.isScheduled?"background:rgba(29,78,216,.08);color:#60a5fa;":"";
        var clickHandler=col._ci>=0?'onclick="toggleAbsence(\''+esc(cls)+'\','+s.id+','+week+','+col._ci+')"':'';
        html+='<div class="abs-period-cell" style="'+cellBg+'" '+clickHandler+' title="'+esc(col.period.label)+" — "+DAYS_AR[col.dayIdx]+(isSick?" (مريض)":isAbs?" (غائب)":"")+'">';
        html+=isAbs?"✗":isSick?"م":(col.isScheduled?"·":"");
        html+='</div>';
      });
      html+='<div class="abs-student-total" style="color:'+(totalAbs>0?"#f87171":"#475569")+'">'+totalAbs+'</div>';
      html+='</div>';
    });
    html+='</div>'; // abs-grid
  }

  // Legend
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:9px;">';
  html+='<span style="background:rgba(239,68,68,.2);color:#f87171;padding:1px 7px;border-radius:4px;">✗ = غائب (يُحتسب صفر)</span>';
  html+='<span style="background:rgba(245,158,11,.2);color:#fbbf24;padding:1px 7px;border-radius:4px;">م = مريض (مستثنى من المتوسط)</span>';
  html+='<span style="background:rgba(29,78,216,.1);color:#60a5fa;padding:1px 7px;border-radius:4px;">· = فترة مجدولة</span>';
  html+='<span style="color:#64748b;">اضغط مرة=غائب، مرتين=مريض، ثلاث=إلغاء</span>';
  html+='</div>';

  html+='</div></div>';
  root.innerHTML=html;
}

function absExport(){
  try{
    var wb=XLSX.utils.book_new();
    DB.classes.forEach(function(cls){
      var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
      var rows=[["م","اسم الطالب","فترات الغياب","أيام الغياب","ملاحظة"]];
      students.forEach(function(s,i){
        var periods=countStudentAbsencePeriods(cls,s.id);
        var days=countStudentAbsenceDays(cls,s.id);
        rows.push([i+1,s.name,periods,days,periods>10?"كثير الغياب":periods>5?"متوسط الغياب":""]);
      });
      var ws=XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[{wch:4},{wch:28},{wch:12},{wch:12},{wch:20}];
      XLSX.utils.book_append_sheet(wb,ws,cls.substring(0,31));
    });
    XLSX.writeFile(wb,"سجل_الغياب.xlsx");
  }catch(e){alert("خطأ: "+e.message);}
}


// ══════════════════════════════════════════════════════
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
    var _hwActive=Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length);
    var weeks=ALL_WEEKS.slice(0,_hwActive).filter(function(w){if(!assessPg)return true;var col=(assessPg.cols||[]).find(function(c){return c.id==='a'+w;});return col?col.visible:true;});

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
    html+='<div class="tw"><table><thead>';
    if(_wkSpan>0){
      html+='<tr>';
      html+='<th style="min-width:20px">م</th><th class="td-name">الاسم</th>';
      weeks.forEach(function(w){
        if(_wkSpan>0)html+='<th colspan="'+_wkSpan+'" style="background:#0d2350;text-align:center;">أسبوع '+w+'</th>';
      });
      if(_showAvgAssess)html+='<th style="background:#0a1e35;">متوسط<br><small>تقييم</small></th>';
      if(_showAvgHw)html+='<th style="background:#0a1e35;">متوسط<br><small>واجب</small></th>';
      if(_showAvgBeh)html+='<th style="background:#1a0d3a;">متوسط<br><small>سلوك</small></th>';
      html+='<th style="background:#1c1400;">اختبارات<br><small>/30</small></th>';
      if(_showTotal)html+='<th style="background:#0a1e35;">مجموع<br><small>/'+tmax+'</small></th>';
      if(_showDist)html+='<th>توزيع</th>';
      html+='</tr>';
    }
    html+='<tr>';
    html+='<th></th><th></th>';
    weeks.forEach(function(w){
      if(_showAssess)html+='<th style="background:#102060;font-size:8px;">تقييم<br>/20</th>';
      if(_showHw)html+='<th style="background:#102060;font-size:8px;">واجب<br>/10</th>';
      if(_showBeh)html+='<th style="background:#1a0d3a;font-size:8px;color:#c4b5fd;">سلوك<br>/10</th>';
    });
    if(_wkSpan===0){
      if(_showAvgAssess)html+='<th style="background:#0a1e35;">متوسط<br><small>تقييم</small></th>';
      if(_showAvgHw)html+='<th style="background:#0a1e35;">متوسط<br><small>واجب</small></th>';
      if(_showAvgBeh)html+='<th style="background:#1a0d3a;">متوسط<br><small>سلوك</small></th>';
      html+='<th style="background:#1c1400;">اختبارات<br><small>/30</small></th>';
      if(_showTotal)html+='<th style="background:#0a1e35;">مجموع<br><small>/'+tmax+'</small></th>';
      if(_showDist)html+='<th>توزيع</th>';
    } else {
      if(_showAvgAssess)html+='<th></th>';
      if(_showAvgHw)html+='<th></th>';
      if(_showAvgBeh)html+='<th></th>';
      html+='<th></th>';
      if(_showTotal)html+='<th></th>';
      if(_showDist)html+='<th></th>';
    }
    html+='</tr></thead><tbody>';

    // ── صفوف الطلاب ──
    filtered.forEach(function(s){
      var idx=students.indexOf(s);
      var res=calcStudent(s);
      var tot=res.total;
      html+='<tr>';
      html+='<td class="td-rn">'+(idx+1)+'</td>';
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
        // خلية التقييم
        if(_showAssess){
          html+='<td style="padding:1px;"><div class="gc">';
          if(!isAA&&!isAM){html+='<input type="number" min="0" max="'+aMax+'" class="gc-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" value="'+esc(av)+'" onchange="gradesSetField('+idx+',\''+aField+'\',clamp(Number(this.value),0,'+aMax+'))">';}
          else if(isAA)html+='<span class="gc-lbl-abs">غ</span>';
          else html+='<span class="gc-lbl-exc">م</span>';
          html+='</div></td>';
        }
        // خلية الواجب
        if(_showHw){
          html+='<td style="padding:1px;"><div class="gc">';
          if(!isHA&&!isHM){html+='<input type="number" min="0" max="'+hMax+'" class="gc-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" value="'+esc(hv)+'" onchange="gradesSetField('+idx+',\''+hField+'\',clamp(Number(this.value),0,'+hMax+'))">';}
          else if(isHA)html+='<span class="gc-lbl-abs">غ</span>';
          else html+='<span class="gc-lbl-exc">م</span>';
          html+='</div></td>';
        }
        // خلية السلوك
        var bNum=parseFloat(bv);
        if(!isBA&&!isBM&&bv!==undefined&&bv!==''&&!isNaN(bNum)){behSum+=bNum;behCnt++;}
        if(_showBeh){
          html+='<td style="padding:1px;background:rgba(124,58,237,0.07);"><div class="gc">';
          if(!isBA&&!isBM){html+='<input type="number" min="0" max="'+bMax+'" class="gc-inp wk-beh-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" value="'+esc(bv)+'" onchange="gradesSetField('+idx+',\''+bField+'\',clamp(Number(this.value),0,'+bMax+'))">';}
          else if(isBA)html+='<span class="gc-lbl-abs">غ</span>';
          else html+='<span class="gc-lbl-exc">م</span>';
          html+='</div></td>';
        }
      });
      var avgBeh=behCnt>0?(Math.round(behSum/behCnt*10)/10):'—';
      if(_showAvgAssess)html+='<td class="avg-cell">'+res.avgAssess+'</td>';
      if(_showAvgHw)html+='<td class="avg-cell">'+res.avgHw+'</td>';
      if(_showAvgBeh)html+='<td class="avg-cell" style="color:#000000;">'+avgBeh+'</td>';
      html+='<td class="avg-cell" style="color:#fbbf24;font-weight:700;">'+res.exTotal+'</td>';
      if(_showTotal)html+='<td><span class="tot-cell" id="tot_'+idx+'" style="background:'+gc(tot)+'22;color:'+gc(tot)+';border:1.5px solid '+gc(tot)+'">'+tot+'</span></td>';
      if(_showDist)html+='<td><input type="number" min="0" max="'+tmax+'" class="dist-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" placeholder="مج" id="dih'+s.id+'" onblur="gradesDistribute('+idx+',this)"></td>';
      html+='</tr>';
    });
    html+='</tbody></table></div>';
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
  html+='<th>غياب</th><th>توزيع</th><th>حذف</th>';
  html+='</tr></thead><tbody>';

  filtered.forEach(function(s){
    var idx=students.indexOf(s);
    var res=calcStudent(s);
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
        html+='<td><div class="gc">';
        if(!isA&&!isM){html+='<input type="number" min="0" max="'+c.max+'" class="gc-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" value="'+esc(v)+'" onchange="gradesSetField('+idx+',\''+c.field+'\',clamp(Number(this.value),0,'+c.max+'))">';}
        else if(isA){html+='<span class="gc-lbl-abs">غ</span>';}
        else{html+='<span class="gc-lbl-exc">م</span>';}
        html+='</div></td>';
    });
    // Averages
    html+='<td class="avg-cell" style="'+(res.avgAssess==="غ"?"color:#b45309":"")+'">'+res.avgAssess+'</td>';
    html+='<td class="avg-cell" style="'+(res.avgHw==="غ"?"color:#b45309":"")+'">'+res.avgHw+'</td>';
    html+='<td class="avg-cell" style="'+(res.avgBeh==="غ"?"color:#b45309":"")+'">'+res.avgBeh+'</td>';
    html+='<td class="avg-cell" style="color:#fbbf24;font-weight:700;">'+res.exTotal+'</td>';
    // Total
    var tot=res.total;
    html+='<td><span class="tot-cell" id="tot_'+idx+'" style="background:'+gc(tot)+'22;color:'+gc(tot)+';border:1.5px solid '+gc(tot)+'">'+tot+'</span></td>';
    // Absence
    html+='<td>';
    html+='<button class="abs-btn" onclick="switchPage(\'absence\')">'+( absPer>0?'<span class="abs-cnt">'+absPer+'</span>':"")+' 📋</button>';
    if(absPer>0)html+='<div style="font-size:8px;color:#f97316;">'+absPer+'ف</div>';
    html+='</td>';
    // Distribute
    html+='<td><div style="display:flex;flex-direction:column;gap:2px;align-items:center;">';
    html+='<input type="number" min="0" max="'+tmax+'" class="dist-inp" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" placeholder="مج" id="di'+s.id+'" onblur="gradesDistribute('+idx+',this)">';
    html+='<button style="background:'+(s._totalAbsent?'#fee2e2':'#fef3c7')+';border:1px solid '+(s._totalAbsent?'#ef4444':'#f59e0b')+';border-radius:2px;font-size:7.5px;color:'+(s._totalAbsent?'#dc2626':'#b45309')+';cursor:pointer;padding:1px 3px;" onclick="gradesSetAllAbsent('+idx+')">'+(s._totalAbsent?'↩ تراجع':'غ كامل')+'</button>';
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
  var total=calcStudent(s).total;
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
      var b1=s.beh1,b2=s.beh2,e1=s.ex1,e2=s.ex2;
      function nv(v,mx){if(v===""||v===undefined||v===null||v==="م")return 0;if(v==="غ")return 0;return Math.min(Number(v)||0,mx);}
      var beh=Math.min(nv(b1,5)+nv(b2,5),10);
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
        var res=calcStudent(s);
        var absVal=countStudentAbsencePeriods(cls,s.id)||0;
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
// SECTION 8: STATS PAGE
// ══════════════════════════════════════════════════════
function renderStats(){
  var root=document.getElementById("statsRoot");
  if(!root)return;
  var tmax=totalMax();
  var html='<div class="stats-page">';
  html+='<h2 style="font-size:14px;font-weight:900;color:#0f2a5e;margin-bottom:12px;">📊 لوحة الإحصائيات</h2>';
  html+='<div class="stats-grid">';
  DB.classes.forEach(function(cls){
    var sts=(DB.data[cls]||[]).filter(function(s){return s.name;});
    var tots=sts.map(function(s){return calcStudent(s).total;}).filter(function(t){return t!=="غ";});
    var avg=tots.length?Math.round(tots.reduce(function(a,b){return a+b;},0)/tots.length):0;
    var above60=tots.filter(function(t){return t>=60;}).length;
    var absPer=totalClassAbsencePeriods(cls);
    html+='<div class="stats-card">';
    html+='<div class="stats-cls">'+esc(cls)+'</div>';
    html+='<div class="stats-row"><span>الطلاب</span><strong>'+sts.length+'</strong></div>';
    html+='<div class="stats-row"><span>المتوسط</span><strong style="color:'+(avg>=60?"#10b981":avg>=40?"#f59e0b":"#ef4444")+'">'+avg+'/'+tmax+'</strong></div>';
    html+='<div class="stats-row"><span>ناجحون</span><strong style="color:#10b981">'+above60+'/'+sts.length+'</strong></div>';
    html+='<div class="stats-row"><span>راسبون</span><strong style="color:#ef4444">'+(sts.length-above60)+'</strong></div>';
    html+='<div class="stats-row"><span>فترات الغياب</span><strong style="color:'+(absPer>20?"#ef4444":"#64748b")+'">'+absPer+'</strong></div>';
    html+='<div class="stats-bar"><div class="stats-fill" style="width:'+(tmax?Math.round((avg/tmax)*100):0)+'%;background:'+(avg>=60?"#10b981":avg>=40?"#f59e0b":"#ef4444")+'"></div></div>';
    html+='</div>';
  });
  html+='</div></div>';
  root.innerHTML=html;
}


// Clear just-set highlights
setInterval(function(){
  var now=Date.now();var changed=false;
  Object.keys(DS.justSet).forEach(function(id){if(now-DS.justSet[id]>5000){delete DS.justSet[id];changed=true;}});
  Object.keys(GS.dictHL).forEach(function(id){if(now-GS.dictHL[id]>5000){delete GS.dictHL[id];changed=true;}});
  if(changed&&_currentPage==="dict")renderDict();
},1000);

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// SICK PAGE
// ══════════════════════════════════════════════════════
var SKS={activeClass:"",activeWeek:1};

function renderSick(){
  var root=document.getElementById("sickRoot");
  if(!root)return;
  if(!SKS.activeClass&&DB.classes.length)SKS.activeClass=DB.classes[0];
  var cls=SKS.activeClass;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var activeWks=_getActiveWeeks();

  var html='<div class="sick-page">';
  html+='<div class="sick-header"><div class="sick-title">🤒 سجل المرضى</div>';
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">';
  html+='<button class="btn btn-success btn-sm" onclick="sickExport()">⬇ Excel</button>';
  html+='</div></div>';
  html+='<div class="sick-body">';

  // Class tabs
  html+='<div class="sick-cls-tabs">';
  DB.classes.forEach(function(cl){
    html+='<button class="sick-cls-tab'+(cl===cls?" active":"")+'" onclick="SKS.activeClass=\''+esc(cl)+'\';renderSick();">'+esc(cl)+'</button>';
  });
  html+='</div>';

  // ── Per-student sick management ──
  students.forEach(function(s,si){
    var absData=getStudentAbsences(cls,s.id);
    // Collect sick records
    var sickEntries=[];
    Object.keys(absData).forEach(function(k){
      if(absData[k]==="sick"){
        var dt=absKeyDate(k);
        if(dt)sickEntries.push(dt);
      }
    });
    sickEntries.sort();

    // Group consecutive dates
    var sickTotal=countStudentSickPeriods(cls,s.id);
    var absTotal=countStudentAbsencePeriods(cls,s.id);

    html+='<div class="sick-stu-card" id="sickCard_'+s.id+'">';
    html+='<div class="sick-stu-hdr">';
    html+='<span class="sick-stu-name">'+esc(s.name)+'</span>';
    html+='<div style="display:flex;gap:5px;align-items:center;">';
    if(sickTotal>0){
      html+='<span style="font-size:8.5px;background:rgba(245,158,11,.2);color:#fcd34d;padding:1px 7px;border-radius:8px;">🤒 '+sickTotal+' فترة مرض</span>';
    }
    if(absTotal>0){
      html+='<span style="font-size:8.5px;background:rgba(239,68,68,.15);color:#f87171;padding:1px 7px;border-radius:8px;">✗ '+absTotal+' غياب</span>';
    }
    html+='<button class="sick-add-btn" onclick="toggleSickForm('+s.id+')">+ إضافة مرضى</button>';
    html+='</div></div>';

    // Add sick form (hidden by default)
    html+='<div class="sick-form" id="sickForm_'+s.id+'" style="display:none;">';
    html+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;">';
    html+='<label style="font-size:9px;color:#94a3b8;">من:</label>';
    html+='<input type="date" class="s-inp" style="width:130px;padding:3px 6px;" id="sickFrom_'+s.id+'" onchange="updateSickDuration('+s.id+')">';
    html+='<label style="font-size:9px;color:#94a3b8;">إلى:</label>';
    html+='<input type="date" class="s-inp" style="width:130px;padding:3px 6px;" id="sickTo_'+s.id+'" onchange="updateSickDuration('+s.id+')">';
    html+='<span id="sickDur_'+s.id+'" style="font-size:9px;color:#fbbf24;"></span>';
    html+='<button class="btn btn-warn btn-sm" onclick="applySickRange(\''+esc(cls)+'\','+s.id+')">✓ تسجيل</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="clearSickRangeUI(\''+esc(cls)+'\','+s.id+')">🗑 حذف هذه الفترة</button>';
    html+='</div></div>';

    // Sick history table
    if(sickEntries.length>0){
      // Group into ranges
      var ranges=[];var cur=null;
      sickEntries.forEach(function(dt){
        if(!cur){cur={from:dt,to:dt};return;}
        var prev=new Date(cur.to);prev.setDate(prev.getDate()+1);
        if(dateToStr(prev)===dt){cur.to=dt;}
        else{ranges.push(cur);cur={from:dt,to:dt};}
      });
      if(cur)ranges.push(cur);

      html+='<div class="sick-history">';
      ranges.forEach(function(r,ri){
        var fromD=new Date(r.from),toD=new Date(r.to);
        var days=Math.round((toD-fromD)/(1000*60*60*24))+1;
        html+='<div class="sick-range-item">';
        html+='<span class="sick-range-dates">'+fromD.getDate()+"/"+(fromD.getMonth()+1)+' — '+toD.getDate()+"/"+(toD.getMonth()+1)+'</span>';
        html+='<span class="sick-range-days">'+days+' يوم</span>';
        html+='<button class="sick-del-btn" onclick="deleteSickRange(\''+esc(cls)+'\','+s.id+',\''+r.from+'\',\''+r.to+'\')">✕</button>';
        html+='</div>';
      });
      html+='</div>';
    }
    html+='</div>';
  });

  // Summary
  var totalSickStudents=students.filter(function(s){return countStudentSickPeriods(cls,s.id)>0;}).length;
  if(totalSickStudents>0){
    html+='<div style="margin-top:10px;background:#1a0f00;border:1px solid #422006;border-radius:8px;padding:8px 12px;">';
    html+='<div style="font-size:9.5px;font-weight:700;color:#fbbf24;margin-bottom:6px;">📋 ملخص المرضى — '+esc(cls)+'</div>';
    html+='<div style="display:flex;gap:5px;flex-wrap:wrap;">';
    students.forEach(function(s){
      var sc=countStudentSickPeriods(cls,s.id);
      if(sc>0)html+='<span style="background:rgba(245,158,11,.12);border:1px solid #92400e;color:#fcd34d;padding:2px 9px;border-radius:10px;font-size:9px;">🤒 '+esc(s.name)+' ('+sc+')</span>';
    });
    html+='</div></div>';
  }

  html+='</div></div>';
  root.innerHTML=html;
}

function toggleSickForm(id){
  var f=document.getElementById("sickForm_"+id);
  if(f)f.style.display=f.style.display==="none"?"flex":"none";
}
function updateSickDuration(id){
  var f=document.getElementById("sickFrom_"+id);
  var t=document.getElementById("sickTo_"+id);
  var d=document.getElementById("sickDur_"+id);
  if(!f||!t||!d)return;
  if(f.value&&t.value){
    var days=Math.round((new Date(t.value)-new Date(f.value))/(86400000))+1;
    d.textContent=days>0?days+" يوم":"!";
  }else d.textContent="";
}
function applySickRange(cls,studentId){
  var f=document.getElementById("sickFrom_"+studentId);
  var t=document.getElementById("sickTo_"+studentId);
  if(!f||!t||!f.value||!t.value){showSnack("⚠️ حدد تاريخ البداية والنهاية");return;}
  if(new Date(f.value)>new Date(t.value)){showSnack("⚠️ تاريخ البداية بعد النهاية");return;}
  setSickRange(cls,studentId,null,null,null,f.value,t.value);
  showSnack("✅ تم تسجيل المرضى");
  renderSick();
}
function clearSickRangeUI(cls,studentId){
  var f=document.getElementById("sickFrom_"+studentId);
  var t=document.getElementById("sickTo_"+studentId);
  if(!f||!t||!f.value||!t.value){showSnack("⚠️ حدد نطاق التاريخ أولاً");return;}
  clearSickRange(cls,studentId,f.value,t.value);
  showSnack("✅ تم إلغاء المرضى");
  renderSick();
}
function deleteSickRange(cls,studentId,fromDate,toDate){
  clearSickRange(cls,studentId,fromDate,toDate);
  showSnack("✅ تم حذف فترة المرضى");
  renderSick();
}
function sickExport(){
  try{
    var wb=XLSX.utils.book_new();
    DB.classes.forEach(function(cls){
      var sts=(DB.data[cls]||[]).filter(function(s){return s.name;});
      var rows=[["م","الاسم","فترات الغياب","فترات المرض","الإجمالي"]];
      sts.forEach(function(s,i){
        var abs=countStudentAbsencePeriods(cls,s.id);
        var sick=countStudentSickPeriods(cls,s.id);
        rows.push([i+1,s.name,abs,sick,abs+sick]);
      });
      var ws=XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,cls.substring(0,31));
    });
    XLSX.writeFile(wb,"سجل_المرضى.xlsx");
  }catch(e){alert("خطأ: "+e.message);}
}

var DS={dictDate:"",
  activeClass:"",
  selectedCol:"",
  scope:"class",
  conf:35,
  sep:"التالي",
  log:[],
  undo:[],
  justSet:{},
  snack:null,
  nameOnly:false,
  nameOnlyMarked:{},
  addStudentMode:false,
  addSep:"التالي"
};

function dAllStudents(){
  var r=[];
  DB.classes.forEach(function(cls){(DB.data[cls]||[]).forEach(function(s){r.push(Object.assign({},s,{_cls:cls}));});});
  return r;
}
// قاموس الأرقام المكتوبة بالعربية
var _ARABIC_NUMS={
  "صفر":0,"واحد":1,"اثنان":2,"اثنين":2,"ثلاثة":3,"ثلاثه":3,
  "أربعة":4,"اربعة":4,"أربعه":4,"اربعه":4,
  "خمسة":5,"خمسه":5,"ستة":6,"سته":6,
  "سبعة":7,"سبعه":7,"ثمانية":8,"ثمانيه":8,"تمانية":8,"تمانيه":8,
  "تسعة":9,"تسعه":9,"عشرة":10,"عشره":10,
  "أحد عشر":11,"احد عشر":11,"اثنا عشر":12,"اثني عشر":12,
  "ثلاثة عشر":13,"أربعة عشر":14,"خمسة عشر":15,
  "ستة عشر":16,"سبعة عشر":17,"ثمانية عشر":18,
  "تسعة عشر":19,"عشرون":20,"خمسة وعشرون":25,"ثلاثون":30
};

function parseGradeStr(s){
  if(!s&&s!==0)return null;
  var t=String(s).trim();
  if(t==="غ"||t==="غائب")return"غ";
  if(t==="م"||t==="مريض")return"غ";
  // أرقام هندية/عربية
  var t2=t.replace(/[٠-٩]/g,function(d){return d.charCodeAt(0)-1632;});
  var n=parseFloat(t2);
  if(!isNaN(n))return n;
  // أرقام مكتوبة بالكلمات
  var norm=t.replace(/[ً-ٰٟ]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").trim();
  if(_ARABIC_NUMS.hasOwnProperty(norm))return _ARABIC_NUMS[norm];
  // بحث جزئي (للمطابقة المرنة)
  for(var k in _ARABIC_NUMS){
    if(norm===k||norm.indexOf(k)===0)return _ARABIC_NUMS[k];
  }
  return null;
}
function dnorm(s){
  if(!s)return"";
  return String(s)
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/[أإآ]/g,"ا")
    .replace(/[ىئ]/g,"ي")
    .replace(/ة/g,"ه")
    .replace(/ؤ/g,"و")
    .toLowerCase().trim();
}
function dClsStudents(cls){return(DB.data[cls]||[]).map(function(s){return Object.assign({},s,{_cls:cls});});}
function dPool(){return DS.scope==="all"?dAllStudents():dClsStudents(DS.activeClass);}

function dSim(a,b){
  a=dnorm(a);b=dnorm(b);
  if(!a||!b)return 0;if(a===b)return 1;if(b.indexOf(a)>=0||a.indexOf(b)>=0)return 0.92;
  var wa=a.split(" ").filter(function(w){return w.length>1;});
  var wb=b.split(" ").filter(function(w){return w.length>1;});
  if(!wa.length||!wb.length)return 0;
  var m=0;wa.forEach(function(w){if(wb.some(function(x){return x.indexOf(w)>=0||w.indexOf(x)>=0;}))m++;});
  return m/Math.max(wa.length,wb.length);
}
function dFind(q,pool){
  var num=parseInt(dnorm(q));
  if(!isNaN(num)&&num>=1){var cls=dClsStudents(DS.activeClass);if(num<=cls.length)return{s:cls[num-1],score:1,byNum:true};}
  var best=null,bs=0;
  pool.forEach(function(s){var sc=dSim(q,s.name);if(sc>bs){bs=sc;best=s;}});
  if(!best||bs<=0)return null;
  // ── كشف التشابه: هل هناك طالب آخر له نفس الدرجة أو قريب منها؟ ──
  var threshold=Math.max(bs-0.05,0.7);
  var rivals=pool.filter(function(s){return s.id!==best.id&&dSim(q,s.name)>=threshold;});
  return{s:best,score:bs,byNum:false,rivals:rivals};
}

function dApplyGrade(student,colId,grade){
  var cls=student._cls;
  var idx=-1;(DB.data[cls]||[]).forEach(function(s,i){if(s.id==student.id)idx=i;});
  if(idx<0)return;
  var s=DB.data[cls][idx];
  DS.undo.push({id:student.id,cls:cls,snap:Object.assign({},s)});
  if(DS.undo.length>60)DS.undo.shift();
  var colDef=null;allCols().forEach(function(c){if(c.id===colId)colDef=c;});
  var p;
  if(grade==="غ"){
    p=colId==="total"?setAllAbsent(s):Object.assign({},s,(function(){var x={};if(colDef)x[colDef.field]="غ";return x;})());
    // Record in absence system if it's a weekly assess col
    if(colId!=="total"&&colDef&&colDef.field){
      var wm=colDef.field.match(/^a(\d+)$/);
      if(wm){
        var wnum=parseInt(wm[1]);
        var sched2=DB.schedule[cls]||{periods:[],slots:{}};
        var periods2=sched2.periods||[];
        var absData2=getStudentAbsences(cls,student.id);
        if(periods2.length){
          periods2.forEach(function(period){DAYS_AR.forEach(function(_,di){var slot=sched2.slots[period.id+"_d"+di]||"";if(slot.trim()){var dt2=DS.dictDate||null;var k=absKey(wnum,period.id,di,dt2);if(!absData2[k])absData2[k]="abs";}});});
        } else {
          var ppw2=Math.max(1,Number(DB.meta.periodsPerWeek)||3);
          for(var pi2=0;pi2<ppw2;pi2++){var dt3=DS.dictDate||null;var k2=absKey(wnum,"g"+pi2,pi2%5,dt3);if(!absData2[k2])absData2[k2]="abs";}
        }
      }
    }
  }
  else if(colId==="total"){p=distributeTotal(grade,s)||s;}
  else{p=Object.assign({},s);if(colDef)p[colDef.field]=grade;}
  DB.data[cls][idx]=p;
  DS.justSet[student.id]=Date.now();
  saveDB();
  // highlight in grades page
  GS.dictHL[student.id]=Date.now();
  if(_currentPage==="grades")renderGrades();
}

function dUndo(){
  if(!DS.undo.length)return false;
  var last=DS.undo.pop();
  var idx=-1;(DB.data[last.cls]||[]).forEach(function(s,i){if(s.id==last.id)idx=i;});
  if(idx>=0){DB.data[last.cls][idx]=last.snap;saveDB();}
  if(DS.log.length)DS.log.shift();
  return true;
}

// فاصل الاسم عن الدرجة: , ، / -
var SEP_RE=/[،,\/\-]|درجته?|درجه?|يساو[يى]/;

// فاصل بين طلاب متعددين في سطر واحد
// DS.sep = "التالي" أو أي كلمة مخصصة — وكذلك + وسطر جديد
function sepRE(){
  var w=(DS.sep||"التالي").trim();
  // escape special regex chars
  var esc=w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  // استخدم lookahead بدل \b لأن \b لا يعمل مع العربية
  return new RegExp("(?:^|\\s)"+esc+"(?:\\s|$)|\\+","gm");
}

// تقسيم نص الإدخال الكامل إلى إدخالات منفصلة (طالب واحد لكل عنصر)
function splitEntries(raw,sepOverride){
  // أولاً: قسّم على سطر جديد
  var lines=raw.split(/\n/).map(function(l){return l.trim();}).filter(Boolean);
  var out=[];
  lines.forEach(function(line){
    // ثم قسّم كل سطر على الفاصل المحدد أو "التالي"
    var w=(sepOverride||(typeof DS!=='undefined'&&DS.sep)||"التالي").trim();
    var esc=w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    var re=new RegExp("\\s*(?:"+esc+"|\\+)\\s*","g");
    var parts=line.split(re).map(function(p){return p.trim();}).filter(Boolean);
    out=out.concat(parts);
  });
  return out;
}

// ── وضع الاسم فقط ──
function dNameOnlyProcess(raw){
  var pool=dPool();
  var entries=splitEntries(raw);
  var results=[];
  entries.forEach(function(entry){
    var m=dFind(entry,pool);
    var pct=m?Math.round(m.score*100):0;
    if(m&&pct>=DS.conf){
      DS.nameOnlyMarked[m.s.id]=Date.now();
      DS.justSet[m.s.id]=Date.now();
      var rivalWarnNO=(m.rivals&&m.rivals.length)?("⚠️ تحذير تشابه: عُلِّم «"+m.s.name+"» لكن يوجد مشابه: "+m.rivals.map(function(r){return "«"+r.name+"»";}).join("، ")):null;
      results.push({inputText:entry,matchedName:m.s.name,studentId:m.s.id,cls:m.s._cls,nameStr:entry,grade:"✓",col:DS.selectedCol,status:pct>=80?"ok":"weak",pct:pct,isNameOnly:true,rivalWarn:rivalWarnNO||null});
    } else {
      results.push({inputText:entry,status:"unmatched",error:"لم يُعرف: \""+entry+"\""+(m?" (أقرب: "+m.s.name+" "+pct+"%)":""),nameStr:entry,isNameOnly:true});
    }
  });
  DS.log=[].concat(results,DS.log).slice(0,200);
  saveDB();
  if(_currentPage==="grades")renderGrades();
  return results;
}

function dNameOnlyMarkAbsent(){
  // Mark all students NOT in nameOnlyMarked as absent (غ) in DS.log info only — no grade change
  var pool=dPool();
  var marked=DS.nameOnlyMarked;
  var absent=pool.filter(function(s){return !marked[s.id];});
  if(!absent.length){showSnack('✅ جميع الطلاب تم مناداتهم');return;}
  if(!confirm('سيتم تسجيل غياب '+absent.length+' طالب لم يُنادَ عليهم. هل تريد المتابعة؟'))return;
  absent.forEach(function(s){
    dApplyGrade(s,DS.selectedCol,'غ');
    DS.log.unshift({inputText:'(غياب تلقائي)',matchedName:s.name,studentId:s.id,cls:s._cls,nameStr:s.name,grade:'غ',col:DS.selectedCol,status:'ok',pct:100,isAbsent:true});
  });
  DS.log=DS.log.slice(0,200);
  showSnack('🚫 تم تسجيل غياب '+absent.length+' طالب');
  renderDict();
}

function dNameOnlyClear(){
  DS.nameOnlyMarked={};
  renderDict();
}

// استخراج الاسم والدرجة: "محمد 7" أو "محمد/7" أو "محمد سبعة"
function dSplitNameGrade(t){
  // 1. فاصل صريح
  if(SEP_RE.test(t)){
    var parts=t.split(SEP_RE).map(function(p){return p.trim();}).filter(Boolean);
    if(parts.length>=2){
      var g=parseGradeStr(parts[parts.length-1]);
      if(g!==null)return{nameStr:parts.slice(0,parts.length-1).join(" "),grade:g};
    }
  }
  // 2. رقم رقمي في النهاية
  var m=t.match(/^(.*?)\s*([\u0660-\u0669\d]+(?:[.,][\u0660-\u0669\d]+)?)\s*$/);
  if(m&&m[1].trim()){var g2=parseGradeStr(m[2]);if(g2!==null)return{nameStr:m[1].trim(),grade:g2};}
  // 3. كلمة عددية في النهاية ("محمد سبعة")
  var words=t.trim().split(/\s+/);
  if(words.length>=2){
    // جرّب آخر كلمة
    var lastW=words[words.length-1];
    var g3=parseGradeStr(lastW);
    if(g3!==null&&g3!=="غ")return{nameStr:words.slice(0,words.length-1).join(" "),grade:g3};
    // جرّب آخر كلمتين (مثل "خمسة عشر")
    if(words.length>=3){
      var last2=words.slice(-2).join(" ");
      var g4=parseGradeStr(last2);
      if(g4!==null&&g4!=="غ")return{nameStr:words.slice(0,words.length-2).join(" "),grade:g4};
    }
  }
  return{nameStr:t,grade:null};
}

function dParseEntry(text,pool){
  var t=text.trim();if(!t)return null;
  var colDef=null;allCols().forEach(function(c){if(c.id===DS.selectedCol)colDef=c;});
  var parsed=dSplitNameGrade(t);
  var nameStr=parsed.nameStr,grade=parsed.grade;
  if(grade===null)grade="غ";
  var maxG=colDef?colDef.max:totalMax();
  if(grade!=="غ"&&(grade<0||grade>maxG))
    return{error:"الدرجة "+grade+" خارج 0-"+maxG,status:"error"};
  var m2=dFind(nameStr,pool);var pct2=m2?Math.round(m2.score*100):0;
  if(!m2||pct2<DS.conf)
    return{nameStr:nameStr,grade:grade,error:"لم يُعرف: \""+nameStr+"\""+(m2?" ("+m2.s.name+" "+pct2+"%)":""),status:"unmatched"};
  var rivalWarn=(m2.rivals&&m2.rivals.length)
    ?("⚠️ "+m2.rivals.length+" مشابه: "+m2.rivals.map(function(r){return"«"+r.name+"»";}).join("، ")):null;
  return{nameStr:nameStr,student:m2.s,grade:grade,pct:pct2,status:pct2>=80?"ok":"weak",isAbsent:grade==="غ",rivalWarn:rivalWarn};
}

function dProcess(raw){
  var pool=dPool();
  var entries=splitEntries(raw);
  var results=[];
  entries.forEach(function(entry){
    var r=dParseEntry(entry,pool);if(!r)return;
    if(r.error&&!r.student){results.push({inputText:entry,status:r.status||"error",error:r.error,nameStr:r.nameStr||"",grade:r.grade,col:DS.selectedCol});return;}
    dApplyGrade(r.student,DS.selectedCol,r.grade);
    results.push({inputText:entry,matchedName:r.student.name,studentId:r.student.id,cls:r.student._cls,nameStr:r.nameStr,grade:r.grade,col:DS.selectedCol,status:r.status,pct:r.pct,byNum:r.byNum,isAbsent:r.isAbsent,rivalWarn:r.rivalWarn||null});
  });
  DS.log=[].concat(results,DS.log).slice(0,200);
  return results;
}

// ════════════════════════════════════════════════
// ── نظام قائمة الانتظار للأسماء المتشابهة ──
// ════════════════════════════════════════════════
// DS._rivalQueue = [{nameStr, grade, isNameOnly, candidates[]}, ...]
// يُعالج واحداً بواحد — المعروفة تُرصد فوراً، المتشابهة تنتظر

function dParseEntryForQueue(entry){
  // يُرجع {nameStr, grade, isNameOnly} بدون رصد
  if(DS.nameOnly) return {nameStr:entry.trim(), grade:null, isNameOnly:true};
  var parsed=dSplitNameGrade(entry.trim());
  var grade=parsed.grade!==null?parsed.grade:"غ";
  return {nameStr:parsed.nameStr, grade:grade, isNameOnly:false};
}

function dShowRivalPicker(){
  if(!DS._rivalQueue||!DS._rivalQueue.length){
    // انتهت القائمة — أعد التركيز
    renderDict();
    setTimeout(function(){var inp=document.getElementById("dInput");if(inp)inp.focus();},30);
    return;
  }
  var item=DS._rivalQueue[0]; // لا نحذفه حتى يختار المستخدم
  var allCandidates=item.candidates;
  var pool=dPool();
  // احذف أي نافذة قديمة
  var old=document.getElementById("rivalPickerModal");
  if(old)old.parentNode.removeChild(old);

  var mo=document.createElement("div");
  mo.className="mo";
  mo.id="rivalPickerModal";
  var remaining=DS._rivalQueue.length;
  var gradeLabel=item.isNameOnly?"(تسجيل حضور)":(item.grade==="غ"?"(غائب)":("درجة: <strong style='color:#1d4ed8'>"+item.grade+"</strong>"));
  var rows="";
  allCandidates.forEach(function(s,i){
    var sc=Math.round(dSim(item.nameStr,s.name)*100);
    var num=1; pool.forEach(function(p,pi){if(p.id===s.id)num=pi+1;});
    rows+='<div onclick="dPickRival(\''+s.id+'\',\''+esc(s._cls||DS.activeClass)+'\')" style="'
      +'display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;'
      +'background:'+(i===0?'#eff6ff':'white')+';transition:background .1s;" '
      +'onmouseover="this.style.background=\'#dbeafe\'" onmouseout="this.style.background=\''+(i===0?'#eff6ff':'white')+'\'">'
      +'<div style="width:28px;height:28px;border-radius:50%;background:'+(i===0?'#1d4ed8':'#64748b')+';color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">'+num+'</div>'
      +'<div style="flex:1;">'
        +'<div style="font-size:13px;font-weight:700;color:#0f172a;">'+esc(s.name)+'</div>'
        +'<div style="font-size:10px;color:#64748b;">'+esc(s._cls||DS.activeClass)+' &nbsp;|&nbsp; تطابق: '+sc+'%'
          +(i===0?' &nbsp;<span style="background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:8px;font-size:9px;">الأفضل</span>':'')
        +'</div>'
      +'</div>'
      +'<div style="font-size:18px;color:#94a3b8;">›</div>'
      +'</div>';
  });
  var queueBadge=remaining>1?'<span style="background:#7c3aed;color:white;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:700;margin-right:6px;">'+remaining+' في الانتظار</span>':'';
  mo.innerHTML='<div class="md" style="max-width:400px;">'
    +'<div class="mh" style="background:linear-gradient(135deg,#7c2d12,#b45309);">'
      +'<span style="font-size:16px;">⚠️</span>'
      +'<h2 style="color:white;flex:1;">تشابه في الأسماء</h2>'
      +queueBadge
      +'<button class="xbtn" style="color:white;" onclick="dSkipRival()">تخطي</button>'
    +'</div>'
    +'<div style="padding:10px 14px;background:#fff7ed;border-bottom:1px solid #fed7aa;">'
      +'<div style="font-size:11px;color:#92400e;">الاسم المُدخل: <strong>'+esc(item.nameStr)+'</strong> &nbsp;|&nbsp; '+gradeLabel+'</div>'
      +'<div style="font-size:10px;color:#b45309;margin-top:3px;">وُجد '+allCandidates.length+' طالب متشابه — اختر الطالب الصحيح:</div>'
    +'</div>'
    +'<div style="overflow-y:auto;max-height:340px;">'+rows+'</div>'
    +'<div class="mf">'
      +'<button class="btn btn-ghost btn-sm" onclick="dSkipRival()">تخطي هذا</button>'
      +(remaining>1?'<span style="font-size:9px;color:#94a3b8;">'+remaining+' متبقية</span>':'')
    +'</div>'
    +'</div>';
  document.body.appendChild(mo);
}

function dSkipRival(){
  // تخطي هذا العنصر بدون رصد
  var mo=document.getElementById("rivalPickerModal");
  if(mo)mo.parentNode.removeChild(mo);
  if(DS._rivalQueue&&DS._rivalQueue.length){
    var skipped=DS._rivalQueue.shift();
    showSnack("⏭ تم تخطي: "+skipped.nameStr);
  }
  if(DS._rivalQueue&&DS._rivalQueue.length){
    setTimeout(dShowRivalPicker,80);
  } else {
    renderDict();
    setTimeout(function(){var inp=document.getElementById("dInput");if(inp)inp.focus();},30);
  }
}

function dPickRival(studentId, cls){
  var mo=document.getElementById("rivalPickerModal");
  if(mo)mo.parentNode.removeChild(mo);
  if(!DS._rivalQueue||!DS._rivalQueue.length)return;
  var item=DS._rivalQueue.shift(); // الآن نحذفه
  var pool=dPool();
  var student=null;
  for(var i=0;i<pool.length;i++){if(String(pool[i].id)===String(studentId)){student=pool[i];break;}}
  if(!student){showSnack("⚠ لم يُعثر على الطالب");return;}
  if(item.isNameOnly){
    DS.nameOnlyMarked[student.id]=Date.now();
    DS.justSet[student.id]=Date.now();
    DS.log.unshift({inputText:item.nameStr,matchedName:student.name,studentId:student.id,cls:student._cls,nameStr:item.nameStr,grade:"✓",col:DS.selectedCol,status:"ok",pct:100,isNameOnly:true,manualPick:true});
    DS.log=DS.log.slice(0,200);
    saveDB();
    if(_currentPage==="grades")renderGrades();
    showSnack("📋 تم تعليم: "+student.name);
  } else {
    dApplyGrade(student,DS.selectedCol,item.grade);
    DS.log.unshift({inputText:item.nameStr,matchedName:student.name,studentId:student.id,cls:student._cls,nameStr:item.nameStr,grade:item.grade,col:DS.selectedCol,status:"ok",pct:100,isAbsent:item.grade==="غ",manualPick:true});
    DS.log=DS.log.slice(0,200);
    showSnack("✅ رُصد: "+student.name+" — "+(item.grade==="غ"?"غ":item.grade));
  }
  var box=document.getElementById("dStatusBox");
  if(box){box.className="status-box sb-ok";box.innerHTML='<span>✅</span><div><strong>'+esc(student.name)+'</strong> — '+(item.isNameOnly?"تم التعليم":(item.grade==="غ"?"غ":("<strong>"+item.grade+"</strong>")))+'&nbsp;<span style="font-size:9px;opacity:.7;">(اختيار يدوي)</span></div>';}
  // هل يوجد المزيد في القائمة؟
  if(DS._rivalQueue&&DS._rivalQueue.length){
    setTimeout(dShowRivalPicker,120);
  } else {
    renderDict();
    setTimeout(function(){var inp=document.getElementById("dInput");if(inp)inp.focus();},30);
  }
}

function dOnKey(e){
  if(e.key!=="Enter"||e.shiftKey)return;
  e.preventDefault();
  var el=document.getElementById("dInput");if(!el)return;
  var raw=el.value.trim();if(!raw)return;
  // ── تحقق من تحديد العمود أولاً (في وضع الغياب فقط) ──
  if(!DS.nameOnly&&!DS.selectedCol){
    var box=document.getElementById("dStatusBox");
    if(box){box.className="status-box sb-err";box.innerHTML='<span>⚠️</span><span>يجب اختيار العمود المستهدف أولاً قبل بدء الرصد</span>';}
    el.className="dict-input err";
    setTimeout(function(){var el2=document.getElementById("dInput");if(el2)el2.className="dict-input";},1500);
    showSnack("⚠ اختر العمود المستهدف أولاً");
    return;
  }

  // ── تصنيف كل إدخال: واضح أو متشابه ──
  var pool=dPool();
  var rawEntries=splitEntries(raw);
  var clearEntries=[]; // نصوص الإدخالات الواضحة — تُرسل لـ dProcess/dNameOnlyProcess
  DS._rivalQueue=DS._rivalQueue||[];

  rawEntries.forEach(function(entry){
    var parsed=dParseEntryForQueue(entry);
    var m=dFind(parsed.nameStr,pool);
    var pct=m?Math.round(m.score*100):0;
    // نافذة التشابه في كل الحالات إذا وجد أسماء مشابهة
    if(m&&m.rivals&&m.rivals.length>0&&pct>=DS.conf){
      DS._rivalQueue.push({nameStr:parsed.nameStr,grade:parsed.grade,isNameOnly:parsed.isNameOnly,candidates:[m.s].concat(m.rivals)});
    } else {
      clearEntries.push(entry);
    }
  });

  // ── ارصد الواضحة فوراً ──
  var okCount=0,failCount=0;
  if(clearEntries.length){
    var clearRaw=clearEntries.join("\n");
    var results=DS.nameOnly?dNameOnlyProcess(clearRaw):dProcess(clearRaw);
    okCount=results.filter(function(r){return r.status==="ok"||r.status==="weak";}).length;
    failCount=results.filter(function(r){return r.status==="unmatched"||r.status==="error";}).length;
  }

  el.value="";
  var box=document.getElementById("dStatusBox");

  // ── عرض ملخص الحالة ──
  var pendingCount=DS._rivalQueue.length;
  if(okCount||failCount||pendingCount){
    var msg="";
    if(okCount)msg+="✅ رُصد "+okCount+" ";
    if(failCount)msg+="❌ "+failCount+" فشل ";
    if(pendingCount)msg+="⚠️ "+pendingCount+" بانتظار الاختيار";
    if(box){
      box.className="status-box "+(pendingCount?"sb-warn":(failCount?"sb-err":"sb-ok"));
      box.innerHTML='<span>'+(pendingCount?"⚠️":(failCount?"❌":"✅"))+'</span><span>'+msg.trim()+'</span>';
    }
    if(okCount)showSnack(DS.nameOnly?("📋 تم تعليم "+okCount):("✅ رُصد "+okCount)+(failCount?" | ⚠ "+failCount+" فشل":"")+(pendingCount?" | ⏳ "+pendingCount+" متشابه":""));
  }

  el.className="dict-input";
  renderDict();

  // ── إذا كان هناك متشابهات، ابدأ عرض النوافذ ──
  if(DS._rivalQueue&&DS._rivalQueue.length){
    setTimeout(dShowRivalPicker,200);
  } else {
    setTimeout(function(){var inp=document.getElementById("dInput");if(inp)inp.focus();},30);
  }
}

// ── إضافة طلاب جدد من صفحة الإملاء ──
function dAddNewStudents(){
  var cls=DS.activeClass;
  if(!cls){showSnack("⚠ اختر فصلاً أولاً");return;}
  var area=document.getElementById("dNewStuArea");
  if(!area)return;
  var raw=area.value||"";
  var sep=(DS.addSep||"التالي").trim();
  // تقسيم بالفاصل ثم بالسطر الجديد
  var parts=raw.split(sep);
  var names=[];
  parts.forEach(function(p){
    p.split("\n").forEach(function(n){
      n=n.trim();
      if(n)names.push(n);
    });
  });
  if(!names.length){showSnack("⚠ أدخل اسماً على الأقل");return;}
  if(!DB.data[cls])DB.data[cls]=[];
  var added=[],dups=[];
  names.forEach(function(n,i){
    var dup=DB.data[cls].some(function(s){return s.name&&s.name.trim()===n;});
    if(dup){dups.push(n);return;}
    DB.data[cls].push(emptyStudent(Date.now()+i,n));
    added.push(n);
  });
  if(added.length)saveDB();
  DS.addStudentMode=false;
  if(added.length&&!dups.length)      showSnack("✅ تمت إضافة "+added.length+" طالب إلى "+cls);
  else if(added.length&&dups.length)  showSnack("✅ أُضيف "+added.length+" | ⚠ مكرر: "+dups.join("، "));
  else                                 showSnack("⚠ جميع الأسماء مكررة بالفعل");
  renderDict();
}
function renderDict(){
  var root=document.getElementById("dictRoot");
  if(!root)return;
  if(!DS.activeClass&&DB.classes.length)DS.activeClass=DB.classes[0];
  var cls=DS.activeClass;
  // ── تحديث أزرار الشريط العلوي ──
  (function(){
    var isAtt=DS.nameOnly;
    var absBtn=document.getElementById("tbDictModeAbsBtn");
    var attBtn=document.getElementById("tbDictModeAttBtn");
    if(absBtn){absBtn.style.background=!isAtt?"#1d4ed8":"transparent";absBtn.style.color=!isAtt?"white":"#64748b";}
    if(attBtn){attBtn.style.background=isAtt?"#7c3aed":"transparent";attBtn.style.color=isAtt?"white":"#64748b";}
    // زر طلاب جدد — تغيير اللون عند التفعيل
    var addBtn=document.getElementById("tbDictAddStuBtn");
    if(addBtn){
      addBtn.style.background=DS.addStudentMode?"#0e7490":"#0e7490";
      addBtn.style.outline=DS.addStudentMode?"2px solid #38bdf8":"none";
    }
  })();
  var sts=dClsStudents(cls);
  var now=Date.now();
  var tmax=totalMax();

  // Column options
  var noColSelected=!DS.selectedCol;
  var colOpts='<option value="" '+(noColSelected?'selected':'')+' disabled style="color:#64748b;">— اختر العمود المستهدف —</option>';
  colOpts+='<option value="total"'+('total'===DS.selectedCol?' selected':'')+'>المجموع /'+tmax+'</option>';
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.filter(function(c){return c.visible;}).forEach(function(c){
      colOpts+='<option value="'+c.id+'"'+(c.id===DS.selectedCol?' selected':'')+'>'+esc(c.label)+' /'+c.max+'</option>';
    });
  });
  var selCol=null;allCols().forEach(function(c){if(c.id===DS.selectedCol)selCol=c;});
  var gradedCount=sts.filter(function(s){return selCol&&s[selCol.field]!==""&&s[selCol.field]!==undefined;}).length;
  var okCnt=DS.log.filter(function(l){return l.status==="ok"||l.status==="weak";}).length;
  var failCnt=DS.log.filter(function(l){return l.status==="unmatched"||l.status==="error";}).length;
  var confCls=DS.conf>=70?"cb-h":DS.conf>=50?"cb-m":"cb-l";
  var markedCount=Object.keys(DS.nameOnlyMarked).length;
  var isAttendMode=DS.nameOnly;

  var html='<div class="dict-page"><div class="d-wrap">';
  html+='<div class="d-left">';


  // ── لوحة إضافة طلاب جدد ──
  if(DS.addStudentMode){
    html+='<div style="background:#082f49;border:2px solid #0e7490;border-radius:10px;padding:10px 14px;">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
    html+='<div style="font-size:11px;font-weight:900;color:#38bdf8;">➕ إضافة طلاب إلى: <span style="color:white;">'+esc(DS.activeClass||'—')+'</span></div>';
    html+='<div style="display:flex;align-items:center;gap:5px;">';
    html+='<span style="font-size:9px;color:#94a3b8;">الفاصل:</span>';
    html+='<input id="dAddSepInp" type="text" value="'+esc(DS.addSep||'التالي')+'" style="width:75px;background:#0f172a;border:1.5px solid #0e7490;color:#f1f5f9;padding:3px 7px;border-radius:6px;font-size:11px;outline:none;font-family:inherit;"/>';
    html+='</div></div>';
    html+='<textarea id="dNewStuArea" rows="4" placeholder="مثال: محمد أحمد التالي علي حسن التالي عمر خالد&#10;أو اكتب كل اسم في سطر جديد" style="width:100%;background:#0f172a;border:1.5px solid #0e7490;color:#f1f5f9;padding:7px 10px;border-radius:7px;font-size:12px;outline:none;font-family:inherit;resize:vertical;margin-bottom:7px;"></textarea>';
    html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
    html+='<button class="btn btn-sm" style="background:#0e7490;color:white;padding:5px 16px;" onclick="DS.addSep=document.getElementById(\'dAddSepInp\').value.trim()||\' التالي\';dAddNewStudents()">✅ إضافة الكل</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="DS.addStudentMode=false;renderDict();">✕ إلغاء</button>';
    html+='<span style="font-size:8.5px;color:#64748b;">💡 افصل الأسماء بكلمة الفاصل أو بسطر جديد</span>';
    html+='</div></div>';
  }

  // ── شريط إجراءات وضع الحضور ──
  if(isAttendMode){
    var absentLeft=sts.length-markedCount;
    html+='<div style="background:#1e1040;border:2px solid #7c3aed;border-radius:10px;padding:10px 14px;margin-bottom:0;">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
    html+='<div>';
    html+='<div style="font-size:11px;font-weight:900;color:#a78bfa;">تم تعليم '+markedCount+' من '+sts.length+' طالب</div>';
    html+='<div style="background:#0f172a;border-radius:4px;height:5px;margin-top:5px;width:160px;overflow:hidden;">';
    html+='<div style="height:100%;background:#7c3aed;border-radius:4px;width:'+(sts.length?Math.round(markedCount/sts.length*100):0)+'%;transition:width .4s;"></div>';
    html+='</div>';
    html+='</div>';
    html+='<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    html+='<button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="dNameOnlyMarkAbsent()">🚫 تسجيل غياب الباقين ('+absentLeft+')</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="dNameOnlyClear()">↺ إعادة</button>';
    html+='</div>';
    html+='</div></div>';
  }

  // ── اختيار الفصل (منسدلة) ──
  // ── الفصل + العمود في صف واحد ──
  html+='<div class="card" style="padding:7px 11px;'+(noColSelected&&!isAttendMode?'border:1.5px solid #f59e0b;':'')+'">';
  html+='<div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">';
  // اختيار الفصل
  html+='<div style="flex:1;min-width:100px;">';
  html+='<select class="col-sel-dark" style="width:100%;" onchange="(function(v){if(v===\'__all__\'){DS.scope=\'all\';}else{DS.scope=\'class\';DS.activeClass=v;DS.nameOnlyMarked={};}renderDict();})(this.value)">';
  html+='<option value="__all__"'+(DS.scope==="all"?' selected':'')+'>🏫 كل الفصول</option>';
  DB.classes.forEach(function(c){html+='<option value="'+esc(c)+'"'+(DS.scope!=="all"&&c===cls?' selected':'')+'>'+esc(c)+'</option>';});
  html+='</select>';
  html+='</div>';
  // اختيار العمود
  if(!isAttendMode){
    html+='<div style="flex:1;min-width:100px;">';
    html+='<select class="col-sel-dark" style="width:100%;" id="dColSel" onchange="DS.selectedCol=this.value;renderDict()">'+colOpts+'</select>';
    html+='</div>';
  }
  html+='</div>';
  html+='</div>';

  // ── منطقة الإدخال ──
  html+='<div class="card" style="'+(isAttendMode?'border:1.5px solid #4c1d95;':'')+'">';

  var ph=isAttendMode
    ?'اكتب اسم الطالب الحاضر ثم Enter&#10;مثال: محمد أحمد&#10;✅ يُعلَّم الطالب فوراً كحاضر'
    :'مثال: محمد أحمد، خمسة وخمسين&#10;اسم فقط = غائب تلقائياً&#10;فاصل: ، / - | طلاب: '+esc(DS.sep)+' أو سطر جديد';
  html+='<textarea id="dInput" class="dict-input" rows="3" placeholder="'+ph+'" onkeydown="dOnKey(event)"></textarea>';
  html+='</div>';

  // ── صندوق الحالة ──
  html+='<div id="dStatusBox" class="status-box sb-idle" style="display:none;"></div>';

  // ── إحصائيات ──
  html+='<div class="d-stats">';
  if(isAttendMode){
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#a78bfa">'+markedCount+'</div><div class="d-stat-l">حضر</div></div>';
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#ef4444">'+(sts.length-markedCount)+'</div><div class="d-stat-l">لم يُنادَ</div></div>';
  } else {
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#34d399">'+gradedCount+'</div><div class="d-stat-l">مرصود</div></div>';
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#64748b">'+(sts.length-gradedCount)+'</div><div class="d-stat-l">متبقي</div></div>';
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#f87171">'+failCnt+'</div><div class="d-stat-l">فشل</div></div>';
    html+='<div class="d-stat"><div class="d-stat-v" style="color:#60a5fa">'+okCnt+'</div><div class="d-stat-l">ناجح</div></div>';
  }
  html+='</div>';

  // ── سجل الإملاء ──
  html+='<div class="card" style="flex:1;display:flex;flex-direction:column;min-height:120px;">';
  html+='<div class="card-title">سجل الإملاء ('+DS.log.length+')</div>';
  html+='<div class="d-log-wrap"><table class="d-log-table"><thead><tr>';
  if(isAttendMode){
    html+='<th>#</th><th>الإدخال</th><th>الطالب</th><th>الفصل</th><th>الحالة</th><th>دقة</th>';
  } else {
    html+='<th>#</th><th>الإدخال</th><th>الطالب</th><th>الفصل</th><th>الدرجة</th><th>دقة</th>';
  }
  html+='</tr></thead><tbody>';
  html+=DS.log.length===0?'<tr><td colspan="6" style="color:#334155;padding:12px">لا يوجد</td></tr>':'';
  DS.log.forEach(function(l,i){
    html+='<tr>';
    html+='<td style="color:#334155">'+(DS.log.length-i)+'</td>';
    html+='<td class="d-input-name" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(l.nameStr||l.inputText||"")+'</td>';
    html+='<td class="'+(l.matchedName?"d-matched":"d-unmatched")+'" title="'+esc(l.matchedName||l.error||"")+'">'+esc(l.matchedName||(l.error||"غير معروف"))+'</td>';
    html+='<td>'+(l.cls?'<span class="badge badge-blue">'+esc(l.cls)+'</span>':"—")+'</td>';
    if(l.isNameOnly){
      html+='<td><span style="background:#4c1d95;color:#c4b5fd;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:700;">✓ حاضر</span></td>';
    } else {
      html+='<td>'+(l.grade!=null?'<span class="'+(l.isAbsent?"d-abs-pill":"d-grade-pill")+'">'+(l.isAbsent?"غ":l.grade)+'</span>':"—")+'</td>';
    }
    html+='<td style="color:'+(l.pct>=80?"#34d399":l.pct>=50?"#fcd34d":"#f87171")+';font-weight:700;font-size:10px;">'+(l.pct!=null?l.pct+"%":l.byNum?"🔢":"❌")+'</td>';
    html+='</tr>';
    if(l.rivalWarn){
      html+='<tr><td colspan="6" style="background:#451a03;color:#fcd34d;font-size:9px;padding:3px 8px;text-align:right;border-bottom:1px solid #7c2d12;">'+esc(l.rivalWarn)+'</td></tr>';
    }
  });
  html+='</tbody></table></div></div>';
  html+='</div>'; // d-left

  // ── قائمة الطلاب (اليمين) ──
  html+='<div class="d-right">';
  html+='<div class="card" style="flex:1;display:flex;flex-direction:column;min-height:200px;'+(isAttendMode?'border:1.5px solid #4c1d95;':'')+'">';
  html+='<div class="card-title">'+(isAttendMode?'حضور '+esc(cls)+' — '+markedCount+'/'+sts.length:'طلاب '+esc(cls)+' — '+gradedCount+'/'+sts.length)+'</div>';
  var barColor=isAttendMode?'#7c3aed':'#10b981';
  var barPct=isAttendMode?(sts.length?Math.round(markedCount/sts.length*100):0):(sts.length?Math.round(gradedCount/sts.length*100):0);
  html+='<div style="background:#0f172a;border-radius:3px;height:4px;margin-bottom:6px;overflow:hidden;">';
  html+='<div style="height:100%;border-radius:3px;background:'+barColor+';width:'+barPct+'%;transition:width .4s;"></div>';
  html+='</div>';
  html+='<div class="d-stu-list">';
  sts.forEach(function(s,i){
    var isMarked=!!DS.nameOnlyMarked[s.id];
    var val=selCol?s[selCol.field]:"";
    var hasg=val!==""&&val!==undefined;
    var isAbsent=val==="غ";
    var isJust=DS.justSet[s.id]&&(now-DS.justSet[s.id])<5000;
    if(isAttendMode){
      html+='<div class="d-stu-item'+(isJust?" fresh":isMarked?" graded":"")+'">';
      html+='<div class="d-stu-photo">'+(s.photo?'<img src="'+s.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:3px;"/>':(DB.meta.defaultStudentPhoto?'<img src="'+DB.meta.defaultStudentPhoto+'" style="width:100%;height:100%;object-fit:cover;border-radius:3px;"/>':'<span>'+(i+1)+'</span>'))+'</div>';
      html+='<div class="d-stu-name" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
      html+='<span style="font-size:11px;font-weight:900;padding:2px 9px;border-radius:8px;min-width:36px;text-align:center;'+(isMarked?'background:#4c1d95;color:#c4b5fd;':'background:#1e293b;color:#334155;')+'">'+(isMarked?'✓ حاضر':'—')+'</span>';
      html+='</div>';
    } else {
      html+='<div class="d-stu-item'+(isJust?" fresh":hasg?" graded":"")+'">';
      html+='<div class="d-stu-photo">'+(s.photo?'<img src="'+s.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:3px;"/>':(DB.meta.defaultStudentPhoto?'<img src="'+DB.meta.defaultStudentPhoto+'" style="width:100%;height:100%;object-fit:cover;border-radius:3px;"/>':'<span>'+(i+1)+'</span>'))+'</div>';
      html+='<div class="d-stu-name" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
      var gStyle=isAbsent?"background:#7c2d12;color:#fcd34d;":hasg?"background:#064e3b;color:#34d399;":"background:#1e293b;color:#334155;";
      html+='<span style="font-size:12px;font-weight:900;padding:2px 9px;border-radius:8px;min-width:32px;text-align:center;'+gStyle+'">'+(hasg?val:"—")+'</span>';
      html+='</div>';
    }
  });
  html+='</div></div></div>';
  html+='</div></div>'; // d-wrap, dict-page
  root.innerHTML=html;

  // Attach events
  var dInp=document.getElementById("dInput");
  if(dInp){dInp.focus();} // keydown handled inline via onkeydown
}



function dExport(){
  try{
    var wb=XLSX.utils.book_new();
    var selCol=null;allCols().forEach(function(c){if(c.id===DS.selectedCol)selCol=c;});
    DB.classes.forEach(function(cls){
      var sts=dClsStudents(cls);
      var rows=[["م","اسم الطالب","الدرجة"]];
      sts.forEach(function(s,i){rows.push([i+1,s.name,selCol?s[selCol.field]:""]);});
      var ws=XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[{wch:4},{wch:30},{wch:12}];
      XLSX.utils.book_append_sheet(wb,ws,cls.substring(0,31));
    });
    XLSX.writeFile(wb,"رصد_إملاء.xlsx");
  }catch(e){alert("خطأ: "+e.message);}
}

// Clear just-set highlights
setInterval(function(){
  var now=Date.now();var changed=false;
  Object.keys(DS.justSet).forEach(function(id){if(now-DS.justSet[id]>5000){delete DS.justSet[id];changed=true;}});
  Object.keys(GS.dictHL).forEach(function(id){if(now-GS.dictHL[id]>5000){delete GS.dictHL[id];changed=true;}});
  if(changed&&_currentPage==="dict")renderDict();
},1000);

// ══════════════════════════════════════════════════════
// SECTION NEW-A: WEEKLY GRADES PAGE
// ══════════════════════════════════════════════════════
var WKS={activeClass:"",activeWeek:1,_autoWeekSet:false,search:'',selectedCol:'',viewMode:'table',cardLayout:'single',photoFit:'contain',cardFont:{nameSize:17,numSize:20,labelSize:9,family:'inherit',weight:900},imlaaPanel:{open:false,conf:70,sep:'التالي',log:[],justSet:{}}};
(function(){try{var cf=JSON.parse(localStorage.getItem('wks_card_font_v1'));if(cf)WKS.cardFont=Object.assign(WKS.cardFont,cf);}catch(e){}}());
(function(){try{var cf=JSON.parse(localStorage.getItem('wks_card_font_v1'));if(cf)WKS.cardFont=Object.assign(WKS.cardFont,cf);}catch(e){}}());

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

  var html='<div class="weekly-page'+(WKS.viewMode==='cards'?' cards-mode':'')+'">';

  // ── Toolbar ──
  html+='<div class="wk-toolbar">';
  html+='<span class="wk-toolbar-title">📅 الأسبوعي</span>';
  if(WKS.search){
    html+='<span style="background:rgba(99,102,241,.2);border:1px solid #6366f1;color:#a5b4fc;padding:2px 8px;border-radius:6px;font-size:10px;display:flex;align-items:center;gap:5px;">🔍 '+esc(WKS.search)+'<button onclick="WKS.search=\'\';if(typeof _devBarState!==\'undefined\'&&_devBarState.search){var i=document.getElementById(\'devBarSearchInp\');if(i)i.value=\'\';}renderWeekly();" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:11px;padding:0 2px;">✕</button></span>';
  }
  html+='</div>';

  // ── Settings bar — hidden in cards mode ──
  html+='<div class="weekly-body">';

  var autoW=_calcCurrentWeek();

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

  // ── Statistics bar — hidden in cards/numpad mode ──
  if(WKS.viewMode!=='cards' && WKS.viewMode!=='numpad'){
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
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:7px;padding:6px 8px;background:'+(week===autoW?'#0d2a10':'#0a1628')+';border-radius:8px;border:1px solid '+(week===autoW?'#10b981':'#1e3a5f')+';">';
    html+='<span style="font-size:9px;color:'+(week===autoW?'#34d399':'#64748b')+';font-weight:700;">📊 إحصائيات الأسبوع '+week+(week===autoW?' ⭐':'')+':</span>';
    html+='<span style="font-size:9px;background:#1e3a5f;padding:1px 8px;border-radius:10px;color:#93c5fd;">👥 الطلاب: <strong>'+(_srch?displayStudents.length+'/'+students.length:students.length)+'</strong></span>';
    html+='<span style="font-size:9px;background:rgba(239,68,68,.15);padding:1px 8px;border-radius:10px;color:#fca5a5;">✗ غائبون (فترات): <strong>'+absentCount+'</strong></span>';
    html+='<span style="font-size:9px;background:rgba(16,185,129,.12);padding:1px 8px;border-radius:10px;color:#6ee7b7;">📝 تقييم مُرصد: <strong>'+assessRecorded+'/'+students.length+'</strong></span>';
    html+='<span style="font-size:9px;background:rgba(99,102,241,.12);padding:1px 8px;border-radius:10px;color:#a5b4fc;">📚 واجب مُرصد: <strong>'+hwRecorded+'/'+students.length+'</strong></span>';
    html+='<span style="font-size:9px;background:rgba(251,191,36,.12);padding:1px 8px;border-radius:10px;color:#fcd34d;">⚡ الإكمال: <strong>'+pct+'%</strong></span>';
    html+='</div>';
  }

  // ── View mode branch ──
  if(WKS.viewMode==='numpad'){
    html+=renderWeeklyNumpad(cls,students,displayStudents,week,absCols,aF,hF,assessMax,hwMax);
    html+='</div></div>';
    root.innerHTML=html;
    _initNumpadEvents();
    return;
  }

  if(WKS.viewMode==='cards'){
    html+=renderWeeklyCards(displayStudents,cls,week,absCols,assessMax,hwMax,students);
  } else if(WKS.viewMode==='grid'){
    html+=renderWeeklyGrid(displayStudents,cls,week,absCols,assessMax,hwMax);
  } else {

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
        if(isHA||isHM){
          html+='<td style="cursor:pointer;text-align:center;" onclick="gradesSetField('+stuIdx+',\''+hF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isHA?"is-abs":"is-exc")+'">'+(isHA?"غ":"م")+'</span></td>';
        }else{
          html+='<td style="padding:2px;"><input type="number" min="0" max="'+hwMax+'" class="wk-g-inp" value="'+esc(hVal)+'" onchange="gradesSetField('+stuIdx+',\''+hF+'\',clamp(Number(this.value),0,'+hwMax+'));renderWeekly();"></td>';
        }
      } else if(cd.type==='assess'){
        if(isAA||isAM){
          html+='<td style="cursor:pointer;text-align:center;" onclick="gradesSetField('+stuIdx+',\''+aF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isAA?"is-abs":"is-exc")+'">'+(isAA?"غ":"م")+'</span></td>';
        }else{
          html+='<td style="padding:2px;"><input type="number" min="0" max="'+assessMax+'" class="wk-g-inp" value="'+esc(aVal)+'" onchange="gradesSetField('+stuIdx+',\''+aF+'\',clamp(Number(this.value),0,'+assessMax+'));renderWeekly();"></td>';
        }
      } else if(cd.type==='imlaa'){
        if(isIMA||isIMM){
          html+='<td style="cursor:pointer;text-align:center;background:rgba(249,115,22,.08);" onclick="gradesSetField('+stuIdx+',\''+imF+'\',\'\');renderWeekly();" title="اضغط لإلغاء">';
          html+='<span class="wk-abs-val '+(isIMA?"is-abs":"is-exc")+'">'+(isIMA?"غ":"م")+'</span></td>';
        }else{
          html+='<td style="padding:2px;background:rgba(249,115,22,.06);"><input type="number" min="0" max="'+imlaaMax+'" class="wk-g-inp" style="border-color:#78350f;color:#fdba74;" value="'+esc(imVal)+'" onchange="gradesSetField('+stuIdx+',\''+imF+'\',clamp(Number(this.value),0,'+imlaaMax+'));renderWeekly();"></td>';
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
        var photoSrc=s.photo||"";
        if(photoSrc){
          html+='<td style="padding:2px;text-align:center;"><img src="'+photoSrc+'" style="width:28px;height:28px;border-radius:4px;object-fit:cover;display:block;margin:0 auto;" onerror="this.style.display=\'none\'"></td>';
        }else{
          var _defPw=DB.meta.defaultStudentPhoto||'';
          html+=(_defPw?'<td style="padding:2px;text-align:center;"><img src="'+_defPw+'" style="width:28px;height:28px;border-radius:4px;object-fit:cover;display:block;margin:0 auto;"></td>':'<td style="padding:2px;text-align:center;"><div style="width:28px;height:28px;border-radius:4px;background:#1e3a5f;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:10px;color:#334155;">👤</div></td>');
        }
      } else if(cd.type==='beh'){
        var _bvd=(beh==='' ? '' : beh);
        html+='<td style="padding:2px;"><input type="number" min="0" max="10" class="wk-beh-inp" value="'+_bvd+'" onchange="var _nv=this.value===\'\' ? \'\' : clamp(Number(this.value),0,10);gradesSetField('+stuIdx+',\'bw'+week+'\',_nv);renderWeekly();"></td>';
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
// ── Card View for Weekly Page ───────────────────────
function renderWeeklyCards(displayStudents, cls, week, absCols, assessMax, hwMax, allStudents){
  var aF='a'+week, hF='h'+week;
  var h='';
  // إعدادات العرض
  var layout=WKS.cardLayout||'single'; // 'single' أو 'grid'
  var photoFit=WKS.photoFit||'cover';  // 'cover' أو 'contain'
  // إعدادات الخط
  var CF=WKS.cardFont||{};
  var cfFamily=CF.family&&CF.family!='inherit'?CF.family:null;
  var cfNameSize=CF.nameSize||17;
  var cfNumSize=CF.numSize||20;
  var cfLabelSize=CF.labelSize||9;
  var cfWeight=CF.weight||900;
  var cfFontStyle=cfFamily?'font-family:'+cfFamily+';':'';

  // ── إحصائيات الكروت
  var _statTotal=displayStudents.length;
  var _statAbsent=0,_statNoHw=0,_statNoAssess=0,_statHwSum=0,_statHwCount=0,_statAssessSum=0,_statAssessCount=0,_statBehSum=0;
  displayStudents.forEach(function(s){
    var av=s[aF],hv=s[hF];
    var beh=s['bw'+week]!==''&&s['bw'+week]!==undefined?Math.min(Number(s['bw'+week])||0,10):Math.min((Number(s.beh1)||0)+(Number(s.beh2)||0),10);
    var absData=getStudentAbsences(cls,s.id);
    var isAbs=false;
    absCols.forEach(function(col,ai){if(absData['w'+week+'_ci'+ai]==='abs')isAbs=true;});
    if(isAbs)_statAbsent++;
    if(hv===''||hv===undefined||hv==='غ'||hv==='م')_statNoHw++; else{_statHwSum+=Number(hv);_statHwCount++;}
    if(av===''||av===undefined||av==='غ'||av==='م')_statNoAssess++; else{_statAssessSum+=Number(av);_statAssessCount++;}
    _statBehSum+=beh;
  });
  var _statPresent=_statTotal-_statAbsent;
  var _statAvgHw=_statHwCount?(_statHwSum/_statHwCount).toFixed(1):'—';
  var _statAvgAssess=_statAssessCount?(_statAssessSum/_statAssessCount).toFixed(1):'—';
  var _statAvgBeh=_statTotal?(_statBehSum/_statTotal).toFixed(1):'—';
  var _statAbsPct=_statTotal?Math.round(_statAbsent/_statTotal*100):0;

  // شريط الإحصائيات
  h+='<div style="padding:8px 12px;background:linear-gradient(135deg,#060f1e,#0a1628);border-bottom:1px solid #0f2040;display:flex;gap:0;overflow-x:auto;flex-shrink:0;">';
  function _stat(icon,label,val,color,bg){
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:64px;padding:6px 10px;background:'+bg+';border-radius:10px;margin-left:6px;flex-shrink:0;">'+
      '<span style="font-size:14px;line-height:1;">'+icon+'</span>'+
      '<span style="font-size:13px;font-weight:900;color:'+color+';line-height:1.3;">'+val+'</span>'+
      '<span style="font-size:8px;color:rgba(255,255,255,0.35);margin-top:1px;white-space:nowrap;">'+label+'</span>'+
    '</div>';
  }
  h+=_stat('👥',_statAbsent>0?'حاضر / '+_statTotal:_statTotal+' طالب',_statPresent,_statAbsent>0?'#4ade80':'#94a3b8','rgba(74,222,128,0.08)');
  if(_statAbsent>0) h+=_stat('🔴','غائب ('+_statAbsPct+'%)',_statAbsent,'#f87171','rgba(248,113,113,0.1)');
  h+=_stat('📚','م. تقييم',_statAvgAssess+'/'+(assessMax),'#6ee7b7','rgba(110,231,183,0.08)');
  h+=_stat('📝','م. واجب',_statAvgHw+'/'+hwMax,'#93c5fd','rgba(147,197,253,0.08)');
  h+=_stat('⭐','م. سلوك',_statAvgBeh+'/10','#c4b5fd','rgba(196,181,253,0.08)');
  if(_statNoAssess>0) h+=_stat('⚠️','بدون تقييم',_statNoAssess,'#fbbf24','rgba(251,191,36,0.08)');
  h+='</div>';

  // ── شريط الأدوات: زر الترس فقط
  var noneActive=(WKS.cardAbsCol===undefined||WKS.cardAbsCol===null||WKS.cardAbsCol===-1);
  var _hasAbsActive=!noneActive;
  h+='<div style="padding:5px 10px;background:#050e1c;border-bottom:1px solid #0f2040;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">';
  h+='<span style="font-size:10px;color:#475569;">🃏 عرض الكروت</span>';
  h+='<div style="display:flex;align-items:center;gap:6px;">';
  // زر تبديل فترة الغياب
  var _absActive=(WKS.cardAbsCol!==undefined&&WKS.cardAbsCol!==null&&WKS.cardAbsCol>=0&&absCols[WKS.cardAbsCol]);
  var _absLabel=_absActive?(absCols[WKS.cardAbsCol].label||('ف'+(WKS.cardAbsCol+1))):'بدون';
  var _absColor=_absActive?'#fbbf24':'#475569';
  var _absBorder=_absActive?'#d97706':'#334155';
  h+='<button onclick="cycleAbsCol();" title="تبديل فترة الغياب" style="display:flex;align-items:center;gap:4px;background:#1e293b;border:1.5px solid '+_absBorder+';color:'+_absColor+';border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:700;transition:all .15s;">📋 <span style="font-size:10px;">'+esc(_absLabel)+'</span></button>';
  h+='<button onclick="openCardsSettings();" style="display:flex;align-items:center;gap:5px;background:#1e293b;border:1.5px solid #334155;color:#94a3b8;border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700;transition:all .15s;" onmouseover="this.style.borderColor=\'#3b82f6\';this.style.color=\'#93c5fd\';" onmouseout="this.style.borderColor=\'#334155\';this.style.color=\'#94a3b8\';">⚙</button>';
  h+='</div>';
  h+='</div>';

  // قائمة الكروت — تخطيط عمودي أو شبكي
  var gridStyle=layout==='grid'
    ?'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;padding:6px;'
    :'display:flex;flex-direction:column;gap:0;';
  h+='<div style="flex:1;overflow-y:auto;padding:0;">';
  h+='<div style="'+gridStyle+'">';

  if(!displayStudents.length){
    h+='<div style="text-align:center;padding:40px;color:#475569;font-size:13px;">لا يوجد طلاب</div>';
  }

  displayStudents.forEach(function(s, si){
    var stuIdx=(DB.data[cls]||[]).indexOf(s);
    var aVal=s[aF]!==undefined?s[aF]:'';
    var hVal=s[hF]!==undefined?s[hF]:'';
    var isAA=aVal==='غ', isAM=aVal==='م', isHA=hVal==='غ', isHM=hVal==='م';
    var beh=s['bw'+week]!==''&&s['bw'+week]!==undefined?Math.min(Number(s['bw'+week])||0,10):Math.min((Number(s.beh1)||0)+(Number(s.beh2)||0),10);
    var _defSP=DB.meta.defaultStudentPhoto||'';
    var hasPhoto=(s.photo&&s.photo.length>0)||(_defSP.length>0);
    var photoSrc=s.photo||_defSP||'';

    var absData=getStudentAbsences(cls,s.id);
    var isAbsent=(WKS.cardAbsCol>=0)&&(absData['w'+week+'_ci'+WKS.cardAbsCol]==='abs');
    var totalAbsCount=0;
    absCols.forEach(function(col,ai){ if(absData['w'+week+'_ci'+ai]==='abs')totalAbsCount++; });

    // حجم الكرت وطريقة عرضه حسب التخطيط
    var cardIsGrid=(layout==='grid');
    var cardBorder='border-bottom:3px solid '+(isAbsent?'#dc2626':'#0d1f3c')+';';
    var cardDimStyle=cardIsGrid
      ?('position:relative;padding-bottom:140%;border-radius:10px;overflow:hidden;border:2px solid '+(isAbsent?'#dc2626':'#1e3a5f')+';flex-shrink:0;')
      :('position:relative;width:100%;padding-bottom:150%;background:#06101e;overflow:hidden;'+cardBorder+'flex-shrink:0;');

    h+='<div style="'+cardDimStyle+'background:#06101e;">';

    // ── خلفية الكرت (الصورة)
    if(hasPhoto){
      var bgPos=photoFit==='contain'?'center center':'center 15%';
      var bgSize=photoFit==='contain'?'contain':'cover';
      h+='<div style="position:absolute;inset:0;background:url(\''+photoSrc+'\') '+bgPos+'/'+bgSize+' no-repeat;'+(photoFit==='contain'?'background-color:#06101e;':'')+'"></div>';
      h+='<div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.88) 78%, rgba(0,0,0,0.97) 100%);"></div>';
      if(isAbsent) h+='<div style="position:absolute;inset:0;background:rgba(160,10,10,0.25);"></div>';
    } else {
      h+='<div style="position:absolute;inset:0;background:linear-gradient(160deg,'+(isAbsent?'#1a0505, #2d0808':'#06101e, #0d2040')+');"></div>';
      h+='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:'+(cardIsGrid?'50px':'90px')+';opacity:0.08;">👤</div>';
    }

    // ── الجزء العلوي: رقم + غياب فقط
    h+='<div style="position:absolute;top:0;right:0;left:0;padding:'+(cardIsGrid?'8px 8px 0':'14px 14px 0')+';display:flex;flex-direction:column;align-items:center;gap:5px;">';
    h+='<div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;">';
    h+='<div style="flex-shrink:0;background:rgba(29,78,216,0.85);backdrop-filter:blur(6px);border-radius:50%;width:'+(cardIsGrid?'20px':'28px')+';height:'+(cardIsGrid?'20px':'28px')+';display:flex;align-items:center;justify-content:center;font-size:'+(cardIsGrid?'8px':'11px')+';font-weight:900;color:white;">'+(si+1)+'</div>';
    if(totalAbsCount>0){
      h+='<span style="flex-shrink:0;background:rgba(220,38,38,0.8);backdrop-filter:blur(4px);border-radius:8px;padding:2px '+(cardIsGrid?'4px':'8px')+';font-size:'+(cardIsGrid?'8px':'10px')+';font-weight:700;color:white;">غ×'+totalAbsCount+'</span>';
    } else {
      h+='<div style="width:'+(cardIsGrid?'20px':'28px')+';flex-shrink:0;"></div>';
    }
    h+='</div>';
    h+='</div>'; // top

    // ── الجزء السفلي: أزرار الدرجات والغياب
    h+='<div style="position:absolute;bottom:0;right:0;left:0;padding:'+(cardIsGrid?'6px 6px 8px':'10px 12px 12px')+';display:flex;flex-direction:column;align-items:center;gap:'+(cardIsGrid?'4px':'8px')+'">';

    // اسم الطالب — فوق منطقة الدرجات
    h+='<div style="width:100%;text-align:center;padding-bottom:'+(cardIsGrid?'2px':'4px')+';border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:'+(cardIsGrid?'2px':'4px')+'">';
    h+='<div style="font-size:'+(cardIsGrid?(Math.round(cfNameSize*0.65)+'px'):(cfNameSize+'px'))+';font-weight:'+cfWeight+';'+cfFontStyle+'color:#f8fafc;text-shadow:0 2px 10px rgba(0,0,0,1);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
    h+='</div>';

    // صف الدرجات — في وسط الكرت
    h+='<div style="display:flex;align-items:flex-end;justify-content:center;gap:'+(cardIsGrid?'5px':'10px')+'">';


    var bW=cardIsGrid?'38px':'56px', bH=cardIsGrid?'20px':'26px', vFS=cardIsGrid?(Math.round(cfNumSize*0.7)+'px'):(cfNumSize+'px'), lFS=cardIsGrid?(Math.round(cfLabelSize*0.85)+'px'):(cfLabelSize+'px');
    // واجب
    var hwDisp=isHA?'غ':(isHM?'م':(hVal!==''?String(hVal):'—'));
    var hwColor=isHA?'#f87171':(isHM?'#a5b4fc':'#93c5fd');
    var hNumVal=(isHA||isHM||hVal==='')?null:Number(hVal);
    h+='<div style="text-align:center;">';
    h+='<div style="font-size:'+lFS+';color:rgba(255,255,255,0.6);margin-bottom:3px;font-weight:700;letter-spacing:.5px;">واجب</div>';
    if(isHA||isHM){
      h+='<button onclick="gradesSetField('+stuIdx+',\''+hF+'\',\'\');renderWeekly();" style="width:'+bW+';height:'+bH+';background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.15);border-radius:7px;color:rgba(255,255,255,0.35);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;">✕</button>';
      h+='<span style="font-size:'+vFS+';font-weight:900;color:'+hwColor+';display:block;width:'+bW+';background:rgba(0,0,0,0.55);border-radius:10px;padding:5px 0;border:1.5px solid '+hwColor+'55;text-align:center;text-shadow:0 0 10px '+hwColor+'88;">'+hwDisp+'</span>';
      h+='<div style="width:'+bW+';height:'+bH+';margin:2px auto 0;"></div>';
    } else {
      h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\''+hF+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.min(cur+1,'+hwMax+'));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(147,197,253,0.12);border:1.5px solid rgba(147,197,253,0.3);border-radius:7px;color:#93c5fd;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;font-weight:900;touch-action:manipulation;">▲</button>';
      h+='<span onclick="gradesSetField('+stuIdx+',\''+hF+'\',\'\');renderWeekly();" style="font-size:'+vFS+';font-weight:900;color:'+hwColor+';display:block;width:'+bW+';background:rgba(0,0,0,0.55);border-radius:10px;padding:5px 0;border:1.5px solid '+hwColor+'55;text-align:center;cursor:pointer;text-shadow:0 0 10px '+hwColor+'88;" title="اضغط لمسح">'+hwDisp+'</span>';
      h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\''+hF+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.max(cur-1,0));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(147,197,253,0.12);border:1.5px solid rgba(147,197,253,0.3);border-radius:7px;color:#93c5fd;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:2px auto 0;font-weight:900;touch-action:manipulation;">▼</button>';
    }
    h+='<div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">/'+hwMax+'</div>';
    h+='</div>';
    // تقييم
    var assessDisp=isAA?'غ':(isAM?'م':(aVal!==''?String(aVal):'—'));
    var assessColor=isAA?'#f87171':(isAM?'#a5b4fc':'#6ee7b7');
    var aNumVal=(isAA||isAM||aVal==='')?null:Number(aVal);
    h+='<div style="text-align:center;">';
    h+='<div style="font-size:'+lFS+';color:rgba(255,255,255,0.6);margin-bottom:3px;font-weight:700;letter-spacing:.5px;">تقييم</div>';
    if(isAA||isAM){
      h+='<button onclick="gradesSetField('+stuIdx+',\''+aF+'\',\'\');renderWeekly();" style="width:'+bW+';height:'+bH+';background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.15);border-radius:7px;color:rgba(255,255,255,0.35);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;">✕</button>';
      h+='<span style="font-size:'+vFS+';font-weight:900;color:'+assessColor+';display:block;width:'+bW+';background:rgba(0,0,0,0.55);border-radius:10px;padding:5px 0;border:1.5px solid '+assessColor+'55;text-align:center;text-shadow:0 0 10px '+assessColor+'88;">'+assessDisp+'</span>';
      h+='<div style="width:'+bW+';height:'+bH+';margin:2px auto 0;"></div>';
    } else {
      h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\''+aF+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.min(cur+1,'+assessMax+'));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(110,231,183,0.12);border:1.5px solid rgba(110,231,183,0.3);border-radius:7px;color:#6ee7b7;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;font-weight:900;touch-action:manipulation;">▲</button>';
      h+='<span onclick="gradesSetField('+stuIdx+',\''+aF+'\',\'\');renderWeekly();" style="font-size:'+vFS+';font-weight:900;color:'+assessColor+';display:block;width:'+bW+';background:rgba(0,0,0,0.55);border-radius:10px;padding:5px 0;border:1.5px solid '+assessColor+'55;text-align:center;cursor:pointer;text-shadow:0 0 10px '+assessColor+'88;" title="اضغط لمسح">'+assessDisp+'</span>';
      h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\''+aF+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.max(cur-1,0));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(110,231,183,0.12);border:1.5px solid rgba(110,231,183,0.3);border-radius:7px;color:#6ee7b7;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:2px auto 0;font-weight:900;touch-action:manipulation;">▼</button>';
    }
    h+='<div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">/'+assessMax+'</div>';
    h+='</div>';

    // سلوك
    var behNumVal=beh;
    h+='<div style="text-align:center;">';
    h+='<div style="font-size:'+lFS+';color:rgba(255,255,255,0.6);margin-bottom:3px;font-weight:700;letter-spacing:.5px;">سلوك</div>';
    h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\'bw'+week+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.min(cur+1,10));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(196,181,253,0.12);border:1.5px solid rgba(196,181,253,0.3);border-radius:7px;color:#c4b5fd;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;font-weight:900;touch-action:manipulation;">▲</button>';
    h+='<span style="font-size:'+vFS+';font-weight:900;color:#c4b5fd;display:block;width:'+bW+';background:rgba(0,0,0,0.55);border-radius:10px;padding:5px 0;border:1.5px solid rgba(196,181,253,0.35);text-align:center;text-shadow:0 0 10px rgba(196,181,253,0.5);">'+behNumVal+'</span>';
    h+='<button onpointerdown="holdStart(function(){var c=WKS.activeClass,w=WKS.activeWeek,s=(DB.data[c]||[])['+stuIdx+'],f=\'bw'+week+'\',cur=s&&s[f]!==undefined&&s[f]!==\'\'?Number(s[f]):0;gradesSetField('+stuIdx+',f,Math.max(cur-1,0));renderWeekly();});" onpointerup="holdEnd();" onpointerleave="holdEnd();" style="width:'+bW+';height:'+bH+';background:rgba(196,181,253,0.12);border:1.5px solid rgba(196,181,253,0.3);border-radius:7px;color:#c4b5fd;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:2px auto 0;font-weight:900;touch-action:manipulation;">▼</button>';
    h+='<div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">/10</div>';
    h+='</div>';

    h+='</div>'; // grades row

    // Absence buttons — one per period (p1 & p2)
    if(absCols.length){
      var _absShowCount=Math.min(absCols.length,2);
      h+='<div style="display:flex;gap:6px;width:100%;max-width:320px;">';
      for(var _ai=0;_ai<_absShowCount;_ai++){
        var _absColLabel=absCols[_ai]?absCols[_ai].label:('ف'+(_ai+1));
        var _isAbsBtn=(absData['w'+week+'_ci'+_ai]==='abs');
        var _absBg=_isAbsBtn?'rgba(220,38,38,0.88)':'rgba(22,163,74,0.82)';
        var _absTxt=_isAbsBtn?'✗ غ':'✓ ح';
        h+='<button onclick="toggleAbsence(\''+esc(cls)+'\','+s.id+','+week+','+_ai+');renderWeekly();" style="flex:1;border:none;border-radius:10px;padding:8px 4px;cursor:pointer;font-size:12px;font-weight:900;font-family:inherit;background:'+_absBg+';color:white;transition:background .2s;">'+_absTxt+'<br><span style="font-size:8px;opacity:.75;">'+esc(_absColLabel)+'</span></button>';
      }
      h+='</div>';
    }

    h+='</div>'; // bottom
    h+='</div>'; // card
  });

  h+='</div>'; // flex column
  h+='</div>'; // scroll

  return h;
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
setInterval(function(){
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
// SECTION NEW-B: SETTINGS PAGE
// ══════════════════════════════════════════════════════
function applyPeriodsPerDay(n){
  n=Math.max(1,Math.min(12,n||4));
  var old=DB.meta.periodsPerDay||4;
  DB.meta.periodsPerDay=n;
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  var periods=DB.schedule._shared.periods||[];
  var savedTimes=DB.meta.periodTimes||[];
  if(periods.length===0){
    // لا يوجد جدول بعد — أنشئ
    for(var i=0;i<n;i++){
      var id="p"+(Date.now()%100000+i);
      periods.push({id:id,label:"فترة "+(i+1),time:savedTimes[i]||""});
    }
    DB.schedule._shared.periods=periods;
    saveDB();
  } else if(n>periods.length){
    for(var j=periods.length;j<n;j++){
      var id2="p"+(Date.now()%100000+j);
      periods.push({id:id2,label:"فترة "+(j+1),time:savedTimes[j]||""});
    }
    saveDB();
    showSnack("✅ تمت إضافة "+(n-old)+" فترة للجدول");
  } else if(n<periods.length){
    var diff=periods.length-n;
    if(confirm("تحذير: سيتم حذف آخر "+diff+" فترة من الجدول. هل تريد المتابعة؟")){
      var removed=periods.splice(n);
      removed.forEach(function(p){
        Object.keys(DB.schedule._shared.slots||{}).forEach(function(k){
          if(k.startsWith(p.id+"_"))delete DB.schedule._shared.slots[k];
        });
      });
      saveDB();
      showSnack("✅ تم تعديل الجدول إلى "+n+" فترات");
    } else {
      DB.meta.periodsPerDay=old;
      saveDB();
      renderSettings();
      return;
    }
  } else { saveDB(); }
  renderSettings();
}

function renderSettings(){
  var root=document.getElementById("settingsRoot");
  if(!root)return;
  var tmax=totalMax();
  var rmax=GS.distRange.max!==null?GS.distRange.max:tmax;

  var html='<div class="settings-page">';

  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#1a3a6e;">👤 معلومات المعلم والمدرسة</div>';
  html+='<div class="settings-section-body">';

  // School name
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">اسم المدرسة:</span>';
  html+='<div class="settings-val"><input class="s-inp" style="width:240px" value="'+esc(DB.meta.schoolName)+'" onchange="DB.meta.schoolName=this.value;saveDB();var _l=document.getElementById(\'loginSchoolTitle\');if(_l)_l.textContent=this.value;"/>';
  html+='<span class="settings-desc">يظهر في الشاشة الرئيسية وملفات Excel</span></div></div>';

  // Teacher name
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">اسم المعلم / المعلمة:</span>';
  html+='<div class="settings-val"><input class="s-inp" style="width:240px" value="'+esc(DB.meta.teacherName)+'" onchange="DB.meta.teacherName=this.value;saveDB();"/>';
  html+='<span class="settings-desc">الاسم كاملاً — يظهر في التحية والشعار</span></div></div>';

  // Gender
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">النوع:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:10px;">';
  html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:#94a3b8;">';
  html+='<input type="radio" name="teacherGender" value="male" '+(DB.meta.teacherGender!=='female'?'checked':'')+' onchange="DB.meta.teacherGender=\'male\';saveDB();" style="accent-color:#3b82f6;width:14px;height:14px;"/>أستاذ (ذكر)</label>';
  html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:#94a3b8;">';
  html+='<input type="radio" name="teacherGender" value="female" '+(DB.meta.teacherGender==='female'?'checked':'')+' onchange="DB.meta.teacherGender=\'female\';saveDB();" style="accent-color:#ec4899;width:14px;height:14px;"/>أستاذة (أنثى)</label>';
  html+='</div><span class="settings-desc">يؤثر على صياغة التحية في الشاشة الرئيسية</span></div></div>';

  // Teacher photo
  var hasPhoto=!!(DB.meta.teacherPhoto);
  html+='<div class="settings-row" style="align-items:flex-start;">';
  html+='<span class="settings-lbl">صورة المعلم:</span>';
  html+='<div class="settings-val">';
  html+='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
  // Avatar preview
  html+='<div id="teacherAvatarPreview" style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid #3b82f6;flex-shrink:0;background:#1e3a5f;display:flex;align-items:center;justify-content:center;">';
  if(hasPhoto){
    html+='<img src="'+DB.meta.teacherPhoto+'" style="width:100%;height:100%;object-fit:cover;"/>';
  } else {
    var _initials=DB.meta.teacherName?DB.meta.teacherName.charAt(0):'م';
    html+='<span style="font-size:24px;font-weight:900;color:#60a5fa;">'+esc(_initials)+'</span>';
  }
  html+='</div>';
  html+='<div style="display:flex;flex-direction:column;gap:6px;">';
  html+='<label style="background:#1d4ed8;color:white;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;display:inline-block;">📷 اختر صورة<input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event)"/></label>';
  if(hasPhoto){
    html+='<button class="btn btn-danger btn-sm" onclick="DB.meta.teacherPhoto=\'\';saveDB();renderSettings();">✕ حذف الصورة</button>';
  }
  html+='<span class="settings-desc">تظهر في الشاشة الرئيسية بدلاً من حرف الأحرف الأولى</span>';
  html+='</div></div></div></div>';

  // Default student photo
  var hasDefStuPhoto=!!(DB.meta.defaultStudentPhoto);
  html+='<div class="settings-row" style="align-items:flex-start;">';
  html+='<span class="settings-lbl">الصورة الافتراضية للطلاب:</span>';
  html+='<div class="settings-val">';
  html+='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
  html+='<div style="width:64px;height:64px;border-radius:10px;overflow:hidden;border:2px solid #334155;flex-shrink:0;background:#1e3a5f;display:flex;align-items:center;justify-content:center;">';
  if(hasDefStuPhoto){
    html+='<img src="'+DB.meta.defaultStudentPhoto+'" style="width:100%;height:100%;object-fit:cover;"/>';
  } else {
    html+='<span style="font-size:28px;">👤</span>';
  }
  html+='</div>';
  html+='<div style="display:flex;flex-direction:column;gap:6px;">';
  html+='<label style="background:#1d4ed8;color:white;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;display:inline-block;">📷 اختر صورة افتراضية<input type="file" accept="image/*" style="display:none;" onchange="settingsUploadDefaultStudentPhoto(event)"/></label>';
  if(hasDefStuPhoto){
    html+='<button class="btn btn-danger btn-sm" onclick="DB.meta.defaultStudentPhoto=\'\';saveDB();renderSettings();">✕ حذف الصورة الافتراضية</button>';
  }
  html+='<span class="settings-desc">تظهر بدلاً من أيقونة 👤 للطلاب الذين ليس لديهم صور خاصة</span>';
  html+='</div></div></div></div>';

  html+='</div></div>';

  // ── عامة ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr">⚙️ الإعدادات العامة</div>';
  html+='<div class="settings-section-body">';

  // السنة الدراسية
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">السنة الدراسية:</span>';
  html+='<div class="settings-val"><input class="s-inp" style="width:160px" placeholder="مثال: 2025 / 2026" value="'+esc(DB.meta.schoolYear||'2025 / 2026')+'" onchange="DB.meta.schoolYear=this.value.trim();saveDB();renderHome&&renderHome();"/>';
  html+='<span class="settings-desc">تُستخدم في جميع الصفحات وملفات Excel — الصيغة: 2025 / 2026 م</span></div></div>';

  // الفصل الدراسي
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">الفصل الدراسي:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">';
  html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:#94a3b8;">';
  html+='<input type="radio" name="semesterNum" value="1" '+(Number(DB.meta.semester)!==2?'checked':'')+' onchange="DB.meta.semester=1;saveDB();renderHome&&renderHome();" style="accent-color:#3b82f6;width:14px;height:14px;"/>الفصل الدراسي الأول</label>';
  html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:#94a3b8;">';
  html+='<input type="radio" name="semesterNum" value="2" '+(Number(DB.meta.semester)===2?'checked':'')+' onchange="DB.meta.semester=2;saveDB();renderHome&&renderHome();" style="accent-color:#10b981;width:14px;height:14px;"/>الفصل الدراسي الثاني</label>';
  html+='</div><span class="settings-desc">يظهر في الشاشة الرئيسية وملفات Excel وجميع الكشوفات</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">اسم المادة:</span>';
  html+='<div class="settings-val"><input class="s-inp" style="width:150px" value="'+esc(DB.meta.subject)+'" onchange="DB.meta.subject=this.value;saveDB();"/>';
  html+='<span class="settings-desc">يظهر في العناوين وملفات Excel</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">تاريخ بداية الأسبوع الأول:</span>';
  html+='<div class="settings-val"><input type="date" class="s-inp" value="'+esc(DB.meta.startDate)+'" onchange="DB.meta.startDate=this.value;saveDB();"/>';
  html+='<span class="settings-desc">يُستخدم لحساب تاريخ كل أسبوع في الصفحات</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">عدد الأسابيع الفعّالة:</span>';
  html+='<div class="settings-val"><select class="s-sel" onchange="DB.meta.activeWeeks=Number(this.value);saveDB();">';
  [4,6,8,10,12,14].forEach(function(n){html+='<option value="'+n+'"'+(DB.meta.activeWeeks==n?" selected":"")+'>'+n+' أسابيع</option>';});
  html+='</select>';
  html+='<span class="settings-desc">يؤثر على الحسابات وعرض الأسابيع في جميع الصفحات</span></div></div>';

  // ── صفين جنباً لجنب: فترات المادة + فترات اليوم ──
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';

  // فترات المادة أسبوعياً
  html+='<div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:4px;">';
  html+='<span class="settings-lbl" style="display:flex;align-items:center;gap:4px;">📚 فترات المادة أسبوعياً</span>';
  html+='<div class="settings-val" style="flex-direction:column;gap:3px;">';
  html+='<select class="s-sel" onchange="DB.meta.periodsPerWeek=Number(this.value);saveDB();renderSettings();">';
  [1,2,3,4,5,6,7,8].forEach(function(n){html+='<option value="'+n+'"'+(DB.meta.periodsPerWeek==n?" selected":"")+'>'+n+'</option>';});
  html+='</select>';
  html+='<span class="settings-desc" style="font-size:8.5px;">يؤثر في الغياب والأسبوعي</span>';
  html+='</div></div>';

  // فترات اليوم الدراسي
  html+='<div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:4px;">';
  html+='<span class="settings-lbl" style="display:flex;align-items:center;gap:4px;">🏫 فترات اليوم الدراسي</span>';
  html+='<div class="settings-val" style="flex-direction:column;gap:3px;">';
  html+='<select class="s-sel" onchange="applyPeriodsPerDay(Number(this.value))">';
  [3,4,5,6,7,8,9,10].forEach(function(n){html+='<option value="'+n+'"'+(( DB.meta.periodsPerDay||4)==n?" selected":"")+'>'+n+'</option>';});
  html+='</select>';
  html+='<span class="settings-desc" style="font-size:8.5px;">يؤثر في الجدول</span>';
  html+='</div></div>';

  html+='</div>'; // end grid
  html+='</div></div>';

  // ── مواعيد الفترات ──
  var ptimes=DB.meta.periodTimes||[];
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#0f3460;display:flex;align-items:center;justify-content:space-between;">';
  html+='<span>🕐 مواعيد الفترات <span style="font-size:8.5px;color:#94a3b8;font-weight:400;">تظهر كقائمة منسدلة في جدول الفترات</span></span>';
  html+='<button onclick="switchPage(\'sched\')" style="background:#1d4ed8;border:none;color:white;padding:3px 12px;border-radius:6px;cursor:pointer;font-size:9.5px;font-weight:700;font-family:inherit;">🗓 الجدول</button>';
  html+='</div>';
  html+='<div class="settings-section-body">';

  // Add new time row
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">إضافة وقت جديد:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  html+='<div style="position:relative;display:inline-block;">';
  html+='<input id="sNewPeriodTime" class="s-inp" style="width:130px;" placeholder="مثال: 8:00-8:45"'
    +' onfocus="document.getElementById(\'sNewTimeDd\').style.display=\'block\'"'
    +' onblur="setTimeout(function(){document.getElementById(\'sNewTimeDd\').style.display=\'none\'},200)"'
    +' onkeydown="if(event.key===\'Enter\')settingsAddPeriodTime()"/>';
  html+='<div id="sNewTimeDd" class="sched-time-dd" style="display:none;min-width:160px;">';
  html+='<div class="sched-time-dd-hdr">أوقات شائعة</div>';
  _PERIOD_PRESETS.forEach(function(t){
    html+='<div class="sched-time-opt" onclick="document.getElementById(\'sNewPeriodTime\').value=\''+t+'\';document.getElementById(\'sNewTimeDd\').style.display=\'none\'">'+esc(t)+'</div>';
  });
  html+='</div></div>';
  html+='<button class="btn btn-success btn-sm" onclick="settingsAddPeriodTime()">+ إضافة</button>';
  html+='</div><span class="settings-desc">أدخل الوقت يدوياً أو اختر من القائمة. الصيغة: بداية-نهاية (8:00-8:45)</span></div></div>';

  // List of saved times
  if(!ptimes.length){
    html+='<div style="padding:12px;color:#475569;font-size:10px;text-align:center;">لا توجد مواعيد محفوظة بعد. أضف مواعيد الفترات لتظهر في قائمة الجدول.</div>';
  } else {
    html+='<div class="settings-row" style="flex-direction:column;align-items:stretch;gap:0;">';
    html+='<span class="settings-lbl" style="margin-bottom:6px;">المواعيد المحفوظة ('+ptimes.length+'):</span>';
    html+='<div style="display:flex;flex-direction:column;gap:4px;">';
    ptimes.forEach(function(t,i){
      html+='<div style="display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:5px 10px;">';
      html+='<span style="font-size:13px;">🕐</span>';
      html+='<span style="flex:1;font-size:11px;color:#60a5fa;font-weight:700;font-variant-numeric:tabular-nums;">'+esc(t)+'</span>';
      if(i>0){
        html+='<button style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;padding:0 4px;" onclick="settingsMoveUpPeriodTime('+i+')" title="نقل للأعلى">▲</button>';
      }
      html+='<button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0 4px;" onclick="settingsDelPeriodTime('+i+')" title="حذف">✕</button>';
      html+='</div>';
    });
    html+='</div></div>';
  }

  // Quick-fill from presets
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">ملء سريع:</span>';
  html+='<div class="settings-val" style="flex-direction:row;flex-wrap:wrap;gap:6px;align-items:center;"><button class="btn btn-primary btn-sm" onclick="settingsQuickFillTimes()">⚡ إضافة الأوقات الشائعة</button>';
  html+='<button class="btn btn-teal btn-sm" onclick="schedAutoFillTimesFromSettings()">🗓 تطبيق على الجدول تلقائياً</button>';
  html+='<span class="settings-desc">تطبيق المواعيد المحفوظة على فترات الجدول مباشرة</span></div></div>';

  html+='</div></div>';

  // ── توزيع الدرجات ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr">📊 إعدادات الدرجات</div>';
  html+='<div class="settings-section-body">';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">مجموع الدرجات:</span>';
  html+='<div class="settings-val"><span style="font-size:14px;font-weight:900;color:#60a5fa;">/'+tmax+'</span>';
  html+='<span class="settings-desc">ثابت: متوسط تقييم(20) + متوسط واجب(10) + سلوك(10) + اختبارات(30)</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">نطاق التوزيع العشوائي:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  html+='<input type="number" class="s-inp" id="sRangeMin" style="width:60px;" min="0" max="'+tmax+'" value="'+GS.distRange.min+'"/>';
  html+='<span style="color:#64748b;font-size:11px;">—</span>';
  html+='<input type="number" class="s-inp" id="sRangeMax" style="width:60px;" min="0" max="'+tmax+'" value="'+rmax+'"/>';
  html+='<button class="btn btn-primary btn-sm" onclick="settingsSaveRange()">حفظ النطاق</button>';
  html+='</div><span class="settings-desc">النطاق الحالي: '+GS.distRange.min+' — '+rmax+' من '+tmax+'</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">حد النجاح:</span>';
  html+='<div class="settings-val"><span style="color:#10b981;font-weight:700;">60 / '+tmax+'</span>';
  html+='<span class="settings-desc">ثابت عند 60%</span></div></div>';
  html+='</div></div>';

  // ── الأعمدة ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr">📋 إعدادات الأعمدة';
  html+='<button class="btn btn-teal btn-sm" onclick="openColConfigModal();switchPage(\'grades\');">⚙️ تخصيص الأعمدة</button></div>';
  html+='<div class="settings-section-body">';
  (DB.colPages||[]).forEach(function(pg){
    var visCols=pg.cols.filter(function(c){return c.visible;});
    var tot=visCols.reduce(function(a,c){return a+c.max;},0);
    html+='<div class="settings-row">';
    html+='<span class="settings-lbl">'+esc(pg.name)+':</span>';
    html+='<div class="settings-val"><span style="color:#94a3b8;font-size:10px;">'+visCols.length+' عمود — مجموع /'+tot+'</span></div></div>';
  });
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">إعادة ضبط الأعمدة:</span>';
  html+='<div class="settings-val"><button class="btn btn-warn btn-sm" onclick="if(confirm(\'إعادة ضبط تسميات الأعمدة؟\')){DB.colPages=defaultColPages();saveDB();renderSettings();showSnack(\'✅ تم إعادة ضبط الأعمدة\');}">↩ إعادة الضبط</button></div></div>';
  html+='</div></div>';

  // ── واجهة ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr">🎨 الواجهة</div>';
  html+='<div class="settings-section-body">';
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">القائمة الجانبية:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:6px;">';
  html+='<button class="btn btn-primary btn-sm" onclick="openSidebar()">فتح</button>';
  html+='<button class="btn btn-ghost btn-sm" onclick="closeSidebar()">إغلاق</button>';
  html+='</div><span class="settings-desc">أو استخدم زر ☰ في شريط الأعلى</span></div></div>';

  // ── إعدادات عرض كروت الأسبوعي
  var _clGrid=(WKS.cardLayout==='grid');
  var _pfCover=(WKS.photoFit!=='contain');
  var _pfContain=(WKS.photoFit==='contain');
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">تخطيط كروت الأسبوعي:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
  html+='<button class="btn btn-sm" onclick="WKS.cardLayout=\'single\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();renderSettings();" style="background:'+(!_clGrid?'#1d4ed8':'#334155')+';color:white;">☰ عمودي</button>';
  html+='<button class="btn btn-sm" onclick="WKS.cardLayout=\'grid\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();renderSettings();" style="background:'+(_clGrid?'#1d4ed8':'#334155')+';color:white;">⊞ شبكي</button>';
  html+='</div><span class="settings-desc">عمودي = كرت واحد ملء الشاشة | شبكي = عدة كروت في الصف</span></div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">وضع الصورة في الكروت:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
  html+='<button class="btn btn-sm" onclick="WKS.photoFit=\'cover\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();" style="background:'+(_pfCover?'#059669':'#334155')+';color:white;">🖼 مرنة</button>';
  html+='<button class="btn btn-sm" onclick="WKS.photoFit=\'contain\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();" style="background:'+(_pfContain?'#1d4ed8':'#334155')+';color:white;">🔲 غير مرنة</button>';
  html+='</div><span class="settings-desc">مرنة = تملأ الكرت بالكامل | غير مرنة = بنسبة عرض ثابتة</span></div></div>';

  html+='</div></div>';

  // ── نغماتي ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#0f3460;display:flex;align-items:center;justify-content:space-between;">🎵 نغماتي — نغمات مخصصة';
  html+='<span style="font-size:9px;font-weight:400;opacity:.75;">ارفع ملفات صوتية واستخدمها في المنبه والإشعارات</span></div>';
  html+='<div class="settings-section-body">';
  html+='<div class="settings-row" style="flex-direction:column;gap:10px;">';
  // Upload button
  html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
  html+='<label style="background:#1d4ed8;color:white;padding:6px 16px;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">🎵 رفع ملف صوتي<input type="file" accept="audio/*" multiple style="display:none;" onchange="customTonesUpload(event)"/></label>';
  html+='<span style="font-size:9px;color:#475569;">MP3 · WAV · OGG · M4A (حجم أقصى 5 ميجا للملف)</span>';
  html+='</div>';
  // List of custom tones
  html+='<div id="customTonesList" style="display:flex;flex-direction:column;gap:6px;">';
  html+=_renderCustomTonesList();
  html+='</div>';
  html+='</div></div></div>';

  // ── إملاء بدون نت ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#0f3d2e;display:flex;align-items:center;justify-content:space-between;">🎤 نموذج الإملاء المحلي (بدون نت)<span style="font-size:9px;font-weight:400;opacity:.75;">~40MB — يُحمَّل مرة واحدة فقط</span></div>';
  html+='<div class="settings-section-body">';
  html+='<div class="settings-row" style="flex-direction:column;gap:12px;">';
  /* حالة النموذج */
  html+='<div id="whisperSettingsStatus" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
  var wStatus = (typeof _npWhisperReady !== "undefined" && _npWhisperReady)
    ? '<span style="background:#14532d;color:#86efac;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">✅ محمّل وجاهز</span>'
    : (typeof _npWhisperLoading !== "undefined" && _npWhisperLoading)
      ? '<span style="background:#1e3a5f;color:#93c5fd;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">⏳ جارٍ التحميل...</span>'
      : '<span style="background:#3b1f1f;color:#fca5a5;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;">⬇ غير محمّل</span>';
  html += wStatus;
  html+='</div>';
  /* شريط التقدم */
  html+='<div id="whisperProgressWrap" style="display:none;flex-direction:column;gap:6px;">';
  html+='<div style="display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;">';
  html+='<span id="whisperProgressLabel">جارٍ التحميل...</span>';
  html+='<span id="whisperProgressPct">0%</span>';
  html+='</div>';
  html+='<div style="background:#1e293b;border-radius:8px;height:10px;overflow:hidden;">';
  html+='<div id="whisperProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#059669,#34d399);border-radius:8px;transition:width .3s ease;"></div>';
  html+='</div>';
  html+='</div>';
  /* وصف */
  html+='<div style="font-size:9px;color:#64748b;line-height:1.7;">';
  html+='بعد التحميل، يعمل الإملاء الصوتي <b>بالكامل بدون إنترنت</b> باستخدام نموذج Whisper المحلي.<br>';
  html+='النموذج يُخزَّن في المتصفح ولا يُعاد تحميله في كل مرة.';
  html+='</div>';
  /* زر التحميل */
  html+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">';
  html+='<button id="whisperDownloadBtn" class="btn btn-sm" ';
  html+='style="background:#059669;color:white;font-weight:700;padding:7px 18px;border-radius:8px;border:none;cursor:pointer;font-size:10px;" ';
  html+='onclick="settingsDownloadWhisper()">⬇ تحميل النموذج الآن</button>';
  html+='<button class="btn btn-sm" ';
  html+='style="background:#1e293b;color:#94a3b8;padding:7px 14px;border-radius:8px;border:1px solid #334155;cursor:pointer;font-size:10px;" ';
  html+='onclick="settingsCheckWhisperCache()">🔍 فحص الكاش</button>';
  html+='</div>';
  html+='</div></div></div>';

  // ── بيانات ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#5c1a1a;">⚠️ إدارة البيانات</div>';
  html+='<div class="settings-section-body">';
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">تصدير الكل:</span>';
  html+='<div class="settings-val"><button class="btn btn-success btn-sm" onclick="gradesExportExcel()">⬇ تصدير Excel الكامل</button></div></div>';
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl" style="color:#ef4444;">مسح كل البيانات:</span>';
  html+='<div class="settings-val"><button class="btn btn-danger btn-sm" onclick="if(confirm(\'⚠️ سيُحذف كل شيء نهائياً. هل أنت متأكد؟\')){localStorage.removeItem(\'grades_v6\');location.reload();}">🗑 مسح نهائي</button>';
  html+='<span class="settings-desc" style="color:#ef4444;">لا يمكن التراجع!</span></div></div>';
  html+='</div></div>';

  html+='</div>';
  root.innerHTML=html;
}

function settingsSaveRange(){
  var mn=Number((document.getElementById("sRangeMin")||{}).value);
  var mx=Number((document.getElementById("sRangeMax")||{}).value);
  if(isNaN(mn)||isNaN(mx)||mn>mx){showSnack("قيم غير صحيحة");return;}
  GS.distRange={min:mn,max:mx};
  showSnack("✅ تم حفظ النطاق: "+mn+" – "+mx);
  renderSettings();
}

function settingsUploadPhoto(e){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    DB.meta.teacherPhoto=r.result;
    saveDB();
    renderSettings();
    showSnack('✅ تم رفع الصورة');
  };
  r.readAsDataURL(f);
}
function settingsUploadDefaultStudentPhoto(e){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    DB.meta.defaultStudentPhoto=r.result;
    saveDB();
    renderSettings();
    showSnack('✅ تم تعيين الصورة الافتراضية للطلاب');
  };
  r.readAsDataURL(f);
}

// ══════════════════════════════════════════════════════

// ══ TOPBAR DROPDOWN ══════════════════════════════
function tbToggle(id){}
function tbClose(){}

// ══ EDIT BAR ══
function editBarToggle(){
  var bar=document.getElementById('editBar');
  var btn=document.getElementById('tbEditBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  // إغلاق clsBar عند فتح editBar
  clsBarClose();
  pagesBarClose();
  toolsBarClose();
  gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderEditBar();
  }
}
function editBarClose(){
  var bar=document.getElementById('editBar');
  var btn=document.getElementById('tbEditBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}

function renderEditBar(){
  var bar=document.getElementById('editBar');
  if(!bar)return;
  var p=_currentPage;
  var isWeekly=(p==='weekly');
  var isSick=(p==='sick');
  var canUndo=(p==='dict');
  var canPaste=(p==='grades'||p==='dict'||p==='weekly');
  var h='';
  // تراجع / إعادة
  h+='<span class="edit-bar-lbl">تعديل:</span>';
  h+='<button class="edit-bar-btn'+(canUndo?'':' muted')+'" onclick="tbSmartUndo()">↩ تراجع</button>';
  h+='<button class="edit-bar-btn muted" onclick="tbSmartRedo()">↪ إعادة</button>';
  h+='<div class="edit-bar-sep"></div>';
  // بيانات
  h+='<span class="edit-bar-lbl">بيانات:</span>';
  h+='<button class="edit-bar-btn'+(canPaste?'':' muted')+'" onclick="tbSmartPaste()">📋 لصق</button>';
  h+='<button class="edit-bar-btn" onclick="gradesExportExcel();editBarClose();">⬇ Excel الدرجات</button>';
  h+='<button class="edit-bar-btn" style="background:#064e3b;color:#6ee7b7;" onclick="gradesExportCustom();editBarClose();">📄 كشف مخصص</button>';
  if(isWeekly){
    h+='<button class="edit-bar-btn" onclick="weeklyExport();editBarClose();">⬇ Excel الأسبوعي</button>';
    h+='<button class="edit-bar-btn" onclick="weeklyConfirmClearWeek();editBarClose();">🗑 مسح الأسبوع</button>';
    h+='<button class="edit-bar-btn" onclick="weeklyAddStudent();editBarClose();">➕ إضافة طالب</button>';
    h+='<button class="edit-bar-btn" onclick="weeklyMarkAllAbsent();editBarClose();">🚫 تغيب الكل</button>';
  }
  if(isSick){
    h+='<button class="edit-bar-btn" onclick="sickExport();editBarClose();">⬇ Excel المرضى</button>';
  }
  if(p==='dict'){
    h+='<button class="edit-bar-btn" onclick="dExport();editBarClose();">⬇ Excel الإملاء</button>';
    h+='<button class="edit-bar-btn danger" onclick="if(confirm(\'مسح السجل؟\')){DS.log=[];renderDict();editBarClose();}">🗑 مسح السجل</button>';
  }
  h+='<div class="edit-bar-sep"></div>';
  // مظهر
  h+='<span class="edit-bar-lbl">مظهر:</span>';
  h+='<button class="edit-bar-btn" onclick="openFontSettings();editBarClose();">⚙ الخط</button>';
  h+='<button class="edit-bar-btn" onclick="openCardFontSettings();editBarClose();">🃏 خط الكروت</button>';
  h+='<button class="edit-bar-btn" onclick="openTfrFontSettings();editBarClose();">📋 خط التفريغ</button>';
  h+='<div class="edit-bar-sep"></div>';
  h+='<button class="edit-bar-btn danger" onclick="if(confirm(\'مسح كل البيانات نهائياً؟\')){localStorage.removeItem(\'grades_v6\');location.reload();}">🗑 مسح الكل</button>';
  bar.innerHTML=h;
}

// ══ CLS BAR ══
function clsBarToggle(){
  var bar=document.getElementById('clsBar');
  var btn=document.getElementById('tbClsBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  // إغلاق editBar عند فتح clsBar
  editBarClose();
  pagesBarClose();
  toolsBarClose();
  gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderClsBar();
  }
}
function clsBarClose(){
  var bar=document.getElementById('clsBar');
  var btn=document.getElementById('tbClsBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
// ── شريط فصول الإملاء ──
function dictClsBarToggle(){
  var bar=document.getElementById('dictClsBar');
  var btn=document.getElementById('tbDictClsBarBtn');
  if(!bar)return;
  var isOpen=bar.classList.contains('open');
  if(isOpen){
    bar.classList.remove('open');
    if(btn){btn.style.background='rgba(251,191,36,.12)';btn.style.borderColor='#78350f';btn.style.color='#fbbf24';}
  } else {
    renderDictClsBar();
    bar.classList.add('open');
    if(btn){btn.style.background='rgba(251,191,36,.25)';btn.style.borderColor='#fbbf24';btn.style.color='#fde68a';}
  }
}
function renderDictClsBar(){
  var bar=document.getElementById('dictClsBar');
  if(!bar)return;
  var h='';
  // زر "كل الفصول"
  var allActive=(DS.scope==='all');
  h+='<button class="dict-cls-tab'+(allActive?' active':'')+'" onclick="DS.scope=\'all\';renderDict();renderDictClsBar();">🏫 الكل</button>';
  DB.classes.forEach(function(cls){
    var isActive=(DS.scope!=='all'&&DS.activeClass===cls);
    h+='<button class="dict-cls-tab'+(isActive?' active':'')+'" onclick="DS.scope=\'class\';DS.activeClass=\''+cls.replace(/'/g,"\\'")+'\';;DS.nameOnlyMarked={};renderDict();renderDictClsBar();">'+cls+'</button>';
  });
  bar.innerHTML=h;
}

function renderClsBar(){
  var bar=document.getElementById('clsBar');
  if(!bar||!DB||!DB.classes)return;
  var current=(GS&&GS.activeClass)||(WKS&&WKS.activeClass)||(DB.classes[0]||'');
  var isGrades=typeof _currentPage!=='undefined'&&_currentPage==='grades';
  var h='<span class="cls-bar-lbl">الفصول:</span>';
  DB.classes.forEach(function(cls){
    var isActive=cls===current;
    h+='<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">';
    h+='<button class="cls-bar-tab'+(isActive?' active':'')+'" onclick="switchToClass(\''+esc(cls)+'\');renderClsBar();">'+esc(cls)+'</button>';
    if(isActive&&isGrades){
      h+='<div style="display:flex;gap:2px;">';
      h+='<button style="background:rgba(255,255,255,.12);border:none;color:#fde68a;border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;" onclick="openRenameClsModal(\''+esc(cls)+'\');clsBarClose();">✏️</button>';
      h+='<button style="background:rgba(239,68,68,.25);border:none;color:#fca5a5;border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;" onclick="openDelClsModal(\''+esc(cls)+'\');clsBarClose();">🗑</button>';
      h+='</div>';
    }
    h+='</div>';
  });
  h+='<button class="cls-bar-tab add-cls" onclick="openAddClsModal();clsBarClose();">＋ فصل</button>';
  bar.innerHTML=h;
}

function tbUpdateEditMenu(){
  // تحديث editBar إذا كان مفتوحاً
  var bar=document.getElementById('editBar');
  if(bar&&bar.classList.contains('open'))renderEditBar();
}
function buildClsDropdown(){
  // تحديث clsBar إذا كان مفتوحاً
  var bar=document.getElementById('clsBar');
  if(bar&&bar.classList.contains('open'))renderClsBar();
}

// ══ PAGES BAR (الجداول) ══
function pagesBarToggle(){
  var bar=document.getElementById('pagesBar');
  var btn=document.getElementById('tbPagesBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  clsBarClose();editBarClose();toolsBarClose();gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderPagesBar();
  }
}
function pagesBarClose(){
  var bar=document.getElementById('pagesBar');
  var btn=document.getElementById('tbPagesBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function renderPagesBar(){
  var bar=document.getElementById('pagesBar');
  if(!bar||!DB||!DB.colPages)return;
  var active=GS&&GS.activePage;
  var h='<span class="pages-bar-lbl">الجداول:</span>';
  h+='<button class="pages-bar-tab'+(active==='pg_home'?' active':'')+'" onclick="GS.activePage=\'pg_home\';renderGrades();renderPagesBar();">🏠 الرئيسية</button>';
  (DB.colPages||[]).forEach(function(pg){
    var isBeh=pg.id==='pg_beh';
    var label=isBeh?'🌟 السلوك والمواظبة':pg.name;
    h+='<button class="pages-bar-tab'+(pg.id===active?' active':'')+'" onclick="GS.activePage=\''+esc(pg.id)+'\';renderGrades();renderPagesBar();">'+esc(label)+'</button>';
  });
  bar.innerHTML=h;
}

// ══ TOOLS BAR (أدوات) ══
function toolsBarToggle(){
  var bar=document.getElementById('toolsBar');
  var btn=document.getElementById('tbToolsBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  clsBarClose();editBarClose();pagesBarClose();gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderToolsBar();
  }
}
function toolsBarClose(){
  var bar=document.getElementById('toolsBar');
  var btn=document.getElementById('tbToolsBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function renderToolsBar(){
  var bar=document.getElementById('toolsBar');
  if(!bar)return;
  var h='<span class="tools-bar-lbl">أدوات:</span>';
  h+='<button class="tools-bar-tab" onclick="openPasteModal();toolsBarClose();">📋 لصق</button>';
  h+='<button class="tools-bar-tab" onclick="openRangeModal();toolsBarClose();">🎲 نطاق</button>';
  h+='<button class="tools-bar-tab" onclick="openSmartDistModal();toolsBarClose();">🔀 توزيع ذكي</button>';
  h+='<button class="tools-bar-tab" onclick="openColConfigModal();toolsBarClose();">⚙️ أعمدة</button>';
  h+='<div style="width:1px;height:20px;background:#065f46;flex-shrink:0;margin:0 2px;"></div>';
  h+='<button class="tools-bar-tab" style="background:#064e3b;border-color:#059669;color:#6ee7b7;" onclick="gradesExportCustom();toolsBarClose();">📄 كشف مخصص</button>';
  bar.innerHTML=h;
}

// ══ GRADE WEEKS BAR ══
function gradeWeeksBarToggle(){
  var bar=document.getElementById('gradeWeeksBar');
  var btn=document.getElementById('tbGWeeksBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  clsBarClose();editBarClose();pagesBarClose();toolsBarClose();gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderGradeWeeksBar();
  }
}
function gradeWeeksBarClose(){
  var bar=document.getElementById('gradeWeeksBar');
  var btn=document.getElementById('tbGWeeksBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function renderGradeWeeksBar(){
  var bar=document.getElementById('gradeWeeksBar');
  if(!bar||!DB)return;
  var aw=Math.min(Math.max(1,Number(DB.meta&&DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var weeks=ALL_WEEKS.slice(0,aw);
  var assessPg=(DB.colPages||[]).find(function(p){return p.id==='pg_assess';});
  var h='<span class="gw-bar-lbl">الأسابيع:</span>';
  weeks.forEach(function(w){
    var col=assessPg&&(assessPg.cols||[]).find(function(c){return c.id==='a'+w;});
    var vis=col?col.visible:true;
    var cls='gw-circle'+(vis?' active':' hidden');
    h+='<button class="'+cls+'" onclick="gradeWeekToggle('+w+')" title="أسبوع '+w+(vis?'  — اضغط للإخفاء':'  — اضغط للإظهار')+'">'+w+'</button>';
  });
  var allVis=weeks.every(function(w){var c=assessPg&&(assessPg.cols||[]).find(function(cc){return cc.id==='a'+w;});return c?c.visible:true;});
  h+='<button style="background:#2d0020;border:1.5px solid #831843;color:#f9a8d4;border-radius:7px;padding:3px 10px;font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;margin-right:4px;" onclick="gradeWeeksToggleAll('+(allVis?'false':'true')+')">'+(allVis?'إخفاء الكل':'إظهار الكل')+'</button>';
  bar.innerHTML=h;
}
function gradeWeekToggle(w){
  var pgIds=['pg_assess','pg_hw','pg_beh'];
  var colIds={'pg_assess':'a'+w,'pg_hw':'h'+w,'pg_beh':'bw'+w};
  var assessPg=(DB.colPages||[]).find(function(p){return p.id==='pg_assess';});
  var col=assessPg&&(assessPg.cols||[]).find(function(c){return c.id==='a'+w;});
  var newVis=col?!col.visible:false;
  pgIds.forEach(function(pgId){colToggleVisNoRender(pgId,colIds[pgId],newVis);});
  saveDB();renderGrades();
  renderGradeWeeksBar();
}
function gradeWeeksToggleAll(vis){
  var aw=Math.min(Math.max(1,Number(DB.meta&&DB.meta.activeWeeks)||14),ALL_WEEKS.length);
  var weeks=ALL_WEEKS.slice(0,aw);
  var pgIds=['pg_assess','pg_hw','pg_beh'];
  weeks.forEach(function(w){
    pgIds.forEach(function(pgId){
      var colId=pgId==='pg_assess'?'a'+w:pgId==='pg_hw'?'h'+w:'bw'+w;
      colToggleVisNoRender(pgId,colId,vis);
    });
  });
  saveDB();renderGrades();
  renderGradeWeeksBar();
}
function colToggleVisNoRender(pgId,colId,val){
  (DB.colPages||[]).forEach(function(pg){if(pg.id===pgId)pg.cols.forEach(function(c){if(c.id===colId)c.visible=val;});});
}

// ══ HOME COLS BAR (إظهار/إخفاء أعمدة الرئيسية) ══
function homeColsBarToggle(){
  var bar=document.getElementById('homeColsBar');
  var btn=document.getElementById('tbHomeColsBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  clsBarClose();editBarClose();pagesBarClose();toolsBarClose();gradeWeeksBarClose();homeColsBarClose();
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderHomeColsBar();
  }
}
function homeColsBarClose(){
  var bar=document.getElementById('homeColsBar');
  var btn=document.getElementById('tbHomeColsBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function _getHomeColVis(){
  if(!GS.homeColVis)GS.homeColVis={assess:true,hw:true,beh:true,avgAssess:true,avgHw:true,avgBeh:true,total:true,dist:true};
  return GS.homeColVis;
}
function homeColToggle(key){
  var v=_getHomeColVis();
  v[key]=!v[key];
  renderGrades();
  renderHomeColsBar();
}
function renderHomeColsBar(){
  var bar=document.getElementById('homeColsBar');
  if(!bar)return;
  var v=_getHomeColVis();
  function btn(key,label,emoji){
    var on=v[key]!==false;
    return '<button class="hc-bar-btn '+(on?'on':'off')+'" onclick="homeColToggle(\''+key+'\')" title="'+(on?'اضغط للإخفاء':'اضغط للإظهار')+'">'+emoji+' '+label+'</button>';
  }
  var h='<span class="hc-bar-lbl">الأعمدة:</span>';
  h+=btn('assess','التقييم','📝');
  h+=btn('hw','الواجب','📚');
  h+=btn('beh','السلوك','🌟');
  h+='<div style="width:1px;height:22px;background:#065f46;margin:0 4px;flex-shrink:0;"></div>';
  h+=btn('avgAssess','متوسط تقييم','📊');
  h+=btn('avgHw','متوسط واجب','📊');
  h+=btn('avgBeh','متوسط سلوك','📊');
  h+='<div style="width:1px;height:22px;background:#065f46;margin:0 4px;flex-shrink:0;"></div>';
  h+=btn('total','المجموع','🔢');
  h+=btn('dist','التوزيع','🎲');
  bar.innerHTML=h;
}

// ══ تطوير — شريط الأيقونات ══
var _devBarState={open:false,search:false,imlaa:false,customFont:false};

function devBarToggle(){
  _devBarState.open=!_devBarState.open;
  var bar=document.getElementById('devBar');
  var btn=document.getElementById('tbDevBtn');
  if(bar)bar.classList.toggle('open',_devBarState.open);
  if(btn)btn.classList.toggle('active',_devBarState.open);
  // إغلاق البحث عند إغلاق الشريط
  if(!_devBarState.open){
    _devBarState.search=false;
    _devBarState.imlaa=false;
    _devBarState.customFont=false;
    var sb=document.getElementById('devBarSearchBox');
    if(sb)sb.style.display='none';
    var cfBox=document.getElementById('devBarCustomFontBox');
    if(cfBox)cfBox.style.display='none';
    var inp=document.getElementById('devBarSearchInp');
    if(inp&&inp.value){inp.value='';WKS.search='';renderWeekly();}
    _devBarUpdateBtns();
  }
}

function devBarItem(which){
  if(which==='smartDist'){
    openWeeklySmartDistModal();
  } else if(which==='imlaa'){
    _devBarState.imlaa=!_devBarState.imlaa;
    WKS.imlaaPanel.open=_devBarState.imlaa;
    _devBarUpdateBtns();
    renderWeekly();
  } else if(which==='search'){
    _devBarState.search=!_devBarState.search;
    var sb=document.getElementById('devBarSearchBox');
    if(sb)sb.style.display=_devBarState.search?'flex':'none';
    _devBarUpdateBtns();
    if(_devBarState.search){
      setTimeout(function(){
        var inp=document.getElementById('devBarSearchInp');
        if(inp){inp.focus();if(WKS.search)inp.value=WKS.search;}
      },30);
    } else {
      // إغلاق البحث → مسح الفلتر
      var inp=document.getElementById('devBarSearchInp');
      if(inp)inp.value='';
      WKS.search='';
      renderWeekly();
    }
  } else if(which==='customFont'){
    _devBarState.customFont=!_devBarState.customFont;
    var cfBox=document.getElementById('devBarCustomFontBox');
    if(cfBox)cfBox.style.display=_devBarState.customFont?'flex':'none';
    if(_devBarState.customFont)_devBarRefreshHwLink();
    _devBarUpdateBtns();
  }
}

function _devBarRefreshHwLink(){
  var sel=document.getElementById('devBarHwLinkSel');
  if(!sel)return;
  var cls=WKS.activeClass;
  var week=WKS.activeWeek;
  var absCols=buildAbsCols(cls,week);
  // set date labels
  absCols.forEach(function(col){
    if(col.dayIdx>=0){var d=getWeekDateForDay(week,col.dayIdx);col.dateLabel=d?(d.getDate()+"/"+(d.getMonth()+1)):"";}
    else{col.dateLabel="";}
  });
  var hwAbsIdx=Math.min(WKS.hwAbsLink||0,Math.max(0,absCols.length-1));
  sel.innerHTML='';
  if(!absCols.length){
    var opt=document.createElement('option');opt.value='0';opt.textContent='لا توجد فترات';sel.appendChild(opt);
  } else {
    absCols.forEach(function(col,ai){
      var opt=document.createElement('option');
      opt.value=ai;
      opt.textContent=col.label+(col.dateLabel?' ('+col.dateLabel+')':'');
      if(ai===hwAbsIdx)opt.selected=true;
      sel.appendChild(opt);
    });
  }
}

function _devBarUpdateBtns(){
  var bs=document.getElementById('devBarSmartDist');
  var bi=document.getElementById('devBarImlaa');
  var bsr=document.getElementById('devBarSearch');
  var bcf=document.getElementById('devBarCustomFont');
  if(bi)bi.classList.toggle('active',!!_devBarState.imlaa);
  if(bsr)bsr.classList.toggle('active',!!_devBarState.search);
  if(bcf)bcf.classList.toggle('active',!!_devBarState.customFont);
}

function devBarRunSearch(q){
  WKS.search=q||'';
  var tb=document.querySelector('.weekly-body');
  var sy=tb?tb.scrollTop:0;
  renderWeekly();
  var tb2=document.querySelector('.weekly-body');
  if(tb2)tb2.scrollTop=sy;
  // إعادة التركيز على حقل البحث
  setTimeout(function(){
    var inp=document.getElementById('devBarSearchInp');
    if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length;}
  },20);
}

function devBarClearSearch(){
  var inp=document.getElementById('devBarSearchInp');
  if(inp)inp.value='';
  WKS.search='';
  renderWeekly();
  setTimeout(function(){var i=document.getElementById('devBarSearchInp');if(i)i.focus();},20);
}

// ══ WEEKS BAR ══
function weeksBarToggle(){
  var bar=document.getElementById('weeksBar');
  var btn=document.getElementById('tbWeeksBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderWeeksBar();
  }
}

function renderWeeksBar(){
  var bar=document.getElementById('weeksBar');
  if(!bar)return;
  var activeWks=_getActiveWeeks();
  var autoW=_calcCurrentWeek();
  var cls=WKS.activeClass;
  var students=(DB.data[cls]||[]);
  var h='<span class="weeks-bar-lbl">📅 الأسابيع:</span>';
  activeWks.forEach(function(w){
    var hasD=students.some(function(s){return s["a"+w]!==undefined&&s["a"+w]!=="";});
    var isCurrent=(w===autoW);
    var isActive=(w===WKS.activeWeek);
    var cls2='weeks-bar-tab';
    if(isActive)cls2+=' active';
    else if(hasD)cls2+=' has-data';
    if(isCurrent)cls2+=' is-current-week';
    var title=isCurrent?' title="الأسبوع الحالي"':'';
    h+='<button class="'+cls2+'"'+title+' onclick="WKS.activeWeek='+w+';WKS.selectedCol=\'\';renderWeekly();renderWeeksBar();">';
    h+=w;
    if(isCurrent)h+='<span style="font-size:6px;vertical-align:super;color:#fbbf24;">●</span>';
    h+='</button>';
  });
  bar.innerHTML=h;
}

// ══ VIEW BAR ══
function renderWeeklyGrid(students,cls,week,absCols,assessMax,hwMax){
  var aF="a"+week,hF="h"+week;
  var GH='\u063a',ME='\u0645';
  var html='<div class="wk-grid-wrap">';
  students.forEach(function(s,si){
    var stuIdx=(DB.data[cls]||[]).indexOf(s);
    var aVal=s[aF]!==undefined?s[aF]:"";
    var hVal=s[hF]!==undefined?s[hF]:"";
    var bwVal=s["bw"+week];
    var beh=(bwVal!==undefined&&bwVal!==null&&bwVal!=="")
      ?Math.min(Number(bwVal)||0,10)
      :((s.beh1===''||s.beh1===undefined)&&(s.beh2===''||s.beh2===undefined)?'':Math.min((Number(s.beh1)||0)+(Number(s.beh2)||0),10));
    var absData=getStudentAbsences(cls,s.id);
    var hasAbs=absCols.some(function(col,ai){return absData["w"+week+"_ci"+ai]==="abs";});
    var isAA=aVal===GH,isAM=aVal===ME,isHA=hVal===GH,isHM=hVal===ME;
    var _aW=(isAA||isAM)?0:(aVal!==""?Math.min(Number(aVal)||0,assessMax):0);
    var _hW=(isHA||isHM)?0:(hVal!==""?Math.min(Number(hVal)||0,hwMax):0);
    var _bW=beh!==''?Number(beh)||0:0;
    var tot=_aW+_hW+_bW;
    var totColor=tot>=(assessMax+hwMax+10)*0.5?'#34d399':'#f87171';
    html+='<div class="wk-grid-card'+(hasAbs?' has-abs':'')+'">';
    html+='<div class="wk-grid-num">'+(si+1)+'</div>';
    if(s.photo){
      html+='<img class="wk-grid-photo" src="'+s.photo+'" onerror="this.style.display=\'none\'">';
    }else{
      html+='<div class="wk-grid-photo-ph">\uD83D\uDC64</div>';
    }
    html+='<div class="wk-grid-name" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
    html+='<div class="wk-grid-fields">';
    // تقييم
    if(isAA||isAM){
      html+='<div class="wk-grid-row"><span class="wk-grid-lbl">\u062a\u0642\u064a\u064a\u0645<\/span>';
      html+='<span class="wk-abs-val '+(isAA?"is-abs":"is-exc")+'" style="cursor:pointer;font-size:12px;" onclick="gradesSetField('+stuIdx+',\''+aF+'\',\'\');renderWeekly();">'+(isAA?GH:ME)+'<\/span><\/div>';
    }else{
      html+='<div class="wk-grid-row"><span class="wk-grid-lbl">\u062a\u0642\u064a\u064a\u0645<\/span>';
      html+='<input type="number" min="0" max="'+assessMax+'" class="wk-grid-inp" value="'+esc(aVal)+'" placeholder="/'+assessMax+'" onchange="gradesSetField('+stuIdx+',\''+aF+'\',clamp(Number(this.value),0,'+assessMax+'));renderWeekly();"><\/div>';
    }
    // واجب
    if(isHA||isHM){
      html+='<div class="wk-grid-row"><span class="wk-grid-lbl">\u0648\u0627\u062c\u0628<\/span>';
      html+='<span class="wk-abs-val '+(isHA?"is-abs":"is-exc")+'" style="cursor:pointer;font-size:12px;" onclick="gradesSetField('+stuIdx+',\''+hF+'\',\'\');renderWeekly();">'+(isHA?GH:ME)+'<\/span><\/div>';
    }else{
      html+='<div class="wk-grid-row"><span class="wk-grid-lbl">\u0648\u0627\u062c\u0628<\/span>';
      html+='<input type="number" min="0" max="'+hwMax+'" class="wk-grid-inp" value="'+esc(hVal)+'" placeholder="/'+hwMax+'" onchange="gradesSetField('+stuIdx+',\''+hF+'\',clamp(Number(this.value),0,'+hwMax+'));renderWeekly();"><\/div>';
    }
    // سلوك
    html+='<div class="wk-grid-row"><span class="wk-grid-lbl">\u0633\u0644\u0648\u0643<\/span>';
    html+='<input type="number" min="0" max="10" class="wk-grid-inp" style="border-color:#2d1e5e;color:#e9d5ff;" value="'+(beh!==''?beh:'')+'" placeholder="/10" onchange="gradesSetField('+stuIdx+',\'bw'+week+'\',clamp(Number(this.value),0,10));renderWeekly();"><\/div>';
    html+='<\/div>';
    // فترات الغياب
    if(absCols.length){
      html+='<div class="wk-grid-abs-row">';
      absCols.forEach(function(col,ai){
        var k="w"+week+"_ci"+ai;
        var isAbs=absData[k]==="abs";
        html+='<button class="wk-grid-abs-btn'+(isAbs?" is-abs":" is-here")+'" onclick="toggleAbsence(\''+esc(cls)+'\','+s.id+','+week+','+ai+');renderWeekly();" title="'+esc(col.label)+'">';
        html+=(isAbs?'\u2717 ':'\u2022 ')+esc(col.label);
        html+='<\/button>';
      });
      html+='<\/div>';
    }
    html+='<div class="wk-grid-tot" style="color:'+totColor+';">\u03a3 '+tot+'/'+(assessMax+hwMax+10)+'<\/div>';
    html+='<\/div>';
  });
  html+='<\/div>';
  return html;
}
function viewBarToggle(){
  var bar=document.getElementById('viewBar');
  var btn=document.getElementById('tbViewBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  if(isOpen){
    bar.classList.remove('open');
    btn.classList.remove('active');
  } else {
    bar.classList.add('open');
    btn.classList.add('active');
    renderViewBar();
  }
}

function renderViewBar(){
  var bar=document.getElementById('viewBar');
  if(!bar)return;
  var mode=WKS.viewMode||'table';
  var h='<span class="view-bar-lbl">👁 طريقة العرض:</span>';
  h+='<button class="view-bar-tab'+(mode==='table'?' active':'')+'" onclick="WKS.viewMode=\'table\';renderWeekly();renderViewBar();">🗂 جدول</button>';
  h+='<button class="view-bar-tab'+(mode==='grid'?' active':'')+'" onclick="WKS.viewMode=\'grid\';renderWeekly();renderViewBar();">&#8862; شبكي</button>';
  h+='<button class="view-bar-tab'+(mode==='cards'?' active':'')+'" onclick="WKS.viewMode=\'cards\';renderWeekly();renderViewBar();">🃏 كروت</button>';
  h+='<button class="view-bar-tab'+(mode==='numpad'?' active':'')+'" onclick="WKS.viewMode=\'numpad\';WKS.numpadStudent=null;WKS.numpadInput=\'\';renderWeekly();renderViewBar();">&#9000; لوحة</button>';
  bar.innerHTML=h;
}

// دوال قديمة (للتوافق — لم تعد تُستخدم)
function devToggleImlaaPanel(){devBarItem('imlaa');}
function devToggleSearchPanel(){devBarItem('search');}
function devCloseSearch(){devBarItem('search');}
function devRunSearch(q){devBarRunSearch(q);}
function devSearchJumpTo(){}

function tbUpdateEditMenu(){
  var p=_currentPage;
  var canUndo=(p==='dict');
  var canPaste=(p==='grades'||p==='dict'||p==='weekly');
  var isWeekly=(p==='weekly');
  var u=document.getElementById('ddBtnUndo');
  var r=document.getElementById('ddBtnRedo');
  var ps=document.getElementById('ddBtnPaste');
  var lbl=document.getElementById('ddEditLbl');
  var wExport=document.getElementById('ddBtnWeeklyExport');
  var wClear=document.getElementById('ddBtnWeeklyClear');
  var wAdd=document.getElementById('ddBtnWeeklyAddStu');
  var wAbs=document.getElementById('ddBtnWeeklyFillAbs');
  if(u){
    u.style.opacity=canUndo?'1':'0.4';
    u.title=canUndo?'':'متاح فقط في صفحة الإملاء';
  }
  if(r){
    r.style.opacity='0.4';
    r.title='غير متاح حالياً';
  }
  if(ps){
    ps.style.opacity=canPaste?'1':'0.4';
    ps.title=canPaste?'':'متاح في الدرجات والإملاء فقط';
  }
  if(wExport)wExport.style.display=isWeekly?'flex':'none';
  if(wClear)wClear.style.display=isWeekly?'flex':'none';
  if(wAdd)wAdd.style.display=isWeekly?'flex':'none';
  if(wAbs)wAbs.style.display=isWeekly?'flex':'none';
  if(lbl)lbl.textContent='تعديل — '+(_PAGE_TITLES[p]||p).replace(/^[^\s]+ /,'');
}

function tbSmartUndo(){
  if(_currentPage==='dict'){doUndo();}
  else{showSnack('⚠️ التراجع متاح في صفحة الإملاء فقط');}
  tbClose();
}
function tbSmartRedo(){
  showSnack('⚠️ الإعادة غير متاحة حالياً');
  tbClose();
}
function tbSmartPaste(){
  if(_currentPage==='grades'||_currentPage==='weekly'){openPasteModal();tbClose();}
  else if(_currentPage==='dict'){showSnack('⚠️ اللصق متاح في صفحة الدرجات');tbClose();}
  else{showSnack('⚠️ اللصق متاح في صفحة الدرجات فقط');tbClose();}
}
// ── دوال قائمة تحرير الأسبوعي ──────────────────────────
function weeklyAddStudent(){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  if(!cls){showSnack('⚠️ لا يوجد فصل نشط');return;}
  var name=prompt('اسم الطالب الجديد:');
  if(!name||!name.trim())return;
  DB.data[cls].push(emptyStudent(Date.now(),name.trim()));
  saveDB();renderWeekly();
  showSnack('✅ تم إضافة الطالب: '+name.trim(),'ok');
}
function weeklyConfirmClearWeek(){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  // Show column-selection modal
  var mo=document.createElement('div');
  mo.className='mo';
  mo.id='wklyClearMo';
  mo.innerHTML=
    '<div class="md" style="max-width:340px;">'+
    '<div class="mh"><h2>🗑 مسح درجات الأسبوع '+week+'</h2><button class="xbtn" onclick="document.getElementById(\'wklyClearMo\').remove()">✕</button></div>'+
    '<div class="mb">'+
    '<p style="font-size:11px;color:#475569;margin-bottom:12px;">اختر العمود الذي تريد مسحه للفصل <strong style="color:#0f2a5e;">'+cls+'</strong>:</p>'+
    '<div style="display:flex;flex-direction:column;gap:8px;">'+
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyClearCol" value="assess" style="width:15px;height:15px;accent-color:#1d4ed8;"> <span style="font-size:12px;font-weight:700;color:#0f2a5e;">📝 التقييم فقط</span></label>'+
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyClearCol" value="hw" style="width:15px;height:15px;accent-color:#7c3aed;"> <span style="font-size:12px;font-weight:700;color:#0f2a5e;">📚 الواجب فقط</span></label>'+
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyClearCol" value="both" style="width:15px;height:15px;accent-color:#059669;"> <span style="font-size:12px;font-weight:700;color:#0f2a5e;">🗑 التقييم والواجب معاً</span></label>'+
    '</div>'+
    '</div>'+
    '<div class="mf">'+
    '<button class="btn btn-ghost" onclick="document.getElementById(\'wklyClearMo\').remove()">إلغاء</button>'+
    '<button class="btn btn-danger" onclick="weeklyDoClearWeek()">مسح</button>'+
    '</div>'+
    '</div>';
  document.body.appendChild(mo);
}
function weeklyDoClearWeek(){
  var sel=document.querySelector('input[name="wklyClearCol"]:checked');
  if(!sel){showSnack('⚠️ يجب تحديد العمود أولاً','warn');return;}
  var colChoice=sel.value;
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  if(!confirm('مسح '+(colChoice==='both'?'التقييم والواجب':colChoice==='assess'?'التقييم':'الواجب')+' للأسبوع '+week+' للفصل '+cls+' نهائياً؟'))return;
  var students=DB.data[cls]||[];
  students.forEach(function(s){
    if(colChoice==='assess'||colChoice==='both') s['a'+week]='';
    if(colChoice==='hw'||colChoice==='both')     s['h'+week]='';
  });
  document.getElementById('wklyClearMo').remove();
  saveDB();renderWeekly();
  showSnack('✅ تم مسح '+(colChoice==='both'?'التقييم والواجب':colChoice==='assess'?'التقييم':'الواجب')+' — الأسبوع '+week,'ok');
}
function weeklyMarkAllAbsent(){
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var absCols=buildAbsCols(cls,week);
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  // Build column options: assess, hw, abs periods
  var colOpts='';
  colOpts+='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyAbsCol" value="assess" style="width:15px;height:15px;accent-color:#dc2626;"> '+
    '<span style="font-size:12px;font-weight:700;color:#0f2a5e;">📝 التقييم (غ)</span></label>';
  colOpts+='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyAbsCol" value="hw" style="width:15px;height:15px;accent-color:#dc2626;"> '+
    '<span style="font-size:12px;font-weight:700;color:#0f2a5e;">📚 الواجب (غ)</span></label>';
  colOpts+='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
    '<input type="radio" name="wklyAbsCol" value="both_grade" style="width:15px;height:15px;accent-color:#dc2626;"> '+
    '<span style="font-size:12px;font-weight:700;color:#0f2a5e;">🗑 التقييم والواجب معاً (غ)</span></label>';
  if(absCols.length>0){
    absCols.forEach(function(col,ci){
      colOpts+='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;">'+
        '<input type="radio" name="wklyAbsCol" value="abs_'+ci+'" style="width:15px;height:15px;accent-color:#dc2626;"> '+
        '<span style="font-size:12px;font-weight:700;color:#0f2a5e;">🚫 غياب فترة: '+col.label+(col.dateLabel?' ('+col.dateLabel+')':'')+'</span></label>';
    });
    colOpts+='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border:1.5px solid #fee2e2;border-radius:8px;background:#fff5f5;">'+
      '<input type="radio" name="wklyAbsCol" value="abs_all" style="width:15px;height:15px;accent-color:#dc2626;"> '+
      '<span style="font-size:12px;font-weight:700;color:#b91c1c;">🚫 كل فترات الغياب</span></label>';
  }
  var mo=document.createElement('div');
  mo.className='mo';
  mo.id='wklyAbsMo';
  mo.innerHTML=
    '<div class="md" style="max-width:360px;">'+
    '<div class="mh"><h2>🚫 تغييب الفصل كله — أسبوع '+week+'</h2><button class="xbtn" onclick="document.getElementById(\'wklyAbsMo\').remove()">✕</button></div>'+
    '<div class="mb">'+
    '<p style="font-size:11px;color:#475569;margin-bottom:12px;">اختر العمود لتغييب جميع طلاب <strong style="color:#0f2a5e;">'+cls+'</strong> ('+students.length+' طالب):</p>'+
    '<div style="display:flex;flex-direction:column;gap:7px;">'+colOpts+'</div>'+
    '</div>'+
    '<div class="mf">'+
    '<button class="btn btn-ghost" onclick="document.getElementById(\'wklyAbsMo\').remove()">إلغاء</button>'+
    '<button class="btn btn-danger" onclick="weeklyDoMarkAllAbsent()">تغييب الكل</button>'+
    '</div>'+
    '</div>';
  document.body.appendChild(mo);
}
function weeklyDoMarkAllAbsent(){
  var sel=document.querySelector('input[name="wklyAbsCol"]:checked');
  if(!sel){showSnack('⚠️ يجب تحديد العمود أولاً','warn');return;}
  var colChoice=sel.value;
  var cls=WKS.activeClass||(DB.classes[0]||'');
  var week=WKS.activeWeek||1;
  var absCols=buildAbsCols(cls,week);
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  if(!confirm('تغييب جميع طلاب '+cls+' ('+students.length+' طالب) في الأسبوع '+week+'؟'))return;
  if(colChoice==='assess'||colChoice==='both_grade'){
    students.forEach(function(s){
      var stuIdx=(DB.data[cls]||[]).indexOf(s);
      DB.data[cls][stuIdx]['a'+week]='غ';
    });
  }
  if(colChoice==='hw'||colChoice==='both_grade'){
    students.forEach(function(s){
      var stuIdx=(DB.data[cls]||[]).indexOf(s);
      DB.data[cls][stuIdx]['h'+week]='غ';
    });
  }
  if(colChoice==='abs_all'){
    students.forEach(function(s){
      absCols.forEach(function(col,ci){
        var k='w'+week+'_ci'+ci;
        if(!DB.absences)DB.absences={};
        if(!DB.absences[cls])DB.absences[cls]={};
        if(!DB.absences[cls][s.id])DB.absences[cls][s.id]={};
        DB.absences[cls][s.id][k]='abs';
      });
    });
  } else if(colChoice.indexOf('abs_')===0){
    var ci=Number(colChoice.replace('abs_',''));
    students.forEach(function(s){
      var k='w'+week+'_ci'+ci;
      if(!DB.absences)DB.absences={};
      if(!DB.absences[cls])DB.absences[cls]={};
      if(!DB.absences[cls][s.id])DB.absences[cls][s.id]={};
      DB.absences[cls][s.id][k]='abs';
    });
  }
  document.getElementById('wklyAbsMo').remove();
  saveDB();renderWeekly();
  var label=colChoice==='assess'?'التقييم':colChoice==='hw'?'الواجب':colChoice==='both_grade'?'التقييم والواجب':colChoice==='abs_all'?'كل فترات الغياب':'فترة الغياب المحددة';
  showSnack('✅ تم تغييب الكل في '+label+' — الأسبوع '+week,'ok');
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.tb-menu-wrap'))tbClose();
});
function buildClsDropdown(){
  var dd=document.getElementById("ddCls");
  if(!dd||!DB||!DB.classes)return;
  var current=GS?GS.activeClass:(DB.classes[0]||"");
  var parts=["<div class=\"tb-dd-label\">🏫 الفصول</div>"];
  DB.classes.forEach(function(cls){
    var a=cls===current;
    parts.push("<button class=\"tb-dd-item"+(a?" active-cls":"")+"\""+" onclick=\"switchToClass(this.getAttribute('data-v'));tbClose();\" data-v=\""+esc(cls)+"\">"+(a?"● ":"")+esc(cls)+"</button>");
  });
  dd.innerHTML=parts.join("");
}
function switchToClass(cls){
  if(window.GS)GS.activeClass=cls;
  if(window.WKS)WKS.activeClass=cls;
  if(window.SKS)SKS.activeClass=cls;
  if(window.AS)AS.activeClass=cls;
  if(window.DS)DS.activeClass=cls;
  var map={grades:renderGrades,weekly:renderWeekly,absence:renderAbsence,sick:renderSick,dict:renderDict,sched:renderSched,stats:renderStats};
  if(map[_currentPage])map[_currentPage]();
}
function doUndo(){
  if(_currentPage==='dict'){if(window.DS&&DS.undo&&DS.undo.length){if(dUndo())showSnack('✅ تراجع');renderDict();}else{showSnack('⚠️ لا يوجد شيء للتراجع');}return;}
  showSnack('⚠️ التراجع متاح في صفحة الإملاء فقط');
}
function doRedo(){showSnack('⚠️ الإعادة غير متاحة حالياً');}

// SECTION NEW-C: BOOT
// ══════════════════════════════════════════════════════
function bootAll(){initDB();}


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
  notifyDays:[0,1,2,3,4,5],
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
var _NOTIF_TONES={
  // id: [label, durationLabel, fn(ctx)]
  'chime_short': ['🎵 جرس قصير','0.8 ث',function(ctx){
    [523,659,784].forEach(function(hz,i){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz;
      var t=ctx.currentTime+i*.2;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.05);
      g.gain.exponentialRampToValueAtTime(.001,t+.4);
      o.start(t);o.stop(t+.45);
    });
  }],
  'chime_long': ['🔔 جرس طويل','2.5 ث',function(ctx){
    [[523,.0],[659,.5],[784,1.0],[1046,1.5],[784,2.0]].forEach(function(item){
      var hz=item[0],delay=item[1];
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz;
      var t=ctx.currentTime+delay;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.06);
      g.gain.exponentialRampToValueAtTime(.001,t+.55);
      o.start(t);o.stop(t+.6);
    });
  }],
  'ding': ['✨ دنق نظيف','0.5 ث',function(ctx){
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.value=1318;
    g.gain.setValueAtTime(.2,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.6);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+.65);
  }],
  'alert_double': ['⚡ تنبيه مزدوج','0.7 ث',function(ctx){
    [0,.32].forEach(function(delay){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='square';o.connect(g);g.connect(ctx.destination);o.frequency.value=880;
      var t=ctx.currentTime+delay;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.02);
      g.gain.linearRampToValueAtTime(.0,t+.22);
      o.start(t);o.stop(t+.25);
    });
  }],
  'school_bell': ['🏫 جرس المدرسة','3 ث',function(ctx){
    // Realistic school bell: rapid oscillation
    for(var i=0;i<10;i++){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.connect(g);g.connect(ctx.destination);
      o.frequency.value=880+(i%2)*220;
      var t=ctx.currentTime+i*.28;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.02);
      g.gain.linearRampToValueAtTime(.0,t+.24);
      o.start(t);o.stop(t+.28);
    }
  }],
  'melody': ['🎶 لحن قصير','2 ث',function(ctx){
    [[523,0],[587,.25],[659,.5],[698,.75],[784,1.0],[698,1.3],[784,1.6]].forEach(function(item){
      var hz=item[0],delay=item[1];
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='triangle';o.connect(g);g.connect(ctx.destination);o.frequency.value=hz;
      var t=ctx.currentTime+delay;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.14,t+.04);
      g.gain.exponentialRampToValueAtTime(.001,t+.28);
      o.start(t);o.stop(t+.3);
    });
  }]
};
function _playNotifSound(toneId){
  try{
    // Check if it's a custom tone first
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
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var tone=_NOTIF_TONES[id];
    if(tone) tone[2](ctx);
    else _NOTIF_TONES['chime_short'][2](ctx);
  }catch(e){}
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

  try {
    /* الخطوة 1: تحميل transformers.js */
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
        var t = setTimeout(function(){ reject(new Error('timeout')); }, 20000);
        window.addEventListener('transformers-ready', function() {
          clearTimeout(t); resolve();
        }, { once: true });
      });
    }

    _whisperSettingsUI('loading', 5, 'تحميل نموذج Whisper (~40MB)...');

    /* الخطوة 2: تحميل النموذج مع تتبع التقدم */
    _npWhisperPipe = await window._transformersPipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      {
        progress_callback: function(p) {
          if(p.status === 'progress' && p.total) {
            var pct = Math.round((p.loaded / p.total) * 100);
            _whisperSettingsUI('loading', pct, 'تحميل النموذج: ' + pct + '%');
            /* تحديث WKS.npStatus لو الصفحة الأسبوعي مفتوحة */
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
    if(typeof _npWhisperLoading !== 'undefined') _npWhisperLoading = false;
    _whisperSettingsUI('error');
    var msg = !navigator.onLine ? '📶 انقطع النت أثناء التحميل' : ('❌ فشل: ' + (err.message||''));
    showSnack(msg);
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
    for(var di=0;di<6;di++){
      if(slots[per.id+'_d'+di]) days.push(di);
    }
    // For home page: create one item per unique class in this period's days
    var clsForDays={};
    for(var di2=0;di2<6;di2++){
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
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5};
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
  if(p&&p.classList.contains('open')&&!p.contains(e.target)&&e.target!==b&&!b.contains(e.target)){
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
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5};
  var ourDay=jsToOur[now.getDay()];
  if(ourDay===undefined) return null;
  var nowM=now.getHours()*60+now.getMinutes();
  var DAYS_FULL=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
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
  // Search upcoming: today first, then next 6 days
  for(var ahead=0;ahead<=6;ahead++){
    var checkDay=(ourDay+ahead)%6;
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
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5};
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
      var ahead=(d-ourDay+6)%6;
      if(ahead===0&&startM<=nowM) ahead=6; // same day but passed → next week
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
    var DAYS_NAMES=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
    var jsToOurP={6:0,0:1,1:2,2:3,3:4,4:5};
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
      for(var ahead=0;ahead<=6;ahead++){
        var checkDay=(ourDayP!==undefined)?(ourDayP+ahead)%6:ahead%6;
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
      for(var di=0;di<6;di++){
        var isActive=item.days.indexOf(di)>=0;
        var isToday=(di===ourDayP);
        var isNext=(occ&&!occ.running&&ourDayP!==undefined&&((ourDayP+occ.daysAhead)%6)===di&&occ.daysAhead>0);
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
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5};
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
  if(alm.days.length===6) return 'يومياً';
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
  var jsToOur={6:0,0:1,1:2,2:3,3:4,4:5};
  var ourDay=jsToOur[now.getDay()];
  var nowM=now.getHours()*60+now.getMinutes();
  var best=null, bestMins=999999;
  _alarms.forEach(function(alm){
    if(!alm.enabled) return;
    var almM=alm.hour*60+alm.minute;
    var days=alm.days&&alm.days.length?alm.days:[0,1,2,3,4,5];
    days.forEach(function(d){
      var ahead=(d-ourDay+6)%6;
      if(ahead===0&&almM<=nowM) ahead=6;
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
  ['home','grades','sched'].forEach(function(p){
    var b=document.getElementById('bni_'+p);
    if(b){
      b.classList.remove('hbn-active');
      if(p==='home'){
        b.classList.remove('hbn-center');
        b.style.cssText='';
      }
    }
  });
  var active=document.getElementById('bni_'+page);
  if(active){
    active.classList.add('hbn-active');
    if(page==='home') active.classList.add('hbn-center');
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
    for(var d=0;d<6;d++){
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

function _homeJsToOurDay(d){return({6:0,0:1,1:2,2:3,3:4,4:5})[d];}

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
  var DAYS_AR_H=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
  var res=[];
  all.forEach(function(item){
    if(curItem&&item===curItem.item)return;
    if(!item.per.time)return;
    var sM=_homeParseMins(item.per.time.split('-')[0]);
    if(sM===null)return;
    var bestTotal=999999,bestAhead=-1;
    for(var ahead=0;ahead<=6;ahead++){
      var checkDay=(ourDay+ahead)%6;
      if(item.days.indexOf(checkDay)<0)continue;
      if(ahead===0&&sM<=nowM)continue;
      var total=ahead*1440+(sM-nowM);
      if(total<bestTotal){bestTotal=total;bestAhead=ahead;}
      break;
    }
    if(bestAhead>=0){
      var dayName=bestAhead===0?'اليوم':bestAhead===1?'غداً':DAYS_AR_H[(ourDay+bestAhead)%6];
      res.push({item:item,totalMins:bestTotal,daysAhead:bestAhead,dayName:dayName,startM:_homeParseMins(item.per.time.split('-')[0])});
    }
  });
  res.sort(function(a,b){return a.totalMins-b.totalMins;});
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
  var DAYS_AR_H=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
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

  // Period cards
  var EMOJIS=['📐','📚','🔬','🎨','📖','✏️','🧮','🌍'];
  var cardsEl=el('h-cards-scroll');
  if(cardsEl){
    var cardsHtml='';
    if(!all.length){
      cardsHtml='<div style="color:#334155;padding:16px;font-size:11px;white-space:nowrap;">أضف فترات من الجدول</div>';
    } else {
      var shown=[];
      if(cur)shown.push({type:'cur',data:cur,item:cur.item});
      upcoming.slice(0,5).forEach(function(u){shown.push({type:'up',data:u,item:u.item});});
      shown.forEach(function(s,idx){
        var isCur=s.type==='cur';
        var isNext=!isCur&&idx===(cur?1:0);
        var isAssembly=s.item.isSpecial&&s.item.specialType==='assembly';
        var isBreak=s.item.isSpecial&&s.item.specialType==='break';
        var cardCls='home-period-card'+(isCur?' hpc-active':isNext?' hpc-next':'');
        var extraStyle='';
        if(isAssembly)extraStyle='border-color:#059669!important;background:rgba(16,185,129,.1)!important;';
        if(isBreak)extraStyle='border-color:#d97706!important;background:rgba(251,191,36,.07)!important;';
        var emoji=isAssembly?'🟢':isBreak?'☕':EMOJIS[idx%EMOJIS.length];
        var perIdx=all.indexOf(s.item);var perNum=perIdx>=0?perIdx+1:(parseInt((s.item.per.id||'').replace(/\D/g,''))||0);var whenTxt=perNum?('ف '+perNum):esc(s.item.per.label||'');
        var nameColor=isAssembly?'#34d399':isBreak?'#fbbf24':'';
        cardsHtml+='<div class="'+cardCls+'" style="'+extraStyle+'">'
          +'<div class="hpc-name" style="font-size:13px;font-weight:900;'+(nameColor?'color:'+nameColor+';':'')+'">'+whenTxt+'</div>'
          +'<div class="hpc-class" style="'+(nameColor?'color:'+nameColor+'88;':'')+'">'+esc(s.item.cls)+'</div>'
          +'</div>';
      });
    }
    cardsEl.innerHTML=cardsHtml;
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
  var DAYS_AR_SCHED=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
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

function _buildUpcomingStrip(){
  var all=_homeGetAllPeriods();
  var now=new Date();
  var ourDay=_homeJsToOurDay(now.getDay());
  // Filter to today's periods only
  var todayAll=all.filter(function(item){return item.days.indexOf(ourDay)>=0&&item.per.time;});
  if(!todayAll.length)return '';

  var nowM=now.getHours()*60+now.getMinutes();

  // Sort by start time
  todayAll.sort(function(a,b){
    var sA=_homeParseMins(a.per.time.split('-')[0]);
    var sB=_homeParseMins(b.per.time.split('-')[0]);
    return (sA||0)-(sB||0);
  });

  // Build chips
  var chips='';
  todayAll.forEach(function(item){
    var sM=_homeParseMins(item.per.time.split('-')[0]);
    var eM=item.per.time.indexOf('-')>-1?_homeParseMins(item.per.time.split('-')[1]):null;
    if(sM===null)return;
    var isNow=(eM!==null)?sM<=nowM&&nowM<eM:sM===Math.floor(nowM);
    var isNext=!isNow&&sM>nowM;

    // Only show: currently running OR coming later today
    var chipCls='home-cls-chip'+(isNow?' chip-now':isNext?' chip-next chip-soonest':'');
    var dotCls='chip-dot'+(isNow?' chip-dot-now':isNext?' chip-dot-next':' chip-dot-soon');
    var badgeClass=isNow?'chip-badge-now':isNext?'chip-badge-next':'chip-badge-soon';
    var badgeTxt=isNow?'🟢 جارية':isNext?'⏰ التالية':item.per.time.split('-')[0];

    chips+='<div class="'+chipCls+'" onclick="switchPage(\'sched\')">'
      +'<div class="'+dotCls+'"></div>'
      +'<div class="chip-cls-name">'+esc(item.cls)+'</div>'
      +'<div class="chip-time">'+esc(item.per.time)+'</div>'
      +'<span class="chip-badge '+badgeClass+'">'+badgeTxt+'</span>'
      +'</div>';
  });

  if(!chips)return '';

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
    +'<div class="home-bell" onclick="switchPage(\'notifs\');bnSetActive(\'notifs\')">🔔<span id="homeBellDot" style="position:absolute;top:3px;right:3px;background:#ef4444;color:#fff;border-radius:50%;min-width:8px;height:8px;font-size:0;font-weight:800;display:none;line-height:1;padding:0;border:1.5px solid #0a0f1e;box-shadow:0 0 6px rgba(239,68,68,.7);"></span></div>'
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
    +'<div id="h-cards-scroll" style="display:none;"></div>'
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


(function(){
// ══════════════════════════════════════════════════════
// BACKUP SYSTEM v2 — نسخ احتياطي + مزامنة مجلد
// ══════════════════════════════════════════════════════
var BKP_KEY      = 'grades_v6_backups';
var BKP_FOLDER   = 'grades_v6_folder_handle'; // اسم المفتاح للإشارة فقط
var BKP_MAX      = 20;
var _bkpLastSnap = 0;
var _bkpLastSync = 0;
var _folderHandle= null; // FileSystemDirectoryHandle

// ── تهيئة: استعادة مقبض المجلد من IndexedDB ──────────
var _IDB_NAME = 'bkp_idb', _IDB_STORE = 'handles';
function _idbOpen(cb){
  var req = indexedDB.open(_IDB_NAME, 1);
  req.onupgradeneeded = function(e){ e.target.result.createObjectStore(_IDB_STORE); };
  req.onsuccess = function(e){ cb(null, e.target.result); };
  req.onerror   = function(e){ cb(e); };
}
function _idbGet(key, cb){
  _idbOpen(function(err, db){
    if(err) return cb(null);
    var tx = db.transaction(_IDB_STORE,'readonly');
    var req = tx.objectStore(_IDB_STORE).get(key);
    req.onsuccess = function(){ cb(req.result||null); };
    req.onerror   = function(){ cb(null); };
  });
}
function _idbSet(key, val){
  _idbOpen(function(err, db){
    if(err) return;
    var tx = db.transaction(_IDB_STORE,'readwrite');
    tx.objectStore(_IDB_STORE).put(val, key);
  });
}
function _idbDel(key){
  _idbOpen(function(err, db){
    if(err) return;
    var tx = db.transaction(_IDB_STORE,'readwrite');
    tx.objectStore(_IDB_STORE).delete(key);
  });
}

// ── تحميل مقبض المجلد المحفوظ ─────────────────────────
function _bkpLoadFolderHandle(cb){
  _idbGet('folderHandle', function(handle){
    if(handle && typeof handle.queryPermission === 'function'){
      _folderHandle = handle;
    }
    cb();
  });
}

// ── قائمة النسخ (localStorage) ───────────────────────
function bkpLoad(){
  try{ var s=localStorage.getItem(BKP_KEY); return s?JSON.parse(s):[]; }catch(e){ return []; }
}
function _bkpSaveList(list){
  try{ localStorage.setItem(BKP_KEY, JSON.stringify(list)); }catch(e){}
}

// ── عد الطلاب ────────────────────────────────────────
function _bkpCountStudents(){
  if(!window.DB||!window.DB.data) return 0;
  var t=0;
  (window.DB.classes||[]).forEach(function(c){ t+=(window.DB.data[c]||[]).filter(function(s){return s.name;}).length; });
  return t;
}

// ── إنشاء نسخة ───────────────────────────────────────
function _bkpCreate(label){
  if(!window.DB) return;
  var list = bkpLoad();
  var snap = {
    id: Date.now(), label: label||'يدوي',
    time: new Date().toLocaleString('ar-EG'),
    timestamp: Date.now(),
    classes: (window.DB.classes||[]).length,
    students: _bkpCountStudents(),
    data: JSON.stringify(window.DB)
  };
  list.unshift(snap);
  if(list.length > BKP_MAX) list = list.slice(0, BKP_MAX);
  _bkpSaveList(list);
}

// ── Auto snapshot (throttled 60s) ────────────────────
function _bkpAutoSnapshot(){
  var now = Date.now();
  if(now - _bkpLastSnap < 60000) return;
  _bkpLastSnap = now;
  _bkpCreate('تلقائي');
  _bkpAutoFolderSync();
}

// ══════════════════════════════════════════════════════
// FILE SYSTEM ACCESS API — مزامنة المجلد
// ══════════════════════════════════════════════════════
function _fsaSupported(){
  return typeof window.showDirectoryPicker === 'function';
}

// ── اختيار مجلد ──────────────────────────────────────
async function __bkpPickFolder(){
  if(!_fsaSupported()){
    alert('متصفحك لا يدعم هذه الميزة.\nاستخدم Chrome أو Edge.');
    return;
  }
  try{
    var handle = await window.showDirectoryPicker({ mode:'readwrite', id:'school-backup', startIn:'documents' });
    _folderHandle = handle;
    _idbSet('folderHandle', handle);
    showSnack('✅ تم تحديد المجلد: ' + handle.name);
    await _bkpWriteToFolder();
    __renderBackupPage();
  }catch(e){
    if(e.name !== 'AbortError') showSnack('❌ خطأ: ' + e.message);
  }
}

// ── طلب إذن المجلد عند الحاجة ────────────────────────
async function _bkpRequestPermission(){
  if(!_folderHandle) return false;
  try{
    var perm = await _folderHandle.queryPermission({mode:'readwrite'});
    if(perm === 'granted') return true;
    perm = await _folderHandle.requestPermission({mode:'readwrite'});
    return perm === 'granted';
  }catch(e){ return false; }
}

// ── الكتابة للمجلد ───────────────────────────────────
async function _bkpWriteToFolder(){
  if(!_folderHandle || !window.DB) return false;
  var ok = await _bkpRequestPermission();
  if(!ok){ showSnack('⚠️ لم يُمنح إذن الكتابة للمجلد'); return false; }
  try{
    // ملف واحد ثابت الاسم يُستبدل في كل مزامنة
    var mainFile = await _folderHandle.getFileHandle('نسخة_احتياطية.json', {create:true});
    var w1 = await mainFile.createWritable();
    await w1.write(JSON.stringify(window.DB, null, 2));
    await w1.close();
    _bkpLastSync = Date.now();
    return true;
  }catch(e){
    showSnack('❌ خطأ في الكتابة: ' + e.message);
    return false;
  }
}

// ── مزامنة تلقائية (throttled 5 دقائق) ──────────────
function _bkpAutoFolderSync(){
  if(!_folderHandle) return;
  var now = Date.now();
  if(now - _bkpLastSync < 300000) return; // 5 دقائق
  _bkpWriteToFolder().then(function(ok){
    if(ok && document.getElementById('bkpSyncStatus'))
      __renderBackupPage();
  });
}

// ── مزامنة يدوية ─────────────────────────────────────
async function __bkpSyncNow(){
  if(!_folderHandle){ showSnack('⚠️ لم يتم تحديد مجلد بعد'); return; }
  var ok = await _bkpWriteToFolder();
  if(ok){ showSnack('✅ تمت المزامنة بنجاح'); __renderBackupPage(); }
}

// ── إلغاء ربط المجلد ─────────────────────────────────
function __bkpClearFolder(){
  if(!confirm('هل تريد إلغاء ربط المجلد؟')) return;
  _folderHandle = null;
  _idbDel('folderHandle');
  showSnack('✅ تم إلغاء ربط المجلد');
  __renderBackupPage();
}

// ══════════════════════════════════════════════════════
// باقي دوال النسخ
// ══════════════════════════════════════════════════════
function __bkpCreateManual(){
  if(!window.DB){ showSnack('⚠️ لا توجد بيانات'); return; }
  var lbl = document.getElementById('bkpLabelInput');
  var label = (lbl&&lbl.value.trim()) ? lbl.value.trim() : 'يدوي — '+new Date().toLocaleString('ar-EG');
  _bkpCreate(label);
  if(lbl) lbl.value='';
  showSnack('✅ تم حفظ النسخة');
  __renderBackupPage();
}

function __bkpRestore(id){
  var list = bkpLoad();
  var snap = list.find(function(s){return s.id===id;});
  if(!snap){ showSnack('⚠️ النسخة غير موجودة'); return; }
  if(!confirm('⚠️ استعادة هذه النسخة؟\nسيتم استبدال جميع البيانات الحالية!\n\n'+snap.label+' — '+snap.time)) return;
  try{
    _bkpCreate('قبل الاستعادة — احتياطي');
    window.DB = JSON.parse(snap.data);
    if(typeof saveDB==='function') saveDB();
    showSnack('✅ تم الاستعادة بنجاح');
    __renderBackupPage();
  }catch(e){ showSnack('❌ خطأ: '+e.message); }
}

function __bkpDelete(id){
  var list = bkpLoad().filter(function(s){return s.id!==id;});
  _bkpSaveList(list);
  showSnack('✅ تم الحذف');
  __renderBackupPage();
}

function __bkpClearAll(){
  if(!confirm('حذف جميع النسخ؟')) return;
  _bkpSaveList([]);
  showSnack('✅ تم حذف الكل');
  __renderBackupPage();
}

function __bkpExportJSON(){
  if(!window.DB){ showSnack('⚠️ لا توجد بيانات'); return; }
  var blob = new Blob([JSON.stringify(window.DB,null,2)],{type:'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'نسخة_احتياطية_'+new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')+'.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showSnack('✅ تم التحميل');
}

function __bkpExportSnapshot(id){
  var snap = bkpLoad().find(function(s){return s.id===id;});
  if(!snap){ showSnack('⚠️ غير موجودة'); return; }
  var blob = new Blob([snap.data],{type:'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'نسخة_'+snap.label.replace(/[^أ-يa-z0-9]/gi,'_')+'.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showSnack('✅ تم التحميل');
}

function __bkpImportJSON(){
  var input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0]; if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var imp=JSON.parse(ev.target.result);
        if(!imp.classes||!imp.data){ showSnack('❌ ملف غير صالح'); return; }
        if(!confirm('استيراد هذا الملف؟\nالفصول: '+(imp.classes||[]).join('، ')+'\n\n⚠️ سيتم استبدال البيانات الحالية!')) return;
        _bkpCreate('قبل الاستيراد — احتياطي');
        window.DB=imp;
        if(typeof saveDB==='function') saveDB();
        showSnack('✅ تم الاستيراد');
        __renderBackupPage();
      }catch(err){ showSnack('❌ خطأ: '+err.message); }
    };
    reader.readAsText(file,'UTF-8');
  };
  document.body.appendChild(input); input.click(); document.body.removeChild(input);
}

// ── صفحة النسخ الاحتياطي ──────────────────────────────
function __renderBackupPage(){
  var root=document.getElementById('backupRoot');
  if(!root) return;

  var list=bkpLoad();
  var totalSize=0, bkpSize=0;
  try{ var s=localStorage.getItem(window.STORE_KEY||'grades_v6'); if(s) totalSize=Math.round(s.length/1024); }catch(e){}
  try{ var bs=localStorage.getItem(BKP_KEY); if(bs) bkpSize=Math.round(bs.length/1024); }catch(e){}

  var fsaOk = _fsaSupported();
  var hasFolderStr = _folderHandle ? _folderHandle.name : null;
  var lastSyncStr  = _bkpLastSync ? new Date(_bkpLastSync).toLocaleString('ar-EG') : 'لم تتم بعد';

  var html='<div style="padding:14px 14px 40px;direction:rtl;font-family:\'Cairo\',sans-serif;">';

  // ── Header ──
  html+='<div style="background:linear-gradient(135deg,#0a1628,#1e3a5f);border-radius:14px;padding:16px 18px;margin-bottom:12px;border:1px solid #1d4ed8;">';
  html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
  html+='<span style="font-size:32px;">💾</span>';
  html+='<div><div style="font-size:15px;font-weight:900;color:#f1f5f9;">النسخ الاحتياطي والمزامنة</div>';
  html+='<div style="font-size:9.5px;color:#64748b;margin-top:2px;">حماية بياناتك · مزامنة تلقائية مع مجلد على جهازك</div></div>';
  html+='</div>';
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  html+=_bkpBadge('📊',_bkpCountStudents()+' طالب','#60a5fa');
  html+=_bkpBadge('🗂️',(window.DB&&window.DB.classes?window.DB.classes.length:0)+' فصل','#34d399');
  html+=_bkpBadge('💽',totalSize+' كيلوبايت','#fbbf24');
  html+=_bkpBadge('📦',list.length+'/'+BKP_MAX+' نسخة','#c4b5fd');
  html+='</div></div>';

  // ══ مزامنة المجلد ══
  html+='<div style="background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid '+(hasFolderStr?'#10b981':'#334155')+';position:relative;">';
  html+='<div style="font-size:12px;font-weight:900;color:#f1f5f9;margin-bottom:10px;display:flex;align-items:center;gap:7px;">';
  html+='<span style="font-size:18px;">📁</span> مزامنة مع مجلد على الجهاز';
  if(hasFolderStr) html+='<span style="background:#10b981;color:white;font-size:8px;padding:2px 8px;border-radius:8px;font-weight:700;">مفعّل</span>';
  html+='</div>';

  if(!fsaOk){
    html+='<div style="background:#450a0a;border:1px solid #ef4444;border-radius:8px;padding:10px 12px;font-size:10px;color:#fca5a5;">❌ متصفحك لا يدعم هذه الميزة — استخدم Chrome أو Edge</div>';
  } else if(hasFolderStr){
    // المجلد مرتبط
    html+='<div style="background:#0d2a1a;border:1px solid #10b981;border-radius:8px;padding:10px 14px;margin-bottom:10px;">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">';
    html+='<span style="font-size:20px;">📂</span>';
    html+='<div><div style="font-size:11px;font-weight:700;color:#6ee7b7;">'+_esc(hasFolderStr)+'</div>';
    html+='<div style="font-size:9px;color:#64748b;">آخر مزامنة: '+lastSyncStr+'</div></div>';
    html+='</div>';
    html+='<div style="font-size:9px;color:#94a3b8;line-height:1.7;">';
    html+='✅ الملفات المحفوظة في المجلد:<br>';
    html+='• <strong style="color:#6ee7b7;">نسخة_احتياطية.json</strong> — يُحدَّث تلقائياً كل 5 دقائق (يُستبدل الملف في كل مزامنة)';
    html+='</div></div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html+='<button onclick="bkpSyncNow()" style="background:linear-gradient(135deg,#065f46,#10b981);border:none;color:white;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;">🔄 مزامنة الآن</button>';
    html+='<button onclick="bkpPickFolder()" style="background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:10.5px;font-weight:700;font-family:\'Cairo\',sans-serif;">📁 تغيير المجلد</button>';
    html+='<button onclick="bkpClearFolder()" style="background:#1a0a0a;border:1px solid #7f1d1d;color:#fca5a5;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:10px;font-family:\'Cairo\',sans-serif;">✕ إلغاء الربط</button>';
    html+='</div>';
    // نصيحة Google Drive
    html+='<div style="margin-top:10px;background:#0f1a2e;border:1px dashed #2d4a6e;border-radius:7px;padding:8px 12px;font-size:9px;color:#64748b;line-height:1.7;">';
    html+='💡 <strong style="color:#93c5fd;">نصيحة:</strong> اختر مجلداً داخل Google Drive أو OneDrive على جهازك وسيتزامن تلقائياً مع السحابة!';
    html+='</div>';
  } else {
    // لم يُحدد مجلد
    html+='<div style="margin-bottom:12px;">';
    html+='<div style="font-size:10px;color:#94a3b8;line-height:1.8;margin-bottom:10px;">';
    html+='اختر مجلداً على جهازك لحفظ النسخ الاحتياطية تلقائياً.<br>';
    html+='<strong style="color:#fbbf24;">💡 اختر مجلداً داخل Google Drive أو OneDrive</strong> لمزامنة تلقائية مع السحابة!';
    html+='</div>';
    html+='<button onclick="bkpPickFolder()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:10px 24px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;font-family:\'Cairo\',sans-serif;width:100%;">📁 اختر مجلد المزامنة</button>';
    html+='</div>';
    html+='<div style="background:#0f1a2e;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;">';
    html+='<div style="font-size:10px;font-weight:700;color:#60a5fa;margin-bottom:6px;">📋 كيف يعمل؟</div>';
    html+='<div style="font-size:9.5px;color:#64748b;line-height:1.9;">';
    html+='١. اضغط "اختر مجلد المزامنة"<br>';
    html+='٢. اختر أي مجلد على جهازك (أو داخل Google Drive)<br>';
    html+='٣. اقبل طلب الإذن من المتصفح<br>';
    html+='٤. سيتم الحفظ تلقائياً كل 5 دقائق بدون أي إجراء منك';
    html+='</div></div>';
  }
  html+='</div>';

  // ══ النسخ اليدوية والتصدير ══
  html+='<div style="background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid #334155;">';
  html+='<div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:10px;">⚡ نسخ يدوي وتصدير</div>';
  html+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">';
  html+='<input id="bkpLabelInput" type="text" placeholder="اسم النسخة (اختياري)..." style="background:#0f172a;border:1.5px solid #334155;color:#f1f5f9;border-radius:8px;padding:7px 12px;font-size:11px;outline:none;font-family:\'Cairo\',sans-serif;flex:1;min-width:140px;"/>';
  html+='<button onclick="bkpCreateManual()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;white-space:nowrap;">💾 حفظ نسخة</button>';
  html+='</div>';
  html+='<div style="display:flex;gap:7px;flex-wrap:wrap;">';
  html+='<button onclick="bkpExportJSON()" style="background:#065f46;border:1px solid #10b981;color:#6ee7b7;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;font-family:\'Cairo\',sans-serif;">⬇️ تصدير JSON</button>';
  html+='<button onclick="bkpImportJSON()" style="background:#4c1d95;border:1px solid #8b5cf6;color:#c4b5fd;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;font-family:\'Cairo\',sans-serif;">⬆️ استيراد ملف</button>';
  if(list.length>0) html+='<button onclick="bkpClearAll()" style="background:#450a0a;border:1px solid #ef4444;color:#fca5a5;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:10px;font-family:\'Cairo\',sans-serif;">🗑️ حذف الكل</button>';
  html+='</div></div>';

  // ══ قائمة النسخ ══
  html+='<div style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">';
  html+='<div style="padding:11px 14px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between;">';
  html+='<div style="font-size:11px;font-weight:700;color:#e2e8f0;">📋 النسخ المحفوظة ('+list.length+')</div>';
  html+='<div style="font-size:9px;color:#475569;">أحدث '+BKP_MAX+' نسخة</div>';
  html+='</div>';

  if(!list.length){
    html+='<div style="text-align:center;padding:30px;color:#475569;"><div style="font-size:28px;margin-bottom:6px;">📭</div><div style="font-size:11px;">لا توجد نسخ بعد</div></div>';
  } else {
    list.forEach(function(snap,i){
      var isAuto = snap.label==='تلقائي';
      var kb = Math.round(snap.data.length/1024);
      html+='<div style="padding:10px 14px;border-bottom:1px solid #0f172a;display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-right:3px solid '+(isAuto?'#1e3a5f':'#1d4ed8')+';">';
      html+='<div style="flex:1;min-width:160px;">';
      html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">';
      html+='<span>'+(isAuto?'🔄':'💾')+'</span>';
      html+='<span style="font-size:11px;font-weight:700;color:'+(isAuto?'#64748b':'#60a5fa')+';">'+_esc(snap.label)+'</span>';
      if(i===0) html+='<span style="background:#10b981;color:white;font-size:7.5px;padding:1px 6px;border-radius:7px;">الأحدث</span>';
      html+='</div>';
      html+='<div style="font-size:9px;color:#475569;">'+_esc(snap.time)+' · '+snap.students+' طالب · '+kb+' كيلوبايت</div>';
      html+='</div>';
      html+='<div style="display:flex;gap:5px;">';
      html+='<button onclick="bkpRestore('+snap.id+')" style="background:#0f2a5e;border:1px solid #1d4ed8;color:#93c5fd;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:9.5px;font-weight:700;font-family:\'Cairo\',sans-serif;">↩ استعادة</button>';
      html+='<button onclick="bkpExportSnapshot('+snap.id+')" style="background:#065f46;border:1px solid #10b981;color:#6ee7b7;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:9.5px;font-family:\'Cairo\',sans-serif;">⬇️</button>';
      html+='<button onclick="bkpDelete('+snap.id+')" style="background:#450a0a;border:1px solid #ef4444;color:#fca5a5;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:9.5px;font-family:\'Cairo\',sans-serif;">✕</button>';
      html+='</div></div>';
    });
  }
  html+='</div>';
  html+='</div>';
  root.innerHTML=html;
}

function _bkpBadge(icon,text,color){
  return '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:5px 10px;display:flex;align-items:center;gap:5px;">'
    +'<span>'+icon+'</span><span style="font-size:9.5px;font-weight:700;color:'+color+';">'+text+'</span></div>';
}
function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ══════════════════════════════════════════════════════
// تهيئة: ربط كل الدوال بـ window + استعادة المجلد
// ══════════════════════════════════════════════════════
window.bkpCreateManual   = __bkpCreateManual;
window.bkpRestore        = __bkpRestore;
window.bkpDelete         = __bkpDelete;
window.bkpClearAll       = __bkpClearAll;
window.bkpExportJSON     = __bkpExportJSON;
window.bkpExportSnapshot = __bkpExportSnapshot;
window.bkpImportJSON     = __bkpImportJSON;
window.bkpPickFolder     = __bkpPickFolder;
window.bkpSyncNow        = __bkpSyncNow;
window.bkpClearFolder    = __bkpClearFolder;
window.renderBackupPage  = __renderBackupPage;

// ── استعادة مقبض المجلد عند التحميل ─────────────────
_bkpLoadFolderHandle(function(){
  // override saveDB لإضافة auto-snapshot + auto-sync
  var _orig = window.saveDB;
  window.saveDB = function(){
    if(typeof _orig==='function') _orig();
    _bkpAutoSnapshot();
  };
  // أول نسخة عند الفتح
  setTimeout(function(){
    if(window.DB) _bkpCreate('عند فتح التطبيق');
  }, 1500);
});

})(); // end IIFE

// ══════════════════════════════════════════════════════
// ██╗    ██╗██╗████████╗███╗   ██╗███████╗███████╗███████╗
// ██║    ██║██║╚══██╔══╝████╗  ██║██╔════╝██╔════╝██╔════╝
// ██║ █╗ ██║██║   ██║   ██╔██╗ ██║█████╗  ███████╗███████╗
// ██║███╗██║██║   ██║   ██║╚██╗██║██╔══╝  ╚════██║╚════██║
// ╚███╔███╔╝██║   ██║   ██║ ╚████║███████╗███████║███████║
// SECTION: توقيع المتابع — WITNESS SIGNATURE PAGE
// ══════════════════════════════════════════════════════

/* ── Inject CSS ── */
(function(){
  var s=document.createElement('style');
  s.textContent='\
  #witnessRoot{font-family:\'Cairo\',sans-serif;direction:rtl;background:#0b1420;min-height:100%;color:#e2e8f0;}\
\
  /* ── HERO HEADER ── */\
  .wt-hero{\
    background:linear-gradient(160deg,#071428 0%,#0f2a5e 45%,#1a1a2e 100%);\
    padding:22px 18px 18px;\
    text-align:center;\
    position:relative;\
    overflow:hidden;\
    border-bottom:2px solid rgba(59,130,246,.25);\
  }\
  .wt-hero::before{\
    content:\'\';position:absolute;inset:0;\
    background:\
      radial-gradient(ellipse 80% 60% at 50% 0%,rgba(29,78,216,.25) 0%,transparent 70%),\
      radial-gradient(circle at 10% 80%,rgba(217,119,6,.08) 0%,transparent 50%);\
  }\
  .wt-hero-seal{\
    width:64px;height:64px;border-radius:50%;\
    background:linear-gradient(135deg,#1d4ed8,#0f2a5e);\
    border:3px solid rgba(255,255,255,.15);\
    display:flex;align-items:center;justify-content:center;\
    font-size:28px;margin:0 auto 10px;\
    box-shadow:0 8px 30px rgba(29,78,216,.5);\
    position:relative;z-index:1;\
  }\
  .wt-hero-title{font-size:17px;font-weight:900;color:#fff;margin-bottom:3px;position:relative;z-index:1;}\
  .wt-hero-sub{font-size:10.5px;color:#64748b;position:relative;z-index:1;}\
  .wt-hero-meta{\
    display:flex;gap:6px;justify-content:center;flex-wrap:wrap;\
    margin-top:12px;position:relative;z-index:1;\
  }\
  .wt-meta-chip{\
    background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);\
    border-radius:20px;padding:3px 12px;font-size:10px;color:#94a3b8;\
  }\
  .wt-meta-chip strong{color:#cbd5e1;}\
\
  /* ── BODY ── */\
  .wt-body{padding:14px;max-width:520px;margin:0 auto;}\
\
  /* ── CARD ── */\
  .wt-card{\
    background:#111f38;border:1px solid rgba(255,255,255,.08);\
    border-radius:14px;padding:16px;margin-bottom:14px;\
    box-shadow:0 4px 20px rgba(0,0,0,.4);\
  }\
  .wt-card-hdr{\
    display:flex;align-items:center;gap:8px;\
    margin-bottom:14px;padding-bottom:10px;\
    border-bottom:1px solid rgba(255,255,255,.07);\
  }\
  .wt-card-icon{\
    width:34px;height:34px;border-radius:9px;\
    display:flex;align-items:center;justify-content:center;\
    font-size:16px;flex-shrink:0;\
  }\
  .wt-card-title{font-size:12px;font-weight:900;color:#e2e8f0;}\
  .wt-card-sub{font-size:10px;color:#475569;margin-top:1px;}\
\
  /* ── CLASS SELECTOR ── */\
  .wt-cls-grid{display:flex;flex-wrap:wrap;gap:7px;}\
  .wt-cls-btn{\
    background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);\
    color:#94a3b8;border-radius:9px;padding:7px 14px;\
    font-size:11px;font-weight:700;font-family:\'Cairo\',sans-serif;\
    cursor:pointer;transition:all .18s;\
  }\
  .wt-cls-btn:hover{background:rgba(59,130,246,.15);border-color:#3b82f6;color:#93c5fd;}\
  .wt-cls-btn.active{\
    background:linear-gradient(135deg,rgba(29,78,216,.4),rgba(59,130,246,.25));\
    border-color:#3b82f6;color:#93c5fd;\
    box-shadow:0 4px 14px rgba(29,78,216,.3);\
  }\
\
  /* ── GRADE SUMMARY TABLE ── */\
  .wt-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}\
  .wt-sum-cell{\
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);\
    border-radius:10px;padding:10px 6px;text-align:center;\
  }\
  .wt-sum-val{font-size:20px;font-weight:900;line-height:1;}\
  .wt-sum-lbl{font-size:8.5px;color:#475569;margin-top:4px;}\
  .wt-sum-max{font-size:8px;color:#334155;}\
\
  /* ── STUDENT TABLE ── */\
  .wt-tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid rgba(255,255,255,.08);}\
  .wt-tbl{border-collapse:collapse;width:100%;font-size:10.5px;}\
  .wt-tbl th{\
    background:#0a1e45;color:#93c5fd;\
    padding:7px 6px;text-align:center;\
    border-bottom:2px solid rgba(59,130,246,.3);\
    white-space:nowrap;font-size:9.5px;\
  }\
  .wt-tbl td{\
    border-bottom:1px solid rgba(255,255,255,.05);\
    padding:6px 5px;text-align:center;color:#cbd5e1;vertical-align:middle;\
  }\
  .wt-tbl tr:last-child td{border-bottom:none;}\
  .wt-tbl tr:hover td{background:rgba(59,130,246,.06);}\
  .wt-tbl .td-name{text-align:right;font-weight:700;color:#e2e8f0;min-width:130px;padding-right:10px;}\
  .wt-grade-chip{\
    display:inline-block;padding:2px 8px;border-radius:10px;\
    font-weight:800;font-size:10px;\
  }\
\
  /* ── INPUT ── */\
  .wt-input{\
    width:100%;background:rgba(255,255,255,.06);\
    border:1.5px solid rgba(255,255,255,.12);\
    color:#f1f5f9;padding:11px 14px;border-radius:10px;\
    font-size:13px;font-family:\'Cairo\',sans-serif;outline:none;\
    transition:border-color .2s;\
  }\
  .wt-input:focus{border-color:#3b82f6;background:rgba(59,130,246,.08);}\
  .wt-input::placeholder{color:#334155;}\
\
  /* ── SIGNATURE CANVAS ── */\
  .wt-sig-box{\
    background:#fff;border-radius:12px;overflow:hidden;\
    position:relative;\
    border:2px dashed rgba(59,130,246,.4);\
    box-shadow:inset 0 2px 12px rgba(0,0,0,.06);\
  }\
  .wt-sig-canvas{display:block;width:100%;cursor:crosshair;}\
  .wt-sig-ghost{\
    position:absolute;inset:0;display:flex;flex-direction:column;\
    align-items:center;justify-content:center;\
    pointer-events:none;transition:opacity .3s;\
  }\
  .wt-sig-ghost-icon{font-size:32px;opacity:.2;margin-bottom:6px;}\
  .wt-sig-ghost-text{font-size:11px;color:#94a3b8;font-weight:700;}\
  /* Three-line guide */\
  .wt-sig-box::after{\
    content:\'\';position:absolute;bottom:35%;left:8%;right:8%;\
    border-bottom:1px dashed rgba(0,0,0,.08);pointer-events:none;\
  }\
\
  /* ── BUTTONS ── */\
  .wt-btn{\
    border:none;border-radius:10px;padding:12px 18px;\
    font-size:13px;font-weight:900;font-family:\'Cairo\',sans-serif;\
    cursor:pointer;display:flex;align-items:center;justify-content:center;\
    gap:8px;transition:all .2s;width:100%;\
  }\
  .wt-btn-primary{\
    background:linear-gradient(135deg,#1d4ed8,#2563eb);\
    color:white;box-shadow:0 4px 18px rgba(29,78,216,.4);\
  }\
  .wt-btn-primary:hover{box-shadow:0 6px 24px rgba(29,78,216,.55);transform:translateY(-1px);}\
  .wt-btn-primary:disabled{background:#1e3a5f;color:#334155;box-shadow:none;transform:none;cursor:not-allowed;}\
  .wt-btn-ghost{background:rgba(255,255,255,.06);color:#94a3b8;border:1.5px solid rgba(255,255,255,.1);}\
  .wt-btn-ghost:hover{background:rgba(255,255,255,.1);color:#e2e8f0;}\
  .wt-btn-danger{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.25);}\
  .wt-btn-sm{padding:6px 14px;font-size:11px;width:auto;}\
  .wt-btn-gold{\
    background:linear-gradient(135deg,#92400e,#b45309,#d97706);\
    color:#fef3c7;box-shadow:0 4px 18px rgba(217,119,6,.35);\
  }\
  .wt-btn-gold:hover{box-shadow:0 6px 24px rgba(217,119,6,.5);transform:translateY(-1px);}\
\
  /* ── STEP BAR ── */\
  .wt-steps{\
    display:flex;align-items:center;justify-content:center;\
    gap:0;padding:12px 0 4px;\
  }\
  .wt-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;}\
  .wt-step-dot{\
    width:32px;height:32px;border-radius:50%;\
    display:flex;align-items:center;justify-content:center;\
    font-size:12px;font-weight:900;\
    border:2px solid rgba(255,255,255,.1);\
    background:rgba(255,255,255,.04);color:#334155;\
    transition:all .3s;\
  }\
  .wt-step-dot.active{\
    background:linear-gradient(135deg,#1d4ed8,#3b82f6);\
    border-color:#3b82f6;color:white;\
    box-shadow:0 4px 14px rgba(29,78,216,.5);\
  }\
  .wt-step-dot.done{background:linear-gradient(135deg,#059669,#10b981);border-color:#10b981;color:white;}\
  .wt-step-line{flex:1;height:2px;background:rgba(255,255,255,.08);transition:background .3s;}\
  .wt-step-line.done{background:#10b981;}\
  .wt-step-lbl{font-size:9px;color:#334155;font-weight:700;white-space:nowrap;}\
  .wt-step-lbl.active{color:#60a5fa;}\
  .wt-step-lbl.done{color:#34d399;}\
\
  /* ── RECEIPT ── */\
  .wt-receipt{\
    background:linear-gradient(160deg,#071428 0%,#0e2040 100%);\
    border:2px solid rgba(59,130,246,.3);\
    border-radius:16px;padding:22px 18px;\
    position:relative;overflow:hidden;\
  }\
  .wt-receipt::before{\
    content:\'\';position:absolute;top:-30px;right:-30px;\
    width:120px;height:120px;\
    background:radial-gradient(circle,rgba(29,78,216,.2) 0%,transparent 70%);\
    border-radius:50%;\
  }\
  .wt-receipt-seal{\
    width:70px;height:70px;border-radius:50%;\
    background:linear-gradient(135deg,#059669,#10b981);\
    display:flex;align-items:center;justify-content:center;\
    font-size:30px;margin:0 auto 14px;\
    box-shadow:0 6px 24px rgba(5,150,105,.4);\
    position:relative;z-index:1;\
  }\
  .wt-receipt-title{font-size:18px;font-weight:900;color:#34d399;text-align:center;margin-bottom:4px;position:relative;z-index:1;}\
  .wt-receipt-sub{font-size:11px;color:#475569;text-align:center;margin-bottom:18px;line-height:1.7;position:relative;z-index:1;}\
  .wt-receipt-table{\
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);\
    border-radius:10px;overflow:hidden;margin-bottom:16px;\
  }\
  .wt-receipt-row{\
    display:flex;justify-content:space-between;align-items:center;\
    padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.05);\
    font-size:11.5px;\
  }\
  .wt-receipt-row:last-child{border-bottom:none;}\
  .wt-rk{color:#475569;font-weight:700;}\
  .wt-rv{color:#e2e8f0;font-weight:900;}\
  .wt-sig-preview{\
    background:white;border-radius:10px;overflow:hidden;\
    border:2px solid rgba(255,255,255,.1);\
  }\
  .wt-sig-preview img{width:100%;display:block;}\
  .wt-sig-label{\
    background:#0a1628;font-size:9px;color:#475569;\
    text-align:center;padding:4px;font-weight:700;\
    border-top:1px solid rgba(255,255,255,.07);\
  }\
\
  /* ── HISTORY LIST ── */\
  .wt-hist-item{\
    display:flex;align-items:center;gap:10px;\
    padding:10px 12px;border-radius:10px;\
    background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);\
    margin-bottom:7px;transition:background .15s;\
  }\
  .wt-hist-item:hover{background:rgba(255,255,255,.06);}\
  .wt-hist-badge{\
    width:36px;height:36px;border-radius:50%;\
    background:rgba(5,150,105,.2);border:1.5px solid rgba(5,150,105,.3);\
    display:flex;align-items:center;justify-content:center;\
    font-size:16px;flex-shrink:0;\
  }\
\
  /* ── TOAST ── */\
  #wtToast{\
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);\
    background:#1e3a5f;color:#93c5fd;\
    padding:9px 20px;border-radius:24px;font-size:11.5px;font-weight:700;\
    white-space:nowrap;opacity:0;transition:opacity .3s;z-index:9999;\
    pointer-events:none;border:1px solid rgba(59,130,246,.3);\
    box-shadow:0 6px 24px rgba(0,0,0,.5);\
  }\
  #wtToast.wt-show{opacity:1;}\
  #wtToast.wt-err{background:#450a0a;color:#fca5a5;border-color:rgba(239,68,68,.3);}\
\
  /* ── FADE ANIM ── */\
  @keyframes wtFadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}\
  .wt-fade{animation:wtFadeUp .3s ease both;}\
\
  /* ── PRINT ── */\
  @media print{\
    #appShell>*:not(#page_witness),\
    .app-topbar,.app-sidebar,.app-bottomnav,\
    .wt-hero,.wt-steps,.wt-no-print{display:none!important;}\
    .wt-print-only{display:block!important;}\
    body,#witnessRoot{background:white!important;color:black!important;}\
    .wt-receipt{background:white!important;border:2px solid #e2e8f0!important;color:black!important;}\
    .wt-receipt-row{border-bottom:1px solid #e2e8f0!important;}\
    .wt-rk{color:#475569!important;}\
    .wt-rv{color:#0f172a!important;}\
    .wt-receipt-table{background:white!important;border:1px solid #e2e8f0!important;}\
  }\
  ';
  document.head.appendChild(s);
})();

/* ── Witness State ── */
var WT={
  step:1,
  cls:null,
  sigCanvas:null,
  sigCtx:null,
  sigDrawing:false,
  sigHas:false,
  witnessName:'',
  witnessTitle:'',
};
var WT_SIG_KEY='wt_sigs_v1';

function renderWitnessPage(){
  var root=document.getElementById('witnessRoot');
  if(!root) return;
  root.innerHTML='';
  root.appendChild(_wtBuildHero());
  var body=document.createElement('div');
  body.className='wt-body';
  body.id='wtBody';
  root.appendChild(body);
  var toast=document.createElement('div');
  toast.id='wtToast';
  root.appendChild(toast);
  _wtRenderStep(WT.step);
}

function _wtRenderStep(n){
  WT.step=n;
  var body=document.getElementById('wtBody');
  if(!body) return;
  body.innerHTML='';
  // steps bar
  body.appendChild(_wtBuildStepBar(n));
  var content=document.createElement('div');
  content.className='wt-fade';
  body.appendChild(content);
  if(n===1) _wtStep1(content);
  else if(n===2) _wtStep2(content);
  else if(n===3) _wtStep3(content);
  else if(n===4) _wtStep4(content);
}

/* ── HERO ── */
function _wtBuildHero(){
  var now=new Date();
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var subject=(DB&&DB.meta)?DB.meta.subject||'المادة':'المادة';
  var school=(DB&&DB.meta)?DB.meta.schoolName||'المدرسة':'المدرسة';
  var year=(DB&&DB.meta)?DB.meta.schoolYear||'':'';
  var teacher=(DB&&DB.meta)?DB.meta.teacherName||'':'';
  var div=document.createElement('div');
  div.className='wt-hero';
  div.innerHTML=
    '<div class="wt-hero-seal">📋</div>'+
    '<div class="wt-hero-title">إثبات الاطلاع على درجات المادة</div>'+
    '<div class="wt-hero-sub">محضر رسمي — يُعتمد بالتوقيع</div>'+
    '<div class="wt-hero-meta">'+
    '<div class="wt-meta-chip">🏫 <strong>'+_esc(school)+'</strong></div>'+
    '<div class="wt-meta-chip">📚 <strong>'+_esc(subject)+'</strong></div>'+
    (teacher?'<div class="wt-meta-chip">👤 <strong>'+_esc(teacher)+'</strong></div>':'')+
    (year?'<div class="wt-meta-chip">📅 <strong>'+_esc(year)+'</strong></div>':'')+
    '<div class="wt-meta-chip" id="wtDateChip">🗓 <strong>'+_esc(dateStr)+'</strong></div>'+
    '</div>';
  return div;
}

/* ── STEP BAR ── */
function _wtBuildStepBar(current){
  var labels=['اختيار الفصل','الدرجات','التوقيع','تم'];
  var wrap=document.createElement('div');
  wrap.className='wt-steps';
  for(var i=1;i<=4;i++){
    var step=document.createElement('div');
    step.className='wt-step';
    var dot=document.createElement('div');
    var lbl=document.createElement('div');
    if(i<current){dot.className='wt-step-dot done';dot.textContent='✓';lbl.className='wt-step-lbl done';}
    else if(i===current){dot.className='wt-step-dot active';dot.textContent=['١','٢','٣','٤'][i-1];lbl.className='wt-step-lbl active';}
    else{dot.className='wt-step-dot';dot.textContent=['١','٢','٣','٤'][i-1];lbl.className='wt-step-lbl';}
    lbl.textContent=labels[i-1];
    step.appendChild(dot);
    step.appendChild(lbl);
    wrap.appendChild(step);
    if(i<4){var line=document.createElement('div');line.className='wt-step-line'+(i<current?' done':'');wrap.appendChild(line);}
  }
  return wrap;
}

/* ══ STEP 1: اختيار الفصل ══ */
function _wtStep1(container){
  if(!DB){
    container.innerHTML='<div class="wt-card" style="text-align:center;padding:30px;"><div style="font-size:48px;">📂</div><div style="font-size:14px;color:#64748b;margin-top:12px;">لا توجد بيانات محفوظة بعد.</div></div>';
    return;
  }
  // Witness info
  var card1=document.createElement('div');card1.className='wt-card';
  card1.innerHTML=
    '<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(29,78,216,.2);">👤</div>'+
    '<div><div class="wt-card-title">بيانات المتابع</div><div class="wt-card-sub">يُملأ من المتابع أو المفتش</div></div></div>'+
    '<div style="display:flex;flex-direction:column;gap:10px;">'+
    '<div><label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:5px;">اسم المتابع / المفتش</label>'+
    '<input class="wt-input" id="wtWitnessName" placeholder="أ/ أحمد محمد..." value="'+_esc(WT.witnessName||'')+'"/></div>'+
    '<div><label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:5px;">الصفة الوظيفية</label>'+
    '<input class="wt-input" id="wtWitnessTitle" placeholder="مشرف / موجّه / مدير..." value="'+_esc(WT.witnessTitle||'')+'"/></div>'+
    '</div>';
  container.appendChild(card1);

  // Class selector
  var card2=document.createElement('div');card2.className='wt-card';
  var clsHtml='<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(124,58,237,.2);">🏫</div>'+
    '<div><div class="wt-card-title">اختر الفصل الدراسي</div><div class="wt-card-sub">سيتم عرض درجات الفصل كاملاً</div></div></div>'+
    '<div class="wt-cls-grid">';
  (DB.classes||[]).forEach(function(c){
    clsHtml+='<button class="wt-cls-btn'+(c===WT.cls?' active':'')+'" onclick="WT.cls=\''+_esc(c)+'\';_wtRenderStep(1)">'+_esc(c)+'</button>';
  });
  clsHtml+='</div>';
  card2.innerHTML=clsHtml;
  container.appendChild(card2);

  var btn=document.createElement('button');
  btn.className='wt-btn wt-btn-primary';
  btn.innerHTML='<span>عرض الدرجات</span><span>←</span>';
  btn.onclick=function(){
    WT.witnessName=(document.getElementById('wtWitnessName')||{}).value||'';
    WT.witnessTitle=(document.getElementById('wtWitnessTitle')||{}).value||'';
    if(!WT.witnessName.trim()){_wtToast('⚠ أدخل اسم المتابع أولاً',true);return;}
    if(!WT.cls){_wtToast('⚠ اختر الفصل الدراسي أولاً',true);return;}
    _wtRenderStep(2);
  };
  container.appendChild(btn);
}

/* ══ STEP 2: عرض الدرجات ══ */
function _wtStep2(container){
  var cls=WT.cls;
  var students=(DB.data[cls]||[]);
  var tmax=70;
  var totals=[];
  students.forEach(function(s){if(!s._totalAbsent){var c=calcStudent(s);totals.push(c.total);}});
  var classAvg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
  var passCount=totals.filter(function(t){return t>=42;}).length;

  // class summary card
  var card=document.createElement('div');card.className='wt-card';
  card.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(5,150,105,.2);">📊</div>'+
    '<div><div class="wt-card-title">ملخص الفصل: '+_esc(cls)+'</div>'+
    '<div class="wt-card-sub">'+students.length+' طالب — العام الدراسي '+(DB.meta.schoolYear||'')+'</div></div></div>'+
    '<div class="wt-summary-grid">'+
    _wtSumCell(students.length,'عدد الطلاب','','#60a5fa')+
    _wtSumCell(classAvg,'المتوسط العام','/70',_wtGradeColor(classAvg,70).text)+
    _wtSumCell(passCount,'ناجح','طالب','#34d399')+
    _wtSumCell(students.length-passCount,'راسب','طالب','#f87171')+
    '</div>';
  container.appendChild(card);

  // grades table card
  var card2=document.createElement('div');card2.className='wt-card';
  var tblHtml=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(29,78,216,.2);">📝</div>'+
    '<div><div class="wt-card-title">كشف الدرجات الكاملة</div>'+
    '<div class="wt-card-sub">مادة '+_esc(DB.meta.subject||'')+'</div></div></div>'+
    '<div class="wt-tbl-wrap"><table class="wt-tbl">'+
    '<thead><tr>'+
    '<th>م</th><th style="text-align:right;padding-right:10px;">اسم الطالب</th>'+
    '<th>تقييم<br><small style="opacity:.6">/20</small></th>'+
    '<th>واجب<br><small style="opacity:.6">/10</small></th>'+
    '<th title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br><small style="opacity:.6">/10</small></th>'+
    '<th>اختبار<br><small style="opacity:.6">/30</small></th>'+
    '<th>المجموع<br><small style="opacity:.6">/70</small></th>'+
    '</tr></thead><tbody>';
  students.forEach(function(s,i){
    var c=calcStudent(s);
    var gc=_wtGradeColor(c.total,70);
    var absent=s._totalAbsent;
    tblHtml+='<tr>'+
      '<td style="color:#334155;font-size:9px;">'+(i+1)+'</td>'+
      '<td class="td-name">'+_esc(s.name||'—')+'</td>'+
      (absent?'<td colspan="5" style="color:#b45309;font-weight:700;">غائب كلياً</td>':
        '<td>'+_wtChip(c.avgAssess,20)+'</td>'+
        '<td>'+_wtChip(c.avgHw,10)+'</td>'+
        '<td>'+_wtChip(c.avgBeh,10)+'</td>'+
        '<td>'+_wtChip(c.exTotal,30)+'</td>'+
        '<td><span class="wt-grade-chip" style="background:'+gc.bg+';color:'+gc.text+';font-size:11px;">'+c.total+'</span></td>')+
      '</tr>';
  });
  tblHtml+='</tbody></table></div>';
  card2.innerHTML=tblHtml;
  container.appendChild(card2);

  var row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin-top:4px;';
  var back=document.createElement('button');back.className='wt-btn wt-btn-ghost';back.innerHTML='← رجوع';back.onclick=function(){_wtRenderStep(1);};
  var next=document.createElement('button');next.className='wt-btn wt-btn-gold';next.innerHTML='✍️ التوقيع على الاطلاع';next.onclick=function(){_wtRenderStep(3);};
  row.appendChild(back);row.appendChild(next);
  container.appendChild(row);
}

/* ══ STEP 3: التوقيع ══ */
function _wtStep3(container){
  // confirm card
  var card=document.createElement('div');card.className='wt-card';
  card.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(217,119,6,.2);">📜</div>'+
    '<div><div class="wt-card-title">نص المحضر الرسمي</div></div></div>'+
    '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px;font-size:11.5px;color:#94a3b8;line-height:2;direction:rtl;">'+
    'أنا الموقّع أدناه <strong style="color:#fcd34d;">'+_esc(WT.witnessName)+'</strong>'+
    ' بصفة <strong style="color:#fcd34d;">'+_esc(WT.witnessTitle||'متابع')+'</strong>،'+
    ' أُشهد بأنني اطّلعتُ على درجات مادة <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.subject||'':'')+'</strong>'+
    ' للفصل <strong style="color:#93c5fd;">'+_esc(WT.cls||'')+'</strong>'+
    ' بمدرسة <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.schoolName||'':'')+'</strong>'+
    ' للعام الدراسي <strong style="color:#93c5fd;">'+_esc((DB&&DB.meta)?DB.meta.schoolYear||'':'')+'</strong>،'+
    ' وذلك بتاريخ <strong style="color:#fcd34d;" id="wtNowDate"></strong>.'+
    '</div>';
  container.appendChild(card);

  // Signature card
  var card2=document.createElement('div');card2.className='wt-card';
  card2.innerHTML=
    '<div class="wt-card-hdr">'+
    '<div class="wt-card-icon" style="background:rgba(29,78,216,.2);">✍️</div>'+
    '<div><div class="wt-card-title">توقيع المتابع</div>'+
    '<div class="wt-card-sub">وقِّع بإصبعك في المربع أدناه</div></div></div>';

  var sigBox=document.createElement('div');
  sigBox.className='wt-sig-box';
  sigBox.style.height='180px';
  sigBox.id='wtSigBox';

  var sigCanvas=document.createElement('canvas');
  sigCanvas.id='wtSigCanvas';
  sigCanvas.className='wt-sig-canvas';
  sigBox.appendChild(sigCanvas);

  var ghost=document.createElement('div');
  ghost.className='wt-sig-ghost';ghost.id='wtSigGhost';
  ghost.innerHTML='<div class="wt-sig-ghost-icon">✍️</div><div class="wt-sig-ghost-text">المتابع يوقّع هنا بإصبعه</div>';
  sigBox.appendChild(ghost);
  card2.appendChild(sigBox);

  var actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:8px;margin-top:10px;align-items:center;';
  var clearBtn=document.createElement('button');
  clearBtn.className='wt-btn wt-btn-danger wt-btn-sm';
  clearBtn.innerHTML='🗑 مسح التوقيع';
  clearBtn.onclick=_wtClearSig;
  var hint=document.createElement('div');
  hint.style.cssText='flex:1;font-size:9.5px;color:#334155;padding-right:8px;';
  hint.textContent='التوقيع يُستخدم للإثبات الرسمي فقط';
  actions.appendChild(clearBtn);actions.appendChild(hint);
  card2.appendChild(actions);
  container.appendChild(card2);

  var row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin-top:4px;';
  var back=document.createElement('button');back.className='wt-btn wt-btn-ghost';back.innerHTML='← رجوع';back.onclick=function(){_wtRenderStep(2);};
  var confirm=document.createElement('button');confirm.className='wt-btn wt-btn-primary';confirm.id='wtConfirmBtn';
  confirm.innerHTML='✅ تأكيد الاطلاع والتوقيع';
  confirm.onclick=_wtConfirm;
  row.appendChild(back);row.appendChild(confirm);
  container.appendChild(row);

  // Set date text
  var dn=document.getElementById('wtNowDate');
  if(dn){var now=new Date();dn.textContent=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}

  // Init canvas
  setTimeout(_wtInitCanvas,80);
}

/* ── Canvas ── */
function _wtInitCanvas(){
  var box=document.getElementById('wtSigBox');
  var canvas=document.getElementById('wtSigCanvas');
  if(!box||!canvas) return;
  var W=box.clientWidth; var H=180;
  var dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  var ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.strokeStyle='#0f172a'; ctx.lineWidth=2.8;
  ctx.lineCap='round'; ctx.lineJoin='round';
  WT.sigCanvas=canvas; WT.sigCtx=ctx; WT.sigDrawing=false; WT.sigHas=false;

  function getPos(e){
    var r=canvas.getBoundingClientRect();
    var src=e.touches?e.touches[0]:e;
    return{x:(src.clientX-r.left),y:(src.clientY-r.top)};
  }
  function startDraw(e){e.preventDefault();var p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);WT.sigDrawing=true;}
  function moveDraw(e){e.preventDefault();if(!WT.sigDrawing)return;var p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);_wtMarkSig();}
  function endDraw(e){if(e)e.preventDefault();WT.sigDrawing=false;ctx.beginPath();}

  canvas.addEventListener('touchstart',startDraw,{passive:false});
  canvas.addEventListener('touchmove',moveDraw,{passive:false});
  canvas.addEventListener('touchend',endDraw,{passive:false});
  canvas.addEventListener('mousedown',startDraw);
  canvas.addEventListener('mousemove',moveDraw);
  canvas.addEventListener('mouseup',endDraw);
  canvas.addEventListener('mouseleave',endDraw);
}

function _wtMarkSig(){
  WT.sigHas=true;
  var g=document.getElementById('wtSigGhost');
  if(g)g.style.opacity='0';
}

function _wtClearSig(){
  if(!WT.sigCtx||!WT.sigCanvas) return;
  WT.sigCtx.clearRect(0,0,WT.sigCanvas.width,WT.sigCanvas.height);
  WT.sigHas=false;
  var g=document.getElementById('wtSigGhost');
  if(g)g.style.opacity='1';
}

/* ── Confirm ── */
function _wtConfirm(){
  if(!WT.witnessName.trim()){_wtToast('⚠ اسم المتابع مطلوب',true);return;}
  if(!WT.sigHas){_wtToast('⚠ التوقيع مطلوب',true);return;}
  var sigData=WT.sigCanvas.toDataURL('image/png');
  var now=new Date();
  var students=(DB.data[WT.cls]||[]);
  var totals=[];
  students.forEach(function(s){if(!s._totalAbsent){var c=calcStudent(s);totals.push(c.total);}});
  var classAvg=totals.length?Math.round(totals.reduce(function(a,b){return a+b;},0)/totals.length):0;
  var entry={
    ts:now.toISOString(),
    cls:WT.cls,
    subject:(DB&&DB.meta)?DB.meta.subject||'':'',
    school:(DB&&DB.meta)?DB.meta.schoolName||'':'',
    year:(DB&&DB.meta)?DB.meta.schoolYear||'':'',
    teacher:(DB&&DB.meta)?DB.meta.teacherName||'':'',
    witnessName:WT.witnessName,
    witnessTitle:WT.witnessTitle||'متابع',
    studentCount:students.length,
    classAvg:classAvg,
    sig:sigData
  };
  // save
  var sigs=[];
  try{var s=localStorage.getItem(WT_SIG_KEY);if(s)sigs=JSON.parse(s);}catch(e){}
  sigs.push(entry);
  try{localStorage.setItem(WT_SIG_KEY,JSON.stringify(sigs));}catch(e){}
  WT._lastEntry=entry;
  _wtRenderStep(4);
}

/* ══ STEP 4: تم ══ */
function _wtStep4(container){
  var e=WT._lastEntry;
  if(!e) return;
  var now=new Date(e.ts);
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var timeStr=now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});

  var receipt=document.createElement('div');
  receipt.className='wt-receipt wt-fade';
  receipt.innerHTML=
    '<div class="wt-receipt-seal">✅</div>'+
    '<div class="wt-receipt-title">تمّ الاطلاع والتوقيع</div>'+
    '<div class="wt-receipt-sub">تمّ تسجيل الاطلاع الرسمي بنجاح<br>'+_esc(dateStr)+'</div>'+
    '<div class="wt-receipt-table">'+
    _wtRRow('المدرسة',e.school)+
    _wtRRow('المادة',e.subject)+
    _wtRRow('الفصل الدراسي',e.cls)+
    _wtRRow('العام الدراسي',e.year)+
    _wtRRow('المعلم',e.teacher)+
    _wtRRow('المتابع / المفتش',e.witnessName)+
    _wtRRow('الصفة',e.witnessTitle)+
    _wtRRow('عدد الطلاب',e.studentCount+' طالب')+
    _wtRRow('متوسط الفصل',e.classAvg+' / 70')+
    _wtRRow('التاريخ',dateStr)+
    _wtRRow('الوقت',timeStr)+
    '</div>'+
    '<div style="margin-bottom:8px;font-size:10px;color:#475569;font-weight:700;">توقيع المتابع</div>'+
    '<div class="wt-sig-preview">'+
    '<img src="'+e.sig+'" style="width:100%;display:block;" alt="التوقيع"/>'+
    '<div class="wt-sig-label">✍️ '+_esc(e.witnessName)+' — '+_esc(e.witnessTitle)+'</div>'+
    '</div>';
  container.appendChild(receipt);

  var row=document.createElement('div');
  row.style.cssText='display:flex;gap:8px;margin-top:14px;';
  var printBtn=document.createElement('button');
  printBtn.className='wt-btn wt-btn-ghost';printBtn.innerHTML='🖨 طباعة المحضر';
  printBtn.onclick=_wtPrint;
  var newBtn=document.createElement('button');
  newBtn.className='wt-btn wt-btn-primary';newBtn.innerHTML='↩ توقيع جديد';
  newBtn.onclick=function(){WT.cls=null;WT.witnessName='';WT.witnessTitle='';WT.sigHas=false;WT._lastEntry=null;_wtRenderStep(1);};
  row.appendChild(printBtn);row.appendChild(newBtn);
  container.appendChild(row);

  // History
  var sigs=[];
  try{var s=localStorage.getItem(WT_SIG_KEY);if(s)sigs=JSON.parse(s);}catch(e2){}
  if(sigs.length>1){
    var histCard=document.createElement('div');histCard.className='wt-card';histCard.style.marginTop='14px';
    histCard.innerHTML='<div class="wt-card-hdr"><div class="wt-card-icon" style="background:rgba(217,119,6,.2);">📜</div><div><div class="wt-card-title">سجل التوقيعات السابقة</div></div></div>';
    sigs.slice().reverse().slice(0,8).forEach(function(sig){
      var d=new Date(sig.ts);
      var ds=d.toLocaleDateString('ar-EG',{month:'short',day:'numeric'});
      var ts2=d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
      var item=document.createElement('div');item.className='wt-hist-item';
      item.innerHTML='<div class="wt-hist-badge">✅</div>'+
        '<div style="flex:1;">'+
        '<div style="font-size:11.5px;font-weight:700;color:#e2e8f0;">'+_esc(sig.cls)+' — '+_esc(sig.witnessName)+'</div>'+
        '<div style="font-size:9.5px;color:#475569;">'+_esc(sig.subject)+' | '+_esc(sig.witnessTitle)+'</div>'+
        '</div>'+
        '<div style="text-align:left;font-size:9px;color:#334155;">'+_esc(ds)+'<br>'+_esc(ts2)+'</div>';
      histCard.appendChild(item);
    });
    container.appendChild(histCard);
  }
}

/* ── Print ── */
function _wtPrint(){
  var e=WT._lastEntry;
  if(!e) return;
  var now=new Date(e.ts);
  var dateStr=now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var timeStr=now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  var win=window.open('','_blank','width=700,height=900');
  var students=(DB.data[e.cls]||[]);
  var rows='';
  students.forEach(function(s,i){
    var c=calcStudent(s);
    var color=c.total>=42?'#065f46':c.total>=28?'#92400e':'#b91c1c';
    rows+='<tr>'+
      '<td style="text-align:center;color:#94a3b8;font-size:9px;">'+(i+1)+'</td>'+
      '<td style="text-align:right;font-weight:700;padding-right:8px;">'+_esc(s.name||'—')+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgAssess||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgHw||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.avgBeh||0))+'</td>'+
      '<td style="text-align:center;">'+_esc(s._totalAbsent?'غ':(c.exTotal||0))+'</td>'+
      '<td style="text-align:center;font-weight:900;color:'+color+';">'+_esc(s._totalAbsent?'غائب':c.total)+'</td>'+
      '</tr>';
  });
  win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head>'+
    '<meta charset="UTF-8"/><title>محضر الاطلاع</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0;}'+
    'body{font-family:Cairo,sans-serif;direction:rtl;padding:24px;color:#0f172a;background:white;font-size:11px;}'+
    'h1{font-size:17px;font-weight:900;color:#0f2a5e;text-align:center;margin-bottom:3px;}'+
    'h2{font-size:12px;font-weight:700;color:#1d4ed8;text-align:center;margin-bottom:14px;}'+
    '.meta{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px;}'+
    '.chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:3px 12px;font-size:10px;color:#475569;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px;}'+
    'th{background:#0f2a5e;color:white;padding:6px 5px;text-align:center;font-weight:700;border:1px solid #1d4ed8;}'+
    'td{border:1px solid #e2e8f0;padding:5px;vertical-align:middle;}'+
    'tr:nth-child(even) td{background:#f8fafc;}'+
    '.section{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;}'+
    '.section h3{font-size:11px;font-weight:900;color:#0f2a5e;margin-bottom:10px;}'+
    '.info-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:10.5px;}'+
    '.info-row:last-child{border-bottom:none;}'+
    '.info-key{color:#64748b;font-weight:700;}'+
    '.info-val{font-weight:900;color:#0f172a;}'+
    '.sig-area{text-align:center;margin-top:8px;}'+
    '.sig-area img{max-width:220px;border:1px dashed #94a3b8;border-radius:6px;padding:4px;}'+
    '.sig-line{border-top:1.5px dashed #94a3b8;margin:20px 40px 6px;color:#94a3b8;}'+
    '.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px;}'+
    '.badge-ok{color:#065f46;} .badge-fail{color:#b91c1c;}'+
    '@media print{body{padding:14px;}@page{margin:1cm;}}'+
    '</style></head><body>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="images/logo.jpg" style="width:60px;height:60px;object-fit:contain;border-radius:50%;background:#000;"/><h1 style="margin:0;">'+_esc(e.school)+'</h1></div>'+
    '<h2>محضر اطلاع رسمي على درجات مادة '+_esc(e.subject)+'</h2>'+
    '<div class="meta">'+
    '<span class="chip">📚 '+_esc(e.subject)+'</span>'+
    '<span class="chip">🏫 '+_esc(e.cls)+'</span>'+
    '<span class="chip">👤 '+_esc(e.teacher)+'</span>'+
    '<span class="chip">📅 '+_esc(e.year)+'</span>'+
    '<span class="chip">🗓 '+_esc(dateStr)+'</span>'+
    '</div>'+

    '<table>'+
    '<thead><tr><th>م</th><th style="text-align:right;padding-right:8px;">اسم الطالب</th><th>تقييم<br>/20</th><th>واجب<br>/10</th><th title="متوسط السلوك = Σ سلوك ÷ ن">م.سلوك<br>/10</th><th>اختبار<br>/30</th><th>المجموع<br>/70</th></tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '</table>'+

    '<div class="section">'+
    '<h3>بيانات الاطلاع</h3>'+
    '<div class="info-row"><span class="info-key">المتابع / المفتش</span><span class="info-val">'+_esc(e.witnessName)+'</span></div>'+
    '<div class="info-row"><span class="info-key">الصفة الوظيفية</span><span class="info-val">'+_esc(e.witnessTitle)+'</span></div>'+
    '<div class="info-row"><span class="info-key">عدد الطلاب</span><span class="info-val">'+e.studentCount+' طالب</span></div>'+
    '<div class="info-row"><span class="info-key">متوسط الفصل</span><span class="info-val">'+e.classAvg+' / 70</span></div>'+
    '<div class="info-row"><span class="info-key">تاريخ الاطلاع</span><span class="info-val">'+_esc(dateStr)+'</span></div>'+
    '<div class="info-row"><span class="info-key">الوقت</span><span class="info-val">'+_esc(timeStr)+'</span></div>'+
    '</div>'+

    '<div class="section">'+
    '<h3>توقيع المتابع</h3>'+
    '<div class="sig-area">'+
    '<img src="'+e.sig+'" alt="توقيع"/>'+
    '<div style="font-size:10px;font-weight:700;margin-top:6px;">'+_esc(e.witnessName)+' — '+_esc(e.witnessTitle)+'</div>'+
    '</div>'+
    '<div style="margin-top:18px;display:flex;justify-content:space-around;text-align:center;font-size:10px;color:#475569;">'+
    '<div><div class="sig-line"></div><div>معلم المادة / '+_esc(e.teacher)+'</div></div>'+
    '<div><div class="sig-line"></div><div>مدير المدرسة</div></div>'+
    '</div>'+
    '</div>'+

    '<div class="footer">نظام إدارة الدرجات المدرسي — تم التوقيع الإلكتروني بتاريخ '+_esc(dateStr)+' الساعة '+_esc(timeStr)+'</div>'+
    '<\/body><\/html>');
  win.document.close();
  setTimeout(function(){win.print();},600);
}

/* ── Helpers ── */
function _wtSumCell(val,lbl,sub,color){
  return '<div class="wt-sum-cell">'+
    '<div class="wt-sum-val" style="color:'+color+';">'+val+'</div>'+
    '<div class="wt-sum-lbl">'+lbl+'</div>'+
    (sub?'<div class="wt-sum-max">'+sub+'</div>':'')+
    '</div>';
}
function _wtRRow(key,val){
  return '<div class="wt-receipt-row"><span class="wt-rk">'+_esc(key)+'</span><span class="wt-rv">'+_esc(String(val||'—'))+'</span></div>';
}
function _wtChip(val,max){
  var c=_wtGradeColor(Number(val)||0,max);
  return '<span style="background:'+c.bg+';color:'+c.text+';padding:1px 8px;border-radius:8px;font-weight:700;font-size:10px;">'+val+'</span>';
}
function _wtGradeColor(val,max){
  if(max<=0) return{bg:'rgba(255,255,255,.06)',text:'#94a3b8'};
  var p=val/max;
  if(p>=0.85) return{bg:'rgba(5,150,105,.2)',text:'#34d399'};
  if(p>=0.60) return{bg:'rgba(217,119,6,.2)',text:'#fbbf24'};
  return{bg:'rgba(239,68,68,.18)',text:'#f87171'};
}
function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _wtToast(msg,err){
  var t=document.getElementById('wtToast');
  if(!t) return;
  t.textContent=msg;
  t.className='wt-show'+(err?' wt-err':'');
  clearTimeout(_wtToast._t);
  _wtToast._t=setTimeout(function(){t.className='';},2600);
}


// ══════════════════════════════


(function(){

// ── محتوى المساعدة لكل صفحة ──────────────────────────
var HELP = {

  home: {
    title: 'الرئيسية',
    icon: '🏠',
    color: '#3b82f6',
    intro: 'الصفحة الرئيسية تعرض ملخصاً سريعاً لأهم المعلومات والوقت الحالي.',
    sections: [
      { icon: '🕐', title: 'الساعة والتاريخ', items: ['تعرض الوقت الحالي والتاريخ بالتقويم الميلادي والهجري.'] },
      { icon: '📊', title: 'الملخص السريع', items: ['تعرض عدد الفصول والطلاب والدرجات المسجلة.', 'اضغط على أي بطاقة للانتقال مباشرة للصفحة المرتبطة بها.'] },
    ]
  },

  grades: {
    title: 'الدرجات',
    icon: '📝',
    color: '#10b981',
    intro: 'صفحة تسجيل درجات الطلاب في جميع المواد والأنشطة.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل الدراسي من القائمة في الأعلى.', 'يمكنك إضافة فصول جديدة من صفحة الإعدادات.'] },
      { icon: '✏️', title: 'تسجيل الدرجات', items: ['اضغط على خلية الدرجة مباشرة لتعديلها.', 'اضغط Enter أو انتقل للخلية التالية لحفظ التغيير تلقائياً.', 'تظهر الخلية باللون الأحمر إذا كانت الدرجة أقل من النصف.'] },
      { icon: '➕', title: 'إضافة طالب', items: ['اضغط زر "إضافة طالب" في أسفل القائمة.', 'أدخل اسم الطالب واضغط حفظ.'] },
      { icon: '📤', title: 'التصدير', items: ['اضغط زر التصدير لحفظ الدرجات كملف Excel.'] },
    ]
  },

  weekly: {
    title: 'الأسبوعي',
    icon: '📅',
    color: '#8b5cf6',
    intro: 'سجّل أداء الطلاب الأسبوعي وتابع تطورهم عبر الزمن.',
    sections: [
      { icon: '📆', title: 'اختيار الأسبوع', items: ['استخدم الأسهم للتنقل بين الأسابيع.', 'كل أسبوع يُحفظ بشكل مستقل.'] },
      { icon: '✍️', title: 'التقييم', items: ['أدخل تقييم كل طالب في خانته.', 'يمكنك إضافة ملاحظة لكل طالب.'] },
    ]
  },

  sched: {
    title: 'الجدول',
    icon: '🗓',
    color: '#f59e0b',
    intro: 'عرض وتعديل جدول الحصص الأسبوعي لكل فصل.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل من القائمة لعرض جدوله.'] },
      { icon: '✏️', title: 'تعديل الجدول', items: ['اضغط على أي خانة في الجدول لتعديل المادة أو المعلم.', 'يُحفظ الجدول تلقائياً بعد كل تعديل.'] },
    ]
  },

  absence: {
    title: 'الغياب',
    icon: '📋',
    color: '#ef4444',
    intro: 'تسجيل ومتابعة غياب الطلاب يومياً.',
    sections: [
      { icon: '📅', title: 'اختيار التاريخ', items: ['اختر التاريخ من الأعلى لعرض غياب ذلك اليوم.'] },
      { icon: '✅', title: 'تسجيل الغياب', items: ['اضغط على اسم الطالب لتسجيله غائباً أو حاضراً.', 'الأحمر = غائب، الأخضر = حاضر.'] },
      { icon: '📊', title: 'الإحصائيات', items: ['تظهر في الأسفل إجمالي أيام الغياب لكل طالب.'] },
    ]
  },

  sick: {
    title: 'المرضى',
    icon: '🤒',
    color: '#f97316',
    intro: 'تتبع الطلاب الغائبين بسبب المرض وإدارة الإجازات المرضية.',
    sections: [
      { icon: '➕', title: 'إضافة حالة', items: ['اضغط "إضافة" وأدخل اسم الطالب وتاريخ المرض وعدد الأيام.'] },
      { icon: '📋', title: 'متابعة الحالات', items: ['تظهر جميع الحالات مرتبة حسب التاريخ.', 'يمكنك حذف أي حالة بالضغط على زر الحذف.'] },
    ]
  },

  dict: {
    title: 'الإملاء',
    icon: '🎤',
    color: '#06b6d4',
    intro: 'تسجيل درجات الإملاء والاختبارات الكتابية للطلاب.',
    sections: [
      { icon: '📝', title: 'تسجيل الدرجات', items: ['أدخل درجة الإملاء لكل طالب في الخانة المخصصة.', 'الدرجة القصوى محددة من الإعدادات.'] },
      { icon: '📊', title: 'المتوسط', items: ['يظهر متوسط الدرجات تلقائياً أسفل الجدول.'] },
    ]
  },

  stats: {
    title: 'الإحصائيات',
    icon: '📊',
    color: '#a78bfa',
    intro: 'عرض تحليل شامل لأداء الطلاب والفصول.',
    sections: [
      { icon: '📈', title: 'الرسوم البيانية', items: ['تعرض توزيع الدرجات والمتوسطات بشكل مرئي.'] },
      { icon: '🏆', title: 'الترتيب', items: ['يمكنك عرض ترتيب الطلاب حسب الدرجات الكلية.'] },
      { icon: '🔍', title: 'التصفية', items: ['اختر فصلاً أو مادة محددة لعرض إحصائياتها.'] },
    ]
  },

  curric: {
    title: 'توزيع المنهج',
    icon: '📖',
    color: '#34d399',
    intro: 'تخطيط وتوزيع محتوى المنهج الدراسي على أسابيع الفصل.',
    sections: [
      { icon: '📅', title: 'التخطيط', items: ['أدخل المحتوى المخطط لكل أسبوع.', 'يمكن تحديد الوحدة والدروس والأهداف لكل أسبوع.'] },
      { icon: '✅', title: 'المتابعة', items: ['ضع علامة على الأسابيع المنجزة فعلاً للمتابعة.'] },
    ]
  },

  settings: {
    title: 'الإعدادات',
    icon: '⚙️',
    color: '#94a3b8',
    intro: 'ضبط إعدادات التطبيق وتخصيصه حسب احتياجاتك.',
    sections: [
      { icon: '🏫', title: 'إدارة الفصول', items: ['أضف فصولاً جديدة أو احذف فصولاً موجودة.', 'يمكنك تسمية الفصل بأي اسم تريده.'] },
      { icon: '📝', title: 'إعدادات الدرجات', items: ['حدد الدرجة القصوى لكل نشاط أو مادة.', 'يمكن إضافة أعمدة مخصصة.'] },
      { icon: '👤', title: 'بيانات المعلم', items: ['أدخل اسمك والمدرسة لتظهر في التقارير.'] },
    ]
  },

  backup: {
    title: 'النسخ الاحتياطي',
    icon: '💾',
    color: '#3b82f6',
    intro: 'حماية بياناتك من الفقدان عبر نظام نسخ احتياطي متكامل.',
    sections: [
      { icon: '📁', title: 'مزامنة مجلد (الأفضل)', items: [
        'اضغط "اختر مجلد المزامنة" واختر مجلداً على جهازك.',
        'اقبل طلب الإذن — يعمل على Chrome وEdge فقط.',
        'سيُحفظ ملف نسخة_احتياطية.json تلقائياً كل 5 دقائق.',
        'اختر مجلداً داخل Google Drive أو OneDrive للمزامنة مع السحابة!',
      ]},
      { icon: '💾', title: 'نسخ يدوي', items: [
        'اكتب اسماً للنسخة واضغط "حفظ نسخة" — تُحفظ في المتصفح.',
        'يُحتفظ بأحدث 20 نسخة تلقائياً.',
      ]},
      { icon: '⬇️', title: 'تصدير واستيراد', items: [
        'اضغط "تصدير JSON" لتحميل ملف كامل على جهازك.',
        'أرسله لنفسك بالبريد أو احفظه على Drive يدوياً.',
        'عند تغيير الجهاز: استخدم "استيراد ملف" لاستعادة كل البيانات.',
      ]},
      { icon: '↩️', title: 'استعادة نسخة', items: [
        'من قائمة النسخ اضغط "↩ استعادة" بجانب أي نسخة.',
        'النظام يحفظ نسخة احتياطية تلقائية قبل الاستعادة.',
      ]},
      { icon: '⚠️', title: 'تنبيه مهم', items: [
        'المزامنة تعمل فقط عندما يكون التطبيق مفتوحاً في المتصفح.',
        'صدِّر ملف JSON بانتظام لضمان الحماية من مسح بيانات المتصفح.',
      ]},
    ]
  },

  sig: {
    title: 'توقيع المتابع',
    icon: '✍️',
    color: '#fcd34d',
    intro: 'إضافة توقيع المعلم أو ولي الأمر على التقارير.',
    sections: [
      { icon: '✍️', title: 'رسم التوقيع', items: ['استخدم الإصبع أو الماوس لرسم توقيعك في المربع.', 'اضغط "مسح" لإعادة الرسم من البداية.'] },
      { icon: '💾', title: 'الحفظ', items: ['اضغط "حفظ التوقيع" ليُستخدم تلقائياً في التقارير.'] },
    ]
  },

  notifs: {
    title: 'الإشعارات',
    icon: '🔔',
    color: '#f59e0b',
    intro: 'تتبع أهم الأحداث والتنبيهات في التطبيق.',
    sections: [
      { icon: '🔔', title: 'أنواع الإشعارات', items: ['تظهر تنبيهات عند حدوث تغييرات مهمة كتسجيل غياب مرتفع أو اقتراب موعد.'] },
      { icon: '✅', title: 'إدارة الإشعارات', items: ['اضغط على الإشعار لتحديده كمقروء.', 'يمكن حذف جميع الإشعارات دفعة واحدة.'] },
    ]
  },

  kashef: {
    title: 'كشف الدرجات',
    icon: '📋',
    color: '#e2e8f0',
    intro: 'عرض وطباعة كشف الدرجات الرسمي للفصل.',
    sections: [
      { icon: '🏫', title: 'اختيار الفصل', items: ['اختر الفصل المطلوب من القائمة لعرض كشفه.'] },
      { icon: '🖨️', title: 'الطباعة', items: ['اضغط "طباعة" لطباعة الكشف مباشرة.', 'يمكن تصديره كـ PDF من إعدادات الطباعة.'] },
    ]
  },
};

// ── عرض المساعدة حسب الصفحة الحالية ─────────────────
window.showPageHelp = function(){
  var page = window._currentPage || 'home';
  var data = HELP[page] || HELP['home'];
  _showHelpModal(data);
};

// ── عرض مودال المساعدة ───────────────────────────────
function _showHelpModal(data){
  // إزالة مودال سابق إن وجد
  var existing = document.getElementById('helpModalOverlay');
  if(existing) existing.remove();

  var mo = document.createElement('div');
  mo.id = 'helpModalOverlay';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .15s ease;';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };

  var sections = (data.sections||[]).map(function(sec){
    var items = (sec.items||[]).map(function(item){
      return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:5px;">'
        +'<span style="color:'+data.color+';flex-shrink:0;margin-top:2px;">•</span>'
        +'<span style="font-size:11px;color:#94a3b8;line-height:1.65;">'+item+'</span>'
        +'</div>';
    }).join('');
    return '<div style="background:#1e293b;border-radius:10px;padding:12px 14px;border-right:3px solid '+data.color+';margin-bottom:8px;">'
      +'<div style="font-size:11px;font-weight:800;color:'+data.color+';margin-bottom:7px;">'+sec.icon+' '+sec.title+'</div>'
      +items
      +'</div>';
  }).join('');

  mo.innerHTML =
    '<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:16px;width:100%;max-width:460px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;direction:rtl;font-family:Cairo,sans-serif;">'
      // رأس
      +'<div style="background:linear-gradient(135deg,#0a1628,#1e3a5f);padding:15px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
        +'<span style="font-size:28px;">'+data.icon+'</span>'
        +'<div style="flex:1;">'
          +'<div style="font-size:14px;font-weight:900;color:#f1f5f9;">مساعدة: '+data.title+'</div>'
          +'<div style="font-size:9.5px;color:#64748b;margin-top:2px;">'+data.intro+'</div>'
        +'</div>'
        +'<button onclick="document.getElementById(\'helpModalOverlay\').remove()" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#94a3b8;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:15px;font-family:Cairo,sans-serif;flex-shrink:0;">✕</button>'
      +'</div>'
      // محتوى
      +'<div style="overflow-y:auto;padding:14px 16px;flex:1;">'
        +sections
        // نصيحة عامة
        +'<div style="background:#0a1628;border:1px dashed #1e3a5f;border-radius:8px;padding:10px 12px;margin-top:4px;">'
          +'<div style="font-size:9.5px;color:#475569;line-height:1.7;">💡 <strong style="color:#64748b;">نصيحة:</strong> جميع التغييرات تُحفظ تلقائياً في المتصفح. للحماية من الفقدان استخدم صفحة <strong style="color:#3b82f6;">النسخ الاحتياطي</strong>.</div>'
        +'</div>'
      +'</div>'
      // زر إغلاق
      +'<div style="padding:12px 16px;border-top:1px solid #1e293b;text-align:center;flex-shrink:0;">'
        +'<button onclick="document.getElementById(\'helpModalOverlay\').remove()" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;color:white;padding:9px 40px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;font-family:Cairo,sans-serif;">فهمت ✓</button>'
      +'</div>'
    +'</div>';

  document.body.appendChild(mo);
}

// ── تتبع الصفحة الحالية لعرض مساعدة صحيحة ───────────
var _origSwitch = window.switchPage;
window.switchPage = function(p){
  window._currentPage = p;
  if(typeof _origSwitch === 'function') _origSwitch(p);
};

// ── animation ────────────────────────────────────────
var st = document.createElement('style');
st.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}';
document.head.appendChild(st);

})();


// ══════════════════════════════


if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    setTimeout(function(){
      navigator.serviceWorker.register('/grades-project/sw.js')
        .then(function(reg){ console.log('SW registered'); })
        .catch(function(err){ console.log('SW error', err); });
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


function cycleAbsCol(){
  var cls=WKS.activeClass||(DB.classes&&DB.classes[0])||'';
  var week=WKS.activeWeek||1;
  var absCols=[];
  try{absCols=buildAbsCols(cls,week);}catch(e){}
  // دورة: -1 (بدون) → 0 → 1 → ... → n-1 → -1
  var cur=(WKS.cardAbsCol===undefined||WKS.cardAbsCol===null)?-1:WKS.cardAbsCol;
  var next=cur+1;
  if(next>=absCols.length)next=-1;
  WKS.cardAbsCol=next;
  updateAbsColToggleBtn();
  if(typeof renderWeekly==='function')renderWeekly();
  if(typeof _csRefreshActive==='function')_csRefreshActive();
}
function updateAbsColToggleBtn(){
  var btn=document.getElementById('absColToggleBtn');
  var lbl=document.getElementById('absColToggleLbl');
  if(!btn||!lbl)return;
  var cls=WKS.activeClass||(DB.classes&&DB.classes[0])||'';
  var week=WKS.activeWeek||1;
  var absCols=[];
  try{absCols=buildAbsCols(cls,week);}catch(e){}
  var cur=(WKS.cardAbsCol===undefined||WKS.cardAbsCol===null)?-1:WKS.cardAbsCol;
  var isActive=cur>=0&&absCols[cur];
  if(isActive){
    lbl.textContent=absCols[cur].label||('ف'+(cur+1));
    btn.style.color='#fbbf24';
    btn.title='الغياب: '+lbl.textContent+' — اضغط للتبديل';
  } else {
    lbl.textContent='بدون';
    btn.style.color='#475569';
    btn.title='تبديل فترة الغياب';
  }
}
// تحديث الزر عند أي render — يعمل بعد تهيئة الصفحة
setTimeout(function(){updateAbsColToggleBtn();},800);

function openCardsSettings(){
  _csRefreshActive();
  document.getElementById('cardsSettingsModal').style.display='flex';
}
function closeCardsSettings(){
  document.getElementById('cardsSettingsModal').style.display='none';
}
function _csRefreshActive(){
  var layout=WKS.cardLayout||'single';
  var photoFit=WKS.photoFit||'contain';
  var ON_BG='#1d4ed8'; var ON_CL='white'; var ON_BD='#3b82f6';
  var OFF_BG='#0a1628'; var OFF_CL='#475569'; var OFF_BD='#1e3a5f';
  function _applyBtn(id, active){
    var el=document.getElementById(id);
    if(!el)return;
    el.style.background=active?ON_BG:OFF_BG;
    el.style.color=active?ON_CL:OFF_CL;
    el.style.borderColor=active?ON_BD:OFF_BD;
  }
  _applyBtn('csLayoutSingle', layout==='single');
  _applyBtn('csLayoutGrid',   layout==='grid');
  _applyBtn('csPhotoMorona',  photoFit==='cover');
  _applyBtn('csPhotoFixed',   photoFit==='contain');
  var absContainer=document.getElementById('csAbsCols');
  if(!absContainer)return;
  absContainer.innerHTML='';
  var absCols=[];
  try{absCols=buildAbsCols(WKS.activeClass||(DB.classes[0]||''),WKS.activeWeek||1);}catch(e){}
  var noneActive=(WKS.cardAbsCol===undefined||WKS.cardAbsCol===null||WKS.cardAbsCol===-1);
  function _mkAbsBtn(label, clickFn, active, danger){
    var btn=document.createElement('button');
    btn.textContent=label;
    btn.style.cssText='padding:9px 16px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;border:2px solid;transition:all .15s;';
    if(active && danger){btn.style.background='rgba(220,38,38,.3)';btn.style.color='#fca5a5';btn.style.borderColor='#ef4444';}
    else if(active){btn.style.background='#1e293b';btn.style.color='#94a3b8';btn.style.borderColor='#475569';}
    else{btn.style.background='#0a1628';btn.style.color='#334155';btn.style.borderColor='#1e293b';}
    btn.onclick=clickFn;
    return btn;
  }
  absContainer.appendChild(_mkAbsBtn('بدون', function(){WKS.cardAbsCol=-1;renderWeekly();_csRefreshActive();}, noneActive, false));
  absCols.forEach(function(col,ai){
    var isAct=(WKS.cardAbsCol===ai);
    absContainer.appendChild(_mkAbsBtn(col.label, function(){WKS.cardAbsCol=ai;renderWeekly();_csRefreshActive();}, isAct, true));
  });
}
var _csModal=document.getElementById('cardsSettingsModal');
if(_csModal)_csModal.addEventListener('click',function(e){if(e.target===this)closeCardsSettings();});


// ══════════════════════════════


function openDictSettings(){
  var conf=typeof DS!=="undefined"?DS.conf:60;
  var sep=typeof DS!=="undefined"?DS.sep:"";
  var r=document.getElementById("dsConfRange");
  var v=document.getElementById("dsConfVal");
  var n=document.getElementById("dsConfNum");
  var s=document.getElementById("dsSepInp");
  if(r)r.value=conf;
  if(v)v.textContent=conf+"%";
  if(n)n.value=conf;
  if(s)s.value=sep||"";
  document.getElementById("dictSettingsModal").style.display="flex";
}
function closeDictSettings(){
  document.getElementById("dictSettingsModal").style.display="none";
}
function saveDictSettings(){
  var n=document.getElementById("dsConfNum");
  var s=document.getElementById("dsSepInp");
  var conf=Math.min(100,Math.max(10,Number(n&&n.value)||60));
  var sep=(s&&s.value.trim())||"التالي";
  if(typeof DS!=="undefined"){DS.conf=conf;DS.sep=sep;}
  closeDictSettings();
  if(typeof renderDict==="function")renderDict();
}
var _dsModal=document.getElementById("dictSettingsModal");
if(_dsModal)_dsModal.addEventListener("click",function(e){if(e.target===this)closeDictSettings();});


/* ══════════════════════════════════════════════════════════════
   وضع لوحة المفاتيح — Numpad Mode
   ══════════════════════════════════════════════════════════════ */

if(!WKS.numpadStudent) WKS.numpadStudent = null;
if(!WKS.numpadInput)   WKS.numpadInput   = '';
if(!WKS.numpadField)   WKS.numpadField   = 'assess'; // assess | hw | beh
if(!WKS.npTextInput)   WKS.npTextInput   = ''; // نص منطقة الإدخال

function renderWeeklyNumpad(cls, students, displayStudents, week, absCols, aF, hF, assessMax, hwMax) {
  var s   = WKS.numpadStudent;
  var fld = WKS.numpadField || 'assess';

  var h = '<div class="np2-wrap">';

  /* ══ منطقة الإدخال — الأعلى (textarea + mic + تأكيد فقط) ══ */
  h += '<div class="np2-top">';
  h += '<div class="np2-dictbar">';
  h += '<div class="np2-input-row">';
  h += '<textarea id="npDictInput" class="np2-dict-inp" rows="1"';
  h += ' placeholder="اسم الطالب أو رقمه + الدرجة — مثال: محمد 15  أو  5 15"';
  h += ' inputmode="none"';
  h += ' oninput="WKS.npTextInput=this.value;">';
  h += esc(WKS.npTextInput||'');
  h += '</textarea>';
  h += '<button class="np2-mic-btn" id="npMicBtn" onclick="_npMicToggle()" title="إملاء صوتي" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">🎤</button>';
  h += '<button class="np2-enter-btn" onclick="_npSubmit()" title="إدخال" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">✓</button>';
  h += '</div>';
  if(WKS.npStatus) {
    var stCls = WKS.npStatusType==='ok'?'np2-status-ok':WKS.npStatusType==='warn'?'np2-status-warn':WKS.npStatusType==='info'?'np2-status-info':'np2-status-err';
    h += '<div class="np2-status-box '+stCls+'"><span>'+esc(WKS.npStatus)+'</span></div>';
  }
  h += '</div>';
  h += '</div>'; /* np2-top */

  /* ══ المنتصف: بطاقة الطالب + أزرار الحقل ══ */
  h += '<div class="np2-middle">';

  if(WKS._npCandidates && WKS._npCandidates.length) {
    /* قائمة المرشحين */
    h += '<div class="np2-results np2-results-full">';
    WKS._npCandidates.forEach(function(st) {
      var stuIdx = (DB.data[cls]||[]).indexOf(st);
      var isSelected = s && s.id === st.id;
      var realNum = stuIdx + 1;
      var photo = st.photo || '';
      h += '<div class="np2-result-row'+(isSelected?' np2-result-sel':'')+'" onclick="_npPickCandidate(\''+esc(st.id)+'\','+stuIdx+')">';
      h += '<span class="np2-rnum">'+realNum+'</span>';
      if(photo) h += '<img class="np2-rphoto" src="'+photo+'">';
      else h += '<div class="np2-rphoto np2-rphoto-ph">'+realNum+'</div>';
      h += '<span class="np2-rname">'+esc(st.name)+'</span>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    /* بطاقة الطالب */
    h += '<div class="np2-middle-content">';
    if(s) {
      var photo = s.photo || '';
      var abs0 = getAbsenceState(cls, s.id, week, 0);
      var abs1 = getAbsenceState(cls, s.id, week, 1);
      var assessVal = s[aF]!==undefined&&s[aF]!==''?s[aF]:'—';
      var hwVal     = s[hF]!==undefined&&s[hF]!==''?s[hF]:'—';
      var behVal    = s['bw'+week]!==undefined&&s['bw'+week]!==''?s['bw'+week]:'—';

      h += '<div class="np2-card">';
      if(photo) h += '<img class="np2-card-photo" src="'+photo+'">';
      else       h += '<div class="np2-card-photo np2-card-photo-ph">'+(WKS.numpadStudentIdx+1)+'</div>';
      h += '<div class="np2-card-body">';
      h += '<div class="np2-card-name">'+esc(s.name)+'</div>';
      h += '<div class="np2-all-grades">';
      h += '<div class="np2-grade-cell'+(fld==='hw'?' active':'')+'"><span class="np2-grade-lbl">واجب</span><span class="np2-grade-val" id="npGradeHw">'+esc(String(hwVal))+'</span><span class="np2-grade-max">/'+hwMax+'</span></div>';
      h += '<div class="np2-grade-cell'+(fld==='assess'?' active':'')+'"><span class="np2-grade-lbl">تقييم</span><span class="np2-grade-val" id="npGradeAssess">'+esc(String(assessVal))+'</span><span class="np2-grade-max">/'+assessMax+'</span></div>';
      h += '<div class="np2-grade-cell'+(fld==='beh'?' active':'')+'"><span class="np2-grade-lbl">سلوك</span><span class="np2-grade-val" id="npGradeBeh">'+esc(String(behVal))+'</span><span class="np2-grade-max">/10</span></div>';
      h += '</div>';
      h += '<div class="np2-abs-row">';
      if(absCols.length>0) h += '<button class="np2-abs-btn'+(abs0==='abs'?' on':abs0==='sick'?' sick':'')+'" onclick="_npToggleAbs(0)" style="touch-action:manipulation;">'+(abs0==='abs'?'✓ غياب ف1':abs0==='sick'?'✓ مريض ف1':'غياب ف1')+'</button>';
      if(absCols.length>1) h += '<button class="np2-abs-btn'+(abs1==='abs'?' on':abs1==='sick'?' sick':'')+'" onclick="_npToggleAbs(1)" style="touch-action:manipulation;">'+(abs1==='abs'?'✓ غياب ف2':abs1==='sick'?'✓ مريض ف2':'غياب ف2')+'</button>';
      h += '</div>';
      h += '</div></div>'; /* np2-card-body, np2-card */
    } else {
      h += '<div class="np2-empty">✍️ أدخل اسم الطالب أعلاه</div>';
    }
    /* ══ أزرار الحقل: واجب | تقييم | سلوك — تحت البطاقة ══ */
    h += '<div class="np2-ftabs np2-field-tabs" id="npFtabs">';
    h += '<button class="np2-ftab'+(fld==='hw'?' on':'')+'" id="npTabHw" onclick="_npSetField(\'hw\')" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">واجب<span class="np2-ftab-max">/'+hwMax+'</span></button>';
    h += '<button class="np2-ftab'+(fld==='assess'?' on':'')+'" id="npTabAssess" onclick="_npSetField(\'assess\')" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">تقييم<span class="np2-ftab-max">/'+assessMax+'</span></button>';
    h += '<button class="np2-ftab'+(fld==='beh'?' on':'')+'" id="npTabBeh" onclick="_npSetField(\'beh\')" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">سلوك<span class="np2-ftab-max">/10</span></button>';
    h += '</div>';
    h += '</div>'; /* np2-middle-content */
  }
  h += '</div>'; /* np2-middle */

  /* ══ لوحة المفاتيح — الأسفل مثبتة ══ */
  h += '<div class="np2-keyboard">';
  /* صف 1: 1-2-3-4-5 */
  h += '<div class="np2-kb-row np2-kb-row5">';
  [1,2,3,4,5].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  /* صف 2: 6-7-8-9-0 */
  h += '<div class="np2-kb-row np2-kb-row5">';
  [6,7,8,9,0].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  /* صف 3: شطرة مائلة + مسطرة + تراجع + مسح */
  h += '<div class="np2-kb-row np2-kb-row4">';
  h += '<button class="np2-key np2-slash" onclick="_npKeyPress(\'/\')">/</button>';
  h += '<button class="np2-key np2-under" onclick="_npKeyPress(\'_\')">_</button>';
  h += '<button class="np2-key np2-del" onclick="_npKeyBackspace()">⌫</button>';
  h += '<button class="np2-key np2-clr" onclick="_npKeyReset()">✕</button>';
  h += '</div>';
  h += '</div>'; /* np2-keyboard */

  h += '</div>'; /* np2-wrap */
  return h;
}

/* ── دوال مساعدة ── */
function getAbsenceState(cls, studentId, week, colIndex) {
  var abs = getStudentAbsences(cls, studentId);
  return abs['w'+week+'_ci'+colIndex] || null;
}

function _npPickCandidate(id, stuIdx) {
  var cls = WKS.activeClass;
  var st = (DB.data[cls]||[]).find(function(s){ return s.id==id; });
  if(!st) return;
  WKS.numpadStudent = st;
  WKS.numpadStudentIdx = stuIdx;
  WKS._npCandidates = null;
  WKS._npDirectMode = true;
  WKS.npTextInput = '';
  WKS.npStatus = '👤 ' + st.name + ' — أدخل الدرجة';
  renderWeekly();
}

function _npSelectStudent(id, stuIdx) {
  var cls = WKS.activeClass;
  var st = (DB.data[cls]||[]).find(function(s){ return s.id==id; });
  if(!st) return;
  WKS.numpadStudent = st;
  WKS.numpadStudentIdx = stuIdx;
  WKS.numpadInput = '';
  renderWeekly();
}

function _npPress(n) {
  if(!WKS.numpadStudent) return;
  var cls = WKS.activeClass;
  var week = WKS.activeWeek;
  var fld  = WKS.numpadField || 'assess';
  var aF   = 'a'+week, hF = 'h'+week, bF = 'bw'+week;
  var curField = fld==='assess'?aF : fld==='hw'?hF : bF;
  var maxVal   = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : 10;

  var cur = WKS.numpadInput || '';
  var next = cur + String(n);
  var num  = Number(next);

  if(num > maxVal) next = String(maxVal);
  WKS.numpadInput = next;

  /* حفظ مباشر */
  var stuIdx = WKS.numpadStudentIdx;
  var val = clamp(Number(WKS.numpadInput)||0, 0, maxVal);
  gradesSetField(stuIdx, curField, val);

  /* تحديث الشاشة فقط بدون إعادة رسم كاملة */
  _npRefreshDisplay();
}

function _npDel() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput = (WKS.numpadInput||'').slice(0,-1);
  _npRefreshDisplay();
  if(WKS.numpadInput==='') {
    /* حفظ القيمة الحالية المحذوفة */
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:'bw'+week;
    gradesSetField(WKS.numpadStudentIdx, curField, '');
  }
}

function _npClear() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput='';
  var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
  var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:'bw'+week;
  gradesSetField(WKS.numpadStudentIdx, curField, '');
  _npRefreshDisplay();
}

function _npToggleAbs(colIndex) {
  if(!WKS.numpadStudent) return;
  var cls=WKS.activeClass, week=WKS.activeWeek;
  toggleAbsence(cls, WKS.numpadStudent.id, week, colIndex);
  /* تحديث كائن الطالب في WKS */
  var st=(DB.data[cls]||[]).find(function(s){return s.id==WKS.numpadStudent.id;});
  if(st){ WKS.numpadStudent=st; WKS.numpadStudentIdx=(DB.data[cls]||[]).indexOf(st); }
  renderWeekly();
}

/* تبديل الحقل — تحديث فوري للـ UI بدون re-render كامل */
function _npSetField(fld) {
  WKS.numpadField = fld;
  /* active على أزرار التبويب */
  ['hw','assess','beh'].forEach(function(t) {
    var id = 'npTab' + t.charAt(0).toUpperCase() + t.slice(1);
    var btn = document.getElementById(id);
    if(btn) btn.className = 'np2-ftab' + (fld===t?' on':'');
  });
  /* active على خلايا الدرجات */
  var map = {assess:'npGradeAssess', hw:'npGradeHw', beh:'npGradeBeh'};
  Object.keys(map).forEach(function(k) {
    var el = document.getElementById(map[k]);
    if(el) {
      var cell = el.closest ? el.closest('.np2-grade-cell') : null;
      if(cell) cell.className = 'np2-grade-cell' + (fld===k?' active':'');
    }
  });
  _npRefreshDisplay();
}

function _npRefreshDisplay() {
  var s=WKS.numpadStudent, inp=WKS.numpadInput||'', fld=WKS.numpadField||'assess';
  var week=WKS.activeWeek;
  var aF='a'+week, hF='h'+week, bF='bw'+week;
  var curField=fld==='assess'?aF:fld==='hw'?hF:bF;
  var curVal=s?s[curField]:undefined;

  /* تحديث خلايا الدرجات الثلاث */
  if(s) {
    var assessVal = inp!==''&&fld==='assess'?inp:(s[aF]!==undefined&&s[aF]!==''?s[aF]:'—');
    var hwVal     = inp!==''&&fld==='hw'    ?inp:(s[hF]!==undefined&&s[hF]!==''?s[hF]:'—');
    var behVal    = inp!==''&&fld==='beh'   ?inp:(s[bF]!==undefined&&s[bF]!==''?s[bF]:'—');
    var ga=document.getElementById('npGradeAssess');
    var gh=document.getElementById('npGradeHw');
    var gb=document.getElementById('npGradeBeh');
    if(ga) ga.textContent = String(assessVal);
    if(gh) gh.textContent = String(hwVal);
    if(gb) gb.textContent = String(behVal);
  }
}

function _getNpMax(type, week) {
  var assessMax=20, hwMax=10;
  (DB.colPages||[]).forEach(function(pg){
    pg.cols.forEach(function(col){
      if(col.field==='a'+week) assessMax=col.max;
      if(col.field==='h'+week) hwMax=col.max;
    });
  });
  return type==='assess'?assessMax:hwMax;
}

/* ── المايك الصوتي للإدخال ── */
/* ══════════════════════════════════════════════════════
   نظام الإملاء الصوتي — Online + Offline (Whisper.js)
   ══════════════════════════════════════════════════════ */

var _npMicRec        = null;
var _npWhisperReady  = false;   /* هل النموذج محمّل؟ */
var _npWhisperLoading = false;  /* هل التحميل جارٍ؟ */
var _npWhisperPipe   = null;    /* pipeline instance */
var _npMediaStream   = null;    /* MediaStream للمايك */
var _npMediaRecorder = null;    /* MediaRecorder للـ offline */
var _npAudioChunks   = [];

/* ── تحميل Whisper (مرة واحدة فقط، يُخزَّن في Cache API) ── */
async function _npLoadWhisper() {
  if(_npWhisperReady || _npWhisperLoading) return;

  var btn = document.getElementById('npMicBtn');

  /* ── فحص: هل النموذج محمّل مسبقاً في الكاش؟ ── */
  var cachedOk = false;
  try {
    var cacheKeys = await caches.keys();
    for(var ck of cacheKeys) {
      var c = await caches.open(ck);
      var reqs = await c.keys();
      if(reqs.some(function(r){ return r.url && r.url.indexOf('whisper') >= 0; })) {
        cachedOk = true; break;
      }
    }
  } catch(e) { /* Cache API غير متاحة — نكمل */ }

  /* ── لو مفيش نت ومش محمّل في الكاش → رسالة واضحة بدل الفشل ── */
  if(!navigator.onLine && !cachedOk && !window._transformersReady) {
    WKS.npStatus = '📶 النموذج المحلي يحتاج نت للتحميل أول مرة (~40MB) — شغّل النت ثم اضغط 🎤 مجدداً';
    WKS.npStatusType = 'warn';
    _npRenderStatus();
    if(btn) { btn.textContent = '🎤'; btn.title = 'إملاء صوتي'; }
    showSnack('📶 شغّل النت لتحميل نموذج الإملاء المحلي (مرة واحدة فقط)');
    return;
  }

  _npWhisperLoading = true;
  if(btn) { btn.textContent = '⏳'; btn.title = 'جارٍ تحميل نموذج الإملاء...'; }
  WKS.npStatus = cachedOk
    ? 'جارٍ تهيئة النموذج من الكاش...'
    : 'جارٍ تحميل نموذج الإملاء المحلي (~40MB)...';
  WKS.npStatusType = 'info';
  _npRenderStatus();

  try {
    /* تحميل transformers.js من CDN (يُخزَّن تلقائياً في Cache) */
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
        var t = setTimeout(function(){ reject(new Error('timeout — تحقق من اتصال النت')); }, 15000);
        window.addEventListener('transformers-ready', function() {
          clearTimeout(t); resolve();
        }, { once: true });
      });
    }

    WKS.npStatus = 'تحميل النموذج (قد يستغرق دقيقة أول مرة)...';
    WKS.npStatusType = 'info';
    _npRenderStatus();

    _npWhisperPipe = await window._transformersPipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      {
        progress_callback: function(p) {
          if(p.status === 'progress' && p.total) {
            var pct = Math.round((p.loaded / p.total) * 100);
            WKS.npStatus = 'تحميل النموذج: ' + pct + '%';
            WKS.npStatusType = 'info';
            _npRenderStatus();
          }
        }
      }
    );

    _npWhisperReady  = true;
    _npWhisperLoading = false;
    WKS.npStatus = '✅ النموذج جاهز — اضغط 🎤 مجدداً للإملاء';
    WKS.npStatusType = 'ok';
    _npRenderStatus();
    if(btn) { btn.textContent = '🎤'; btn.title = 'إملاء صوتي (محلي)'; }

  } catch(err) {
    _npWhisperLoading = false;
    var errMsg = err.message || '';
    if(!navigator.onLine || errMsg.indexOf('timeout') >= 0 || errMsg.indexOf('fetch') >= 0) {
      WKS.npStatus = '📶 فشل التحميل — النموذج يحتاج نت أول مرة. شغّل النت ثم اضغط 🎤';
      WKS.npStatusType = 'warn';
    } else {
      WKS.npStatus = '❌ فشل تحميل النموذج: ' + errMsg;
      WKS.npStatusType = 'err';
    }
    _npRenderStatus();
    if(btn) { btn.textContent = '🎤'; btn.title = 'إملاء صوتي'; }
  }
}

/* ── تحديث صندوق الحالة بدون re-render كامل ── */
function _npRenderStatus() {
  /* نبحث عن صندوق الحالة الموجود ونحدّثه، أو نضيفه */
  var top = document.querySelector('.np2-top .np2-dictbar');
  if(!top) return;
  var existing = top.querySelector('.np2-status-box');
  if(WKS.npStatus) {
    var stCls = WKS.npStatusType==='ok'?'np2-status-ok'
               :WKS.npStatusType==='warn'?'np2-status-warn'
               :WKS.npStatusType==='info'?'np2-status-info':'np2-status-err';
    if(existing) {
      existing.className = 'np2-status-box ' + stCls;
      existing.innerHTML = '<span>' + WKS.npStatus + '</span>';
    } else {
      var d = document.createElement('div');
      d.className = 'np2-status-box ' + stCls;
      d.innerHTML = '<span>' + WKS.npStatus + '</span>';
      top.appendChild(d);
    }
  } else if(existing) {
    existing.remove();
  }
}

/* ── تسجيل صوتي عبر MediaRecorder ثم إرساله لـ Whisper ── */
async function _npWhisperRecord() {
  var btn = document.getElementById('npMicBtn');

  /* إيقاف لو كان يسجّل */
  if(_npMediaRecorder && _npMediaRecorder.state === 'recording') {
    _npMediaRecorder.stop();
    return;
  }

  try {
    _npMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _npAudioChunks = [];
    _npMediaRecorder = new MediaRecorder(_npMediaStream);

    _npMediaRecorder.ondataavailable = function(e) {
      if(e.data.size > 0) _npAudioChunks.push(e.data);
    };

    _npMediaRecorder.onstop = async function() {
      /* أوقف المايك */
      _npMediaStream.getTracks().forEach(function(t){ t.stop(); });
      if(btn) { btn.textContent='⚙️'; btn.style.background='rgba(99,102,241,.3)'; }
      WKS.npStatus = 'جارٍ التعرف على الكلام...';
      WKS.npStatusType = 'info';
      _npRenderStatus();

      try {
        var blob = new Blob(_npAudioChunks, { type: 'audio/webm' });
        var arrayBuffer = await blob.arrayBuffer();
        /* Whisper يحتاج Float32Array */
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        var decoded = await audioCtx.decodeAudioData(arrayBuffer);
        var float32 = decoded.getChannelData(0);

        var result = await _npWhisperPipe(float32, {
          language: 'arabic',
          task: 'transcribe',
          chunk_length_s: 30,
        });

        var txt = (result.text || '').trim();
        if(txt) {
          var ta = document.getElementById('npDictInput');
          if(ta) { ta.value = txt; WKS.npTextInput = txt; }
          WKS.npStatus = '✅ ' + txt;
          WKS.npStatusType = 'ok';
          _npRenderStatus();
          setTimeout(_npSubmit, 300);
        } else {
          WKS.npStatus = '⚠️ لم يُتعرَّف على كلام واضح';
          WKS.npStatusType = 'warn';
          _npRenderStatus();
        }
      } catch(err) {
        WKS.npStatus = '❌ خطأ في التعرف: ' + (err.message||'');
        WKS.npStatusType = 'err';
        _npRenderStatus();
      }

      if(btn) { btn.textContent='🎤'; btn.style.background=''; btn.style.borderColor=''; }
      _npMediaRecorder = null;
    };

    _npMediaRecorder.start();
    if(btn) { btn.textContent='🔴'; btn.style.background='rgba(239,68,68,.3)'; btn.style.borderColor='#dc2626'; btn.title='اضغط لإيقاف التسجيل'; }
    WKS.npStatus = '🔴 جارٍ التسجيل... اضغط 🔴 للإيقاف';
    WKS.npStatusType = 'info';
    _npRenderStatus();

  } catch(err) {
    WKS.npStatus = '❌ لا يمكن الوصول للمايك: ' + (err.message||'');
    WKS.npStatusType = 'err';
    _npRenderStatus();
  }
}

/* ── الدالة الرئيسية: تختار Online أو Offline تلقائياً ── */
function _npMicToggle() {
  var btn = document.getElementById('npMicBtn');

  /* إيقاف السجلات الجارية */
  if(_npMicRec && _npMicRec.state === 'recording') { _npMicRec.stop(); return; }
  if(_npMediaRecorder && _npMediaRecorder.state === 'recording') { _npMediaRecorder.stop(); return; }

  var isOnline = navigator.onLine;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if(isOnline && SR) {
    /* ══ وضع Online: SpeechRecognition العادية ══ */
    _npMicRec = new SR();
    _npMicRec.lang = 'ar-EG';
    _npMicRec.interimResults = false;
    _npMicRec.continuous = false;
    _npMicRec.onstart = function() {
      if(btn) { btn.textContent='🔴'; btn.style.background='rgba(239,68,68,.3)'; btn.style.borderColor='#dc2626'; }
    };
    _npMicRec.onresult = function(e) {
      var txt = e.results[0][0].transcript || '';
      var ta = document.getElementById('npDictInput');
      if(ta) { ta.value = txt; WKS.npTextInput = txt; }
      setTimeout(_npSubmit, 100);
    };
    _npMicRec.onerror = function(e) {
      /* لو انقطع النت أثناء التسجيل — انتقل لـ Whisper */
      if(e.error === 'network' || e.error === 'service-not-allowed') {
        showSnack('📶 انقطع النت — جارٍ التبديل للنموذج المحلي...');
        _npMicRec = null;
        if(btn) { btn.textContent='🎤'; btn.style.background=''; btn.style.borderColor=''; }
        _npWhisperReady ? _npWhisperRecord() : _npLoadWhisper();
      } else {
        showSnack('❌ خطأ في المايك: ' + (e.error||''));
      }
    };
    _npMicRec.onend = function() {
      _npMicRec = null;
      if(btn) { btn.textContent='🎤'; btn.style.background=''; btn.style.borderColor=''; }
    };
    _npMicRec.start();

  } else {
    /* ══ وضع Offline: Whisper محلي ══ */
    if(_npWhisperReady) {
      _npWhisperRecord(); /* النموذج جاهز — سجّل مباشرة */
    } else if(_npWhisperLoading) {
      showSnack('⏳ النموذج لا يزال يُحمَّل، انتظر قليلاً...');
    } else {
      _npLoadWhisper();   /* سيفحص الكاش والنت ويعطي رسالة مناسبة */
    }
  }
}


function _npKeyPress(ch) {
  if(WKS._npDirectMode && WKS.numpadStudent) {
    var cls=WKS.activeClass, week=WKS.activeWeek, fld=WKS.numpadField||'assess';
    var aF='a'+week, hF='h'+week, bF='bw'+week;
    var curField=fld==='assess'?aF:fld==='hw'?hF:bF;
    var maxVal=fld==='assess'?_getNpMax('assess',week):fld==='hw'?_getNpMax('hw',week):10;
    var cur=WKS.numpadInput||'';
    var next=cur+String(ch);
    if(/^\d+$/.test(next)&&Number(next)>maxVal) next=String(maxVal);
    WKS.numpadInput=next;
    if(/^\d+$/.test(next)) gradesSetField(WKS.numpadStudentIdx, curField, clamp(Number(next),0,maxVal));
    _npRefreshDisplay();
  } else {
    _npPressToInput(ch);
  }
}
function _npKeyBackspace() {
  if(WKS._npDirectMode && WKS.numpadStudent) _npDel();
  else _npDelFromInput();
}
function _npKeyReset() {
  if(WKS._npDirectMode && WKS.numpadStudent) {
    WKS.numpadInput='';
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    gradesSetField(WKS.numpadStudentIdx, fld==='assess'?'a'+week:fld==='hw'?'h'+week:'bw'+week, '');
    WKS._npDirectMode=false; WKS.numpadStudent=null; WKS.npStatus='';
    renderWeekly();
  } else {
    _npClearInput();
  }
}

/* ── دوال الإدخال النصي (اللوحة تكتب في textarea) ── */

function _npPressToInput(ch) {
  var ta = document.getElementById('npDictInput');
  if(ta) {
    ta.value += String(ch);
    WKS.npTextInput = ta.value;
  } else {
    WKS.npTextInput = (WKS.npTextInput||'') + String(ch);
  }
}

function _npDelFromInput() {
  var ta = document.getElementById('npDictInput');
  if(ta) {
    ta.value = ta.value.slice(0,-1);
    WKS.npTextInput = ta.value;
  } else {
    WKS.npTextInput = (WKS.npTextInput||'').slice(0,-1);
  }
}

function _npClearInput() {
  var ta = document.getElementById('npDictInput');
  if(ta) ta.value = '';
  WKS.npTextInput = '';
  WKS.npStatus = '';
  var box = document.getElementById('npStatusBox');
  if(box) { box.style.display='none'; box.innerHTML=''; }
}

function _npSubmit() {
  var ta = document.getElementById('npDictInput');
  var raw = ta ? ta.value.trim() : (WKS.npTextInput||'').trim();
  if(!raw) return;

  var cls     = WKS.activeClass;
  var week    = WKS.activeWeek;
  var fld     = WKS.numpadField || 'assess';
  var aF='a'+week, hF='h'+week, bF='bw'+week;
  var curField = fld==='assess'?aF : fld==='hw'?hF : bF;
  var maxVal   = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : 10;
  var students = DB.data[cls] || [];

  /* فصل الاسم/الرقم عن الدرجة */
  var parts    = raw.trim().split(/\s+/);
  var gradeStr = null;
  var nameStr  = raw.trim();
  if(parts.length >= 2) {
    var last = parts[parts.length-1];
    if(/^\d+(\.\d+)?$/.test(last)) {
      gradeStr = last;
      nameStr  = parts.slice(0,-1).join(' ');
    }
  }

  /* بحث: رقم الطالب أو الاسم */
  var query   = nameStr.trim();
  var queryNum = parseInt(query, 10);
  var matched = students.filter(function(s, si) {
    /* بحث بالرقم */
    if(!isNaN(queryNum) && queryNum > 0 && (si+1) === queryNum) return true;
    /* بحث بالاسم */
    return s.name && s.name.indexOf(query) >= 0;
  });

  function _applyGradeToStudent(st, stuIdx) {
    WKS.numpadStudent    = st;
    WKS.numpadStudentIdx = stuIdx;
    WKS._npCandidates    = null;
    if(gradeStr !== null) {
      var val = clamp(Number(gradeStr), 0, maxVal);
      gradesSetField(stuIdx, curField, val);
      WKS.npStatus     = '✅ ' + st.name + ' — ' + val + '/' + maxVal;
      WKS.npStatusType = 'ok';
      if(ta) ta.value = '';
      WKS.npTextInput = '';
      WKS._npDirectMode = false;
      WKS.numpadInput   = '';
    } else {
      WKS.npStatus     = '👤 ' + st.name + ' — أدخل الدرجة بلوحة الأرقام';
      WKS.npStatusType = 'info';
      if(ta) ta.value = '';
      WKS.npTextInput  = '';
      WKS._npDirectMode = true;
      WKS.numpadInput   = '';
    }
    renderWeekly();
  }

  if(matched.length === 0) {
    WKS.npStatus     = '❌ لم يُعثر على: ' + nameStr;
    WKS.npStatusType = 'err';
    renderWeekly();
    return;
  }

  if(matched.length === 1) {
    _applyGradeToStudent(matched[0], students.indexOf(matched[0]));
    return;
  }

  /* عدة نتائج — قائمة منبثقة */
  _npShowPopup(matched, students, function(st) {
    _applyGradeToStudent(st, students.indexOf(st));
  });
}

function _npShowPopup(candidates, allStudents, onPick) {
  /* احذف أي popup قديم */
  var old = document.getElementById('npPopup');
  if(old) old.parentNode.removeChild(old);

  var ta = document.getElementById('npDictInput');
  var wrap = ta ? ta.closest('.np2-wrap') : null;

  var pop = document.createElement('div');
  pop.id = 'npPopup';
  pop.className = 'np2-popup';

  var inner = '<div class="np2-popup-hdr">';
  inner += '<span>🔍 اختر الطالب</span>';
  inner += '<button onclick="document.getElementById(\'npPopup\').remove()" style="background:none;border:none;color:#f87171;font-size:18px;cursor:pointer;line-height:1;">✕</button>';
  inner += '</div>';
  inner += '<div class="np2-popup-list">';
  candidates.forEach(function(st) {
    var idx = allStudents.indexOf(st);
    var photo = st.photo || '';
    inner += '<div class="np2-popup-row" onclick="_npPopupPick(\''+esc(st.id)+'\')">';
    inner += '<span class="np2-rnum">'+(idx+1)+'</span>';
    if(photo) inner += '<img class="np2-rphoto" src="'+photo+'">';
    else inner += '<div class="np2-rphoto np2-rphoto-ph">'+(idx+1)+'</div>';
    inner += '<span class="np2-rname">'+esc(st.name)+'</span>';
    inner += '</div>';
  });
  inner += '</div>';
  pop.innerHTML = inner;

  /* حفظ المرشحين ودالة الاختيار للوصول من npPopupPick */
  window._npPopupCandidates = candidates;
  window._npPopupOnPick     = onPick;

  /* أضفه داخل np2-wrap ليكون فوق كل شيء */
  if(wrap) wrap.appendChild(pop);
  else document.body.appendChild(pop);
}

function _npPopupPick(id) {
  var pop = document.getElementById('npPopup');
  if(pop) pop.remove();
  var cls = WKS.activeClass;
  var st = (window._npPopupCandidates||[]).find(function(s){ return String(s.id)===String(id); });
  if(!st) st = (DB.data[cls]||[]).find(function(s){ return String(s.id)===String(id); });
  if(!st) return;
  if(window._npPopupOnPick) window._npPopupOnPick(st);
}



/* ── عند تحديد طالب مباشرة والضغط على رقم — يكتب على حقله ── */
function _npPress(n) {
  if(!WKS.numpadStudent || WKS._npDirectMode) {
    /* وضع مباشر: اكتب على حقل الطالب المحدد */
    if(!WKS.numpadStudent) return;
    var cls = WKS.activeClass, week = WKS.activeWeek;
    var fld = WKS.numpadField || 'assess';
    var aF='a'+week, hF='h'+week, bF='bw'+week;
    var curField = fld==='assess'?aF : fld==='hw'?hF : bF;
    var maxVal = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : 10;
    var cur = WKS.numpadInput || '';
    var next = cur + String(n);
    if(Number(next) > maxVal) next = String(maxVal);
    WKS.numpadInput = next;
    var val = clamp(Number(WKS.numpadInput)||0, 0, maxVal);
    gradesSetField(WKS.numpadStudentIdx, curField, val);
    _npRefreshDisplay();
  }
}

function _npDel() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput = (WKS.numpadInput||'').slice(0,-1);
  _npRefreshDisplay();
  if(WKS.numpadInput==='') {
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:'bw'+week;
    gradesSetField(WKS.numpadStudentIdx, curField, '');
  }
}

function _npClear() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput='';
  var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
  var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:'bw'+week;
  gradesSetField(WKS.numpadStudentIdx, curField, '');
  _npRefreshDisplay();
}

function _npPressChar(ch) {
  /* لم يعد مستخدماً في الوضع الجديد — يكتب في textarea */
  _npPressToInput(ch);
}

function _npOpenKeyboard() {
  var inp = document.getElementById('npDictInput');
  if(!inp) return;
  inp.removeAttribute('inputmode');
  inp.focus();
}


function _initNumpadEvents() {
  /* التركيز على البحث */
  setTimeout(function(){
    var inp=document.getElementById('npSearch');
    if(inp) inp.focus();
  }, 100);
}

