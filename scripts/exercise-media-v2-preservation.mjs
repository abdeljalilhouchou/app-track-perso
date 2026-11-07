import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const source = (file, before = false) => ts.createSourceFile(file, before ? git("show", `HEAD:${file}`) : readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const normalize = (text) => text.replaceAll("\r\n", "\n");
const func = (file, name, before) => { const root=source(file,before);return root.statements.find((node)=>ts.isFunctionDeclaration(node)&&node.name?.text===name); };
const session="src/components/strength/session-logger.tsx";
const logic=(before)=>func(session,"SessionLogger",before).body.statements.filter((node)=>!ts.isReturnStatement(node)).map((node)=>normalize(node.getText()));
assert.deepEqual(logic(false),logic(true),"Session state, persistence, timers and calculations changed");
function handlers(before) { const items=[];function walk(node) { if(ts.isJsxAttribute(node)&&/^on[A-Z]/.test(node.name.text)) items.push(normalize(node.getText()));ts.forEachChild(node,walk); }walk(func(session,"SessionLogger",before));return items; }
assert.deepEqual(handlers(false),handlers(true),"Session actions changed");
const data="src/lib/exercises/data.ts";
assert.equal(normalize(func(data,"readPerformance",false).getText()),normalize(func(data,"readPerformance",true).getText()),"Performance reads/calculations changed");
const protectedPaths=["src/lib/anatomy","src/components/sport/anatomy","public","src/lib/actions","src/lib/supabase","src/proxy.ts","supabase","package.json","package-lock.json","AGENTS.md"];
assert.equal(git("status","--porcelain","--untracked-files=all","--",...protectedPaths).trim(),"","Protected files modified");
const previous=JSON.parse(readFileSync("docs/exercise-library/media-registry.json","utf8"));
const photos=previous.generatedMedia.map((item)=>{const actual=createHash("sha256").update(readFileSync(item.path)).digest("hex");assert.equal(actual,item.sha256);return {file:item.path,sha256:actual,unchanged:true};});
const report={referenceCommit:git("rev-parse","HEAD").trim(),branch:git("branch","--show-current").trim(),sessionStateTimersPersistenceAndCalculationsUnchanged:true,sessionEventHandlersUnchanged:true,performanceReaderUnchanged:true,protectedPathsUnchanged:protectedPaths,originalPhotos:photos,noDependenciesAdded:true};
writeFileSync("docs/exercise-media-v2/preservation.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
