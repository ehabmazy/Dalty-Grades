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
  dictNumpad:false,
  dictKbOpen:false,
  dictMicOn:false,
  addMicOn:false,
  addKbOpen:false,
  dnStudent:null,
  dnStudentIdx:-1,
  dnInput:"",
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
        if(!sched2.periods)sched2.periods=[];
        if(!sched2.slots)sched2.slots={};
        var periods2=sched2.periods||[];
        var absData2=getStudentAbsences(cls,student.id);
        if(periods2.length){
          periods2.forEach(function(period){if(!period||!period.id)return;DAYS_AR.forEach(function(_,di){var slot=sched2.slots[period.id+"_d"+di]||"";if(slot.trim()){var dt2=DS.dictDate||null;var k=absKey(wnum,period.id,di,dt2);if(!absData2[k])absData2[k]="abs";}});});
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
  // إيقاف الميكروفون عند مغادرة الصفحة
  if(!root.offsetParent&&DS.dictMicOn){
    if(_dictRecognition){try{_dictRecognition.stop();}catch(e){}}
    _dictRecognition=null; DS.dictMicOn=false;
  }
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
    // زر لوحة الأرقام انتقل بجانب حقل الإدخال
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
    html+='<button class="btn btn-ghost btn-sm" onclick="_dPasteStudents()" title="لصق من الحافظة">📋 لصق</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="_dAddToggleMic()" id="dAddMicBtn" title="إدخال صوتي">'+(DS.addMicOn?'🔴':'🎤')+'</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="_dAddToggleKB()" id="dAddKbBtn" title="لوحة المفاتيح" style="background:'+(DS.addKbOpen?'#1d4ed8':'')+';">⌨️</button>';
    html+='<button class="btn btn-ghost btn-sm" onclick="DS.addStudentMode=false;DS.addMicOn=false;DS.addKbOpen=false;if(_addRecognition){try{_addRecognition.stop();}catch(e){}_addRecognition=null;}renderDict();">✕ إلغاء</button>';
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
  // لوحة المفاتيح مخفية دائماً إلا عند الضغط على زر ⌨️
  var _npActive=DS.dictNumpad;
  // inputmode=none دائماً — يُزال فقط عند تفعيل DS.dictKbOpen عبر _dictToggleKB()
  var _taExtra=DS.dictKbOpen?'':' inputmode="none"';
  html+='<div style="display:flex;gap:6px;align-items:flex-start;">';
  html+='<textarea id="dInput" class="dict-input" rows="3" placeholder="'+ph+'"'+_taExtra+' onkeydown="dOnKey(event)" style="flex:1;min-width:0;"></textarea>';
  // أزرار جانبية — دائماً ظاهرة
  html+='<div style="flex-shrink:0;display:flex;flex-direction:column;gap:5px;align-self:flex-start;margin-top:2px;">';
  // زر لوحة الأرقام 🔢
  html+='<button onclick="DS.dictNumpad=!DS.dictNumpad;if(!DS.dictNumpad)DS.dictKbOpen=false;if(DS.dictNumpad&&!DS.dnStudent){var _s=dClsStudents(DS.activeClass);if(_s.length){DS.dnStudent=_s[0];DS.dnStudentIdx=0;}}renderDict();" title="لوحة الأرقام" style="background:'+(_npActive?'#1d4ed8':'#0f172a')+';border:1.5px solid '+(_npActive?'#3b82f6':'#1e3a5f')+';color:'+(_npActive?'#fff':'#64748b')+';border-radius:8px;padding:7px 10px;cursor:pointer;font-size:16px;line-height:1;touch-action:manipulation;">🔢</button>';
  // زر لوحة المفاتيح ⌨️ — دائماً ظاهر
  html+='<button onclick="_dictToggleKB()" id="dictKbBtn" title="إظهار لوحة المفاتيح" style="background:'+(DS.dictKbOpen?'#1d4ed8':'#0f172a')+';border:1.5px solid '+(DS.dictKbOpen?'#3b82f6':'#1e3a5f')+';color:'+(DS.dictKbOpen?'#fff':'#64748b')+';border-radius:8px;padding:7px 10px;cursor:pointer;font-size:16px;line-height:1;touch-action:manipulation;">⌨️</button>';
  // زر الميكروفون 🎤
  html+='<button onclick="_dictToggleMic()" id="dictMicBtn" title="إدخال صوتي" style="background:'+(DS.dictMicOn?'#dc2626':'#0f172a')+';border:1.5px solid '+(DS.dictMicOn?'#f87171':'#1e3a5f')+';color:'+(DS.dictMicOn?'#fff':'#64748b')+';border-radius:8px;padding:7px 10px;cursor:pointer;font-size:16px;line-height:1;touch-action:manipulation;">'+(DS.dictMicOn?'🔴':'🎤')+'</button>';
  html+='</div>';
  html+='</div>';
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

  // ── لوحة الأرقام العائمة ──
  if(DS.dictNumpad){
    /* ── لوحة الأرقام — تكتب مباشرة في dInput ── */
    var _dInpVal2=DS.dnInput||"";
    /* موضع اللوحة المحفوظ */
    var _npLeft=DS.dnPanelLeft!==undefined?DS.dnPanelLeft:null;
    var _npTop=DS.dnPanelTop!==undefined?DS.dnPanelTop:null;
    var _posStyle=(_npLeft!==null&&_npTop!==null)
      ?'left:'+_npLeft+'px;top:'+_npTop+'px;transform:none;bottom:auto;'
      :'left:50%;top:auto;bottom:70px;transform:translateX(-50%);';
    var _btnBase='background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:10px;padding:11px;font-size:20px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    html+='<div id="dictNumpadPanel" style="position:fixed;'+_posStyle+'z-index:9000;background:linear-gradient(160deg,#0f1e3a,#0a1428);border:2px solid #1e4a8a;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.7);width:min(300px,95vw);padding:0;overflow:hidden;user-select:none;-webkit-user-select:none;">';
    /* header — شريط السحب */
    html+='<div id="dnDragBar" style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:rgba(30,74,138,.3);border-bottom:1px solid #1e3a5f;cursor:grab;touch-action:none;">';
    html+='<span style="font-size:11px;font-weight:900;color:#60a5fa;">⠿ 🔢 لوحة الأرقام</span>';
    html+='<span style="font-size:9px;color:#64748b;">رقم ثم مسافة ثم درجة</span>';
    html+='<button onclick="DS.dictNumpad=false;DS.dictKbOpen=false;renderDict();" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;line-height:1;padding:2px 5px;touch-action:manipulation;">✕</button>';
    html+='</div>';
    /* شاشة العرض */
    html+='<div style="padding:8px 12px 6px;">';
    html+='<div style="min-height:44px;background:#0f172a;border:2px solid '+(_dInpVal2?'#3b82f6':'#1e3a5f')+';border-radius:10px;padding:6px 14px;font-size:22px;font-weight:900;color:white;letter-spacing:3px;text-align:center;display:flex;align-items:center;justify-content:center;word-break:break-all;">'+esc(_dInpVal2||'—')+'</div>';
    html+='</div>';
    /* مفاتيح 7 8 9 / 4 5 6 / 1 2 3 */
    html+='<div style="padding:4px 12px 2px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">';
    [7,8,9,4,5,6,1,2,3].forEach(function(n){
      html+='<button onclick="_dnKey('+n+')" style="'+_btnBase+'">'+n+'</button>';
    });
    /* صف: مسح — 0 — حذف */
    html+='<button onclick="_dnClear();" style="'+_btnBase+'color:#f87171;font-size:14px;">✕ مسح</button>';
    html+='<button onclick="_dnKey(0)" style="'+_btnBase+'">0</button>';
    html+='<button onclick="_dnBackspace();" style="'+_btnBase+'color:#fbbf24;font-size:16px;">⌫</button>';
    html+='</div>';
    /* صف: مسافة — غياب — تأكيد */
    html+='<div style="padding:5px 12px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;">';
    html+='<button onclick="_dnSpace();" style="background:#1e3a5f;border:1px solid #334155;color:#94a3b8;border-radius:10px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">⎵ مسافة</button>';
    html+='<button onclick="_dnMarkAbsent();" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#f87171;border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">غ غائب</button>';
    html+='<button onclick="_dnConfirm();" style="background:rgba(29,78,216,.5);border:1px solid #3b82f6;color:white;border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">✓ إدخال</button>';
    html+='</div>';
    html+='</div>'; // panel
  }

  root.innerHTML=html;

  /* ── تفعيل السحب على لوحة الأرقام بعد رسم الـ DOM ── */
  (function(){
    var panel=document.getElementById("dictNumpadPanel");
    var drag=document.getElementById("dnDragBar");
    if(!panel||!drag)return;
    var startX,startY,startL,startT,dragging=false;
    function getPos(){
      var r=panel.getBoundingClientRect();
      return{left:r.left,top:r.top};
    }
    function applyPos(l,t){
      var pw=panel.offsetWidth,ph=panel.offsetHeight;
      var ww=window.innerWidth,wh=window.innerHeight;
      l=Math.max(0,Math.min(ww-pw,l));
      t=Math.max(0,Math.min(wh-ph,t));
      panel.style.left=l+'px';
      panel.style.top=t+'px';
      panel.style.bottom='auto';
      panel.style.transform='none';
      DS.dnPanelLeft=l;
      DS.dnPanelTop=t;
    }
    /* Mouse */
    drag.addEventListener('mousedown',function(e){
      if(e.target.tagName==='BUTTON')return;
      dragging=true;
      var pos=getPos();
      startL=pos.left;startT=pos.top;
      startX=e.clientX;startY=e.clientY;
      drag.style.cursor='grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove',function(e){
      if(!dragging)return;
      applyPos(startL+(e.clientX-startX),startT+(e.clientY-startY));
    });
    document.addEventListener('mouseup',function(){
      dragging=false;drag.style.cursor='grab';
    });
    /* Touch */
    drag.addEventListener('touchstart',function(e){
      if(e.target.tagName==='BUTTON')return;
      dragging=true;
      var pos=getPos();
      startL=pos.left;startT=pos.top;
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;
      e.preventDefault();
    },{passive:false});
    drag.addEventListener('touchmove',function(e){
      if(!dragging)return;
      applyPos(startL+(e.touches[0].clientX-startX),startT+(e.touches[0].clientY-startY));
      e.preventDefault();
    },{passive:false});
    drag.addEventListener('touchend',function(){dragging=false;});
  })();

  // Attach events
  var dInp=document.getElementById("dInput");
  if(dInp){
    if(!DS.dictNumpad){
      // وضع عادي — فعّل التركيز مباشرة
      dInp.focus();
    } else if(DS.dictKbOpen){
      // لوحة المفاتيح مفتوحة بالزر — أزل readonly وفعّل
      dInp.removeAttribute('inputmode');
      dInp.removeAttribute('readonly');
      dInp.focus();
    }
    // وضع لوحة الأرقام بدون فتح KB: لا نفعّل focus لمنع ظهور لوحة المفاتيح
  }
}

// ── لصق في حقل إضافة الطلاب ──
function _dPasteStudents(){
  var area=document.getElementById('dNewStuArea');
  if(!area){showSnack('⚠️ افتح لوحة إضافة الطلاب أولاً');return;}
  if(navigator.clipboard&&navigator.clipboard.readText){
    navigator.clipboard.readText().then(function(txt){
      area.value=(area.value?area.value+'\n':'')+txt.trim();
      area.focus();
      showSnack('✅ تم اللصق');
    }).catch(function(){
      area.focus();
      document.execCommand('paste');
      showSnack('📋 استخدم Ctrl+V للصق');
    });
  } else {
    area.focus();
    document.execCommand('paste');
  }
}


// ── ميكروفون ولوحة مفاتيح حقل إضافة الطلاب ──
var _addRecognition=null;
function _dAddToggleMic(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){showSnack('⚠️ المتصفح لا يدعم الإدخال الصوتي');return;}
  if(DS.addMicOn){
    if(_addRecognition){try{_addRecognition.stop();}catch(e){}}
    _addRecognition=null; DS.addMicOn=false;
    var btn=document.getElementById('dAddMicBtn');
    if(btn){btn.innerHTML='🎤';btn.style.color='';}
    return;
  }
  var rec=new SR();
  rec.lang='ar-SA'; rec.continuous=true; rec.interimResults=false;
  rec.onstart=function(){
    DS.addMicOn=true;
    var btn=document.getElementById('dAddMicBtn');
    if(btn){btn.innerHTML='🔴';btn.style.color='#ef4444';}
  };
  rec.onresult=function(e){
    var txt=e.results[e.results.length-1][0].transcript.trim();
    if(!txt)return;
    var area=document.getElementById('dNewStuArea');
    if(area) area.value=(area.value?area.value+'\n':'')+txt;
  };
  rec.onerror=function(e){
    showSnack('⚠️ خطأ: '+e.error);
    DS.addMicOn=false;
    var btn=document.getElementById('dAddMicBtn');
    if(btn){btn.innerHTML='🎤';btn.style.color='';}
  };
  rec.onend=function(){
    if(DS.addMicOn){try{rec.start();}catch(e){DS.addMicOn=false;}}
  };
  try{rec.start();_addRecognition=rec;}catch(e){showSnack('⚠️ تعذر تشغيل الميكروفون');}
}

