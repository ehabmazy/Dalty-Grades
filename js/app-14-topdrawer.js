/* ═══════════════════════════════════════════════════════════
   app-14-topdrawer.js — الدرج العلوي (v83)
   ─────────────────────────────────────────────────────────
   الفكرة: لا نعيد كتابة أي زر. أزرار الشريط العلوي الأصلية تبقى في DOM
   (مخفية بصريًا) وكل صفحة ما زالت تُظهرها/تُخفيها كما كانت. الدرج يقرأ
   الأزرار الظاهرة حاليًا ويعرضها كمربعات كبيرة، وعند الضغط يستدعي
   click() على الزر الأصلي، فتعمل نفس الدوال القديمة بلا أي تغيير.
   الأشرطة الفرعية (الفصول/الأسابيع/...) تُنقل إلى داخل الدرج.
   لو فشل التشغيل لأي سبب يبقى الشريط القديم كما هو.
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var SUBBARS=['editBar','clsBar','dictClsBar','pagesBar','toolsBar','gradeWeeksBar',
    'homeColsBar','weeksBar','viewBar','absClsBar','absWeeksBar','devBar',
    'tfrClsBar','tfrWeeksBar','tfrColsBar','tfrMetaBar'];

  var GROUPS=[
    {k:'sel',  t:'🏫 التصفية'},
    {k:'tools',t:'🛠 أدوات'},
    {k:'out',  t:'📤 إخراج'}
  ];
  var GROUP_OF={
    tbClsBtn:'sel',tbAbsClsBtn:'sel',tbTfrClsBtn:'sel',tbDictClsBarBtn:'sel',
    tbGWeeksBtn:'sel',tbWeeksBtn:'sel',tbAbsWeeksBtn:'sel',tbTfrWeeksBtn:'sel',
    tbHomeColsBtn:'sel',tbTfrColsBtn:'sel',tbPagesBtn:'sel',
    tbTfrPrintBtn:'out',tbTfrPrintAllBtn:'out',tbTfrExcelBtn:'out',
    tbTfrCFBtn:'out',tbTfrFontBtn:'out'
  };
  var LABEL_FIX={
    tbTfrFontBtn:'إعدادات الخط',tbDictSettingsBtn:'إعدادات الإملاء',
    tbDictAddStuBtn:'إضافة طلاب'
  };

  var topbar,btn,ov,dr,titleEl,tabsEl,gridEl,panelEl,hdrEl,handleEl;
  var isOpen=false,curTab=null,ignorePop=false,raf=0,lastCount=-1;

  function $(id){return document.getElementById(id);}

  /* هل العنصر ظاهر فعلاً؟ (نفحص display على العنصر وآبائه حتى الشريط) */
  function shown(el){
    for(var n=el;n&&n!==topbar;n=n.parentElement){
      if(window.getComputedStyle(n).display==='none')return false;
    }
    return true;
  }

  function origButtons(){
    var list=topbar.querySelectorAll('.tb-menu-wrap button, #tbDictBtns button');
    var out=[];
    for(var i=0;i<list.length;i++){if(shown(list[i]))out.push(list[i]);}
    return out;
  }

  /* استخراج الأيقونة والاسم والشارة من الزر الأصلي */
  function parts(b){
    var txt='';
    for(var i=0;i<b.childNodes.length;i++){
      var nd=b.childNodes[i];
      if(nd.nodeType===1&&/Badge$/.test(nd.id||''))continue;
      txt+=nd.textContent;
    }
    txt=txt.replace(/\s+/g,' ').trim();
    var bd=b.querySelector('[id$="Badge"]');
    var badge=bd?(bd.textContent||'').trim():'';
    var hasWord=function(s){return /[A-Za-z0-9\u0600-\u06FF]/.test(s);};
    var ic='•',lb=txt,m=txt.match(/^(\S+)\s+(.+)$/);
    if(m&&!hasWord(m[1])){ic=m[1];lb=m[2];}
    else if(txt&&!hasWord(txt)){ic=txt;lb=b.getAttribute('title')||'';}
    if(!lb)lb=LABEL_FIX[b.id]||b.getAttribute('title')||'';
    if(b.id==='tbTfrFontBtn'||b.id==='tbDictSettingsBtn'||b.id==='tbDictAddStuBtn')lb=LABEL_FIX[b.id];
    return {ic:ic,lb:lb,badge:badge};
  }

  function isActive(b){
    if(b.classList.contains('active')||b.classList.contains('open'))return true;
    /* أزرار وضع الإملاء (غياب/حضور) تُعرف بخلفيتها الزرقاء */
    if(b.id==='tbDictModeAbsBtn'||b.id==='tbDictModeAttBtn'){
      return window.getComputedStyle(b).backgroundColor==='rgb(29, 78, 216)';
    }
    return false;
  }

  function groupsOf(items){
    var g={};
    items.forEach(function(b){var k=GROUP_OF[b.id]||'tools';(g[k]=g[k]||[]).push(b);});
    return g;
  }

  function anyBarOpen(){
    for(var i=0;i<SUBBARS.length;i++){
      var el=$(SUBBARS[i]);
      if(el&&el.classList.contains('open'))return true;
    }
    return false;
  }

  /* ── رسم الدرج ── */
  function render(){
    var items=origButtons();
    var pt=(window._PAGE_TITLES&&window._currentPage&&window._PAGE_TITLES[window._currentPage])||'';
    titleEl.innerHTML='🛠 الأدوات'+(pt?'<small>'+pt+'</small>':'');
    tabsEl.style.display='none';

    if(!items.length){
      gridEl.innerHTML='<div class="tbd-empty">لا توجد أدوات لهذه الصفحة</div>';
      panelEl.style.display=anyBarOpen()?'':'none';
      return;
    }

    /* كل الأيقونات معًا بلا تبويبات (مرتبة: التصفية ثم الأدوات ثم الإخراج) */
    var g=groupsOf(items),ordered=[];
    GROUPS.forEach(function(x){if(g[x.k])ordered=ordered.concat(g[x.k]);});

    gridEl.innerHTML='';
    ordered.forEach(function(b){
      var p=parts(b);
      var tile=document.createElement('button');
      tile.type='button';
      tile.className='tbd-tile'+(isActive(b)?' on':'');
      var col='';
      try{col=window.getComputedStyle(b).color;}catch(e){}
      if(col)tile.style.setProperty('--c',col);
      var ic=document.createElement('span');ic.className='ic';ic.textContent=p.ic;
      var lb=document.createElement('span');lb.textContent=p.lb;
      tile.appendChild(ic);tile.appendChild(lb);
      if(p.badge){var bg=document.createElement('span');bg.className='bdg';bg.textContent=p.badge;tile.appendChild(bg);}
      tile.onclick=function(){onTile(b);};
      gridEl.appendChild(tile);
    });
    panelEl.style.display=anyBarOpen()?'':'none';
  }

  /* الضغط على مربع: نستدعي الزر الأصلي */
  function onTile(b){
    var isBar=/BarToggle\s*\(/.test(b.getAttribute('onclick')||'');
    try{b.click();}catch(e){if(window.console)console.error(e);}
    setTimeout(function(){
      if(isBar){render();}      /* يفتح/يغلق شريطًا فرعيًا: نبقى في الدرج */
      else{close();}            /* إجراء مباشر (طباعة، إعدادات، وضع...): نغلق الدرج */
    },40);
  }

  /* أي ضغط داخل منطقة الأشرطة: لو أُغلق الشريط بعد الاختيار نغلق الدرج */
  function onPanelClick(e){
    if(!e.target.closest||!e.target.closest('button,select,label,a'))return;
    setTimeout(function(){
      if(!isOpen)return;
      if(!anyBarOpen())close(); else render();
    },90);
  }

  /* ── فتح / إغلاق ── */
  function open(){
    if(isOpen)return;
    if(!origButtons().length)return;
    isOpen=true;
    render();
    ov.classList.add('open');dr.classList.add('open');btn.classList.add('open');
    try{history.pushState({tbd:1},'');}catch(e){}
  }
  function close(fromPop){
    if(!isOpen)return;
    isOpen=false;
    ov.classList.remove('open');dr.classList.remove('open');btn.classList.remove('open');
    if(fromPop!==true){
      try{if(history.state&&history.state.tbd){ignorePop=true;history.back();}}catch(e){}
    }
  }
  function toggle(){isOpen?close():open();}

  /* ── تحديث زر الفتح (العدد + الظهور) ── */
  function update(){
    raf=0;
    if(!btn)return;
    var n=origButtons().length;
    if(n!==lastCount){
      lastCount=n;
      btn.classList.toggle('has',n>0);
      var c=btn.querySelector('.tbd-cnt');
      if(c)c.textContent=n;
    }
    if(isOpen){
      if(n===0)close(); else render();
    }
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(update);}

  /* ── إيماءات السحب ── */
  function swipe(el,dir,cb){
    var y0=null;
    el.addEventListener('touchstart',function(e){y0=e.touches[0].clientY;},{passive:true});
    el.addEventListener('touchend',function(e){
      if(y0===null)return;
      var dy=e.changedTouches[0].clientY-y0;y0=null;
      if((dir==='up'&&dy<-40)||(dir==='down'&&dy>40))cb();
    },{passive:true});
  }

  /* ── التهيئة ── */
  function init(){
    topbar=document.querySelector('#appShell .app-topbar');
    if(!topbar||$('tbDrawerBar'))return;

    /* زر الفتح: بعد العنوان وقبل أول أزرار الصفحة */
    btn=document.createElement('button');
    btn.type='button';btn.className='tbd-btn';btn.id='tbdBtn';
    btn.setAttribute('aria-label','الأدوات');
    btn.innerHTML='<span class="tbd-arr">⌄</span><span>الأدوات</span><span class="tbd-cnt">0</span>';
    btn.onclick=toggle;
    var anchor=$('tbMenuEdit')||topbar.querySelector('.tb-menu-wrap');
    if(anchor)topbar.insertBefore(btn,anchor); else topbar.appendChild(btn);

    /* التعتيم والدرج */
    ov=document.createElement('div');ov.id='tbdOv';ov.onclick=function(){close();};
    dr=document.createElement('div');dr.id='tbDrawerBar';
    dr.setAttribute('role','dialog');dr.setAttribute('aria-label','أدوات الصفحة');

    hdrEl=document.createElement('div');hdrEl.className='tbd-hdr';
    titleEl=document.createElement('div');titleEl.className='tbd-title';
    var x=document.createElement('button');x.type='button';x.className='tbd-x';x.textContent='✕';
    x.setAttribute('aria-label','إغلاق');x.onclick=function(){close();};
    hdrEl.appendChild(titleEl);hdrEl.appendChild(x);

    tabsEl=document.createElement('div');tabsEl.className='tbd-tabs';
    var body=document.createElement('div');body.className='tbd-body';
    gridEl=document.createElement('div');gridEl.className='tbd-grid';
    panelEl=document.createElement('div');panelEl.id='tbdPanel';
    body.appendChild(gridEl);body.appendChild(panelEl);

    handleEl=document.createElement('div');handleEl.className='tbd-handle';
    handleEl.innerHTML='<i></i>';handleEl.onclick=function(){close();};

    dr.appendChild(hdrEl);dr.appendChild(tabsEl);dr.appendChild(body);dr.appendChild(handleEl);
    document.body.appendChild(ov);document.body.appendChild(dr);

    /* نقل الأشرطة الفرعية الأصلية إلى الدرج (المعرّفات والدوال كما هي) */
    SUBBARS.forEach(function(id){var el=$(id);if(el)panelEl.appendChild(el);});
    panelEl.addEventListener('click',onPanelClick);

    swipe(hdrEl,'up',close);swipe(handleEl,'up',close);swipe(topbar,'down',open);

    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen)close();});
    window.addEventListener('popstate',function(){
      if(ignorePop){ignorePop=false;return;}
      if(isOpen)close(true);
    });

    /* مراقبة تغيّر ظهور أزرار الصفحة */
    try{
      new MutationObserver(schedule).observe(topbar,
        {attributes:true,attributeFilter:['style','class'],subtree:true});
    }catch(e){}

    /* عند تبديل الصفحة: أغلق الدرج وحدّث الزر */
    if(typeof window.switchPage==='function'){
      var _sp=window.switchPage;
      window.switchPage=function(){
        if(isOpen)close();
        var r=_sp.apply(this,arguments);
        setTimeout(function(){curTab=null;update();},0);
        return r;
      };
    }

    document.body.classList.add('tbd-on');   /* آخر خطوة: إخفاء الصف القديم */
    update();
    window.TopDrawer={open:open,close:close,toggle:toggle,refresh:update};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
