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
  applyAbsenceToGrades(cls,studentId,week);
  saveDB();
  _refreshCurrentAndRelated();
}
function toggleSickCol(cls,studentId,week,colIndex){
  var abs=getStudentAbsences(cls,studentId);
  var k="w"+week+"_ci"+colIndex;
  if(abs[k]==="sick"){
    delete abs[k];
    applyAbsenceToGrades(cls,studentId,week);
  } else {
    abs[k]="sick";
    _applySickWithConfirm(cls,studentId,week);
  }
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
    applyAbsenceToGrades(cls,s.id,week);
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
    applyAbsenceToGrades(cls,s.id,week);
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
  if(abs[k]==="sick"||abs[oldK]==="sick"){
    delete abs[k];delete abs[oldK];
    applyAbsenceToGrades(cls,studentId);
  } else {
    delete abs[oldK];abs[k]="sick";
    _applySickWithConfirm(cls,studentId);
  }
  saveDB();
  _refreshCurrentAndRelated();
}
function setSickRange(cls,studentId,week,periodId,dayIdx,fromDate,toDate){
  if(!fromDate||!toDate)return;
  var from=new Date(fromDate),to=new Date(toDate);
  var abs=getStudentAbsences(cls,studentId);
  var touchedWeeks=[];
  ALL_WEEKS.forEach(function(w){
    var wStart=getWeekDateForDay(w,0);
    if(!wStart)return;
    var wEnd=new Date(wStart);wEnd.setDate(wEnd.getDate()+5);
    if(wStart>to||wEnd<from)return;
    var cols=buildAbsCols(cls,w);
    var touched=false;
    cols.forEach(function(col,ci){
      var d=getWeekDateForDay(w,col.dayIdx>=0?col.dayIdx:0);
      if(!d||d<from||d>to)return;
      abs["w"+w+"_ci"+ci]="sick";touched=true;
    });
    if(touched)touchedWeeks.push(w);
  });
  // نُطبّق فقط على أسابيع هذه الفترة تحديداً — حتى لا يعيد سؤال «استبدال؟» فتح أو تغيير
  // أسابيع من فترات مرض سابقة اختار فيها المستخدم إبقاء الدرجة كما هي.
  _applySickWithConfirm(cls,studentId,touchedWeeks);
  saveDB();
  _refreshCurrentAndRelated();
}
// يطبّق المرض على الدرجات، ويسأل مرة واحدة إن كانت هناك درجات مُدخلة مسبقاً
// ستُستبدل بعلامة "م" — الدرجات الفارغة تُعلَّم فوراً دون سؤال.
function _applySickWithConfirm(cls,studentId,week){
  var conflicts=[];
  applyAbsenceToGrades(cls,studentId,week,{conflicts:conflicts});
  if(conflicts.length){
    var n=conflicts.length;
    if(confirm("يوجد "+n+" "+(n===1?"درجة مُدخلة مسبقاً":"درجات مُدخلة مسبقاً")+" ضمن فترة المرض، هل تريد استبدالها بعلامة \"م\" (مرض)؟"))
      applyAbsenceToGrades(cls,studentId,week,{force:true});
  }
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
      if(abs[k]!=="sick")return;
      var d=getWeekDateForDay(w,col.dayIdx>=0?col.dayIdx:0);
      if(d&&d>=from&&d<=to)delete abs[k];
    });
  });
  applyAbsenceToGrades(cls,studentId);
  saveDB();
  _refreshCurrentAndRelated();
}