function _dAddToggleKB(){
  DS.addKbOpen=!DS.addKbOpen;
  var area=document.getElementById('dNewStuArea');
  var btn=document.getElementById('dAddKbBtn');
  if(DS.addKbOpen){
    if(area){area.removeAttribute('inputmode');area.focus();}
    if(btn){btn.style.background='#1d4ed8';btn.style.color='#fff';}
  } else {
    if(area){area.blur();}
    if(btn){btn.style.background='';btn.style.color='';}
  }
}


// ── إدخال صوتي (Web Speech API) ──
var _dictRecognition=null;
function _dictToggleMic(){
  // تحقق من دعم المتصفح
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showSnack('⚠️ المتصفح لا يدعم الإدخال الصوتي'); return; }

  if(DS.dictMicOn){
    // إيقاف التسجيل
    if(_dictRecognition){ try{_dictRecognition.stop();}catch(e){} }
    _dictRecognition=null;
    DS.dictMicOn=false;
    _dictMicUpdateBtn();
    return;
  }

  // بدء التسجيل
  var rec=new SR();
  rec.lang='ar-SA';
  rec.continuous=true;
  rec.interimResults=false;
  rec.maxAlternatives=1;

  rec.onstart=function(){
    DS.dictMicOn=true;
    _dictMicUpdateBtn();
  };

  rec.onresult=function(e){
    var transcript=e.results[e.results.length-1][0].transcript.trim();
    if(!transcript) return;
    // أضف النص لحقل الإدخال
    var inp=document.getElementById('dInput');
    if(inp){
      inp.value=(inp.value?inp.value+'\n':'')+transcript;
      // شغّل حدث الإدخال لمعالجة النص
      var ev=new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true});
      inp.dispatchEvent(ev);
    }
  };

  rec.onerror=function(e){
    showSnack('⚠️ خطأ في الميكروفون: '+e.error);
    DS.dictMicOn=false;
    _dictMicUpdateBtn();
  };

  rec.onend=function(){
    // أعد التشغيل تلقائياً إذا لا يزال مفعّلاً
    if(DS.dictMicOn){
      try{ rec.start(); }catch(e){ DS.dictMicOn=false; _dictMicUpdateBtn(); }
    }
  };

  try{
    rec.start();
    _dictRecognition=rec;
  }catch(e){
    showSnack('⚠️ تعذر تشغيل الميكروفون');
    DS.dictMicOn=false;
  }
}

