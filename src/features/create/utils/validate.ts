export function isInvalidName(cleanName: string): boolean {
  return Boolean(
    cleanName &&
      (!/^[a-zA-Z0-9._-]{1,100}$/.test(cleanName) ||
        [".", ".."].includes(cleanName) ||
        cleanName.endsWith(".git")),
  );
}
