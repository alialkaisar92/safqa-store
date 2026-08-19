import Link from "next/link";

const categories = [
  ["الكل", "◫"],
  ["مطبخ", "🍳"],
  ["أطفال", "👶"],
  ["صحة ولياقة", "💚"],
  ["سيارات", "🚗"],
  ["منزل", "🏠"],
];

export default function Categories() {
  return (
    <section className="container mt-5">

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">

        {categories.map(([name, icon], index) => (
          <Link
            key={name}
            href={
              index === 0
                ? "/products"
                : `/categories/${encodeURIComponent(name)}`
            }
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold shadow-sm ${
              index === 0
                ? "border-[#075b52] bg-[#075b52] text-white"
                : "border-[#d4e5e1] bg-white text-[#263d39]"
            }`}
          >
            <span>{icon}</span>
            {name}
          </Link>
        ))}

      </div>

    </section>
  );
}