// ── ترحيل لمرة واحدة: الغياب مخزَّن برقم العمود (w{أسبوع}_ci{رقم})، وكان ترتيب الأعمدة حسب الفترة ثم اليوم،
// وأصبح حسب اليوم ثم الفترة. نُعيد ربط السجلات القديمة بنفس الحصة (نفس الفترة واليوم) في موضعها الجديد. ──
function migrateAbsColOrderByDay(){
  if(!DB||!DB.meta||DB.meta.absOrderByDay)return;
  DB.meta.absOrderByDay=true;
  var sh=DB.schedule&&DB.schedule._shared;
  if(!sh||!sh.periods||!sh.slots||!DB.absences){saveDB();return;}
  var ppw=Math.max(1,Number(DB.meta.periodsPerWeek)||3);
  var changedClasses=0,dropped=0;
  (DB.classes||[]).forEach(function(cls){
    var oldL=[];
    sh.periods.forEach(function(p,pIdx){
      for(var di=0;di<7;di++){
        var v=sh.slots[p.id+"_d"+di]||"";
        if(String(v).trim()===cls)oldL.push({id:p.id+"|"+di,di:di,pi:pIdx});
      }
    });
    var newL=oldL.slice().sort(function(a,b){return a.di!==b.di?a.di-b.di:a.pi-b.pi;});
    oldL=oldL.slice(0,ppw);newL=newL.slice(0,ppw);
    var newIdx={};newL.forEach(function(c,i){newIdx[c.id]=i;});
    var map={};var same=true;
    oldL.forEach(function(c,i){
      var n=newIdx[c.id];
      if(n===undefined){map[i]=-1;same=false;}
      else{map[i]=n;if(n!==i)same=false;}
    });
    if(same)return;
    changedClasses++;
    var clsAbs=DB.absences[cls]||{};
    Object.keys(clsAbs).forEach(function(sid){
      var abs=clsAbs[sid];if(!abs)return;
      var out={},moved=[];
      Object.keys(abs).forEach(function(k){
        var m=k.match(/^w(\d+)_ci(\d+)$/);
        if(!m||map[m[2]]===undefined){out[k]=abs[k];return;}
        var n=map[m[2]];
        if(n<0){dropped++;return;}
        out["w"+m[1]+"_ci"+n]=abs[k];
      });
      clsAbs[sid]=out;
    });
  });
  saveDB();
  if(changedClasses&&typeof showSnack==='function'){
    try{showSnack("🔄 أُعيد ترتيب أعمدة الغياب أسبوعياً لـ "+changedClasses+" فصل مع نقل السجلات القديمة لمواضعها"+(dropped?(" (تعذّر نقل "+dropped+" سجل)"):""));}catch(e){}
  }
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
  schedPeriods.forEach(function(period,_pIdx){
    DAYS_AR.forEach(function(_,di){
      var slot=slots[period.id+"_d"+di]||"";
      if(slot.trim()===cls){
        scheduledCols.push({period:period,dayIdx:di,_pi:_pIdx,
          label:DAYS_SHORT[di]+" "+(period.label||period.id)});
      }
    });
  });

  // ترتيب أسبوعي حقيقي: حسب اليوم (السبت ← الجمعة) ثم ترتيب الفترة داخل اليوم
  scheduledCols.sort(function(a,b){
    if(a.dayIdx!==b.dayIdx)return a.dayIdx-b.dayIdx;
    return a._pi-b._pi;
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

// نوع كل عمود/فترة في صفحة الغياب: 'attendance' (بدون ربط، الافتراضي) | 'hw' (واجب) | 'assess' (تقييم)
// يُخزَّن برقم الفترة (ci) فقط — نفس النوع لكل الفصول، لأن عدد الفترات أسبوعياً إعداد عام مشترك.
function getAbsColType(ci){
  var t=(DB.meta.absColTypes||{})[String(ci)];
  return (t==='hw'||t==='assess')?t:'attendance';
}
function setAbsColType(ci,type){
  if(!DB.meta.absColTypes)DB.meta.absColTypes={};
  if(type==='attendance')delete DB.meta.absColTypes[String(ci)];
  else DB.meta.absColTypes[String(ci)]=type;
  saveDB();
  // أعد مزامنة كل الفصول/الأسابيع التي فيها غياب مسجَّل، لتعكس نوع الفترة الجديد فوراً
  DB.classes.forEach(function(cls){
    (DB.data[cls]||[]).filter(function(s){return s.name;}).forEach(function(s){
      var abs=getStudentAbsences(cls,s.id);
      var weeksSeen={};
      Object.keys(abs).forEach(function(k){var m=k.match(/^w(\d+)_/);if(m)weeksSeen[m[1]]=true;});
      Object.keys(weeksSeen).forEach(function(w){applyAbsenceToGrades(cls,s.id,Number(w));});
    });
  });
  saveDB();
  if(_currentPage==='absence')renderAbsence();
  if(_currentPage==='weekly')renderWeekly();
  if(_currentPage==='grades')renderGrades();
  showSnack('✅ تم تحديث نوع الفترة ومزامنة الدرجات المرتبطة بها');
}

function applyAbsenceToGrades(cls,studentId,week,ctx){
  ctx=ctx||{};
  // ── ربط فترات الغياب/المرض بحقول الواجب/التقييم، حسب نوع كل فترة (يُضبط من رأس
  // كل عمود في صفحة الغياب). فترة من نوع "واجب" أو "تقييم":
  //   • غائب فيها الطالب → الحقل المقابل لذلك الأسبوع يُعلَّم "غ"
  //   • مريض فيها الطالب → يُعلَّم "م" (معذور)، والغياب له الأولوية إن اجتمعا
  // تُكتب القيمة مباشرة في بيانات الطالب الموحّدة فتظهر في كل الصفحات.
  // إن لم يُمرَّر أسبوع (مثل تسجيل فترة مرض) تُطبَّق على كل الأسابيع.
  var sts=DB.data[cls]||[];
  var idx=-1;
  for(var i=0;i<sts.length;i++){if(sts[i].id===studentId){idx=i;break;}}
  if(idx<0)return;
  var s=sts[idx];
  var abs=getStudentAbsences(cls,studentId);
  var weeks;
  if(week!=null)weeks=(Array.isArray(week)?week:[week]).map(Number);
  else{
    var seen={};
    Object.keys(abs).forEach(function(k){var m=k.match(/^w(\d+)_/);if(m)seen[m[1]]=true;});
    // أسابيع كان فيها "م" تلقائي سابقاً لإزالتها إذا انتهت فترة المرض
    Object.keys(s._autoExc||{}).forEach(function(f){var m=f.match(/^[ah](\d+)$/);if(m)seen[m[1]]=true;});
    weeks=Object.keys(seen).map(Number);
  }
  // إن لم تُربط أي فترة بالواجب/التقييم، يُطبَّق المرض على واجب وتقييم الأسبوع كله
  // حتى يظهر في الدرجات دون إعداد إضافي (الغياب العادي يبقى كما هو).
  var _ppw=Math.max(1,Number(DB.meta.periodsPerWeek)||3),_anyLinked=false;
  for(var _ci=0;_ci<_ppw;_ci++){if(getAbsColType(_ci)!=='attendance'){_anyLinked=true;break;}}
  weeks.forEach(function(wk){
    var hwAbs=false,asAbs=false,hwSick=false,asSick=false,sickAny=false;
    Object.keys(abs).forEach(function(k){
      var st=abs[k];
      if(st!=="abs"&&st!=="sick")return;
      var m=k.match(/^w(\d+)_ci(\d+)$/);
      if(!m||Number(m[1])!==wk)return;
      if(st==="sick")sickAny=true;
      var t=getAbsColType(m[2]);
      if(t==='hw'){if(st==="abs")hwAbs=true;else hwSick=true;}
      else if(t==='assess'){if(st==="abs")asAbs=true;else asSick=true;}
    });
    if(!_anyLinked&&sickAny){hwSick=true;asSick=true;}
    _applyAbsSickField(s,'a'+wk,asAbs,asSick,ctx);
    _applyAbsSickField(s,'h'+wk,hwAbs,hwSick,ctx);
  });
}
function _applyAbsSickField(s,field,isAbs,isSick,ctx){
  ctx=ctx||{};
  var auto=s._autoExc||(s._autoExc={});
  var cur=s[field];
  if(isAbs){s[field]='غ';delete auto[field];}
  else if(isSick){
    var isEmpty=(cur===''||cur===undefined||cur===null||cur==='غ'||cur==='م'||auto[field]);
    if(isEmpty){s[field]='م';auto[field]=true;}
    else if(ctx.force){s[field]='م';auto[field]=true;}
    else if(ctx.conflicts){ctx.conflicts.push(field);} // درجة مدخلة مسبقاً — تُترك ويُبلَّغ عنها
  } else {
    if(cur==='غ')s[field]='';
    else if(cur==='م'&&auto[field])s[field]='';
    delete auto[field];
  }
  if(!Object.keys(auto).length)delete s._autoExc;
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
  if(typeof schedDayIsOff==='function'&&schedDayIsOff(dayIdx))return [];
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
  if(typeof _dayOffCleanup==='function')_dayOffCleanup();
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
      +' onchange="schedCommitSpecial(\'assembly\',this)"'
      +'/>';
    html+='<button class="ph-del-btn" onclick="timePickerOpen(\'assembly\',0)" style="background:rgba(59,130,246,.2);border-color:rgba(59,130,246,.35);color:#93c5fd;">🕐 ضبط</button>';
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
      +' onchange="schedCommitTime(\''+period.id+'\',this)"'
      +' oninput="schedTimeFilter(\''+period.id+'\')"'
      +'/>';
    var _l12=_tpLabel12(period.time);
    if(_l12)html+='<span style="font-size:8px;color:#94a3b8;white-space:nowrap;">'+_l12+'</span>';
    html+='<button class="ph-del-btn" onclick="timePickerOpen(\'period\',\''+period.id+'\')" style="background:rgba(59,130,246,.2);border-color:rgba(59,130,246,.35);color:#93c5fd;">🕐 ضبط الوقت</button>';
    html+='<button class="ph-del-btn" onclick="schedDelPeriodUnified(\''+period.id+'\')">✕ حذف</button>';
    html+='</div></th>';
  });

  // فسحة column header
  if(spBreak.enabled){
    html+='<th class="period-hdr ph-break">';
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html+='<span class="ph-name" style="color:#fbbf24;">☕ فسحة</span>';
    html+='<input value="'+esc(spBreak.time||"")+'" placeholder="10:00-10:20" class="ph-time-inp" style="color:#fbbf24;"'
      +' onchange="schedCommitSpecial(\'break\',this)"'
      +'/>';
    html+='<button class="ph-del-btn" onclick="timePickerOpen(\'break\',0)" style="background:rgba(59,130,246,.2);border-color:rgba(59,130,246,.35);color:#93c5fd;">🕐 ضبط</button>';
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
    var _off=schedDayOffInfo(di);
    html+='<td class="day-lbl">'+dayName
      +(_off?'<div style="font-size:8px;color:#fbbf24;margin-top:2px;">🏖 إجازة</div>'
            :'<div><button onclick="schedDayOffOpen('+di+')" style="margin-top:3px;background:rgba(251,191,36,.15);border:1px solid #d97706;color:#fbbf24;border-radius:4px;font-size:8px;padding:1px 6px;cursor:pointer;font-family:inherit;">🏖 إجازة</button></div>')
      +'</td>';
    if(_off){
      var _cols=periods.length+(spAssembly.enabled?1:0)+(spBreak.enabled?1:0);
      html+='<td colspan="'+_cols+'" style="background:repeating-linear-gradient(45deg,#2a1f08,#2a1f08 10px,#33260a 10px,#33260a 20px);border:1.5px solid #d97706;text-align:center;padding:10px;">'
        +'<span style="font-size:13px;font-weight:800;color:#fbbf24;">🏖 '+esc(_off.label)+'</span>'
        +'<span style="font-size:9px;color:#d6a45b;margin:0 8px;">'+(_off.kind==='weekly'?'🔁 كل أسبوع':'📅 '+_off.date)+'</span>'
        +'<button onclick="schedDayOffClear('+di+')" style="background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.4);color:#fca5a5;border-radius:5px;font-size:9px;padding:2px 9px;cursor:pointer;font-family:inherit;">✕ إلغاء الإجازة</button>'
        +'</td></tr>';
      return;
    }

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


// ══════════════════════════════════════════════════════
// إدخال الوقت بسهولة: فهم الصيغ المختلفة + نافذة اختيار
// ══════════════════════════════════════════════════════
// يقبل: 8:00-8:45 | ٨:٠٠ - ٨:٤٥ | 800-845 | 1-1:45 | 1:00م-1:45م | 8 ص إلى 8:45 ص | 13:00-13:45
// ويحوّله دائماً إلى الصيغة القياسية 24 ساعة "HH:MM-HH:MM" التي يفهمها التطبيق
function _tpDigits(x){
  return String(x==null?'':x).replace(/[\u0660-\u0669]/g,function(d){return String(d.charCodeAt(0)-0x660);})
    .replace(/[\u06F0-\u06F9]/g,function(d){return String(d.charCodeAt(0)-0x6F0);});
}
function _tpSide(txt){
  var t=_tpDigits(txt).replace(/[\u064B-\u0652\u0640]/g,'').replace(/[\u066B.\u060C]/g,':').replace(/\s+/g,' ').trim().toLowerCase();
  if(!t)return null;
  var digits=t.replace(/[^0-9:]/g,'');
  var letters=t.replace(/[0-9:\s]/g,'');
  var mark='';
  if(letters){
    if(/^(ص|صباحا|صباح|am|a\.?m\.?)$/.test(letters))mark='am';
    else if(/^(م|مساء|مساءا|ظهرا|ظهر|عصرا|عصر|pm|p\.?m\.?)$/.test(letters))mark='pm';
    else return null;
  }
  var h,m,mm;
  if((mm=/^(\d{1,2}):(\d{2})$/.exec(digits))){h=+mm[1];m=+mm[2];}
  else if((mm=/^(\d{1,2})$/.exec(digits))){h=+mm[1];m=0;}
  else if((mm=/^(\d{1,2})(\d{2})$/.exec(digits))){h=+mm[1];m=+mm[2];}
  else return null;
  if(h>24||m>59||(h===24&&m>0))return null;
  return {h:h,m:m,mark:mark};
}
function _tpTo24(o){
  // بلا علامة: 1–6 تُعتبر مساءً، 7–11 صباحاً (ساعات اليوم الدراسي)، 13+ تبقى كما هي
  var h=o.h;
  if(o.mark==='pm'){ if(h<12)h+=12; }
  else if(o.mark==='am'){ if(h===12)h=0; }
  else if(h>=1&&h<=6){ h+=12; o.guessed=true; }
  return h*60+o.m;
}
function _tpPad(n){return (n<10?'0':'')+n;}
function _tpHM(min){return _tpPad(Math.floor(min/60)%24)+':'+_tpPad(min%60);}
function _tp12(min){
  var h=Math.floor(min/60)%24,m=min%60;
  return (h%12||12)+':'+_tpPad(m)+' '+(h<12?'ص':'م');
}
function normalizePeriodTime(str){
  var raw=_tpDigits(str).trim();
  if(!raw)return {ok:true,empty:true,value:'',label:''};
  var parts=raw.replace(/\s+(الى|إلى|to|حتى)\s+/gi,'-').replace(/[\u2013\u2014\u2212~]/g,'-').split('-');
  parts=parts.map(function(x){return x.trim();}).filter(function(x){return x!=='';});
  if(!parts.length||parts.length>2)return {ok:false,err:'اكتب الوقت هكذا: 8:00-8:45 أو اختر من زر 🕐'};
  var a=_tpSide(parts[0]);
  if(!a)return {ok:false,err:'لم أفهم وقت البداية «'+parts[0]+'»'};
  var sm=_tpTo24(a),note=a.guessed?' (اعتُبرت مساءً)':'';
  if(parts.length===1)return {ok:true,value:_tpHM(sm),label:_tp12(sm),note:note};
  var b=_tpSide(parts[1]);
  if(!b)return {ok:false,err:'لم أفهم وقت النهاية «'+parts[1]+'»'};
  var em;
  if(!b.mark&&b.h>=1&&b.h<=12){
    // بلا علامة: أقرب وقت بعد البداية (يحفظ الفترة نفسها صباحاً أو مساءً)
    var c1=(b.h%12)*60+b.m,c2=c1+12*60;
    em=c1>sm?c1:(c2>sm?c2:null);
    if(em===null)return {ok:false,err:'وقت النهاية يجب أن يكون بعد البداية'};
  }else{
    em=_tpTo24(b);
  }
  if(em<=sm)return {ok:false,err:'وقت النهاية يجب أن يكون بعد البداية'};
  if(em-sm>6*60)return {ok:false,err:(!b.mark?'وقت النهاية يجب أن يكون بعد البداية':'المدة أطول من المعتاد — راجع الوقت')};
  return {ok:true,value:_tpHM(sm)+'-'+_tpHM(em),label:_tp12(sm)+' ← '+_tp12(em),note:note};
}
function _tpLabel12(str){
  var n=normalizePeriodTime(str);
  return (n&&n.ok&&n.label)?n.label:'';
}
function _tpCommit(inp,prev,save){
  var n=normalizePeriodTime(inp.value);
  if(!n.ok){showSnack('⚠️ '+n.err);inp.value=prev||'';return false;}
  inp.value=n.value;
  save(n.value);
  if(n.value)showSnack('🕐 '+n.label+(n.note||''));
  return true;
}
function schedCommitTime(pid,inp){
  var prev='';
  ((DB.schedule._shared||{}).periods||[]).forEach(function(p){if(p.id===pid)prev=p.time||'';});
  _tpCommit(inp,prev,function(v){schedSetTimeUnified(pid,v);});
}
function schedCommitSpecial(type,inp){
  var prev=_schedGetSP(type).time||'';
  _tpCommit(inp,prev,function(v){schedSetSpecialTime(type,v);renderSched();});
}

// ── نافذة اختيار الوقت ──
var _TP=null;
function timePickerOpen(kind,id){
  var cur='';
  if(kind==='period'){((DB.schedule._shared||{}).periods||[]).forEach(function(p){if(p.id===id)cur=p.time||'';});}
  else if(kind==='assembly'||kind==='break'){cur=_schedGetSP(kind).time||'';}
  var h12=8,min=0,pm=false,dur=45;
  var n=normalizePeriodTime(cur);
  if(n.ok&&n.value){
    var m=/^(\d{2}):(\d{2})(?:-(\d{2}):(\d{2}))?$/.exec(n.value);
    if(m){
      var h=+m[1];min=+m[2];pm=h>=12;h12=h%12||12;
      if(m[3]){var d=(+m[3]*60+ +m[4])-(h*60+min);if(d>0)dur=d;}
    }
  }
  _TP={kind:kind,id:id,h12:h12,min:min,pm:pm,dur:dur};
  _tpRender();
}
function _tpCalc(){
  var h=_TP.h12%12+(_TP.pm?12:0);
  var s=h*60+_TP.min,e=s+_TP.dur;
  return {s:s,e:e,value:_tpHM(s)+'-'+_tpHM(e),label:_tp12(s)+' ← '+_tp12(e)};
}
function tpSet(k,v){
  if(!_TP)return;
  if(k==='pm')_TP.pm=(v===true||v==='true');
  else _TP[k]=parseInt(v,10);
  _tpRender();
}
function _tpRender(){
  if(!_TP)return;
  var root=document.getElementById('tpRoot');
  if(!root){root=document.createElement('div');root.id='tpRoot';document.body.appendChild(root);}
  var c=_tpCalc();
  var sel=function(k,from,to,step,val,fmt){
    var o='<select onchange="tpSet(\''+k+'\',this.value)" style="font-size:15px;font-family:inherit;padding:6px 8px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f2a5e;font-weight:700;">';
    var seen=false;
    for(var v=from;v<=to;v+=step){o+='<option value="'+v+'"'+(v===val?' selected':'')+'>'+(fmt?fmt(v):v)+'</option>';if(v===val)seen=true;}
    if(!seen)o+='<option value="'+val+'" selected>'+(fmt?fmt(val):val)+'</option>';
    return o+'</select>';
  };
  var seg=function(isPm,label){
    var on=_TP.pm===isPm;
    return '<button type="button" onclick="tpSet(\'pm\','+isPm+')" style="flex:1;padding:9px 0;border:2px solid '+(on?'#1d4ed8':'#e2e8f0')+';background:'+(on?'#1d4ed8':'#f8fafc')+';color:'+(on?'#fff':'#475569')+';border-radius:9px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;">'+label+'</button>';
  };
  var chips=[30,35,40,45,50,55,60].map(function(d){var on=_TP.dur===d;return '<button type="button" onclick="tpSet(\'dur\','+d+')" style="padding:6px 11px;border:1.5px solid '+(on?'#059669':'#e2e8f0')+';background:'+(on?'#059669':'#f8fafc')+';color:'+(on?'#fff':'#475569')+';border-radius:16px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;">'+d+'</button>';}).join('');
  var h='<div class="mo" onclick="timePickerClose()"><div class="md" style="max-width:360px" onclick="event.stopPropagation()">';
  h+='<div class="mh"><h2>🕐 ضبط وقت الحصة</h2><button class="xbtn" onclick="timePickerClose()">✕</button></div>';
  h+='<div class="mb" style="display:flex;flex-direction:column;gap:12px;">';
  h+='<div><div style="font-size:10px;font-weight:700;color:#0f2a5e;margin-bottom:5px;">بداية الحصة</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;justify-content:center;direction:ltr;">'+sel('h12',1,12,1,_TP.h12)+'<b style="font-size:16px;color:#0f2a5e;">:</b>'+sel('min',0,55,5,_TP.min,_tpPad)+'</div>';
  h+='<div style="display:flex;gap:8px;margin-top:8px;">'+seg(false,'☀️ صباحاً (ص)')+seg(true,'🌙 ظهراً / مساءً (م)')+'</div></div>';
  h+='<div><div style="font-size:10px;font-weight:700;color:#0f2a5e;margin-bottom:5px;">مدة الحصة (دقيقة)</div><div style="display:flex;gap:5px;flex-wrap:wrap;">'+chips+'</div></div>';
  h+='<div style="background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:10px;padding:10px;text-align:center;">';
  h+='<div style="font-size:15px;font-weight:800;color:#065f46;">'+c.label+'</div>';
  h+='<div style="font-size:10px;color:#047857;margin-top:3px;direction:ltr;">'+c.value+'</div></div>';
  h+='</div><div class="mf"><button class="btn btn-sm" onclick="timePickerClose()" style="background:#e2e8f0;color:#334155;">إلغاء</button><button class="btn btn-success btn-sm" onclick="timePickerSave()">✔ حفظ</button></div>';
  h+='</div></div>';
  root.innerHTML=h;
}
function timePickerClose(){
  var r=document.getElementById('tpRoot');if(r)r.innerHTML='';
  _TP=null;
}
function timePickerSave(){
  if(!_TP)return;
  var c=_tpCalc(),k=_TP.kind,id=_TP.id;
  timePickerClose();
  if(k==='period'){schedSetTimeUnified(id,c.value);}
  else if(k==='assembly'||k==='break'){schedSetSpecialTime(k,c.value);renderSched();}
  else if(k==='settings'){
    var inp=document.getElementById('sNewPeriodTime');
    if(inp){inp.value=c.value;if(typeof settingsAddPeriodTime==='function')settingsAddPeriodTime();}
  }
  showSnack('🕐 '+c.label);
}


// ══════════════════════════════════════════════════════
// إجازة يوم كامل في الجدول
//   weekly: إجازة دائمة كل أسبوع لهذا اليوم   — dayOff.weekly[di] = "اسم"
//   dates : إجازة ليوم محدد بتاريخه فقط       — dayOff.dates["YYYY-MM-DD"] = "اسم"
// ══════════════════════════════════════════════════════
function _dayOffStore(){
  if(!DB.schedule._shared)DB.schedule._shared={periods:[],slots:{},notes:""};
  var sh=DB.schedule._shared;
  if(!sh.dayOff)sh.dayOff={};
  if(!sh.dayOff.weekly)sh.dayOff.weekly={};
  if(!sh.dayOff.dates)sh.dayOff.dates={};
  return sh.dayOff;
}
// معلومات الإجازة لليوم (للعرض في الجدول): الدائمة أو التاريخ القادم لهذا اليوم
function schedDayOffInfo(di){
  if(!DB||!DB.schedule||!DB.schedule._shared||!DB.schedule._shared.dayOff)return null;
  var st=_dayOffStore();
  if(st.weekly[di]!==undefined)return {kind:'weekly',label:st.weekly[di]||'إجازة'};
  var ds=dateToStr(_nextOccurrenceDate(di));
  if(st.dates[ds]!==undefined)return {kind:'date',date:ds,label:st.dates[ds]||'إجازة'};
  return null;
}
// هل اليوم (بحسب الواقع الآن) إجازة؟ — يستخدمه التنبيهات والصفحة الرئيسية
function schedDayIsOff(di){
  if(!DB||!DB.schedule||!DB.schedule._shared||!DB.schedule._shared.dayOff)return false;
  var st=_dayOffStore();
  if(st.weekly[di]!==undefined)return true;
  if(di===_todayDayIdx()&&st.dates[dateToStr(new Date())]!==undefined)return true;
  return false;
}
// يحذف أيام الإجازة من قوائم الحصص (item.days) ويستبعد العناصر التي لم يبق لها أيام
function schedApplyDayOff(items){
  if(!DB||!DB.schedule||!DB.schedule._shared||!DB.schedule._shared.dayOff)return items;
  var out=[];
  items.forEach(function(it){
    var days=(it.days||[]).filter(function(d){return !schedDayIsOff(d);});
    if(!days.length)return;
    if(days.length===it.days.length){out.push(it);return;}
    var c={};Object.keys(it).forEach(function(k){c[k]=it[k];});c.days=days;out.push(c);
  });
  return out;
}
function _dayOffCleanup(){
  if(!DB||!DB.schedule||!DB.schedule._shared||!DB.schedule._shared.dayOff)return;
  var st=_dayOffStore(),today=dateToStr(new Date()),ch=false;
  Object.keys(st.dates).forEach(function(d){if(d<today){delete st.dates[d];ch=true;}});
  if(ch)saveDB();
}
var _DO=null;
function schedDayOffOpen(di){
  var nxt=dateToStr(_nextOccurrenceDate(di));
  _DO={di:di,date:nxt,label:'إجازة',mode:'date'};
  _doRender();
}
function _doSet(k,v){if(!_DO)return;_DO[k]=v;if(k==='mode')_doRender();}
function _doRender(){
  if(!_DO)return;
  var root=document.getElementById('doRoot');
  if(!root){root=document.createElement('div');root.id='doRoot';document.body.appendChild(root);}
  var m=_DO.mode;
  var box=function(on){return 'border:2px solid '+(on?'#d97706':'#e2e8f0')+';background:'+(on?'#fffbeb':'#f8fafc')+';border-radius:10px;padding:10px;cursor:pointer;';};
  var h='<div class="mo" onclick="schedDayOffClose()"><div class="md" style="max-width:360px" onclick="event.stopPropagation()">';
  h+='<div class="mh"><h2>🏖 إجازة يوم '+DAYS_AR[_DO.di]+'</h2><button class="xbtn" onclick="schedDayOffClose()">✕</button></div>';
  h+='<div class="mb" style="display:flex;flex-direction:column;gap:10px;">';
  h+='<div><div style="font-size:10px;font-weight:700;color:#0f2a5e;margin-bottom:4px;">اسم الإجازة (اختياري)</div>';
  h+='<input value="'+esc(_DO.label)+'" oninput="_DO.label=this.value" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:12px;"/></div>';
  h+='<div style="'+box(m==='date')+'" onclick="_doSet(\'mode\',\'date\')"><div style="font-size:12px;font-weight:800;color:#92400e;">📅 هذا اليوم فقط (بتاريخ محدد)</div>';
  h+='<div style="font-size:10px;color:#78716c;margin:3px 0 6px;">إجازة مرة واحدة، وتنتهي تلقائياً بعدها</div>';
  h+='<input type="date" value="'+_DO.date+'" onclick="event.stopPropagation()" onchange="_DO.date=this.value" style="padding:6px;border:1.5px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:12px;"/></div>';
  h+='<div style="'+box(m==='weekly')+'" onclick="_doSet(\'mode\',\'weekly\')"><div style="font-size:12px;font-weight:800;color:#92400e;">🔁 كل أسبوع (يوم إجازة دائم)</div>';
  h+='<div style="font-size:10px;color:#78716c;margin-top:3px;">يبقى يوم '+DAYS_AR[_DO.di]+' إجازة في كل أسبوع حتى تلغيه</div></div>';
  h+='</div><div class="mf"><button class="btn btn-sm" onclick="schedDayOffClose()" style="background:#e2e8f0;color:#334155;">إلغاء</button><button class="btn btn-warn btn-sm" onclick="schedDayOffSave()">🏖 تسجيل الإجازة</button></div>';
  h+='</div></div>';
  root.innerHTML=h;
}
function schedDayOffClose(){var r=document.getElementById('doRoot');if(r)r.innerHTML='';_DO=null;}
function schedDayOffSave(){
  if(!_DO)return;
  var st=_dayOffStore(),label=(_DO.label||'').trim()||'إجازة';
  if(_DO.mode==='weekly'){
    st.weekly[_DO.di]=label;
  }else{
    if(!_DO.date){showSnack('⚠️ اختر التاريخ');return;}
    var d=new Date(_DO.date+'T00:00:00');
    var jsDay=d.getDay(),ourDi=(jsDay+1)%7;
    if(ourDi!==_DO.di){showSnack('⚠️ هذا التاريخ ليس يوم '+DAYS_AR[_DO.di]);return;}
    st.dates[_DO.date]=label;
  }
  var di=_DO.di;
  schedDayOffClose();
  saveDB();renderSched();
  var hr=document.getElementById('homeRoot');if(hr&&hr.offsetParent!==null&&typeof _homeTick==='function')_homeTick();
  showSnack('🏖 تم تسجيل إجازة يوم '+DAYS_AR[di]);
}
function schedDayOffClear(di){
  var st=_dayOffStore(),info=schedDayOffInfo(di);
  if(!info)return;
  if(info.kind==='weekly')delete st.weekly[di];else delete st.dates[info.date];
  saveDB();renderSched();
  var hr=document.getElementById('homeRoot');if(hr&&hr.offsetParent!==null&&typeof _homeTick==='function')_homeTick();
  showSnack('✅ تم إلغاء الإجازة');
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
  var _n=normalizePeriodTime(val);
  if(!_n.ok){showSnack('⚠️ '+_n.err);return;}
  val=_n.value;
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
    h+='<button class="cls-bar-tab'+(c===cls?" active":"")+'" onclick="AS.activeClass=\''+esc(c)+'\';AS.activeWeek=1;if(window.GS)GS.activeClass=AS.activeClass;renderAbsence();renderAbsClsBar();renderAbsWeeksBar();">'+esc(c)+(absCnt?' <span class="badge badge-red">'+absCnt+'</span>':"")+'</button>';
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
  var filtered=AS.search?students.filter(function(s){return nameMatch(s.name,AS.search);}):students;

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
      var _absColType=getAbsColType(col._ci);
      var _typeColor=_absColType==='hw'?'#34d399':(_absColType==='assess'?'#a78bfa':'#64748b');
      html+='<div style="font-size:8px;line-height:1.3;'+(col.isScheduled?"color:#60a5fa;font-weight:700;":"")+'">';
      html+=esc(col.period.label||col.period.id)+'<br/>'+DAYS_SHORT[col.dayIdx];
      if(col.period.time)html+='<br/><span style="font-size:7px;color:#475569;">'+esc(col.period.time)+'</span>';
      html+='<br/><select onchange="setAbsColType('+col._ci+',this.value)" title="نوع الفترة: يربط الغياب بدرجة الواجب أو التقييم لهذا الأسبوع" style="margin-top:3px;width:100%;max-width:54px;font-size:7px;background:#0f172a;color:'+_typeColor+';border:1px solid #1e3a5f;border-radius:4px;padding:1px;font-family:inherit;cursor:pointer;">';
      html+='<option value="attendance"'+(_absColType==='attendance'?' selected':'')+'>غياب</option>';
      html+='<option value="hw"'+(_absColType==='hw'?' selected':'')+'>واجب</option>';
      html+='<option value="assess"'+(_absColType==='assess'?' selected':'')+'>تقييم</option>';
      html+='</select>';
      html+='<div style="display:flex;gap:2px;margin-top:3px;justify-content:center;">';
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
        var cellClass="abs-period-cell"+(isAbs?" absent":isSick?" sick-mark":col.isScheduled?" scheduled":"");
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
  html+='<span style="color:#475569;font-size:8.5px;margin-top:1px;">| اختر نوع كل فترة من رأس العمود (واجب/تقييم) لربط غيابها تلقائياً بدرجة ذلك الأسبوع</span>';
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
