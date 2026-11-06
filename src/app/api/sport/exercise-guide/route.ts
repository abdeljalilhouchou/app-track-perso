import { getCurrentUser } from "@/lib/supabase/read-context";
import { loadExerciseDetail } from "@/lib/exercises/data";
import { parseExerciseRequest } from "@/lib/exercises/request";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!await getCurrentUser()) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const query = parseExerciseRequest(new URL(request.url).searchParams);
  if (!query) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  try {
    const data = await loadExerciseDetail(query);
    return data ? Response.json(data, { headers }) : Response.json({ error: "not_found" }, { status: 404, headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
