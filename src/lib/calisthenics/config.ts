/** The new tables must never be queried or mutated until the reviewed migration is live. */
export function isCalisthenicsSchemaReady() {
  return process.env.CALISTHENICS_SCHEMA_READY === "true";
}
