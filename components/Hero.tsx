import Link from "next/link";

export default function Hero() {
  return (
    <section className="container mt-5">

      <div
        className="relative min-h-[190px] overflow-hidden rounded-[24px] border border-[#8eb8ae] p-6 text-white shadow-[0_15px_40px_rgba(9,80,70,.18)]"
        style={{
          background:
            "radial-gradient(circle at 10% 80%, rgba(255,255,255,.12), transparent 28%), linear-gradient(135deg,#063f39,#075c50 55%,#0b7768)"
        }}
      >

        <div className="absolute -left-10 -bottom-16 h-44 w-44 rounded-full border-[20px] border-white/10" />
        <div className="absolute left-12 bottom-6 text-6xl opacity-80">
          🚚
        </div>

        <div className="relative z-10 mr-auto max-w-[62%] text-right">

          <p className="mb-2 text-sm font-medium text-white/80">
            عروض مميزة
          </p>

          <h1 className="text-2xl font-black leading-tight md:text-4xl">
            عرض أسعار الشحن
          </h1>

          <p className="mt-1 text-lg font-medium text-white/90">
            حسب المحافظة
          </p>

          <Link
            href="/shipping"
            className="mt-5 inline-flex rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold backdrop-blur-md transition hover:bg-white/20"
          >
            اعرف الآن
          </Link>

        </div>
      </div>

    </section>
  );
}
