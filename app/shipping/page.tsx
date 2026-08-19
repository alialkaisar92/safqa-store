import Link from "next/link";

export default function Shipping() {
  return (
    <main className="container py-8">
      <Link href="/" className="font-bold text-[#075b52]">← الرئيسية</Link>
      <div className="mt-8 rounded-[28px] bg-white p-7 shadow-sm">
        <h1 className="text-3xl font-black">أسعار الشحن</h1>
        <p className="mt-5 leading-8 text-gray-600">
          تختلف أسعار الشحن حسب المحافظة ويتم احتسابها أثناء عملية الطلب.
        </p>
      </div>
    </main>
  );
}
