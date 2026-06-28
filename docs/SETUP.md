# ⚙️ SETUP — دليل التثبيت والإعداد

> دليل شامل لتشغيل **Dalty Grades** على أي جهاز أو خادم، من الفتح المباشر حتى النشر الاحترافي.

---

## 📦 الملفات المطلوبة

تأكد من أن مجلد المشروع يحتوي على الهيكل التالي:

```
dalty-grades/
├── index.html          ✅ الملف الرئيسي (إلزامي)
├── manifest.json       ✅ إعدادات PWA (إلزامي)
├── sw.js               ✅ Service Worker (إلزامي للعمل أوفلاين)
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── screenshots/        (اختياري — لمتاجر التطبيقات)
    ├── desktop.png
    └── mobile.png
```

---

## 🖼️ توليد الأيقونات

احتاج إلى صورة مربعة بدقة **512×512** على الأقل، ثم:

### الطريقة السريعة (أونلاين)
1. اذهب إلى 👉 [realfavicongenerator.net](https://realfavicongenerator.net)
2. ارفع صورتك
3. اضغط **Generate**
4. حمّل الملفات وضعها في مجلد `icons/`

### أو باستخدام Node.js
```bash
npm install -g sharp-cli

sharp -i icon-512.png -o icons/icon-72.png  resize 72
sharp -i icon-512.png -o icons/icon-96.png  resize 96
sharp -i icon-512.png -o icons/icon-128.png resize 128
sharp -i icon-512.png -o icons/icon-144.png resize 144
sharp -i icon-512.png -o icons/icon-152.png resize 152
sharp -i icon-512.png -o icons/icon-192.png resize 192
sharp -i icon-512.png -o icons/icon-384.png resize 384
```

---

## 🚀 طرق التشغيل

---

### ① فتح مباشر (بدون خادم)

> ⚠️ **Service Worker لا يعمل** في هذا الوضع (يتطلب HTTPS أو localhost)

```
ببساطة: انقر نقراً مزدوجاً على index.html
```

مناسب لـ: الاستخدام الفردي السريع بدون تثبيت.

---

### ② تشغيل محلي بـ VS Code

1. ثبّت إضافة **Live Server**:
   ```
   Ctrl+Shift+X → ابحث عن "Live Server" → Install
   ```
2. افتح مجلد المشروع في VS Code
3. انقر بزر الماوس الأيمن على `index.html` → **Open with Live Server**
4. سيفتح على: `http://127.0.0.1:5500`

✅ Service Worker يعمل على `localhost`

---

### ③ تشغيل محلي بـ Python

```bash
# Python 3
cd dalty-grades
python -m http.server 8080
```
ثم افتح: `http://localhost:8080`

---

### ④ تشغيل محلي بـ Node.js

```bash
# تثبيت serve
npm install -g serve

# تشغيل
cd dalty-grades
serve .
```
ثم افتح: `http://localhost:3000`

---

### ⑤ النشر على الإنترنت (مجاناً)

#### GitHub Pages
```bash
# 1. أنشئ مستودعاً جديداً على github.com
# 2. ارفع الملفات
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/dalty-grades.git
git push -u origin main

# 3. فعّل GitHub Pages:
#    Settings → Pages → Source: main branch → Save
```
الرابط: `https://USERNAME.github.io/dalty-grades/`

#### Netlify (بالسحب والإفلات)
1. اذهب إلى [netlify.com](https://netlify.com)
2. اسحب مجلد `dalty-grades/` كاملاً إلى صفحة Netlify
3. انتهى ✅ — ستحصل على رابط HTTPS فوراً

#### Vercel
```bash
npm install -g vercel
cd dalty-grades
vercel
```

---

## 🔧 تفعيل Service Worker

أضف هذا الكود في `index.html` قبل إغلاق `</body>` مباشرةً:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js')
        .then(function (reg) {
          console.log('[Dalty] Service Worker مُفعَّل على:', reg.scope);
        })
        .catch(function (err) {
          console.warn('[Dalty] فشل تسجيل Service Worker:', err);
        });
    });
  }
</script>
```

> ✅ بعد هذا، سيعمل التطبيق **بدون إنترنت** بعد أول تحميل.

---

## 📲 تثبيت التطبيق على الجهاز (PWA)

### على الجوال (Android / iOS)
1. افتح التطبيق في المتصفح
2. اضغط على **⋮ القائمة** أو **زر المشاركة**
3. اختر **"إضافة إلى الشاشة الرئيسية"**
4. سيظهر أيقونة Dalty Grades على شاشتك

### على الكمبيوتر (Chrome / Edge)
1. افتح التطبيق في المتصفح
2. انقر على أيقونة ⊕ في شريط العنوان
3. اختر **"تثبيت"**

---

## 🔐 إعداد بيانات الدخول

ابحث في `index.html` عن دالة `doLogin` وعدّل بيانات الدخول:

```javascript
// مثال — ابحث عن هذا في الكود وعدّله:
function doLogin() {
  var u = document.getElementById('loginUser').value.trim();
  var p = document.getElementById('loginPass').value.trim();

  // ✏️ غيّر هنا اسم المستخدم وكلمة المرور
  if (u === 'admin' && p === '1234') {
    // تسجيل دخول ناجح
  }
}
```

> 💡 يمكن إضافة عدة حسابات بجعل الشرط يتحقق من قائمة مستخدمين.

---

## 🌐 إعداد HTTPS على خادم Apache/Nginx

### Apache — ملف `.htaccess`
```apache
# تفعيل HTTPS الإجباري
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Service Worker — منع التخزين المؤقت له
<Files "sw.js">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</Files>

# ضمان MIME types صحيح
AddType application/manifest+json .json
AddType text/javascript .js
```

### Nginx
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    root /var/www/dalty-grades;
    index index.html;

    # Service Worker بدون كاش
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # باقي الملفات
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🧪 التحقق من صحة الإعداد

بعد النشر، تحقق من:

| الاختبار | الأداة |
|---|---|
| PWA صحيحة | Chrome DevTools → Lighthouse |
| Service Worker يعمل | DevTools → Application → Service Workers |
| manifest.json صحيح | DevTools → Application → Manifest |
| يعمل أوفلاين | DevTools → Network → Offline ثم أعد التحميل |

---

## ❓ مشاكل شائعة وحلولها

| المشكلة | السبب | الحل |
|---|---|---|
| Service Worker لا يُسجَّل | فتح الملف مباشرةً (file://) | استخدم localhost أو HTTPS |
| الخط لا يظهر | لا يوجد إنترنت | سيُحمَّل من الكاش بعد الزيارة الأولى |
| التطبيق لا يُثبَّت | manifest ناقص أو SW غير مُفعَّل | تحقق من Lighthouse |
| البيانات اختفت | مسح بيانات المتصفح | صدّر Excel بانتظام |
| الأيقونة لا تظهر | مسار خاطئ في manifest.json | تحقق من مسار `icons/` |

---

## 📞 الدعم

لأي مشكلة في الإعداد، تحقق من:
- **Console** في DevTools (F12) للأخطاء
- **Network tab** للموارد الفاشلة
- **Application tab** لحالة PWA و Service Worker

---

*آخر تحديث: 2026 — Dalty Grades v1.0*
