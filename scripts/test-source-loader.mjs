import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// Compile the installed TypeScript without adding a test runner or touching .next.
export function sourceLoader(mocks = {}) {
  const modules = new Map();
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const loaded = { exports: {} };
    modules.set(file, loaded);
    const localRequire = createRequire(file);
    function resolve(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === "server-only") return {};
      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const base = specifier.startsWith("@/") ? path.resolve("src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
        const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
        if (!target) throw new Error(`Cannot resolve ${specifier} from ${file}`);
        return load(target);
      }
      return localRequire(specifier);
    }
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
    new Function("require", "module", "exports", code)(resolve, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}
