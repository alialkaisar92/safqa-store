# تقرير إضافة PostgreSQL لمشروع Rab7na

## الملخص التنفيذي

تم تجهيز المشروع الحالي لاستخدام PostgreSQL مُدار بدل Firebase كطبقة بيانات التطبيق الرئيسية، مع اختيار Neon Free بسبب وجود خطة مجانية دائمة دون بطاقة، وتوافقها المباشر مع Vercel. لم يتم إنشاء مشروع جديد، ولم تُحفظ أي كلمة مرور أو قيمة اتصال داخل الكود أو GitHub.

لم يمكن تنفيذ اتصال CRUD فعلي أو ترحيل البيانات فعليًا داخل هذه البيئة لأن `DATABASE_URL` غير مضبوط. لذلك تم اختبار الصياغة وإقلاع الخادم واختبارات الحماية، لكن لا يصح اعتبار اختبار Production أو ترحيل البيانات مكتملًا قبل إضافة رابط Neon في Vercel.

## فحص المشروع الحالي

المشروع الحالي هو Node.js + Express، وليس مشروع React أو Next.js. الواجهة عبارة عن HTML/CSS/JavaScript، والخادم الرئيسي هو `server.js`. كان التخزين موزعًا بين Firestore عبر `firebase-admin`، وSQLite محلي في `safqa.db` و`data/easyorders.db`، وملف `db.json`، إضافة إلى ملفات cache للمنتجات والأسعار.

الجداول المنطقية التي كانت موجودة في طبقة SQLite تشمل المستخدمين، التصنيفات، المنتجات، الطلبات، تاريخ حالة الطلب، السحوبات، الإشعارات، البنرات، أسعار الشحن، الصفحات، إعدادات EasyOrders، المنتجات المتزامنة، أحداث Webhook، والاتصالات. كما كان Firestore يحفظ مجموعات `users` و`authTokens` و`emailVerifications` و`orders` و`affiliateProducts` و`withdrawals` و`tickets` و`affiliateMeta` و`chats`.

## قاعدة البيانات المختارة

تم اختيار **Neon PostgreSQL Free**. وفق صفحة الأسعار الرسمية، الخطة مجانية بشكل دائم وليست تجربة، ولا تتطلب بطاقة ائتمانية، وتوفر حاليًا 0.5 GB تخزين و100 CU-hour شهريًا لكل مشروع و5 GB نقل بيانات عام. عند بلوغ حدود الخطة المجانية يتوقف compute حتى بداية الشهر التالي بدل التحول التلقائي إلى فاتورة. [1]

Neon متاح كذلك من Vercel Marketplace كتخزين Serverless Postgres، ويمكن ربط حساب Neon موجود بمشروع Vercel أو إنشاء حساب من خلال التكامل. [2] كما أن Neon توثق استخدام PostgreSQL عبر `DATABASE_URL` في بيئات Vercel وNode.js الحديثة. [3]

## ما تم تعديله

| الملف | التعديل |
|---|---|
| `lib/postgres.js` | Pool اتصال PostgreSQL، schema، الفهارس، وتهيئة الجداول |
| `firestore.js` | استبدال `firebase-admin` بطبقة PostgreSQL متوافقة تحفظ البيانات العامة في `app_documents` وتستخدم جدول `users` صريحًا |
| `server.js` | تهيئة schema عند وجود `DATABASE_URL` وتحديث `/api/health` ليعرض حالة PostgreSQL |
| `.env.example` | إضافة `DATABASE_URL` و`DATABASE_SSL` و`DB_POOL_MAX` وإزالة متغيرات Firebase |
| `scripts/migrate-to-postgres.js` | ترحيل إضافي من `db.json` وSQLite المحلي باستخدام upsert دون حذف المصدر |
| `scripts/test-postgres.js` | اختبار إنشاء وقراءة وتعديل وحذف مستخدم تجريبي مع bcryptjs |
| `package.json` | إضافة `pg` وأوامر `db:migrate` و`db:test` وإزالة `firebase-admin` |

## مخطط المستخدمين وكلمات المرور

جدول `users` يحتوي على `email` الفريد، و`password_hash`، و`name`، و`created_at`، و`updated_at`، و`email_verified`، و`last_login`. لا توجد دالة تخزن كلمة المرور كنص عادي. اختبار المستخدم التجريبي يستخدم `bcryptjs` مع cost factor يساوي 12، ثم يحذف السجل التجريبي بعد انتهاء الاختبار.

## خطوات إنشاء وربط قاعدة البيانات

أنشئ حسابًا مجانيًا من [Neon](https://neon.com/signup)، ثم أنشئ Project جديدًا واختر المنطقة الأقرب إلى Vercel أو جمهور الموقع. من زر **Connect** انسخ رابط PostgreSQL. لا ترسل الرابط في المحادثة ولا تضعه في GitHub.

في Vercel افتح مشروع `rab7na-store` ثم **Settings → Environment Variables**، وأضف المتغير التالي إلى Production وPreview وDevelopment عند الحاجة:

```text
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

أضف أيضًا:

```text
DATABASE_SSL=true
DB_POOL_MAX=5
```

بعد حفظ المتغيرات، نفّذ Redeploy من Vercel. عند أول تشغيل سيُنشئ الخادم schema تلقائيًا. لتشغيل الترحيل مرة واحدة من بيئة تملك `DATABASE_URL`:

```bash
npm install
npm run db:migrate
```

ولتشغيل اختبار CRUD:

```bash
npm run db:test
```

## نتائج الاختبار

| الاختبار | النتيجة |
|---|---|
| فحص JavaScript | ناجح باستخدام `node --check` للملفات المعدلة |
| إقلاع الخادم محليًا | ناجح |
| `/api/health` بدون DATABASE_URL | يعيد `database_status: not_configured` بوضوح |
| حماية التشغيل بدون اتصال | سكربتا `db:test` و`db:migrate` يتوقفان برسالة واضحة بدل إنشاء قاعدة مؤقتة أو فقد بيانات |
| إنشاء schema | لم ينفذ فعليًا لغياب DATABASE_URL |
| User CRUD | لم ينفذ فعليًا لغياب DATABASE_URL |
| اختبار إعادة التشغيل والاستمرارية | لم ينفذ فعليًا لغياب قاعدة Production |
| Production Connection | لم يمكن تأكيده دون إضافة DATABASE_URL إلى Vercel |

## ملاحظة عن البيانات الموجودة

الترحيل المرفق additive ويدعم `upsert` من `db.json` و` safqa.db` إلى PostgreSQL دون حذف ملفات المصدر. أما بيانات Firestore القديمة، فلا يمكن ترحيلها من هذه البيئة دون اعتماد Firestore قديم أو تصدير رسمي للبيانات؛ وبما أن المطلوب عدم استخدام Firebase، لم يتم تخمين البيانات أو الادعاء بنقلها. يجب الاحتفاظ ببيانات الاعتماد القديمة مؤقتًا فقط إن كانت هناك بيانات Firestore يجب تصديرها، ثم تشغيل عملية ترحيل مستقلة والتحقق من الأعداد.

## References

[1]: https://neon.com/pricing "Neon Pricing Plans"

[2]: https://vercel.com/marketplace/neon "Neon on Vercel Marketplace"

[3]: https://neon.com/docs/serverless/serverless-driver "Neon Serverless Driver"
