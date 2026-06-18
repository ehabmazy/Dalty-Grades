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
if(!WKS.npSessionLog)  WKS.npSessionLog  = []; // سجل جلسة الإدخال

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
  h += ' inputmode="none" onfocus="this.blur();"';
  h += ' oninput="WKS.npTextInput=this.value;">';
  h += esc(WKS.npTextInput||'');
  h += '</textarea>';
  h += '<button class="np2-mic-btn" id="npMicBtn" onclick="_npMicToggle()" title="إملاء صوتي" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">🎤</button>';
  h += '<button class="np2-kbd-btn" onclick="_npShowMobileKeyboard()" title="لوحة المفاتيح" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">⌨️</button>';
  h += '</div>';
  if(WKS.npStatus) {
    var stCls = WKS.npStatusType==='ok'?'np2-status-ok':WKS.npStatusType==='warn'?'np2-status-warn':WKS.npStatusType==='info'?'np2-status-info':'np2-status-err';
    h += '<div class="np2-status-box '+stCls+'"><span>'+esc(WKS.npStatus)+'</span></div>';
  }
  h += '</div>';
  /* أزرار تبديل الحقل — ظاهرة دائماً حتى قبل اختيار الطالب، لتحديد وجهة الإدخال الصوتي/اليدوي */
  h += '<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">';
  h += '<button class="np2-ftab'+(fld==='hw'?' on':'')+'" onclick="_npSetField(\'hw\');renderWeekly();" style="flex:1;touch-action:manipulation;">واجب<span class="np2-ftab-max">/'+hwMax+'</span></button>';
  h += '<button class="np2-ftab'+(fld==='assess'?' on':'')+'" onclick="_npSetField(\'assess\');renderWeekly();" style="flex:1;touch-action:manipulation;">تقييم<span class="np2-ftab-max">/'+assessMax+'</span></button>';
  h += '<button class="np2-ftab'+(fld==='beh'?' on':'')+'" onclick="_npSetField(\'beh\');renderWeekly();" style="flex:1;touch-action:manipulation;">سلوك<span class="np2-ftab-max">/10</span></button>';
  h += '<button class="np2-ftab'+(fld==='ex1'?' on':'')+'" onclick="_npSetField(\'ex1\');renderWeekly();" style="flex:1;touch-action:manipulation;">اختبار1<span class="np2-ftab-max">/15</span></button>';
  h += '<button class="np2-ftab'+(fld==='ex2'?' on':'')+'" onclick="_npSetField(\'ex2\');renderWeekly();" style="flex:1;touch-action:manipulation;">اختبار2<span class="np2-ftab-max">/15</span></button>';
  h += '</div>';
  h += '</div>'; /* np2-top */

  /* ══ شريط سجل الجلسة ══ */
  if(WKS.npSessionLog && WKS.npSessionLog.length > 0) {
    var _npOk   = WKS.npSessionLog.filter(function(l){return l.status==='ok';}).length;
    var _npFail = WKS.npSessionLog.filter(function(l){return l.status==='fail';}).length;
    var _npAbs  = WKS.npSessionLog.filter(function(l){return l.isAbsent;}).length;
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:8px;flex-wrap:wrap;">';
    h += '<span style="font-size:9px;color:#6ee7b7;font-weight:700;">\u{1F4CB} \u0627\u0644\u062c\u0644\u0633\u0629:</span>';
    h += '<span style="font-size:9px;background:rgba(16,185,129,.2);color:#6ee7b7;padding:1px 7px;border-radius:6px;">\u2705 '+_npOk+'</span>';
    h += (_npAbs>0?'<span style="font-size:9px;background:rgba(239,68,68,.2);color:#fca5a5;padding:1px 7px;border-radius:6px;">\u2717 '+_npAbs+'</span>':'');
    h += (_npFail>0?'<span style="font-size:9px;background:rgba(251,191,36,.2);color:#fcd34d;padding:1px 7px;border-radius:6px;">\u274c '+_npFail+'</span>':'');
    h += '<button onclick="_npSessionReport()" style="margin-right:auto;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#6ee7b7;border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">\u{1F4CA} \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062c\u0644\u0633\u0629</button>';
    h += '<button onclick="if(confirm(\'\u0645\u0633\u062d \u0633\u062c\u0644 \u0627\u0644\u062c\u0644\u0633\u0629\u061f\')){WKS.npSessionLog=[];renderWeekly();}" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">\u{1F5D1}</button>';
    h += '</div>';
  }

  /* ══ اللوحة العائمة: بطاقة الطالب + أزرار الحقل ══ */
  h += '<div id="np2FloatPanel" class="np2-float-panel" style="'
    +'width:'+(WKS._fpW||320)+'px;'
    +'height:'+(WKS._fpH||260)+'px;'
    +'left:'+(WKS._fpX!==undefined?WKS._fpX:Math.max(10,Math.floor((window.innerWidth-320)/2)))+'px;'
    +'top:'+(WKS._fpY!==undefined?WKS._fpY:80)+'px;'
    +'">';
  /* شريط السحب */
  h += '<div class="np2-float-drag" id="np2FloatDrag">'
    +'<span style="font-size:10px;color:#94a3b8;font-weight:700;">📋 بطاقة الطالب</span>'
    +'<div style="display:flex;gap:4px;">'
    +'<button onclick="WKS._fpW=320;WKS._fpH=260;WKS._fpX=undefined;WKS._fpY=80;renderWeekly();" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;padding:2px 5px;" title="إعادة ضبط">⟳</button>'
    +'</div>'
    +'</div>';

  /* محتوى اللوحة */
  h += '<div class="np2-float-body">';

  if(WKS._npCandidates && WKS._npCandidates.length) {
    h += '<div class="np2-results np2-results-full" style="max-height:100%;overflow-y:auto;">';
    WKS._npCandidates.forEach(function(st) {
      var stuIdx = (DB.data[cls]||[]).indexOf(st);
      var isSelected = s && s.id === st.id;
      var realNum = stuIdx + 1;
      var photo = st.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
      h += '<div class="np2-result-row'+(isSelected?' np2-result-sel':'')+'" onclick="_npPickCandidate(\''+esc(st.id)+'\','+stuIdx+')">';
      h += '<span class="np2-rnum">'+realNum+'</span>';
      if(photo) h += '<img class="np2-rphoto" src="'+photo+'">';
      else h += '<div class="np2-rphoto np2-rphoto-ph">'+realNum+'</div>';
      h += '<span class="np2-rname">'+esc(st.name)+'</span>';
      h += '</div>';
    });
    h += '</div>';
  } else if(s) {
    var photo = s.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
    var _sFresh = (DB.data[cls]||[]).find(function(x){return x.id===s.id;}) || s;
    var assessVal = _sFresh[aF]!==undefined&&_sFresh[aF]!==''?_sFresh[aF]:'—';
    var hwVal     = _sFresh[hF]!==undefined&&_sFresh[hF]!==''?_sFresh[hF]:'—';
    var behVal    = _sFresh['bw'+week]!==undefined&&_sFresh['bw'+week]!==''?_sFresh['bw'+week]:'—';
    var _npAbsTgt = WKS.npAbsTarget!==undefined ? WKS.npAbsTarget : 0;
    var _hwStyle  = (hwVal==='غ'||hwVal==='م')?'color:#f87171;':'';
    var _asStyle  = (assessVal==='غ'||assessVal==='م')?'color:#f87171;':'';
    var _behStyle = (behVal==='غ'||behVal==='م')?'color:#f87171;':'';

    /* الصف العلوي: صورة مكبّرة في المنتصف + رقم */
    h += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:8px;">';
    /* الصورة في المنتصف */
    if(photo) h += '<img src="'+photo+'" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #3b82f6;display:block;">';
    else h += '<div style="width:90px;height:90px;border-radius:50%;background:#1e3a5f;border:3px solid #3b82f6;display:flex;align-items:center;justify-content:center;font-size:36px;">👤</div>';
    /* الاسم كبير في المنتصف */
    h += '<div style="font-family:\'Amiri\',serif;font-size:clamp(17px,4vw,24px);font-weight:900;color:#f1f5f9;text-align:center;width:100%;">'+esc(s.name)+'</div>';
    /* رقم الطالب */
    h += '<div style="width:34px;height:34px;border-radius:50%;background:#1e3a5f;border:2px solid #fbbf24;display:flex;align-items:center;justify-content:center;color:#fbbf24;font-size:14px;font-weight:900;">'+(WKS.numpadStudentIdx+1)+'</div>';
    h += '</div>';

    var ex1Val = _sFresh['ex1']!==undefined&&_sFresh['ex1']!==''?_sFresh['ex1']:'—';
    var ex2Val = _sFresh['ex2']!==undefined&&_sFresh['ex2']!==''?_sFresh['ex2']:'—';
    var _ex1Style = (ex1Val==='غ'||ex1Val==='م')?'color:#f87171;':'';
    var _ex2Style = (ex2Val==='غ'||ex2Val==='م')?'color:#f87171;':'';

    /* الدرجات الخمس */
    h += '<div style="display:flex;gap:4px;margin-bottom:5px;flex-wrap:wrap;">';
    h += '<div class="np2-grade-cell'+(fld==='hw'?' active':'')+'" onclick="_npSetField(\'hw\')" style="cursor:pointer;flex:1;min-width:55px;"><span class="np2-grade-lbl">واجب</span><span class="np2-grade-val" style="'+_hwStyle+'" id="npGradeHw">'+esc(String(hwVal))+'</span>'+(hwVal==='غ'||hwVal==='م'?'':'<span class="np2-grade-max">/'+hwMax+'</span>')+'</div>';
    h += '<div class="np2-grade-cell'+(fld==='assess'?' active':'')+'" onclick="_npSetField(\'assess\')" style="cursor:pointer;flex:1;min-width:55px;"><span class="np2-grade-lbl">تقييم</span><span class="np2-grade-val" style="'+_asStyle+'" id="npGradeAssess">'+esc(String(assessVal))+'</span>'+(assessVal==='غ'||assessVal==='م'?'':'<span class="np2-grade-max">/'+assessMax+'</span>')+'</div>';
    h += '<div class="np2-grade-cell'+(fld==='beh'?' active':'')+'" onclick="_npSetField(\'beh\')" style="cursor:pointer;flex:1;min-width:55px;"><span class="np2-grade-lbl">سلوك</span><span class="np2-grade-val" style="'+_behStyle+'" id="npGradeBeh">'+esc(String(behVal))+'</span>'+(behVal==='غ'||behVal==='م'?'':'<span class="np2-grade-max">/10</span>')+'</div>';
    h += '<div class="np2-grade-cell'+(fld==='ex1'?' active':'')+'" onclick="_npSetField(\'ex1\')" style="cursor:pointer;flex:1;min-width:55px;"><span class="np2-grade-lbl">اختبار1</span><span class="np2-grade-val" style="'+_ex1Style+'" id="npGradeEx1">'+esc(String(ex1Val))+'</span>'+(ex1Val==='غ'||ex1Val==='م'?'':'<span class="np2-grade-max">/15</span>')+'</div>';
    h += '<div class="np2-grade-cell'+(fld==='ex2'?' active':'')+'" onclick="_npSetField(\'ex2\')" style="cursor:pointer;flex:1;min-width:55px;"><span class="np2-grade-lbl">اختبار2</span><span class="np2-grade-val" style="'+_ex2Style+'" id="npGradeEx2">'+esc(String(ex2Val))+'</span>'+(ex2Val==='غ'||ex2Val==='م'?'':'<span class="np2-grade-max">/15</span>')+'</div>';
    h += '</div>';

    /* أزرار تبديل الحقل */
    h += '<div style="display:flex;gap:4px;margin-bottom:5px;flex-wrap:wrap;">';
    h += '<button class="np2-ftab'+(fld==='hw'?' on':'')+'" onclick="_npSetField(\'hw\')" style="flex:1;touch-action:manipulation;">واجب<span class="np2-ftab-max">/'+hwMax+'</span></button>';
    h += '<button class="np2-ftab'+(fld==='assess'?' on':'')+'" onclick="_npSetField(\'assess\')" style="flex:1;touch-action:manipulation;">تقييم<span class="np2-ftab-max">/'+assessMax+'</span></button>';
    h += '<button class="np2-ftab'+(fld==='beh'?' on':'')+'" onclick="_npSetField(\'beh\')" style="flex:1;touch-action:manipulation;">سلوك<span class="np2-ftab-max">/10</span></button>';
    h += '<button class="np2-ftab'+(fld==='ex1'?' on':'')+'" onclick="_npSetField(\'ex1\')" style="flex:1;touch-action:manipulation;">اختبار1<span class="np2-ftab-max">/15</span></button>';
    h += '<button class="np2-ftab'+(fld==='ex2'?' on':'')+'" onclick="_npSetField(\'ex2\')" style="flex:1;touch-action:manipulation;">اختبار2<span class="np2-ftab-max">/15</span></button>';
    h += '</div>';

    /* أزرار الغياب */
    h += '<div class="np2-abs-row" style="flex-wrap:wrap;margin-top:8px;">';
    absCols.forEach(function(col, ci) {
      var absState = getAbsenceState(cls, s.id, week, ci);
      var lbl = col.label || ('ف'+(ci+1));
      var isTarget = (ci === _npAbsTgt);
      h += '<button class="np2-abs-btn'+(absState==='abs'?' on':absState==='sick'?' sick':'')+(isTarget?' np2-abs-target':'')+'" onclick="_npToggleAbs('+ci+');WKS.npAbsTarget='+ci+';renderWeekly();" style="flex:1;touch-action:manipulation;">';
      h += (absState==='abs'?'✓ ':absState==='sick'?'✓ ':'')+'غياب '+lbl;
      h += '</button>';
    });
    h += '</div>';
  } else {
    h += '<div style="display:flex;flex-direction:column;gap:8px;padding:10px 6px;">';
  h += '<div style="text-align:center;font-size:13px;font-weight:900;color:#60a5fa;margin-bottom:2px;">كيف تستخدم الراصد؟</div>';
  h += '<div style="display:flex;align-items:flex-start;gap:8px;background:rgba(99,102,241,.08);border:1px solid #3730a3;border-radius:9px;padding:8px 10px;">';
  h += '<span style="font-size:18px;flex-shrink:0;">1️⃣</span>';
  h += '<div><div style="font-size:11px;font-weight:800;color:#a5b4fc;">اختر نوع الرصد</div>';
  h += '<div style="font-size:10px;color:#64748b;margin-top:2px;">اضغط: واجب / تقييم / سلوك / اختبار1 / اختبار2 من الأزرار أعلاه</div></div>';
  h += '</div>';
  h += '<div style="display:flex;align-items:flex-start;gap:8px;background:rgba(16,185,129,.08);border:1px solid #065f46;border-radius:9px;padding:8px 10px;">';
  h += '<span style="font-size:18px;flex-shrink:0;">2️⃣</span>';
  h += '<div><div style="font-size:11px;font-weight:800;color:#6ee7b7;">ابحث عن الطالب</div>';
  h += '<div style="font-size:10px;color:#64748b;margin-top:2px;">اكتب اسمه أو رقمه في الحقل أعلاه — يمكنك استخدام المايك 🎤</div></div>';
  h += '</div>';
  h += '<div style="display:flex;align-items:flex-start;gap:8px;background:rgba(245,158,11,.08);border:1px solid #78350f;border-radius:9px;padding:8px 10px;">';
  h += '<span style="font-size:18px;flex-shrink:0;">3️⃣</span>';
  h += '<div><div style="font-size:11px;font-weight:800;color:#fcd34d;">أدخل الدرجة</div>';
  h += '<div style="font-size:10px;color:#64748b;margin-top:2px;">اكتب الدرجة بعد الاسم — مثال: <span style="color:#fbbf24;font-weight:700;">محمد 15</span> أو <span style="color:#fbbf24;font-weight:700;">5 15</span> — بدون درجة = غياب تلقائي 🔴</div></div>';
  h += '</div>';
  if(absCols.length > 0) {
    h += '<div style="display:flex;align-items:center;gap:6px;background:rgba(239,68,68,.07);border:1px solid #7f1d1d;border-radius:9px;padding:7px 10px;">';
    h += '<span style="font-size:15px;">📌</span>';
    h += '<div style="font-size:10px;color:#fca5a5;">الفترة المحددة للغياب تظهر بإطار مضيء أسفل بطاقة الطالب — غيّرها قبل الرصد</div>';
    h += '</div>';
  }
  h += '</div>';
  }

  h += '</div>'; /* np2-float-body */
  /* مقبض تغيير الحجم */
  h += '<div class="np2-float-resize" id="np2FloatResize">⤡</div>';
  h += '</div>'; /* np2FloatPanel */



  /* ══ لوحة المفاتيح — الأسفل مثبتة ══ */
  h += '<div class="np2-keyboard">';
  /* صف 1 (أعلى): مسطرة + إدخال + تراجع + مسح */
  h += '<div class="np2-kb-row np2-kb-row4">';
  h += '<button class="np2-key np2-ruler" onclick="_npKeyPress(\' \')" title="مسافة">⎵</button>';
  h += '<button class="np2-key np2-enter" onclick="_npSubmit()" title="إدخال">↵</button>';
  h += '<button class="np2-key np2-del" onclick="_npKeyBackspace()">⌫</button>';
  h += '<button class="np2-key np2-clr" onclick="_npKeyReset()">✕</button>';
  h += '</div>';
  /* صف غ/م — يظهر فقط عند اختيار اختبار 1 أو 2 */
  if(fld==='ex1' || fld==='ex2') {
    h += '<div class="np2-kb-row np2-kb-row4" style="margin-bottom:2px;">';
    var _exF = fld;
    var _curExVal = s ? (s[_exF]!==undefined&&s[_exF]!==''?s[_exF]:'') : '';
    h += '<button class="np2-key'+(WKS.numpadStudent&&_curExVal==='غ'?' np2-key-active':'')+'" onclick="_npSetExamAbs(\'غ\')" style="flex:2;background:'+(WKS.numpadStudent&&_curExVal==='غ'?'#7f1d1d':'rgba(239,68,68,.15)')+';color:#f87171;border-color:#ef4444;font-weight:900;font-size:14px;">غ غائب</button>';
    h += '<button class="np2-key'+(WKS.numpadStudent&&_curExVal==='م'?' np2-key-active':'')+'" onclick="_npSetExamAbs(\'م\')" style="flex:2;background:'+(WKS.numpadStudent&&_curExVal==='م'?'#1e1b4b':'rgba(99,102,241,.15)')+';color:#a5b4fc;border-color:#6366f1;font-weight:900;font-size:14px;">م معفى</button>';
    h += '</div>';
  }
  /* صف 2: 1-2-3-4-5 */
  h += '<div class="np2-kb-row np2-kb-row5">';
  [1,2,3,4,5].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  /* صف 3: 6-7-8-9-0 */
  h += '<div class="np2-kb-row np2-kb-row5">';
  [6,7,8,9,0].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  h += '</div>'; /* np2-keyboard */

  h += '</div>'; /* np2-wrap */
  return h;
}

