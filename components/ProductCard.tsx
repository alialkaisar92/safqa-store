"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Tag } from "lucide-react";
import { Product } from "@/lib/products";
import { useState } from "react";

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="product-card overflow-hidden rounded-[22px] border border-white/80 bg-white p-2 shadow-[0_8px_28px_rgba(31,75,69,.10)]">

      <div className="relative overflow-hidden rounded-[18px] bg-[#eef5f3]">

        <Link href={`/products/${product.id}`}>
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        </Link>

        <button
          onClick={() => setLiked(!liked)}
          className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl bg-white/95 shadow-sm"
          aria-label="المفضلة"
        >
          <Heart
            size={20}
            fill={liked ? "currentColor" : "none"}
            className={liked ? "text-red-500" : ""}
          />
        </button>

        {product.oldPrice && (
          <span className="absolute left-2 top-2 rounded-full bg-[#087b69] px-3 py-1 text-xs font-black text-white">
            خصم
          </span>
        )}

      </div>

      <div className="px-2 pb-2 pt-3">

        <Link
          href={`/products/${product.id}`}
          className="block truncate text-[15px] font-bold text-[#263936]"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-center justify-between">

          <span className="text-xs text-[#899894]">
            {product.reviews || 0} تقييم
          </span>

          <span className="text-sm font-bold">
            ⭐ {product.rating.toFixed(1)}
          </span>

        </div>

        <div className="mt-2 flex items-end gap-2">

          <strong className="text-xl font-black text-[#123d38]">
            {product.price.toLocaleString("ar-EG")}
            <small className="mr-1 text-xs font-bold">
              ج.م
            </small>
          </strong>

          {product.oldPrice && (
            <del className="text-xs text-gray-400">
              {product.oldPrice.toLocaleString("ar-EG")}
            </del>
          )}

        </div>

        <button
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#075b52] text-sm font-bold text-white shadow-sm transition hover:bg-[#064b44]"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("rab7na:add-cart", {
                detail: product,
              })
            );
          }}
        >
          <span>أضف إلى السلة</span>
          <ShoppingCart size={17} />
        </button>

      </div>

    </article>
  );
}
