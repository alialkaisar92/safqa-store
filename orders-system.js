// نظام متابعة الطلبات - هنربطه بعدين
const sampleOrders = [
  { id: 1001, product: 'أباجورة الإضاءة الكلاسيكية', customer: 'أحمد محمد', phone: '01012345678', price: 190, commission: 45, status: 'تم التسليم', date: '2026-07-20', address: 'القاهرة - مدينة نصر' },
  { id: 1002, product: 'حاجز السيليكون الذكي للحوض', customer: 'سارة علي', phone: '01123456789', price: 100, commission: 25, status: 'قيد التأكيد', date: '2026-07-22', address: 'الجيزة - الدقي' },
  { id: 1003, product: 'كشاف الطاقة الشمسية الخارجي', customer: 'محمود حسن', phone: '01234567890', price: 350, commission: 70, status: 'تم التسليم', date: '2026-07-18', address: 'الإسكندرية - سموحة' },
  { id: 1004, product: 'بلور الهواء النفاث الميني', customer: 'فاطمة أحمد', phone: '01512345678', price: 450, commission: 90, status: 'جاري الشحن', date: '2026-07-24', address: 'المنصورة' },
  { id: 1005, product: 'منظم مطبخ متعدد الاستخدام', customer: 'يوسف خالد', phone: '01098765432', price: 120, commission: 30, status: 'ملغي', date: '2026-07-15', address: 'طنطا' }
];

module.exports = sampleOrders;
