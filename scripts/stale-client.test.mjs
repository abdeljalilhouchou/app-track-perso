import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { isStaleClientError } = load("src/lib/stale-client.ts");

test("errors from a tab left on an older build are recognised", () => {
  const chunk = new Error("Loading chunk 482 failed.");
  chunk.name = "ChunkLoadError";
  for (const error of [
    chunk,
    new Error("Failed to fetch dynamically imported module: https://app/_next/static/chunks/a1b2.js"),
    new Error("Importing a module script failed."),
    new Error("Failed to find Server Action \"7f3a9c\". This request might be from an older or newer deployment."),
  ]) assert.equal(isStaleClientError(error), true, error.message);
});

test("ordinary failures are not mistaken for a stale build", () => {
  for (const error of [new Error("Impossible de charger le profil."), new TypeError("Cannot read properties of undefined"), "Loading chunk 1 failed", null]) {
    assert.equal(isStaleClientError(error), false, String(error));
  }
});
