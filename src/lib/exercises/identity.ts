/** Narrow the read while retaining the existing case/whitespace-insensitive identity. */
export function exerciseNamePattern(name: string) {
  return `%${name.trim().split(/\s+/).map((part) => part.replace(/[\\%_]/g, "\\$&")).join("%")}%`;
}
