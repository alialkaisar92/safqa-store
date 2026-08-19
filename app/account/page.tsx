import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="container min-h-screen py-8">

      <Link href="/" className="text-sm font-bold text-[#075b52]">
        ← الرئيسية
      </Link>

      <div className="mt-8 rounded-[28px] bg-white p-6 shadow-sm">

        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#dff1ed] text-3xl">
          👤
        </div>

        <h1 className="mt-4 text-center text-2xl font-black">
          حسابي
        </h1>

        <div className="mt-6 grid gap-3">
          <Link className="rounded-2xl bg-[#f2f8f6] p-4 font-bold" href="/orders">
            📦 طلباتي
          </Link>

          <Link className="rounded-2xl bg-[#f2f8f6] p-4 font-bold" href="/cart">
            🛒 سلة التسوق
          </Link>
        </div>

      </div>
    </main>
  );
}