function _dictMicUpdateBtn(){
  var btn=document.getElementById('dictMicBtn');
  if(!btn) return;
  btn.innerHTML=DS.dictMicOn?'🔴':'🎤';
  btn.style.background=DS.dictMicOn?'#dc2626':'#0f172a';
  btn.style.borderColor=DS.dictMicOn?'#f87171':'#1e3a5f';
  btn.style.color=DS.dictMicOn?'#fff':'#64748b';
}

// دالة تبديل لوحة المفاتيح عند تفعيل لوحة الأرقام
function _dictToggleKB(){
  DS.dictKbOpen=!DS.dictKbOpen;
  var dInp=document.getElementById("dInput");
  var kbBtn=document.getElementById("dictKbBtn");
  if(DS.dictKbOpen){
    // افتح لوحة المفاتيح — أزل inputmode=none سواء كانت لوحة الأرقام مفعلة أم لا
    if(dInp){
      dInp.removeAttribute('inputmode');
      dInp.removeAttribute('readonly');
      dInp.focus();
    }
    if(kbBtn){kbBtn.style.background='#1d4ed8';kbBtn.style.borderColor='#3b82f6';kbBtn.style.color='#fff';}
  } else {
    // أغلق لوحة المفاتيح — أعد inputmode=none دائماً
    if(dInp){
      dInp.setAttribute('inputmode','none');
      dInp.blur();
    }
    if(kbBtn){kbBtn.style.background='#0f172a';kbBtn.style.borderColor='#1e3a5f';kbBtn.style.color='#64748b';}
  }
}