/* ══════════════════════════════════════════════════════════════
   وضع رصد الحضور — Attendance Mode
   المعلم يُدخل اسم أو رقم الحاضر (بالإملاء أو الأرقام) ثم enter
   وفي النهاية يُعيّن الباقين غياباً دفعة واحدة
   ══════════════════════════════════════════════════════════════ */

if(!WKS._attendPresent)   WKS._attendPresent   = {}; // { studentId: true }
if(WKS._attendPeriodIdx === undefined) WKS._attendPeriodIdx = 0; // الفترة المحددة

function renderWeeklyAttend(cls, students, week, absCols) {
  if(!WKS._attendPresent) WKS._attendPresent = {};
  /* تأكد أن الفترة المحددة ضمن النطاق */
  if(WKS._attendPeriodIdx === undefined || WKS._attendPeriodIdx >= absCols.length)
    WKS._attendPeriodIdx = 0;
  var presentMap   = WKS._attendPresent;
  var presentCount = Object.keys(presentMap).length;
  var absentCount  = students.filter(function(s){ return !presentMap[s.id]; }).length;
  var absCnt       = absCols.length;
  var selPeriod    = WKS._attendPeriodIdx;

  var h = '<div class="np2-wrap">';

  /* ══ شريط الإدخال (نفس بنية الراصد) ══ */
  h += '<div class="np2-top">';
  h += '<div class="np2-dictbar">';
  h += '<div class="np2-input-row">';
  h += '<textarea id="npDictInput" class="np2-dict-inp" rows="1"';
  h += ' placeholder="اسم الطالب الحاضر أو رقمه — مثال: محمد  أو  5"';
  h += ' inputmode="none"';
  h += ' oninput="WKS.npTextInput=this.value;">';
  h += esc(WKS.npTextInput||'');
  h += '</textarea>';
  h += '<button class="np2-mic-btn" id="npMicBtn" onclick="_npMicToggle()" title="إملاء صوتي" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">🎤</button>';
  h += '<button class="np2-kbd-btn" onclick="_npShowMobileKeyboard()" title="لوحة المفاتيح" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">⌨️</button>';
  h += '</div>';

  /* شريط الحالة */
  if(WKS.npStatus) {
    var stCls = WKS.npStatusType==='ok'?'np2-status-ok':WKS.npStatusType==='warn'?'np2-status-warn':WKS.npStatusType==='info'?'np2-status-info':'np2-status-err';
    h += '<div class="np2-status-box '+stCls+'"><span>'+esc(WKS.npStatus)+'</span></div>';
  }
  h += '</div>';
  h += '</div>'; /* np2-top */

  /* ══ شريط سجل الجلسة ══ */
  if(presentCount > 0) {
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:8px;flex-wrap:wrap;">';
    h += '<span style="font-size:9px;color:#6ee7b7;font-weight:700;">📋 الجلسة:</span>';
    h += '<span style="font-size:9px;background:rgba(16,185,129,.2);color:#6ee7b7;padding:1px 7px;border-radius:6px;">✅ '+presentCount+'</span>';
    h += '<span style="font-size:9px;background:rgba(239,68,68,.2);color:#fca5a5;padding:1px 7px;border-radius:6px;">✗ '+absentCount+'</span>';
    h += '<button onclick="_attendSessionReport()" style="margin-right:auto;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#6ee7b7;border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">📊 تقرير الجلسة</button>';
    h += '<button onclick="if(confirm(\'مسح سجل الجلسة؟ سيتم إلغاء تحديد كل الحاضرين المسجلين\')){_attendClearAll();}" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">\u{1F5D1}</button>';
    h += '</div>';
  }

  /* ══ عداد + أزرار التحكم السريع — لوحة عائمة مثل الراصد ══ */
  h += '<div class="np2-middle">';
  h += '<div class="np2-middle-content">';

  /* اللوحة العائمة */
  h += '<div id="attFloatPanel" class="np2-float-panel" style="'
    +'width:'+(WKS._afpW||320)+'px;'
    +'height:'+(WKS._afpH||360)+'px;'
    +'left:'+(WKS._afpX!==undefined?WKS._afpX:Math.max(10,Math.floor((window.innerWidth-320)/2)))+'px;'
    +'top:'+(WKS._afpY!==undefined?WKS._afpY:80)+'px;'
    +'">';
  /* شريط السحب */
  h += '<div class="np2-float-drag" id="attFloatDrag">'
    +'<span style="font-size:10px;color:#94a3b8;font-weight:700;">✅ بطاقة رصد الحضور</span>'
    +'<div style="display:flex;gap:4px;">'
    +'<button onclick="WKS._afpW=320;WKS._afpH=360;WKS._afpX=undefined;WKS._afpY=80;renderWeekly();" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;padding:2px 5px;" title="إعادة ضبط">⟳</button>'
    +'</div>'
    +'</div>';

  /* محتوى اللوحة */
  h += '<div class="np2-float-body">';

  /* بطاقة الإحصاء */
  h += '<div class="np2-card" style="padding:10px;gap:8px;">';

  /* صف العدادات */
  h += '<div style="display:flex;gap:8px;justify-content:center;">';
  h += '<div style="flex:1;text-align:center;background:rgba(16,185,129,.12);border:1.5px solid #10b981;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#34d399;">'+presentCount+'</div>';
  h += '<div style="font-size:9px;color:#6ee7b7;font-weight:700;">✅ حاضر</div>';
  h += '</div>';
  h += '<div style="flex:1;text-align:center;background:rgba(239,68,68,.12);border:1.5px solid #ef4444;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#f87171;">'+absentCount+'</div>';
  h += '<div style="font-size:9px;color:#fca5a5;font-weight:700;">✗ غائب</div>';
  h += '</div>';
  h += '<div style="flex:1;text-align:center;background:rgba(99,102,241,.12);border:1.5px solid #6366f1;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#a5b4fc;">'+students.length+'</div>';
  h += '<div style="font-size:9px;color:#818cf8;font-weight:700;">👥 الكل</div>';
  h += '</div>';
  h += '</div>';

  /* ══ أزرار اختيار رقم فترة الغياب (بجوار الإحصائيات) ══ */
  if(absCnt > 1) {
    h += '<div style="display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;">';
    h += '<span style="font-size:9px;color:#64748b;font-weight:700;">📌 فترة الغياب:</span>';
    absCols.forEach(function(col, ci) {
      var isActive = (ci === selPeriod);
      h += '<button onclick="WKS._attendPeriodIdx='+ci+';renderWeekly();" title="'+esc(col.label||('ف'+(ci+1)))+'" style="width:26px;height:26px;border-radius:50%;font-size:11px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation;border:2px solid '+(isActive?'#f59e0b':'#1e3a5f')+';background:'+(isActive?'rgba(245,158,11,.2)':'transparent')+';color:'+(isActive?'#fcd34d':'#64748b')+';transition:all .15s;">';
      h += (ci+1);
      h += '</button>';
    });
    h += '</div>';
  }

  /* تعليمة */
  h += '<div style="font-size:10px;color:#64748b;text-align:center;line-height:1.6;">أدخل اسم أو رقم كل <span style="color:#34d399;font-weight:700;">حاضر</span> ثم اضغط ↵<br>وفي النهاية اضغط زر <span style="color:#fbbf24;font-weight:700;">تعيين الغياب</span></div>';

  /* ══ اختيار الفترة ══ */
  if(absCnt > 1) {
    h += '<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:7px 10px;">';
    h += '<div style="font-size:9px;color:#64748b;font-weight:700;margin-bottom:6px;">📌 الفترة التي سيُسجَّل فيها الغياب:</div>';
    h += '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
    absCols.forEach(function(col, ci) {
      var isActive = (ci === selPeriod);
      h += '<button onclick="WKS._attendPeriodIdx='+ci+';renderWeekly();" style="flex:1;min-width:40px;padding:6px 4px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;border:2px solid '+(isActive?'#f59e0b':'#1e3a5f')+';background:'+(isActive?'rgba(245,158,11,.2)':'transparent')+';color:'+(isActive?'#fcd34d':'#64748b')+';transition:all .15s;">';
      h += esc(col.label||('ف'+(ci+1)));
      h += '</button>';
    });
    h += '</div>';
    h += '</div>';
  }

  /* أزرار التحكم */
  var selColLabel = absCols[selPeriod] ? (absCols[selPeriod].label||('ف'+(selPeriod+1))) : 'ف1';
  h += '<div style="display:flex;gap:6px;">';
  h += '<button onclick="_attendSelectAll()" style="flex:1;background:#1d4ed8;color:white;border:none;border-radius:8px;padding:7px 4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">☑ الكل حاضر</button>';
  h += '<button onclick="_attendClearAll()" style="flex:1;background:#374151;color:#d1d5db;border:none;border-radius:8px;padding:7px 4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">✕ مسح</button>';
  h += '<button onclick="_attendApplyAbsence()" '+(absentCount===0?'disabled ':'')+'style="flex:2;background:'+(absentCount>0?'#dc2626':'#374151')+';color:white;border:none;border-radius:8px;padding:7px 8px;font-size:10px;font-weight:800;cursor:'+(absentCount>0?'pointer':'not-allowed')+';font-family:inherit;touch-action:manipulation;opacity:'+(absentCount>0?'1':'.5')+';">⚡ '+absentCount+' غياب — '+esc(selColLabel)+'</button>';
  h += '</div>';

  /* ══ قائمة الطلاب المُرصَدين ══ */
  if(WKS._npCandidates && WKS._npCandidates.length) {
    /* قائمة المرشحين عند تعدد الاسم */
    h += '<div class="np2-results np2-results-full">';
    WKS._npCandidates.forEach(function(st) {
      var stuIdx = students.indexOf(st);
      var photo  = st.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
      h += '<div class="np2-result-row" onclick="_attendPickCandidate(\''+esc(st.id)+'\')">';
      h += '<span class="np2-rnum">'+(stuIdx+1)+'</span>';
      if(photo) h += '<img class="np2-rphoto" src="'+photo+'">';
      else       h += '<div class="np2-rphoto np2-rphoto-ph">'+(stuIdx+1)+'</div>';
      h += '<span class="np2-rname">'+esc(st.name)+'</span>';
      h += '<span style="color:#34d399;font-size:18px;margin-right:auto;">✓</span>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    /* قائمة الحاضرين الملتقطين حتى الآن */
    var presentList = students.filter(function(s){ return !!presentMap[s.id]; });
    if(presentList.length > 0) {
      h += '<div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;">';
      presentList.forEach(function(s) {
        var idx   = students.indexOf(s);
        var photo = s.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
        h += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;">';
        if(photo) h += '<img src="'+photo+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
        else       h += '<div style="width:28px;height:28px;border-radius:50%;background:#065f46;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#34d399;flex-shrink:0;">'+(idx+1)+'</div>';
        h += '<span style="flex:1;font-size:11px;color:#d1fae5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(s.name)+'</span>';
        h += '<span style="color:#34d399;font-size:13px;">✓</span>';
        h += '<button onclick="_attendRemove(\''+s.id+'\')" style="background:none;border:none;color:#f87171;font-size:14px;cursor:pointer;padding:0 4px;line-height:1;touch-action:manipulation;" title="إلغاء">✕</button>';
        h += '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="np2-empty">✍️ أدخل اسم أول حاضر أعلاه</div>';
    }
  }

  h += '</div>'; /* np2-card */
  h += '</div>'; /* np2-float-body */
  h += '<div class="np2-float-resize" id="attFloatResize">⤡</div>';
  h += '</div>'; /* attFloatPanel */
  h += '</div>'; /* np2-middle-content */
  h += '</div>'; /* np2-middle */

  /* ══ لوحة المفاتيح ══ */
  h += '<div class="np2-keyboard">';
  h += '<div class="np2-kb-row np2-kb-row4">';
  h += '<button class="np2-key np2-ruler" onclick="_npKeyPress(\' \')" title="مسافة">⎵</button>';
  h += '<button class="np2-key np2-enter" onclick="_attendSubmit()" title="تسجيل حاضر">↵</button>';
  h += '<button class="np2-key np2-del" onclick="_npKeyBackspace()">⌫</button>';
  h += '<button class="np2-key np2-clr" onclick="_npKeyReset()">✕</button>';
  h += '</div>';
  h += '<div class="np2-kb-row np2-kb-row5">';
  [1,2,3,4,5].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  h += '<div class="np2-kb-row np2-kb-row5">';
  [6,7,8,9,0].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  h += '</div>'; /* np2-keyboard */

  h += '</div>'; /* np2-wrap */
  return h;
}

/* ── تسجيل الطالب حاضراً من شريط الإدخال ── */
function _attendSubmit() {
  var ta  = document.getElementById('npDictInput');
  var raw = ta ? ta.value.trim() : (WKS.npTextInput||'').trim();
  if(!raw) return;

  var cls      = WKS.activeClass;
  var week     = WKS.activeWeek;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });

  /* بحث بالاسم أو الرقم */
  var queryNum = parseInt(raw, 10);
  var matched  = students.filter(function(s, si) {
    if(!isNaN(queryNum) && queryNum > 0 && (si+1) === queryNum) return true;
    return s.name && s.name.indexOf(raw) >= 0;
  });

  if(matched.length === 0) {
    WKS.npStatus     = '❌ لم يُعثر على: ' + raw;
    WKS.npStatusType = 'err';
    WKS._npCandidates = null;
    renderWeekly();
    return;
  }

  if(matched.length === 1) {
    _attendMarkPresent(matched[0].id, matched[0].name, ta);
    return;
  }

  /* عدة نتائج — اعرض القائمة */
  WKS._npCandidates = matched;
  WKS.npStatus     = '🔍 اختر الطالب من القائمة';
  WKS.npStatusType = 'info';
  renderWeekly();
}

/* ── تحديد طالب واحد كحاضر ── */
function _attendMarkPresent(studentId, studentName, ta) {
  if(!WKS._attendPresent) WKS._attendPresent = {};
  WKS._attendPresent[studentId] = true;
  WKS._npCandidates = null;
  WKS.npStatus     = '✅ ' + (studentName||'') + ' — حاضر';
  WKS.npStatusType = 'ok';
  if(ta) ta.value = '';
  WKS.npTextInput  = '';
  WKS._npDirectMode = false;
  WKS.numpadInput   = '';
  renderWeekly();
}

/* ── اختيار مرشح من القائمة ── */
function _attendPickCandidate(studentId) {
  var cls = WKS.activeClass;
  var st  = (DB.data[cls]||[]).find(function(s){ return String(s.id)===String(studentId); });
  if(!st) return;
  var ta = document.getElementById('npDictInput');
  _attendMarkPresent(st.id, st.name, ta);
}

/* ── إلغاء تحديد طالب حاضر ── */
function _attendRemove(studentId) {
  if(WKS._attendPresent) delete WKS._attendPresent[studentId];
  WKS.npStatus = '';
  renderWeekly();
}

/* ── تحديد الكل حاضر ── */
function _attendSelectAll() {
  var cls      = WKS.activeClass;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  WKS._attendPresent = {};
  students.forEach(function(s){ WKS._attendPresent[s.id] = true; });
  WKS.npStatus = '✅ تم تحديد كل الطلاب حاضرين';
  WKS.npStatusType = 'ok';
  renderWeekly();
}

/* ── مسح الكل ── */
function _attendClearAll() {
  WKS._attendPresent = {};
  WKS.npStatus = '';
  WKS.npTextInput = '';
  var ta = document.getElementById('npDictInput');
  if(ta) ta.value = '';
  renderWeekly();
}

/* ── تطبيق الغياب على الطلاب غير الحاضرين ── */
function _attendApplyAbsence() {
  var cls       = WKS.activeClass;
  var week      = WKS.activeWeek;
  var students  = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var absCols   = buildAbsCols(cls, week);
  var presentMap = WKS._attendPresent || {};
  var ci        = WKS._attendPeriodIdx !== undefined ? WKS._attendPeriodIdx : 0;
  /* تأكد أن الفترة ضمن النطاق */
  if(ci >= absCols.length) ci = 0;
  var colLabel  = absCols[ci] ? (absCols[ci].label || ('ف'+(ci+1))) : ('ف'+(ci+1));

  var absentStudents = students.filter(function(s){ return !presentMap[s.id]; });
  if(absentStudents.length === 0) {
    showSnack('✅ لا يوجد طلاب غائبون للتسجيل');
    return;
  }

  var confirmed = confirm(
    'سيتم تسجيل غياب ' + absentStudents.length + ' طالب\n' +
    'في الفترة: ' + colLabel + ' — الأسبوع ' + week + '.\n\n' +
    'هل تريد المتابعة؟'
  );
  if(!confirmed) return;

  absentStudents.forEach(function(s) {
    var abs = getStudentAbsences(cls, s.id);
    /* غياب في الفترة المحددة فقط */
    abs['w'+week+'_ci'+ci] = 'abs';
    applyAbsenceToGrades(cls, s.id);
  });

  saveDB();
  _refreshCurrentAndRelated();
  showSnack('✅ تم تسجيل غياب ' + absentStudents.length + ' طالب في ' + colLabel, 'ok');

  /* إعادة ضبط قائمة الحاضرين فقط — أبقِ الفترة المحددة */
  WKS._attendPresent = {};
  WKS.npStatus = '';
  renderWeekly();
}

// ══════════════════════════════════════════════════════
// رصد الغياب — تسجيل الغائبين مباشرة (عكس رصد الحضور)
// ══════════════════════════════════════════════════════

function renderWeeklyAbsent(cls, students, week, absCols) {
  if(!WKS._attendAbsent) WKS._attendAbsent = {};
  if(WKS._attendPeriodIdx === undefined || WKS._attendPeriodIdx >= absCols.length)
    WKS._attendPeriodIdx = 0;
  var absentMap  = WKS._attendAbsent;
  var absentCount = Object.keys(absentMap).length;
  var presentCount = students.filter(function(s){ return !absentMap[s.id]; }).length;
  var absCnt      = absCols.length;
  var selPeriod   = WKS._attendPeriodIdx;

  var h = '<div class="np2-wrap">';

  /* ══ شريط الإدخال ══ */
  h += '<div class="np2-top">';
  h += '<div class="np2-dictbar">';
  h += '<div class="np2-input-row">';
  h += '<textarea id="npDictInput" class="np2-dict-inp" rows="1"';
  h += ' placeholder="اسم الطالب الغائب أو رقمه — مثال: محمد  أو  5"';
  h += ' inputmode="none"';
  h += ' oninput="WKS.npTextInput=this.value;">';
  h += esc(WKS.npTextInput||'');
  h += '</textarea>';
  h += '<button class="np2-mic-btn" id="npMicBtn" onclick="_npMicToggle()" title="إملاء صوتي" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">🎤</button>';
  h += '<button class="np2-kbd-btn" onclick="_npShowMobileKeyboard()" title="لوحة المفاتيح" style="touch-action:manipulation;-webkit-tap-highlight-color:transparent;">⌨️</button>';
  h += '</div>';

  if(WKS.npStatus) {
    var stCls = WKS.npStatusType==='ok'?'np2-status-ok':WKS.npStatusType==='warn'?'np2-status-warn':WKS.npStatusType==='info'?'np2-status-info':'np2-status-err';
    h += '<div class="np2-status-box '+stCls+'"><span>'+esc(WKS.npStatus)+'</span></div>';
  }
  h += '</div>';
  h += '</div>'; /* np2-top */

  /* ══ شريط سجل الجلسة ══ */
  if(absentCount > 0) {
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;flex-wrap:wrap;">';
    h += '<span style="font-size:9px;color:#fca5a5;font-weight:700;">📋 الجلسة:</span>';
    h += '<span style="font-size:9px;background:rgba(239,68,68,.2);color:#fca5a5;padding:1px 7px;border-radius:6px;">✗ '+absentCount+'</span>';
    h += '<span style="font-size:9px;background:rgba(16,185,129,.2);color:#6ee7b7;padding:1px 7px;border-radius:6px;">✅ '+presentCount+'</span>';
    h += '<button onclick="_absentSessionReport()" style="margin-right:auto;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#fca5a5;border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">📊 تقرير الجلسة</button>';
    h += '<button onclick="if(confirm(\'مسح سجل الجلسة؟ سيتم إلغاء تحديد كل الغائبين المسجلين\')){_absentClearAll();}" style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#6ee7b7;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">\u{1F5D1}</button>';
    h += '</div>';
  }

  /* ══ عداد + أزرار التحكم السريع — لوحة عائمة مثل الراصد ══ */
  h += '<div class="np2-middle">';
  h += '<div class="np2-middle-content">';

  /* اللوحة العائمة */
  h += '<div id="absFloatPanel" class="np2-float-panel" style="'
    +'width:'+(WKS._bfpW||320)+'px;'
    +'height:'+(WKS._bfpH||360)+'px;'
    +'left:'+(WKS._bfpX!==undefined?WKS._bfpX:Math.max(10,Math.floor((window.innerWidth-320)/2)))+'px;'
    +'top:'+(WKS._bfpY!==undefined?WKS._bfpY:80)+'px;'
    +'">';
  /* شريط السحب */
  h += '<div class="np2-float-drag" id="absFloatDrag">'
    +'<span style="font-size:10px;color:#94a3b8;font-weight:700;">🚫 بطاقة رصد الغياب</span>'
    +'<div style="display:flex;gap:4px;">'
    +'<button onclick="WKS._bfpW=320;WKS._bfpH=360;WKS._bfpX=undefined;WKS._bfpY=80;renderWeekly();" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;padding:2px 5px;" title="إعادة ضبط">⟳</button>'
    +'</div>'
    +'</div>';

  /* محتوى اللوحة */
  h += '<div class="np2-float-body">';

  h += '<div class="np2-card" style="padding:10px;gap:8px;">';

  /* صف العدادات */
  h += '<div style="display:flex;gap:8px;justify-content:center;">';
  h += '<div style="flex:1;text-align:center;background:rgba(239,68,68,.12);border:1.5px solid #ef4444;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#f87171;">'+absentCount+'</div>';
  h += '<div style="font-size:9px;color:#fca5a5;font-weight:700;">✗ غائب</div>';
  h += '</div>';
  h += '<div style="flex:1;text-align:center;background:rgba(16,185,129,.12);border:1.5px solid #10b981;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#34d399;">'+presentCount+'</div>';
  h += '<div style="font-size:9px;color:#6ee7b7;font-weight:700;">✅ حاضر</div>';
  h += '</div>';
  h += '<div style="flex:1;text-align:center;background:rgba(99,102,241,.12);border:1.5px solid #6366f1;border-radius:10px;padding:8px 4px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#a5b4fc;">'+students.length+'</div>';
  h += '<div style="font-size:9px;color:#818cf8;font-weight:700;">👥 الكل</div>';
  h += '</div>';
  h += '</div>';

  /* ══ أزرار اختيار رقم فترة الغياب (بجوار الإحصائيات) ══ */
  if(absCnt > 1) {
    h += '<div style="display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;">';
    h += '<span style="font-size:9px;color:#64748b;font-weight:700;">📌 فترة الغياب:</span>';
    absCols.forEach(function(col, ci) {
      var isActive = (ci === selPeriod);
      h += '<button onclick="WKS._attendPeriodIdx='+ci+';renderWeekly();" title="'+esc(col.label||('ف'+(ci+1)))+'" style="width:26px;height:26px;border-radius:50%;font-size:11px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation;border:2px solid '+(isActive?'#f59e0b':'#1e3a5f')+';background:'+(isActive?'rgba(245,158,11,.2)':'transparent')+';color:'+(isActive?'#fcd34d':'#64748b')+';transition:all .15s;">';
      h += (ci+1);
      h += '</button>';
    });
    h += '</div>';
  }

  /* تعليمة */
  h += '<div style="font-size:10px;color:#64748b;text-align:center;line-height:1.6;">أدخل اسم أو رقم كل <span style="color:#f87171;font-weight:700;">غائب</span> ثم اضغط ↵<br>وفي النهاية اضغط زر <span style="color:#fbbf24;font-weight:700;">تعيين الغياب</span></div>';

  /* ══ اختيار الفترة ══ */
  if(absCnt > 1) {
    h += '<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:7px 10px;">';
    h += '<div style="font-size:9px;color:#64748b;font-weight:700;margin-bottom:6px;">📌 الفترة التي سيُسجَّل فيها الغياب:</div>';
    h += '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
    absCols.forEach(function(col, ci) {
      var isActive = (ci === selPeriod);
      h += '<button onclick="WKS._attendPeriodIdx='+ci+';renderWeekly();" style="flex:1;min-width:40px;padding:6px 4px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;border:2px solid '+(isActive?'#f59e0b':'#1e3a5f')+';background:'+(isActive?'rgba(245,158,11,.2)':'transparent')+';color:'+(isActive?'#fcd34d':'#64748b')+';transition:all .15s;">';
      h += esc(col.label||('ف'+(ci+1)));
      h += '</button>';
    });
    h += '</div>';
    h += '</div>';
  }

  /* أزرار التحكم */
  var selColLabel = absCols[selPeriod] ? (absCols[selPeriod].label||('ف'+(selPeriod+1))) : 'ف1';
  h += '<div style="display:flex;gap:6px;">';
  h += '<button onclick="_absentSelectAll()" style="flex:1;background:#dc2626;color:white;border:none;border-radius:8px;padding:7px 4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">☑ الكل غائب</button>';
  h += '<button onclick="_absentClearAll()" style="flex:1;background:#374151;color:#d1d5db;border:none;border-radius:8px;padding:7px 4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">✕ مسح</button>';
  h += '<button onclick="_absentApply()" '+(absentCount===0?'disabled ':'')+'style="flex:2;background:'+(absentCount>0?'#dc2626':'#374151')+';color:white;border:none;border-radius:8px;padding:7px 8px;font-size:10px;font-weight:800;cursor:'+(absentCount>0?'pointer':'not-allowed')+';font-family:inherit;touch-action:manipulation;opacity:'+(absentCount>0?'1':'.5')+';">⚡ '+absentCount+' غياب — '+esc(selColLabel)+'</button>';
  h += '</div>';

  /* ══ قائمة الطلاب المُرصَدين ══ */
  if(WKS._npCandidates && WKS._npCandidates.length) {
    h += '<div class="np2-results np2-results-full">';
    WKS._npCandidates.forEach(function(st) {
      var stuIdx = students.indexOf(st);
      var photo  = st.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
      h += '<div class="np2-result-row" onclick="_absentPickCandidate(\''+esc(st.id)+'\')">';
      h += '<span class="np2-rnum">'+(stuIdx+1)+'</span>';
      if(photo) h += '<img class="np2-rphoto" src="'+photo+'">';
      else       h += '<div class="np2-rphoto np2-rphoto-ph">'+(stuIdx+1)+'</div>';
      h += '<span class="np2-rname">'+esc(st.name)+'</span>';
      h += '<span style="color:#f87171;font-size:18px;margin-right:auto;">✕</span>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    /* قائمة الغائبين الملتقطين حتى الآن */
    var absentList = students.filter(function(s){ return !!absentMap[s.id]; });
    if(absentList.length > 0) {
      h += '<div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;">';
      absentList.forEach(function(s) {
        var idx   = students.indexOf(s);
        var photo = s.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
        h += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;">';
        if(photo) h += '<img src="'+photo+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
        else       h += '<div style="width:28px;height:28px;border-radius:50%;background:#7f1d1d;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#f87171;flex-shrink:0;">'+(idx+1)+'</div>';
        h += '<span style="flex:1;font-size:11px;color:#fee2e2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(s.name)+'</span>';
        h += '<span style="color:#f87171;font-size:13px;">✕</span>';
        h += '<button onclick="_absentRemove(\''+s.id+'\')" style="background:none;border:none;color:#34d399;font-size:14px;cursor:pointer;padding:0 4px;line-height:1;touch-action:manipulation;" title="إلغاء">✓</button>';
        h += '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="np2-empty">✍️ أدخل اسم أول غائب أعلاه</div>';
    }
  }

  h += '</div>'; /* np2-card */
  h += '</div>'; /* np2-float-body */
  h += '<div class="np2-float-resize" id="absFloatResize">⤡</div>';
  h += '</div>'; /* absFloatPanel */
  h += '</div>'; /* np2-middle-content */
  h += '</div>'; /* np2-middle */

  /* ══ لوحة المفاتيح ══ */
  h += '<div class="np2-keyboard">';
  h += '<div class="np2-kb-row np2-kb-row4">';
  h += '<button class="np2-key np2-ruler" onclick="_npKeyPress(\' \')" title="مسافة">⎵</button>';
  h += '<button class="np2-key np2-enter" onclick="_absentSubmit()" title="تسجيل غائب">↵</button>';
  h += '<button class="np2-key np2-del" onclick="_npKeyBackspace()">⌫</button>';
  h += '<button class="np2-key np2-clr" onclick="_npKeyReset()">✕</button>';
  h += '</div>';
  h += '<div class="np2-kb-row np2-kb-row5">';
  [1,2,3,4,5].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  h += '<div class="np2-kb-row np2-kb-row5">';
  [6,7,8,9,0].forEach(function(n){ h += '<button class="np2-key" onclick="_npKeyPress(\''+n+'\')">'+n+'</button>'; });
  h += '</div>';
  h += '</div>'; /* np2-keyboard */

  h += '</div>'; /* np2-wrap */
  return h;
}

/* ── تسجيل الطالب غائباً من شريط الإدخال ── */
function _absentSubmit() {
  var ta  = document.getElementById('npDictInput');
  var raw = ta ? ta.value.trim() : (WKS.npTextInput||'').trim();
  if(!raw) return;

  var cls      = WKS.activeClass;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });

  var queryNum = parseInt(raw, 10);
  var matched  = students.filter(function(s, si) {
    if(!isNaN(queryNum) && queryNum > 0 && (si+1) === queryNum) return true;
    return s.name && s.name.indexOf(raw) >= 0;
  });

  if(matched.length === 0) {
    WKS.npStatus     = '❌ لم يُعثر على: ' + raw;
    WKS.npStatusType = 'err';
    WKS._npCandidates = null;
    renderWeekly();
    return;
  }

  if(matched.length === 1) {
    _absentMark(matched[0].id, matched[0].name, ta);
    return;
  }

  WKS._npCandidates = matched;
  WKS.npStatus     = '🔍 اختر الطالب من القائمة';
  WKS.npStatusType = 'info';
  renderWeekly();
}

/* ── تحديد طالب واحد كغائب ── */
function _absentMark(studentId, studentName, ta) {
  if(!WKS._attendAbsent) WKS._attendAbsent = {};
  WKS._attendAbsent[studentId] = true;
  WKS._npCandidates = null;
  WKS.npStatus     = '✗ ' + (studentName||'') + ' — غائب';
  WKS.npStatusType = 'ok';
  if(ta) ta.value = '';
  WKS.npTextInput  = '';
  WKS._npDirectMode = false;
  WKS.numpadInput   = '';
  renderWeekly();
}

/* ── اختيار مرشح من القائمة ── */
function _absentPickCandidate(studentId) {
  var cls = WKS.activeClass;
  var st  = (DB.data[cls]||[]).find(function(s){ return String(s.id)===String(studentId); });
  if(!st) return;
  var ta = document.getElementById('npDictInput');
  _absentMark(st.id, st.name, ta);
}

/* ── إلغاء تحديد طالب غائب ── */
function _absentRemove(studentId) {
  if(WKS._attendAbsent) delete WKS._attendAbsent[studentId];
  WKS.npStatus = '';
  renderWeekly();
}

/* ── تحديد الكل غائب ── */
function _absentSelectAll() {
  var cls      = WKS.activeClass;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  WKS._attendAbsent = {};
  students.forEach(function(s){ WKS._attendAbsent[s.id] = true; });
  WKS.npStatus = '✗ تم تحديد كل الطلاب غائبين';
  WKS.npStatusType = 'ok';
  renderWeekly();
}

/* ── مسح الكل ── */
function _absentClearAll() {
  WKS._attendAbsent = {};
  WKS.npStatus = '';
  WKS.npTextInput = '';
  var ta = document.getElementById('npDictInput');
  if(ta) ta.value = '';
  renderWeekly();
}

/* ── تطبيق الغياب على الطلاب المحددين كغائبين ── */
function _absentApply() {
  var cls       = WKS.activeClass;
  var week      = WKS.activeWeek;
  var students  = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var absCols   = buildAbsCols(cls, week);
  var absentMap = WKS._attendAbsent || {};
  var ci        = WKS._attendPeriodIdx !== undefined ? WKS._attendPeriodIdx : 0;
  if(ci >= absCols.length) ci = 0;
  var colLabel  = absCols[ci] ? (absCols[ci].label || ('ف'+(ci+1))) : ('ف'+(ci+1));

  var absentStudents = students.filter(function(s){ return !!absentMap[s.id]; });
  if(absentStudents.length === 0) {
    showSnack('✅ لا يوجد طلاب غائبون للتسجيل');
    return;
  }

  var confirmed = confirm(
    'سيتم تسجيل غياب ' + absentStudents.length + ' طالب\n' +
    'في الفترة: ' + colLabel + ' — الأسبوع ' + week + '.\n\n' +
    'هل تريد المتابعة؟'
  );
  if(!confirmed) return;

  absentStudents.forEach(function(s) {
    var abs = getStudentAbsences(cls, s.id);
    abs['w'+week+'_ci'+ci] = 'abs';
    applyAbsenceToGrades(cls, s.id);
  });

  saveDB();
  _refreshCurrentAndRelated();
  showSnack('✅ تم تسجيل غياب ' + absentStudents.length + ' طالب في ' + colLabel, 'ok');

  WKS._attendAbsent = {};
  WKS.npStatus = '';
  renderWeekly();
}

// ══ تقرير جلسة رصد الحضور ══
function _attendSessionReport() {
  var cls = WKS.activeClass;
  var week = WKS.activeWeek || 1;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var presentMap = WKS._attendPresent || {};
  var presentIds = Object.keys(presentMap);
  if(!presentIds.length){ showSnack('⚠ لا يوجد سجل لهذه الجلسة'); return; }

  var presentList = [];
  presentIds.forEach(function(id){
    var st = students.find(function(s){ return String(s.id)===String(id); });
    if(st) presentList.push(st);
  });
  var absentList = students.filter(function(s){ return !presentMap[s.id]; });

  var total = students.length;
  var pct = total>0 ? Math.round(presentList.length/total*100) : 0;

  var old = document.getElementById('npSessionReportModal');
  if(old) old.remove();

  var mo = document.createElement('div');
  mo.id = 'npSessionReportModal';
  mo.className = 'mo';
  mo.style.touchAction = 'pan-y';
  mo.style.overflowY = 'auto';
  mo.style.webkitOverflowScrolling = 'touch';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };

  var h = '<div class="md" style="max-width:560px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;background:#0d1117;border:2px solid #16a34a;" onclick="event.stopPropagation()">';

  h += '<div class="mh" style="background:linear-gradient(135deg,#064e3b,#065f46);border-bottom:2px solid #16a34a;position:sticky;top:0;z-index:2;">';
  h += '<span style="font-size:18px;">📊</span>';
  h += '<div style="flex:1;">';
  h += '<h2 style="color:#6ee7b7;margin:0;font-size:13px;">تقرير جلسة رصد الحضور</h2>';
  h += '<div style="font-size:9px;color:#4ade80;margin-top:2px;">الأسبوع '+week+' — الفصل: <strong>'+esc(cls)+'</strong></div>';
  h += '</div>';
  h += '<button class="xbtn" style="color:#6ee7b7;" onclick="document.getElementById(\'npSessionReportModal\').remove()">✕</button>';
  h += '</div>';

  h += '<div class="mb" style="padding:12px;display:flex;flex-direction:column;gap:12px;">';

  function sCard(icon,val,lbl,bg,clr){
    return '<div style="background:'+bg+';border:1px solid '+clr+'44;border-radius:10px;padding:8px 6px;text-align:center;">'
      +'<div style="font-size:18px;font-weight:900;color:'+clr+';">'+val+'</div>'
      +'<div style="font-size:8.5px;color:'+clr+'99;margin-top:2px;">'+icon+' '+lbl+'</div></div>';
  }
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;">';
  h += sCard('✅',''+presentList.length,'حاضر','rgba(16,185,129,.12)','#6ee7b7');
  h += sCard('✗',''+absentList.length,'غائب','rgba(239,68,68,.12)','#fca5a5');
  h += sCard('👥',''+total,'الكل','rgba(99,102,241,.12)','#a5b4fc');
  h += sCard('📊',''+pct+'%','نسبة الحضور','rgba(251,191,36,.12)','#fcd34d');
  h += '</div>';

  if(presentList.length){
    h += '<div style="background:#03140d;border:1px solid #065f46;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#6ee7b7;margin-bottom:6px;">✅ الحاضرون ('+presentList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    presentList.forEach(function(s){
      h += '<span style="background:#064e3b;color:#6ee7b7;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;">'+esc(s.name)+'</span>';
    });
    h += '</div></div>';
  }

  if(absentList.length){
    h += '<div style="background:#1a0000;border:1px solid #7f1d1d;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#fca5a5;margin-bottom:6px;">✗ الغائبون — متبقي ('+absentList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    absentList.forEach(function(s){
      h += '<span style="background:#7f1d1d;color:#fca5a5;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;">'+esc(s.name)+'</span>';
    });
    h += '</div></div>';
  }

  h += '</div>'; // .mb
  h += '<div class="mf" style="border-top:1px solid #16a34a;background:#0d1117;">';
  h += '<button class="btn btn-ghost" onclick="document.getElementById(\'npSessionReportModal\').remove()">إغلاق</button>';
  h += '<button class="btn" style="background:rgba(16,185,129,.2);border:1px solid #16a34a;color:#6ee7b7;" onclick="_attendSessionReportPrint()">🖨 طباعة</button>';
  if(absentList.length){
    h += '<button class="btn" style="background:rgba(220,38,38,.2);border:1px solid #dc2626;color:#fca5a5;" onclick="document.getElementById(\'npSessionReportModal\').remove();_attendApplyAbsence();">⚡ تطبيق الغياب الآن</button>';
  }
  h += '</div>';
  h += '</div>';

  mo.innerHTML = h;
  document.body.appendChild(mo);
}

function _attendSessionReportPrint() {
  var cls = WKS.activeClass;
  var week = WKS.activeWeek || 1;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var presentMap = WKS._attendPresent || {};
  var presentList = students.filter(function(s){ return !!presentMap[s.id]; });
  var absentList  = students.filter(function(s){ return !presentMap[s.id]; });
  var total = students.length;
  var pct = total>0 ? Math.round(presentList.length/total*100) : 0;

  var rows = students.map(function(s,i){
    var isPresent = !!presentMap[s.id];
    return '<tr><td>'+(i+1)+'</td><td style="text-align:right">'+esc(s.name)+'</td>'
      +'<td>'+(isPresent?'✅ حاضر':'✗ غائب')+'</td></tr>';
  }).join('');

  var now = new Date();
  var dateStr = now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير جلسة رصد الحضور</title>'
    +'<style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px;}h1{font-size:15px;margin-bottom:4px;}table{border-collapse:collapse;width:100%;margin-top:12px;}th,td{border:1px solid #ccc;padding:5px 8px;font-size:12px;text-align:center;}th{background:#064e3b;color:white;}.stat{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;padding:5px 14px;border-radius:8px;margin:4px;font-size:12px;font-weight:700;}</style>'
    +'</head><body>'
    +'<h1>📊 تقرير جلسة رصد الحضور — أسبوع '+week+' — فصل: '+esc(cls)+'</h1>'
    +'<div style="font-size:11px;color:#555;margin-bottom:8px;">تاريخ الطباعة: '+dateStr+'</div>'
    +'<div><span class="stat">✅ حاضر: '+presentList.length+'</span><span class="stat">✗ غائب: '+absentList.length+'</span><span class="stat">👥 الكل: '+total+'</span><span class="stat">📊 نسبة الحضور: '+pct+'%</span></div>'
    +'<table><thead><tr><th>#</th><th>الطالب</th><th>الحالة</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'</body></html>');
  win.document.close();
  win.print();
}

// ══ تقرير جلسة رصد الغياب ══
function _absentSessionReport() {
  var cls = WKS.activeClass;
  var week = WKS.activeWeek || 1;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var absentMap = WKS._attendAbsent || {};
  var absentIds = Object.keys(absentMap);
  if(!absentIds.length){ showSnack('⚠ لا يوجد سجل لهذه الجلسة'); return; }

  var absentList = [];
  absentIds.forEach(function(id){
    var st = students.find(function(s){ return String(s.id)===String(id); });
    if(st) absentList.push(st);
  });
  var presentList = students.filter(function(s){ return !absentMap[s.id]; });

  var total = students.length;
  var pct = total>0 ? Math.round(absentList.length/total*100) : 0;

  var old = document.getElementById('npSessionReportModal');
  if(old) old.remove();

  var mo = document.createElement('div');
  mo.id = 'npSessionReportModal';
  mo.className = 'mo';
  mo.style.touchAction = 'pan-y';
  mo.style.overflowY = 'auto';
  mo.style.webkitOverflowScrolling = 'touch';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };

  var h = '<div class="md" style="max-width:560px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;background:#0d1117;border:2px solid #dc2626;" onclick="event.stopPropagation()">';

  h += '<div class="mh" style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-bottom:2px solid #dc2626;position:sticky;top:0;z-index:2;">';
  h += '<span style="font-size:18px;">📊</span>';
  h += '<div style="flex:1;">';
  h += '<h2 style="color:#fca5a5;margin:0;font-size:13px;">تقرير جلسة رصد الغياب</h2>';
  h += '<div style="font-size:9px;color:#fb7185;margin-top:2px;">الأسبوع '+week+' — الفصل: <strong>'+esc(cls)+'</strong></div>';
  h += '</div>';
  h += '<button class="xbtn" style="color:#fca5a5;" onclick="document.getElementById(\'npSessionReportModal\').remove()">✕</button>';
  h += '</div>';

  h += '<div class="mb" style="padding:12px;display:flex;flex-direction:column;gap:12px;">';

  function sCard(icon,val,lbl,bg,clr){
    return '<div style="background:'+bg+';border:1px solid '+clr+'44;border-radius:10px;padding:8px 6px;text-align:center;">'
      +'<div style="font-size:18px;font-weight:900;color:'+clr+';">'+val+'</div>'
      +'<div style="font-size:8.5px;color:'+clr+'99;margin-top:2px;">'+icon+' '+lbl+'</div></div>';
  }
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;">';
  h += sCard('✗',''+absentList.length,'غائب','rgba(239,68,68,.12)','#fca5a5');
  h += sCard('✅',''+presentList.length,'حاضر','rgba(16,185,129,.12)','#6ee7b7');
  h += sCard('👥',''+total,'الكل','rgba(99,102,241,.12)','#a5b4fc');
  h += sCard('📊',''+pct+'%','نسبة الغياب','rgba(251,191,36,.12)','#fcd34d');
  h += '</div>';

  if(absentList.length){
    h += '<div style="background:#1a0000;border:1px solid #7f1d1d;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#fca5a5;margin-bottom:6px;">✗ الغائبون ('+absentList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    absentList.forEach(function(s){
      h += '<span style="background:#7f1d1d;color:#fca5a5;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;">'+esc(s.name)+'</span>';
    });
    h += '</div></div>';
  }

  if(presentList.length){
    h += '<div style="background:#03140d;border:1px solid #065f46;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#6ee7b7;margin-bottom:6px;">✅ الحاضرون — متبقي ('+presentList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    presentList.forEach(function(s){
      h += '<span style="background:#064e3b;color:#6ee7b7;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;">'+esc(s.name)+'</span>';
    });
    h += '</div></div>';
  }

  h += '</div>'; // .mb
  h += '<div class="mf" style="border-top:1px solid #dc2626;background:#0d1117;">';
  h += '<button class="btn btn-ghost" onclick="document.getElementById(\'npSessionReportModal\').remove()">إغلاق</button>';
  h += '<button class="btn" style="background:rgba(220,38,38,.2);border:1px solid #dc2626;color:#fca5a5;" onclick="_absentSessionReportPrint()">🖨 طباعة</button>';
  if(absentList.length){
    h += '<button class="btn" style="background:rgba(220,38,38,.2);border:1px solid #dc2626;color:#fca5a5;" onclick="document.getElementById(\'npSessionReportModal\').remove();_absentApply();">⚡ تطبيق الغياب الآن</button>';
  }
  h += '</div>';
  h += '</div>';

  mo.innerHTML = h;
  document.body.appendChild(mo);
}

function _absentSessionReportPrint() {
  var cls = WKS.activeClass;
  var week = WKS.activeWeek || 1;
  var students = (DB.data[cls]||[]).filter(function(s){ return s.name; });
  var absentMap = WKS._attendAbsent || {};
  var absentList  = students.filter(function(s){ return !!absentMap[s.id]; });
  var presentList = students.filter(function(s){ return !absentMap[s.id]; });
  var total = students.length;
  var pct = total>0 ? Math.round(absentList.length/total*100) : 0;

  var rows = students.map(function(s,i){
    var isAbsent = !!absentMap[s.id];
    return '<tr><td>'+(i+1)+'</td><td style="text-align:right">'+esc(s.name)+'</td>'
      +'<td>'+(isAbsent?'✗ غائب':'✅ حاضر')+'</td></tr>';
  }).join('');

  var now = new Date();
  var dateStr = now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير جلسة رصد الغياب</title>'
    +'<style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px;}h1{font-size:15px;margin-bottom:4px;}table{border-collapse:collapse;width:100%;margin-top:12px;}th,td{border:1px solid #ccc;padding:5px 8px;font-size:12px;text-align:center;}th{background:#7f1d1d;color:white;}.stat{display:inline-block;background:#fef2f2;border:1px solid #fecaca;padding:5px 14px;border-radius:8px;margin:4px;font-size:12px;font-weight:700;}</style>'
    +'</head><body>'
    +'<h1>📊 تقرير جلسة رصد الغياب — أسبوع '+week+' — فصل: '+esc(cls)+'</h1>'
    +'<div style="font-size:11px;color:#555;margin-bottom:8px;">تاريخ الطباعة: '+dateStr+'</div>'
    +'<div><span class="stat">✗ غائب: '+absentList.length+'</span><span class="stat">✅ حاضر: '+presentList.length+'</span><span class="stat">👥 الكل: '+total+'</span><span class="stat">📊 نسبة الغياب: '+pct+'%</span></div>'
    +'<table><thead><tr><th>#</th><th>الطالب</th><th>الحالة</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'</body></html>');
  win.document.close();
  win.print();
}

/* ── ربط المايك بـ _attendSubmit عند وضع الحضور ── */
var _origNpSubmitRef = null; // محفوظ للاستعادة

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
  var curField = fld==='assess'?aF : fld==='hw'?hF : fld==='beh'?bF : fld==='ex1'?'ex1' : 'ex2';
  var maxVal   = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : (fld==='ex1'||fld==='ex2')?15 : 10;

  var cur = WKS.numpadInput || '';
  var next = cur + String(n);
  var num  = Number(next);

  if(num > maxVal) next = String(maxVal);
  WKS.numpadInput = next;

  /* حفظ مباشر بدون timer الـ render */
  var stuIdx = WKS.numpadStudentIdx;
  var val = clamp(Number(WKS.numpadInput)||0, 0, maxVal);
  if(DB.data[cls] && DB.data[cls][stuIdx]) {
    DB.data[cls][stuIdx][curField] = val;
    saveDB();
    _gradesUpdateTotCell(cls, stuIdx);
  }

  /* تحديث الشاشة فقط بدون إعادة رسم كاملة */
  _npRefreshDisplay();
}

function _npDel() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput = (WKS.numpadInput||'').slice(0,-1);
  _npRefreshDisplay();
  if(WKS.numpadInput==='') {
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:fld==='beh'?'bw'+week:fld==='ex1'?'ex1':'ex2';
    /* حفظ مباشر */
    if(DB.data[cls] && DB.data[cls][WKS.numpadStudentIdx]) {
      DB.data[cls][WKS.numpadStudentIdx][curField] = '';
      saveDB();
      _gradesUpdateTotCell(cls, WKS.numpadStudentIdx);
    }
  }
}

