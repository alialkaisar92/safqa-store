import Link from "next/link";

export default function Contact() {
  return (
    <main className="container py-8">
      <Link href="/" className="font-bold text-[#075b52]">← الرئيسية</Link>
      <div className="mt-8 rounded-[28px] bg-white p-7 shadow-sm">
        <h1 className="text-3xl font-black">تواصل معنا</h1>
        <p className="mt-4 text-gray-600">
          يمكنك التواصل مع فريق Rab7na من خلال قنوات الدعم المتاحة في الموقع.
        </p>
      </div>
    </main>
  );
}
