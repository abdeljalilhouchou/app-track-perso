"use server";

// Overridable so local QA can answer from a fixture instead of the live service.
const OFF_BASE = process.env.OPENFOODFACTS_BASE_URL || "https://world.openfoodfacts.org";

export type OffResult = {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number>;
};

export async function searchOpenFoodFacts(query: string): Promise<OffResult[]> {
  if (typeof query !== "string") return [];
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return [];

  try {
    const url = new URL("/cgi/search.pl", OFF_BASE);
    url.searchParams.set("search_terms", q);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "8");
    url.searchParams.set(
      "fields",
      "code,product_name,brands,nutriments"
    );

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "track-perso-app/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { products?: OffProduct[] };
    const products = data.products ?? [];

    return products
      .filter((p) => p.product_name && p.nutriments && typeof p.nutriments["energy-kcal_100g"] === "number")
      .map((p) => {
        const n = p.nutriments!;
        return {
          id: p.code ?? crypto.randomUUID(),
          name: p.product_name!.slice(0, 120),
          brand: p.brands?.slice(0, 120) ?? null,
          calories: Math.round(n["energy-kcal_100g"] ?? 0),
          protein: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
          carbs: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
          fat: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
          fiber: Math.round((n["fiber_100g"] ?? 0) * 10) / 10,
          sugar: Math.round((n["sugars_100g"] ?? 0) * 10) / 10,
          sodium: Math.round((n["sodium_100g"] ?? 0) * 1000),
        };
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export type BarcodeResult = OffResult & { servingGrams: number | null };

/**
 * One product by its barcode (EAN-8/13, UPC). Only the code leaves the app. Returns null when
 * the code is malformed, the product is unknown, or it has no calorie value per 100 g.
 */
export async function lookupBarcode(code: string): Promise<BarcodeResult | null> {
  if (typeof code !== "string") return null;
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6,14}$/.test(digits)) return null;

  try {
    const url = new URL(`/api/v2/product/${digits}.json`, OFF_BASE);
    url.searchParams.set("fields", "code,product_name,brands,nutriments,serving_quantity");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "track-perso-app/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: OffProduct & { serving_quantity?: number | string } };
    const p = data.product;
    if (data.status !== 1 || !p?.product_name || typeof p.nutriments?.["energy-kcal_100g"] !== "number") return null;
    const n = p.nutriments;
    const serving = Number(p.serving_quantity);
    return {
      id: p.code ?? digits,
      name: p.product_name.slice(0, 120),
      brand: p.brands?.split(",")[0]?.trim().slice(0, 120) || null,
      calories: Math.round(n["energy-kcal_100g"] ?? 0),
      protein: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
      carbs: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
      fat: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
      fiber: Math.round((n["fiber_100g"] ?? 0) * 10) / 10,
      sugar: Math.round((n["sugars_100g"] ?? 0) * 10) / 10,
      sodium: Math.round((n["sodium_100g"] ?? 0) * 1000),
      servingGrams: Number.isFinite(serving) && serving > 0 && serving <= 2000 ? Math.round(serving) : null,
    };
  } catch {
    return null;
  }
}
