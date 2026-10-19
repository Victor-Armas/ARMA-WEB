export function normalizeSku(value: string): string {
  return value.toUpperCase().replace(/\s/g, "-");
}
