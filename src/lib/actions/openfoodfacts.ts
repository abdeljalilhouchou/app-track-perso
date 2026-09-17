"use server";

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
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
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
          name: p.product_name!,
          brand: p.brands ?? null,
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
