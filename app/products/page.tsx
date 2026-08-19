"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";

import ProductGrid from "@/components/ProductGrid";
import {
  getProducts,
  Product,
} from "@/lib/products";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const filtered = products.filter((p) =>
    `${p.name} ${p.category}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen pb-20">

      <div className="container pt-5">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm"
          >
            <ArrowRight size={21} />
          </Link>

          <h1 className="text-xl font-black">
            كل المنتجات
          </h1>

          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm">
            <SlidersHorizontal size={20} />
          </button>

        </div>

        <div className="mt-5 rounded-2xl bg-white p-2 shadow-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث داخل المنتجات..."
            className="h-11 w-full rounded-xl bg-[#f1f7f5] px-4 outline-none"
          />
        </div>

        <div className="mt-6">
          <ProductGrid products={filtered} />
        </div>

      </div>

    </main>
  );
}
