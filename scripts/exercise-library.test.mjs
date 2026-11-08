import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { baseCatalog } = load("src/lib/exercises/catalog.ts");
const { filterExercises, searchText } = load("src/lib/exercises/search.ts");
const { guides } = load("src/lib/exercises/guides.ts");
const defaults = { search: "", discipline: "all", muscle: "all", equipment: "all", level: "all", sort: "asc" };

test("search accepts accents, Arabic marks and translated names without changing canonical identities", () => {
  const catalog = baseCatalog("en");
  assert.equal(catalog.length, 69);
  assert.ok(filterExercises(catalog, { ...defaults, search: "developpe couche barre" }, "en").some((item) => item.storedName === "Développé couché barre"));
  assert.ok(filterExercises(catalog, { ...defaults, search: "ضغط الصدر" }, "ar").length > 0);
  assert.equal(searchText("تَمْرِين"), searchText("تمرين"));
  for (const language of ["fr", "en", "ar"]) {
    const localized = baseCatalog(language);
    assert.deepEqual(localized.map((item) => [item.key, item.storedName]), catalog.map((item) => [item.key, item.storedName]));
    assert.equal(new Set(localized.map((item) => item.key)).size, 69);
  }
});

test("combined filters, unknown metadata, empty Running and locale sorting use actual catalog entries", () => {
  const catalog = baseCatalog("fr");
  const result = filterExercises(catalog, { ...defaults, muscle: "Biceps", equipment: "dumbbell" }, "fr");
  assert.ok(result.length > 0);
  assert.ok(result.every((item) => item.primary.includes("Biceps") && item.equipment.includes("dumbbell")));
  assert.equal(filterExercises(catalog, { ...defaults, discipline: "running" }, "fr").length, 0);
  assert.ok(filterExercises(catalog, { ...defaults, equipment: "unknown" }, "fr").every((item) => !item.equipment.length));
  assert.deepEqual(filterExercises(catalog, { ...defaults, sort: "desc" }, "fr").map((item) => item.key), filterExercises(catalog, defaults, "fr").reverse().map((item) => item.key));
});

function reader({ ready = false, authenticated = true, broken = false, language = "fr" } = {}) {
  const today = new Date().toLocaleDateString("sv-SE");
  const calls = [];
  const rows = {
    exercises: [{ id: "personal", user_id: "owner", name: "Rowing haltère unilatéral", muscle_group: "Dos" }],
    calisthenics_exercises: [{ id: "global", user_id: null, exercise_key: "push-up", primary_muscle: "chest", level: "beginner", name_fr: "Pompe", name_en: "Push-up", name_ar: "ضغط" }],
    workout_sets: [
      { user_id: "owner", workout_id: "now", exercise_name: " ROWING  HALTÈRE UNILATÉRAL ", reps: 12, weight_kg: 25 },
      { user_id: "owner", workout_id: "now", exercise_name: "Rowing haltère unilatéral incliné", reps: 30, weight_kg: 99 },
      { user_id: "owner", workout_id: "cal", exercise_name: "Rowing haltère unilatéral", reps: 20, weight_kg: 90 },
      { user_id: "owner", workout_id: "future", exercise_name: "Rowing haltère unilatéral", reps: 20, weight_kg: 100 },
      { user_id: "other", workout_id: "now", exercise_name: "Rowing haltère unilatéral", reps: 20, weight_kg: 500 },
    ].map((set) => ({ ...set, muscle_group: "Dos", exercise_position: 0, set_number: 1 })),
    workouts: [{ id: "now", user_id: "owner", workout_date: today, discipline: "strength" }, { id: "cal", user_id: "owner", workout_date: today, discipline: "calisthenics" }, { id: "future", user_id: "owner", workout_date: "9999-01-01", discipline: "strength" }],
  };
  const api = { from(table) {
    let result = rows[table] ?? [];
    const query = {
      select() { calls.push([table, "select"]); return query; },
      order() { return query; }, or(value) { calls.push([table, "or", value]); return query; },
      eq(key, value) { calls.push([table, "eq", key, value]); result = result.filter((row) => row[key] === value); return query; },
      ilike(key, value) { calls.push([table, "ilike", key, value]); return query; },
      in(key, values) { result = result.filter((row) => values.includes(row[key])); return query; },
      lte(key, value) { result = result.filter((row) => row[key] <= value); return query; },
      range(from, to) { return Promise.resolve({ data: result.slice(from, to + 1), error: broken ? { message: "fixture failure" } : null }); },
    };
    return query;
  } };
  return { calls, data: sourceLoader({
    "@/lib/supabase/server": { createClient: async () => api },
    "@/lib/supabase/read-context": { getCurrentUser: async () => authenticated ? { id: "owner" } : null, getProfilePreferences: async () => ({ data: { language }, error: null }) },
    "@/lib/calisthenics/config": { isCalisthenicsSchemaReady: () => ready },
  })("src/lib/exercises/data.ts") };
}

