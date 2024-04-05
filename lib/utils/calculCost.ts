export function calculCost(booksNumber: number, total: number): number {
  if (booksNumber >= 75) return total * (1 - 0.75)
  return total * (1 - (booksNumber / 100));
}