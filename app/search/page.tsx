"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import ProductGrid from "@/components/ProductGrid";
import {
  getProducts,
  Product,
} from "@/lib/products";

function SearchContent() {
  const params = useSearchParams();
  const q = params.get("q") || "";

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const result = products.filter((p) =>
    `${p.name} ${p.category}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <main className="min-h-screen pb-20">
      <div className="container pt-6">

        <Link
          href="/"
          className="text-sm font-bold text-[#075b52]"
        >
          ← العودة للرئيسية
        </Link>

        <h1 className="mt-5 text-2xl font-black">
          نتائج البحث
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {q ? `البحث عن: ${q}` : "اكتب كلمة للبحث"}
        </p>

        <div className="mt-6">
          <ProductGrid products={result} />
        </div>

      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