test("catalog reads are owner-scoped and closed gates never touch Calisthenics or Running tables", async () => {
  const { data, calls } = reader();
  const catalog = await data.loadExerciseCatalog();
  assert.equal(catalog.exercises.length, 70);
  assert.equal(catalog.exercises.filter((item) => item.guideId).length, 8);
  assert.ok(calls.some((entry) => entry[0] === "exercises" && entry[1] === "eq" && entry[2] === "user_id" && entry[3] === "owner"));
  assert.ok(!calls.some((entry) => /calisthenics|running/.test(entry[0])));
  assert.equal(await data.loadExerciseDetail({ key: "personal-other-user" }), null);
});

test("detail records reuse strength calculations, isolate owner/discipline/date and retain case-space identity", async () => {
  const { data, calls } = reader();
  const detail = await data.loadExerciseDetail({ name: "Rowing haltère unilatéral", discipline: "musculation" });
  assert.equal(detail.exercise.databaseId, "personal");
  assert.equal(detail.performance.latest.sets.length, 1);
  assert.equal(detail.performance.maxWeight.weight, 25);
  assert.equal(detail.performance.bestVolume.value, 300);
  for (const table of ["exercises", "workout_sets", "workouts"]) assert.ok(calls.some((entry) => entry[0] === table && entry[1] === "eq" && entry[2] === "user_id" && entry[3] === "owner"));
  const unknown = await data.loadExerciseDetail({ name: "Good morning" });
  assert.equal(unknown.text, null);
  assert.equal(unknown.performance.latest, null);
});

test("pilot details reuse exact anatomy roles and now supply complete technique without changing records", async () => {
  const { data } = reader();
  const load = sourceLoader();
  const { getExerciseAnatomy } = load("src/lib/anatomy/configs.ts");
  const { ATLAS_MUSCLES } = load("src/lib/anatomy/atlas.ts");
  for (const key of ["strength-squat", "strength-curl-incline", "strength-developpe-incline-halteres", "strength-rowing-haltere-unilateral", "strength-tirage-horizontal-poulie"]) {
    const detail = await data.loadExerciseDetail({ key });
    assert.ok(detail.text?.position && detail.text?.breathing && detail.text?.mistakes.length);
    const anatomy = getExerciseAnatomy(key);
    for (const role of ["primary", "secondary", "stabilizer"]) assert.deepEqual(detail.anatomySummary[role], anatomy.muscles.filter((group) => group.role === role).map((group) => ATLAS_MUSCLES[group.id].name.fr));
    assert.deepEqual(detail.anatomySummary.limitations, anatomy.limitations.map((note) => note.fr));
  }
  const legacy = await data.loadExerciseDetail({ key: "strength-curl-halteres" });
  assert.equal(legacy.anatomySummary, null);
});

