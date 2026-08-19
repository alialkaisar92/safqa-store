import Link from "next/link";

const faqs = [
  ["كيف أطلب منتجًا؟", "اختر المنتج ثم أضفه إلى السلة واتبع خطوات الطلب."],
  ["هل يوجد شحن؟", "تختلف تكلفة الشحن حسب المحافظة والمنتج."],
  ["كيف أتابع طلبي؟", "يمكنك متابعة طلباتك من صفحة طلباتي."],
];

export default function FAQ() {
  return (
    <main className="container py-8">
      <Link href="/" className="font-bold text-[#075b52]">← الرئيسية</Link>
      <h1 className="mt-8 text-3xl font-black">الأسئلة الشائعة</h1>

      <div className="mt-6 grid gap-3">
        {faqs.map(([q,a]) => (
          <details key={q} className="rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-black">{q}</summary>
            <p className="mt-3 text-gray-600">{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
