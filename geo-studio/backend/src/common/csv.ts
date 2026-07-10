export function splitCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value.split(",");
}