test("V3 server details preserve existing guides and supply complete localized technique with the exact existing anatomy", async () => {
  const loadV3=sourceLoader();
  const {EXERCISE_V3_IDS:ids}=loadV3("src/lib/exercises/media-v3-index.ts");
  const {getExerciseAnatomy}=loadV3("src/lib/anatomy/configs.ts");
  const {ATLAS_MUSCLES}=loadV3("src/lib/anatomy/atlas.ts");
  const {v3Technique}=loadV3("src/lib/exercises/media-v3-content.ts");
  for(const language of ["fr","en","ar"]){
    const {data}=reader({language});
    for(const key of ids){
      const detail=await data.loadExerciseDetail({key});
      assert.equal(detail.language,language);assert.equal(detail.media.exerciseId,key);
      const existing=guides.find(item=>item.id===detail.exercise.guideId);
      assert.deepEqual(detail.text,existing?existing.text[language]:v3Technique(key,language));
      for(const role of ["primary","secondary","stabilizer"])assert.deepEqual(detail.anatomySummary[role],getExerciseAnatomy(key).muscles.filter(item=>item.role===role).map(item=>ATLAS_MUSCLES[item.id].name[language]));
      assert.deepEqual(detail.anatomySummary.details,getExerciseAnatomy(key).muscles.map(item=>({name:ATLAS_MUSCLES[item.id].name[language],role:item.role,action:getExerciseAnatomy(key).actions[item.id]?.[language]??null})),"Muscle descriptions reuse documented anatomy actions without new claims");
      assert.equal(detail.performance.latest,null,"Photographs never fabricate session history");
    }
  }
});

test("approved Calisthenics branch resolves original IDs and global keys without enabling the real gate", async () => {
  const { data, calls } = reader({ ready: true });
  const catalog = await data.loadExerciseCatalog();
  const cal = catalog.exercises.find((item) => item.databaseId === "global");
  assert.equal(cal.guideId, "push-up");
  assert.equal(cal.level, "beginner", "Existing Calisthenics difficulty must retain the stored value");
  assert.equal(data.resolveExercise(catalog.exercises, { discipline: "calisthenics", exerciseId: "global" }).databaseId, "global");
  assert.ok(calls.some((entry) => entry[0] === "calisthenics_exercises" && entry[1] === "or" && entry[2] === "user_id.is.null,user_id.eq.owner"));
});

test("unauthenticated readers do not query the database and query failures never masquerade as empty data", async () => {
  const anonymous = reader({ authenticated: false });
  assert.equal(await anonymous.data.loadExerciseCatalog(), null);
  assert.deepEqual(anonymous.calls, []);
  await assert.rejects(reader({ broken: true }).data.loadExerciseCatalog(), /fixture failure/);
});

test("eight variant-specific guides have complete independent FR/EN/AR content and real local media", () => {
  assert.equal(guides.length, 8);
  const keys = ["description", "objective", "preparation", "position", "execution", "return", "breathing", "range", "tempo", "mistakes", "tips", "safety"];
  let bytes = 0;
  for (const guide of guides) {
    assert.ok(!guide.aliases.includes("Squat"));
    for (const key of guide.calisthenicsKeys ?? []) assert.ok(readFileSync("supabase/migrations/0019_calisthenics.sql", "utf8").includes(`'${key}'`), `Original Calisthenics seed key missing: ${key}`);
    assert.ok(guide.sources.every((source) => source.url.startsWith("https://")));
    for (const language of ["fr", "en", "ar"]) for (const key of keys) {
      const value = guide.text[language][key];
      assert.ok(Array.isArray(value) ? value.length >= 2 && value.every(Boolean) : value.length > 8, `${guide.id}/${language}/${key}`);
    }
    if (guide.image) {
      const buffer = readFileSync(`public${guide.image.src}`);
      assert.equal(buffer.toString("ascii", 8, 12), "WEBP"); bytes += buffer.length;
      assert.ok(Object.values(guide.image.alt).every(Boolean));
    }
  }
  assert.ok(bytes < 150 * 1024);
  for (const language of ["fr", "en", "ar"]) assert.equal(new Set(guides.map((guide) => guide.text[language].execution)).size, 8);
});

