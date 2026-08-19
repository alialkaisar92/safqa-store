import Link from "next/link";

export default function About() {
  return (
    <main className="container py-8">
      <Link href="/" className="font-bold text-[#075b52]">← الرئيسية</Link>
      <div className="mt-8 rounded-[28px] bg-white p-7 shadow-sm">
        <h1 className="text-3xl font-black">عن Rab7na</h1>
        <p className="mt-5 leading-8 text-gray-600">
          Rab7na منصة تسوق تهدف لتقديم تجربة بسيطة وسريعة لاكتشاف المنتجات والعروض.
        </p>
      </div>
    </main>
  );
}