function _dnGetInput(){return document.getElementById("dInput");}
function _dnKey(n){
  var newVal=(DS.dnInput||"")+String(n);
  /* تحقق من الحد الأقصى للعمود — فقط إذا كان الإدخال رقماً خالصاً (بدون مسافة بعد) */
  /* الصيغة: "رقم_طالب مسافة درجة" — نطبق الحد على الجزء الثاني (الدرجة) */
  var parts=newVal.split(" ");
  if(parts.length>=2){
    /* الجزء الثاني هو الدرجة */
    var gradeStr=parts.slice(1).join("");
    if(/^\d+$/.test(gradeStr)){
      var gradeNum=Number(gradeStr);
      var colDef=null;allCols().forEach(function(c){if(c.id===DS.selectedCol)colDef=c;});
      var maxG=colDef?colDef.max:(typeof totalMax==="function"?totalMax():100);
      if(gradeNum>maxG){
        newVal=parts[0]+" "+String(maxG);
        showSnack("⚠ الحد الأقصى للعمود: "+maxG);
      }
    }
  } else if(parts.length===1&&/^\d+$/.test(newVal)){
    /* رقم واحد فقط — قد يكون رقم طالب أو درجة مباشرة، لا نقيّد هنا */
  }
  DS.dnInput=newVal;
  var el=_dnGetInput();if(el)el.value=DS.dnInput;
  renderDict();
}
function _dnSpace(){
  var cur=DS.dnInput||"";
  if(cur===""||cur.slice(-1)===" ")return;
  DS.dnInput=cur+" ";
  var el=_dnGetInput();if(el)el.value=DS.dnInput;
  renderDict();
}
function _dnClear(){
  DS.dnInput="";
  var el=_dnGetInput();if(el)el.value="";
  renderDict();
}
function _dnBackspace(){
  DS.dnInput=(DS.dnInput||"").slice(0,-1);
  var el=_dnGetInput();if(el)el.value=DS.dnInput;
  renderDict();
}
function _dnConfirm(){
  var raw=(DS.dnInput||"").trim();
  if(!raw)return;
  // تحقق من تحديد العمود (في وضع الغياب)
  if(!DS.nameOnly&&!DS.selectedCol){showSnack("⚠ اختر العمود المستهدف أولاً");return;}
  // إذا كان الإدخال رقماً فقط بدون درجة (لا توجد مسافة) → غائب تلقائياً
  if(!DS.nameOnly&&/^\d+$/.test(raw)){
    raw=raw+" غ";
  }
  var pool=dPool();
  var results=DS.nameOnly?dNameOnlyProcess(raw):dProcess(raw);
  var ok=results.filter(function(r){return r.status==="ok"||r.status==="weak";}).length;
  var fail=results.filter(function(r){return r.status==="unmatched"||r.status==="error";}).length;
  var box=document.getElementById("dStatusBox");
  if(box){
    if(ok){box.className="status-box sb-ok";box.innerHTML='<span>✅</span><span>رُصد '+ok+'</span>';box.style.display="";}
    else if(fail){box.className="status-box sb-err";box.innerHTML='<span>❌</span><span>لم يُعرف الطالب</span>';box.style.display="";}
  }
  // مسح الإدخال
  var el=_dnGetInput();if(el)el.value="";
  DS.dnInput="";
  renderDict();
}
function _dnMarkAbsent(){
  var raw=(DS.dnInput||"").trim();
  if(!raw){showSnack("⚠ اكتب رقم الطالب أولاً");return;}
  if(!DS.nameOnly&&!DS.selectedCol){showSnack("⚠ اختر العمود المستهدف أولاً");return;}
  // أضف علامة الغياب للمدخل
  var absentRaw=raw+" غ";
  var results=DS.nameOnly?dNameOnlyProcess(absentRaw):dProcess(absentRaw);
  var ok=results.filter(function(r){return r.status==="ok"||r.status==="weak";}).length;
  var box=document.getElementById("dStatusBox");
  if(box&&ok){box.className="status-box sb-warn";box.innerHTML='<span>غ</span><span>غياب رُصد '+ok+'</span>';box.style.display="";}
  var el=_dnGetInput();if(el)el.value="";
  DS.dnInput="";
  renderDict();
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
