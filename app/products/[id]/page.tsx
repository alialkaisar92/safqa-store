"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, ShoppingCart } from "lucide-react";

import {
  getProducts,
  Product,
} from "@/lib/products";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      getProducts().then((items) => {
        setProduct(
          items.find((item) => item.id === id) || null
        );
      });
    });
  }, [params]);

  if (!product) {
    return (
      <main className="container py-20 text-center">
        <div className="text-5xl">📦</div>
        <h1 className="mt-4 text-2xl font-black">
          المنتج غير موجود
        </h1>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-full bg-[#075b52] px-6 py-3 font-bold text-white"
        >
          العودة للمنتجات
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">

      <div className="container pt-5">

        <Link
          href="/products"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm"
        >
          <ArrowRight size={21} />
        </Link>

        <div className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-sm">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="mt-5">

          <div className="flex items-start justify-between gap-3">

            <h1 className="text-2xl font-black">
              {product.name}
            </h1>

            <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white shadow-sm">
              <Heart size={20} />
            </button>

          </div>

          <div className="mt-3 text-sm">
            ⭐ {product.rating.toFixed(1)}
            <span className="mr-2 text-gray-500">
              ({product.reviews} تقييم)
            </span>
          </div>

          <div className="mt-4 text-3xl font-black text-[#075b52]">
            {product.price.toLocaleString("ar-EG")} ج.م
          </div>

          {product.description && (
            <div
              className="mt-5 leading-8 text-gray-600 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("rab7na:add-cart", {
                  detail: product,
                })
              );
            }}
            className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#075b52] font-black text-white shadow-lg"
          >
            <ShoppingCart size={21} />
            أضف إلى السلة
          </button>

        </div>
      </div>

    </main>
  );
}
