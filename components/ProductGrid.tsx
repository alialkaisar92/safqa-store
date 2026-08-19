import { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
}: {
  products: Product[];
}) {
  if (!products.length) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
        <div className="text-5xl">📦</div>
        <h3 className="mt-4 text-xl font-black">
          لا توجد منتجات حاليًا
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          سيتم عرض منتجاتك هنا تلقائيًا عند توفرها.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}
