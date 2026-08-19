export type Product = {
  id: string;
  name: string;
  title: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  stock?: number;
  description?: string;
};

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export function normalizeProduct(raw: any, index = 0): Product {
  const id =
    stringValue(
      raw?.id ??
      raw?._id ??
      raw?.product_id ??
      raw?.sku,
      String(index + 1)
    );

  const name =
    stringValue(
      raw?.name ??
      raw?.title ??
      raw?.product_name,
      "منتج"
    );

  const price = numberValue(
    raw?.price ??
    raw?.sale_price ??
    raw?.selling_price ??
    raw?.final_price,
    0
  );

  const oldPrice = numberValue(
    raw?.oldPrice ??
    raw?.old_price ??
    raw?.original_price ??
    raw?.before_price,
    0
  );

  const image =
    stringValue(
      raw?.image ??
      raw?.image_url ??
      raw?.thumbnail ??
      raw?.photo ??
      raw?.main_image ??
      raw?.images?.[0],
      "/placeholder-product.svg"
    );

  const category =
    stringValue(
      raw?.category?.name ??
      raw?.category ??
      raw?.category_name,
      "منتجات"
    );

  return {
    id,
    name,
    title: name,
    price,
    oldPrice: oldPrice > price ? oldPrice : undefined,
    image,
    category,
    rating: numberValue(raw?.rating ?? raw?.rate, 4.8),
    reviews: numberValue(
      raw?.reviews ??
      raw?.review_count ??
      raw?.ratings_count,
      0
    ),
    stock: numberValue(
      raw?.stock ??
      raw?.quantity ??
      raw?.available_quantity,
      0
    ),
    description:
      stringValue(
        raw?.description ??
        raw?.short_description,
        ""
      ),
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch("/api/products", {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = await response.json();

    const list =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
        ? data.items
        : [];

    return list.map(normalizeProduct);
  } catch {
    return [];
  }
}
