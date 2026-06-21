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
// إرجاع تاريخ أقرب حدوث (اليوم أو القادم) لرقم يوم الأسبوع dayIdx (0=السبت..6=الجمعة)
function _nextOccurrenceDate(dayIdx,fromDate){
  var from=fromDate?new Date(fromDate):new Date();
  from.setHours(0,0,0,0);
  // dayIdx: 0=السبت=JS6, 1=الأحد=JS0, 2=الإثنين=JS1 ... 6=الجمعة=JS5
  var jsTarget=(dayIdx===0)?6:(dayIdx-1);
  var cur=from.getDay();
  var diff=(jsTarget-cur+7)%7;
  var res=new Date(from);
  res.setDate(res.getDate()+diff);
  return res;
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
function clearAbsenceCol(cls,week,colIndex){
  if(!confirm('مسح غياب هذا العمود لجميع الطلاب؟'))return;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  students.forEach(function(s){
    var abs=getStudentAbsences(cls,s.id);
    var k="w"+week+"_ci"+colIndex;
    if(abs[k])delete abs[k];
  });
  saveDB();
  _refreshCurrentAndRelated();
}
function markAllAbsenceCol(cls,week,colIndex){
  if(!confirm('تسجيل كل الطلاب غائبين في هذا العمود؟'))return;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  students.forEach(function(s){
    var abs=getStudentAbsences(cls,s.id);
    var k="w"+week+"_ci"+colIndex;
    abs[k]="abs";
  });
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
      cols.push({period:{id:"g"+pi,label:"ف"+(pi+1)},dayIdx:pi%7,label:"ف"+(pi+1)});
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
  // فُكّ الربط التلقائي بين فترات الغياب وحقول الواجب/التقييم.
  // الآن يتم تحديد الحقل المتأثر (واجب/تقييم) من خلال الراصد حسب الحقل المحدد في بطاقة الطالب فقط.
  return;
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

// ── دالة عامة: هل هذه الخانة مشغولة (فصل أو مهمة)؟ تُستخدم في الرئيسية/الإشعارات/الأسبوعي ──
function isSlotFilled(val){
  return !!(val&&val.trim());
}
// إرجاع معلومات العرض لقيمة الخانة (فصل أو مهمة) — للاستخدام في الحلقة/العد التنازلي/الإشعارات
function getSlotDisplay(val){
  val=(val||"").trim();
  if(!val)return null;
  var isTask=DB.classes.indexOf(val)<0;
  var col=getClassColor(val);
  return{
    name:val,
    isTask:isTask,
    icon:isTask?"📝":"",
    color:col
  };
}
// نص جاهز للعرض في الحلقة/الإشعارات: يضيف 📝 إن كانت القيمة مهمة وليست فصلاً
function getSlotLabel(val){
  val=(val||"").trim();
  if(!val)return val;
  return DB.classes.indexOf(val)<0?("📝 "+val):val;
}
// إرجاع كل عناصر اليوم (فصول + مهام) لفترة معينة عبر كل الأيام — يجمع من الجدول الموحّد
function getTodaySchedule(dayIdx){
  var shared=(DB.schedule&&DB.schedule._shared)||{periods:[],slots:{}};
  var periods=shared.periods||[];
  var items=[];
  periods.forEach(function(p){
    var val=getUnifiedSlot(p.id,dayIdx);
    var disp=getSlotDisplay(val);
    if(disp)items.push({period:p,item:disp});
  });
  return items;
}

function getClassColor(cls){
  var idx=DB.classes.indexOf(cls);
  if(idx<0){
    // عنصر غير فصل (مهمة) — لون مميز ثابت
    return {bg:"#374151",text:"#e5e7eb",border:"#6b7280",light:"rgba(55,65,81,.25)"};
  }
  return CLASS_COLORS[idx%CLASS_COLORS.length];
}

// ── المهام (عناصر يمكن وضعها في الجدول وقد لا تكون فصلاً) ──
function getSchedTasks(){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  if(!DB.schedule._shared.tasks)DB.schedule._shared.tasks=[];
  return DB.schedule._shared.tasks;
}
function schedAddTask(){
  var name=prompt("اسم المهمة (مثال: مناقشة، احتياط، اجتماع):");
  if(name===null)return;
  name=name.trim();
  if(!name){showSnack("⚠️ أدخل اسماً للمهمة");return;}
  var tasks=getSchedTasks();
  if(tasks.indexOf(name)>=0||DB.classes.indexOf(name)>=0){showSnack("⚠️ هذا الاسم موجود مسبقاً");return;}
  tasks.push(name);
  saveDB();renderSched();
  showSnack("✅ تمت إضافة المهمة: "+name);
}
function schedDelTask(name){
  var tasks=getSchedTasks();
  var idx=tasks.indexOf(name);
  if(idx<0)return;
  if(!confirm('حذف المهمة "'+name+'"؟ سيتم إزالتها من أي خلايا تستخدمها.'))return;
  tasks.splice(idx,1);
  var shared=DB.schedule._shared||{};
  var once=shared.onceSlots||{};
  Object.keys(shared.slots||{}).forEach(function(k){
    if(shared.slots[k]===name){shared.slots[k]="";delete once[k];}
  });
  saveDB();renderSched();
  showSnack("✅ تم حذف المهمة");
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

// ── تكرار المهام: أسبوعي (دائم) أو مرة واحدة فقط ──
function _getOnceSlots(){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  if(!DB.schedule._shared.onceSlots)DB.schedule._shared.onceSlots={};
  return DB.schedule._shared.onceSlots;
}
function setUnifiedSlotOnce(pid,di,val){
  setUnifiedSlot(pid,di,val);
  var once=_getOnceSlots();
  var targetDate=_nextOccurrenceDate(di);
  once[pid+"_d"+di]=dateToStr(targetDate);
  saveDB();
}
function clearOnceFlag(pid,di){
  var once=_getOnceSlots();
  delete once[pid+"_d"+di];
  saveDB();
}
function isSlotOnce(pid,di){
  var once=_getOnceSlots();
  return!!once[pid+"_d"+di];
}
function _schedCleanupOnceSlots(){
  if(!DB.schedule._shared)return;
  var once=_getOnceSlots();
  var slots=DB.schedule._shared.slots||{};
  var today=new Date();today.setHours(0,0,0,0);
  var changed=false;
  Object.keys(once).forEach(function(k){
    var target=new Date(once[k]);
    if(today>target){
      if(slots[k])slots[k]="";
      delete once[k];
      changed=true;
    }
  });
  if(changed)saveDB();
}

// ── Time helpers for past/current/upcoming highlight ──
function _timeToMin(str){
  // "8:00-8:45" → end=525, or "8:00" → 480
  if(!str)return -1;
  var parts=str.split("-");
  var t=parts[parts.length-1].trim(); // take end time
  var m=t.match(/(\d+):(\d+)/);
  if(!m)return -1;
  return parseInt(m[1])*60+parseInt(m[2]);
}
function _timeStartMin(str){
  if(!str)return -1;
  var t=str.split("-")[0].trim();
  var m=t.match(/(\d+):(\d+)/);
  if(!m)return -1;
  return parseInt(m[1])*60+parseInt(m[2]);
}
function _todayDayIdx(){
  // JS: 0=Sun,...,6=Sat → app: 0=Sat,1=Sun,...,6=Fri
  return (new Date().getDay()+1)%7;
}
function _nowMin(){
  var n=new Date();
  return n.getHours()*60+n.getMinutes();
}
function renderSched(){
  var root=document.getElementById("schedRoot");
  if(!root)return;
  // حفظ موضع التمرير قبل إعادة البناء
  var _sb=root.querySelector('.sched-body');
  window._schedBodyScroll=_sb?_sb.scrollTop:0;

  // Migrate old per-class schedules to unified format if needed
  _schedMigrateToUnified();
  _schedCleanupOnceSlots();

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
  html+='<button class="btn btn-sm" onclick="schedAddTask()" style="background:linear-gradient(135deg,#374151,#4b5563);color:#e5e7eb;">📝 ＋ مهمة</button>';
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
  var _tasks=getSchedTasks();
  if(_tasks.length){
    html+='<span style="font-size:9px;color:#475569;align-self:center;margin-right:8px;">المهام: </span>';
    _tasks.forEach(function(t){
      html+='<span class="sched-legend-item" style="background:#374151;color:#e5e7eb;border:1px solid #6b7280;cursor:pointer;" title="حذف المهمة" onclick="schedDelTask(\''+esc(t).replace(/'/g,"\\'")+'\')">📝 '+esc(t)+' ✕</span>';
    });
  }
  html+='</div>';

  // ── Unified grid table ──
  // Build special periods config
  var sp=shared.specialPeriods||(shared.specialPeriods={});
  var spAssembly=sp.assembly||(sp.assembly={enabled:false,time:'',days:{},overrides:{}});
  var spBreak=sp.break||(sp.break={enabled:false,time:'',days:{},overrides:{}});

  // Determine which days have at least one class slot filled
  function daysWithSlots(){
    var d={};
    for(var di=0;di<7;di++){
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
    html+='<th class="period-hdr">';
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html+='<input class="ph-name" value="'+esc(period.label||('الفترة '+(pi+1)))+'"'
      +' onchange="schedRenamePeriod(\''+period.id+'\',this.value)"'
      +' style="background:transparent;border:none;border-bottom:1px dashed #334155;color:inherit;text-align:center;width:100%;font-size:inherit;font-weight:700;font-family:inherit;outline:none;cursor:text;padding:1px 2px;"'
      +'/>';
    // Time input
    html+='<input id="sti_'+period.id+'" value="'+esc(period.time||"")+'" placeholder="8:00-8:45"'
      +' class="ph-time-inp" autocomplete="off"'
      +' onfocus="schedTimeDropOpen(\''+period.id+'\')"'
      +' onblur="setTimeout(function(){schedTimeDropClose(\''+period.id+'\')},150)"'
      +' onchange="schedSetTimeUnified(\''+period.id+'\',this.value)"'
      +' oninput="schedTimeFilter(\''+period.id+'\')"'
      +'/>';
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
  var _todayIdx=_todayDayIdx();
  var _nowMinVal=_nowMin();
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
        html+='<button onclick="schedSpecialOverride(\'assembly\','+di+','+(dayIsActive?0:1)+')" style="background:rgba(16,185,129,.15);border:1px solid #059669;color:#6ee7b7;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إضافة</button>';
        html+='</div>';
      }
      html+='</td>';
    }

    var _isToday=(di===_todayIdx);
    periods.forEach(function(period){
      var val=getUnifiedSlot(period.id,di);
      var hasCls=val.trim().length>0;
      var col=hasCls?getClassColor(val):null;
      var cellStyle=hasCls?'background:'+col.light+';':'';
      // past/current/upcoming highlight
      var _endMin=_timeToMin(period.time);
      var _startMin=_timeStartMin(period.time);
      var _isPast=_isToday&&_endMin>=0&&_nowMinVal>_endMin;
      var _isCurrent=_isToday&&_startMin>=0&&_endMin>=0&&_nowMinVal>=_startMin&&_nowMinVal<=_endMin;
      if(_isPast)cellStyle+='opacity:0.38;filter:grayscale(60%);';
      else if(_isCurrent)cellStyle+='outline:2px solid #22d3ee;outline-offset:-2px;';
      html+='<td class="slot '+rowCls+(hasCls?' has-cls':'')+(_isPast?' slot-past':_isCurrent?' slot-current':(_isToday?' slot-upcoming':''))+'" style="'+cellStyle+'position:relative;">';
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
      var _tasks=getSchedTasks();
      if(_tasks.length){
        _tasks.forEach(function(t){
          html+='<option value="'+esc(t)+'"'+(val===t?" selected":"")
            +' style="background:#374151;color:#e5e7eb;">📝 '+esc(t)+'</option>';
        });
      }
      if(val&&!DB.classes.includes(val)&&_tasks.indexOf(val)<0){
        html+='<option value="'+esc(val)+'" selected style="background:#1e293b;">'+esc(val)+'</option>';
      }
      html+='</select>';
      if(_isCurrent)html+='<span style="position:absolute;top:1px;right:2px;font-size:7px;background:#22d3ee;color:#0f172a;border-radius:3px;padding:0 3px;line-height:1.6;font-weight:700;pointer-events:none;">الآن</span>';
      if(hasCls&&isSlotOnce(period.id,di)){
        html+='<span title="مرة واحدة فقط" style="position:absolute;top:1px;left:2px;font-size:8px;line-height:1;pointer-events:none;">🔂</span>';
      }
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
        html+='<button onclick="schedSpecialOverride(\'break\','+di+','+(dayIsActive?0:1)+')" style="background:rgba(251,191,36,.15);border:1px solid #d97706;color:#fbbf24;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">إضافة</button>';
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
  var _schedBody=root.querySelector('.sched-body');
  var _schedScroll=_schedBody?_schedBody.scrollTop:0;
  var _absBody=root.querySelector('.abs-body');
  var _absScroll=_absBody?_absBody.scrollTop:0;
  root.innerHTML=html;
  // استعادة موضع التمرير
  requestAnimationFrame(function(){
    var _nb=root.querySelector('.sched-body');
    if(_nb&&window._schedBodyScroll)_nb.scrollTop=window._schedBodyScroll;
  });
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
  var isTask=val&&val.trim()&&DB.classes.indexOf(val)<0;
  if(isTask){
    var once=confirm('📝 "'+val+'"\n\nهل تريد تكرار هذه المهمة أسبوعياً (دائم)؟\n\n— اضغط "موافق" للتكرار كل أسبوع\n— اضغط "إلغاء" لمرة واحدة فقط (أقرب يوم قادم)');
    if(once){
      clearOnceFlag(pid,di);
      setUnifiedSlot(pid,di,val);
    }else{
      setUnifiedSlotOnce(pid,di,val);
    }
  }else{
    clearOnceFlag(pid,di);
    setUnifiedSlot(pid,di,val);
  }
  renderSched();
  // Refresh home page ring if it is currently visible
  var homeRoot=document.getElementById("homeRoot");
  if(homeRoot&&homeRoot.offsetParent!==null&&typeof _homeTick==="function")_homeTick();
}

function schedRenamePeriod(pid,val){
  var shared=DB.schedule._shared;
  if(!shared)return;
  (shared.periods||[]).forEach(function(p){if(p.id===pid)p.label=val.trim()||p.label;});
  saveDB();
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
  Object.keys(shared.onceSlots||{}).forEach(function(k){if(k.startsWith(pid+"_"))delete shared.onceSlots[k];});
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
    for(var di=0;di<7;di++){
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
    for(var di=0;di<7;di++){
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
  // عرض القائمة يتكيف مع المحتوى تلقائياً
  portal.style.top=top+'px';
  portal.style.left=left+'px';
  portal.style.right='unset';
  portal.style.minWidth='0';
  portal.style.width='max-content';
  portal.style.display='block';
  // تصحيح إذا خرجت عن الشاشة
  var portalRect=portal.getBoundingClientRect();
  if(portalRect.right>window.innerWidth-8) portal.style.left=(window.innerWidth-portalRect.width-8)+'px';
  if(parseFloat(portal.style.left)<4) portal.style.left='4px';
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
var AS={activeClass:"",activeWeek:1,search:"",showAllPeriods:false,_autoWeekSet:false};

// ══ ABS CLS/WEEKS BARS ══
function absClsBarToggle(){
  var bar=document.getElementById('absClsBar');
  var btn=document.getElementById('tbAbsClsBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  absWeeksBarClose();
  if(isOpen){bar.classList.remove('open');btn.classList.remove('active');}
  else{renderAbsClsBar();bar.classList.add('open');btn.classList.add('active');}
}
function absClsBarClose(){
  var bar=document.getElementById('absClsBar');
  var btn=document.getElementById('tbAbsClsBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function absWeeksBarToggle(){
  var bar=document.getElementById('absWeeksBar');
  var btn=document.getElementById('tbAbsWeeksBtn');
  if(!bar||!btn)return;
  var isOpen=bar.classList.contains('open');
  absClsBarClose();
  if(isOpen){bar.classList.remove('open');btn.classList.remove('active');}
  else{renderAbsWeeksBar();bar.classList.add('open');btn.classList.add('active');}
}
function absWeeksBarClose(){
  var bar=document.getElementById('absWeeksBar');
  var btn=document.getElementById('tbAbsWeeksBtn');
  if(bar)bar.classList.remove('open');
  if(btn)btn.classList.remove('active');
}
function renderAbsClsBar(){
  var bar=document.getElementById('absClsBar');
  if(!bar)return;
  var cls=AS.activeClass;
  var h='<span class="cls-bar-lbl">الفصول:</span>';
  DB.classes.forEach(function(c){
    var absCnt=totalClassAbsencePeriods(c);
    h+='<button class="cls-bar-tab'+(c===cls?" active":"")+'" onclick="AS.activeClass=\''+esc(c)+'\';AS.activeWeek=1;renderAbsence();renderAbsClsBar();renderAbsWeeksBar();">'+esc(c)+(absCnt?' <span class="badge badge-red">'+absCnt+'</span>':"")+'</button>';
  });
  bar.innerHTML=h;
}
function renderAbsWeeksBar(){
  var bar=document.getElementById('absWeeksBar');
  if(!bar)return;
  var cls=AS.activeClass;
  var week=AS.activeWeek;
  var students=(DB.data[cls]||[]).filter(function(s){return s.name;});
  var h='<span class="weeks-bar-lbl">📅 الأسابيع:</span>';
  var _absW=ALL_WEEKS.slice(0,Math.min(Math.max(1,Number(DB.meta.activeWeeks)||14),ALL_WEEKS.length));
  var _curW=_calcCurrentWeek();
  _absW.forEach(function(w){
    var hasAbs=false;
    students.forEach(function(s){var abs=getStudentAbsences(cls,s.id);Object.keys(abs).forEach(function(k){if(abs[k]&&k.startsWith("w"+w+"_"))hasAbs=true;});});
    var isCur=(w===_curW&&w!==week);
    h+='<button class="abs-week-btn'+(w===week?" active":hasAbs?" has-abs":"")+(isCur?" cur-week":"")+'" title="'+(isCur?"الأسبوع الحالي":"")+'" onclick="AS.activeWeek='+w+';renderAbsence();renderAbsWeeksBar();">'+(isCur?'<span style="font-size:7px;vertical-align:super;color:#34d399">●</span> ':'')+'أ'+w+'</button>';
  });
  bar.innerHTML=h;
}

function renderAbsence(){
  var root=document.getElementById("absenceRoot");
  if(!root)return;
  if(!AS.activeClass&&DB.classes.length)AS.activeClass=DB.classes[0];
  if(!AS._autoWeekSet){AS.activeWeek=_calcCurrentWeek();AS._autoWeekSet=true;}
  var cls=AS.activeClass;
  // حفظ موضع التمرير الحالي (رأسي وأفقي) قبل إعادة الرسم
  var _absBodyOld=root.querySelector('.abs-body');
  var _absScrollTop=_absBodyOld?_absBodyOld.scrollTop:0;
  var _absScrollLeft=_absBodyOld?_absBodyOld.scrollLeft:0;
  var _absGridOld=root.querySelector('.abs-grid');
  var _absGridScrollLeft=_absGridOld?_absGridOld.scrollLeft:0;
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
  html+='<div style="display:flex;align-items:center;gap:8px;">';
  html+='<div class="abs-title">📋 سجل الغياب</div>';
  html+='<span style="font-size:8px;color:#64748b;background:rgba(30,41,59,.8);border:1px solid #1e3a5f;padding:2px 9px;border-radius:10px;">عرض فقط — التعديل من الأسبوعي والمرضى</span>';
  html+='</div>';
  html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  html+='<div style="position:relative;">';
  html+='<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;pointer-events:none;">🔍</span>';
  html+='<input style="background:#0f172a;border:1px solid #1e3a5f;color:#f1f5f9;border-radius:8px;padding:4px 26px 4px 10px;font-size:10px;outline:none;width:110px;transition:border-color .15s;" placeholder="بحث..." value="'+esc(AS.search)+'" oninput="AS.search=this.value;renderAbsence()" onfocus="this.style.borderColor=\'#38bdf8\'" onblur="this.style.borderColor=\'#1e3a5f\'"/>';
  html+='</div>';
  html+='<button class="btn btn-success btn-sm" onclick="absExport()" style="display:flex;align-items:center;gap:3px;padding:4px 10px;border-radius:8px;font-size:10px;">⬇ Excel</button>';
  html+='</div></div>';
  html+='<div class="abs-body" style="overflow-x:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;">';

  // إعادة رسم أشرطة الفصول/الأسابيع العلوية إن كانت مفتوحة
  if(document.getElementById('absClsBar')&&document.getElementById('absClsBar').classList.contains('open'))renderAbsClsBar();
  if(document.getElementById('absWeeksBar')&&document.getElementById('absWeeksBar').classList.contains('open'))renderAbsWeeksBar();

  // Stats
  var totalSick=0;
  students.forEach(function(s){totalSick+=countStudentSickPeriods(cls,s.id);});
  html+='<div class="abs-stats-row">';
  html+='<div class="abs-stat" style="color:#f87171;"><div class="abs-stat-v" style="color:#f87171;">'+thisWeekAbs+'</div><div class="abs-stat-l">غياب هذا الأسبوع</div></div>';
  html+='<div class="abs-stat" style="color:#fbbf24;"><div class="abs-stat-v" style="color:#fbbf24;">'+thisWeekSick+'</div><div class="abs-stat-l">مرضى هذا الأسبوع</div></div>';
  html+='<div class="abs-stat" style="color:#fb923c;"><div class="abs-stat-v" style="color:#fb923c;">'+totalAbsPeriods+'</div><div class="abs-stat-l">إجمالي الغياب</div></div>';
  html+='<div class="abs-stat" style="color:#60a5fa;"><div class="abs-stat-v" style="color:#60a5fa;">'+totalSick+'</div><div class="abs-stat-l">إجمالي المرضى</div></div>';
  html+='<div class="abs-stat" style="color:#34d399;"><div class="abs-stat-v" style="color:#34d399;">'+students.length+'</div><div class="abs-stat-l">عدد الطلاب</div></div>';
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
    var gridCols="28px 36px 240px repeat("+colCount+",minmax(36px,1fr)) 60px";

    // Header
    html+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">';
    html+='<span style="background:linear-gradient(135deg,#0c2a52,#0e3268);border:1px solid #1e4a8a;border-radius:10px;padding:3px 11px;font-size:9px;color:#60a5fa;font-weight:700;">📚 '+activePeriodDays.length+' فترة / الأسبوع</span>';
    html+='<button onclick="switchPage(\'settings\')" style="background:#0f172a;border:1px solid #1e3a5f;padding:3px 10px;border-radius:8px;cursor:pointer;font-size:9px;color:#64748b;font-family:inherit;transition:all .15s;" onmouseover="this.style.borderColor=\'#334155\';this.style.color=\'#94a3b8\'" onmouseout="this.style.borderColor=\'#1e3a5f\';this.style.color=\'#64748b\'">⚙️ تغيير العدد</button>';
    html+='</div>';
    html+='<div class="abs-grid" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">';
    html+='<div class="abs-grid-hdr" style="display:grid;grid-template-columns:'+gridCols+';">';
    html+='<div style="padding:5px 3px;text-align:center;font-size:8px;color:#475569;">م</div>';
    html+='<div style="padding:5px 3px;text-align:center;font-size:8px;color:#475569;">📷</div>';
    html+='<div style="padding:5px 7px;border-left:none;">الطالب — أسبوع '+week+weekStartStr+'</div>';
    activePeriodDays.forEach(function(col){
      html+='<div style="font-size:8px;line-height:1.3;'+(col.isScheduled?"color:#60a5fa;font-weight:700;":"")+'">';
      html+=esc(col.period.label||col.period.id)+'<br/>'+DAYS_SHORT[col.dayIdx];
      if(col.period.time)html+='<br/><span style="font-size:7px;color:#475569;">'+esc(col.period.time)+'</span>';
      html+='<br/><div style="display:flex;gap:2px;margin-top:3px;justify-content:center;">';
      html+='<button onclick="clearAbsenceCol(\''+esc(cls)+'\','+week+','+col._ci+')" title="مسح كل العمود" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:5px;cursor:pointer;font-size:9px;padding:1px 5px;font-family:inherit;line-height:1.4;" onmouseover="this.style.background=\'rgba(239,68,68,.3)\'" onmouseout="this.style.background=\'rgba(239,68,68,.15)\'">🗑</button>';
      html+='<button onclick="markAllAbsenceCol(\''+esc(cls)+'\','+week+','+col._ci+')" title="تسجيل الكل غائب" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:5px;cursor:pointer;font-size:9px;padding:1px 5px;font-family:inherit;line-height:1.4;" onmouseover="this.style.background=\'rgba(239,68,68,.3)\'" onmouseout="this.style.background=\'rgba(239,68,68,.15)\'">✗</button>';
      html+='</div>';
      html+='</div>';
    });
    html+='<div>غياب</div>';
    html+='</div>';

    // Student rows
    filtered.forEach(function(s,rowIdx){
      var abs=getStudentAbsences(cls,s.id);
      var weekAbsCnt=0;
      activePeriodDays.forEach(function(col){var k="w"+week+"_ci"+col._ci;if(abs[k])weekAbsCnt++;});
      var totalAbs=countStudentAbsencePeriods(cls,s.id);

      html+='<div class="abs-student-row" style="grid-template-columns:'+gridCols+';">';
      html+='<div style="display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#475569;">'+(rowIdx+1)+'</div>';
      var _photo=s.photo||(DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
      html+='<div style="display:flex;align-items:center;justify-content:center;padding:2px;">';
      if(_photo){
        html+='<img src="'+_photo+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #1e3a5f;flex-shrink:0;" onerror="this.style.display=\'none\'">';
      }else{
        html+='<div style="width:28px;height:28px;border-radius:50%;background:#1e293b;border:1px solid #334155;display:flex;align-items:center;justify-content:center;font-size:10px;color:#475569;">👤</div>';
      }
      html+='</div>';
      html+='<div class="abs-student-name" title="'+esc(s.name)+'">'+esc(s.name)+'</div>';
      activePeriodDays.forEach(function(col){
        var k="w"+week+"_ci"+col._ci;
        var absSt=abs[k];
        var isAbs=absSt==="abs", isSick=absSt==="sick";
        var cellClass="abs-period-cell"+(isAbs?" is-abs":isSick?" is-sick":col.isScheduled?" scheduled":"");
        var clickHandler=col._ci>=0?'onclick="toggleAbsence(\''+esc(cls)+'\','+s.id+','+week+','+col._ci+')"':'';
        html+='<div class="'+cellClass+'" '+clickHandler+' title="'+esc(col.period.label)+" — "+DAYS_AR[col.dayIdx]+(isSick?" (مريض)":isAbs?" (غائب)":"")+'">';
        html+=isAbs?"✗":isSick?"م":(col.isScheduled?"·":"");
        html+='</div>';
      });
      html+='<div class="abs-student-total" style="color:'+(totalAbs>0?"#f87171":"#475569")+'">'+totalAbs+'</div>';
      html+='</div>';
    });
    html+='</div>'; // abs-grid
  }

  // Legend
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;font-size:9px;padding:7px 10px;background:#0f172a;border-radius:10px;border:1px solid #1e293b;">';
  html+='<span style="background:rgba(239,68,68,.15);color:#f87171;padding:2px 9px;border-radius:6px;border:1px solid rgba(239,68,68,.25);">✗ غائب (صفر)</span>';
  html+='<span style="background:rgba(245,158,11,.15);color:#fbbf24;padding:2px 9px;border-radius:6px;border:1px solid rgba(245,158,11,.25);">م مريض (مستثنى)</span>';
  html+='<span style="background:rgba(29,78,216,.1);color:#60a5fa;padding:2px 9px;border-radius:6px;border:1px solid rgba(29,78,216,.25);">· فترة مجدولة</span>';
  html+='<span style="color:#475569;font-size:8.5px;margin-top:1px;">اضغط: مرة=غائب، مرتين=مريض، ثلاث=إلغاء</span>';
  html+='</div>';

  html+='</div></div>';
  root.innerHTML=html;
  requestAnimationFrame(function(){
    var _nb2=root.querySelector('.abs-body');
    if(_nb2){_nb2.scrollTop=_absScrollTop;_nb2.scrollLeft=_absScrollLeft;}
    var _ng2=root.querySelector('.abs-grid');
    if(_ng2)_ng2.scrollLeft=_absGridScrollLeft;
  });
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