function _npClear() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput='';
  var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
  var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:fld==='beh'?'bw'+week:fld==='ex1'?'ex1':'ex2';
  /* حفظ مباشر */
  if(DB.data[cls] && DB.data[cls][WKS.numpadStudentIdx]) {
    DB.data[cls][WKS.numpadStudentIdx][curField] = '';
    saveDB();
    _gradesUpdateTotCell(cls, WKS.numpadStudentIdx);
  }
  _npRefreshDisplay();
}

/* ══ تسجيل/إزالة إدخال "مباشر" (نقر بطاقة + لوحة أرقام) في سجل جلسة الراصد ══
   نفس WKS.npSessionLog المستخدم في تقرير الجلسة، بحيث تظهر فيه أيضاً
   الدرجات المُدخلة مباشرة (لا فقط عبر الإملاء الصوتي/النصي) بترتيب الإدخال */
function _npLogDirectSet(st, fld, val, maxVal, isAbsent) {
  if(!st) return;
  if(!WKS.npSessionLog) WKS.npSessionLog = [];
  var existing = null;
  for(var i=0;i<WKS.npSessionLog.length;i++){
    var l = WKS.npSessionLog[i];
    if(l.direct && l.matchedName===st.name && l.field===fld){ existing=l; break; }
  }
  if(existing){
    existing.grade    = val;
    existing.maxVal   = maxVal;
    existing.isAbsent = !!isAbsent;
  } else {
    WKS.npSessionLog.unshift({
      inputText:  '⌨ إدخال مباشر',
      matchedName: st.name,
      grade:      val,
      field:      fld,
      maxVal:     maxVal,
      isAbsent:   !!isAbsent,
      status:     'ok',
      byNum:      false,
      direct:     true
    });
    if(WKS.npSessionLog.length>100) WKS.npSessionLog.pop();
  }
}
function _npLogDirectRemove(st, fld) {
  if(!st || !WKS.npSessionLog || !WKS.npSessionLog.length) return;
  WKS.npSessionLog = WKS.npSessionLog.filter(function(l){
    return !(l.direct && l.matchedName===st.name && l.field===fld);
  });
}

