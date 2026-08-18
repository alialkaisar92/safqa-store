# بحث مزود قاعدة البيانات — 18 أغسطس 2026

## Neon Pricing
المصدر: https://neon.com/pricing

توضح الصفحة الرسمية أن خطة Neon Free دائمة وليست تجربة، بسعر 0 دولار شهريًا، ولا تتطلب بطاقة ائتمانية. الحدود الحالية المذكورة للخطة المجانية لكل مشروع هي 100 CU-hour شهريًا، و0.5 GB تخزين، و5 GB نقل بيانات عام، مع إيقاف الحوسبة تلقائيًا بعد 5 دقائق من عدم النشاط واستئنافها عند الطلب. عند بلوغ حد الخطة المجانية يتوقف compute حتى بداية الشهر التالي.

## Vercel Marketplace — Neon
المصدر: https://vercel.com/marketplace/neon

يعرض Vercel تكامل Neon كـ Serverless Postgres، ويذكر أن الخطط تبدأ من 0 دولار، مع إمكانية إنشاء حساب Neon جديد أو ربط حساب Neon موجود. التكامل يجهز قاعدة PostgreSQL مُدارة وربطًا مع نشر Vercel.

## Neon Serverless Driver
المصدر: https://neon.com/docs/serverless/serverless-driver

توثق Neon الحزمة `@neondatabase/serverless` لاستخدام PostgreSQL عبر HTTP أو WebSockets في البيئات serverless مثل Vercel، وتوضح أن متغير الاتصال القياسي هو `DATABASE_URL` بصيغة PostgreSQL، وأن Node.js 19 أو أحدث مطلوب لإصدار GA الحالي. المشروع الحالي يستخدم Node.js 22.
