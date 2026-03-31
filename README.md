# 🔬 نظام إدارة مركز التحاليل — Basic v1.0

نظام متكامل لإدارة مراكز التحاليل الصغيرة مع نظام فاتورة احترافي يدعم QR Code.

## التقنيات المستخدمة

| الطبقة   | التقنية                     |
|----------|-----------------------------|
| Backend  | Express.js + Async/Await    |
| Database | MySQL (mysql2 + Promises)   |
| Frontend | Bootstrap 5.3 RTL + EJS     |
| QR Code  | qrcode (server-side)        |

## متطلبات التشغيل

- Node.js >= 16
- MySQL >= 5.7

## خطوات الإعداد

### 1. تثبيت الـ packages
```bash
npm install
```

### 2. إعداد قاعدة البيانات
```bash
# افتح MySQL وشغل الـ schema
mysql -u root -p < schema.sql
```

### 3. إعداد ملف .env
```bash
cp .env.example .env
# عدّل البيانات في .env حسب إعداداتك
```

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=كلمة_المرور
DB_NAME=lab_basic
PORT=3000
LAB_NAME=اسم المركز
LAB_ADDRESS=العنوان
LAB_PHONE=رقم الهاتف
```

### 4. تشغيل البرنامج
```bash
# تشغيل عادي
npm start

# تشغيل مع إعادة تحميل تلقائية (للتطوير)
npm run dev
```

### 5. افتح المتصفح
```
http://localhost:3000
```

## مميزات النسخة Basic

- ✅ لوحة تحكم بإحصائيات اليوم والشهر
- ✅ إنشاء طلبات جديدة مع كتالوج تحاليل كامل (30 تحليل)
- ✅ فاتورة احترافية مع QR Code
- ✅ طباعة مباشرة من المتصفح
- ✅ قائمة الفواتير مع بحث وفلترة
- ✅ إدارة كتالوج التحاليل (إضافة / تعديل / حذف)
- ✅ تتبع حالة الفاتورة (معلق / مكتمل / ملغي)
- ✅ دعم كامل للغة العربية RTL

## هيكل المشروع

```
lab-basic/
├── app.js              ← نقطة الدخول الرئيسية
├── db.js               ← اتصال MySQL (Pool)
├── schema.sql          ← هيكل قاعدة البيانات + بيانات أولية
├── .env.example        ← مثال على متغيرات البيئة
├── routes/
│   ├── index.js        ← الداشبورد
│   ├── invoices.js     ← CRUD الفواتير
│   └── tests.js        ← CRUD كتالوج التحاليل
├── views/
│   ├── partials/       ← head, sidebar, footer
│   ├── dashboard.ejs   ← الصفحة الرئيسية
│   ├── invoices/       ← new, show, index
│   └── tests/          ← index
└── public/
    └── css/style.css   ← الأنماط المخصصة
```

## النسخ القادمة

| النسخة     | المميزات الإضافية                                      |
|------------|--------------------------------------------------------|
| **Pro**    | تعدد المستخدمين، تقارير متقدمة، باركود النماذج         |
| **Enterprise** | متعدد الفروع، API، ربط أجهزة المعمل، خلفية سحابية |