function _npToggleAbs(colIndex) {
  if(!WKS.numpadStudent) return;
  var cls=WKS.activeClass, week=WKS.activeWeek;
  toggleAbsence(cls, WKS.numpadStudent.id, week, colIndex);
  /* تحديث كائن الطالب في WKS */
  var st=(DB.data[cls]||[]).find(function(s){return s.id==WKS.numpadStudent.id;});
  if(st){
    WKS.numpadStudent=st; WKS.numpadStudentIdx=(DB.data[cls]||[]).indexOf(st);
    /* تطبيق الغياب فقط على الحقل المحدد حالياً (واجب/تقييم) وللفترة المحددة فقط */
    var fld=WKS.numpadField||'assess';
    if(fld==='hw'||fld==='assess'){
      var fField = fld==='hw' ? ('h'+week) : ('a'+week);
      var absData=getStudentAbsences(cls, st.id);
      var k='w'+week+'_ci'+colIndex;
      var state=absData[k];
      var stuIdx=WKS.numpadStudentIdx;
      if(DB.data[cls] && DB.data[cls][stuIdx]){
        if(state==='abs') DB.data[cls][stuIdx][fField]='غ';
        else if(state==='sick') DB.data[cls][stuIdx][fField]='م';
        else if(DB.data[cls][stuIdx][fField]==='غ'||DB.data[cls][stuIdx][fField]==='م') DB.data[cls][stuIdx][fField]='';
        saveDB();
        st=DB.data[cls][stuIdx];
        WKS.numpadStudent=st;
        /* تسجيل في سجل جلسة الراصد */
        var _npAbsMaxVal = fld==='hw' ? _getNpMax('hw',week) : _getNpMax('assess',week);
        if(st[fField]==='غ'||st[fField]==='م') _npLogDirectSet(st, fld, st[fField], _npAbsMaxVal, true);
        else _npLogDirectRemove(st, fld);
      }
    }
  }
  renderWeekly();
}

