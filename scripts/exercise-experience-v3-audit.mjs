import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const directory = "docs/exercise-experience-v3";
const baseline = JSON.parse(readFileSync(`${directory}/before.json`, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
assert.equal(git("branch", "--show-current").trim(), baseline.branch);
assert.notEqual(baseline.branch, "main");
assert.equal(git("rev-parse", "HEAD").trim(), baseline.head, "No commit was authorized");
const dialogShell = "src/components/sport/anatomy/exercise-muscle-dialog.tsx";
for (const { file, sha256 } of baseline.protectedFiles) {
  if (file.replaceAll("\\", "/") === dialogShell) continue;
  assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"), sha256, `Protected photo, anatomy or business file changed: ${file}`);
}
// The existing wrapper only consumes Escape explicitly before unmounting its modal.
// Exact comparison proves that its viewer, data, controls and content were retained.
const originalShell = git("show", `${baseline.head}:${dialogShell}`).replaceAll("\r\n", "\n");
const shellWithoutCancelFix = readFileSync(dialogShell, "utf8").replaceAll("\r\n", "\n").replace(' onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}', "").replace("event.preventDefault(); event.stopPropagation(); dialog.current?.close(); onClose();", "event.stopPropagation(); onClose();");
assert.equal(shellWithoutCancelFix, originalShell, "3D wrapper changed beyond the Escape cancellation fix");
const tree = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const normalized = (node) => node.getText().replaceAll("\r\n", "\n");
const sessionFile = "src/components/strength/session-logger.tsx";
const oldSession = tree(sessionFile, git("show", `${baseline.head}:${sessionFile}`));
const newSession = tree(sessionFile, readFileSync(sessionFile, "utf8"));
const logger = (root) => root.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === "SessionLogger");
const beforePresentation = (root) => logger(root).body.statements.filter((n) => !ts.isReturnStatement(n)).map(normalized);
assert.deepEqual(beforePresentation(newSession), beforePresentation(oldSession), "Session state, save, timer and set handlers changed");
const helpers = (root) => root.statements.filter((n) => n !== logger(root)).map(normalized);
assert.deepEqual(helpers(newSession), helpers(oldSession), "Draft key, helpers, types or dependencies changed");
const handlers = (root) => {
  const items = [];
  function walk(node) { if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.text)) items.push(normalized(node)); ts.forEachChild(node, walk); }
  walk(logger(root)); return items;
};
assert.deepEqual(handlers(newSession), handlers(oldSession), "Set, draft or session event handlers changed");
const dataFile = "src/lib/exercises/data.ts";
const original = tree(dataFile, git("show", `${baseline.head}:${dataFile}`));
const current = tree(dataFile, readFileSync(dataFile, "utf8"));
for (const name of ["guideForName", "attachGuide", "resolveExercise", "readPerformance"]) {
  const find = (root) => normalized(root.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name));
  assert.equal(find(current), find(original), `Catalog identity or performance function changed: ${name}`);
}
const catalog = (root) => normalized(root.statements.find((n) => ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => d.name.getText() === "loadExerciseCatalog")));
assert.equal(catalog(current), catalog(original));
const untouched = ["src/lib/actions", "src/lib/supabase", "supabase", "public/models/anatomy", "src/proxy.ts", "src/lib/strength.ts", "src/lib/strength-stats.ts", "package.json", "package-lock.json"];
assert.equal(git("status", "--porcelain", "--", ...untouched).trim(), "", "Data or dependency paths changed");
const result = { branch: baseline.branch, head: baseline.head, protectedFiles: baseline.protectedFiles.length - 1, dialogShellOnlyEscapeCancellationChanged: true, existingPhotosAndMediaUnchanged: true, anatomyEngineAndConfigsUnchanged: true, sessionStateAndHandlersUnchanged: true, catalogAndPerformanceQueriesUnchanged: true, dependenciesAndDataPathsUnchanged: true, noCommit: true };
writeFileSync(`${directory}/preservation.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
