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

  // ── وقت تحويل عرض اليوم التالي ──
  var _ndh=DB.meta.nextDayHour!=null?DB.meta.nextDayHour:12;
  html+='<div class="settings-row" style="margin-top:8px;">';
  html+='<span class="settings-lbl">🌅 عرض فترات الغد بعد</span>';
  html+='<div class="settings-val" style="display:flex;align-items:center;gap:6px;">';
  html+='<select class="s-sel" onchange="DB.meta.nextDayHour=Number(this.value);saveDB();showSnack(\'✅ تم الحفظ\');">';
  [6,7,8,9,10,11,12,13,14,15,16,17,18].forEach(function(h){
    html+='<option value="'+h+'"'+(_ndh===h?' selected':'')+'>'+h+':00</option>';
  });
  html+='</select>';
  html+='<span class="settings-desc">يوم اليوم الدراسي</span>';
  html+='</div></div>';

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

  var _pfCover=(WKS.photoFit==='cover'||!WKS.photoFit);
  var _pfContain=(WKS.photoFit==='contain');
  var _pfCover=(WKS.photoFit==='cover'||!WKS.photoFit);
  var _pfContain=(WKS.photoFit==='contain');
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">وضع الصورة في الكروت:</span>';
  html+='<div class="settings-val"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
  html+='<button class="btn btn-sm" onclick="WKS.photoFit=\'cover\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();" style="background:'+(_pfCover?'#059669':'#334155')+';color:white;">🖼 مرنة</button>';
  html+='<button class="btn btn-sm" onclick="WKS.photoFit=\'contain\';if(typeof renderWeekly===\'function\'&&document.getElementById(\'weeklyRoot\'))renderWeekly();" style="background:'+(_pfContain?'#1d4ed8':'#334155')+';color:white;">🔲 غير مرنة</button>';
  html+='</div><span class="settings-desc">مرنة = تملأ الكرت بالكامل | غير مرنة = بنسبة عرض ثابتة</span></div></div>';


  // ── الخط ──
  var _fonts=[
    {val:'inherit',lbl:'الخط الافتراضي'},
    {val:'Tajawal',lbl:'Tajawal'},
    {val:'Cairo',lbl:'Cairo'},
    {val:'Almarai',lbl:'Almarai'},
    {val:'Noto Kufi Arabic',lbl:'Noto Kufi'},
    {val:'Amiri',lbl:'Amiri'},
    {val:'Arial',lbl:'Arial'},
  ];
  var _curFont=DB.meta.appFont||'Amiri';
  var _curSize=DB.meta.appFontSize||14;
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">🔤 نوع الخط:</span>';
  html+='<div class="settings-val" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  html+='<select class="s-sel" style="width:160px;" onchange="DB.meta.appFont=this.value;saveDB();applyAppFont();">';
  _fonts.forEach(function(f){
    html+='<option value="'+f.val+'"'+(_curFont===f.val?' selected':'')+' style="font-family:'+f.val+';">'+f.lbl+'</option>';
  });
  html+='</select>';
  html+='<span class="settings-desc" id="fontPreviewLbl" style="font-family:'+_curFont+';font-size:13px;color:#94a3b8;">معاينة النص العربي ١٢٣</span>';
  html+='</div></div>';

  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">🔡 حجم الخط:</span>';
  html+='<div class="settings-val" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  html+='<input type="range" min="11" max="20" step="1" value="'+_curSize+'" style="width:130px;accent-color:#3b82f6;" oninput="DB.meta.appFontSize=Number(this.value);saveDB();applyAppFont();document.getElementById(\'fontSizeVal\').textContent=this.value+\'px\';">';
  html+='<span id="fontSizeVal" style="font-size:11px;color:#60a5fa;min-width:32px;">'+_curSize+'px</span>';
  html+='<div style="display:flex;gap:4px;">';
  [12,13,14,15,16].forEach(function(s){
    html+='<button onclick="DB.meta.appFontSize='+s+';saveDB();applyAppFont();renderSettings();" style="background:'+(_curSize===s?'#1d4ed8':'#1e293b')+';border:1px solid #334155;color:white;padding:2px 8px;border-radius:5px;cursor:pointer;font-size:9px;font-family:inherit;">'+s+'</button>';
  });
  html+='</div>';
  html+='</div></div>';

  html+='</div></div>';

  // ── نغمات الصوت ──
  html+='<div class="settings-section">';
  html+='<div class="settings-section-hdr" style="background:#0f3460;display:flex;align-items:center;justify-content:space-between;">🎵 نغمات الصوت';
  html+='<span style="font-size:9px;font-weight:400;opacity:.75;">نغمات مدمجة + نغماتك المخصصة</span></div>';
  html+='<div class="settings-section-body">';
  html+='<div class="settings-row" style="flex-direction:column;gap:12px;">';

  // — النغمات المدمجة
  html+='<div>';
  html+='<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:8px;letter-spacing:.3px;">📦 النغمات المدمجة</div>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
  if(typeof _NOTIF_TONES !== "undefined"){
    Object.keys(_NOTIF_TONES).forEach(function(id){
      if(id.startsWith('custom_')) return;
      var t=_NOTIF_TONES[id];
      var isActive=typeof _notifSettings!=='undefined' && (_notifSettings.soundTone||'chime_short')===id;
      html+='<div style="display:flex;align-items:center;gap:5px;">';
      html+='<div style="flex:1;padding:8px 10px;border-radius:9px;border:1.5px solid '+(isActive?'#2563eb':'#1e293b')+';background:'+(isActive?'#1e3a5f':'#0f172a')+';">';
      html+='<div style="font-size:11px;font-weight:700;color:'+(isActive?'#93c5fd':'#cbd5e1')+';">'+(t[0]||id)+'</div>';
      html+='<div style="font-size:9px;color:#475569;margin-top:2px;">⏱ '+t[1]+'</div>';
      html+='</div>';
      html+='<button onclick="_playNotifSound(\''+id+'\')" title="معاينة" style="width:28px;height:28px;border-radius:8px;border:1px solid #1e293b;background:#0f172a;color:#60a5fa;font-size:13px;cursor:pointer;flex-shrink:0;">▶</button>';
      html+='</div>';
    });
  }
  html+='</div>';
  html+='</div>';

  // فاصل
  html+='<div style="border-top:1px solid #1e293b;padding-top:12px;">';
  html+='<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:8px;letter-spacing:.3px;">🎼 نغماتي — مخصصة</div>';
  // Upload button
  html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">';
  html+='<label style="background:#1d4ed8;color:white;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">➕ رفع ملف صوتي<input type="file" accept="audio/*" multiple style="display:none;" onchange="customTonesUpload(event)"/></label>';
  html+='<span style="font-size:9px;color:#475569;">MP3 · WAV · OGG · M4A (حد أقصى 5 ميجا)</span>';
  html+='</div>';
  // List of custom tones
  html+='<div id="customTonesList" style="display:flex;flex-direction:column;gap:6px;">';
  html+=_renderCustomTonesList();
  html+='</div>';
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
  /* اختيار النموذج */
  var curModel = (DB.meta && DB.meta.whisperModel) ? DB.meta.whisperModel : 'auto';
  html+='<div class="settings-row">';
  html+='<span class="settings-lbl">النموذج:</span>';
  html+='<div class="settings-val" style="display:flex;flex-direction:column;gap:4px;">';
  html+='<select class="s-inp" style="width:220px;" onchange="DB.meta.whisperModel=(this.value===\'auto\'?null:this.value);saveDB();_npWhisperReady=false;_npWhisperPipe=null;renderSettings();showSnack(\'⚠️ أعد تحميل النموذج لتطبيق التغيير\')">';
  html+='<option value="auto"'+(curModel==='auto'?' selected':'')+'>🤖 تلقائي (موبايل=tiny / كمبيوتر=base)</option>';
  html+='<option value="Xenova/whisper-tiny"'+(curModel==='Xenova/whisper-tiny'?' selected':'')+'>⚡ tiny — أسرع (~39MB) — دقة أقل</option>';
  html+='<option value="Xenova/whisper-base"'+(curModel==='Xenova/whisper-base'?' selected':'')+'>⚖️ base — متوازن (~74MB)</option>';
  html+='<option value="Xenova/whisper-small"'+(curModel==='Xenova/whisper-small'?' selected':'')+'>🎯 small — أدق (~244MB) — أبطأ</option>';
  html+='</select>';
  html+='<span style="font-size:9px;color:#64748b;">تغيير النموذج يتطلب إعادة التحميل</span>';
  html+='</div></div>';
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
    var _gridPhotoSrc=s.photo||(DB.meta&&DB.meta.defaultStudentPhoto?DB.meta.defaultStudentPhoto:'');
    if(_gridPhotoSrc){
      html+='<img class="wk-grid-photo" src="'+_gridPhotoSrc+'" onerror="this.style.display=\'none\'">';
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
  h+='<button class="view-bar-tab'+(mode==='numpad'?' active':'')+'" onclick="WKS.viewMode=\'numpad\';WKS.numpadStudent=null;WKS.numpadInput=\'\';renderWeekly();renderViewBar();">🎯 الراصد</button>';
  h+='<button class="view-bar-tab'+(mode==='attend'?' active':'')+'" onclick="WKS.viewMode=\'attend\';WKS._attendPresent={};renderWeekly();renderViewBar();" style="'+(mode==='attend'?'background:#059669;border-color:#10b981;':'')+'">✅ رصد الحضور</button>';
  h+='<button class="view-bar-tab'+(mode==='absent'?' active':'')+'" onclick="WKS.viewMode=\'absent\';WKS._attendAbsent={};renderWeekly();renderViewBar();" style="'+(mode==='absent'?'background:#dc2626;border-color:#ef4444;':'')+'">🚫 رصد الغياب</button>';
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