/* تعيين غائب/معفى لحقول الاختبارات */
function _npSetExamAbs(val) {
  if(!WKS.numpadStudent) return;
  var fld = WKS.numpadField || 'assess';
  if(fld !== 'ex1' && fld !== 'ex2') return;
  var cls = WKS.activeClass;
  var stuIdx = WKS.numpadStudentIdx;
  /* إذا كانت القيمة مضبوطة بالفعل — ألغِها (toggle) */
  var cur = DB.data[cls] && DB.data[cls][stuIdx] ? DB.data[cls][stuIdx][fld] : '';
  var newVal = (cur === val) ? '' : val;
  WKS.numpadInput = '';
  gradesSetField(stuIdx, fld, newVal);
  /* تحديث كائن الطالب في WKS */
  var st = (DB.data[cls]||[]).find(function(s){ return s.id == WKS.numpadStudent.id; });
  if(st){ WKS.numpadStudent = st; }
  /* تسجيل في سجل جلسة الراصد */
  if(newVal !== '') _npLogDirectSet(st, fld, newVal, 15, true);
  else _npLogDirectRemove(st, fld);
  WKS.npStatus = newVal === '' ? '🗑 تم المسح' : (newVal === 'غ' ? '🚫 غائب في الاختبار' : '✅ معفى من الاختبار');
  WKS.npStatusType = newVal === 'غ' ? 'err' : newVal === 'م' ? 'info' : 'ok';
  renderWeekly();
}

