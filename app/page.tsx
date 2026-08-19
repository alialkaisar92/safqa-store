"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import ProductGrid from "@/components/ProductGrid";
import {
  getProducts,
  Product,
} from "@/lib/products";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen pb-28">

      <Header />

      <Hero />

      <Categories />

      <section className="container mt-7">

        <div className="mb-4 flex items-center justify-between">

          <h2 className="text-xl font-black">
            كل المنتجات
            {products.length > 0 && (
              <span className="mr-1 text-sm">
                ({products.length})
              </span>
            )}
          </h2>

          <Link
            href="/products"
            className="flex items-center gap-2 rounded-full border border-[#cbded9] bg-white px-4 py-2 text-sm font-bold"
          >
            <SlidersHorizontal size={17} />
            تصفية
          </Link>

        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[.75] animate-pulse rounded-3xl bg-white"
              />
            ))}
          </div>
        ) : (
          <ProductGrid products={products} />
        )}

      </section>

      <BottomNav />

    </main>
  );
}

function BottomNav() {
  return (
    <nav className="glass fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 items-center justify-around rounded-[25px] border border-white/80 px-2 py-2 shadow-[0_15px_40px_rgba(25,75,69,.18)]">

      <Link
        href="/account"
        className="flex flex-col items-center gap-1 px-3 py-1 text-xs"
      >
        <span className="text-xl">👤</span>
        حسابي
      </Link>

      <Link
        href="/orders"
        className="flex flex-col items-center gap-1 px-3 py-1 text-xs"
      >
        <span className="text-xl">📦</span>
        طلباتي
      </Link>

      <Link
        href="/"
        className="flex flex-col items-center gap-1 rounded-2xl bg-[#dff2ed] px-5 py-2 text-xs font-black text-[#075b52]"
      >
        <span className="text-xl">⌂</span>
        الرئيسية
      </Link>

      <Link
        href="/cart"
        className="flex flex-col items-center gap-1 px-3 py-1 text-xs"
      >
        <span className="text-xl">🛒</span>
        السلة
      </Link>

      <Link
        href="/account"
        className="flex flex-col items-center gap-1 px-3 py-1 text-xs"
      >
        <span className="text-xl">⚙️</span>
        حسابي
      </Link>

    </nav>
  );
}
