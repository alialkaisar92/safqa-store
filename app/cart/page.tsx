import Link from "next/link";

export default function CartPage() {
  return (
    <main className="container min-h-screen py-8">
      <Link href="/" className="font-bold text-[#075b52]">
        ← الرئيسية
      </Link>

      <div className="mt-8 rounded-[28px] bg-white p-10 text-center shadow-sm">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-4 text-2xl font-black">
          سلة التسوق
        </h1>
        <p className="mt-2 text-gray-500">
          أضف منتجات إلى السلة لتظهر هنا.
        </p>
      </div>
    </main>
  );
}
