/** The Running tables are queried only after the owner explicitly enables the schema gate. */
export function isRunningSchemaReady() {
  return process.env.RUNNING_SCHEMA_READY === "true";
}
