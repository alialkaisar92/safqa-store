// إعدادات تكامل EasyOrders — قابلة للتوسع
module.exports = {
  baseUrl: 'https://api.easy-orders.net/api/v1/external-apps',
  apiKeyHeader: 'Api-Key',        // الهيدر الرسمي للتوثيق
  timeoutMs: 15000,               // عدم تعطيل الموقع عند بطء الاتصال
  syncIntervalMs: 10 * 60 * 1000, // مزامنة تلقائية كل 10 دقائق

  // مسارات الـ API (تُجمّع في مكان واحد لسهولة التوسع)
  endpoints: {
    products:   '/products',
    product:    '/products/:id',
    orders:     '/orders',
    order:      '/orders/:id',
    createOrder:'/orders',
    store:      '/store'
  },

  encryption: {
    algorithm: 'aes-256-gcm',
    // في الإنتاج: ضع EASYORDERS_SECRET كمتغير بيئة قوي
    secret: process.env.EASYORDERS_SECRET || 'earnify-eo-local-secret-CHANGE-ME'
  },

  // خريطة حالات الطلب: قيمة EasyOrders -> {عرض عربي, لون}
  orderStatusMap: {
    'pending':    { ar: 'جديد',          color: 'amber'  },
    'confirmed':  { ar: 'مؤكد',          color: 'sky'    },
    'processing': { ar: 'جاري التجهيز',  color: 'violet' },
    'shipped':    { ar: 'خرج للشحن',     color: 'blue'   },
    'delivered':  { ar: 'تم التسليم',    color: 'green'  },
    'cancelled':  { ar: 'ملغي',          color: 'rose'   },
    'returned':   { ar: 'مرتجع',         color: 'rose'   },
    'paid':       { ar: 'مدفوع',         color: 'green'  }
  },

  logFile: 'logs/easyorders.log',
  dbFile:  'data/easyorders.db'
};