/* تبديل الحقل — تحديث فوري للـ UI بدون re-render كامل */
function _npSetField(fld) {
  WKS.numpadField = fld;
  /* active على أزرار التبويب */
  ['hw','assess','beh','ex1','ex2'].forEach(function(t) {
    var id = 'npTab' + t.charAt(0).toUpperCase() + t.slice(1);
    var btn = document.getElementById(id);
    if(btn) btn.className = 'np2-ftab' + (fld===t?' on':'');
  });
  /* active على خلايا الدرجات */
  var map = {assess:'npGradeAssess', hw:'npGradeHw', beh:'npGradeBeh', ex1:'npGradeEx1', ex2:'npGradeEx2'};
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
  var curField=fld==='assess'?aF:fld==='hw'?hF:fld==='beh'?bF:fld==='ex1'?'ex1':'ex2';
  var curVal=s?s[curField]:undefined;

  /* تحديث خلايا الدرجات */
  if(s) {
    var assessVal = inp!==''&&fld==='assess'?inp:(s[aF]!==undefined&&s[aF]!==''?s[aF]:'—');
    var hwVal     = inp!==''&&fld==='hw'    ?inp:(s[hF]!==undefined&&s[hF]!==''?s[hF]:'—');
    var behVal    = inp!==''&&fld==='beh'   ?inp:(s[bF]!==undefined&&s[bF]!==''?s[bF]:'—');
    var ex1Val    = inp!==''&&fld==='ex1'   ?inp:(s['ex1']!==undefined&&s['ex1']!==''?s['ex1']:'—');
    var ex2Val    = inp!==''&&fld==='ex2'   ?inp:(s['ex2']!==undefined&&s['ex2']!==''?s['ex2']:'—');
    var ga=document.getElementById('npGradeAssess');
    var gh=document.getElementById('npGradeHw');
    var gb=document.getElementById('npGradeBeh');
    var ge1=document.getElementById('npGradeEx1');
    var ge2=document.getElementById('npGradeEx2');
    if(ga) ga.textContent = String(assessVal);
    if(gh) gh.textContent = String(hwVal);
    if(gb) gb.textContent = String(behVal);
    if(ge1) ge1.textContent = String(ex1Val);
    if(ge2) ge2.textContent = String(ex2Val);
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

    var _isMob = /Android|iPhone|iPad/i.test(navigator.userAgent);
    var _savedMdl = (typeof DB !== 'undefined' && DB.meta && DB.meta.whisperModel) ? DB.meta.whisperModel : null;
    var _modelId = _savedMdl || (_isMob ? 'Xenova/whisper-tiny' : 'Xenova/whisper-base');
    _npWhisperPipe = await window._transformersPipeline(
      'automatic-speech-recognition',
      _modelId,
      {
        dtype: 'q8',
        device: 'wasm',
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
          chunk_length_s: 15,   /* جزء أصغر = استجابة أسرع على الموبايل */
          stride_length_s: 3,
          return_timestamps: false,
        });

        var txt = (result.text || '').trim();
        if(txt) {
          var ta = document.getElementById('npDictInput');
          if(ta) { ta.value = txt; WKS.npTextInput = txt; }
          WKS.npStatus = '✅ ' + txt;
          WKS.npStatusType = 'ok';
          _npRenderStatus();
          setTimeout(WKS.viewMode==='attend'?_attendSubmit:(WKS.viewMode==='absent'?_absentSubmit:_npSubmit), 300);
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
      if(!txt) {
        WKS.npStatus = '⚠️ لم يُسمع كلام واضح — حاول مرة أخرى';
        WKS.npStatusType = 'warn';
        _npRenderStatus();
        return;
      }
      setTimeout(WKS.viewMode==='attend'?_attendSubmit:(WKS.viewMode==='absent'?_absentSubmit:_npSubmit), 100);
    };
    _npMicRec.onerror = function(e) {
      /* لو انقطع النت أثناء التسجيل — انتقل لـ Whisper */
      if(e.error === 'network' || e.error === 'service-not-allowed') {
        showSnack('📶 انقطع النت — جارٍ التبديل للنموذج المحلي...');
        _npMicRec = null;
        if(btn) { btn.textContent='🎤'; btn.style.background=''; btn.style.borderColor=''; }
        _npWhisperReady ? _npWhisperRecord() : _npLoadWhisper();
      } else {
        var _errMsgs={'no-speech':'لم يُسمع كلام — حاول مرة أخرى','audio-capture':'لا يوجد مايك متاح','not-allowed':'تم رفض إذن المايك من المتصفح','aborted':'تم إلغاء التسجيل'};
        WKS.npStatus = '❌ ' + (_errMsgs[e.error] || ('خطأ في المايك: ' + (e.error||'')));
        WKS.npStatusType = 'err';
        _npRenderStatus();
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
  /* دائماً: اكتب الحرف/الرقم في صندوق الإملاء */
  _npPressToInput(ch);
  if(WKS._npDirectMode && WKS.numpadStudent) {
    var cls=WKS.activeClass, week=WKS.activeWeek, fld=WKS.numpadField||'assess';
    var aF='a'+week, hF='h'+week, bF='bw'+week;
    var curField=fld==='assess'?aF:fld==='hw'?hF:fld==='beh'?bF:fld==='ex1'?'ex1':'ex2';
    var maxVal=fld==='assess'?_getNpMax('assess',week):fld==='hw'?_getNpMax('hw',week):(fld==='ex1'||fld==='ex2')?15:10;
    var cur=WKS.numpadInput||'';
    var next=cur+String(ch);
    if(/^\d+$/.test(next)&&Number(next)>maxVal) next=String(maxVal);
    WKS.numpadInput=next;
    if(/^\d+$/.test(next)) {
      /* حفظ البيانات مباشرة بدون تشغيل timer الـ render */
      var activeCls = WKS.activeClass;
      if(DB.data[activeCls] && DB.data[activeCls][WKS.numpadStudentIdx]) {
        var _npVal = clamp(Number(next),0,maxVal);
        DB.data[activeCls][WKS.numpadStudentIdx][curField] = _npVal;
        saveDB();
        _gradesUpdateTotCell(activeCls, WKS.numpadStudentIdx);
        /* تسجيل في سجل جلسة الراصد */
        _npLogDirectSet(WKS.numpadStudent, fld, _npVal, maxVal, false);
      }
    }
    _npRefreshDisplay();
  }
}
function _npKeyBackspace() {
  /* دائماً: احذف من صندوق الإملاء */
  _npDelFromInput();
  if(WKS._npDirectMode && WKS.numpadStudent) _npDel();
}
function _npKeyReset() {
  /* دائماً: امسح صندوق الإملاء */
  _npClearInput();
  if(WKS._npDirectMode && WKS.numpadStudent) {
    WKS.numpadInput='';
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    gradesSetField(WKS.numpadStudentIdx, fld==='assess'?'a'+week:fld==='hw'?'h'+week:fld==='beh'?'bw'+week:fld==='ex1'?'ex1':'ex2', '');
    _npLogDirectRemove(WKS.numpadStudent, fld);
    WKS._npDirectMode=false; WKS.numpadStudent=null; WKS.npStatus='';
    renderWeekly();
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

function _npShowMobileKeyboard() {
  var ta = document.getElementById('npDictInput');
  if(!ta) return;
  ta.removeAttribute('inputmode');
  ta.blur();
  setTimeout(function() {
    ta.focus();
  }, 50);
  /* إعادة inputmode=none بعد إغلاق لوحة المفاتيح */
  ta.addEventListener('blur', function onBlur() {
    ta.setAttribute('inputmode','none');
    ta.removeEventListener('blur', onBlur);
  });
}

function _npSubmit() {
  var ta = document.getElementById('npDictInput');
  var raw = ta ? ta.value.trim() : (WKS.npTextInput||'').trim();
  if(!raw) return;

  var cls     = WKS.activeClass;
  var week    = WKS.activeWeek;
  var fld     = WKS.numpadField || 'assess';
  var aF='a'+week, hF='h'+week, bF='bw'+week;
  var curField = fld==='assess'?aF : fld==='hw'?hF : fld==='beh'?bF : fld==='ex1'?'ex1' : 'ex2';
  var maxVal   = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : (fld==='ex1'||fld==='ex2')?15 : 10;
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
      /* تسجيل في سجل الجلسة */
      if(!WKS.npSessionLog) WKS.npSessionLog = [];
      WKS.npSessionLog.unshift({inputText:raw,matchedName:st.name,grade:val,field:fld,maxVal:maxVal,isAbsent:false,status:'ok',byNum:!isNaN(queryNum)&&queryNum>0});
      if(WKS.npSessionLog.length>100) WKS.npSessionLog.pop();
    } else {
      /* لا توجد درجة — سجّل غائباً حسب نوع الحقل */
      var absCols = buildAbsCols(cls, week);
      var stuIdx2 = students.indexOf(st);
      var targetCi = WKS.npAbsTarget !== undefined ? WKS.npAbsTarget : 0;
      if(fld === 'ex1' || fld === 'ex2') {
        /* اختبار: سجّل غياب الفترة فقط بدون تغيير التقييم/الواجب + "غ" في حقل الاختبار */
        if(absCols.length > 0 && absCols[targetCi]) {
          var absData = getStudentAbsences(cls, st.id);
          var k = 'w' + week + '_ci' + targetCi;
          absData[k] = 'abs';
          saveDB(); /* حفظ الغياب مباشرة بدون applyAbsenceToGrades */
        }
        gradesSetField(stuIdx2, fld, 'غ');
        var _exLabel = fld === 'ex1' ? 'اختبار 1' : 'اختبار 2';
        WKS.npStatus     = '🔴 ' + st.name + ' — غائب (' + _exLabel + (absCols[targetCi] ? ' + ' + absCols[targetCi].label : '') + ')';
        WKS.npStatusType = 'warn';
        if(!WKS.npSessionLog) WKS.npSessionLog = [];
        WKS.npSessionLog.unshift({inputText:raw,matchedName:st.name,grade:'غ',field:fld,isAbsent:true,status:'ok',byNum:!isNaN(queryNum)&&queryNum>0});
        if(WKS.npSessionLog.length>100) WKS.npSessionLog.pop();
      } else {
        /* تقييم / واجب / سلوك — السلوك الافتراضي */
        var targetCi2 = WKS.npAbsTarget!==undefined ? WKS.npAbsTarget : 0;
        var _absField = fld==='hw' ? hF : aF;
        var _absLabel = fld==='hw' ? 'الواجب' : 'التقييم';
        if(absCols.length > 0 && absCols[targetCi2]) {
          var absData2 = getStudentAbsences(cls, st.id);
          var k2 = 'w' + week + '_ci' + targetCi2;
          absData2[k2] = 'abs';
          saveDB();
        }
        gradesSetField(stuIdx2, _absField, 'غ');
        WKS.npStatus     = '🔴 ' + st.name + ' — غائب (' + _absLabel + (absCols[targetCi2] ? ' + ' + absCols[targetCi2].label : '') + ')';
        WKS.npStatusType = 'warn';
        if(!WKS.npSessionLog) WKS.npSessionLog = [];
        WKS.npSessionLog.unshift({inputText:raw,matchedName:st.name,grade:'غ',field:fld,isAbsent:true,status:'ok',byNum:!isNaN(queryNum)&&queryNum>0});
        if(WKS.npSessionLog.length>100) WKS.npSessionLog.pop();
      }
      if(ta) ta.value = '';
      WKS.npTextInput  = '';
      WKS.numpadInput  = '';
    }
    var _sy = window.scrollY || window.pageYOffset;
    renderWeekly();
    if((window.scrollY || window.pageYOffset) !== _sy) window.scrollTo(0, _sy);
  }

  if(matched.length === 0) {
    WKS.npStatus     = '❌ لم يُعثر على: ' + nameStr;
    WKS.npStatusType = 'err';
    if(!WKS.npSessionLog) WKS.npSessionLog = [];
    WKS.npSessionLog.unshift({inputText:raw,matchedName:null,grade:gradeStr,field:fld,isAbsent:false,status:'fail',error:'لم يُعثر على: '+nameStr});
    if(WKS.npSessionLog.length>100) WKS.npSessionLog.pop();
    var _sy0 = window.scrollY || window.pageYOffset;
    renderWeekly();
    if((window.scrollY || window.pageYOffset) !== _sy0) window.scrollTo(0, _sy0);
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
    var photo = st.photo || (DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
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
    var curField = fld==='assess'?aF : fld==='hw'?hF : fld==='beh'?bF : fld==='ex1'?'ex1' : 'ex2';
    var maxVal = fld==='assess'?_getNpMax('assess',week) : fld==='hw'?_getNpMax('hw',week) : (fld==='ex1'||fld==='ex2')?15 : 10;
    var cur = WKS.numpadInput || '';
    var next = cur + String(n);
    if(Number(next) > maxVal) next = String(maxVal);
    WKS.numpadInput = next;
    var val = clamp(Number(WKS.numpadInput)||0, 0, maxVal);
    /* حفظ مباشر بدون timer الـ render */
    if(DB.data[cls] && DB.data[cls][WKS.numpadStudentIdx]) {
      DB.data[cls][WKS.numpadStudentIdx][curField] = val;
      saveDB();
      _gradesUpdateTotCell(cls, WKS.numpadStudentIdx);
    }
    _npRefreshDisplay();
  }
}

function _npDel() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput = (WKS.numpadInput||'').slice(0,-1);
  _npRefreshDisplay();
  if(WKS.numpadInput==='') {
    var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
    var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:fld==='beh'?'bw'+week:fld==='ex1'?'ex1':'ex2';
    /* حفظ مباشر */
    if(DB.data[cls] && DB.data[cls][WKS.numpadStudentIdx]) {
      DB.data[cls][WKS.numpadStudentIdx][curField] = '';
      saveDB();
      _gradesUpdateTotCell(cls, WKS.numpadStudentIdx);
      _npLogDirectRemove(WKS.numpadStudent, fld);
    }
  }
}

function _npClear() {
  if(!WKS.numpadStudent) return;
  WKS.numpadInput='';
  var cls=WKS.activeClass,week=WKS.activeWeek,fld=WKS.numpadField||'assess';
  var curField=fld==='assess'?'a'+week:fld==='hw'?'h'+week:fld==='beh'?'bw'+week:fld==='ex1'?'ex1':'ex2';
  /* حفظ مباشر */
  if(DB.data[cls] && DB.data[cls][WKS.numpadStudentIdx]) {
    DB.data[cls][WKS.numpadStudentIdx][curField] = '';
    saveDB();
    _gradesUpdateTotCell(cls, WKS.numpadStudentIdx);
    _npLogDirectRemove(WKS.numpadStudent, fld);
  }
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


function _initFloatPanel(panelId, dragId, rszId, posKeys) {
  var panel = document.getElementById(panelId || 'np2FloatPanel');
  var drag  = document.getElementById(dragId  || 'np2FloatDrag');
  var rsz   = document.getElementById(rszId   || 'np2FloatResize');
  if (!panel || !drag || !rsz) return;
  var K = posKeys || {x:'_fpX', y:'_fpY', w:'_fpW', h:'_fpH'};

  /* ── السحب ── */
  var dx=0, dy=0, dragging=false;

  function onDragStart(cx, cy) {
    dragging = true;
    dx = cx - panel.offsetLeft;
    dy = cy - panel.offsetTop;
  }
  function onDragMove(cx, cy) {
    if (!dragging) return;
    var x = Math.max(0, Math.min(window.innerWidth  - 80, cx - dx));
    var y = Math.max(0, Math.min(window.innerHeight - 80, cy - dy));
    panel.style.left = x + 'px';
    panel.style.top  = y + 'px';
    WKS[K.x] = x; WKS[K.y] = y;
  }

  drag.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'BUTTON') return;
    onDragStart(e.clientX, e.clientY); e.preventDefault();
  });
  drag.addEventListener('touchstart', function(e) {
    if (e.target.tagName === 'BUTTON') return;
    onDragStart(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault();
  }, {passive: false});

  /* ── تغيير الحجم ── */
  var rx=0, ry=0, rw=0, rh=0, resizing=false;

  function onRszStart(cx, cy) {
    resizing = true;
    rx = cx; ry = cy;
    rw = panel.offsetWidth; rh = panel.offsetHeight;
  }
  function onRszMove(cx, cy) {
    if (!resizing) return;
    var nw = Math.max(220, rw + (cx - rx));
    var nh = Math.max(180, rh + (cy - ry));
    panel.style.width  = nw + 'px';
    panel.style.height = nh + 'px';
    WKS[K.w] = nw; WKS[K.h] = nh;
  }

  rsz.addEventListener('mousedown', function(e) {
    onRszStart(e.clientX, e.clientY); e.preventDefault(); e.stopPropagation();
  });
  rsz.addEventListener('touchstart', function(e) {
    onRszStart(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); e.stopPropagation();
  }, {passive: false});

  /* ── أحداث مشتركة على document ── */
  var _mmov = function(e) { onDragMove(e.clientX, e.clientY); onRszMove(e.clientX, e.clientY); };
  var _tmov = function(e) {
    if (dragging || resizing) e.preventDefault();
    onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    onRszMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  var _end  = function() { dragging = false; resizing = false; };

  document.addEventListener('mousemove', _mmov);
  document.addEventListener('touchmove', _tmov, {passive: false});
  document.addEventListener('mouseup',   _end);
  document.addEventListener('touchend',  _end);

  /* تنظيف عند re-render */
  panel._cleanup = function() {
    document.removeEventListener('mousemove', _mmov);
    document.removeEventListener('touchmove', _tmov);
    document.removeEventListener('mouseup',   _end);
    document.removeEventListener('touchend',  _end);
  };
}


function _initNumpadEvents() {
  /* التركيز على البحث */
  setTimeout(function(){
    var inp=document.getElementById('npSearch');
    if(inp) inp.focus();
  }, 100);
}


// ══════════════════════════════════════════════════════
// FLOATING NUMPAD — لوحة أرقام عائمة قابلة للسحب والتحجيم
// ══════════════════════════════════════════════════════
(function(){
  var FNP = {
    el: null,
    tog: null,
    dragging: false,
    resizing: false,
    resizeDir: null,
    startX: 0, startY: 0,
    startW: 0, startH: 0,
    startL: 0, startT: 0,
    visible: false
  };

  /* ── إنشاء عنصر اللوحة ── */
  function buildFloatingNumpad() {
    if (document.getElementById('floatingNumpad')) return;

    var el = document.createElement('div');
    el.id = 'floatingNumpad';
    el.innerHTML =
      '<div class="fnp-handle" id="fnpHandle">' +
        '<div class="fnp-handle-dots"><span></span><span></span><span></span><span></span><span></span></div>' +
        '<span class="fnp-title" id="fnpHeaderLabel">🔢 لوحة الأرقام</span>' +
        '<button class="fnp-close-btn" onclick="FNP_hide()" title="إغلاق">✕</button>' +
      '</div>' +
      '<div class="fnp-body">' +
        /* صف العمليات */
        '<div class="fnp-row fnp-row4">' +
          '<button class="fnp-key fnp-space" onclick="_fnpKey(\' \')">⎵</button>' +
          '<button class="fnp-key fnp-enter" onclick="_fnpSubmit()">↵</button>' +
          '<button class="fnp-key fnp-del" onclick="_fnpDel()">⌫</button>' +
          '<button class="fnp-key fnp-clr" onclick="_fnpClr()">✕</button>' +
        '</div>' +
        /* صف 1-5 */
        '<div class="fnp-row fnp-row5">' +
          [1,2,3,4,5].map(function(n){return '<button class="fnp-key" onclick="_fnpKey(\''+n+'\')">'+n+'</button>';}).join('') +
        '</div>' +
        /* صف 6-0 */
        '<div class="fnp-row fnp-row5">' +
          [6,7,8,9,0].map(function(n){return '<button class="fnp-key" onclick="_fnpKey(\''+n+'\')">'+n+'</button>';}).join('') +
        '</div>' +
      '</div>' +
      /* مقابض تغيير الحجم */
      '<div class="fnp-resize-handle" id="fnpResizeL"></div>' +
      '<div class="fnp-resize-handle-r" id="fnpResizeR"></div>';

    document.body.appendChild(el);
    FNP.el = el;

    /* زر التبديل */
    var tog = document.createElement('button');
    tog.id = 'floatingNumpadToggle';
    tog.title = 'لوحة الأرقام';
    tog.innerHTML = '🔢';
    tog.onclick = FNP_toggle;
    tog.style.display = 'none';
    document.body.appendChild(tog);
    FNP.tog = tog;

    /* استعادة الموضع المحفوظ */
    var saved = _fnpLoadPos();
    if (saved) {
      el.style.left   = saved.l;
      el.style.top    = saved.t;
      el.style.bottom = 'auto';
      el.style.transform = 'none';
      if (saved.w) el.style.width  = saved.w;
      if (saved.h) el.style.height = saved.h;
    }

    _fnpBindDrag();
    _fnpBindResize();
  }

  /* ── ربط السحب ── */
  function _fnpBindDrag() {
    var handle = document.getElementById('fnpHandle');
    if (!handle) return;

    function onStart(e) {
      if (e.target.classList.contains('fnp-close-btn')) return;
      FNP.dragging = true;
      var touch = e.touches ? e.touches[0] : e;
      var rect = FNP.el.getBoundingClientRect();
      FNP.startX = touch.clientX - rect.left;
      FNP.startY = touch.clientY - rect.top;
      FNP.el.style.bottom = 'auto';
      FNP.el.style.transform = 'none';
      e.preventDefault();
    }
    function onMove(e) {
      if (!FNP.dragging) return;
      var touch = e.touches ? e.touches[0] : e;
      var nx = touch.clientX - FNP.startX;
      var ny = touch.clientY - FNP.startY;
      /* حدود الشاشة */
      var maxX = window.innerWidth  - FNP.el.offsetWidth;
      var maxY = window.innerHeight - FNP.el.offsetHeight;
      nx = Math.max(0, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
      FNP.el.style.left = nx + 'px';
      FNP.el.style.top  = ny + 'px';
      e.preventDefault();
    }
    function onEnd() {
      if (!FNP.dragging) return;
      FNP.dragging = false;
      _fnpSavePos();
    }
    handle.addEventListener('mousedown',  onStart, {passive:false});
    handle.addEventListener('touchstart', onStart, {passive:false});
    document.addEventListener('mousemove',  onMove, {passive:false});
    document.addEventListener('touchmove',  onMove, {passive:false});
    document.addEventListener('mouseup',  onEnd);
    document.addEventListener('touchend', onEnd);
  }

  /* ── ربط تغيير الحجم ── */
  function _fnpBindResize() {
    function onStart(e, dir) {
      FNP.resizing = true;
      FNP.resizeDir = dir;
      var touch = e.touches ? e.touches[0] : e;
      FNP.startX = touch.clientX;
      FNP.startY = touch.clientY;
      FNP.startW = FNP.el.offsetWidth;
      FNP.startH = FNP.el.offsetHeight;
      FNP.startL = FNP.el.getBoundingClientRect().left;
      FNP.el.style.bottom = 'auto';
      FNP.el.style.transform = 'none';
      e.preventDefault();
      e.stopPropagation();
    }
    function onMove(e) {
      if (!FNP.resizing) return;
      var touch = e.touches ? e.touches[0] : e;
      var dx = touch.clientX - FNP.startX;
      var dy = touch.clientY - FNP.startY;
      var newW = FNP.startW, newH = FNP.startH + dy;
      if (FNP.resizeDir === 'L') {
        newW = FNP.startW - dx;
        var newL = FNP.startL + dx;
        newW = Math.max(220, Math.min(newW, window.innerWidth - newL));
        FNP.el.style.width = newW + 'px';
        FNP.el.style.left  = newL + 'px';
      } else {
        newW = Math.max(220, Math.min(FNP.startW + dx, window.innerWidth - FNP.startL));
        FNP.el.style.width = newW + 'px';
      }
      newH = Math.max(180, newH);
      FNP.el.style.height = newH + 'px';
      e.preventDefault();
    }
    function onEnd() {
      if (!FNP.resizing) return;
      FNP.resizing = false;
      _fnpSavePos();
    }

    var rL = document.getElementById('fnpResizeL');
    var rR = document.getElementById('fnpResizeR');
    if (rL) {
      rL.addEventListener('mousedown',  function(e){onStart(e,'L');}, {passive:false});
      rL.addEventListener('touchstart', function(e){onStart(e,'L');}, {passive:false});
    }
    if (rR) {
      rR.addEventListener('mousedown',  function(e){onStart(e,'R');}, {passive:false});
      rR.addEventListener('touchstart', function(e){onStart(e,'R');}, {passive:false});
    }
    document.addEventListener('mousemove',  onMove, {passive:false});
    document.addEventListener('touchmove',  onMove, {passive:false});
    document.addEventListener('mouseup',  onEnd);
    document.addEventListener('touchend', onEnd);
  }

  /* ── حفظ واستعادة الموضع ── */
  function _fnpSavePos() {
    try {
      var rect = FNP.el.getBoundingClientRect();
      localStorage.setItem('fnp_pos', JSON.stringify({
        l: FNP.el.style.left, t: FNP.el.style.top,
        w: FNP.el.style.width, h: FNP.el.style.height
      }));
    } catch(e){}
  }
  function _fnpLoadPos() {
    try { return JSON.parse(localStorage.getItem('fnp_pos')||'null'); } catch(e){ return null; }
  }

  /* ── إظهار/إخفاء ── */
  window.FNP_show = function() {
    buildFloatingNumpad();
    FNP.el.classList.add('fnp-visible');
    FNP.tog.classList.add('fnp-tog-visible');
    /* إخفاء اللوحة الثابتة */
    var kb = document.querySelector('.np2-keyboard');
    if (kb) kb.classList.add('np2-keyboard-hidden');
    FNP.visible = true;
  };
  window.FNP_hide = function() {
    if (FNP.el) FNP.el.classList.remove('fnp-visible');
    /* إظهار اللوحة الثابتة مجدداً */
    var kb = document.querySelector('.np2-keyboard');
    if (kb) kb.classList.remove('np2-keyboard-hidden');
    FNP.visible = false;
    /* إلغاء تحديد خلية الجدول (أسبوعي) */
    if (typeof WKS !== 'undefined' && WKS._tblCell) {
      WKS._tblCell = null;
      WKS._tblInput = '';
      if (_currentPage === 'weekly' && typeof renderWeekly === 'function') renderWeekly();
    }
    /* إلغاء تحديد خلية الدرجات */
    if (typeof GS !== 'undefined' && GS._gsCell) {
      GS._gsCell = null;
      GS._gsInput = '';
      if (_currentPage === 'grades' && typeof renderGrades === 'function') renderGrades();
    }
  };
  window.FNP_toggle = function() {
    FNP.visible ? FNP_hide() : FNP_show();
  };

  /* ── أحداث الضغط تُحيل لوظائف الـ numpad الأصلية ── */
  window._fnpKey = function(k) {
    if (typeof GS !== 'undefined' && GS._gsCell && _currentPage === 'grades') {
      _gsFnpKey(k);
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'table' && WKS._tblCell) {
      _tblFnpKey(k);
    } else if (typeof _npKeyPress === 'function') _npKeyPress(k);
  };
  window._fnpDel = function() {
    if (typeof GS !== 'undefined' && GS._gsCell && _currentPage === 'grades') {
      _gsFnpDel();
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'table' && WKS._tblCell) {
      _tblFnpDel();
    } else if (typeof _npKeyBackspace === 'function') _npKeyBackspace();
  };
  window._fnpClr = function() {
    if (typeof GS !== 'undefined' && GS._gsCell && _currentPage === 'grades') {
      _gsFnpClr();
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'table' && WKS._tblCell) {
      _tblFnpClr();
    } else if (typeof _npKeyReset === 'function') _npKeyReset();
  };
  window._fnpSubmit = function() {
    if (typeof GS !== 'undefined' && GS._gsCell && _currentPage === 'grades') {
      _gsFnpSubmit();
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'table' && WKS._tblCell) {
      _tblFnpSubmit();
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'attend') {
      if (typeof _attendSubmit === 'function') _attendSubmit();
    } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'absent') {
      if (typeof _absentSubmit === 'function') _absentSubmit();
    } else {
      if (typeof _npSubmit === 'function') _npSubmit();
    }
  };

  /* ── تفعيل تلقائي عند دخول وضع numpad ── */
  var _origRenderWeekly = window.renderWeekly;
  if (typeof _origRenderWeekly === 'function') {
    window.renderWeekly = function() {
      _origRenderWeekly.apply(this, arguments);
      if (typeof WKS !== 'undefined' && (WKS.viewMode === 'numpad' || WKS.viewMode === 'attend' || WKS.viewMode === 'absent')) {
        buildFloatingNumpad();
        /* إظهار اللوحة فقط إذا كانت الصفحة الحالية هي الراصد */
        if (typeof _currentPage === 'undefined' || _currentPage !== 'weekly') {
          /* لسنا في صفحة الراصد — لا تُظهر اللوحة */
          if (FNP.el)  FNP.el.classList.remove('fnp-visible');
          if (FNP.tog) FNP.tog.classList.remove('fnp-tog-visible');
          FNP.visible = false;
        } else if (!FNP.visible) {
          if (FNP.tog) FNP.tog.classList.add('fnp-tog-visible');
          /* إخفاء اللوحة الثابتة وإظهار العائمة */
          setTimeout(function(){
            if (typeof _currentPage !== 'undefined' && _currentPage !== 'weekly') return;
            var kb = document.querySelector('.np2-keyboard');
            if (kb) {
              kb.classList.add('np2-keyboard-hidden');
              FNP_show();
            }
          }, 80);
        } else {
          /* اللوحة مرئية — اكتفِ بإخفاء اللوحة الثابتة دون إعادة رسم اللوحة العائمة */
          var kb = document.querySelector('.np2-keyboard');
          if (kb) kb.classList.add('np2-keyboard-hidden');
        }
      } else if (typeof WKS !== 'undefined' && WKS.viewMode === 'table') {
        /* وضع الجدول: أظهر اللوحة العائمة إذا كانت خلية محددة */
        buildFloatingNumpad();
        if (WKS._tblCell) {
          if (FNP.tog) FNP.tog.classList.add('fnp-tog-visible');
          if (!FNP.visible) FNP_show();
          /* تحديث شريط العنوان في اللوحة */
          _fnpUpdateTableHeader();
        } else {
          if (FNP.tog) FNP.tog.classList.remove('fnp-tog-visible');
          if (FNP.el) FNP.el.classList.remove('fnp-visible');
          FNP.visible = false;
        }
      } else {
        if (FNP.el)  FNP.el.classList.remove('fnp-visible');
        if (FNP.tog) FNP.tog.classList.remove('fnp-tog-visible');
        var kb = document.querySelector('.np2-keyboard');
        if (kb) kb.classList.remove('np2-keyboard-hidden');
        FNP.visible = false;
      }
    };
  }

  /* ── تحديث عنوان اللوحة العائمة في وضع الجدول ── */
  function _fnpUpdateTableHeader() {
    var hdr = document.getElementById('fnpHeaderLabel');
    if (!hdr || !WKS._tblCell) return;
    var fldNames = {assess:'تقييم', hw:'واجب', beh:'سلوك', imlaa:'إملاء', ex1:'اختبار 1', ex2:'اختبار 2'};
    var fldName = fldNames[WKS._tblCell.fld] || WKS._tblCell.fld;
    var cls = WKS.activeClass || '';
    var week = WKS.activeWeek || 1;
    var stuName = '';
    if (typeof DB !== 'undefined' && DB.data && DB.data[cls]) {
      var st = DB.data[cls][WKS._tblCell.stuIdx];
      if (st) stuName = st.name || '';
    }
    hdr.textContent = '📊 ' + fldName + ' / ' + stuName;
  }

  /* ── تهيئة عند تحميل الصفحة ── */
  window.addEventListener('load', function(){
    buildFloatingNumpad();
  });

})();

// ══════════════════════════════════════════════════════
// TABLE MODE + FLOATING NUMPAD INTEGRATION
// تكامل وضع الجدول مع اللوحة العائمة
// ══════════════════════════════════════════════════════

/* تهيئة حالة الخلية المحددة في WKS */
(function(){
  if(typeof WKS !== 'undefined') {
    if(WKS._tblCell === undefined) WKS._tblCell = null;
    if(WKS._tblInput === undefined) WKS._tblInput = '';
  }
})();

/**
 * يُستدعى عند الضغط على خلية درجة في وضع الجدول
 */
function _tblSelectCell(stuIdx, fld, field, maxVal, dispIdx) {
  /* إذا كان نفس الخلية المحددة → ألغِ التحديد */
  if(WKS._tblCell && WKS._tblCell.stuIdx === stuIdx && WKS._tblCell.fld === fld) {
    WKS._tblCell = null;
    WKS._tblInput = '';
    renderWeekly();
    return;
  }
  WKS._tblCell = { stuIdx: stuIdx, fld: fld, field: field, maxVal: maxVal, dispIdx: dispIdx };
  WKS._tblInput = '';
  if(typeof buildFloatingNumpad === 'function') buildFloatingNumpad();
  if(typeof FNP_show === 'function') FNP_show();
  renderWeekly();
  if(typeof _fnpUpdateTableHeader === 'function') _fnpUpdateTableHeader();
}

function _tblFnpKey(k) {
  if(!WKS._tblCell) return;
  var cur = WKS._tblInput || '';
  var next = cur + String(k);
  if(/^\d+$/.test(next) && Number(next) > WKS._tblCell.maxVal) {
    next = String(WKS._tblCell.maxVal);
  }
  WKS._tblInput = next;
  var cls = WKS.activeClass;
  if(typeof DB !== 'undefined' && DB.data && DB.data[cls] && DB.data[cls][WKS._tblCell.stuIdx]) {
    DB.data[cls][WKS._tblCell.stuIdx][WKS._tblCell.field] = /^\d+$/.test(next) ? clamp(Number(next),0,WKS._tblCell.maxVal) : next;
    if(typeof saveDB === 'function') saveDB();
  }
  renderWeekly();
}

function _tblFnpDel() {
  if(!WKS._tblCell) return;
  WKS._tblInput = (WKS._tblInput || '').slice(0, -1);
  var cls = WKS.activeClass;
  if(typeof DB !== 'undefined' && DB.data && DB.data[cls] && DB.data[cls][WKS._tblCell.stuIdx]) {
    DB.data[cls][WKS._tblCell.stuIdx][WKS._tblCell.field] = WKS._tblInput === '' ? '' : clamp(Number(WKS._tblInput),0,WKS._tblCell.maxVal);
    if(typeof saveDB === 'function') saveDB();
  }
  renderWeekly();
}

function _tblFnpClr() {
  if(!WKS._tblCell) return;
  var cls = WKS.activeClass;
  if(typeof DB !== 'undefined' && DB.data && DB.data[cls] && DB.data[cls][WKS._tblCell.stuIdx]) {
    DB.data[cls][WKS._tblCell.stuIdx][WKS._tblCell.field] = '';
    if(typeof saveDB === 'function') saveDB();
  }
  WKS._tblInput = '';
  WKS._tblCell = null;
  if(typeof FNP_hide === 'function') FNP_hide();
  renderWeekly();
}

function _tblFnpSubmit() {
  if(!WKS._tblCell) return;
  var cls = WKS.activeClass;
  var cur = WKS._tblCell;
  if(WKS._tblInput !== '' && typeof DB !== 'undefined' && DB.data && DB.data[cls] && DB.data[cls][cur.stuIdx]) {
    DB.data[cls][cur.stuIdx][cur.field] = clamp(Number(WKS._tblInput), 0, cur.maxVal);
    if(typeof saveDB === 'function') saveDB();
  }
  var students = (typeof DB !== 'undefined' && DB.data && DB.data[cls]) ? DB.data[cls].filter(function(s){return s.name;}) : [];
  var week = WKS.activeWeek || 1;
  var _srch = (WKS.search || '').trim();
  var displayStudents = students;
  if(_srch) {
    var _srchNum = Number(_srch);
    displayStudents = students.filter(function(s, si){
      if(!isNaN(_srchNum) && _srch !== '' && (si+1) === _srchNum) return true;
      return s.name && s.name.indexOf(_srch) >= 0;
    });
  }
  var nextDispIdx = cur.dispIdx + 1;
  if(nextDispIdx < displayStudents.length) {
    var nextStu = displayStudents[nextDispIdx];
    var nextStuIdx = (DB.data[cls] || []).indexOf(nextStu);
    var aF='a'+week, hF='h'+week, bF='bw'+week, imF='im'+week;
    var fieldMap = {assess:aF, hw:hF, beh:bF, imlaa:imF};
    var nextField = fieldMap[cur.fld] || cur.field;
    WKS._tblCell = { stuIdx: nextStuIdx, fld: cur.fld, field: nextField, maxVal: cur.maxVal, dispIdx: nextDispIdx };
    WKS._tblInput = '';
    renderWeekly();
    if(typeof _fnpUpdateTableHeader === 'function') _fnpUpdateTableHeader();
    setTimeout(function(){
      var sel = document.querySelector('.wk-tbl-sel');
      if(sel) sel.scrollIntoView({block:'nearest', behavior:'smooth'});
    }, 60);
  } else {
    WKS._tblCell = null;
    WKS._tblInput = '';
    if(typeof FNP_hide === 'function') FNP_hide();
    renderWeekly();
    if(typeof showSnack === 'function') showSnack('✅ تم الانتهاء من رصد جميع الطلاب');
  }
}

/* ── CSS لخلايا الجدول المحددة — يُضاف ديناميكياً ── */
(function(){
  var style = document.createElement('style');
  style.textContent = [
    '.wk-tbl-cell { transition: background .15s, box-shadow .15s; }',
    '.wk-tbl-cell:hover { background: rgba(251,191,36,.08) !important; }',
    '.wk-tbl-sel { background: rgba(251,191,36,.18) !important; box-shadow: inset 0 0 0 2px #fbbf24; border-radius: 4px; }'
  ].join('\n');
  if(document.head) document.head.appendChild(style);
  else window.addEventListener('load', function(){ document.head.appendChild(style); });
})();

// ══════════════════════════════════════════════════════
// GRADES PAGE + FLOATING NUMPAD INTEGRATION
// تكامل صفحة الدرجات مع اللوحة العائمة
// ══════════════════════════════════════════════════════

/* تهيئة حالة الخلية المحددة في GS */
(function(){
  if(typeof GS !== 'undefined') {
    if(GS._gsCell === undefined) GS._gsCell = null;
    if(GS._gsInput === undefined) GS._gsInput = '';
    // قائمة الخلايا القابلة للتنقل (تُبنى عند اختيار خلية)
    if(GS._gsCellList === undefined) GS._gsCellList = [];
    if(GS._gsCellListIdx === undefined) GS._gsCellListIdx = -1;
  }
})();

/**
 * يُستدعى عند الضغط على خلية درجة في صفحة الدرجات
 * @param {number} stuIdx  - فهرس الطالب في DB.data[cls]
 * @param {string} field   - اسم الحقل مثل 'a1', 'h1', 'ex1'
 * @param {number} maxVal  - الحد الأقصى
 * @param {string} cellId  - معرّف فريد للخلية
 * @param {string} colKey  - مفتاح العمود للتنقل (مثل 'assess_w1', 'pg_ex1')
 */
function _gsSelectCell(stuIdx, field, maxVal, cellId, colKey) {
  /* نفس الخلية → إلغاء التحديد */
  if(GS._gsCell && GS._gsCell.cellId === cellId) {
    GS._gsCell = null;
    GS._gsInput = '';
    renderGrades();
    return;
  }
  /* بناء قائمة كل الخلايا في نفس العمود للتنقل */
  GS._gsCellList = _gsBuildColList(stuIdx, field, maxVal, colKey);
  GS._gsCellListIdx = GS._gsCellList.findIndex(function(c){ return c.cellId === cellId; });
  if(GS._gsCellListIdx < 0) GS._gsCellListIdx = 0;

  GS._gsCell = { stuIdx: stuIdx, field: field, maxVal: maxVal, cellId: cellId, colKey: colKey };
  GS._gsInput = '';
  if(typeof buildFloatingNumpad === 'function') buildFloatingNumpad();
  if(typeof FNP_show === 'function') FNP_show();
  renderGrades();
  if(typeof _gsFnpUpdateHeader === 'function') _gsFnpUpdateHeader();
}

/** يبني قائمة بجميع خلايا نفس العمود (للتنقل بـ ↵) */
function _gsBuildColList(stuIdx, field, maxVal, colKey) {
  var cls = GS.activeClass;
  var students = DB.data[cls] || [];
  var search = (GS.search || '').trim();
  var filtered = search ? students.filter(function(s,i){ return s.name.indexOf(search)>=0 || String(i+1)===search; }) : students;
  var list = [];
  filtered.forEach(function(s){
    var idx = students.indexOf(s);
    var v = s[field];
    if(v === 'غ' || v === 'م') return; // تخطّ الغائب/المعذور
    var cId = 'gs_' + idx + '_' + field;
    list.push({ stuIdx: idx, field: field, maxVal: maxVal, cellId: cId, colKey: colKey });
  });
  return list;
}

function _gsFnpUpdateHeader() {
  var hdr = document.getElementById('fnpHeaderLabel');
  if(!hdr || !GS._gsCell) return;
  var cls = GS.activeClass;
  var st = (DB.data && DB.data[cls]) ? DB.data[cls][GS._gsCell.stuIdx] : null;
  var stuName = st ? (st.name || '') : '';
  /* اسم العمود */
  var colLabel = GS._gsCell.field;
  (DB.colPages || []).forEach(function(pg){
    (pg.cols || []).forEach(function(c){
      if(c.field === GS._gsCell.field) colLabel = c.label;
    });
  });
  hdr.textContent = '📊 ' + colLabel + ' / ' + stuName;
}

function _gsFnpKey(k) {
  if(!GS._gsCell) return;
  var cur = GS._gsInput || '';
  var next = cur + String(k);
  if(/^\d+$/.test(next) && Number(next) > GS._gsCell.maxVal) next = String(GS._gsCell.maxVal);
  GS._gsInput = next;
  var cls = GS.activeClass;
  if(DB.data && DB.data[cls] && DB.data[cls][GS._gsCell.stuIdx]) {
    DB.data[cls][GS._gsCell.stuIdx][GS._gsCell.field] = /^\d+$/.test(next) ? clamp(Number(next), 0, GS._gsCell.maxVal) : next;
    saveDB();
  }
  renderGrades();
}

function _gsFnpDel() {
  if(!GS._gsCell) return;
  GS._gsInput = (GS._gsInput || '').slice(0, -1);
  var cls = GS.activeClass;
  if(DB.data && DB.data[cls] && DB.data[cls][GS._gsCell.stuIdx]) {
    DB.data[cls][GS._gsCell.stuIdx][GS._gsCell.field] = GS._gsInput === '' ? '' : clamp(Number(GS._gsInput), 0, GS._gsCell.maxVal);
    saveDB();
  }
  renderGrades();
}

function _gsFnpClr() {
  if(!GS._gsCell) return;
  var cls = GS.activeClass;
  if(DB.data && DB.data[cls] && DB.data[cls][GS._gsCell.stuIdx]) {
    DB.data[cls][GS._gsCell.stuIdx][GS._gsCell.field] = '';
    saveDB();
  }
  GS._gsInput = '';
  GS._gsCell = null;
  if(typeof FNP_hide === 'function') FNP_hide();
  renderGrades();
}

function _gsFnpSubmit() {
  if(!GS._gsCell) return;
  var cls = GS.activeClass;
  var cur = GS._gsCell;
  /* حفظ */
  if(GS._gsInput !== '' && DB.data && DB.data[cls] && DB.data[cls][cur.stuIdx]) {
    DB.data[cls][cur.stuIdx][cur.field] = clamp(Number(GS._gsInput), 0, cur.maxVal);
    saveDB();
  }
  /* انتقل للتالي */
  var nextIdx = GS._gsCellListIdx + 1;
  /* أعد بناء القائمة (قد تغيّر الترتيب بعد الحفظ) */
  GS._gsCellList = _gsBuildColList(cur.stuIdx, cur.field, cur.maxVal, cur.colKey);
  if(nextIdx < GS._gsCellList.length) {
    var next = GS._gsCellList[nextIdx];
    GS._gsCellListIdx = nextIdx;
    GS._gsCell = next;
    GS._gsInput = '';
    renderGrades();
    if(typeof _gsFnpUpdateHeader === 'function') _gsFnpUpdateHeader();
    setTimeout(function(){
      var sel = document.querySelector('.gs-tbl-sel');
      if(sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 60);
  } else {
    GS._gsCell = null;
    GS._gsInput = '';
    if(typeof FNP_hide === 'function') FNP_hide();
    renderGrades();
    if(typeof showSnack === 'function') showSnack('✅ تم الانتهاء من رصد جميع الطلاب');
  }
}

/* CSS لخلايا الدرجات المحددة */
(function(){
  var style = document.createElement('style');
  style.textContent = [
    '.gs-tbl-cell { display:inline-flex; align-items:center; justify-content:center; min-width:32px; min-height:24px; border-radius:4px; cursor:pointer; transition: background .15s, box-shadow .15s; padding: 2px 4px; }',
    '.gs-tbl-cell:hover { background: rgba(251,191,36,.08); }',
    '.gs-tbl-sel { background: rgba(251,191,36,.18) !important; box-shadow: inset 0 0 0 2px #fbbf24; }'
  ].join('\n');
  if(document.head) document.head.appendChild(style);
  else window.addEventListener('load', function(){ document.head.appendChild(style); });
})();

// ── خلايا التوزيع مع اللوحة العائمة ──

/**
 * تحديد خلية التوزيع (العمود الأخير)
 */
function _gsSelectDistCell(stuIdx, inputId, maxVal, cellId) {
  if(GS._gsCell && GS._gsCell.cellId === cellId) {
    GS._gsCell = null;
    GS._gsInput = '';
    renderGrades();
    return;
  }
  /* بناء قائمة كل خلايا التوزيع للتنقل */
  var cls = GS.activeClass;
  var students = DB.data[cls] || [];
  var search = (GS.search || '').trim();
  var filtered = search ? students.filter(function(s,i){ return s.name.indexOf(search)>=0 || String(i+1)===search; }) : students;
  GS._gsCellList = filtered.map(function(s){
    var idx2 = students.indexOf(s);
    var prefix = (GS.activePage === 'pg_home') ? 'dih' : 'di';
    return { stuIdx: idx2, field: '__dist__', maxVal: maxVal, cellId: 'gs_dist_'+idx2, colKey: '__dist__', inputId: prefix+s.id };
  });
  GS._gsCellListIdx = GS._gsCellList.findIndex(function(c){ return c.stuIdx === stuIdx; });
  if(GS._gsCellListIdx < 0) GS._gsCellListIdx = 0;

  GS._gsCell = { stuIdx: stuIdx, field: '__dist__', maxVal: maxVal, cellId: cellId, colKey: '__dist__', inputId: inputId };
  GS._gsInput = '';
  if(typeof buildFloatingNumpad === 'function') buildFloatingNumpad();
  if(typeof FNP_show === 'function') FNP_show();
  /* تحديث عنوان اللوحة */
  setTimeout(function(){
    var hdr = document.getElementById('fnpHeaderLabel');
    if(hdr) {
      var cls2 = GS.activeClass;
      var st = (DB.data && DB.data[cls2]) ? DB.data[cls2][stuIdx] : null;
      hdr.textContent = '📊 توزيع مجموع / ' + (st ? st.name : '');
    }
  }, 30);
  renderGrades();
}

/* تعديل _gsFnpKey لدعم خلايا التوزيع */
var _origGsFnpKey = window._gsFnpKey || function(){};
(function(){
  var _origKey = _gsFnpKey;
  _gsFnpKey = function(k) {
    if(GS._gsCell && GS._gsCell.field === '__dist__') {
      var cur = GS._gsInput || '';
      var next = cur + String(k);
      if(/^\d+$/.test(next) && Number(next) > GS._gsCell.maxVal) next = String(GS._gsCell.maxVal);
      GS._gsInput = next;
      renderGrades();
    } else {
      _origKey(k);
    }
  };
  var _origDel = _gsFnpDel;
  _gsFnpDel = function() {
    if(GS._gsCell && GS._gsCell.field === '__dist__') {
      GS._gsInput = (GS._gsInput || '').slice(0, -1);
      renderGrades();
    } else {
      _origDel();
    }
  };
  var _origClr = _gsFnpClr;
  _gsFnpClr = function() {
    if(GS._gsCell && GS._gsCell.field === '__dist__') {
      GS._gsInput = '';
      GS._gsCell = null;
      if(typeof FNP_hide === 'function') FNP_hide();
      renderGrades();
    } else {
      _origClr();
    }
  };
  var _origSubmit = _gsFnpSubmit;
  _gsFnpSubmit = function() {
    if(GS._gsCell && GS._gsCell.field === '__dist__') {
      /* تطبيق التوزيع */
      var val = GS._gsInput.trim();
      if(val !== '') {
        var cls2 = GS.activeClass;
        var idx2 = GS._gsCell.stuIdx;
        var tmax2 = totalMax();
        var p = distributeTotal(val, DB.data[cls2][idx2]);
        if(p) { DB.data[cls2][idx2] = p; saveDB(); }
      }
      /* انتقل للتالي */
      var nextIdx = GS._gsCellListIdx + 1;
      if(nextIdx < GS._gsCellList.length) {
        var next = GS._gsCellList[nextIdx];
        GS._gsCellListIdx = nextIdx;
        GS._gsCell = next;
        GS._gsInput = '';
        renderGrades();
        var hdr = document.getElementById('fnpHeaderLabel');
        if(hdr) {
          var cls3 = GS.activeClass;
          var st3 = (DB.data && DB.data[cls3]) ? DB.data[cls3][next.stuIdx] : null;
          hdr.textContent = '📊 توزيع مجموع / ' + (st3 ? st3.name : '');
        }
        setTimeout(function(){
          var sel = document.querySelector('.gs-tbl-sel');
          if(sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 60);
      } else {
        GS._gsCell = null;
        GS._gsInput = '';
        if(typeof FNP_hide === 'function') FNP_hide();
        renderGrades();
        if(typeof showSnack === 'function') showSnack('✅ تم توزيع درجات جميع الطلاب');
      }
    } else {
      _origSubmit();
    }
  };
})();

// ══ تقرير جلسة الـ Numpad ══
function _npSessionReport() {
  var log = WKS.npSessionLog || [];
  if (!log.length) { showSnack('⚠ لا يوجد سجل لهذه الجلسة'); return; }

  var week = WKS.activeWeek || 1;
  var cls  = WKS.activeClass || (DB.classes[0] || '');
  var fldNames = { assess:'تقييم', hw:'واجب', beh:'سلوك', ex1:'اختبار 1', ex2:'اختبار 2' };

  var okList   = log.filter(function(l){ return l.status==='ok' && !l.isAbsent; });
  var absList  = log.filter(function(l){ return l.isAbsent; });
  var failList = log.filter(function(l){ return l.status==='fail'; });
  var grades   = okList.map(function(l){ return Number(l.grade)||0; });
  var gradeSum = grades.reduce(function(a,b){return a+b;},0);
  var gradeAvg = grades.length ? Math.round((gradeSum/grades.length)*10)/10 : null;
  var gradeMax = grades.length ? Math.max.apply(null,grades) : null;
  var gradeMin = grades.length ? Math.min.apply(null,grades) : null;
  var byNumCnt = log.filter(function(l){return l.byNum;}).length;

  // توزيع الدرجات
  var dist = {};
  okList.forEach(function(l) {
    var g = Number(l.grade)||0;
    var b = Math.floor(g/2)*2;
    var key = b+'-'+(b+1);
    dist[key] = (dist[key]||0)+1;
  });

  var old = document.getElementById('npSessionReportModal');
  if (old) old.remove();

  var mo = document.createElement('div');
  mo.id = 'npSessionReportModal';
  mo.className = 'mo';
  mo.style.touchAction = 'pan-y';
  mo.style.overflowY = 'auto';
  mo.style.webkitOverflowScrolling = 'touch';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };

  var total = log.length;
  var recogPct = total>0 ? Math.round((total-failList.length)/total*100) : 0;

  // تحديد اسم الحقل المستخدم في الجلسة
  var fieldCounts = {};
  log.forEach(function(l){ if(l.field) fieldCounts[l.field]=(fieldCounts[l.field]||0)+1; });
  var dominantField = Object.keys(fieldCounts).sort(function(a,b){return fieldCounts[b]-fieldCounts[a];})[0]||'assess';
  var colLabel = fldNames[dominantField]||dominantField;
  var maxVal = okList.length ? (okList[0].maxVal||20) : 20;

  var h = '<div class="md" style="max-width:560px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;background:#0d1117;border:2px solid #16a34a;" onclick="event.stopPropagation()">';

  // رأس
  h += '<div class="mh" style="background:linear-gradient(135deg,#064e3b,#065f46);border-bottom:2px solid #16a34a;position:sticky;top:0;z-index:2;">';
  h += '<span style="font-size:18px;">📊</span>';
  h += '<div style="flex:1;">';
  h += '<h2 style="color:#6ee7b7;margin:0;font-size:13px;">تقرير الجلسة — '+esc(colLabel)+'</h2>';
  h += '<div style="font-size:9px;color:#4ade80;margin-top:2px;">الأسبوع '+week+' — الفصل: <strong>'+esc(cls)+'</strong> — '+total+' إدخال</div>';
  h += '</div>';
  h += '<button class="xbtn" style="color:#6ee7b7;" onclick="document.getElementById(\'npSessionReportModal\').remove()">✕</button>';
  h += '</div>';

  h += '<div class="mb" style="padding:12px;display:flex;flex-direction:column;gap:12px;">';

  // بطاقات الإحصاء
  function sCard(icon,val,lbl,bg,clr){
    return '<div style="background:'+bg+';border:1px solid '+clr+'44;border-radius:10px;padding:8px 6px;text-align:center;">'
      +'<div style="font-size:18px;font-weight:900;color:'+clr+';">'+val+'</div>'
      +'<div style="font-size:8.5px;color:'+clr+'99;margin-top:2px;">'+icon+' '+lbl+'</div></div>';
  }
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;">';
  h += sCard('✅',''+okList.length,'درجات مُرصدة','rgba(16,185,129,.12)','#6ee7b7');
  h += sCard('✗',''+absList.length,'غائب','rgba(239,68,68,.12)','#fca5a5');
  h += sCard('❌',''+failList.length,'لم يُعرف','rgba(251,191,36,.12)','#fcd34d');
  h += sCard('🎯',''+recogPct+'%','دقة التعرف','rgba(99,102,241,.12)','#a5b4fc');
  if(gradeAvg!==null) h += sCard('📈',''+gradeAvg,'متوسط الدرجات','rgba(249,115,22,.12)','#fdba74');
  if(gradeMax!==null) h += sCard('🏆',''+gradeMax+'/'+maxVal,'أعلى درجة','rgba(16,185,129,.08)','#34d399');
  if(gradeMin!==null) h += sCard('📉',''+gradeMin+'/'+maxVal,'أدنى درجة','rgba(239,68,68,.08)','#f87171');
  if(byNumCnt>0)      h += sCard('🔢',''+byNumCnt,'بالرقم','rgba(124,58,237,.12)','#c4b5fd');
  h += '</div>';

  // شريط التوزيع
  if(okList.length > 0) {
    var buckets=[];
    for(var b=0; b<=Math.ceil(maxVal/2)*2; b+=2){
      var bk=b+'-'+(b+1);
      if(dist[bk]) buckets.push({label:b+'–'+(Math.min(b+1,maxVal)),cnt:dist[bk],pct:Math.round((dist[bk]||0)/okList.length*100)});
    }
    if(buckets.length){
      h += '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:10px 12px;">';
      h += '<div style="font-size:9px;font-weight:700;color:#6ee7b7;margin-bottom:8px;">📊 توزيع الدرجات</div>';
      h += '<div style="display:flex;flex-direction:column;gap:5px;">';
      buckets.forEach(function(bk){
        h += '<div style="display:flex;align-items:center;gap:8px;">';
        h += '<div style="font-size:9px;color:#94a3b8;width:36px;text-align:left;flex-shrink:0;">'+bk.label+'</div>';
        h += '<div style="flex:1;background:#1e293b;border-radius:3px;overflow:hidden;height:12px;">';
        h += '<div style="width:'+bk.pct+'%;height:100%;background:linear-gradient(90deg,#065f46,#16a34a);border-radius:3px;"></div></div>';
        h += '<div style="font-size:9px;color:#6ee7b7;width:20px;text-align:right;flex-shrink:0;">'+bk.cnt+'</div></div>';
      });
      h += '</div></div>';
    }
  }

  // الطلاب المرصودة درجاتهم
  if(okList.length > 0){
    h += '<div style="background:#03140d;border:1px solid #065f46;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#6ee7b7;margin-bottom:6px;">✅ الطلاب المرصودة درجاتهم ('+okList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    okList.forEach(function(l){
      h += '<span style="background:#064e3b;color:#6ee7b7;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px;">'
        +esc(l.matchedName||'؟')
        +'<span style="background:rgba(110,231,183,.18);border-radius:6px;padding:0 6px;font-weight:900;">'+esc(String(l.grade))+'</span>'
        +'</span>';
    });
    h += '</div></div>';
  }

  // الغائبون
  if(absList.length > 0){
    h += '<div style="background:#1a0000;border:1px solid #7f1d1d;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#fca5a5;margin-bottom:6px;">✗ الغائبون ('+absList.length+')</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    absList.forEach(function(l){
      h += '<span style="background:#7f1d1d;color:#fca5a5;padding:2px 10px;border-radius:8px;font-size:9.5px;font-weight:700;">'+esc(l.matchedName||'؟')+'</span>';
    });
    h += '</div></div>';
  }

  // الإدخالات الفاشلة
  if(failList.length > 0){
    h += '<div style="background:#1a1200;border:1px solid #78350f;border-radius:8px;padding:8px 12px;">';
    h += '<div style="font-size:9px;font-weight:700;color:#fcd34d;margin-bottom:6px;">⚠ لم يُعرف ('+failList.length+')</div>';
    failList.forEach(function(l){
      h += '<div style="font-size:9px;color:#fb923c;background:rgba(249,115,22,.08);border-radius:5px;padding:3px 8px;margin-bottom:3px;">'+esc(l.error||l.inputText||'؟')+'</div>';
    });
    h += '</div>';
  }

  // السجل الكامل بترتيب الإدخال
  var orderedLog = [].concat(log).reverse();
  h += '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;overflow:hidden;">';
  h += '<div style="background:#0d2a1f;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;">';
  h += '<div style="font-size:9px;font-weight:700;color:#6ee7b7;">📋 سجل الرصد الكامل — بترتيب الإدخال</div>';
  h += '<div style="font-size:9px;color:#4ade80;">'+total+' إدخال</div></div>';
  h += '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;">';
  h += '<table style="width:100%;border-collapse:collapse;font-size:9.5px;">';
  h += '<thead><tr>';
  h += '<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:4px 8px;text-align:center;">#</th>';
  h += '<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:4px 8px;text-align:right;">الطالب</th>';
  h += '<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:4px 8px;text-align:center;">الدرجة</th>';
  h += '<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:4px 8px;text-align:center;">الحقل</th>';
  h += '<th style="background:#0d2a1f;color:#6ee7b7;border-bottom:1px solid #1e293b;padding:4px 8px;text-align:right;">الإدخال</th>';
  h += '</tr></thead><tbody>';

  orderedLog.forEach(function(l,i){
    var isFail = l.status==='fail';
    var rowBg  = isFail?'background:rgba(239,68,68,.06);':l.isAbsent?'background:rgba(239,68,68,.04);':'';
    var nameClr= isFail?'#f87171':l.isAbsent?'#fca5a5':'#d97706';
    h += '<tr style="'+rowBg+'">';
    h += '<td style="text-align:center;color:#475569;border-bottom:1px solid #1e293b;padding:3px 8px;">'+(i+1)+'</td>';
    h += '<td style="text-align:right;border-bottom:1px solid #1e293b;padding:3px 8px;color:'+nameClr+';font-weight:700;">'+esc(l.matchedName||(l.error||'؟'))+'</td>';
    h += '<td style="text-align:center;border-bottom:1px solid #1e293b;padding:3px 8px;">';
    if(l.isAbsent) h += '<span style="background:#7c2d12;color:#fcd34d;padding:1px 9px;border-radius:8px;font-size:9px;font-weight:700;">غ</span>';
    else if(isFail) h += '<span style="color:#475569;">—</span>';
    else h += '<span style="background:#064e3b;color:#6ee7b7;padding:1px 9px;border-radius:8px;font-size:10px;font-weight:900;">'+l.grade+'</span>';
    h += '</td>';
    h += '<td style="text-align:center;border-bottom:1px solid #1e293b;padding:3px 8px;font-size:8.5px;color:#6b7280;">'+esc(fldNames[l.field]||l.field||'')+(l.byNum?' 🔢':'')+'</td>';
    h += '<td style="text-align:right;border-bottom:1px solid #1e293b;padding:3px 8px;color:#475569;font-size:8.5px;direction:rtl;">'+esc(l.inputText||'')+'</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';

  h += '</div>'; // .mb
  h += '<div class="mf" style="border-top:1px solid #16a34a;background:#0d1117;">';
  h += '<button class="btn btn-ghost" onclick="document.getElementById(\'npSessionReportModal\').remove()">إغلاق</button>';
  h += '<button class="btn" style="background:rgba(16,185,129,.2);border:1px solid #16a34a;color:#6ee7b7;" onclick="_npSessionReportPrint()">🖨 طباعة</button>';
  h += '</div>';
  h += '</div>';

  mo.innerHTML = h;
  document.body.appendChild(mo);
}

function _npSessionReportPrint() {
  var log = WKS.npSessionLog || [];
  if(!log.length) return;
  var week = WKS.activeWeek||1;
  var cls  = WKS.activeClass||(DB.classes[0]||'');
  var fldNames = {assess:'تقييم',hw:'واجب',beh:'سلوك',ex1:'اختبار 1',ex2:'اختبار 2'};
  var okList  = log.filter(function(l){return l.status==='ok'&&!l.isAbsent;});
  var absList = log.filter(function(l){return l.isAbsent;});
  var failList= log.filter(function(l){return l.status==='fail';});
  var grades  = okList.map(function(l){return Number(l.grade)||0;});
  var gradeAvg= grades.length?Math.round((grades.reduce(function(a,b){return a+b;},0)/grades.length)*10)/10:null;
  var orderedLog=[].concat(log).reverse();
  var rows=orderedLog.map(function(l,i){
    return '<tr><td>'+(i+1)+'</td><td style="text-align:right">'+esc(l.matchedName||l.error||'؟')+'</td>'
      +'<td>'+(l.isAbsent?'غ':l.grade!=null?l.grade:'—')+'</td>'
      +'<td>'+esc(fldNames[l.field]||l.field||'')+'</td>'
      +'<td style="text-align:right;color:#777;font-size:11px;">'+esc(l.inputText||'')+'</td></tr>';
  }).join('');
  var now=new Date();
  var dateStr=now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  var win=window.open('','_blank');
  win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير الجلسة</title>'
    +'<style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px;}h1{font-size:15px;margin-bottom:4px;}table{border-collapse:collapse;width:100%;margin-top:12px;}th,td{border:1px solid #ccc;padding:5px 8px;font-size:12px;text-align:center;}th{background:#064e3b;color:white;}.stat{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;padding:5px 14px;border-radius:8px;margin:4px;font-size:12px;font-weight:700;}</style>'
    +'</head><body>'
    +'<h1>📊 تقرير الجلسة — أسبوع '+week+' — فصل: '+esc(cls)+'</h1>'
    +'<div style="font-size:11px;color:#555;margin-bottom:8px;">تاريخ الطباعة: '+dateStr+'</div>'
    +'<div><span class="stat">✅ درجات: '+okList.length+'</span><span class="stat">✗ غائب: '+absList.length+'</span><span class="stat">❌ فشل: '+failList.length+'</span>'+(gradeAvg!==null?'<span class="stat">📈 متوسط: '+gradeAvg+'</span>':'')+'</div>'
    +'<table><thead><tr><th>#</th><th>الطالب</th><th>الدرجة</th><th>الحقل</th><th>نص الإدخال</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'</body></html>');
  win.document.close();
  win.print();
}