test("missing videos show no play button or media resource and local video loading is opt-in", () => {
  const { ExerciseDemonstration } = sourceLoader({ "@/components/language-provider": { useT: () => (key) => key } })("src/components/sport/exercises/exercise-demonstration.tsx");
  const absent = renderToStaticMarkup(createElement(ExerciseDemonstration));
  assert.ok(!/<button|<video|<source/.test(absent));
  const available = renderToStaticMarkup(createElement(ExerciseDemonstration, { video: { src: "/videos/exercises/example.mp4", transcript: "Example" } }));
  assert.ok(available.includes("<button"));
  assert.ok(!/<video|<source/.test(available), "No video element or source before manual loading");
});

test("new labels and request validation cover all locales and reject invalid selectors", () => {
  const { exerciseLibraryFr, exerciseLibraryEn, exerciseLibraryAr } = load("src/lib/i18n/modules/exercise-library.ts");
  const { translate } = load("src/lib/i18n/translate.ts");
  function check(dictionary, language, prefix = "sport.library") {
    for (const [key, value] of Object.entries(dictionary)) {
      if (typeof value === "string") assert.equal(translate(language, `${prefix}.${key}`), value);
      else check(value, language, `${prefix}.${key}`);
    }
  }
  check(exerciseLibraryFr, "fr"); check(exerciseLibraryEn, "en"); check(exerciseLibraryAr, "ar");
  const { parseExerciseRequest } = load("src/lib/exercises/request.ts");
  for (const query of ["", "name=x&discipline=other", "exerciseId=bad", `name=${"x".repeat(161)}`]) assert.equal(parseExerciseRequest(new URLSearchParams(query)), null);
  assert.equal(parseExerciseRequest(new URLSearchParams("name=Pompes")).discipline, "musculation");
});

test("guide endpoint authenticates first, disables caching and hides database failures", async () => {
  let reads = 0;
  const anonymous = sourceLoader({
    "@/lib/supabase/read-context": { getCurrentUser: async () => null },
    "@/lib/exercises/data": { loadExerciseDetail: async () => { reads++; } },
  })("src/app/api/sport/exercise-guide/route.ts");
  const unauthorized = await anonymous.GET(new Request("http://localhost/api/sport/exercise-guide?name=Pompes"));
  assert.equal(unauthorized.status, 401); assert.equal(reads, 0);
  const unavailable = sourceLoader({
    "@/lib/supabase/read-context": { getCurrentUser: async () => ({ id: "owner" }) },
    "@/lib/exercises/data": { loadExerciseDetail: async () => { throw Error("PRIVATE_SQL_ERROR"); } },
  })("src/app/api/sport/exercise-guide/route.ts");
  const invalid = await unavailable.GET(new Request("http://localhost/api/sport/exercise-guide?exerciseId=invalid"));
  assert.equal(invalid.status, 400);
  const failed = await unavailable.GET(new Request("http://localhost/api/sport/exercise-guide?name=Pompes"));
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("Cache-Control"), "private, no-store");
  assert.ok(!(await failed.text()).includes("PRIVATE_SQL_ERROR"));
});

test("name narrowing escapes SQL wildcard characters without changing exercise identity", () => {
  const { exerciseNamePattern } = load("src/lib/exercises/identity.ts");
  assert.equal(exerciseNamePattern("  Curl  100%_test\\  "), "%Curl%100\\%\\_test\\\\%");
  const { exerciseMuscles } = load("src/lib/exercises/muscles.ts");
  assert.equal(exerciseMuscles(null, "fr"), null);
  assert.equal(exerciseMuscles("unknown", "en"), null);
  for (const guide of guides) for (const language of ["fr", "en", "ar"]) {
    const muscles = exerciseMuscles(guide.id, language);
    assert.ok(muscles.primary.length && muscles.secondary.length);
  }
});
